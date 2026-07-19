/**
 * Bulk cancel pending leave requests with 24h undo (HR-S3-1).
 */
import crypto from 'crypto';
import { adjustLeaveBalancePending } from './leave-request-service';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch { /* */ }

const UNDO_HOURS = 24;
const MAX_IDS = 200;
let ready = false;

export async function ensureLeaveBulkCancelTables(db?: any): Promise<boolean> {
  const seq = db || sequelize;
  if (!seq) return false;
  if (ready) return true;
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS leave_bulk_cancel_batches (
        id UUID PRIMARY KEY,
        tenant_id UUID,
        actor_id VARCHAR(64),
        actor_email VARCHAR(200),
        snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
        leave_ids UUID[] NOT NULL,
        undone_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await seq.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_bulk_cancel_tenant
      ON leave_bulk_cancel_batches (tenant_id, created_at DESC)
    `);
    ready = true;
    return true;
  } catch (e: any) {
    console.warn('[leave-bulk-cancel] ensure:', e?.message || e);
    return false;
  }
}

export async function bulkCancelPendingLeave(opts: {
  tenantId: string | null;
  ids: string[];
  actorId?: string | null;
  actorEmail?: string | null;
  db?: any;
}): Promise<{ cancelled: number; batchId: string | null; undoExpiresAt: string | null }> {
  const seq = opts.db || sequelize;
  if (!seq) throw new Error('Database unavailable');
  if (!opts.tenantId) throw new Error('Tenant context wajib');

  const ids = [...new Set((opts.ids || []).map(String).filter(Boolean))];
  if (!ids.length) throw new Error('Pilih minimal satu pengajuan cuti');
  if (ids.length > MAX_IDS) throw new Error(`Maksimal ${MAX_IDS} baris per batch`);

  await ensureLeaveBulkCancelTables(seq);

  const [rows] = await seq.query(
    `SELECT id, employee_id, leave_type, total_days, status, reason, start_date, end_date,
            current_approval_step, total_approval_steps, approval_config_id, attachment_url
     FROM leave_requests
     WHERE id = ANY(CAST(:ids AS uuid[]))
       AND tenant_id = :tid
       AND status = 'pending'`,
    { replacements: { ids: `{${ids.join(',')}}`, tid: opts.tenantId } },
  );
  if (!rows?.length) throw new Error('Pengajuan pending tidak ditemukan');

  const leaveIds = (rows as any[]).map((r) => r.id);
  const [steps] = await seq.query(
    `SELECT * FROM leave_approval_steps WHERE leave_request_id = ANY(CAST(:ids AS uuid[]))`,
    { replacements: { ids: `{${leaveIds.join(',')}}` } },
  ).catch(() => [[]]);

  const snapshots = (rows as any[]).map((r) => ({
    request: r,
    steps: ((steps as any[]) || []).filter((s) => String(s.leave_request_id) === String(r.id)),
  }));

  for (const snap of snapshots) {
    const r = snap.request;
    await seq.query(
      `UPDATE leave_requests
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = :id AND tenant_id = :tid AND status = 'pending'`,
      { replacements: { id: r.id, tid: opts.tenantId } },
    );
    try {
      await seq.query(
        `UPDATE leave_requests SET rejection_reason = COALESCE(rejection_reason, 'Dibatalkan massal oleh HR')
         WHERE id = :id AND tenant_id = :tid`,
        { replacements: { id: r.id, tid: opts.tenantId } },
      );
    } catch { /* rejection_reason may be missing */ }
    await seq.query(
      `UPDATE leave_approval_steps
       SET status = CASE WHEN status IN ('pending','waiting') THEN 'cancelled' ELSE status END,
           updated_at = NOW()
       WHERE leave_request_id = :id AND status IN ('pending','waiting')`,
      { replacements: { id: r.id } },
    ).catch(() => {});
    if (r.employee_id && r.leave_type && r.total_days) {
      await adjustLeaveBalancePending(
        String(r.employee_id),
        String(r.leave_type),
        new Date().getFullYear(),
        Number(r.total_days) || 0,
        'remove',
      );
    }
  }

  const batchId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + UNDO_HOURS * 60 * 60 * 1000);
  try {
    await seq.query(
      `INSERT INTO leave_bulk_cancel_batches
        (id, tenant_id, actor_id, actor_email, snapshots, leave_ids, expires_at)
       VALUES
        (:id, :tid, :aid, :aemail, CAST(:snapshots AS jsonb), CAST(:lids AS uuid[]), :exp)`,
      {
        replacements: {
          id: batchId,
          tid: opts.tenantId,
          aid: opts.actorId || null,
          aemail: opts.actorEmail || null,
          snapshots: JSON.stringify(snapshots),
          lids: `{${leaveIds.join(',')}}`,
          exp: expiresAt.toISOString(),
        },
      },
    );
  } catch (e: any) {
    console.warn('[leave-bulk-cancel] batch insert:', e?.message || e);
    return { cancelled: snapshots.length, batchId: null, undoExpiresAt: null };
  }

  return {
    cancelled: snapshots.length,
    batchId,
    undoExpiresAt: expiresAt.toISOString(),
  };
}

export async function undoLeaveBulkCancel(opts: {
  tenantId: string | null;
  batchId: string;
  db?: any;
}): Promise<{ restored: number }> {
  const seq = opts.db || sequelize;
  if (!seq) throw new Error('Database unavailable');
  if (!opts.tenantId) throw new Error('Tenant context wajib');
  if (!opts.batchId) throw new Error('batchId wajib');

  await ensureLeaveBulkCancelTables(seq);

  const [batches] = await seq.query(
    `SELECT * FROM leave_bulk_cancel_batches
     WHERE id = :id AND tenant_id = :tid LIMIT 1`,
    { replacements: { id: opts.batchId, tid: opts.tenantId } },
  );
  const batch = batches?.[0];
  if (!batch) throw new Error('Batch tidak ditemukan');
  if (batch.undone_at) throw new Error('Batch sudah di-undo');
  if (new Date(batch.expires_at).getTime() < Date.now()) {
    throw new Error('Jendela undo 24 jam sudah habis');
  }

  const snapshots = typeof batch.snapshots === 'string'
    ? JSON.parse(batch.snapshots)
    : (batch.snapshots || []);

  for (const snap of snapshots) {
    const r = snap.request || snap;
    await seq.query(
      `UPDATE leave_requests SET
         status = 'pending',
         rejection_reason = NULL,
         updated_at = NOW()
       WHERE id = :id AND tenant_id = :tid`,
      { replacements: { id: r.id, tid: opts.tenantId } },
    );
    for (const step of snap.steps || []) {
      await seq.query(
        `UPDATE leave_approval_steps SET status = :st, updated_at = NOW() WHERE id = :sid`,
        { replacements: { sid: step.id, st: step.status } },
      ).catch(() => {});
    }
    if (r.employee_id && r.leave_type && r.total_days) {
      await adjustLeaveBalancePending(
        String(r.employee_id),
        String(r.leave_type),
        new Date().getFullYear(),
        Number(r.total_days) || 0,
        'add',
      );
    }
  }

  await seq.query(
    `UPDATE leave_bulk_cancel_batches SET undone_at = NOW() WHERE id = :id`,
    { replacements: { id: opts.batchId } },
  );

  return { restored: snapshots.length };
}
