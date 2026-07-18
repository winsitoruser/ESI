/**
 * Bulk employee field update with 24h undo window.
 * Allowed patch keys only — never salary / PII-sensitive fields.
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch { /* */ }

const ALLOWED_PATCH = new Set([
  'department',
  'position',
  'status',
  'workLocation',
  'employmentCategory',
]);

/** Map API/camel keys → DB column names (employees table). */
const FIELD_TO_COLUMN: Record<string, string> = {
  department: 'department',
  position: 'position',
  status: 'status',
  workLocation: 'work_location',
  employmentCategory: 'employment_category',
};

const UNDO_HOURS = 24;
const MAX_IDS = 200;

let ready = false;

export async function ensureBulkEditTables(db?: any): Promise<boolean> {
  const seq = db || sequelize;
  if (!seq) return false;
  if (ready) return true;
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS employee_bulk_edit_batches (
        id UUID PRIMARY KEY,
        tenant_id UUID,
        actor_id VARCHAR(64),
        actor_email VARCHAR(200),
        patch JSONB NOT NULL DEFAULT '{}'::jsonb,
        snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
        employee_ids UUID[] NOT NULL,
        undone_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await seq.query(`
      CREATE INDEX IF NOT EXISTS idx_emp_bulk_edit_tenant
      ON employee_bulk_edit_batches (tenant_id, created_at DESC)
    `);
    ready = true;
    return true;
  } catch (e: any) {
    console.warn('[employee-bulk-edit] ensure:', e?.message || e);
    return false;
  }
}

export function sanitizeBulkPatch(raw: Record<string, unknown> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!ALLOWED_PATCH.has(k)) continue;
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s) continue;
    out[k] = s;
  }
  return out;
}

export async function bulkUpdateEmployees(opts: {
  tenantId: string | null;
  ids: string[];
  patch: Record<string, unknown>;
  actorId?: string | null;
  actorEmail?: string | null;
  db?: any;
}): Promise<{
  updated: number;
  batchId: string | null;
  undoExpiresAt: string | null;
  patch: Record<string, string>;
}> {
  const seq = opts.db || sequelize;
  if (!seq) throw new Error('Database unavailable');

  const ids = [...new Set((opts.ids || []).map(String).filter(Boolean))];
  if (!ids.length) throw new Error('Pilih minimal satu karyawan');
  if (ids.length > MAX_IDS) throw new Error(`Maksimal ${MAX_IDS} karyawan per batch`);

  const patch = sanitizeBulkPatch(opts.patch);
  if (!Object.keys(patch).length) {
    throw new Error('Tidak ada field yang diizinkan untuk diubah (department, position, status, workLocation, employmentCategory)');
  }

  await ensureBulkEditTables(seq);

  const [cols] = await seq.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
  `);
  const colSet = new Set((cols || []).map((c: any) => String(c.column_name)));
  const has = (c: string) => colSet.has(c);

  const selectCols = ['id', 'department', 'position', 'status']
    .concat(has('work_location') ? ['work_location'] : [])
    .concat(has('employment_category') ? ['employment_category'] : [])
    .filter((c) => c === 'id' || has(c));

  const tidClause = opts.tenantId && has('tenant_id') ? 'AND tenant_id = :tid' : '';
  const [rows] = await seq.query(
    `SELECT ${selectCols.join(', ')}
     FROM employees
     WHERE id = ANY(:ids::uuid[]) ${tidClause}`,
    { replacements: { ids, tid: opts.tenantId } },
  );

  if (!rows?.length) throw new Error('Karyawan tidak ditemukan di tenant ini');

  const snapshots = (rows as any[]).map((r) => ({
    id: r.id,
    department: r.department,
    position: r.position,
    status: r.status,
    workLocation: r.work_location ?? null,
    employmentCategory: r.employment_category ?? null,
  }));

  const setParts: string[] = [];
  const replacements: Record<string, unknown> = {
    ids: snapshots.map((s) => s.id),
    tid: opts.tenantId,
  };
  for (const [key, val] of Object.entries(patch)) {
    const col = FIELD_TO_COLUMN[key];
    if (!col || !has(col)) continue;
    setParts.push(`${col} = :p_${key}`);
    replacements[`p_${key}`] = val;
  }
  if (!setParts.length) throw new Error('Tidak ada kolom yang bisa di-update di skema ini');
  if (has('updated_at')) setParts.push('updated_at = NOW()');

  await seq.query(
    `UPDATE employees SET ${setParts.join(', ')}
     WHERE id = ANY(:ids::uuid[]) ${tidClause}`,
    { replacements },
  );

  const batchId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + UNDO_HOURS * 60 * 60 * 1000);
  try {
    await seq.query(
      `INSERT INTO employee_bulk_edit_batches
        (id, tenant_id, actor_id, actor_email, patch, snapshots, employee_ids, expires_at)
       VALUES
        (:id, :tid, :aid, :aemail, :patch::jsonb, :snapshots::jsonb, :eids::uuid[], :exp)`,
      {
        replacements: {
          id: batchId,
          tid: opts.tenantId,
          aid: opts.actorId || null,
          aemail: opts.actorEmail || null,
          patch: JSON.stringify(patch),
          snapshots: JSON.stringify(snapshots),
          eids: snapshots.map((s) => s.id),
          exp: expiresAt.toISOString(),
        },
      },
    );
  } catch (e: any) {
    console.warn('[employee-bulk-edit] batch log:', e?.message || e);
    return {
      updated: snapshots.length,
      batchId: null,
      undoExpiresAt: null,
      patch,
    };
  }

  return {
    updated: snapshots.length,
    batchId,
    undoExpiresAt: expiresAt.toISOString(),
    patch,
  };
}

export async function undoBulkEdit(opts: {
  tenantId: string | null;
  batchId: string;
  db?: any;
}): Promise<{ restored: number }> {
  const seq = opts.db || sequelize;
  if (!seq) throw new Error('Database unavailable');
  await ensureBulkEditTables(seq);

  const tidClause = opts.tenantId ? 'AND tenant_id = :tid' : '';
  const [batches] = await seq.query(
    `SELECT * FROM employee_bulk_edit_batches
     WHERE id = :id ${tidClause} LIMIT 1`,
    { replacements: { id: opts.batchId, tid: opts.tenantId } },
  );
  const batch = batches?.[0];
  if (!batch) throw new Error('Batch tidak ditemukan');
  if (batch.undone_at) throw new Error('Batch sudah di-undo');
  if (new Date(batch.expires_at).getTime() < Date.now()) {
    throw new Error('Jendela undo 24 jam sudah habis');
  }

  let snapshots = batch.snapshots;
  if (typeof snapshots === 'string') {
    try { snapshots = JSON.parse(snapshots); } catch { snapshots = []; }
  }
  if (!Array.isArray(snapshots) || !snapshots.length) {
    throw new Error('Snapshot kosong');
  }

  let restored = 0;
  const [cols] = await seq.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
  `);
  const colSet = new Set((cols || []).map((c: any) => String(c.column_name)));
  const parts = ['department = :department', 'position = :position', 'status = :status'];
  if (colSet.has('work_location')) parts.push('work_location = :workLocation');
  if (colSet.has('employment_category')) parts.push('employment_category = :employmentCategory');
  if (colSet.has('updated_at')) parts.push('updated_at = NOW()');
  const tidWhere = opts.tenantId && colSet.has('tenant_id') ? 'AND tenant_id = :tid' : '';

  for (const snap of snapshots) {
    await seq.query(
      `UPDATE employees SET ${parts.join(', ')}
       WHERE id = :id ${tidWhere}`,
      {
        replacements: {
          id: snap.id,
          department: snap.department,
          position: snap.position,
          status: snap.status,
          workLocation: snap.workLocation,
          employmentCategory: snap.employmentCategory,
          tid: opts.tenantId,
        },
      },
    );
    restored += 1;
  }

  await seq.query(
    `UPDATE employee_bulk_edit_batches SET undone_at = NOW() WHERE id = :id`,
    { replacements: { id: opts.batchId } },
  );

  return { restored };
}
