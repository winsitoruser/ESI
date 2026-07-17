/**
 * Lean leave list + create for public API v1
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

async function leaveColumns(): Promise<Set<string>> {
  if (!sequelize) return new Set();
  const [rows] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leave_requests'
  `);
  return new Set((rows || []).map((r: any) => r.column_name));
}

function dayCount(start: string, end: string): number {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1;
  const ms = b.getTime() - a.getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

export async function listTenantLeavesLean(
  tenantId: string,
  opts?: { limit?: number; status?: string },
): Promise<any[]> {
  if (!sequelize) return [];
  const limit = Math.min(200, Math.max(1, opts?.limit ?? 50));
  const status = opts?.status ? String(opts.status).toLowerCase() : null;

  try {
    const [rows] = await sequelize.query(`
      SELECT lr.id,
        lr.employee_id AS "employeeId",
        COALESCE(e.name, e.full_name, '') AS "employeeName",
        COALESCE(lr.leave_type, lr.type, 'cuti') AS "leaveType",
        lr.start_date AS "startDate",
        lr.end_date AS "endDate",
        COALESCE(lr.status::text, 'pending') AS status,
        lr.reason,
        lr.created_at AS "createdAt"
      FROM leave_requests lr
      LEFT JOIN employees e ON e.id = lr.employee_id
      WHERE (
          lr.tenant_id = :tid
          OR e.tenant_id = :tid
        )
        AND (:status::text IS NULL OR LOWER(COALESCE(lr.status::text, '')) = :status)
      ORDER BY lr.created_at DESC NULLS LAST
      LIMIT :lim
    `, { replacements: { tid: tenantId, status, lim: limit } });
    return rows || [];
  } catch {
    return [];
  }
}

export interface CreateLeaveInput {
  employeeId: string;
  leaveType?: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status?: string;
}

export async function createTenantLeaveLean(
  tenantId: string,
  input: CreateLeaveInput,
): Promise<Record<string, unknown>> {
  if (!sequelize || !tenantId) throw new Error('Database unavailable');

  const employeeId = String(input.employeeId || '').trim();
  const startDate = String(input.startDate || '').slice(0, 10);
  const endDate = String(input.endDate || '').slice(0, 10);
  if (!employeeId) throw Object.assign(new Error('employeeId wajib'), { statusCode: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw Object.assign(new Error('startDate/endDate harus YYYY-MM-DD'), { statusCode: 400 });
  }
  if (endDate < startDate) {
    throw Object.assign(new Error('endDate tidak boleh sebelum startDate'), { statusCode: 400 });
  }

  const [empRows] = await sequelize.query(
    `SELECT id, name FROM employees WHERE id = :id AND tenant_id = :tid LIMIT 1`,
    { replacements: { id: employeeId, tid: tenantId } },
  );
  if (!empRows?.length) {
    throw Object.assign(new Error('Karyawan tidak ditemukan di tenant ini'), { statusCode: 404 });
  }

  const cols = await leaveColumns();
  if (!cols.has('employee_id') || !cols.has('start_date') || !cols.has('end_date')) {
    throw new Error('Tabel leave_requests tidak siap');
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const leaveType = String(input.leaveType || 'annual').slice(0, 64);
  const status = String(input.status || 'pending').toLowerCase();
  const totalDays = dayCount(startDate, endDate);
  const reason = input.reason ? String(input.reason).slice(0, 1000) : null;

  const fields: Array<[string, unknown]> = [];
  const add = (col: string, val: unknown) => {
    if (cols.has(col)) fields.push([col, val]);
  };
  add('id', id);
  add('employee_id', employeeId);
  add('tenant_id', tenantId);
  add('leave_type', leaveType);
  add('type', leaveType);
  add('start_date', startDate);
  add('end_date', endDate);
  add('total_days', totalDays);
  add('reason', reason);
  add('status', status);
  add('current_approval_step', 1);
  add('total_approval_steps', 1);
  add('created_at', now);
  add('updated_at', now);

  const colNames = fields.map((f) => `"${f[0]}"`).join(', ');
  const placeholders = fields.map((_, i) => `:v${i}`).join(', ');
  const repl: Record<string, unknown> = {};
  fields.forEach((f, i) => { repl[`v${i}`] = f[1]; });

  await sequelize.query(
    `INSERT INTO leave_requests (${colNames}) VALUES (${placeholders})`,
    { replacements: repl },
  );

  return {
    id,
    employeeId,
    employeeName: empRows[0].name || null,
    leaveType,
    startDate,
    endDate,
    totalDays,
    status,
    reason,
    createdAt: now.toISOString(),
  };
}
