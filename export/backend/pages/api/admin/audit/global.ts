import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
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

    // Only super_admin and admin can access global audit logs
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    if (req.method === 'GET') {
      const {
        page = 1,
        limit = 50,
        action,
        entityType,
        entityId,
        userId,
        branchId,
        startDate,
        endDate,
        search
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = ['al.tenant_id = :tenantId'];
      let queryParams: any = { tenantId: session.user.tenantId };

      if (action && action !== 'all') {
        whereConditions.push('al.action = :action');
        queryParams.action = action;
      }

      if (entityType && entityType !== 'all') {
        whereConditions.push('al.entity_type = :entityType');
        queryParams.entityType = entityType;
      }

      if (entityId) {
        whereConditions.push('al.entity_id = :entityId');
        queryParams.entityId = entityId;
      }

      if (userId) {
        whereConditions.push('al.user_id = :userId');
        queryParams.userId = userId;
      }

      if (branchId && branchId !== 'all') {
        whereConditions.push('al.branch_id = :branchId');
        queryParams.branchId = branchId;
      }

      if (startDate) {
        whereConditions.push('DATE(al.created_at) >= :startDate');
        queryParams.startDate = startDate;
      }

      if (endDate) {
        whereConditions.push('DATE(al.created_at) <= :endDate');
        queryParams.endDate = endDate;
      }

      if (search) {
        whereConditions.push(`(
          al.description ILIKE :search OR
          al.entity_name ILIKE :search OR
          u.name ILIKE :search OR
          b.name ILIKE :search
        )`);
        queryParams.search = `%${search}%`;
      }

      const whereClause = whereConditions.join(' AND ');

      // Main query
      const auditLogs = await sequelize.query(`
        SELECT 
          al.*,
          u.name as user_name,
          u.email as user_email,
          b.name as branch_name,
          b.code as branch_code,
          CASE 
            WHEN al.entity_type = 'pos_transaction' THEN (SELECT transaction_number FROM pos_transactions WHERE id = al.entity_id)
            WHEN al.entity_type = 'product' THEN (SELECT name FROM products WHERE id = al.entity_id)
            WHEN al.entity_type = 'employee' THEN (SELECT name FROM employees WHERE id = al.entity_id)
            WHEN al.entity_type = 'customer' THEN (SELECT name FROM customers WHERE id = al.entity_id)
            WHEN al.entity_type = 'branch' THEN (SELECT name FROM branches WHERE id = al.entity_id)
            WHEN al.entity_type = 'user' THEN (SELECT name FROM users WHERE id = al.entity_id)
            ELSE al.entity_name
          END as entity_display_name,
          CASE
            WHEN al.entity_type = 'pos_transaction' THEN 
              (SELECT total FROM pos_transactions WHERE id = al.entity_id LIMIT 1)
            WHEN al.entity_type = 'product' THEN 
              (SELECT selling_price FROM products WHERE id = al.entity_id LIMIT 1)
            WHEN al.entity_type = 'finance_transaction' THEN 
              (SELECT amount FROM finance_transactions WHERE id = al.entity_id LIMIT 1)
            ELSE NULL
          END as entity_amount
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN branches b ON al.branch_id = b.id
        WHERE ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: {
          ...queryParams,
          limit: parseInt(limit as string),
          offset
        },
        type: QueryTypes.SELECT
      });

      // Count total
      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as total
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN branches b ON al.branch_id = b.id
        WHERE ${whereClause}
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      // Get summary statistics
      const [summary] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_logs,
          COUNT(DISTINCT al.user_id) as unique_users,
          COUNT(DISTINCT al.branch_id) as unique_branches,
          COUNT(DISTINCT al.entity_type) as entity_types,
          COUNT(CASE WHEN al.created_at >= CURRENT_DATE THEN 1 END) as today_logs,
          COUNT(CASE WHEN al.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_logs,
          COUNT(CASE WHEN al.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_logs
        FROM audit_logs al
        WHERE al.tenant_id = :tenantId
      `, {
        replacements: { tenantId: session.user.tenantId },
        type: QueryTypes.SELECT
      });

      // Get action breakdown
      const actionBreakdown = await sequelize.query(`
        SELECT 
          action,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM audit_logs WHERE tenant_id = :tenantId), 2) as percentage
        FROM audit_logs
        WHERE tenant_id = :tenantId
        GROUP BY action
        ORDER BY count DESC
      `, {
        replacements: { tenantId: session.user.tenantId },
        type: QueryTypes.SELECT
      });

      // Get entity type breakdown
      const entityTypeBreakdown = await sequelize.query(`
        SELECT 
          entity_type,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM audit_logs WHERE tenant_id = :tenantId), 2) as percentage
        FROM audit_logs
        WHERE tenant_id = :tenantId
        GROUP BY entity_type
        ORDER BY count DESC
      `, {
        replacements: { tenantId: session.user.tenantId },
        type: QueryTypes.SELECT
      });

      // Get top users
      const topUsers = await sequelize.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          COUNT(al.id) as action_count
        FROM audit_logs al
        JOIN users u ON al.user_id = u.id
        WHERE al.tenant_id = :tenantId
        AND al.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY u.id, u.name, u.email
        ORDER BY action_count DESC
        LIMIT 10
      `, {
        replacements: { tenantId: session.user.tenantId },
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: {
          logs: auditLogs,
          summary: {
            ...summary,
            actionBreakdown,
            entityTypeBreakdown,
            topUsers
          },
          pagination: {
            total: parseInt(countResult.total),
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(parseInt(countResult.total) / parseInt(limit as string))
          }
        }
      });

    } else if (req.method === 'POST') {
      // Create audit log entry
      const {
        action,
        entityType,
        entityId,
        entityName,
        oldValues,
        newValues,
        description,
        ipAddress,
        userAgent
      } = req.body;

      // Validation
      if (!action || !entityType) {
        return res.status(400).json({
          success: false,
          error: 'Action and entity type are required'
        });
      }

      // Create audit log
      const [auditLog] = await sequelize.query(`
        INSERT INTO audit_logs (
          id, user_id, branch_id, action, entity_type, entity_id,
          entity_name, old_values, new_values, description,
          ip_address, user_agent, tenant_id, created_at
        ) VALUES (
          UUID(), :userId, :branchId, :action, :entityType, :entityId,
          :entityName, :oldValues, :newValues, :description,
          :ipAddress, :userAgent, :tenantId, NOW()
        )
        RETURNING *
      `, {
        replacements: {
          userId: session.user.id,
          branchId: session.user.branchId,
          action,
          entityType,
          entityId,
          entityName,
          oldValues: JSON.stringify(oldValues || {}),
          newValues: JSON.stringify(newValues || {}),
          description,
          ipAddress,
          userAgent,
          tenantId: session.user.tenantId
        },
        type: QueryTypes.SELECT
      });

      return res.status(201).json({
        success: true,
        message: 'Audit log created successfully',
        data: auditLog
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Audit log API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
