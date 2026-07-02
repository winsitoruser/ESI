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

    if (req.method === 'GET') {
      const {
        page = 1,
        limit = 20,
        status,
        employeeId,
        fromBranchId,
        toBranchId,
        startDate,
        endDate
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = ['rr.tenant_id = :tenantId'];
      let queryParams: any = { tenantId: session.user.tenantId };

      // Filter by role
      if (session.user.role === 'manager_cabang') {
        // Branch managers can only see requests involving their branch
        whereConditions.push('(rr.from_branch_id = :branchId OR rr.to_branch_id = :branchId)');
        queryParams.branchId = session.user.branchId;
      }

      if (status && status !== 'all') {
        whereConditions.push('rr.status = :status');
        queryParams.status = status;
      }

      if (employeeId) {
        whereConditions.push('rr.employee_id = :employeeId');
        queryParams.employeeId = employeeId;
      }

      if (fromBranchId) {
        whereConditions.push('rr.from_branch_id = :fromBranchId');
        queryParams.fromBranchId = fromBranchId;
      }

      if (toBranchId) {
        whereConditions.push('rr.to_branch_id = :toBranchId');
        queryParams.toBranchId = toBranchId;
      }

      if (startDate) {
        whereConditions.push('rr.start_date >= :startDate');
        queryParams.startDate = startDate;
      }

      if (endDate) {
        whereConditions.push('rr.end_date <= :endDate');
        queryParams.endDate = endDate;
      }

      const whereClause = whereConditions.join(' AND ');

      // Main query
      const roamingRequests = await sequelize.query(`
        SELECT 
          rr.*,
          e.name as employee_name,
          e.position as employee_position,
          fb.name as from_branch_name,
          fb.code as from_branch_code,
          tb.name as to_branch_name,
          tb.code as to_branch_code,
          requester.name as requested_by_name,
          approver.name as approved_by_name
        FROM roaming_requests rr
        LEFT JOIN employees e ON rr.employee_id = e.id
        LEFT JOIN branches fb ON rr.from_branch_id = fb.id
        LEFT JOIN branches tb ON rr.to_branch_id = tb.id
        LEFT JOIN users requester ON rr.requested_by = requester.id
        LEFT JOIN users approver ON rr.approved_by = approver.id
        WHERE ${whereClause}
        ORDER BY rr.created_at DESC
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
        FROM roaming_requests rr
        WHERE ${whereClause}
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: roamingRequests,
        pagination: {
          total: parseInt(countResult.total),
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(parseInt(countResult.total) / parseInt(limit as string))
        }
      });

    } else if (req.method === 'POST') {
      const {
        employeeId,
        fromBranchId,
        toBranchId,
        startDate,
        endDate,
        reason,
        notes
      } = req.body;

      // Validation
      if (!employeeId || !fromBranchId || !toBranchId || !startDate || !endDate || !reason) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['employeeId', 'fromBranchId', 'toBranchId', 'startDate', 'endDate', 'reason']
        });
      }

      if (fromBranchId === toBranchId) {
        return res.status(400).json({
          success: false,
          error: 'From and To branches cannot be the same'
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

      // Check if employee can roam
      const [employeeAssignment] = await sequelize.query(`
        SELECT can_roam FROM employee_branch_assignments
        WHERE employee_id = :employeeId
        AND branch_id = :fromBranchId
        AND is_active = true
        LIMIT 1
      `, {
        replacements: { employeeId, fromBranchId },
        type: QueryTypes.SELECT
      });

      if (!employeeAssignment || !employeeAssignment.can_roam) {
        return res.status(400).json({
          success: false,
          error: 'Employee is not authorized to roam from this branch'
        });
      }

      // Check for overlapping requests
      const [overlapCheck] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM roaming_requests
        WHERE employee_id = :employeeId
        AND status IN ('pending', 'approved')
        AND (
          (start_date <= :startDate AND end_date >= :startDate) OR
          (start_date <= :endDate AND end_date >= :endDate) OR
          (start_date >= :startDate AND end_date <= :endDate)
        )
      `, {
        replacements: { employeeId, startDate, endDate },
        type: QueryTypes.SELECT
      });

      if (parseInt(overlapCheck.count) > 0) {
        return res.status(400).json({
          success: false,
          error: 'Employee already has a roaming request for these dates'
        });
      }

      const transaction = await sequelize.transaction();

      try {
        // Generate request number
        const [lastRequest] = await sequelize.query(`
          SELECT request_number FROM roaming_requests 
          WHERE tenant_id = :tenantId 
          ORDER BY created_at DESC LIMIT 1
        `, {
          replacements: { tenantId: session.user.tenantId },
          type: QueryTypes.SELECT,
          transaction
        });

        let requestNumber;
        if (lastRequest) {
          const lastNumber = parseInt(lastRequest.request_number.split('-').pop());
          requestNumber = `RR-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;
        } else {
          requestNumber = `RR-${new Date().getFullYear()}-0001`;
        }

        // Create roaming request
        const [newRequest] = await sequelize.query(`
          INSERT INTO roaming_requests (
            id, request_number, employee_id, from_branch_id, to_branch_id,
            start_date, end_date, reason, status, requested_by,
            tenant_id, notes, created_at, updated_at
          ) VALUES (
            UUID(), :requestNumber, :employeeId, :fromBranchId, :toBranchId,
            :startDate, :endDate, :reason, 'pending', :requestedBy,
            :tenantId, :notes, NOW(), NOW()
          )
          RETURNING *
        `, {
          replacements: {
            requestNumber,
            employeeId,
            fromBranchId,
            toBranchId,
            startDate,
            endDate,
            reason,
            requestedBy: session.user.id,
            tenantId: session.user.tenantId,
            notes
          },
          type: QueryTypes.SELECT,
          transaction
        });

        await transaction.commit();

        return res.status(201).json({
          success: true,
          message: 'Roaming request created successfully',
          data: newRequest
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
    console.error('Roaming requests API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
