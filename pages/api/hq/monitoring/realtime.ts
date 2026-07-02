import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Only super_admin and admin can access HQ monitoring
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    if (req.method === 'GET') {
      const { 
        type = 'all', // all, sales, inventory, staff, finance
        realtime = true,
        branchIds = 'all'
      } = req.query;

      // Build branch filter
      let branchFilter = '';
      let branchParams: any = {};
      if (branchIds !== 'all') {
        const parsedBranchIds = JSON.parse(branchIds as string);
        branchFilter = `AND b.id IN (${parsedBranchIds.map((_, i) => `:branchId${i}`).join(',')})`;
        parsedBranchIds.forEach((id: string, i: number) => {
          branchParams[`branchId${i}`] = id;
        });
      }

      let data = {};

      if (type === 'all' || type === 'sales') {
        data.sales = await getRealTimeSales(session.user.tenantId, branchFilter, branchParams);
      }

      if (type === 'all' || type === 'inventory') {
        data.inventory = await getRealTimeInventory(session.user.tenantId, branchFilter, branchParams);
      }

      if (type === 'all' || type === 'staff') {
        data.staff = await getRealTimeStaff(session.user.tenantId, branchFilter, branchParams);
      }

      if (type === 'all' || type === 'finance') {
        data.finance = await getRealTimeFinance(session.user.tenantId, branchFilter, branchParams);
      }

      // Add system health metrics
      data.systemHealth = await getSystemHealth(session.user.tenantId);

      return res.status(200).json({
        success: true,
        data: {
          ...data,
          metadata: {
            type,
            realtime: realtime === 'true',
            timestamp: new Date().toISOString(),
            refreshInterval: 30000 // 30 seconds
          }
        }
      });

    } else if (req.method === 'POST') {
      // Handle real-time event subscription (WebSocket placeholder)
      const { events, branchIds } = req.body;

      // This would integrate with WebSocket service
      // For now, just return subscription details
      return res.status(200).json({
        success: true,
        message: 'Subscribed to real-time events',
        subscription: {
          events,
          branchIds,
          userId: session.user.id,
          socketUrl: process.env.WEBSOCKET_URL || 'ws://localhost:3001'
        }
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('HQ Real-time Monitoring API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Get real-time sales data
async function getRealTimeSales(tenantId: string, branchFilter: string, branchParams: any) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  // Current hour sales
  const [currentHour] = await sequelize.query(`
    SELECT 
      COUNT(pt.id) as transactions_this_hour,
      COALESCE(SUM(pt.total), 0) as revenue_this_hour,
      COALESCE(AVG(pt.total), 0) as avg_transaction_this_hour,
      COUNT(DISTINCT pt.customer_id) as customers_this_hour
    FROM pos_transactions pt
    JOIN branches b ON pt.branch_id = b.id
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    AND DATE(pt.transaction_date) = CURRENT_DATE
    AND EXTRACT(HOUR FROM pt.transaction_date) = EXTRACT(HOUR FROM CURRENT_TIME)
    ${branchFilter}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Today's sales progress
  const [todayProgress] = await sequelize.query(`
    SELECT 
      COUNT(pt.id) as total_transactions_today,
      COALESCE(SUM(pt.total), 0) as total_revenue_today,
      COUNT(DISTINCT pt.customer_id) as total_customers_today,
      
      -- Compare with yesterday
      (SELECT COALESCE(SUM(total), 0) FROM pos_transactions 
       WHERE tenant_id = :tenantId AND status = 'closed' 
       AND DATE(transaction_date) = CURRENT_DATE - INTERVAL '1 day') as yesterday_revenue,
       
      -- Hourly breakdown for today
      ARRAY_AGG(
        JSON_BUILD_OBJECT(
          'hour', EXTRACT(HOUR FROM pt.transaction_date),
          'revenue', COALESCE(SUM(pt.total), 0),
          'transactions', COUNT(pt.id)
        ) ORDER BY EXTRACT(HOUR FROM pt.transaction_date)
      ) FILTER (WHERE pt.id IS NOT NULL) as hourly_breakdown
    FROM pos_transactions pt
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    AND DATE(pt.transaction_date) = CURRENT_DATE
    ${branchFilter}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Top selling items right now
  const topItems = await sequelize.query(`
    SELECT 
      p.name,
      p.sku,
      COUNT(pti.id) as quantity_sold,
      COALESCE(SUM(pti.quantity * pti.price), 0) as revenue,
      COUNT(DISTINCT pti.transaction_id) as unique_orders
    FROM pos_transaction_items pti
    JOIN pos_transactions pt ON pti.transaction_id = pt.id
    JOIN products p ON pti.product_id = p.id
    WHERE pt.tenant_id = :tenantId
    AND pt.status = 'closed'
    AND DATE(pt.transaction_date) = CURRENT_DATE
    ${branchFilter.replace('b.', 'pt.')}
    GROUP BY p.id, p.name, p.sku
    ORDER BY quantity_sold DESC
    LIMIT 10
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Active cashiers
  const activeCashiers = await sequelize.query(`
    SELECT 
      u.name,
      u.email,
      b.name as branch_name,
      COUNT(pt.id) as transactions_today,
      COALESCE(SUM(pt.total), 0) as revenue_today,
      MAX(pt.transaction_date) as last_transaction
    FROM users u
    JOIN pos_transactions pt ON u.id = pt.cashier_id
    JOIN branches b ON pt.branch_id = b.id
    WHERE u.tenant_id = :tenantId
    AND pt.status = 'closed'
    AND DATE(pt.transaction_date) = CURRENT_DATE
    AND pt.transaction_date >= CURRENT_TIME - INTERVAL '2 hours'
    ${branchFilter.replace('b.', 'pt.')}
    GROUP BY u.id, u.name, u.email, b.name
    ORDER BY last_transaction DESC
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  return {
    currentHour: {
      ...currentHour,
      revenue_this_hour: parseFloat(currentHour.revenue_this_hour || 0),
      avg_transaction_this_hour: parseFloat(currentHour.avg_transaction_this_hour || 0)
    },
    todayProgress: {
      ...todayProgress,
      total_revenue_today: parseFloat(todayProgress.total_revenue_today || 0),
      yesterday_revenue: parseFloat(todayProgress.yesterday_revenue || 0),
      growth_percentage: todayProgress.yesterday_revenue > 0 
        ? ((parseFloat(todayProgress.total_revenue_today || 0) - todayProgress.yesterday_revenue) / todayProgress.yesterday_revenue * 100).toFixed(2)
        : '0.00'
    },
    topItems: topItems.map(item => ({
      ...item,
      revenue: parseFloat(item.revenue || 0)
    })),
    activeCashiers: activeCashiers.map(cashier => ({
      ...cashier,
      revenue_today: parseFloat(cashier.revenue_today || 0)
    }))
  };
}

// Get real-time inventory data
async function getRealTimeInventory(tenantId: string, branchFilter: string, branchParams: any) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  // Inventory status summary
  const [summary] = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT p.id) as total_products,
      COUNT(DISTINCT CASE WHEN p.stock <= p.min_stock THEN p.id END) as low_stock_items,
      COUNT(DISTINCT CASE WHEN p.stock = 0 THEN p.id END) as out_of_stock_items,
      COUNT(DISTINCT CASE WHEN p.stock < p.min_stock * 0.2 THEN p.id END) as critical_items,
      COALESCE(SUM(p.stock * p.cost), 0) as total_inventory_value,
      COALESCE(SUM(p.stock * p.selling_price), 0) as potential_revenue
    FROM branches b
    JOIN products p ON b.id = p.branch_id
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    AND p.is_active = true
    ${branchFilter}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Critical stock items
  const criticalItems = await sequelize.query(`
    SELECT 
      p.id,
      p.name,
      p.sku,
      b.name as branch_name,
      b.code as branch_code,
      p.stock,
      p.min_stock,
      p.unit,
      p.cost,
      p.selling_price,
      p.updated_at as last_updated,
      CASE 
        WHEN p.stock = 0 THEN 'out_of_stock'
        WHEN p.stock < p.min_stock * 0.2 THEN 'critical'
        ELSE 'low'
      END as status
    FROM products p
    JOIN branches b ON p.branch_id = b.id
    WHERE p.tenant_id = :tenantId
    AND p.is_active = true
    AND b.is_active = true
    AND p.stock <= p.min_stock
    ${branchFilter}
    ORDER BY p.stock ASC
    LIMIT 20
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Recent stock movements
  const recentMovements = await sequelize.query(`
    SELECT 
      sm.movement_type,
      sm.quantity,
      sm.notes,
      p.name as product_name,
      b.name as branch_name,
      sm.created_at,
      u.name as created_by_name
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    JOIN branches b ON sm.branch_id = b.id
    LEFT JOIN users u ON sm.created_by = u.id
    WHERE sm.tenant_id = :tenantId
    AND sm.created_at >= CURRENT_TIMESTAMP - INTERVAL '4 hours'
    ${branchFilter}
    ORDER BY sm.created_at DESC
    LIMIT 10
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Warehouse utilization
  const [warehouseUtilization] = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT sa.id) as total_storage_areas,
      COUNT(DISTINCT CASE WHEN pl.product_id IS NOT NULL THEN sa.id END) as utilized_areas,
      COUNT(DISTINCT pl.product_id) as products_with_locations,
      ROUND(
        COUNT(DISTINCT CASE WHEN pl.product_id IS NOT NULL THEN sa.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT sa.id), 0), 2
      ) as utilization_percentage
    FROM branches b
    LEFT JOIN warehouse_zones wz ON b.id = wz.branch_id
    LEFT JOIN storage_areas sa ON wz.id = sa.zone_id
    LEFT JOIN product_locations pl ON sa.id = pl.storage_area_id
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  return {
    summary: {
      ...summary,
      total_inventory_value: parseFloat(summary.total_inventory_value || 0),
      potential_revenue: parseFloat(summary.potential_revenue || 0),
      health_score: summary.total_products > 0 
        ? (100 - (summary.low_stock_items / summary.total_products * 100)).toFixed(2)
        : '100.00'
    },
    criticalItems: criticalItems.map(item => ({
      ...item,
      cost: parseFloat(item.cost || 0),
      selling_price: parseFloat(item.selling_price || 0)
    })),
    recentMovements,
    warehouseUtilization: {
      ...warehouseUtilization,
      utilization_percentage: parseFloat(warehouseUtilization.utilization_percentage || 0)
    }
  };
}

// Get real-time staff data
async function getRealTimeStaff(tenantId: string, branchFilter: string, branchParams: any) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  // Staff attendance summary
  const [attendanceSummary] = await sequelize.query(`
    SELECT 
      COUNT(DISTINCT e.id) as total_employees,
      COUNT(DISTINCT CASE WHEN e.is_active THEN e.id END) as active_employees,
      COUNT(DISTINCT ea.employee_id) as checked_in_today,
      COUNT(DISTINCT CASE WHEN ea.check_out_at IS NULL THEN ea.employee_id END) as currently_on_shift,
      COUNT(DISTINCT CASE WHEN eb.assignment_type = 'roaming' AND eb.is_active THEN eb.employee_id END) as roaming_staff,
      
      -- Attendance rate
      ROUND(
        COUNT(DISTINCT ea.employee_id) * 100.0 / 
        NULLIF(COUNT(DISTINCT CASE WHEN e.is_active THEN e.id END), 0), 2
      ) as attendance_rate_today
    FROM branches b
    LEFT JOIN employees e ON b.id = e.branch_id
    LEFT JOIN employee_attendances ea ON e.id = ea.employee_id 
      AND DATE(ea.check_in_at) = CURRENT_DATE
    LEFT JOIN employee_branches eb ON e.id = eb.employee_id AND eb.is_active = true
    WHERE b.tenant_id = :tenantId
    AND b.is_active = true
    ${branchFilter}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Staff on break
  const staffOnBreak = await sequelize.query(`
    SELECT 
      e.name,
      e.position,
      b.name as branch_name,
      ea.check_in_at,
      ea.break_start_at,
      CASE 
        WHEN ea.break_start_at IS NOT NULL AND ea.break_end_at IS NULL THEN 'on_break'
        WHEN ea.check_out_at IS NULL THEN 'on_shift'
        ELSE 'shift_ended'
      END as current_status
    FROM employees e
    JOIN employee_attendances ea ON e.id = ea.employee_id
    JOIN branches b ON e.branch_id = b.id
    WHERE e.tenant_id = :tenantId
    AND DATE(ea.check_in_at) = CURRENT_DATE
    AND ea.check_out_at IS NULL
    AND ea.break_start_at IS NOT NULL
    AND ea.break_end_at IS NULL
    ${branchFilter.replace('b.', 'e.')}
    ORDER BY ea.break_start_at DESC
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Recent check-ins
  const recentCheckins = await sequelize.query(`
    SELECT 
      e.name,
      e.position,
      b.name as branch_name,
      ea.check_in_at,
      ea.check_in_method,
      ea.check_in_location,
      CASE 
        WHEN eb.assignment_type = 'roaming' THEN CONCAT('Roaming from ', (SELECT name FROM branches WHERE id = eb.from_branch_id))
        ELSE 'Regular'
      END as assignment_type
    FROM employees e
    JOIN employee_attendances ea ON e.id = ea.employee_id
    JOIN branches b ON e.branch_id = b.id
    LEFT JOIN employee_branches eb ON e.id = eb.employee_id 
      AND eb.assignment_type = 'roaming' AND eb.is_active = true
    WHERE e.tenant_id = :tenantId
    AND ea.check_in_at >= CURRENT_TIMESTAMP - INTERVAL '2 hours'
    ${branchFilter.replace('b.', 'e.')}
    ORDER BY ea.check_in_at DESC
    LIMIT 10
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Overtime tracking
  const overtimeStaff = await sequelize.query(`
    SELECT 
      e.name,
      e.position,
      b.name as branch_name,
      ea.check_in_at,
      EXTRACT(EPOCH FROM (CURRENT_TIME - ea.check_in_at::time))/3600 as hours_worked,
      CASE 
        WHEN EXTRACT(EPOCH FROM (CURRENT_TIME - ea.check_in_at::time))/3600 > 8 THEN 'overtime'
        ELSE 'normal'
      END as overtime_status
    FROM employees e
    JOIN employee_attendances ea ON e.id = ea.employee_id
    JOIN branches b ON e.branch_id = b.id
    WHERE e.tenant_id = :tenantId
    AND DATE(ea.check_in_at) = CURRENT_DATE
    AND ea.check_out_at IS NULL
    AND ea.check_in_at::time < CURRENT_TIME - INTERVAL '8 hours'
    ${branchFilter.replace('b.', 'e.')}
    ORDER BY hours_worked DESC
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  return {
    attendanceSummary: {
      ...attendanceSummary,
      attendance_rate_today: parseFloat(attendanceSummary.attendance_rate_today || 0)
    },
    staffOnBreak,
    recentCheckins,
    overtimeStaff: overtimeStaff.map(staff => ({
      ...staff,
      hours_worked: parseFloat(staff.hours_worked || 0)
    }))
  };
}

// Get real-time finance data
async function getRealTimeFinance(tenantId: string, branchFilter: string, branchParams: any) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  // Today's financial summary
  const [financialSummary] = await sequelize.query(`
    SELECT 
      COALESCE(SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0) as total_expenses,
      COALESCE(SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END) - 
               SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0) as net_cash_flow,
      
      -- Cash on hand
      COALESCE(SUM(CASE WHEN ft.category = 'cash' AND ft.transaction_type = 'income' THEN ft.amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN ft.category = 'cash' AND ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0) as cash_on_hand,
      
      -- Digital payments
      COALESCE(SUM(CASE WHEN ft.category IN('bank_transfer', 'ewallet', 'card') AND ft.transaction_type = 'income' THEN ft.amount ELSE 0 END), 0) as digital_payments
    FROM finance_transactions ft
    JOIN branches b ON ft.branch_id = b.id
    WHERE ft.tenant_id = :tenantId
    AND DATE(ft.transaction_date) = CURRENT_DATE
    ${branchFilter}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Recent transactions
  const recentTransactions = await sequelize.query(`
    SELECT 
      ft.transaction_number,
      ft.transaction_type,
      ft.category,
      ft.amount,
      ft.description,
      b.name as branch_name,
      ft.created_at,
      u.name as created_by_name
    FROM finance_transactions ft
    JOIN branches b ON ft.branch_id = b.id
    LEFT JOIN users u ON ft.created_by = u.id
    WHERE ft.tenant_id = :tenantId
    AND ft.created_at >= CURRENT_TIMESTAMP - INTERVAL '4 hours'
    ${branchFilter}
    ORDER BY ft.created_at DESC
    LIMIT 10
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  // Inter-branch pending settlements
  const [pendingSettlements] = await sequelize.query(`
    SELECT 
      COUNT(*) as total_pending,
      COALESCE(SUM(total_amount), 0) as total_pending_amount,
      COUNT(CASE WHEN due_date < CURRENT_DATE THEN 1 END) as overdue_count,
      COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE THEN total_amount ELSE 0 END), 0) as overdue_amount
    FROM inter_branch_invoices
    WHERE tenant_id = :tenantId
    AND status IN ('sent', 'viewed')
    ${branchFilter ? `AND (from_branch_id IN (${branchFilter.replace('AND b.id IN (', '').replace(')', '')}) OR to_branch_id IN (${branchFilter.replace('AND b.id IN (', '').replace(')', '')}))` : ''}
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  // Void transactions today
  const [voidSummary] = await sequelize.query(`
    SELECT 
      COUNT(*) as void_count,
      COALESCE(SUM(total), 0) as total_void_amount,
      COUNT(CASE WHEN total > 1000000 THEN 1 END) as large_void_count,
      AVG(total) as avg_void_amount
    FROM pos_transactions
    WHERE tenant_id = :tenantId
    AND status = 'voided'
    AND DATE(voided_at) = CURRENT_DATE
    ${branchFilter}
  `, {
    replacements: { tenantId, ...branchParams },
    type: QueryTypes.SELECT
  });

  return {
    financialSummary: {
      ...financialSummary,
      total_income: parseFloat(financialSummary.total_income || 0),
      total_expenses: parseFloat(financialSummary.total_expenses || 0),
      net_cash_flow: parseFloat(financialSummary.net_cash_flow || 0),
      cash_on_hand: parseFloat(financialSummary.cash_on_hand || 0),
      digital_payments: parseFloat(financialSummary.digital_payments || 0)
    },
    recentTransactions: recentTransactions.map(t => ({
      ...t,
      amount: parseFloat(t.amount || 0)
    })),
    pendingSettlements: {
      ...pendingSettlements,
      total_pending_amount: parseFloat(pendingSettlements.total_pending_amount || 0),
      overdue_amount: parseFloat(pendingSettlements.overdue_amount || 0),
      avg_void_amount: parseFloat(voidSummary.avg_void_amount || 0)
    },
    voidSummary: {
      ...voidSummary,
      total_void_amount: parseFloat(voidSummary.total_void_amount || 0)
    }
  };
}

// Get system health metrics
async function getSystemHealth(tenantId: string) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const [health] = await sequelize.query(`
    SELECT 
      -- Database connection (simplified check)
      'healthy' as database_status,
      
      -- Active branches
      COUNT(CASE WHEN b.is_active THEN 1 END) as active_branches,
      COUNT(*) as total_branches,
      
      -- Last sync times
      MAX(b.updated_at) as last_branch_update,
      MAX(pt.transaction_date) as last_transaction,
      MAX(ea.check_in_at) as last_attendance,
      
      -- System alerts count
      (SELECT COUNT(*) FROM dashboard_notifications dn 
       WHERE dn.tenant_id = :tenantId AND dn.is_read = false) as unread_notifications,
       
      -- Webhook status
      (SELECT COUNT(*) FROM webhook_dispatch_logs wdl 
       WHERE wdl.tenant_id = :tenantId 
       AND wdl.created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
       AND wdl.status = 'failed') as failed_webhooks
    FROM branches b
    LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
    LEFT JOIN employee_attendances ea ON b.id = ea.branch_id
    WHERE b.tenant_id = :tenantId
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  return {
    ...health,
    overall_status: health.failed_webhooks > 5 ? 'warning' : 'healthy',
    uptime: process.uptime(),
    memory_usage: process.memoryUsage(),
    api_response_time: '< 100ms' // Placeholder
  };
}
