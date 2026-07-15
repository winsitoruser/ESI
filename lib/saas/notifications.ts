/**
 * Phase 21 — in-app notification center for Humanify tenants.
 *
 * Persists notifications in `saas_notifications` and auto-derives system
 * notifications from Phase 9 account alerts (deduped by a stable source key),
 * so the bell reflects live account health plus any custom events.
 */
import crypto from 'crypto';
import { getAccountAlerts, type AlertSeverity } from './account-alerts';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type NotifType = 'urgent' | 'warning' | 'info';

export interface NotificationRow {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  actionHref: string | null;
  isRead: boolean;
  createdAt: string;
  sourceKey: string | null;
}

let tableReady = false;
export async function ensureNotificationsTable(): Promise<boolean> {
  if (!sequelize) return false;
  if (tableReady) return true;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_notifications (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      user_id TEXT,
      source_key TEXT,
      type TEXT NOT NULL DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      action_href TEXT,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_saas_notif_tenant ON saas_notifications (tenant_id);`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_saas_notif_source ON saas_notifications (tenant_id, source_key);`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_saas_notif_read ON saas_notifications (tenant_id, is_read);`);
  tableReady = true;
  return true;
}

function severityToType(sev: AlertSeverity): NotifType {
  return sev === 'critical' ? 'urgent' : sev === 'warning' ? 'warning' : 'info';
}

/**
 * Reconcile alert-sourced notifications with the tenant's current live alerts:
 * upsert active alerts (source_key = `alert:<id>`) and remove stale ones so the
 * bell never shows resolved issues. Idempotent — safe to call on every poll.
 */
export async function syncAccountAlertNotifications(tenantId: string): Promise<void> {
  if (!sequelize || !tenantId) return;
  await ensureNotificationsTable();

  let alerts;
  try { alerts = await getAccountAlerts(tenantId); } catch { return; }

  const activeKeys = alerts.map((a) => `alert:${a.id}`);

  // Remove alert-sourced notifications that are no longer active.
  try {
    if (activeKeys.length) {
      await sequelize.query(
        `DELETE FROM saas_notifications
         WHERE tenant_id = :tid AND source_key LIKE 'alert:%' AND source_key NOT IN (:keys)`,
        { replacements: { tid: tenantId, keys: activeKeys } },
      );
    } else {
      await sequelize.query(
        `DELETE FROM saas_notifications WHERE tenant_id = :tid AND source_key LIKE 'alert:%'`,
        { replacements: { tid: tenantId } },
      );
    }
  } catch { /* */ }

  for (const a of alerts) {
    const sourceKey = `alert:${a.id}`;
    const type = severityToType(a.severity);
    try {
      const [existing] = await sequelize.query(
        `SELECT id, is_read FROM saas_notifications
         WHERE tenant_id = :tid AND source_key = :key LIMIT 1`,
        { replacements: { tid: tenantId, key: sourceKey } },
      );
      if (existing?.length) {
        // Refresh content but never silently un-read a dismissed alert.
        await sequelize.query(
          `UPDATE saas_notifications
           SET type = :type, title = :title, message = :message, action_href = :href
           WHERE tenant_id = :tid AND source_key = :key`,
          { replacements: { tid: tenantId, key: sourceKey, type, title: a.title, message: a.message, href: a.actionHref || null } },
        );
      } else {
        await sequelize.query(
          `INSERT INTO saas_notifications (id, tenant_id, user_id, source_key, type, title, message, action_href, is_read)
           VALUES (:id, :tid, NULL, :key, :type, :title, :message, :href, false)`,
          { replacements: { id: crypto.randomUUID(), tid: tenantId, key: sourceKey, type, title: a.title, message: a.message, href: a.actionHref || null } },
        );
      }
    } catch { /* */ }
  }
}

/** Generic insert for custom events (e.g. import finished). Deduped by sourceKey. */
export async function createNotification(opts: {
  tenantId: string;
  userId?: string | number | null;
  type?: NotifType;
  title: string;
  message?: string;
  actionHref?: string | null;
  sourceKey?: string | null;
}): Promise<string | null> {
  if (!sequelize || !opts.tenantId || !opts.title) return null;
  await ensureNotificationsTable();

  if (opts.sourceKey) {
    try {
      const [dupe] = await sequelize.query(
        `SELECT id FROM saas_notifications
         WHERE tenant_id = :tid AND source_key = :key AND is_read = false LIMIT 1`,
        { replacements: { tid: opts.tenantId, key: opts.sourceKey } },
      );
      if (dupe?.length) return dupe[0].id;
    } catch { /* */ }
  }

  const id = crypto.randomUUID();
  try {
    await sequelize.query(
      `INSERT INTO saas_notifications (id, tenant_id, user_id, source_key, type, title, message, action_href, is_read)
       VALUES (:id, :tid, :uid, :key, :type, :title, :message, :href, false)`,
      {
        replacements: {
          id,
          tid: opts.tenantId,
          uid: opts.userId != null ? String(opts.userId) : null,
          key: opts.sourceKey || null,
          type: opts.type || 'info',
          title: opts.title,
          message: opts.message || '',
          href: opts.actionHref || null,
        },
      },
    );
    return id;
  } catch {
    return null;
  }
}

export async function listNotifications(
  tenantId: string,
  userId?: string | number | null,
  limit = 20,
): Promise<{ notifications: NotificationRow[]; unreadCount: number }> {
  if (!sequelize || !tenantId) return { notifications: [], unreadCount: 0 };
  await ensureNotificationsTable();
  const uid = userId != null ? String(userId) : null;
  try {
    const [rows] = await sequelize.query(
      `SELECT id, type, title, message, action_href, is_read, created_at, source_key
       FROM saas_notifications
       WHERE tenant_id = :tid AND (user_id IS NULL OR user_id = :uid)
       ORDER BY is_read ASC, created_at DESC
       LIMIT :limit`,
      { replacements: { tid: tenantId, uid, limit } },
    );
    const [cnt] = await sequelize.query(
      `SELECT COUNT(*)::int AS c FROM saas_notifications
       WHERE tenant_id = :tid AND (user_id IS NULL OR user_id = :uid) AND is_read = false`,
      { replacements: { tid: tenantId, uid } },
    );
    const notifications: NotificationRow[] = (rows || []).map((r: any) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      message: r.message,
      actionHref: r.action_href || null,
      isRead: Boolean(r.is_read),
      createdAt: r.created_at,
      sourceKey: r.source_key || null,
    }));
    return { notifications, unreadCount: cnt?.[0]?.c || 0 };
  } catch {
    return { notifications: [], unreadCount: 0 };
  }
}

export async function markNotificationsRead(
  tenantId: string,
  userId?: string | number | null,
  ids?: string[],
): Promise<number> {
  if (!sequelize || !tenantId) return 0;
  await ensureNotificationsTable();
  const uid = userId != null ? String(userId) : null;
  try {
    if (ids && ids.length) {
      const [, meta] = await sequelize.query(
        `UPDATE saas_notifications SET is_read = true, read_at = NOW()
         WHERE tenant_id = :tid AND (user_id IS NULL OR user_id = :uid) AND id IN (:ids) AND is_read = false`,
        { replacements: { tid: tenantId, uid, ids } },
      );
      return (meta as any)?.rowCount || 0;
    }
    const [, meta] = await sequelize.query(
      `UPDATE saas_notifications SET is_read = true, read_at = NOW()
       WHERE tenant_id = :tid AND (user_id IS NULL OR user_id = :uid) AND is_read = false`,
      { replacements: { tid: tenantId, uid } },
    );
    return (meta as any)?.rowCount || 0;
  } catch {
    return 0;
  }
}
