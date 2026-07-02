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
        branchIds,
        department,
        position,
        status,
        includeRoaming = false,
        includeAttendance = false,
        date
      } = req.query;

      // Determine which branches to include
      let targetBranchIds: string[] = [];
      
      if (branchIds) {
        targetBranchIds = Array.isArray(JSON.parse(branchIds as string)) 
          ? JSON.parse(branchIds as string)
          : [branchIds as string];
      } else if (session.user.role === 'super_admin' || session.user.role === 'admin') {
        // Get all branches for admin
        const branches = await sequelize.query(`
          SELECT id FROM branches 
          WHERE tenant_id = :tenantId 
          AND is_active = true
        `, {
          replacements: { tenantId: session.user.tenantId },
          type: QueryTypes.SELECT
        });
        targetBranchIds = branches.map((b: any) => b.id);
      } else {
        // Use assigned branches for other roles
        targetBranchIds = [session.user.branchId].filter(Boolean);
      }

      if (targetBranchIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No branches specified or accessible'
        });
      }

      // Build WHERE clause
      let whereConditions = ['e.tenant_id = :tenantId'];
      let queryParams: any = { tenantId: session.user.tenantId };

      // Filter by branches
      if (includeRoaming === 'true') {
        // Include employees assigned to or roaming in these branches
        whereConditions.push(`(
          eba.branch_id IN (:branchIds)
          OR EXISTS (
            SELECT 1 FROM roaming_requests rr 
            WHERE rr.employee_id = e.id
            AND rr.status = 'approved'
            AND :currentDate BETWEEN rr.start_date AND rr.end_date
            AND rr.to_branch_id IN (:branchIds)
          )
        )`);
        queryParams.branchIds = targetBranchIds;
        queryParams.currentDate = date || new Date().toISOString().split('T')[0];
      } else {
        // Only primary assignments
        whereConditions.push('eba.branch_id IN (:branchIds) AND eba.is_primary = true');
        queryParams.branchIds = targetBranchIds;
      }

      if (department) {
        whereConditions.push('e.department = :department');
        queryParams.department = department;
      }

      if (position) {
        whereConditions.push('e.position = :position');
        queryParams.position = position;
      }

      if (status) {
        whereConditions.push('e.status = :status');
        queryParams.status = status;
      }

      const whereClause = whereConditions.join(' AND ');

      // Main query
      const employees = await sequelize.query(`
        SELECT DISTINCT
          e.id,
          e.name,
          e.email,
          e.phone,
          e.position,
          e.department,
          e.status,
          e.hire_date,
          e.salary,
          e.profile_image,
          CASE 
            WHEN eba.is_primary = true THEN eba.branch_id
            ELSE (
              SELECT rr.to_branch_id FROM roaming_requests rr
              WHERE rr.employee_id = e.id
              AND rr.status = 'approved'
              AND :currentDate BETWEEN rr.start_date AND rr.end_date
              AND rr.to_branch_id IN (:branchIds)
              LIMIT 1
            )
          END as current_branch_id,
          CASE 
            WHEN eba.is_primary = true THEN b.name
            ELSE (
              SELECT br.name FROM branches br
              JOIN roaming_requests rr ON br.id = rr.to_branch_id
              WHERE rr.employee_id = e.id
              AND rr.status = 'approved'
              AND :currentDate BETWEEN rr.start_date AND rr.end_date
              AND rr.to_branch_id IN (:branchIds)
              LIMIT 1
            )
          END as current_branch_name,
          CASE 
            WHEN eba.is_primary = true THEN b.code
            ELSE (
              SELECT br.code FROM branches br
              JOIN roaming_requests rr ON br.id = rr.to_branch_id
              WHERE rr.employee_id = e.id
              AND rr.status = 'approved'
              AND :currentDate BETWEEN rr.start_date AND rr.end_date
              AND rr.to_branch_id IN (:branchIds)
              LIMIT 1
            )
          END as current_branch_code,
          CASE 
            WHEN eba.is_primary = true THEN false
            ELSE true
          END as is_roaming,
          eba.is_primary,
          eba.can_roam,
          u.id as user_id,
          u.last_login
        FROM employees e
        JOIN employee_branch_assignments eba ON e.id = eba.employee_id
        LEFT JOIN branches b ON eba.branch_id = b.id
        LEFT JOIN users u ON e.user_id = u.id
        WHERE ${whereClause}
        AND eba.is_active = true
        ORDER BY e.name
      `, {
        replacements: {
          ...queryParams,
          currentDate: date || new Date().toISOString().split('T')[0]
        },
        type: QueryTypes.SELECT
      });

      // Get branch assignments for each employee
      const employeeIds = employees.map((e: any) => e.id);
      const assignments = employeeIds.length > 0 ? await sequelize.query(`
        SELECT 
          eba.employee_id,
          eba.branch_id,
          eba.is_primary,
          eba.can_roam,
          eba.role,
          eba.start_date,
          eba.end_date,
          b.name as branch_name,
          b.code as branch_code
        FROM employee_branch_assignments eba
        JOIN branches b ON eba.branch_id = b.id
        WHERE eba.employee_id IN (:employeeIds)
        AND eba.is_active = true
        ORDER BY eba.is_primary DESC, eba.start_date DESC
      `, {
        replacements: { employeeIds },
        type: QueryTypes.SELECT
      }) : [];

      // Group assignments by employee
      const assignmentsByEmployee = assignments.reduce((acc: any, assignment: any) => {
        if (!acc[assignment.employee_id]) {
          acc[assignment.employee_id] = [];
        }
        acc[assignment.employee_id].push(assignment);
        return acc;
      }, {});

      // Get attendance if requested
      let attendanceByEmployee = {};
      if (includeAttendance === 'true') {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const attendanceRecords = employeeIds.length > 0 ? await sequelize.query(`
          SELECT 
            employee_id,
            check_in_at,
            check_out_at,
            is_within_geofence,
            EXTRACT(EPOCH FROM (check_out_at - check_in_at)) / 3600 as work_hours
          FROM employee_attendances
          WHERE employee_id IN (:employeeIds)
          AND DATE(check_in_at) = :targetDate
        `, {
          replacements: { employeeIds, targetDate },
          type: QueryTypes.SELECT
        }) : [];

        attendanceByEmployee = attendanceRecords.reduce((acc: any, record: any) => {
          acc[record.employee_id] = record;
          return acc;
        }, {});
      }

      // Get roaming requests if requested
      let roamingByEmployee = {};
      if (includeRoaming === 'true') {
        const roamingRecords = employeeIds.length > 0 ? await sequelize.query(`
          SELECT 
            employee_id,
            request_number,
            from_branch_id,
            to_branch_id,
            start_date,
            end_date,
            status,
            reason
          FROM roaming_requests
          WHERE employee_id IN (:employeeIds)
          AND (:currentDate BETWEEN start_date AND end_date OR status = 'pending')
          ORDER BY created_at DESC
        `, {
          replacements: { 
            employeeIds,
            currentDate: date || new Date().toISOString().split('T')[0]
          },
          type: QueryTypes.SELECT
        }) : [];

        roamingByEmployee = roamingRecords.reduce((acc: any, record: any) => {
          if (!acc[record.employee_id]) {
            acc[record.employee_id] = [];
          }
          acc[record.employee_id].push(record);
          return acc;
        }, {});
      }

      // Combine all data
      const roster = employees.map((employee: any) => ({
        ...employee,
        assignments: assignmentsByEmployee[employee.id] || [],
        attendance: attendanceByEmployee[employee.id] || null,
        roamingRequests: roamingByEmployee[employee.id] || []
      }));

      // Get summary statistics
      const summary = {
        totalEmployees: employees.length,
        byBranch: employees.reduce((acc: any, e: any) => {
          const branch = e.current_branch_name || 'Unassigned';
          if (!acc[branch]) {
            acc[branch] = { total: 0, active: 0, roaming: 0 };
          }
          acc[branch].total++;
          if (e.status === 'active') acc[branch].active++;
          if (e.is_roaming) acc[branch].roaming++;
          return acc;
        }, {}),
        byDepartment: employees.reduce((acc: any, e: any) => {
          const dept = e.department || 'Unassigned';
          acc[dept] = (acc[dept] || 0) + 1;
          return acc;
        }, {}),
        byPosition: employees.reduce((acc: any, e: any) => {
          const pos = e.position || 'Unassigned';
          acc[pos] = (acc[pos] || 0) + 1;
          return acc;
        }, {})
      };

      return res.status(200).json({
        success: true,
        data: {
          employees: roster,
          summary,
          filters: {
            branches: targetBranchIds,
            department,
            position,
            status,
            includeRoaming: includeRoaming === 'true',
            includeAttendance: includeAttendance === 'true',
            date: date || new Date().toISOString().split('T')[0]
          }
        }
      });

    } else if (req.method === 'POST') {
      // Create or update employee branch assignment
      const {
        employeeId,
        branchId,
        isPrimary = false,
        canRoam = false,
        role,
        startDate,
        endDate,
        notes
      } = req.body;

      if (!employeeId || !branchId) {
        return res.status(400).json({
          success: false,
          error: 'Employee ID and Branch ID are required'
        });
      }

      // Check branch access
      const hasAccess = await canAccessBranch(req, res, branchId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this branch'
        });
      }

      // Verify employee exists and belongs to tenant
      const [employee] = await sequelize.query(`
        SELECT id, tenant_id FROM employees 
        WHERE id = :employeeId AND tenant_id = :tenantId
      `, {
        replacements: { 
          employeeId, 
          tenantId: session.user.tenantId 
        },
        type: QueryTypes.SELECT
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
      }

      const transaction = await sequelize.transaction();

      try {
        // If setting as primary, unset other primary assignments
        if (isPrimary) {
          await sequelize.query(`
            UPDATE employee_branch_assignments
            SET is_primary = false, updated_at = NOW()
            WHERE employee_id = :employeeId
          `, {
            replacements: { employeeId },
            transaction
          });
        }

        // Create or update assignment
        const [assignment] = await sequelize.query(`
          INSERT INTO employee_branch_assignments (
            id, employee_id, branch_id, is_primary, can_roam, role,
            start_date, end_date, notes, assigned_by, tenant_id,
            created_at, updated_at
          ) VALUES (
            UUID(), :employeeId, :branchId, :isPrimary, :canRoam, :role,
            :startDate, :endDate, :notes, :assignedBy, :tenantId,
            NOW(), NOW()
          )
          ON CONFLICT (employee_id, branch_id)
          DO UPDATE SET
            is_primary = EXCLUDED.is_primary,
            can_roam = EXCLUDED.can_roam,
            role = EXCLUDED.role,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            notes = EXCLUDED.notes,
            updated_at = NOW()
          RETURNING *
        `, {
          replacements: {
            employeeId,
            branchId,
            isPrimary,
            canRoam,
            role,
            startDate,
            endDate,
            notes,
            assignedBy: session.user.id,
            tenantId: session.user.tenantId
          },
          type: QueryTypes.SELECT,
          transaction
        });

        await transaction.commit();

        return res.status(200).json({
          success: true,
          message: 'Employee branch assignment updated successfully',
          data: assignment
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
    console.error('Multi-branch roster API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
