/**
 * Shared leave approver authorization (ESS-S3-2 / HR-S2-2).
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch { /* */ }

const SUPERVISOR_ROLES = new Set(['SUPERVISOR', 'MANAGER', 'DIRECT_MANAGER', 'ATASAN']);
const HR_ROLES = new Set(['super_admin', 'hq_admin', 'admin', 'hr_staff', 'hris_staff', 'hr']);

export async function resolveEmployeeIdForUser(opts: {
  tenantId: string;
  userId?: string | null;
  email?: string | null;
  db?: any;
}): Promise<string | null> {
  const seq = opts.db || sequelize;
  if (!seq || !opts.tenantId) return null;
  try {
    const [rows] = await seq.query(
      `SELECT id::text AS id FROM employees
       WHERE tenant_id = :tenantId
         AND (user_id::text = :userId OR email = :email)
       LIMIT 1`,
      {
        replacements: {
          tenantId: opts.tenantId,
          userId: String(opts.userId || ''),
          email: opts.email || '',
        },
      },
    );
    return rows?.[0]?.id || null;
  } catch {
    return null;
  }
}

export async function assertCanApproveLeaveStep(opts: {
  tenantId: string;
  leaveRequestId: string;
  stepId?: string | null;
  userId?: string | null;
  email?: string | null;
  role?: string | null;
  db?: any;
}): Promise<{ ok: true; myEmpId: string | null } | { ok: false; status: number; error: string }> {
  const seq = opts.db || sequelize;
  const role = String(opts.role || '').toLowerCase();
  if (HR_ROLES.has(role)) return { ok: true, myEmpId: null };

  if (!seq) return { ok: false, status: 503, error: 'Database tidak tersedia' };

  const myEmpId = await resolveEmployeeIdForUser({
    tenantId: opts.tenantId,
    userId: opts.userId,
    email: opts.email,
    db: seq,
  });
  if (!myEmpId) {
    return { ok: false, status: 403, error: 'Profil karyawan approver tidak ditemukan' };
  }

  const [stepRows] = await seq.query(
    `SELECT las.id, las.approver_id::text AS approver_id, las.approver_role,
            e.supervisor_id::text AS supervisor_id
     FROM leave_approval_steps las
     JOIN leave_requests lr ON las.leave_request_id = lr.id
     LEFT JOIN employees e ON lr.employee_id = e.id
     WHERE las.leave_request_id = :requestId AND las.status = 'pending'
       AND lr.tenant_id = :tenantId
       ${opts.stepId ? 'AND las.id = :stepId' : ''}
     ORDER BY las.step_order ASC LIMIT 1`,
    {
      replacements: {
        requestId: opts.leaveRequestId,
        tenantId: opts.tenantId,
        stepId: opts.stepId || null,
      },
    },
  );
  const step = stepRows?.[0];
  if (!step) {
    return { ok: false, status: 404, error: 'Langkah persetujuan tidak ditemukan' };
  }

  const assigned = step.approver_id && step.approver_id === myEmpId;
  const viaSupervisor =
    SUPERVISOR_ROLES.has(String(step.approver_role || '').toUpperCase())
    && step.supervisor_id === myEmpId;

  if (!assigned && !viaSupervisor) {
    return { ok: false, status: 403, error: 'Anda bukan approver untuk langkah ini' };
  }

  return { ok: true, myEmpId };
}

/** SQL fragment: pending leave steps assigned to this employee (scope=me). */
export function myPendingLeaveStepClause(aliasLas = 'las', aliasEmp = 'e'): string {
  return `(
    ${aliasLas}.approver_id::text = :myEmpId
    OR (UPPER(COALESCE(${aliasLas}.approver_role,'')) IN ('SUPERVISOR','MANAGER','DIRECT_MANAGER','ATASAN')
        AND ${aliasEmp}.supervisor_id::text = :myEmpId)
  )`;
}
