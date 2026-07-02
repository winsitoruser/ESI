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

    // Only super_admin and admin can manage payroll allocation
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    if (req.method === 'GET') {
      const {
        month,
        year,
        employeeId,
        branchId
      } = req.query;

      // Default to current month/year if not provided
      const targetMonth = month || new Date().getMonth() + 1;
      const targetYear = year || new Date().getFullYear();

      // Build WHERE clause
      let whereConditions = [
        'pa.tenant_id = :tenantId',
        'EXTRACT(MONTH FROM pa.period) = :month',
        'EXTRACT(YEAR FROM pa.period) = :year'
      ];
      let queryParams: any = { 
        tenantId: session.user.tenantId,
        month: targetMonth,
        year: targetYear
      };

      if (employeeId) {
        whereConditions.push('pa.employee_id = :employeeId');
        queryParams.employeeId = employeeId;
      }

      if (branchId && branchId !== 'all') {
        whereConditions.push('pa.branch_id = :branchId');
        queryParams.branchId = branchId;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get payroll allocations
      const allocations = await sequelize.query(`
        SELECT 
          pa.*,
          e.name as employee_name,
          e.position,
          e.base_salary,
          b.name as branch_name,
          b.code as branch_code,
          req.name as requested_by_name,
          app.name as approved_by_name
        FROM payroll_allocations pa
        JOIN employees e ON pa.employee_id = e.id
        JOIN branches b ON pa.branch_id = b.id
        LEFT JOIN users req ON pa.requested_by = req.id
        LEFT JOIN users app ON pa.approved_by = app.id
        WHERE ${whereClause}
        ORDER BY pa.created_at DESC
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      // Get summary by branch
      const branchSummary = await sequelize.query(`
        SELECT 
          b.id,
          b.name,
          b.code,
          COUNT(DISTINCT pa.employee_id) as employee_count,
          COALESCE(SUM(pa.allocated_amount), 0) as total_allocation,
          COALESCE(SUM(pa.company_portion), 0) as company_portion,
          COALESCE(SUM(pa.branch_portion), 0) as branch_portion
        FROM branches b
        LEFT JOIN payroll_allocations pa ON b.id = pa.branch_id
          AND pa.tenant_id = :tenantId
          AND EXTRACT(MONTH FROM pa.period) = :month
          AND EXTRACT(YEAR FROM pa.period) = :year
        WHERE b.tenant_id = :tenantId
        AND b.is_active = true
        GROUP BY b.id, b.name, b.code
        ORDER BY total_allocation DESC
      `, {
        replacements: {
          tenantId: session.user.tenantId,
          month: targetMonth,
          year: targetYear
        },
        type: QueryTypes.SELECT
      });

      // Get roaming staff for the period
      const roamingStaff = await sequelize.query(`
        SELECT 
          rr.employee_id,
          e.name as employee_name,
          e.position,
          rr.from_branch_id,
          fb.name as from_branch_name,
          rr.to_branch_id,
          tb.name as to_branch_name,
          rr.start_date,
          rr.end_date,
          EXTRACT(DAYS FROM (rr.end_date - rr.start_date)) + 1 as roaming_days,
          e.base_salary,
          -- Calculate daily rate
          (e.base_salary / 30) as daily_rate,
          -- Calculate allocation amount
          ((e.base_salary / 30) * (EXTRACT(DAYS FROM (rr.end_date - rr.start_date)) + 1)) as allocation_amount
        FROM roaming_requests rr
        JOIN employees e ON rr.employee_id = e.id
        JOIN branches fb ON rr.from_branch_id = fb.id
        JOIN branches tb ON rr.to_branch_id = tb.id
        WHERE rr.status = 'approved'
        AND rr.tenant_id = :tenantId
        AND (
          (EXTRACT(MONTH FROM rr.start_date) = :month AND EXTRACT(YEAR FROM rr.start_date) = :year) OR
          (EXTRACT(MONTH FROM rr.end_date) = :month AND EXTRACT(YEAR FROM rr.end_date) = :year) OR
          (rr.start_date < DATE(:year || '-' || :month || '-01') AND 
           rr.end_date >= DATE(:year || '-' || :month || '-01'))
        )
        ORDER BY e.name
      `, {
        replacements: {
          tenantId: session.user.tenantId,
          month: targetMonth,
          year: targetYear
        },
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: {
          allocations,
          branchSummary,
          roamingStaff,
          period: {
            month: targetMonth,
            year: targetYear,
            monthName: new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' })
          }
        }
      });

    } else if (req.method === 'POST') {
      const {
        period,
        employeeId,
        branchId,
        allocationType = 'roaming',
        allocatedAmount,
        allocationPercentage = 50, // Default 50-50 split
        reason,
        autoApprove = false
      } = req.body;

      // Validation
      if (!period || !employeeId || !branchId || !allocatedAmount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['period', 'employeeId', 'branchId', 'allocatedAmount']
        });
      }

      // Get employee details
      const [employee] = await sequelize.query(`
        SELECT 
          e.*,
          b.name as branch_name,
          u.id as user_id
        FROM employees e
        JOIN branches b ON e.branch_id = b.id
        LEFT JOIN users u ON e.user_id = u.id
        WHERE e.id = :employeeId
        AND e.tenant_id = :tenantId
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

      // Check if allocation already exists
      const [existingAllocation] = await sequelize.query(`
        SELECT id FROM payroll_allocations 
        WHERE employee_id = :employeeId 
        AND branch_id = :branchId
        AND DATE_TRUNC('month', period) = DATE_TRUNC('month', :period::date)
      `, {
        replacements: { 
          employeeId, 
          branchId, 
          period 
        },
        type: QueryTypes.SELECT
      });

      if (existingAllocation) {
        return res.status(400).json({
          success: false,
          error: 'Payroll allocation already exists for this period'
        });
      }

      const transaction = await sequelize.transaction();

      try {
        // Calculate portions
        const companyPortion = allocatedAmount * (allocationPercentage / 100);
        const branchPortion = allocatedAmount * ((100 - allocationPercentage) / 100);

        // Create payroll allocation
        const [newAllocation] = await sequelize.query(`
          INSERT INTO payroll_allocations (
            id, employee_id, branch_id, period, allocation_type,
            allocated_amount, allocation_percentage, company_portion,
            branch_portion, status, reason, requested_by,
            approved_by, approved_at, tenant_id, created_at, updated_at
          ) VALUES (
            UUID(), :employeeId, :branchId, :period, :allocationType,
            :allocatedAmount, :allocationPercentage, :companyPortion,
            :branchPortion, :status, :reason, :requestedBy,
            :approvedBy, :approvedAt, :tenantId, NOW(), NOW()
          )
          RETURNING *
        `, {
          replacements: {
            employeeId,
            branchId,
            period,
            allocationType,
            allocatedAmount,
            allocationPercentage,
            companyPortion,
            branchPortion,
            status: autoApprove ? 'approved' : 'pending',
            reason,
            requestedBy: session.user.id,
            approvedBy: autoApprove ? session.user.id : null,
            approvedAt: autoApprove ? new Date() : null,
            tenantId: session.user.tenantId
          },
          type: QueryTypes.SELECT,
          transaction
        });

        // Create journal entries if approved
        if (autoApprove) {
          // Company expense entry
          await sequelize.query(`
            INSERT INTO finance_journal_entries (
              id, branch_id, entry_date, entry_type,
              reference_type, reference_id, description,
              created_by, tenant_id, created_at, updated_at
            ) VALUES (
              UUID(), :branchId, :period, 'payroll_allocation',
              'payroll_allocation', :allocationId, :description,
              :createdBy, :tenantId, NOW(), NOW()
            )
          `, {
            replacements: {
              branchId,
              period,
              allocationId: newAllocation.id,
              description: `Payroll allocation for ${employee.name} - ${reason || 'Roaming assignment'}`,
              createdBy: session.user.id,
              tenantId: session.user.tenantId
            },
            transaction
          });

          // Get the journal entry ID
          const [journalEntry] = await sequelize.query(`
            SELECT id FROM finance_journal_entries 
            WHERE reference_id = :allocationId 
            ORDER BY created_at DESC LIMIT 1
          `, {
            replacements: { allocationId: newAllocation.id },
            type: QueryTypes.SELECT,
            transaction
          });

          // Debit: Salary Expense (Company Portion)
          await sequelize.query(`
            INSERT INTO finance_journal_entry_lines (
              id, journal_entry_id, account_code, account_name,
              debit_amount, credit_amount, description
            ) VALUES (
              UUID(), :journalEntryId, '5100', 'Salary Expense - Roaming',
              :companyPortion, 0, 'Company portion for roaming staff'
            )
          `, {
            replacements: {
              journalEntryId: journalEntry.id,
              companyPortion
            },
            transaction
          });

          // Credit: Inter-branch Payable (Branch Portion)
          await sequelize.query(`
            INSERT INTO finance_journal_entry_lines (
              id, journal_entry_id, account_code, account_name,
              debit_amount, credit_amount, description
            ) VALUES (
              UUID(), :journalEntryId, '2100', 'Inter-branch Payable',
              0, :branchPortion, 'Branch portion to be charged'
            )
          `, {
            replacements: {
              journalEntryId: journalEntry.id,
              branchPortion
            },
            transaction
          });

          // Update inter-branch balance
          await sequelize.query(`
            INSERT INTO inter_branch_balances (
              id, from_branch_id, to_branch_id, transaction_type,
              reference_id, reference_type, amount, status,
              created_by, tenant_id, created_at, updated_at
            ) VALUES (
              UUID(), :hqBranchId, :branchId, 'payroll_allocation',
              :allocationId, 'payroll_allocation', :branchPortion, 'pending',
              :createdBy, :tenantId, NOW(), NOW()
            )
            ON CONFLICT (from_branch_id, to_branch_id, reference_id)
            DO UPDATE SET
              amount = inter_branch_balances.amount + :branchPortion,
              updated_at = NOW()
          `, {
            replacements: {
              hqBranchId: employee.branch_id, // Assuming employee's home branch is HQ
              branchId,
              allocationId: newAllocation.id,
              branchPortion,
              createdBy: session.user.id,
              tenantId: session.user.tenantId
            },
            transaction
          });
        }

        await transaction.commit();

        // Get complete allocation
        const [completeAllocation] = await sequelize.query(`
          SELECT 
            pa.*,
            e.name as employee_name,
            e.position,
            b.name as branch_name,
            b.code as branch_code
          FROM payroll_allocations pa
          JOIN employees e ON pa.employee_id = e.id
          JOIN branches b ON pa.branch_id = b.id
          WHERE pa.id = :allocationId
        `, {
          replacements: { allocationId: newAllocation.id },
          type: QueryTypes.SELECT
        });

        return res.status(201).json({
          success: true,
          message: `Payroll allocation created${autoApprove ? ' and approved' : ''} successfully`,
          data: completeAllocation
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
    console.error('Payroll allocation API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
