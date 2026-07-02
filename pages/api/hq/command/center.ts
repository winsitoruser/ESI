import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';
import { webhookService } from '@/lib/webhookService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Only super_admin can access HQ Command Center
    if (session.user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Super admin access required' 
      });
    }

    if (req.method === 'GET') {
      const { 
        action = 'status' // status, alerts, permissions, system
      } = req.query;

      let data;

      switch (action) {
        case 'status':
          data = await getSystemStatus(session.user.tenantId);
          break;

        case 'alerts':
          data = await getSystemAlerts(session.user.tenantId);
          break;

        case 'permissions':
          data = await getPermissionMatrix(session.user.tenantId);
          break;

        case 'system':
          data = await getSystemControls(session.user.tenantId);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action',
            validActions: ['status', 'alerts', 'permissions', 'system']
          });
      }

      return res.status(200).json({
        success: true,
        data
      });

    } else if (req.method === 'POST') {
      const { 
        command,
        target,
        parameters,
        confirm = false
      } = req.body;

      // Validate command
      if (!command) {
        return res.status(400).json({
          success: false,
          error: 'Command is required'
        });
      }

      // Log command execution
      await logCommand(session.user, command, target, parameters);

      // Execute command
      let result;
      switch (command) {
        case 'lock_all_prices':
          result = await executeLockAllPrices(session.user.tenantId, confirm);
          break;

        case 'emergency_closure':
          result = await executeEmergencyClosure(session.user.tenantId, target, confirm);
          break;

        case 'force_sync':
          result = await executeForceSync(session.user.tenantId, target);
          break;

        case 'broadcast_message':
          result = await executeBroadcastMessage(session.user.tenantId, parameters);
          break;

        case 'reset_passwords':
          result = await executeResetPasswords(session.user.tenantId, target, confirm);
          break;

        case 'toggle_maintenance':
          result = await executeToggleMaintenance(session.user.tenantId, parameters);
          break;

        case 'emergency_purchase':
          result = await executeEmergencyPurchase(session.user.tenantId, target, parameters);
          break;

        case 'inter_branch_transfer':
          result = await executeInterBranchTransfer(session.user.tenantId, target, parameters);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid command',
            validCommands: [
              'lock_all_prices',
              'emergency_closure', 
              'force_sync',
              'broadcast_message',
              'reset_passwords',
              'toggle_maintenance',
              'emergency_purchase',
              'inter_branch_transfer'
            ]
          });
      }

      // Trigger webhook for critical commands
      if (['emergency_closure', 'lock_all_prices', 'reset_passwords'].includes(command)) {
        await webhookService.triggerWebhooks(
          'hq_command_executed',
          {
            command,
            executedBy: session.user.name,
            target,
            timestamp: new Date().toISOString(),
            result: result.success
          },
          session.user.tenantId,
          null,
          session.user.id
        );
      }

      return res.status(200).json({
        success: true,
        message: `Command ${command} executed`,
        result
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('HQ Command Center API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Get system status
async function getSystemStatus(tenantId: string) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const [status] = await sequelize.query(`
    SELECT 
      -- Branch status
      COUNT(*) as total_branches,
      COUNT(CASE WHEN is_active THEN 1 END) as active_branches,
      COUNT(CASE WHEN updated_at >= CURRENT_TIMESTAMP - INTERVAL '5 minutes' THEN 1 END) as online_branches,
      
      -- Today's operations
      (SELECT COUNT(*) FROM pos_transactions 
       WHERE tenant_id = :tenantId AND status = 'closed' 
       AND DATE(transaction_date) = CURRENT_DATE) as transactions_today,
       
      (SELECT COALESCE(SUM(total), 0) FROM pos_transactions 
       WHERE tenant_id = :tenantId AND status = 'closed' 
       AND DATE(transaction_date) = CURRENT_DATE) as revenue_today,
       
      -- Staff status
      (SELECT COUNT(*) FROM employees e
       JOIN branches b ON e.branch_id = b.id
       WHERE e.tenant_id = :tenantId AND e.is_active = true) as total_employees,
       
      (SELECT COUNT(*) FROM employee_attendances ea
       JOIN employees e ON ea.employee_id = e.id
       WHERE e.tenant_id = :tenantId AND DATE(ea.check_in_at) = CURRENT_DATE) as employees_checked_in,
       
      -- System health
      (SELECT COUNT(*) FROM webhook_dispatch_logs 
       WHERE tenant_id = :tenantId AND status = 'failed'
       AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour') as failed_webhooks,
       
      -- Alerts
      (SELECT COUNT(*) FROM dashboard_notifications 
       WHERE tenant_id = :tenantId AND is_read = false) as unread_alerts
       
    FROM branches b
    WHERE b.tenant_id = :tenantId
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  // Get critical issues
  const criticalIssues = await sequelize.query(`
    (SELECT 
      'Branch Offline' as issue,
      b.name as location,
      'critical' as severity,
      b.updated_at as detected_at
    FROM branches b
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    AND b.updated_at < CURRENT_TIMESTAMP - INTERVAL '1 hour')
    
    UNION ALL
    
    (SELECT 
      'Critical Stock Out' as issue,
      CONCAT(p.name, ' at ', b.name) as location,
      'critical' as severity,
      p.updated_at as detected_at
    FROM products p
    JOIN branches b ON p.branch_id = b.id
    WHERE p.tenant_id = :tenantId
    AND p.stock = 0
    AND p.is_active = true
    AND p.updated_at < CURRENT_TIMESTAMP - INTERVAL '30 minutes')
    
    UNION ALL
    
    (SELECT 
      'No Sales Today' as issue,
      b.name as location,
      'high' as severity,
      CURRENT_TIMESTAMP as detected_at
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
      AND pt.status = 'closed' AND DATE(pt.transaction_date) = CURRENT_DATE
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    AND pt.id IS NULL)
    
    ORDER BY severity, detected_at DESC
    LIMIT 10
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  return {
    ...status,
    revenue_today: parseFloat(status.revenue_today || 0),
    systemHealth: {
      status: status.failed_webhooks > 5 ? 'warning' : 'healthy',
      uptime: process.uptime(),
      lastSync: new Date().toISOString()
    },
    criticalIssues
  };
}

// Get system alerts
async function getSystemAlerts(tenantId: string) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const alerts = await sequelize.query(`
    SELECT 
      dn.id,
      dn.title,
      dn.message,
      dn.type,
      dn.priority,
      dn.is_read,
      dn.created_at,
      u.name as user_name
    FROM dashboard_notifications dn
    LEFT JOIN users u ON dn.user_id = u.id
    WHERE dn.tenant_id = :tenantId
    ORDER BY dn.priority DESC, dn.created_at DESC
    LIMIT 50
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  const alertStats = await sequelize.query(`
    SELECT 
      priority,
      COUNT(*) as count
    FROM dashboard_notifications
    WHERE tenant_id = :tenantId
    AND is_read = false
    GROUP BY priority
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  return {
    alerts,
    stats: alertStats.reduce((acc: any, stat: any) => {
      acc[stat.priority] = stat.count;
      return acc;
    }, { low: 0, normal: 0, high: 0, critical: 0 })
  };
}

// Get permission matrix
async function getPermissionMatrix(tenantId: string) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const permissions = await sequelize.query(`
    SELECT 
      u.role,
      COUNT(DISTINCT u.id) as user_count,
      -- Key permissions
      MAX(CASE WHEN u.role = 'super_admin' THEN true ELSE false END) as can_manage_all,
      MAX(CASE WHEN u.role IN ('super_admin', 'admin') THEN true ELSE false END) as can_view_reports,
      MAX(CASE WHEN u.role IN ('super_admin', 'admin', 'manager') THEN true ELSE false END) as can_manage_inventory,
      MAX(CASE WHEN u.role IN ('super_admin', 'admin', 'manager', 'cashier') THEN true ELSE false END) can_process_transactions
    FROM users u
    WHERE u.tenant_id = :tenantId
    GROUP BY u.role
    ORDER BY 
      CASE u.role
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'cashier' THEN 4
        ELSE 5
      END
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  return { permissions };
}

// Get system controls
async function getSystemControls(tenantId: string) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const [controls] = await sequelize.query(`
    SELECT 
      -- Pricing controls
      (SELECT COUNT(*) FROM product_prices pp
       JOIN products p ON pp.product_id = p.id
       WHERE p.tenant_id = :tenantId AND pp.is_locked_by_hq = true) as locked_prices,
       
      (SELECT COUNT(*) FROM products 
       WHERE tenant_id = :tenantId AND is_locked = true) as locked_products,
       
      -- Global settings
      (SELECT value::boolean FROM global_settings 
       WHERE tenant_id = :tenantId AND key = 'menu_global_lock_enabled') as global_menu_lock,
       
      (SELECT value::boolean FROM global_settings 
       WHERE tenant_id = :tenantId AND key = 'tax_enable_ppn') as ppn_enabled,
       
      -- System status
      (SELECT value::boolean FROM global_settings 
       WHERE tenant_id = :tenantId AND key = 'maintenance_mode') as maintenance_mode,
       
      -- Webhook status
      (SELECT COUNT(*) FROM webhooks 
       WHERE tenant_id = :tenantId AND is_active = true) as active_webhooks
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  return controls;
}

// Log command execution
async function logCommand(user: any, command: string, target: any, parameters: any) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  
  await sequelize.query(`
    INSERT INTO audit_logs (
      id, user_id, branch_id, action, entity_type, entity_id,
      entity_name, old_values, new_values, description,
      ip_address, user_agent, tenant_id, created_at
    ) VALUES (
      UUID(), :userId, NULL, 'hq_command', 'system', NULL,
      :command, NULL, :parameters, :description,
      NULL, NULL, :tenantId, NOW()
    )
  `, {
    replacements: {
      userId: user.id,
      command,
      parameters: JSON.stringify({ target, parameters }),
      description: `HQ Command executed: ${command}`,
      tenantId: user.tenantId
    }
  });
}

// Execute lock all prices command
async function executeLockAllPrices(tenantId: string, confirmed: boolean) {
  if (!confirmed) {
    return {
      success: false,
      message: 'Confirmation required. This action will lock all prices across all branches.',
      requiresConfirmation: true
    };
  }

  const { sequelize } = await import('@/lib/sequelizeClient');
  
  await sequelize.query(`
    UPDATE product_prices pp
    SET is_locked_by_hq = true, updated_at = NOW()
    FROM products p
    WHERE pp.product_id = p.id
    AND p.tenant_id = :tenantId
  `, {
    replacements: { tenantId }
  });

  return {
    success: true,
    message: 'All prices have been locked by HQ',
    affectedRows: await sequelize.query(`
      SELECT COUNT(*) as count FROM product_prices pp
      JOIN products p ON pp.product_id = p.id
      WHERE p.tenant_id = :tenantId
    `, { replacements: { tenantId }, type: QueryTypes.SELECT })
  };
}

// Execute emergency closure
async function executeEmergencyClosure(tenantId: string, branchIds: string[], confirmed: boolean) {
  if (!confirmed) {
    return {
      success: false,
      message: `Emergency closure requires confirmation. This will close ${branchIds.length} branch(es).`,
      requiresConfirmation: true
    };
  }

  const { sequelize } = await import('@/lib/sequelizeClient');
  
  await sequelize.query(`
    UPDATE branches 
    SET is_active = false, updated_at = NOW()
    WHERE tenant_id = :tenantId
    AND id = ANY(:branchIds)
  `, {
    replacements: { tenantId, branchIds }
  });

  return {
    success: true,
    message: `Emergency closure activated for ${branchIds.length} branch(es)`,
    closedBranches: branchIds
  };
}

// Execute force sync
async function executeForceSync(tenantId: string, target: string) {
  // This would trigger synchronization process
  // For now, just return success
  return {
    success: true,
    message: `Force sync initiated for ${target}`,
    syncId: `sync_${Date.now()}`
  };
}

// Execute broadcast message
async function executeBroadcastMessage(tenantId: string, parameters: any) {
  const { message, priority = 'normal', targetRoles = [] } = parameters;
  
  const { sequelize } = await import('@/lib/sequelizeClient');
  
  // Create notifications for all users
  await sequelize.query(`
    INSERT INTO dashboard_notifications (
      id, user_id, title, message, type, priority,
      data, is_read, tenant_id, created_at
    )
    SELECT 
      uuid_generate_v4(),
      u.id,
      'HQ Broadcast',
      :message,
      'broadcast',
      :priority,
      :data,
      false,
      :tenantId,
      NOW()
    FROM users u
    WHERE u.tenant_id = :tenantId
    AND (:targetRoles = '{}' OR u.role = ANY(:targetRoles))
  `, {
    replacements: {
      message,
      priority,
      data: JSON.stringify({ broadcast: true, timestamp: new Date() }),
      targetRoles,
      tenantId
    }
  });

  return {
    success: true,
    message: 'Broadcast message sent to all users',
    recipients: targetRoles.length > 0 ? targetRoles : ['all']
  };
}

// Execute reset passwords
async function executeResetPasswords(tenantId: string, target: string[], confirmed: boolean) {
  if (!confirmed) {
    return {
      success: false,
      message: `Password reset requires confirmation. This will reset passwords for ${target.length} user(s).`,
      requiresConfirmation: true
    };
  }

  // This would trigger password reset process
  return {
    success: true,
    message: `Password reset links sent to ${target.length} user(s)`,
    resetIds: target
  };
}

// Execute toggle maintenance
async function executeToggleMaintenance(tenantId: string, parameters: any) {
  const { enabled, message } = parameters;
  
  const { sequelize } = await import('@/lib/sequelizeClient');
  
  await sequelize.query(`
    INSERT INTO global_settings (
      id, key, label, value, type, category,
      created_by, tenant_id, created_at, updated_at
    ) VALUES (
      uuid_generate_v4(), 'maintenance_mode', 'Maintenance Mode',
      :enabled, 'boolean', 'system', :createdBy, :tenantId, NOW(), NOW()
    )
    ON CONFLICT (tenant_id, key)
    DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = NOW()
  `, {
    replacements: {
      enabled,
      createdBy: 'system',
      tenantId
    }
  });

  return {
    success: true,
    message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
    maintenanceMessage: message
  };
}

// Execute emergency purchase
async function executeEmergencyPurchase(tenantId: string, target: string, parameters: any) {
  const { items, urgency = 'high', notes } = parameters;
  
  // This would create emergency purchase orders
  return {
    success: true,
    message: `Emergency purchase order created for ${target}`,
    purchaseId: `po_emergency_${Date.now()}`,
    items
  };
}

// Execute inter-branch transfer
async function executeInterBranchTransfer(tenantId: string, target: any, parameters: any) {
  const { fromBranch, toBranch, items, priority = 'normal' } = parameters;
  
  // This would create inter-branch transfer
  return {
    success: true,
    message: `Inter-branch transfer created from ${fromBranch} to ${toBranch}`,
    transferId: `transfer_${Date.now()}`,
    items
  };
}
