/**
 * Humanify SaaS Phase 7 — go-live checklist (computed from live signals)
 */
import { isSaasOnboardingComplete } from './humanify-onboarding';
import { countTenantSeats } from './seat-metering';
import { resolveTenantById } from './tenant-slug';
import { isTenantEmailVerified } from './email-verify';
import { parseTenantSettings } from './tenant-schema';
import { getTenantColumns } from './tenant-schema';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type GoLiveItemId =
  | 'email_verified'
  | 'setup_wizard'
  | 'first_employee'
  | 'careers_ready'
  | 'billing_aware'
  | 'asset_inventory';

export interface GoLiveItem {
  id: GoLiveItemId;
  title: string;
  done: boolean;
  href: string;
  hint?: string;
}

export interface GoLiveStatus {
  score: number;
  total: number;
  pct: number;
  ready: boolean;
  items: GoLiveItem[];
  careersUrl: string | null;
  subdomainHint: string | null;
}

async function hasOpenJobs(tenantId: string): Promise<boolean> {
  if (!sequelize) return false;
  try {
    const [rows] = await sequelize.query(`
      SELECT 1 FROM hris_job_openings
      WHERE tenant_id = :tid AND status = 'open'
      LIMIT 1
    `, { replacements: { tid: tenantId } });
    return Boolean(rows?.length);
  } catch {
    return false;
  }
}

async function hasAssetInventory(tenantId: string): Promise<boolean> {
  if (!sequelize) return false;
  try {
    const [rows] = await sequelize.query(
      `SELECT 1 FROM hris_assets WHERE tenant_id = :tid LIMIT 1`,
      { replacements: { tid: tenantId } },
    );
    return Boolean(rows?.length);
  } catch {
    return false;
  }
}

export async function getGoLiveStatus(tenantId: string): Promise<GoLiveStatus> {
  const tenant = await resolveTenantById(tenantId);
  const seats = await countTenantSeats(tenantId);
  const emailOk = await isTenantEmailVerified(tenantId);
  const setupOk = await isSaasOnboardingComplete(tenantId);
  const jobsOk = await hasOpenJobs(tenantId);
  const careersReady = Boolean(tenant?.slug);
  const assetsOk = await hasAssetInventory(tenantId);

  let billingAware = false;
  try {
    const cols = await getTenantColumns();
    if (cols.has('settings')) {
      const [rows] = await sequelize.query(
        `SELECT settings, subscription_plan FROM tenants WHERE id = :id LIMIT 1`,
        { replacements: { id: tenantId } },
      );
      const settings = parseTenantSettings(rows?.[0]?.settings);
      billingAware = Boolean(settings.go_live?.billingAcknowledged)
        || (rows?.[0]?.subscription_plan && String(rows[0].subscription_plan).toLowerCase() !== 'trial');
    }
  } catch { /* */ }

  const items: GoLiveItem[] = [
    {
      id: 'email_verified',
      title: 'Email pemilik terverifikasi',
      done: emailOk,
      href: '/humanify/verify-email',
      hint: 'Cek inbox atau minta ulang link verifikasi',
    },
    {
      id: 'setup_wizard',
      title: 'Setup wizard selesai',
      done: setupOk,
      href: '/humanify/setup',
    },
    {
      id: 'first_employee',
      title: 'Minimal 1 karyawan aktif',
      done: seats.employees >= 1,
      href: '/humanify/employees',
    },
    {
      id: 'asset_inventory',
      title: 'Inventori aset (disarankan untuk onboarding)',
      done: assetsOk,
      href: '/humanify/assets',
      hint: assetsOk
        ? 'Ada aset di inventori tenant'
        : 'Tambah laptop/HP/ID di Manajemen Aset sebelum serah terima onboarding',
    },
    {
      id: 'careers_ready',
      title: 'Portal karir siap (slug + lowongan opsional)',
      done: careersReady,
      href: tenant?.slug ? `/c/${tenant.slug}/careers` : '/humanify/recruitment',
      hint: jobsOk ? 'Ada lowongan terbuka' : 'Slug siap — tambah lowongan di Rekrutmen',
    },
    {
      id: 'billing_aware',
      title: 'Pahami trial / paket berbayar',
      done: billingAware,
      href: '/humanify/billing',
    },
  ];

  const score = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((score / total) * 100);
  // Core 4 (email, setup, employee, billing) enough to operate; assets/careers recommended
  const coreIds = new Set(['email_verified', 'setup_wizard', 'first_employee', 'billing_aware']);
  const coreDone = items.filter((i) => coreIds.has(i.id) && i.done).length;

  return {
    score,
    total,
    pct,
    ready: coreDone >= 3,
    items,
    careersUrl: tenant?.slug ? `/c/${tenant.slug}/careers` : null,
    subdomainHint: tenant?.slug ? `https://${tenant.slug}.humanify.id` : null,
  };
}

export async function acknowledgeBillingGoLive(tenantId: string): Promise<GoLiveStatus> {
  if (!sequelize) throw new Error('Database unavailable');
  const cols = await getTenantColumns();
  if (!cols.has('settings')) throw new Error('settings column missing');
  const [rows] = await sequelize.query(
    `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  const settings = parseTenantSettings(rows?.[0]?.settings);
  settings.go_live = {
    ...(settings.go_live || {}),
    billingAcknowledged: true,
    billingAcknowledgedAt: new Date().toISOString(),
  };
  await sequelize.query(
    `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
    { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
  );
  return getGoLiveStatus(tenantId);
}
