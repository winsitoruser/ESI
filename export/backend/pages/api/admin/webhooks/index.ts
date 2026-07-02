import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';
import { canAccessBranch } from '@/lib/branchFilter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Only admin and super_admin can manage webhooks
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    if (req.method === 'GET') {
      const {
        page = 1,
        limit = 20,
        event,
        isActive,
        branchId
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = ['w.tenant_id = :tenantId'];
      let queryParams: any = { tenantId: session.user.tenantId };

      if (event && event !== 'all') {
        whereConditions.push('w.event = :event');
        queryParams.event = event;
      }

      if (isActive !== undefined) {
        whereConditions.push('w.is_active = :isActive');
        queryParams.isActive = isActive === 'true';
      }

      if (branchId) {
        whereConditions.push('w.branch_id = :branchId');
        queryParams.branchId = branchId;
      }

      const whereClause = whereConditions.join(' AND ');

      // Main query
      const webhooks = await sequelize.query(`
        SELECT 
          w.*,
          b.name as branch_name,
          b.code as branch_code,
          creator.name as created_by_name,
          (
            SELECT COUNT(*) FROM webhook_logs wl 
            WHERE wl.webhook_id = w.id 
            AND wl.created_at >= CURRENT_DATE - INTERVAL '7 days'
          ) as recent_deliveries,
          (
            SELECT COUNT(*) FROM webhook_logs wl 
            WHERE wl.webhook_id = w.id 
            AND wl.status = 'success'
            AND wl.created_at >= CURRENT_DATE - INTERVAL '7 days'
          ) as recent_successes,
          (
            SELECT COUNT(*) FROM webhook_logs wl 
            WHERE wl.webhook_id = w.id 
            AND wl.status = 'failed'
            AND wl.created_at >= CURRENT_DATE - INTERVAL '7 days'
          ) as recent_failures
        FROM webhooks w
        LEFT JOIN branches b ON w.branch_id = b.id
        LEFT JOIN users creator ON w.created_by = creator.id
        WHERE ${whereClause}
        ORDER BY w.created_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: {
          ...queryParams,
          limit: parseInt(limit as string),
          offset
        },
        type: QueryTypes.SELECT
      });

      // Count query
      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as total
        FROM webhooks w
        WHERE ${whereClause}
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: webhooks,
        pagination: {
          total: parseInt(countResult.total),
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(parseInt(countResult.total) / parseInt(limit as string))
        }
      });

    } else if (req.method === 'POST') {
      const {
        name,
        description,
        url,
        event,
        isActive = true,
        secretKey,
        retryCount = 3,
        timeout = 30000,
        headers,
        branchId
      } = req.body;

      // Validation
      if (!name || !url || !event) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['name', 'url', 'event']
        });
      }

      // Validate URL
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL format'
        });
      }

      // Check branch access if specified
      if (branchId) {
        const hasAccess = await canAccessBranch(req, res, branchId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this branch'
          });
        }
      }

      const transaction = await sequelize.transaction();

      try {
        // Create webhook
        const [newWebhook] = await sequelize.query(`
          INSERT INTO webhooks (
            id, name, description, url, event, is_active, secret_key,
            retry_count, timeout, headers, branch_id, tenant_id,
            created_by, created_at, updated_at
          ) VALUES (
            UUID(), :name, :description, :url, :event, :isActive, :secretKey,
            :retryCount, :timeout, :headers, :branchId, :tenantId,
            :createdBy, NOW(), NOW()
          )
          RETURNING *
        `, {
          replacements: {
            name,
            description,
            url,
            event,
            isActive,
            secretKey,
            retryCount,
            timeout,
            headers: JSON.stringify(headers || {}),
            branchId,
            tenantId: session.user.tenantId,
            createdBy: session.user.id
          },
          type: QueryTypes.SELECT,
          transaction
        });

        // Test webhook if active
        if (isActive) {
          const { webhookService } = await import('@/lib/webhookService');
          
          await webhookService.triggerWebhooks(
            event,
            {
              type: 'webhook_test',
              message: 'Webhook created successfully',
              webhookId: newWebhook.id
            },
            session.user.tenantId,
            branchId,
            session.user.id
          );
        }

        await transaction.commit();

        return res.status(201).json({
          success: true,
          message: 'Webhook created successfully',
          data: newWebhook
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Webhooks API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
