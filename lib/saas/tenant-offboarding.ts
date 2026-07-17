/**
 * Humanify SaaS Phase 11 — tenant offboarding (account closure request +
 * data export-on-delete). Non-destructive: schedules a grace window in
 * tenants.settings.offboarding; real deletion stays a platform-ops decision.
 */
import { getTenantColumns, parseTenantSettings } from './tenant-schema';
import { resolveTenantById } from './tenant-slug';
import { exportTenantBundle } from './humanify-export';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

const GRACE_DAYS = 14;

export interface OffboardingState {
  status: 'active' | 'requested';
  requestedAt: string | null;
  requestedBy: string | null;
  reason: string | null;
  graceUntil: string | null;
  cancelledAt?: string | null;
}

function emptyState(): OffboardingState {
  return {
    status: 'active',
    requestedAt: null,
    requestedBy: null,
    reason: null,
    graceUntil: null,
  };
}

async function readSettings(tenantId: string): Promise<Record<string, any> | null> {
  if (!sequelize) return null;
  const cols = await getTenantColumns();
  if (!cols.has('settings')) return null;
  const [rows] = await sequelize.query(
    `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  if (!rows?.length) return null;
  return parseTenantSettings(rows[0].settings);
}

async function writeSettings(tenantId: string, settings: Record<string, any>): Promise<void> {
  await sequelize.query(
    `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
    { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
  );
}

export async function getOffboardingStatus(tenantId: string): Promise<OffboardingState> {
  const settings = await readSettings(tenantId);
  if (!settings) return emptyState();
  const ob = settings.offboarding;
  if (!ob || ob.status !== 'requested') return emptyState();
  return {
    status: 'requested',
    requestedAt: ob.requestedAt || null,
    requestedBy: ob.requestedBy || null,
    reason: ob.reason || null,
    graceUntil: ob.graceUntil || null,
  };
}

export async function requestOffboarding(
  tenantId: string,
  opts: { reason?: string; requestedBy?: string | null },
): Promise<OffboardingState> {
  if (!sequelize) throw new Error('Database unavailable');
  const cols = await getTenantColumns();
  if (!cols.has('settings')) throw new Error('Kolom settings tidak tersedia');
  const settings = (await readSettings(tenantId)) || {};
  const now = new Date();
  const graceUntil = new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
  settings.offboarding = {
    status: 'requested',
    requestedAt: now.toISOString(),
    requestedBy: opts.requestedBy || null,
    reason: (opts.reason || '').slice(0, 500) || null,
    graceUntil: graceUntil.toISOString(),
  };
  await writeSettings(tenantId, settings);
  return getOffboardingStatus(tenantId);
}

export async function cancelOffboarding(tenantId: string): Promise<OffboardingState> {
  if (!sequelize) throw new Error('Database unavailable');
  const settings = (await readSettings(tenantId)) || {};
  if (settings.offboarding) {
    settings.offboarding = {
      ...settings.offboarding,
      status: 'active',
      cancelledAt: new Date().toISOString(),
    };
    await writeSettings(tenantId, settings);
  }
  return emptyState();
}

export interface OffboardingExport {
  exportedAt: string;
  tenant: { id: string; slug: string | null; name: string | null; plan: string | null; status: string | null };
  employees: { count: number; csv: string };
  offboarding: OffboardingState;
}

export async function buildOffboardingExport(tenantId: string): Promise<OffboardingExport> {
  const [tenant, bundle, offboarding] = await Promise.all([
    resolveTenantById(tenantId),
    exportTenantBundle(tenantId),
    getOffboardingStatus(tenantId),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    tenant: {
      id: tenantId,
      slug: tenant?.slug || null,
      name: tenant?.name || null,
      plan: tenant?.subscriptionPlan || null,
      status: tenant?.status || null,
    },
    employees: bundle.employees,
    offboarding,
  };
}

/**
 * After grace window: archive tenant + mark offboarding completed.
 * Soft purge (status=archived) — no hard DELETE of tenant data.
 */
export async function purgeExpiredOffboardings(limit = 50): Promise<{
  matched: number;
  purged: number;
  slugs: string[];
}> {
  if (!sequelize) return { matched: 0, purged: 0, slugs: [] };
  const cols = await getTenantColumns();
  if (!cols.has('settings')) return { matched: 0, purged: 0, slugs: [] };

  // Ensure archived enum exists
  try {
    await sequelize.query(`ALTER TYPE enum_tenants_status ADD VALUE IF NOT EXISTS 'archived'`);
  } catch { /* */ }

  const [rows] = await sequelize.query(`
    SELECT id, slug, settings
    FROM tenants
    WHERE COALESCE(status::text, '') NOT IN ('archived')
      AND settings IS NOT NULL
      AND COALESCE((settings::jsonb)->'offboarding'->>'status', '') = 'requested'
      AND NULLIF((settings::jsonb)->'offboarding'->>'graceUntil', '') IS NOT NULL
      AND ((settings::jsonb)->'offboarding'->>'graceUntil')::timestamptz < NOW()
    ORDER BY ((settings::jsonb)->'offboarding'->>'graceUntil')::timestamptz ASC
    LIMIT :lim
  `, { replacements: { lim: Math.min(200, Math.max(1, limit)) } });

  const list = rows || [];
  const slugs: string[] = [];
  for (const row of list) {
    const settings = typeof row.settings === 'string'
      ? JSON.parse(row.settings || '{}')
      : (row.settings || {});
    settings.offboarding = {
      ...(settings.offboarding || {}),
      status: 'purged',
      purgedAt: new Date().toISOString(),
    };
    await sequelize.query(
      `UPDATE tenants
       SET status = 'archived',
           settings = CAST(:settings AS jsonb),
           ${cols.has('is_active') ? 'is_active = false,' : ''}
           updated_at = NOW()
       WHERE id = :id`,
      { replacements: { id: row.id, settings: JSON.stringify(settings) } },
    );
    if (row.slug) slugs.push(row.slug);
  }
  return { matched: list.length, purged: list.length, slugs };
}

/**
 * Hard-delete archived tenants past retention (default 30 days after purgedAt).
 * Requires confirm=true or HARD_DELETE_CONFIRM=true.
 */
export async function hardDeletePurgedTenants(opts?: {
  retentionDays?: number;
  limit?: number;
  confirm?: boolean;
}): Promise<{
  matched: number;
  deleted: number;
  dryRun: boolean;
  slugs: string[];
}> {
  if (!sequelize) return { matched: 0, deleted: 0, dryRun: true, slugs: [] };
  const days = Math.max(1, opts?.retentionDays ?? Number(process.env.HARD_DELETE_DAYS || 30));
  const lim = Math.min(50, Math.max(1, opts?.limit ?? 20));
  const confirm = opts?.confirm === true || String(process.env.HARD_DELETE_CONFIRM || '').toLowerCase() === 'true';

  const [rows] = await sequelize.query(`
    SELECT id, slug
    FROM tenants
    WHERE COALESCE(status::text, '') = 'archived'
      AND settings IS NOT NULL
      AND COALESCE((settings::jsonb)->'offboarding'->>'status', '') = 'purged'
      AND NULLIF((settings::jsonb)->'offboarding'->>'purgedAt', '') IS NOT NULL
      AND ((settings::jsonb)->'offboarding'->>'purgedAt')::timestamptz
          < NOW() - (:days || ' days')::interval
    ORDER BY ((settings::jsonb)->'offboarding'->>'purgedAt')::timestamptz ASC
    LIMIT :lim
  `, { replacements: { days: String(days), lim } });

  const list = rows || [];
  const slugs: string[] = [];
  if (!confirm) {
    return { matched: list.length, deleted: 0, dryRun: true, slugs: list.map((r: any) => r.slug).filter(Boolean) };
  }

  const tables = [
    'saas_notifications', 'saas_invitations', 'saas_api_keys', 'saas_outbound_webhooks',
    'saas_admin_audit', 'leave_requests', 'employees', 'users',
  ];
  for (const row of list) {
    for (const table of tables) {
      try {
        await sequelize.query(`DELETE FROM ${table} WHERE tenant_id = :tid`, {
          replacements: { tid: row.id },
        });
      } catch { /* table may not exist */ }
    }
    await sequelize.query(`DELETE FROM tenants WHERE id = :tid`, { replacements: { tid: row.id } });
    if (row.slug) slugs.push(row.slug);
  }
  return { matched: list.length, deleted: list.length, dryRun: false, slugs };
}

