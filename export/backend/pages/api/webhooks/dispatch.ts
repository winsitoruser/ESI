import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
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

    if (req.method === 'POST') {
      const { 
        eventType, 
        data, 
        priority = 'normal',
        targetBranches = 'all',
        channels = ['webhook']
      } = req.body;

      // Validation
      if (!eventType || !data) {
        return res.status(400).json({
          success: false,
          error: 'Event type and data are required'
        });
      }

      // Get event configuration
      const [eventConfig] = await sequelize.query(`
        SELECT * FROM webhook_event_configs
        WHERE event_type = :eventType
        AND tenant_id = :tenantId
        AND is_active = true
      `, {
        replacements: { 
          eventType,
          tenantId: session.user.tenantId 
        },
        type: QueryTypes.SELECT
      });

      if (!eventConfig) {
        return res.status(404).json({
          success: false,
          error: 'Event type not configured'
        });
      }

      // Check if event meets threshold conditions
      const shouldDispatch = checkEventThreshold(data, eventConfig);
      
      if (!shouldDispatch) {
        return res.status(200).json({
          success: true,
          message: 'Event does not meet threshold requirements',
          dispatched: false
        });
      }

      // Prepare webhook payload
      const webhookPayload = {
        eventType,
        timestamp: new Date().toISOString(),
        priority,
        data,
        source: {
          branchId: data.branchId,
          userId: session.user.id,
          userName: session.user.name,
          userRole: session.user.role
        },
        metadata: {
          dispatchedAt: new Date().toISOString(),
          channels,
          targetBranches
        }
      };

      // Dispatch to different channels
      const dispatchResults = [];

      // Webhook channel
      if (channels.includes('webhook')) {
        try {
          const webhookResult = await webhookService.triggerWebhooks(
            eventType,
            webhookPayload,
            session.user.tenantId,
            targetBranches === 'all' ? null : targetBranches,
            session.user.id
          );
          
          dispatchResults.push({
            channel: 'webhook',
            success: true,
            result: webhookResult
          });
        } catch (error) {
          dispatchResults.push({
            channel: 'webhook',
            success: false,
            error: error.message
          });
        }
      }

      // Email channel
      if (channels.includes('email')) {
        const emailResult = await dispatchEmail(webhookPayload, eventConfig);
        dispatchResults.push(emailResult);
      }

      // WhatsApp channel
      if (channels.includes('whatsapp')) {
        const whatsappResult = await dispatchWhatsApp(webhookPayload, eventConfig);
        dispatchResults.push(whatsappResult);
      }

      // Dashboard real-time channel
      if (channels.includes('dashboard')) {
        const dashboardResult = await dispatchDashboard(webhookPayload, eventConfig);
        dispatchResults.push(dashboardResult);
      }

      // Log the dispatch
      await sequelize.query(`
        INSERT INTO webhook_dispatch_logs (
          id, event_type, payload, priority, channels, target_branches,
          dispatched_by, tenant_id, created_at
        ) VALUES (
          UUID(), :eventType, :payload, :priority, :channels, :targetBranches,
          :dispatchedBy, :tenantId, NOW()
        )
      `, {
        replacements: {
          eventType,
          payload: JSON.stringify(webhookPayload),
          priority,
          channels: JSON.stringify(channels),
          targetBranches: JSON.stringify(targetBranches),
          dispatchedBy: session.user.id,
          tenantId: session.user.tenantId
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Event dispatched successfully',
        dispatched: true,
        results: dispatchResults
      });

    } else if (req.method === 'GET') {
      // Get dispatch logs
      const {
        page = 1,
        limit = 20,
        eventType,
        status,
        startDate,
        endDate
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = ['wdl.tenant_id = :tenantId'];
      let queryParams: any = { tenantId: session.user.tenantId };

      if (eventType) {
        whereConditions.push('wdl.event_type = :eventType');
        queryParams.eventType = eventType;
      }

      if (status) {
        whereConditions.push('wdl.status = :status');
        queryParams.status = status;
      }

      if (startDate) {
        whereConditions.push('DATE(wdl.created_at) >= :startDate');
        queryParams.startDate = startDate;
      }

      if (endDate) {
        whereConditions.push('DATE(wdl.created_at) <= :endDate');
        queryParams.endDate = endDate;
      }

      const whereClause = whereConditions.join(' AND ');

      const logs = await sequelize.query(`
        SELECT 
          wdl.*,
          u.name as dispatched_by_name,
          COUNT(wlr.id) as webhook_results_count,
          COUNT(CASE WHEN wlr.success = true THEN 1 END) as success_count
        FROM webhook_dispatch_logs wdl
        LEFT JOIN users u ON wdl.dispatched_by = u.id
        LEFT JOIN webhook_results wlr ON wdl.id = wlr.dispatch_log_id
        WHERE ${whereClause}
        GROUP BY wdl.id, u.name
        ORDER BY wdl.created_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: {
          ...queryParams,
          limit: parseInt(limit as string),
          offset
        },
        type: QueryTypes.SELECT
      });

      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as total
        FROM webhook_dispatch_logs wdl
        WHERE ${whereClause}
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: logs,
        pagination: {
          total: parseInt(countResult.total),
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(parseInt(countResult.total) / parseInt(limit as string))
        }
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Centralized webhook dispatcher error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Check if event meets threshold conditions
function checkEventThreshold(data: any, config: any): boolean {
  const thresholds = JSON.parse(config.thresholds || '{}');
  
  // Check amount threshold
  if (thresholds.minAmount && data.amount) {
    if (parseFloat(data.amount) < thresholds.minAmount) {
      return false;
    }
  }

  // Check time-based threshold
  if (thresholds.businessHoursOnly) {
    const hour = new Date().getHours();
    if (hour < 9 || hour > 17) {
      return false;
    }
  }

  // Check specific conditions
  if (config.event_type === 'transaction_voided') {
    // Always notify for voided transactions above threshold
    return data.total >= 100000; // Default threshold: 100K
  }

  if (config.event_type === 'low_stock') {
    // Only notify if stock is critically low
    return data.stockLevel <= 0;
  }

  return true;
}

// Dispatch email notification
async function dispatchEmail(payload: any, config: any) {
  try {
    // This would integrate with your email service
    console.log('Email dispatch:', {
      to: config.email_recipients,
      subject: `[${payload.eventType}] ${payload.data.branchName}`,
      template: config.email_template,
      data: payload
    });

    return {
      channel: 'email',
      success: true,
      recipients: config.email_recipients
    };
  } catch (error) {
    return {
      channel: 'email',
      success: false,
      error: error.message
    };
  }
}

// Dispatch WhatsApp notification
async function dispatchWhatsApp(payload: any, config: any) {
  try {
    // This would integrate with WhatsApp Business API
    const message = formatWhatsAppMessage(payload);
    
    console.log('WhatsApp dispatch:', {
      to: config.whatsapp_recipients,
      message
    });

    return {
      channel: 'whatsapp',
      success: true,
      recipients: config.whatsapp_recipients
    };
  } catch (error) {
    return {
      channel: 'whatsapp',
      success: false,
      error: error.message
    };
  }
}

// Dispatch to dashboard (real-time)
async function dispatchDashboard(payload: any, config: any) {
  try {
    // This would use WebSockets or Server-Sent Events
    // For now, just store in a notifications table
    const { sequelize } = await import('@/lib/sequelizeClient');
    
    await sequelize.query(`
      INSERT INTO dashboard_notifications (
        id, user_id, title, message, type, priority, data,
        is_read, tenant_id, created_at
      ) VALUES (
        UUID(), :userId, :title, :message, :type, :priority, :data,
        false, :tenantId, NOW()
      )
    `, {
      replacements: {
        userId: payload.source.userId,
        title: `${payload.eventType.replace('_', ' ').toUpperCase()}`,
        message: formatDashboardMessage(payload),
        type: payload.eventType,
        priority: payload.priority,
        data: JSON.stringify(payload),
        tenantId: payload.data.tenantId
      }
    });

    return {
      channel: 'dashboard',
      success: true
    };
  } catch (error) {
    return {
      channel: 'dashboard',
      success: false,
      error: error.message
    };
  }
}

// Format WhatsApp message
function formatWhatsAppMessage(payload: any): string {
  const { eventType, data } = payload;
  
  switch (eventType) {
    case 'transaction_voided':
      return `🚨 *VOID ALERT*\n` +
             `Branch: ${data.branchName}\n` +
             `Transaction: ${data.transactionNumber}\n` +
             `Amount: Rp ${parseFloat(data.total).toLocaleString('id-ID')}\n` +
             `Reason: ${data.reason}\n` +
             `By: ${payload.source.userName}`;
    
    case 'low_stock':
      return `⚠️ *LOW STOCK ALERT*\n` +
             `Branch: ${data.branchName}\n` +
             `Product: ${data.productName}\n` +
             `Stock: ${data.stockLevel} ${data.unit}\n` +
             `Min: ${data.minStock} ${data.unit}`;
    
    default:
      return `📢 *${eventType.toUpperCase()}*\n` +
             `${JSON.stringify(data, null, 2)}`;
  }
}

// Format dashboard message
function formatDashboardMessage(payload: any): string {
  const { eventType, data } = payload;
  
  switch (eventType) {
    case 'transaction_voided':
      return `Transaction ${data.transactionNumber} voided at ${data.branchName}. Amount: Rp ${parseFloat(data.total).toLocaleString('id-ID')}`;
    
    case 'low_stock':
      return `${data.productName} is running low on stock at ${data.branchName}`;
    
    default:
      return `${eventType} event occurred`;
  }
}
