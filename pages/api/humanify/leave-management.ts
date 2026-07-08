import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../lib/middleware/withHQAuth';

let sequelize: any, Op: any;
try {
  const db = require('sequelize');
  Op = db.Op;
  sequelize = require('../../../lib/sequelize');
} catch (e) {}

let LeaveType: any, LeaveBalance: any, LeaveApprovalConfig: any;
try {
  LeaveType = require('../../../models/LeaveType');
  LeaveBalance = require('../../../models/LeaveBalance');
  LeaveApprovalConfig = require('../../../models/LeaveApprovalConfig');
} catch (e) {
  console.warn('Leave models not loaded:', e);
}

/**
 * 🔒 Get tenantId from session (injected by withHQAuth)
 */
function getTenantId(req: NextApiRequest): string | null {
  const session = (req as any).session;
  return session?.user?.tenantId || null;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = getTenantId(req);

    const { action } = req.query;

    switch (req.method) {
      case 'GET':
        if (action === 'types') return getLeaveTypes(req, res, session);
        if (action === 'balances') return getLeaveBalances(req, res, session, tenantId);
        if (action === 'approval-configs') return getApprovalConfigs(req, res, session, tenantId);
        if (action === 'requests') return getLeaveRequests(req, res, session);
        if (action === 'pending-approvals') return getPendingApprovals(req, res, session, tenantId);
        // Default: return all overview data
        return getOverview(req, res, session);
      case 'POST':
        if (action === 'request') return createLeaveRequest(req, res, session);
        if (action === 'approval-config') return createApprovalConfig(req, res, session);
        if (action === 'approve') return approveStep(req, res, session);
        if (action === 'reject') return rejectRequest(req, res, session);
        if (action === 'type') return createLeaveType(req, res, session);
        if (action === 'balance-init') return initializeBalances(req, res, session);
        return res.status(400).json({ error: 'Unknown action' });
      case 'PUT':
        if (action === 'approval-config') return updateApprovalConfig(req, res, session);
        if (action === 'type') return updateLeaveType(req, res, session);
        return res.status(400).json({ error: 'Unknown action' });
      case 'DELETE':
        if (action === 'approval-config') return deleteApprovalConfig(req, res, session);
        if (action === 'type') return deleteLeaveType(req, res, session);
        return res.status(400).json({ error: 'Unknown action' });
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Leave Management API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ===== GET: Overview =====
async function getOverview(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const tenantId = session.user.tenantId;

    // Fetch leave types
    let leaveTypes: any[] = [];
    if (LeaveType) {
      const where: any = { isActive: true };
      if (tenantId) where[Op.or] = [{ tenantId }, { tenantId: null }];
      leaveTypes = await LeaveType.findAll({ where, order: [['sort_order', 'ASC']] });
    }
    if (leaveTypes.length === 0 && sequelize) {
      try {
        const [rows] = await sequelize.query(
          `SELECT * FROM leave_types WHERE is_active = true ORDER BY sort_order ASC`
        );
        leaveTypes = rows || [];
      } catch { /* */ }
    }
    if (leaveTypes.length === 0) leaveTypes = getMockLeaveTypes();

    // Fetch approval configs
    let approvalConfigs: any[] = [];
    if (LeaveApprovalConfig) {
      const where: any = { isActive: true };
      if (tenantId) where[Op.or] = [{ tenantId }, { tenantId: null }];
      approvalConfigs = await LeaveApprovalConfig.findAll({ where, order: [['priority', 'DESC']] });
    }
    if (approvalConfigs.length === 0) approvalConfigs = getMockApprovalConfigs();

    // Fetch leave requests summary
    let requests: any[] = [];
    let summary = { total: 0, pending: 0, approved: 0, rejected: 0, totalDaysUsed: 0 };
    if (sequelize) {
      try {
        const rows = await sequelize.query(`
          SELECT lr.*, e.name as employee_name, e.position, e.department, e.branch_id
          FROM leave_requests lr
          LEFT JOIN employees e ON lr.employee_id = e.id
          ${tenantId ? "WHERE lr.tenant_id = :tenantId" : ""}
          ORDER BY lr.created_at DESC LIMIT 50
        `, { replacements: { tenantId } });
        requests = (Array.isArray(rows) ? rows[0] : rows) || [];
      } catch (e) {}
    }
    if (requests.length === 0) requests = getMockRequests();

    summary = {
      total: requests.length,
      pending: requests.filter((r: any) => r.status === 'pending').length,
      approved: requests.filter((r: any) => r.status === 'approved').length,
      rejected: requests.filter((r: any) => r.status === 'rejected').length,
      totalDaysUsed: requests.filter((r: any) => r.status === 'approved')
        .reduce((s: number, r: any) => s + (r.total_days || r.totalDays || 0), 0)
    };

    // Fetch balances
    let balances: any[] = [];
    if (LeaveBalance) {
      try {
        const where: any = { year: new Date().getFullYear() };
        if (tenantId) where.tenantId = tenantId;
        balances = await LeaveBalance.findAll({ where });
      } catch (e) {}
    }
    if (balances.length === 0 && sequelize) {
      try {
        const [rows] = await sequelize.query(`
          SELECT lb.*, lt.code AS leave_type_code, lt.name AS leave_type_name,
                 e.name AS employee_name, e.department
          FROM leave_balances lb
          JOIN leave_types lt ON lb.leave_type_id = lt.id
          LEFT JOIN employees e ON lb.employee_id = e.id
          WHERE lb.year = :year ${tenantId ? 'AND lb.tenant_id = :tenantId' : ''}
          ORDER BY e.name, lt.sort_order
        `, { replacements: { year: new Date().getFullYear(), tenantId } });
        balances = rows || [];
      } catch { /* */ }
    }

    return res.status(200).json({
      success: true,
      leaveTypes: leaveTypes.map((lt: any) => lt.toJSON ? lt.toJSON() : lt),
      approvalConfigs: approvalConfigs.map((ac: any) => ac.toJSON ? ac.toJSON() : ac),
      requests: requests.map((r: any) => r.toJSON ? r.toJSON() : r),
      balances: balances.map((b: any) => b.toJSON ? b.toJSON() : b),
      summary
    });
  } catch (e: any) {
    console.warn('getOverview error:', e.message);
    return res.status(200).json({
      success: true,
      leaveTypes: getMockLeaveTypes(),
      approvalConfigs: getMockApprovalConfigs(),
      requests: getMockRequests(),
      balances: [],
      summary: { total: 4, pending: 2, approved: 2, rejected: 0, totalDaysUsed: 7 }
    });
  }
}

// ===== GET: Leave Types =====
async function getLeaveTypes(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    if (!LeaveType) return res.json({ success: true, data: getMockLeaveTypes() });
    const where: any = {};
    const tenantId = session.user.tenantId;
    if (tenantId) where[Op.or] = [{ tenantId }, { tenantId: null }];
    const types = await LeaveType.findAll({ where, order: [['sort_order', 'ASC']] });
    return res.json({ success: true, data: types.length > 0 ? types : getMockLeaveTypes() });
  } catch (e: any) {
    return res.json({ success: true, data: getMockLeaveTypes() });
  }
}

// ===== GET: Balances =====
async function getLeaveBalances(req: NextApiRequest, res: NextApiResponse, session: any, tenantId: string | null) {
  const { employeeId, year } = req.query;
  try {
    if (!LeaveBalance || !sequelize) return res.json({ success: true, data: [] });

    // 🔒 TENANT ISOLATION: Add tenant filter
    let tenantClause = "";
    const replacements: any = { year: year || new Date().getFullYear(), employeeId };
    if (tenantId) {
      tenantClause = "AND lb.tenant_id = :tenantId";
      replacements.tenantId = tenantId;
    }

    const [rows] = await sequelize.query(`
      SELECT lb.*, lt.code as leave_type_code, lt.name as leave_type_name, lt.color,
             lt.max_days_per_year, e.name as employee_name
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      LEFT JOIN employees e ON lb.employee_id = e.id
      WHERE lb.year = :year ${employeeId ? 'AND lb.employee_id = :employeeId' : ''} ${tenantClause}
      ORDER BY e.name, lt.sort_order
    `, { replacements });
    return res.json({ success: true, data: rows || [] });
  } catch (e: any) {
    return res.json({ success: true, data: [] });
  }
}

// ===== GET: Approval Configs =====
async function getApprovalConfigs(req: NextApiRequest, res: NextApiResponse, session: any, tenantId: string | null) {
  try {
    if (!LeaveApprovalConfig) return res.json({ success: true, data: getMockApprovalConfigs() });
    const where: any = { isActive: true };
    // 🔒 TENANT ISOLATION: Filter by tenant (or global configs with null tenantId)
    if (tenantId) where[Op.or] = [{ tenantId }, { tenantId: null }];
    const configs = await LeaveApprovalConfig.findAll({ where, order: [['priority', 'DESC']] });
    return res.json({ success: true, data: configs.length > 0 ? configs : getMockApprovalConfigs() });
  } catch (e: any) {
    return res.json({ success: true, data: getMockApprovalConfigs() });
  }
}

// ===== GET: Requests =====
async function getLeaveRequests(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { status, leaveType, employeeId } = req.query;
  try {
    if (!sequelize) return res.json({ success: true, data: getMockRequests() });
    let where = 'WHERE 1=1';
    const replacements: any = {};
    if (session.user.tenantId) { where += ' AND lr.tenant_id = :tenantId'; replacements.tenantId = session.user.tenantId; }
    if (status && status !== 'all') { where += ' AND lr.status = :status'; replacements.status = status; }
    if (leaveType && leaveType !== 'all') { where += ' AND lr.leave_type = :leaveType'; replacements.leaveType = leaveType; }
    if (employeeId) { where += ' AND lr.employee_id = :employeeId'; replacements.employeeId = employeeId; }

    const [rows] = await sequelize.query(`
      SELECT lr.*, e.name as employee_name, e.position, e.department, e.branch_id,
             b.name as branch_name
      FROM leave_requests lr
      LEFT JOIN employees e ON lr.employee_id = e.id
      LEFT JOIN branches b ON e.branch_id = b.id
      ${where}
      ORDER BY lr.created_at DESC LIMIT 100
    `, { replacements });

    // Fetch approval steps for each request
    const requestIds = (rows || []).map((r: any) => `'${r.id}'`).join(',');
    let stepsMap: Record<string, any[]> = {};
    if (requestIds.length > 0) {
      try {
        const [steps] = await sequelize.query(`
          SELECT * FROM leave_approval_steps WHERE leave_request_id IN (${requestIds}) ORDER BY step_order
        `);
        (steps || []).forEach((s: any) => {
          if (!stepsMap[s.leave_request_id]) stepsMap[s.leave_request_id] = [];
          stepsMap[s.leave_request_id].push(s);
        });
      } catch (e) {}
    }

    const data = (rows || []).map((r: any) => ({
      ...r,
      approvalSteps: stepsMap[r.id] || []
    }));

    return res.json({ success: true, data: data.length > 0 ? data : getMockRequests() });
  } catch (e: any) {
    return res.json({ success: true, data: getMockRequests() });
  }
}

// ===== GET: Pending Approvals for current user =====
async function getPendingApprovals(req: NextApiRequest, res: NextApiResponse, session: any, tenantId: string | null) {
  try {
    if (!sequelize) return res.json({ success: true, data: [] });

    // 🔒 TENANT ISOLATION: Add tenant filter
    let tenantClause = "";
    const replacements: any = {};
    if (tenantId) {
      tenantClause = "AND lr.tenant_id = :tenantId";
      replacements.tenantId = tenantId;
    }

    const [rows] = await sequelize.query(`
      SELECT las.*, lr.employee_id, lr.leave_type, lr.start_date, lr.end_date, lr.total_days,
             lr.reason, lr.status as request_status, e.name as employee_name, e.position, e.department
      FROM leave_approval_steps las
      JOIN leave_requests lr ON las.leave_request_id = lr.id
      LEFT JOIN employees e ON lr.employee_id = e.id
      WHERE las.status = 'pending' AND lr.status = 'pending' ${tenantClause}
      ORDER BY las.created_at ASC
    `, { replacements });
    return res.json({ success: true, data: rows || [] });
  } catch (e: any) {
    return res.json({ success: true, data: [] });
  }
}

// ===== POST: Create Leave Request =====
async function createLeaveRequest(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { employeeId, leaveType, startDate, endDate, reason, attachmentUrl, halfDay, halfDayType, delegateTo } = req.body;
  const tenantId = session.user.tenantId;

  if (!leaveType || !startDate || !endDate) {
    return res.status(400).json({ success: false, error: 'leaveType, startDate, endDate required' });
  }

  // Calculate business days
  const start = new Date(startDate);
  const end = new Date(endDate);
  let totalDays = 0;
  const d = new Date(start);
  while (d <= end) {
    if (d.getDay() !== 0 && d.getDay() !== 6) totalDays++;
    d.setDate(d.getDate() + 1);
  }
  if (halfDay) totalDays = 0.5;
  if (totalDays <= 0) return res.status(400).json({ success: false, error: 'Invalid date range' });

  if (!sequelize) {
    return res.json({ success: true, message: 'Leave request submitted (mock)', data: { leaveType, startDate, endDate, totalDays, status: 'pending' } });
  }

  try {
    // Validate leave balance before creating the request
    try {
      const [balanceRows] = await sequelize.query(`
        SELECT lb.*,
          (lb.entitled_days + COALESCE(lb.carried_forward_days,0) + COALESCE(lb.adjustment_days,0)
           - lb.used_days - lb.pending_days) AS remaining
        FROM leave_balances lb
        WHERE lb.employee_id = :empId AND lb.year = :year
        AND lb.leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)
      `, { replacements: { empId: employeeId || session.user.id, year: new Date().getFullYear(), code: leaveType } });
      const balance = balanceRows?.[0];
      if (balance) {
        const remaining = parseFloat(balance.remaining);
        if (remaining < totalDays) {
          return res.status(400).json({
            success: false,
            error: `Saldo cuti tidak mencukupi. Sisa: ${Math.max(0, remaining)} hari, dibutuhkan: ${totalDays} hari`
          });
        }
      }
    } catch (e) {} // If no balance record, allow creation (will be caught at approval time)

    // Find matching approval config
    let approvalConfig: any = null;
    let employee: any = null;

    // Get employee info
    const [empRows] = await sequelize.query(
      `SELECT id, name, department, branch_id, position FROM employees WHERE id = :empId LIMIT 1`,
      { replacements: { empId: employeeId || session.user.id } }
    );
    employee = empRows?.[0];

    // Find best matching approval config
    if (LeaveApprovalConfig) {
      const configs = await LeaveApprovalConfig.findAll({ where: { isActive: true }, order: [['priority', 'DESC']] });
      for (const cfg of configs) {
        const c = cfg.toJSON();
        // Match by department
        if (c.department && employee?.department && c.department !== employee.department) continue;
        // Match by leave type
        if (c.leave_type_code && c.leave_type_code !== leaveType) continue;
        // Match by min days
        if (c.min_days_trigger && totalDays < c.min_days_trigger) continue;
        approvalConfig = c;
        break;
      }
      // Fallback to default (no department/leave type filter)
      if (!approvalConfig) {
        const fallback = configs.find((c: any) => !c.department && !c.leaveTypeCode);
        if (fallback) approvalConfig = fallback.toJSON();
      }
    }

    const approvalLevels = approvalConfig?.approval_levels || approvalConfig?.approvalLevels || [];
    const totalSteps = approvalLevels.length || 1;

    // Auto-approve if within threshold
    const autoApprove = approvalConfig?.max_auto_approve_days > 0 && totalDays <= approvalConfig.max_auto_approve_days;

    // Create leave request
    const [result] = await sequelize.query(`
      INSERT INTO leave_requests (id, employee_id, branch_id, leave_type, start_date, end_date, total_days,
        reason, attachment_url, status, tenant_id, approval_config_id, current_approval_step, total_approval_steps,
        half_day, half_day_type, delegate_to, created_at, updated_at)
      VALUES (uuid_generate_v4(), :employeeId, :branchId, :leaveType, :startDate, :endDate, :totalDays,
        :reason, :attachmentUrl, :status, :tenantId, :configId, 1, :totalSteps,
        :halfDay, :halfDayType, :delegateTo, NOW(), NOW())
      RETURNING *
    `, {
      replacements: {
        employeeId: employeeId || session.user.id,
        branchId: employee?.branch_id || null,
        leaveType, startDate, endDate, totalDays, reason: reason || null,
        attachmentUrl: attachmentUrl || null,
        status: autoApprove ? 'approved' : 'pending',
        tenantId, configId: approvalConfig?.id || null, totalSteps,
        halfDay: halfDay || false, halfDayType: halfDayType || null,
        delegateTo: delegateTo || null
      }
    });

    const leaveRequest = result?.[0];

    // Create approval steps
    if (!autoApprove && approvalLevels.length > 0 && leaveRequest) {
      for (const level of approvalLevels) {
        await sequelize.query(`
          INSERT INTO leave_approval_steps (id, leave_request_id, step_order, approver_role, status, created_at, updated_at)
          VALUES (uuid_generate_v4(), :requestId, :stepOrder, :role, :status, NOW(), NOW())
        `, {
          replacements: {
            requestId: leaveRequest.id,
            stepOrder: level.level,
            role: level.role,
            status: level.level === 1 ? 'pending' : 'waiting'
          }
        });
      }
    }

    // Update leave balance (add to pending)
    if (leaveRequest && !autoApprove) {
      try {
        await sequelize.query(`
          UPDATE leave_balances SET pending_days = pending_days + :days, updated_at = NOW()
          WHERE employee_id = :empId AND year = :year
          AND leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)
        `, { replacements: { days: totalDays, empId: employeeId || session.user.id, year: new Date().getFullYear(), code: leaveType } });
      } catch (e) {}
    }

    return res.status(201).json({
      success: true,
      message: autoApprove ? 'Cuti otomatis disetujui' : `Pengajuan cuti berhasil (${totalSteps} level approval)`,
      data: leaveRequest,
      approvalConfig: approvalConfig ? { name: approvalConfig.name, levels: approvalLevels.length } : null
    });
  } catch (e: any) {
    console.warn('createLeaveRequest error: (table may not exist):', (e as any)?.message || e);
    return res.status(500).json({ success: false, error: 'Failed to create leave request', details: e.message });
  }
}

// ===== POST: Approve Step =====
async function approveStep(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { stepId, leaveRequestId, comments } = req.body;

  if (!leaveRequestId) return res.status(400).json({ success: false, error: 'leaveRequestId required' });
  if (!sequelize) return res.json({ success: true, message: 'Approved (mock)' });

  try {
    // Update the current step
    await sequelize.query(`
      UPDATE leave_approval_steps SET status = 'approved', approver_id = :userId,
        approver_name = :userName, action_date = NOW(), comments = :comments, updated_at = NOW()
      WHERE ${stepId ? 'id = :stepId' : 'leave_request_id = :requestId AND status = \'pending\''}
      ${!stepId ? 'AND step_order = (SELECT MIN(step_order) FROM leave_approval_steps WHERE leave_request_id = :requestId AND status = \'pending\')' : ''}
    `, {
      replacements: { stepId, requestId: leaveRequestId, userId: session.user.id, userName: session.user.name || 'User', comments: comments || null }
    });

    // Update current step number
    await sequelize.query(`
      UPDATE leave_requests SET current_approval_step = current_approval_step + 1, updated_at = NOW()
      WHERE id = :requestId
    `, { replacements: { requestId: leaveRequestId } });

    // Activate next step
    const [nextSteps] = await sequelize.query(`
      SELECT * FROM leave_approval_steps WHERE leave_request_id = :requestId AND status = 'waiting'
      ORDER BY step_order LIMIT 1
    `, { replacements: { requestId: leaveRequestId } });

    if (nextSteps && nextSteps.length > 0) {
      await sequelize.query(`
        UPDATE leave_approval_steps SET status = 'pending', updated_at = NOW() WHERE id = :id
      `, { replacements: { id: nextSteps[0].id } });
    } else {
      // All steps approved - finalize
      // Validate leave balance before final approval
      const [lr] = await sequelize.query(`SELECT * FROM leave_requests WHERE id = :id`, { replacements: { id: leaveRequestId } });
      if (lr?.[0]) {
        const leaveData = lr[0];

        // Check balance is sufficient
        const [balanceRows] = await sequelize.query(`
          SELECT lb.*,
            (lb.entitled_days + COALESCE(lb.carried_forward_days,0) + COALESCE(lb.adjustment_days,0)
             - lb.used_days - lb.pending_days) AS remaining
          FROM leave_balances lb
          WHERE lb.employee_id = :empId AND lb.year = :year
          AND lb.leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)
        `, { replacements: { empId: leaveData.employee_id, year: new Date().getFullYear(), code: leaveData.leave_type } });

        const balance = balanceRows?.[0];
        const remaining = balance ? parseFloat(balance.remaining) : 0;
        const days = leaveData.total_days;

        if (remaining < days) {
          return res.status(400).json({
            success: false,
            error: `Saldo cuti tidak mencukupi. Sisa: ${Math.max(0, remaining)} hari, dibutuhkan: ${days} hari`
          });
        }
      }

      await sequelize.query(`
        UPDATE leave_requests SET status = 'approved', approved_by = :userId, approved_at = NOW(), updated_at = NOW()
        WHERE id = :requestId
      `, { replacements: { requestId: leaveRequestId, userId: session.user.id } });

      // Move from pending to used in balance (with the validated balance)
      if (lr?.[0]) {
        try {
          await sequelize.query(`
            UPDATE leave_balances SET
              pending_days = GREATEST(0, pending_days - :days),
              used_days = used_days + :days,
              updated_at = NOW()
            WHERE employee_id = :empId AND year = :year
            AND leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)
          `, { replacements: { days: lr[0].total_days, empId: lr[0].employee_id, year: new Date().getFullYear(), code: lr[0].leave_type } });
        } catch (e) {
          console.warn('Failed to update leave balance: (table may not exist):', (e as any)?.message || e);
        }
      }
    }

    return res.json({ success: true, message: nextSteps?.length > 0 ? 'Step disetujui, lanjut ke level berikutnya' : 'Cuti sepenuhnya disetujui' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Failed to approve', details: e.message });
  }
}

// ===== POST: Reject Request =====
async function rejectRequest(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { leaveRequestId, reason } = req.body;
  if (!leaveRequestId) return res.status(400).json({ success: false, error: 'leaveRequestId required' });
  if (!reason) return res.status(400).json({ success: false, error: 'Rejection reason required' });
  if (!sequelize) return res.json({ success: true, message: 'Rejected (mock)' });

  try {
    // Reject the request
    await sequelize.query(`
      UPDATE leave_requests SET status = 'rejected', rejection_reason = :reason, updated_at = NOW()
      WHERE id = :id
    `, { replacements: { id: leaveRequestId, reason } });

    // Mark all pending steps as rejected
    await sequelize.query(`
      UPDATE leave_approval_steps SET status = 'rejected', approver_id = :userId,
        approver_name = :userName, action_date = NOW(), comments = :reason, updated_at = NOW()
      WHERE leave_request_id = :id AND status IN ('pending', 'waiting')
    `, { replacements: { id: leaveRequestId, userId: session.user.id, userName: session.user.name || 'User', reason } });

    // Restore pending balance
    const [lr] = await sequelize.query(`SELECT * FROM leave_requests WHERE id = :id`, { replacements: { id: leaveRequestId } });
    if (lr?.[0]) {
      try {
        await sequelize.query(`
          UPDATE leave_balances SET pending_days = GREATEST(0, pending_days - :days), updated_at = NOW()
          WHERE employee_id = :empId AND year = :year
          AND leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)
        `, { replacements: { days: lr[0].total_days, empId: lr[0].employee_id, year: new Date().getFullYear(), code: lr[0].leave_type } });
      } catch (e) {}
    }

    return res.json({ success: true, message: 'Cuti ditolak' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Failed to reject', details: e.message });
  }
}

// ===== POST: Create Approval Config =====
async function createApprovalConfig(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { name, description, department, division, branchId, leaveTypeCode, minDaysTrigger, maxAutoApproveDays, approvalLevels, escalationHours } = req.body;
  if (!name || !approvalLevels || approvalLevels.length === 0) {
    return res.status(400).json({ success: false, error: 'name and approvalLevels required' });
  }
  if (!LeaveApprovalConfig) return res.json({ success: true, message: 'Created (mock)' });

  try {
    const config = await LeaveApprovalConfig.create({
      tenantId: session.user.tenantId,
      name, description, department, division, branchId,
      leaveTypeCode, minDaysTrigger: minDaysTrigger || 1,
      maxAutoApproveDays: maxAutoApproveDays || 0,
      approvalLevels, escalationHours: escalationHours || 48,
      isActive: true, priority: 0
    });
    return res.status(201).json({ success: true, data: config });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== PUT: Update Approval Config =====
async function updateApprovalConfig(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, ...data } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!LeaveApprovalConfig) return res.json({ success: true, message: 'Updated (mock)' });

  try {
    const config = await LeaveApprovalConfig.findByPk(id);
    if (!config) return res.status(404).json({ success: false, error: 'Not found' });
    await config.update(data);
    return res.json({ success: true, data: config });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== DELETE: Approval Config =====
async function deleteApprovalConfig(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!LeaveApprovalConfig) return res.json({ success: true, message: 'Deleted (mock)' });

  try {
    await LeaveApprovalConfig.destroy({ where: { id } });
    return res.json({ success: true, message: 'Deleted' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== POST: Create/Update Leave Type =====
async function createLeaveType(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!LeaveType) return res.json({ success: true, message: 'Created (mock)' });
  try {
    const lt = await LeaveType.create({ ...req.body, tenantId: session.user.tenantId });
    return res.status(201).json({ success: true, data: lt });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function updateLeaveType(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, ...data } = req.body;
  if (!id || !LeaveType) return res.json({ success: true, message: 'Updated (mock)' });
  try {
    const lt = await LeaveType.findByPk(id);
    if (!lt) return res.status(404).json({ error: 'Not found' });
    await lt.update(data);
    return res.json({ success: true, data: lt });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== DELETE: Leave Type =====
async function deleteLeaveType(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;
  if (!id || !LeaveType) return res.json({ success: true, message: 'Deleted (mock)' });
  try {
    await LeaveType.destroy({ where: { id } });
    return res.json({ success: true, message: 'Leave type deleted' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== POST: Initialize Balances =====
async function initializeBalances(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, message: 'Initialized (mock)' });
  try {
    const year = req.body.year || new Date().getFullYear();
    const tenantId = session.user.tenantId;

    // Get all active employees
    const [employees] = await sequelize.query(`
      SELECT id, name, department FROM employees WHERE status = 'ACTIVE' ${tenantId ? "AND tenant_id = :tenantId" : ""} LIMIT 500
    `, { replacements: { tenantId } });

    // Get all active leave types
    const [types] = await sequelize.query(`SELECT id, code, max_days_per_year FROM leave_types WHERE is_active = true`);

    let created = 0;
    for (const emp of (employees || [])) {
      for (const lt of (types || [])) {
        try {
          await sequelize.query(`
            INSERT INTO leave_balances (id, tenant_id, employee_id, leave_type_id, year, entitled_days, created_at, updated_at)
            VALUES (uuid_generate_v4(), :tenantId, :empId, :ltId, :year, :days, NOW(), NOW())
            ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING
          `, { replacements: { tenantId, empId: emp.id, ltId: lt.id, year, days: lt.max_days_per_year } });
          created++;
        } catch (e) {}
      }
    }
    return res.json({ success: true, message: `Initialized ${created} balance records for ${(employees || []).length} employees` });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== Mock Data =====
function getMockLeaveTypes() {
  return [
    { id: '1', code: 'annual', name: 'Cuti Tahunan', category: 'regular', max_days_per_year: 12, is_paid: true, color: '#3B82F6', icon: 'calendar', requires_medical_cert: false },
    { id: '2', code: 'sick', name: 'Sakit', category: 'medical', max_days_per_year: 14, is_paid: true, color: '#EF4444', icon: 'heart', requires_medical_cert: true },
    { id: '3', code: 'maternity', name: 'Melahirkan', category: 'special', max_days_per_year: 90, is_paid: true, color: '#EC4899', icon: 'baby', requires_medical_cert: true },
    { id: '4', code: 'paternity', name: 'Cuti Ayah', category: 'special', max_days_per_year: 2, is_paid: true, color: '#8B5CF6', icon: 'baby' },
    { id: '5', code: 'marriage', name: 'Pernikahan', category: 'special', max_days_per_year: 3, is_paid: true, color: '#F43F5E', icon: 'heart' },
    { id: '6', code: 'unpaid', name: 'Tanpa Gaji', category: 'unpaid', max_days_per_year: 30, is_paid: false, color: '#9CA3AF', icon: 'user-x' },
    { id: '7', code: 'personal', name: 'Keperluan Pribadi', category: 'regular', max_days_per_year: 3, is_paid: true, color: '#F59E0B', icon: 'coffee' },
    { id: '8', code: 'bereavement', name: 'Duka Cita', category: 'special', max_days_per_year: 3, is_paid: true, color: '#6B7280', icon: 'heart' },
  ];
}

function getMockApprovalConfigs() {
  return [
    { id: '1', name: 'Default 2-Level Approval', description: 'Supervisor → Manager', department: null, approval_levels: [
      { level: 1, role: 'SUPERVISOR', title: 'Supervisor', required: true },
      { level: 2, role: 'MANAGER', title: 'Manager', required: true }
    ], min_days_trigger: 1, escalation_hours: 48, is_active: true },
    { id: '2', name: '3-Level (Cuti Panjang)', description: 'Untuk cuti > 5 hari', department: null, approval_levels: [
      { level: 1, role: 'SUPERVISOR', title: 'Supervisor', required: true },
      { level: 2, role: 'MANAGER', title: 'Manager', required: true },
      { level: 3, role: 'HR_DIRECTOR', title: 'HR Director', required: true }
    ], min_days_trigger: 5, escalation_hours: 24, is_active: true },
    { id: '3', name: 'Operations Department', description: 'Shift Lead → Store Manager → Area Manager', department: 'OPERATIONS', approval_levels: [
      { level: 1, role: 'SUPERVISOR', title: 'Shift Leader', required: true },
      { level: 2, role: 'MANAGER', title: 'Store Manager', required: true },
      { level: 3, role: 'AREA_MANAGER', title: 'Area Manager', required: false }
    ], min_days_trigger: 1, escalation_hours: 48, is_active: true },
  ];
}

function getMockRequests() {
  return [
    { id: '1', employee_name: 'Hendra Kusuma', position: 'Kasir', department: 'Sales', leave_type: 'annual', start_date: '2026-03-01', end_date: '2026-03-05', total_days: 5, reason: 'Liburan keluarga', status: 'approved', approved_at: '2026-02-20', current_approval_step: 2, total_approval_steps: 2 },
    { id: '2', employee_name: 'Fitri Handayani', position: 'Kasir', department: 'Sales', leave_type: 'sick', start_date: '2026-02-24', end_date: '2026-02-25', total_days: 2, reason: 'Demam', status: 'approved', approved_at: '2026-02-24', current_approval_step: 2, total_approval_steps: 2 },
    { id: '3', employee_name: 'Gunawan', position: 'Staff Gudang', department: 'Warehouse', leave_type: 'personal', start_date: '2026-03-10', end_date: '2026-03-10', total_days: 1, reason: 'Urusan keluarga', status: 'pending', current_approval_step: 1, total_approval_steps: 2 },
    { id: '4', employee_name: 'Budi Santoso', position: 'Branch Manager', department: 'Operations', leave_type: 'annual', start_date: '2026-03-15', end_date: '2026-03-20', total_days: 5, reason: 'Cuti tahunan', status: 'pending', current_approval_step: 1, total_approval_steps: 3 },
  ];
}

// 🔒 Wrap handler with HQ Auth middleware - requires HRIS module
export default withHQAuth(handler, { module: 'hris' });
