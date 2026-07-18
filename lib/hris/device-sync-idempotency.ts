/**
 * Request-level idempotency for attendance device sync batches.
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch { /* */ }

let ready = false;

export async function ensureDeviceSyncIdempotencyTable(db?: any): Promise<boolean> {
  const seq = db || sequelize;
  if (!seq) return false;
  if (ready) return true;
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS attendance_device_sync_events (
        id UUID PRIMARY KEY,
        idempotency_key VARCHAR(255) NOT NULL UNIQUE,
        device_id VARCHAR(80),
        tenant_id UUID,
        result JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    ready = true;
    return true;
  } catch (e: any) {
    console.warn('[device-sync-idempotency] ensure:', e?.message || e);
    return false;
  }
}

/** Returns prior result if duplicate; otherwise claims the key. */
export async function claimDeviceSyncEvent(opts: {
  key: string;
  deviceId?: string | null;
  tenantId?: string | null;
  db?: any;
}): Promise<{ duplicate: boolean; prior?: any }> {
  const seq = opts.db || sequelize;
  const key = String(opts.key || '').slice(0, 255);
  if (!seq || !key) return { duplicate: false };

  await ensureDeviceSyncIdempotencyTable(seq);
  try {
    const [existing] = await seq.query(
      `SELECT result FROM attendance_device_sync_events WHERE idempotency_key = :key LIMIT 1`,
      { replacements: { key } },
    );
    if (existing?.[0]) {
      let prior = existing[0].result;
      if (typeof prior === 'string') {
        try { prior = JSON.parse(prior); } catch { /* */ }
      }
      return { duplicate: true, prior };
    }

    await seq.query(
      `INSERT INTO attendance_device_sync_events (id, idempotency_key, device_id, tenant_id, result)
       VALUES (:id, :key, :did, :tid, '{}'::jsonb)`,
      {
        replacements: {
          id: crypto.randomUUID(),
          key,
          did: opts.deviceId || null,
          tid: opts.tenantId || null,
        },
      },
    );
    return { duplicate: false };
  } catch (e: any) {
    const code = e?.parent?.code || e?.original?.code || '';
    if (code === '23505' || /unique/i.test(String(e?.message))) {
      return { duplicate: true };
    }
    console.warn('[device-sync-idempotency]', e?.message || e);
    return { duplicate: false };
  }
}

export async function storeDeviceSyncResult(opts: {
  key: string;
  result: Record<string, unknown>;
  db?: any;
}): Promise<void> {
  const seq = opts.db || sequelize;
  if (!seq || !opts.key) return;
  try {
    await seq.query(
      `UPDATE attendance_device_sync_events
       SET result = CAST(:result AS jsonb)
       WHERE idempotency_key = :key`,
      { replacements: { key: opts.key, result: JSON.stringify(opts.result || {}) } },
    );
  } catch (e: any) {
    console.warn('[device-sync-idempotency] store:', e?.message || e);
  }
}
