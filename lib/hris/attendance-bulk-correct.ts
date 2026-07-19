/**
 * Bulk attendance correction with 24h undo (HRS-2).
 * Patch: status, clockIn, clockOut, notes — by attendance row id.
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch { /* */ }

const ALLOWED = new Set(['status', 'clockIn', 'clockOut', 'notes']);
const UNDO_HOURS = 24;
const MAX_IDS = 200;

let ready = false;

export async function ensureAttendanceBulkCorrectTables(db?: any): Promise<boolean> {
  const seq = db || sequelize;
  if (!seq) return false;
  if (ready) return true;
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS attendance_bulk_correct_batches (
        id UUID PRIMARY KEY,
        tenant_id UUID,
        actor_id VARCHAR(64),
        actor_email VARCHAR(200),
        patch JSONB NOT NULL DEFAULT '{}'::jsonb,
        snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
        attendance_ids UUID[] NOT NULL,
        undone_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await seq.query(`
      CREATE INDEX IF NOT EXISTS idx_att_bulk_correct_tenant
      ON attendance_bulk_correct_batches (tenant_id, created_at DESC)
    `);
    ready = true;
    return true;
  } catch (e: any) {
    console.warn('[attendance-bulk-correct] ensure:', e?.message || e);
    return false;
  }
}

export function sanitizeAttendancePatch(raw: Record<string, unknown> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!ALLOWED.has(k)) continue;
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s && k !== 'notes') continue;
    out[k] = s;
  }
  return out;
}

function calcWorkHours(clockIn: string | null, clockOut: string | null): number | null {
  if (!clockIn || !clockOut) return null;
  const diff = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000;
  return diff > 0 ? Math.round(diff * 100) / 100 : 0;
}

export async function bulkCorrectAttendance(opts: {
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
  if (!ids.length) throw new Error('Pilih minimal satu baris absensi');
  if (ids.length > MAX_IDS) throw new Error(`Maksimal ${MAX_IDS} baris per batch`);

  const patch = sanitizeAttendancePatch(opts.patch);
  if (!Object.keys(patch).length) {
    throw new Error('Tidak ada field yang diizinkan (status, clockIn, clockOut, notes)');
  }

  await ensureAttendanceBulkCorrectTables(seq);

  const tidClause = opts.tenantId ? 'AND tenant_id = :tid' : '';
  const [rows] = await seq.query(
    `SELECT id, tenant_id, employee_id, date, clock_in, clock_out, status, work_hours, notes
     FROM employee_attendance
     WHERE id = ANY(CAST(:ids AS uuid[])) ${tidClause}`,
    { replacements: { ids: `{${ids.join(',')}}`, tid: opts.tenantId } },
  );
  if (!rows?.length) throw new Error('Baris absensi tidak ditemukan');

  const snapshots = (rows as any[]).map((r) => ({
    id: r.id,
    clock_in: r.clock_in,
    clock_out: r.clock_out,
    status: r.status,
    work_hours: r.work_hours,
    notes: r.notes,
  }));

  const setParts: string[] = ['updated_at = NOW()'];
  const replacements: Record<string, unknown> = {
    ids: `{${snapshots.map((s) => s.id).join(',')}}`,
    tid: opts.tenantId,
  };

  if (patch.status) {
    setParts.push('status = :p_status');
    replacements.p_status = patch.status;
  }
  if (patch.notes != null) {
    setParts.push('notes = :p_notes');
    replacements.p_notes = patch.notes;
  }
  if (patch.clockIn) {
    setParts.push('clock_in = :p_clockIn::timestamptz');
    replacements.p_clockIn = patch.clockIn;
  }
  if (patch.clockOut) {
    setParts.push('clock_out = :p_clockOut::timestamptz');
    replacements.p_clockOut = patch.clockOut;
  }

  // Recalc work_hours when times change
  if (patch.clockIn || patch.clockOut) {
    // Per-row update for accurate hours
    for (const snap of snapshots) {
      const cin = patch.clockIn || snap.clock_in;
      const cout = patch.clockOut || snap.clock_out;
      const hours = calcWorkHours(
        cin ? String(cin) : null,
        cout ? String(cout) : null,
      );
      const rowSets = ['updated_at = NOW()'];
      const rowRepl: Record<string, unknown> = { id: snap.id, tid: opts.tenantId };
      if (patch.status) {
        rowSets.push('status = :status');
        rowRepl.status = patch.status;
      }
      if (patch.notes != null) {
        rowSets.push('notes = :notes');
        rowRepl.notes = patch.notes;
      }
      if (patch.clockIn) {
        rowSets.push('clock_in = :clockIn::timestamptz');
        rowRepl.clockIn = patch.clockIn;
      }
      if (patch.clockOut) {
        rowSets.push('clock_out = :clockOut::timestamptz');
        rowRepl.clockOut = patch.clockOut;
      }
      if (hours != null) {
        rowSets.push('work_hours = :hours');
        rowRepl.hours = hours;
      }
      await seq.query(
        `UPDATE employee_attendance SET ${rowSets.join(', ')}
         WHERE id = :id ${tidClause}`,
        { replacements: rowRepl },
      );
    }
  } else {
    await seq.query(
      `UPDATE employee_attendance SET ${setParts.join(', ')}
       WHERE id = ANY(CAST(:ids AS uuid[])) ${tidClause}`,
      { replacements },
    );
  }

  const batchId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + UNDO_HOURS * 60 * 60 * 1000);
  try {
    await seq.query(
      `INSERT INTO attendance_bulk_correct_batches
        (id, tenant_id, actor_id, actor_email, patch, snapshots, attendance_ids, expires_at)
       VALUES
        (:id, :tid, :aid, :aemail, CAST(:patch AS jsonb), CAST(:snapshots AS jsonb), CAST(:aids AS uuid[]), :exp)`,
      {
        replacements: {
          id: batchId,
          tid: opts.tenantId,
          aid: opts.actorId || null,
          aemail: opts.actorEmail || null,
          patch: JSON.stringify(patch),
          snapshots: JSON.stringify(snapshots),
          aids: `{${snapshots.map((s) => s.id).join(',')}}`,
          exp: expiresAt.toISOString(),
        },
      },
    );
  } catch (e: any) {
    console.warn('[attendance-bulk-correct] batch log:', e?.message || e);
    return { updated: snapshots.length, batchId: null, undoExpiresAt: null, patch };
  }

  return {
    updated: snapshots.length,
    batchId,
    undoExpiresAt: expiresAt.toISOString(),
    patch,
  };
}

export async function undoAttendanceBulkCorrect(opts: {
  tenantId: string | null;
  batchId: string;
  db?: any;
}): Promise<{ restored: number }> {
  const seq = opts.db || sequelize;
  if (!seq) throw new Error('Database unavailable');
  await ensureAttendanceBulkCorrectTables(seq);

  const tidClause = opts.tenantId ? 'AND tenant_id = :tid' : '';
  const [batches] = await seq.query(
    `SELECT * FROM attendance_bulk_correct_batches WHERE id = :id ${tidClause} LIMIT 1`,
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
  if (!Array.isArray(snapshots) || !snapshots.length) throw new Error('Snapshot kosong');

  let restored = 0;
  for (const snap of snapshots) {
    await seq.query(
      `UPDATE employee_attendance SET
         clock_in = :clock_in,
         clock_out = :clock_out,
         status = :status,
         work_hours = :work_hours,
         notes = :notes,
         updated_at = NOW()
       WHERE id = :id ${tidClause}`,
      {
        replacements: {
          id: snap.id,
          clock_in: snap.clock_in,
          clock_out: snap.clock_out,
          status: snap.status,
          work_hours: snap.work_hours,
          notes: snap.notes,
          tid: opts.tenantId,
        },
      },
    );
    restored += 1;
  }

  await seq.query(
    `UPDATE attendance_bulk_correct_batches SET undone_at = NOW() WHERE id = :id`,
    { replacements: { id: opts.batchId } },
  );
  return { restored };
}
