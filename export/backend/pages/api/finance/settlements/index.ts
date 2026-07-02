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

    // Only admin and super_admin can access settlements
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
        status,
        fromBranchId,
        toBranchId,
        settlementType,
        startDate,
        endDate,
        search
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = [];
      let queryParams: any = {};
      let paramIndex = 1;

      // Filter by tenant
      whereConditions.push(`ibs.tenant_id = :tenantId`);
      queryParams.tenantId = session.user.tenantId;

      if (status && status !== 'all') {
        whereConditions.push(`ibs.status = :status`);
        queryParams.status = status;
      }

      if (fromBranchId) {
        whereConditions.push(`ibs.from_branch_id = :fromBranchId`);
        queryParams.fromBranchId = fromBranchId;
      }

      if (toBranchId) {
        whereConditions.push(`ibs.to_branch_id = :toBranchId`);
        queryParams.toBranchId = toBranchId;
      }

      if (settlementType && settlementType !== 'all') {
        whereConditions.push(`ibs.settlement_type = :settlementType`);
        queryParams.settlementType = settlementType;
      }

      if (startDate) {
        whereConditions.push(`ibs.settlement_date >= :startDate`);
        queryParams.startDate = startDate;
      }

      if (endDate) {
        whereConditions.push(`ibs.settlement_date <= :endDate`);
        queryParams.endDate = endDate;
      }

      if (search) {
        whereConditions.push(`(
          ibs.settlement_number ILIKE :search OR
          ibs.description ILIKE :search OR
          fb.name ILIKE :search OR
          tb.name ILIKE :search
        )`);
        queryParams.search = `%${search}%`;
      }

      const whereClause = whereConditions.join(' AND ');

      // Main query
      const settlements = await sequelize.query(`
        SELECT 
          ibs.*,
          fb.name as from_branch_name,
          fb.code as from_branch_code,
          tb.name as to_branch_name,
          tb.code as to_branch_code,
          creator.name as created_by_name,
          approver.name as approved_by_name,
          payer.name as paid_by_name
        FROM inter_branch_settlements ibs
        LEFT JOIN branches fb ON ibs.from_branch_id = fb.id
        LEFT JOIN branches tb ON ibs.to_branch_id = tb.id
        LEFT JOIN users creator ON ibs.created_by = creator.id
        LEFT JOIN users approver ON ibs.approved_by = approver.id
        LEFT JOIN users payer ON ibs.paid_by = payer.id
        WHERE ${whereClause}
        ORDER BY ibs.created_at DESC
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
        FROM inter_branch_settlements ibs
        LEFT JOIN branches fb ON ibs.from_branch_id = fb.id
        LEFT JOIN branches tb ON ibs.to_branch_id = tb.id
        WHERE ${whereClause}
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: settlements,
        pagination: {
          total: parseInt(countResult.total),
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(parseInt(countResult.total) / parseInt(limit as string))
        }
      });

    } else if (req.method === 'POST') {
      const {
        fromBranchId,
        toBranchId,
        settlementType,
        amount,
        description,
        referenceType = 'manual',
        referenceId,
        settlementDate,
        dueDate,
        attachments,
        notes
      } = req.body;

      // Validation
      if (!fromBranchId || !toBranchId || !settlementType || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['fromBranchId', 'toBranchId', 'settlementType', 'amount']
        });
      }

      if (fromBranchId === toBranchId) {
        return res.status(400).json({
          success: false,
          error: 'Cannot create settlement for same branch'
        });
      }

      // Check branch access
      const hasFromAccess = await canAccessBranch(req, res, fromBranchId);
      const hasToAccess = await canAccessBranch(req, res, toBranchId);

      if (!hasFromAccess || !hasToAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to one or both branches'
        });
      }

      const transaction = await sequelize.transaction();

      try {
        // Generate settlement number
        const [lastSettlement] = await sequelize.query(`
          SELECT settlement_number FROM inter_branch_settlements 
          WHERE tenant_id = :tenantId 
          ORDER BY created_at DESC LIMIT 1
        `, {
          replacements: { tenantId: session.user.tenantId },
          type: QueryTypes.SELECT,
          transaction
        });

        let settlementNumber;
        if (lastSettlement) {
          const lastNumber = parseInt(lastSettlement.settlement_number.split('-').pop());
          settlementNumber = `IBS-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;
        } else {
          settlementNumber = `IBS-${new Date().getFullYear()}-0001`;
        }

        // Create settlement
        const [newSettlement] = await sequelize.query(`
          INSERT INTO inter_branch_settlements (
            id, settlement_number, from_branch_id, to_branch_id,
            settlement_type, amount, description, reference_type,
            reference_id, settlement_date, due_date, status,
            created_by, tenant_id, attachments, notes,
            created_at, updated_at
          ) VALUES (
            UUID(), :settlementNumber, :fromBranchId, :toBranchId,
            :settlementType, :amount, :description, :referenceType,
            :referenceId, :settlementDate, :dueDate, 'pending',
            :createdBy, :tenantId, :attachments, :notes,
            NOW(), NOW()
          )
          RETURNING *
        `, {
          replacements: {
            settlementNumber,
            fromBranchId,
            toBranchId,
            settlementType,
            amount,
            description,
            referenceType,
            referenceId,
            settlementDate: settlementDate || new Date(),
            dueDate,
            createdBy: session.user.id,
            tenantId: session.user.tenantId,
            attachments: JSON.stringify(attachments || []),
            notes
          },
          type: QueryTypes.SELECT,
          transaction
        });

        // Create history record
        await sequelize.query(`
          INSERT INTO inter_branch_settlement_history (
            id, settlement_id, action, new_value, user_id,
            ip_address, user_agent, created_at
          ) VALUES (
            UUID(), :settlementId, 'created', :newValue, :userId,
            :ipAddress, :userAgent, NOW()
          )
        `, {
          replacements: {
            settlementId: newSettlement.id,
            newValue: JSON.stringify(newSettlement),
            userId: session.user.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          },
          transaction
        });

        // If this is related to inventory transfer, update the transfer
        if (referenceType === 'inventory_transfer' && referenceId) {
          await sequelize.query(`
            UPDATE inventory_transfers
            SET settlement_id = :settlementId
            WHERE id = :transferId
          `, {
            replacements: {
              settlementId: newSettlement.id,
              transferId: referenceId
            },
            transaction
          });
        }

        await transaction.commit();

        return res.status(201).json({
          success: true,
          message: 'Inter-branch settlement created successfully',
          data: newSettlement
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
    console.error('Inter-branch settlements API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
