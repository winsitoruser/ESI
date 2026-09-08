/**
 * Schema-safe leave_types writes.
 * Prod may still be on the slim HRIS table (no description / policy columns).
 * Never INSERT a column that information_schema says is missing.
 */

import { ensureLeaveTypesSchema } from '@/lib/hris/ensure-leave-types-schema';

let columnCache: Set<string> | null = null;

export function normalizeLeaveTypeCode(code: unknown): string {
  return String(code || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function leaveTypeRowFromBody(body: Record<string, any>, tenantId: string): Record<string, any> {
  const maxYear = Number(body.maxDaysPerYear ?? body.max_days_per_year ?? 12) || 12;
  const minReq = Number(body.minDaysPerRequest ?? body.min_days_per_request ?? 1) || 1;
  const maxReq = Number(body.maxDaysPerRequest ?? body.max_days_per_request ?? 14) || 14;
  const depts = body.applicableDepartments ?? body.applicable_departments ?? [];
  const positions = body.applicablePositions ?? body.applicable_positions ?? [];
  return {
    tenant_id: tenantId,
    code: normalizeLeaveTypeCode(body.code),
    name: String(body.name || '').trim(),
    description: body.description != null ? String(body.description) : null,
    category: String(body.category || 'regular'),
    max_days_per_year: maxYear,
    min_days_per_request: minReq,
    max_days_per_request: maxReq,
    carry_forward: Boolean(body.carryForward ?? body.carry_forward),
    max_carry_forward_days: Number(body.maxCarryForwardDays ?? body.max_carry_forward_days ?? 0) || 0,
    requires_attachment: Boolean(body.requiresAttachment ?? body.requires_attachment),
    requires_medical_cert: Boolean(body.requiresMedicalCert ?? body.requires_medical_cert),
    is_paid: body.isPaid ?? body.is_paid ?? true,
    salary_deduction_percent: Number(body.salaryDeductionPercent ?? body.salary_deduction_percent ?? 0) || 0,
    applicable_gender: body.applicableGender ?? body.applicable_gender ?? null,
    min_service_months: Number(body.minServiceMonths ?? body.min_service_months ?? 0) || 0,
    applicable_departments: Array.isArray(depts) ? depts : [],
    applicable_positions: Array.isArray(positions) ? positions : [],
    color: String(body.color || '#3B82F6'),
    icon: String(body.icon || 'calendar'),
    is_active: body.isActive ?? body.is_active ?? true,
    sort_order: Number(body.sortOrder ?? body.sort_order ?? 0) || 0,
  };
}

export function pickExistingLeaveTypeColumns(
  row: Record<string, any>,
  columns: Set<string>,
): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!columns.has(key) || value === undefined) continue;
    out[key] = value;
  }
  return out;
}

export async function listLeaveTypeColumns(sequelize: any, force = false): Promise<Set<string>> {
  if (columnCache && !force) return columnCache;
  if (!sequelize) return new Set();
  const [rows]: any = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'leave_types'`,
  );
  columnCache = new Set((rows || []).map((r: any) => String(r.column_name)));
  return columnCache;
}

export function invalidateLeaveTypeColumnCache() {
  columnCache = null;
}

function bindValue(key: string, value: any) {
  if (key === 'applicable_departments' || key === 'applicable_positions') {
    return JSON.stringify(Array.isArray(value) ? value : []);
  }
  return value;
}

export async function upsertLeaveType(
  sequelize: any,
  tenantId: string,
  body: Record<string, any>,
): Promise<any> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureLeaveTypesSchema(sequelize);
  const columns = await listLeaveTypeColumns(sequelize, true);
  if (!columns.has('code') || !columns.has('name')) {
    throw new Error('Tabel leave_types tidak lengkap');
  }

  const row = pickExistingLeaveTypeColumns(leaveTypeRowFromBody(body, tenantId), columns);
  if (!row.code || !row.name) throw new Error('Kode dan Nama wajib diisi');

  const replacements: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) replacements[k] = bindValue(k, v);

  const [found]: any = await sequelize.query(
    `SELECT id FROM leave_types
     WHERE tenant_id = :tenant_id AND lower(code) = :code
     LIMIT 1`,
    { replacements: { tenant_id: tenantId, code: row.code } },
  );
  const existingId = found?.[0]?.id ? String(found[0].id) : null;

  if (existingId) {
    const sets = Object.keys(row)
      .filter((k) => k !== 'id' && k !== 'tenant_id' && k !== 'code')
      .map((k) => {
        if (k === 'applicable_departments' || k === 'applicable_positions') {
          return `${k} = CAST(:${k} AS jsonb)`;
        }
        return `${k} = :${k}`;
      });
    if (columns.has('updated_at')) sets.push('updated_at = NOW()');
    if (sets.length) {
      await sequelize.query(
        `UPDATE leave_types SET ${sets.join(', ')} WHERE id = :id AND tenant_id = :tenant_id`,
        { replacements: { ...replacements, id: existingId, tenant_id: tenantId } },
      );
    }
    const [out]: any = await sequelize.query(
      `SELECT * FROM leave_types WHERE id = :id LIMIT 1`,
      { replacements: { id: existingId } },
    );
    return out?.[0] || { id: existingId, ...row };
  }

  const insertKeys = Object.keys(row).filter((k) => k !== 'id');
  const colSql = ['id', ...insertKeys].join(', ');
  const valSql = [
    'gen_random_uuid()',
    ...insertKeys.map((k) => (
      k === 'applicable_departments' || k === 'applicable_positions'
        ? `CAST(:${k} AS jsonb)`
        : `:${k}`
    )),
  ].join(', ');
  const timeCols = [
    columns.has('created_at') && !insertKeys.includes('created_at') ? 'created_at' : null,
    columns.has('updated_at') && !insertKeys.includes('updated_at') ? 'updated_at' : null,
  ].filter(Boolean) as string[];
  const timeVals = timeCols.map(() => 'NOW()');

  const [created]: any = await sequelize.query(
    `INSERT INTO leave_types (${colSql}${timeCols.length ? `, ${timeCols.join(', ')}` : ''})
     VALUES (${valSql}${timeVals.length ? `, ${timeVals.join(', ')}` : ''})
     RETURNING *`,
    { replacements },
  );
  return created?.[0] || row;
}
