import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
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

    // Only admin and super_admin can approve/reject requests
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Request ID is required' });
    }

    if (req.method === 'PUT') {
      const { action, notes } = req.body;
      
      // Validate action
      const validActions = ['approve', 'reject', 'cancel'];
      if (!validActions.includes(action)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid action' 
        });
      }

      const transaction = await sequelize.transaction();

      try {
        // Get current request
        const [currentRequest] = await sequelize.query(`
          SELECT * FROM roaming_requests WHERE id = :id
        `, {
          replacements: { id },
          type: QueryTypes.SELECT,
          transaction
        });

        if (!currentRequest) {
          await transaction.rollback();
          return res.status(404).json({ 
            success: false, 
            error: 'Roaming request not found' 
          });
        }

        // Check branch access
        const hasFromAccess = await canAccessBranch(req, res, currentRequest.from_branch_id);
        const hasToAccess = await canAccessBranch(req, res, currentRequest.to_branch_id);
        
        if (!hasFromAccess || !hasToAccess) {
          await transaction.rollback();
          return res.status(403).json({ 
            success: false, 
            error: 'Access denied to one or both branches' 
          });
        }

        // Validate status transition
        const validTransitions: Record<string, string[]> = {
          'pending': ['approved', 'rejected', 'cancelled'],
          'approved': ['cancelled'],
          'rejected': [],
          'completed': [],
          'cancelled': []
        };

        const newStatus = action === 'cancel' ? 'cancelled' : action;
        
        if (!validTransitions[currentRequest.status]?.includes(newStatus)) {
          await transaction.rollback();
          return res.status(400).json({ 
            success: false, 
            error: `Cannot ${action} request with status ${currentRequest.status}` 
          });
        }

        // Prepare update data
        const updateData: any = {
          status: newStatus,
          updated_at: new Date()
        };

        if (action === 'approve') {
          updateData.approved_by = session.user.id;
          updateData.approved_at = new Date();
        } else if (action === 'reject') {
          updateData.rejection_reason = notes;
        }

        // Update request
        await sequelize.query(`
          UPDATE roaming_requests SET
            status = :status,
            approved_by = :approvedBy,
            approved_at = :approvedAt,
            rejection_reason = :rejectionReason,
            updated_at = :updatedAt
          WHERE id = :id
        `, {
          replacements: {
            id,
            status: updateData.status,
            approvedBy: updateData.approved_by || null,
            approvedAt: updateData.approved_at || null,
            rejectionReason: updateData.rejection_reason || null,
            updatedAt: updateData.updated_at
          },
          transaction
        });

        // If approved, create temporary branch assignment
        if (action === 'approve') {
          await sequelize.query(`
            INSERT INTO employee_branch_assignments (
              id, employee_id, branch_id, is_primary, can_roam, role,
              start_date, end_date, assigned_by, tenant_id, created_at, updated_at
            ) VALUES (
              UUID(), :employeeId, :branchId, false, true, :role,
              :startDate, :endDate, :assignedBy, :tenantId, NOW(), NOW()
            )
            ON CONFLICT (employee_id, branch_id) DO UPDATE SET
              is_active = true,
              end_date = EXCLUDED.end_date,
              updated_at = NOW()
          `, {
            replacements: {
              employeeId: currentRequest.employee_id,
              branchId: currentRequest.to_branch_id,
              role: 'cashier', // Default role, can be customized
              startDate: currentRequest.start_date,
              endDate: currentRequest.end_date,
              assignedBy: session.user.id,
              tenantId: session.user.tenantId
            },
            transaction
          });
        }

        await transaction.commit();

        // Get updated request with details
        const [updatedRequest] = await sequelize.query(`
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
          WHERE rr.id = :id
        `, {
          replacements: { id },
          type: QueryTypes.SELECT
        });

        return res.status(200).json({
          success: true,
          message: `Roaming request ${action}d successfully`,
          data: updatedRequest
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else if (req.method === 'GET') {
      // Get request details with attendance
      const [request] = await sequelize.query(`
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
        WHERE rr.id = :id
      `, {
        replacements: { id },
        type: QueryTypes.SELECT
      });

      if (!request) {
        return res.status(404).json({ 
          success: false, 
          error: 'Roaming request not found' 
        });
      }

      // Get attendance records if request is approved
      let attendance = [];
      if (request.status === 'approved' || request.status === 'completed') {
        attendance = await sequelize.query(`
          SELECT 
            ra.*,
            v.name as verified_by_name
          FROM roaming_attendance ra
          LEFT JOIN users v ON ra.verified_by = v.id
          WHERE ra.roaming_request_id = :id
          ORDER BY ra.attendance_date DESC
        `, {
          replacements: { id },
          type: QueryTypes.SELECT
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...request,
          attendance
        }
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Roaming request action API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
