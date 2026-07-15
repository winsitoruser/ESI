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
