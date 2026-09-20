/**
 * Shared leave request workflow for employee portal + manager approvals.
 *
 * IMPORTANT: when HUMANIFY_RLS_REQUEST_BOUND wraps the request in a TX,
 * a failed query + JS `.catch()` still leaves Postgres in aborted state.
 * All best-effort / schema-probe queries MUST use SAVEPOINT (withDbSavepoint).
 */

import { withDbSavepoint } from '@/lib/saas/tenant-request-bound';
import {
  leaveBalanceAdjustSql,
  leaveBalanceRemainingExpr,
  resolveLeaveBalanceColMode,
} from '@/lib/hris/leave-balance-columns';

let sequelize: any;
let LeaveApprovalConfig: any;

try {
  sequelize = require('../sequelize');
  LeaveApprovalConfig = require('../../models/LeaveApprovalConfig');
} catch (_) {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const colMode = await resolveLeaveBalanceColMode();
  const rows = await withDbSavepoint(sequelize, async () => {
    const [balanceRows] = await sequelize.query(`
      SELECT ${leaveBalanceRemainingExpr(colMode)} AS remaining_calc
      FROM leave_balances lb
      WHERE lb.employee_id::text = :empId AND lb.year = :year
      AND lb.leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)
    `, { replacements: { empId: String(empId), year, code: leaveTypeCode } });
    return balanceRows as any[];
  }, 'leave_bal_rem');
  const balance = rows?.[0];
  if (!balance) return null;
  return parseFloat(balance.remaining_calc ?? 0);
}

export async function adjustLeaveBalancePending(
  empId: string,
  leaveTypeCode: string,
  year: number,
  days: number,
  mode: 'add' | 'remove' | 'approve',
) {
  if (!sequelize) return;
  const colMode = await resolveLeaveBalanceColMode();
  const sql = leaveBalanceAdjustSql(colMode === 'unknown' ? 'days' : colMode, mode);
  await withDbSavepoint(sequelize, async () => {
    await sequelize.query(sql, {
      replacements: { days, empId: String(empId), year, code: leaveTypeCode },
    });
  }, 'leave_bal_adj');
}

async function findApprovalConfig(employee: any, leaveType: string, totalDays: number) {
  const fallback = { config: null as any, levels: [{ level: 1, role: 'MANAGER', title: 'Atasan Langsung' }] };
  if (!LeaveApprovalConfig || !sequelize) return fallback;

  const resolved = await withDbSavepoint(sequelize, async () => {
    const configs = await LeaveApprovalConfig.findAll({
      where: { isActive: true },
      order: [['priority', 'DESC']],
      attributes: {
        exclude: ['division'],
      },
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
      const fb = configs.find((c: any) => {
        const j = c.toJSON ? c.toJSON() : c;
        return !j.department && !(j.leave_type_code || j.leaveTypeCode);
      });
      if (fb) approvalConfig = fb.toJSON ? fb.toJSON() : fb;
    }

    const levels = approvalConfig?.approval_levels || approvalConfig?.approvalLevels || [];
    if (levels.length) return { config: approvalConfig, levels };
    return { config: approvalConfig, levels: fallback.levels };
  }, 'leave_appr_cfg');

  return resolved || fallback;
}

export type PortalLeaveInput = {
  employeeId: string | number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  tenantId?: string | null;
  attachmentUrl?: string | null;
};

/** Resolve person-level approver from employee.supervisor_id for SUPERVISOR/MANAGER steps. */
export async function resolveLeaveApproverId(
  employeeId: string | number,
  role: string,
  db?: any,
): Promise<string | null> {
  const seq = db || sequelize;
  if (!seq) return null;
  const roleUpper = String(role || '').toUpperCase();
  if (!['SUPERVISOR', 'MANAGER', 'DIRECT_MANAGER', 'ATASAN'].includes(roleUpper)) return null;
  const sid = await withDbSavepoint(seq, async () => {
    const [rows] = await seq.query(
      `SELECT supervisor_id::text AS sid FROM employees WHERE id::text = :empId LIMIT 1`,
      { replacements: { empId: String(employeeId) } },
    );
    return rows?.[0]?.sid || null;
  }, 'leave_approver');
  return sid && UUID_RE.test(String(sid)) ? String(sid) : null;
}

export async function createPortalLeaveRequest(input: PortalLeaveInput) {
  const { employeeId, leaveType, startDate, endDate, reason, tenantId, attachmentUrl } = input;
  const totalDays = calcBusinessDays(startDate, endDate);

  if (!sequelize) {
    return {
      success: true,
      message: 'Pengajuan cuti berhasil (mock)',
      data: { leaveType, startDate, endDate, totalDays, status: 'pending' },
      autoApproved: false,
    };
  }

  if (!tenantId) {
    return { success: false, error: 'Tenant context required' };
  }

  // Best-effort schema probes — never abort the request TX
  await withDbSavepoint(sequelize, async () => {
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  }, 'uuid_ext');
  await withDbSavepoint(sequelize, async () => {
    await sequelize.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS attachment_url TEXT`);
  }, 'leave_attach_col');

  const remaining = await getLeaveBalanceRemaining(String(employeeId), leaveType, new Date().getFullYear());
  if (remaining !== null && remaining < totalDays) {
    return {
      success: false,
      error: `Saldo cuti tidak mencukupi. Sisa: ${Math.max(0, remaining)} hari, dibutuhkan: ${totalDays} hari`,
    };
  }

  const [empRows] = await sequelize.query(`
    SELECT id, name, department, branch_id, position, supervisor_id
    FROM employees
    WHERE id::text = :empId AND tenant_id = :tenantId
    LIMIT 1
  `, { replacements: { empId: String(employeeId), tenantId } });
  const employee = empRows?.[0];
  if (!employee) {
    return { success: false, error: 'Profil karyawan tidak ditemukan di tenant ini' };
  }

  const { config: approvalConfig, levels: approvalLevels } = await findApprovalConfig(employee, leaveType, totalDays);
  const totalSteps = approvalLevels.length || 1;
  const autoApprove = (approvalConfig?.max_auto_approve_days || approvalConfig?.maxAutoApproveDays || 0) > 0
    && totalDays <= (approvalConfig?.max_auto_approve_days || approvalConfig?.maxAutoApproveDays);

  const [result] = await sequelize.query(`
    INSERT INTO leave_requests (
      id, employee_id, branch_id, leave_type, start_date, end_date, total_days,
      reason, attachment_url, status, tenant_id, approval_config_id, current_approval_step, total_approval_steps,
      created_at, updated_at
    ) VALUES (
      uuid_generate_v4(), :employeeId, :branchId, :leaveType, :startDate, :endDate, :totalDays,
      :reason, :attachmentUrl, :status, :tenantId, :configId, 1, :totalSteps, NOW(), NOW()
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
      attachmentUrl: attachmentUrl || null,
      status: autoApprove ? 'approved' : 'pending',
      tenantId,
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
      const approverId = await resolveLeaveApproverId(employeeId, level.role);
      await withDbSavepoint(sequelize, async () => {
        await sequelize.query(`
          INSERT INTO leave_approval_steps (id, leave_request_id, step_order, approver_role, approver_id, status, created_at, updated_at)
          VALUES (uuid_generate_v4(), :requestId, :stepOrder, :role, :approverId, :status, NOW(), NOW())
        `, {
          replacements: {
            requestId: leaveRequest.id,
            stepOrder: level.level,
            role: level.role,
            approverId,
            status: level.level === 1 ? 'pending' : 'waiting',
          },
        });
      }, 'leave_step_ins');
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
  tenantId?: string | null;
}) {
  const { leaveRequestId, approverId, approverName, comments, tenantId } = params;
  const requestId = String(leaveRequestId);

  if (!sequelize) return { success: true, message: 'Cuti disetujui (mock)', finalized: true };
  if (!tenantId) return { success: false, error: 'Tenant context required' };

  if (!UUID_RE.test(requestId)) {
    // Legacy integer IDs — single-step approve
    const [upd] = await sequelize.query(`
      UPDATE leave_requests SET status = 'approved', approved_by = :approverId, approved_at = NOW(), updated_at = NOW()
      WHERE id::text = :id AND status = 'pending' AND tenant_id = :tenantId
      RETURNING id
    `, { replacements: { id: requestId, approverId, tenantId } });
    if (!upd?.[0]) return { success: false, error: 'Pengajuan cuti tidak ditemukan' };
    return { success: true, message: 'Cuti disetujui', finalized: true };
  }

  const [owned] = await sequelize.query(
    `SELECT id FROM leave_requests WHERE id = :requestId AND tenant_id = :tenantId AND status = 'pending'`,
    { replacements: { requestId, tenantId } },
  );
  if (!owned?.length) return { success: false, error: 'Pengajuan cuti tidak ditemukan' };

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
    WHERE id = :requestId AND tenant_id = :tenantId
  `, { replacements: { requestId, tenantId } });

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

  const [lr] = await sequelize.query(
    `SELECT * FROM leave_requests WHERE id = :id AND tenant_id = :tenantId`,
    { replacements: { id: requestId, tenantId } },
  );
  const leaveData = lr?.[0];
  if (!leaveData) return { success: false, error: 'Pengajuan cuti tidak ditemukan' };

  await sequelize.query(`
    UPDATE leave_requests SET status = 'approved', approved_by = :approverId, approved_at = NOW(), updated_at = NOW()
    WHERE id = :requestId AND tenant_id = :tenantId
  `, { replacements: { requestId, approverId, tenantId } });

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
  tenantId?: string | null;
}) {
  const { leaveRequestId, reason, approverId, tenantId } = params;
  const requestId = String(leaveRequestId);

  if (!sequelize) return { success: true, message: 'Cuti ditolak (mock)' };
  if (!tenantId) return { success: false, error: 'Tenant context required' };

  const [lr] = await sequelize.query(
    `SELECT * FROM leave_requests WHERE id::text = :id AND tenant_id = :tenantId`,
    { replacements: { id: requestId, tenantId } },
  );
  const leaveData = lr?.[0];
  if (!leaveData) return { success: false, error: 'Pengajuan tidak ditemukan' };

  await sequelize.query(`
    UPDATE leave_requests SET status = 'rejected', rejection_reason = :reason, updated_at = NOW()
    WHERE id::text = :id AND status = 'pending' AND tenant_id = :tenantId
  `, { replacements: { id: requestId, reason, tenantId } });

  await withDbSavepoint(sequelize, async () => {
    await sequelize.query(`
      UPDATE leave_approval_steps SET status = 'rejected', approver_id = :approverId,
        comments = :reason, acted_at = NOW(), updated_at = NOW()
      WHERE leave_request_id::text = :id AND status IN ('pending', 'waiting')
    `, { replacements: { id: requestId, approverId: approverId || null, reason } });
  }, 'leave_reject_steps');

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
  const enriched = await withDbSavepoint(sequelize, async () => {
    const ids = requests.map((r) => `'${String(r.id).replace(/'/g, '')}'`).join(',');
    if (!ids) return requests;
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
  }, 'leave_attach_steps');
  return enriched || requests;
}
