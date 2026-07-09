/**
 * Shared leave request workflow for employee portal + manager approvals.
 */

let sequelize: any;
let Op: any;
let LeaveApprovalConfig: any;

try {
  sequelize = require('../sequelize');
  Op = require('sequelize').Op;
  LeaveApprovalConfig = require('../../models/LeaveApprovalConfig');
} catch (_) {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function balanceRemainingExpr(): string {
  return `COALESCE(lb.remaining,
    COALESCE(lb.entitled, lb.entitled_days, 0)
    + COALESCE(lb.carried_forward_days, 0)
    + COALESCE(lb.adjustment_days, 0)
    - COALESCE(lb.used, lb.used_days, 0)
    - COALESCE(lb.pending, lb.pending_days, 0)
  )`;
}

export function calcBusinessDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let total = 0;
  const d = new Date(start);
  while (d <= end) {
    if (d.getDay() !== 0 && d.getDay() !== 6) total++;
    d.setDate(d.getDate() + 1);
  }
  return total || 1;
}

async function getLeaveBalanceRemaining(empId: string, leaveTypeCode: string, year: number): Promise<number | null> {
  if (!sequelize) return null;
  try {
    const [balanceRows] = await sequelize.query(`
      SELECT lb.*, ${balanceRemainingExpr()} AS remaining_calc
      FROM leave_balances lb
      WHERE lb.employee_id::text = :empId AND lb.year = :year
      AND lb.leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)
    `, { replacements: { empId: String(empId), year, code: leaveTypeCode } });
    const balance = balanceRows?.[0];
    if (!balance) return null;
    return parseFloat(balance.remaining_calc ?? balance.remaining ?? 0);
  } catch {
    return null;
  }
}

export async function adjustLeaveBalancePending(
  empId: string,
  leaveTypeCode: string,
  year: number,
  days: number,
  mode: 'add' | 'remove' | 'approve',
) {
  if (!sequelize) return;
  const sql =
    mode === 'add'
      ? `UPDATE leave_balances SET
          pending = COALESCE(pending, pending_days, 0) + :days,
          remaining = GREATEST(0, COALESCE(remaining, entitled, entitled_days, 0) - :days),
          updated_at = NOW()
        WHERE employee_id::text = :empId AND year = :year
        AND leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)`
      : mode === 'remove'
        ? `UPDATE leave_balances SET
            pending = GREATEST(0, COALESCE(pending, pending_days, 0) - :days),
            updated_at = NOW()
          WHERE employee_id::text = :empId AND year = :year
          AND leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)`
        : `UPDATE leave_balances SET
            pending = GREATEST(0, COALESCE(pending, pending_days, 0) - :days),
            used = COALESCE(used, used_days, 0) + :days,
            remaining = GREATEST(0, COALESCE(remaining, entitled, entitled_days, 0) - :days),
            updated_at = NOW()
          WHERE employee_id::text = :empId AND year = :year
          AND leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)`;
  await sequelize.query(sql, {
    replacements: { days, empId: String(empId), year, code: leaveTypeCode },
  }).catch(() => {});
}

async function findApprovalConfig(employee: any, leaveType: string, totalDays: number) {
  if (!LeaveApprovalConfig) return { config: null, levels: [] };

  try {
    const configs = await LeaveApprovalConfig.findAll({
      where: { isActive: true },
      order: [['priority', 'DESC']],
    });

    let approvalConfig: any = null;
    for (const cfg of configs) {
      const c = cfg.toJSON ? cfg.toJSON() : cfg;
      if (c.department && employee?.department && c.department !== employee.department) continue;
      const typeCode = c.leave_type_code || c.leaveTypeCode;
      if (typeCode && typeCode !== leaveType) continue;
      const minDays = c.min_days_trigger || c.minDaysTrigger;
      if (minDays && totalDays < minDays) continue;
      approvalConfig = c;
      break;
    }

    if (!approvalConfig) {
      const fallback = configs.find((c: any) => {
        const j = c.toJSON ? c.toJSON() : c;
        return !j.department && !(j.leave_type_code || j.leaveTypeCode);
      });
      if (fallback) approvalConfig = fallback.toJSON ? fallback.toJSON() : fallback;
    }

    const levels = approvalConfig?.approval_levels || approvalConfig?.approvalLevels || [];
    return { config: approvalConfig, levels };
  } catch {
    return { config: null, levels: [{ level: 1, role: 'MANAGER', title: 'Atasan Langsung' }] };
  }
}

export type PortalLeaveInput = {
  employeeId: string | number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  tenantId?: string | null;
};

export async function createPortalLeaveRequest(input: PortalLeaveInput) {
  const { employeeId, leaveType, startDate, endDate, reason, tenantId } = input;
  const totalDays = calcBusinessDays(startDate, endDate);

  if (!sequelize) {
    return {
      success: true,
      message: 'Pengajuan cuti berhasil (mock)',
      data: { leaveType, startDate, endDate, totalDays, status: 'pending' },
      autoApproved: false,
    };
  }

  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"').catch(() => {});

  const remaining = await getLeaveBalanceRemaining(String(employeeId), leaveType, new Date().getFullYear());
  if (remaining !== null && remaining < totalDays) {
    return {
      success: false,
      error: `Saldo cuti tidak mencukupi. Sisa: ${Math.max(0, remaining)} hari, dibutuhkan: ${totalDays} hari`,
    };
  }

  const [empRows] = await sequelize.query(`
    SELECT id, name, department, branch_id, position FROM employees WHERE id::text = :empId LIMIT 1
  `, { replacements: { empId: String(employeeId) } });
  const employee = empRows?.[0];

  const { config: approvalConfig, levels: approvalLevels } = await findApprovalConfig(employee, leaveType, totalDays);
  const totalSteps = approvalLevels.length || 1;
  const autoApprove = (approvalConfig?.max_auto_approve_days || approvalConfig?.maxAutoApproveDays || 0) > 0
    && totalDays <= (approvalConfig?.max_auto_approve_days || approvalConfig?.maxAutoApproveDays);

  const [result] = await sequelize.query(`
    INSERT INTO leave_requests (
      id, employee_id, branch_id, leave_type, start_date, end_date, total_days,
      reason, status, tenant_id, approval_config_id, current_approval_step, total_approval_steps,
      created_at, updated_at
    ) VALUES (
      uuid_generate_v4(), :employeeId, :branchId, :leaveType, :startDate, :endDate, :totalDays,
      :reason, :status, :tenantId, :configId, 1, :totalSteps, NOW(), NOW()
    ) RETURNING *
  `, {
    replacements: {
      employeeId,
      branchId: employee?.branch_id || null,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      status: autoApprove ? 'approved' : 'pending',
      tenantId: tenantId || null,
      configId: approvalConfig?.id || null,
      totalSteps,
    },
  });

  const leaveRequest = result?.[0];
  if (!leaveRequest) {
    return { success: false, error: 'Gagal menyimpan pengajuan cuti' };
  }

  if (!autoApprove && approvalLevels.length > 0) {
    for (const level of approvalLevels) {
      await sequelize.query(`
        INSERT INTO leave_approval_steps (id, leave_request_id, step_order, approver_role, status, created_at, updated_at)
        VALUES (uuid_generate_v4(), :requestId, :stepOrder, :role, :status, NOW(), NOW())
      `, {
        replacements: {
          requestId: leaveRequest.id,
          stepOrder: level.level,
          role: level.role,
          status: level.level === 1 ? 'pending' : 'waiting',
        },
      });
    }
    await adjustLeaveBalancePending(String(employeeId), leaveType, new Date().getFullYear(), totalDays, 'add');
  }

  return {
    success: true,
    message: autoApprove
      ? 'Cuti otomatis disetujui'
      : `Pengajuan cuti berhasil dikirim (${totalSteps} tahap persetujuan)`,
    data: leaveRequest,
    autoApproved: autoApprove,
    totalSteps,
  };
}

export async function approveLeaveStep(params: {
  leaveRequestId: string;
  approverId: string | number;
  approverName?: string;
  comments?: string;
}) {
  const { leaveRequestId, approverId, approverName, comments } = params;
  const requestId = String(leaveRequestId);

  if (!sequelize) return { success: true, message: 'Cuti disetujui (mock)', finalized: true };

  if (!UUID_RE.test(requestId)) {
    // Legacy integer IDs — single-step approve
    await sequelize.query(`
      UPDATE leave_requests SET status = 'approved', approved_by = :approverId, approved_at = NOW(), updated_at = NOW()
      WHERE id::text = :id AND status = 'pending'
    `, { replacements: { id: requestId, approverId } });
    return { success: true, message: 'Cuti disetujui', finalized: true };
  }

  await sequelize.query(`
    UPDATE leave_approval_steps SET status = 'approved',
      approver_id = :approverId,
      comments = COALESCE(:comments, comments),
      acted_at = NOW(), updated_at = NOW()
    WHERE leave_request_id = :requestId AND status = 'pending'
    AND step_order = (
      SELECT MIN(step_order) FROM leave_approval_steps
      WHERE leave_request_id = :requestId AND status = 'pending'
    )
  `, {
    replacements: {
      requestId,
      approverId,
      comments: comments || `Disetujui oleh ${approverName || 'Manajer'}`,
    },
  });

  await sequelize.query(`
    UPDATE leave_requests SET current_approval_step = COALESCE(current_approval_step, 1) + 1, updated_at = NOW()
    WHERE id = :requestId
  `, { replacements: { requestId } });

  const [nextSteps] = await sequelize.query(`
    SELECT id FROM leave_approval_steps
    WHERE leave_request_id = :requestId AND status = 'waiting'
    ORDER BY step_order LIMIT 1
  `, { replacements: { requestId } });

  if (nextSteps?.length) {
    await sequelize.query(`
      UPDATE leave_approval_steps SET status = 'pending', updated_at = NOW() WHERE id = :id
    `, { replacements: { id: nextSteps[0].id } });
    return { success: true, message: 'Disetujui — menunggu persetujuan level berikutnya', finalized: false };
  }

  const [lr] = await sequelize.query(`SELECT * FROM leave_requests WHERE id = :id`, { replacements: { id: requestId } });
  const leaveData = lr?.[0];
  if (!leaveData) return { success: false, error: 'Pengajuan cuti tidak ditemukan' };

  await sequelize.query(`
    UPDATE leave_requests SET status = 'approved', approved_by = :approverId, approved_at = NOW(), updated_at = NOW()
    WHERE id = :requestId
  `, { replacements: { requestId, approverId } });

  await adjustLeaveBalancePending(
    String(leaveData.employee_id),
    leaveData.leave_type,
    new Date(leaveData.start_date).getFullYear(),
    leaveData.total_days,
    'approve',
  );

  return { success: true, message: 'Cuti disetujui sepenuhnya', finalized: true };
}

export async function rejectLeaveRequest(params: {
  leaveRequestId: string;
  reason: string;
  approverId?: string | number;
}) {
  const { leaveRequestId, reason, approverId } = params;
  const requestId = String(leaveRequestId);

  if (!sequelize) return { success: true, message: 'Cuti ditolak (mock)' };

  const [lr] = await sequelize.query(`SELECT * FROM leave_requests WHERE id::text = :id`, {
    replacements: { id: requestId },
  });
  const leaveData = lr?.[0];
  if (!leaveData) return { success: false, error: 'Pengajuan tidak ditemukan' };

  await sequelize.query(`
    UPDATE leave_requests SET status = 'rejected', rejection_reason = :reason, updated_at = NOW()
    WHERE id::text = :id AND status = 'pending'
  `, { replacements: { id: requestId, reason } });

  await sequelize.query(`
    UPDATE leave_approval_steps SET status = 'rejected', approver_id = :approverId,
      comments = :reason, acted_at = NOW(), updated_at = NOW()
    WHERE leave_request_id::text = :id AND status IN ('pending', 'waiting')
  `, { replacements: { id: requestId, approverId: approverId || null, reason } });

  if (leaveData.status === 'pending') {
    await adjustLeaveBalancePending(
      String(leaveData.employee_id),
      leaveData.leave_type,
      new Date(leaveData.start_date).getFullYear(),
      leaveData.total_days,
      'remove',
    );
  }

  return { success: true, message: 'Cuti ditolak' };
}

export async function attachApprovalSteps(requests: any[]) {
  if (!sequelize || !requests?.length) return requests;
  try {
    const ids = requests.map((r) => `'${r.id}'`).join(',');
    const [steps] = await sequelize.query(`
      SELECT * FROM leave_approval_steps WHERE leave_request_id IN (${ids}) ORDER BY step_order
    `);
    const map: Record<string, any[]> = {};
    (steps || []).forEach((s: any) => {
      if (!map[s.leave_request_id]) map[s.leave_request_id] = [];
      map[s.leave_request_id].push(s);
    });
    return requests.map((r) => ({
      ...r,
      approval_steps: map[r.id] || [],
      current_step: (map[r.id] || []).find((s: any) => s.status === 'pending'),
    }));
  } catch {
    return requests;
  }
}
