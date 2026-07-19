/**
 * Persist Action Inbox snoozes (hide item until until_at).
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch { /* */ }

let ready = false;

export function inboxItemKey(type: string, id: string | number): string {
  return `${String(type || 'item')}:${String(id)}`.slice(0, 200);
}

export async function ensureActionInboxSnoozeTable(db?: any): Promise<boolean> {
  const seq = db || sequelize;
  if (!seq) return false;
  if (ready) return true;
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS hris_action_inbox_snoozes (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        item_key VARCHAR(200) NOT NULL,
        user_id VARCHAR(80),
        until_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, item_key)
      )
    `);
    await seq.query(`
      CREATE INDEX IF NOT EXISTS idx_inbox_snooze_until
      ON hris_action_inbox_snoozes (tenant_id, until_at)
    `);
    ready = true;
    return true;
  } catch (e: any) {
    console.warn('[action-inbox-snooze] ensure:', e?.message || e);
    return false;
  }
}

/** Snooze for hours (default 24, clamp 1–168). */
export async function snoozeInboxItem(opts: {
  tenantId: string;
  itemKey: string;
  userId?: string | null;
  hours?: number;
  db?: any;
}): Promise<{ ok: boolean; untilAt?: string }> {
  const seq = opts.db || sequelize;
  if (!seq || !opts.tenantId || !opts.itemKey) return { ok: false };
  await ensureActionInboxSnoozeTable(seq);
  const hours = Math.max(1, Math.min(168, Number(opts.hours) || 24));
  const until = new Date(Date.now() + hours * 3600_000);
  try {
    await seq.query(
      `INSERT INTO hris_action_inbox_snoozes (id, tenant_id, item_key, user_id, until_at)
       VALUES (:id, :tid, :key, :uid, :until)
       ON CONFLICT (tenant_id, item_key)
       DO UPDATE SET until_at = EXCLUDED.until_at, user_id = EXCLUDED.user_id`,
      {
        replacements: {
          id: crypto.randomUUID(),
          tid: opts.tenantId,
          key: String(opts.itemKey).slice(0, 200),
          uid: opts.userId || null,
          until: until.toISOString(),
        },
      },
    );
    return { ok: true, untilAt: until.toISOString() };
  } catch (e: any) {
    console.warn('[action-inbox-snooze]', e?.message || e);
    return { ok: false };
  }
}

/** Active snooze keys for tenant (until_at > now). */
export async function listActiveSnoozeKeys(opts: {
  tenantId: string;
  db?: any;
}): Promise<Set<string>> {
  const seq = opts.db || sequelize;
  const out = new Set<string>();
  if (!seq || !opts.tenantId) return out;
  await ensureActionInboxSnoozeTable(seq);
  try {
    const [rows] = await seq.query(
      `SELECT item_key FROM hris_action_inbox_snoozes
       WHERE tenant_id = :tid AND until_at > NOW()`,
      { replacements: { tid: opts.tenantId } },
    );
    for (const r of rows || []) {
      if (r.item_key) out.add(String(r.item_key));
    }
  } catch (e: any) {
    console.warn('[action-inbox-snooze] list:', e?.message || e);
  }
  return out;
}

/** Clear snooze so item returns to Action Inbox. */
export async function clearInboxSnooze(opts: {
  tenantId: string;
  itemKey: string;
  db?: any;
}): Promise<{ ok: boolean; cleared: boolean }> {
  const seq = opts.db || sequelize;
  if (!seq || !opts.tenantId || !opts.itemKey) return { ok: false, cleared: false };
  await ensureActionInboxSnoozeTable(seq);
  try {
    const [, meta] = await seq.query(
      `DELETE FROM hris_action_inbox_snoozes
       WHERE tenant_id = :tid AND item_key = :key`,
      {
        replacements: {
          tid: opts.tenantId,
          key: String(opts.itemKey).slice(0, 200),
        },
      },
    );
    const cleared = Number((meta as any)?.rowCount ?? 0) > 0;
    return { ok: true, cleared };
  } catch (e: any) {
    console.warn('[action-inbox-snooze] clear:', e?.message || e);
    return { ok: false, cleared: false };
  }
}
