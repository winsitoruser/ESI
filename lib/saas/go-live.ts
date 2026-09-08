/**
 * Humanify SaaS Phase 7 — go-live checklist (computed from live signals)
 */
import { isSaasOnboardingComplete } from './humanify-onboarding';
import { countTenantSeats } from './seat-metering';
import { resolveTenantById } from './tenant-slug';
import { isTenantEmailVerified } from './email-verify';
import { parseTenantSettings } from './tenant-schema';
import { getTenantColumns } from './tenant-schema';
import { safeQueryWithSavepoint, withDbSavepoint } from './tenant-request-bound';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type GoLiveItemId =
  | 'email_verified'
  | 'setup_wizard'
  | 'first_employee'
  | 'careers_ready'
  | 'billing_aware'
  | 'asset_inventory'
  | 'attendance_ready'
  | 'leave_ready'
  | 'payroll_ready';

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

export function careersChecklistHref(slug: string | null | undefined, jobsOk: boolean): string {
  if (!jobsOk) return '/humanify/recruitment?create=1';
  return slug ? `/c/${encodeURIComponent(slug)}/careers` : '/humanify/recruitment';
}

async function hasCareerJobs(tenantId: string): Promise<boolean> {
  if (!sequelize) return false;
  const rows = await safeQueryWithSavepoint(
    sequelize,
    `SELECT 1 FROM hris_job_openings WHERE tenant_id = :tid LIMIT 1`,
    { tid: tenantId },
    'golive_jobs_any',
  );
  return Boolean(rows?.length);
}

async function hasAssetInventory(tenantId: string, flags: Record<string, any>): Promise<boolean> {
  if (flags.assetsConfigured || flags.completed) return true;
  if (!sequelize) return false;
  const rows = await safeQueryWithSavepoint(
    sequelize,
    `SELECT 1 FROM hris_assets WHERE tenant_id = :tid LIMIT 1`,
    { tid: tenantId },
    'golive_assets',
  );
  return Boolean(rows?.length);
}

async function probeTenantRow(sql: string, tenantId: string, label: string): Promise<boolean> {
  if (!sequelize) return false;
  const rows = await safeQueryWithSavepoint(sequelize, sql, { tid: tenantId }, label);
  return Boolean(rows?.length);
}

function goLiveFlags(settings: Record<string, any>): Record<string, any> {
  const raw = settings?.go_live;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

export type GoLiveFlag =
  | 'billingAcknowledged'
  | 'attendanceConfigured'
  | 'leaveConfigured'
  | 'payrollConfigured'
  | 'careersConfigured'
  | 'assetsConfigured'
  | 'completed';

export const GO_LIVE_ACK_FLAGS: GoLiveFlag[] = [
  'billingAcknowledged',
  'attendanceConfigured',
  'leaveConfigured',
  'payrollConfigured',
  'careersConfigured',
  'assetsConfigured',
  'completed',
];

/** Persist a Day-1 checklist flag on tenants.settings.go_live (json merge, TX-safe). */
export async function markGoLiveFlag(tenantId: string, flag: GoLiveFlag): Promise<void> {
  if (!sequelize || !tenantId) return;
  const cols = await getTenantColumns();
  if (!cols.has('settings')) return;
  const patch: Record<string, unknown> = {
    [flag]: true,
    [`${flag}At`]: new Date().toISOString(),
  };
  const setUpdated = cols.has('updated_at') ? ', updated_at = NOW()' : '';

  const merged = await withDbSavepoint(sequelize, async () => {
    // settings may be json OR jsonb on lean VPS schemas — always operate via ::jsonb.
    await sequelize.query(
      `UPDATE tenants
       SET settings = (
         COALESCE(settings::jsonb, '{}'::jsonb)
         || jsonb_build_object(
           'go_live',
           CASE
             WHEN jsonb_typeof(COALESCE(settings::jsonb->'go_live', '{}'::jsonb)) = 'object'
             THEN COALESCE(settings::jsonb->'go_live', '{}'::jsonb)
             ELSE '{}'::jsonb
           END || CAST(:patch AS jsonb)
         )
       )${setUpdated}
       WHERE id = :id`,
      { replacements: { id: tenantId, patch: JSON.stringify(patch) } },
    );
    return true;
  }, 'golive_flag');

  if (merged) return;

  await withDbSavepoint(sequelize, async () => {
    const [rows] = await sequelize.query(
      `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
      { replacements: { id: tenantId } },
    );
    const settings = parseTenantSettings(rows?.[0]?.settings);
    const existing = goLiveFlags(settings);
    settings.go_live = { ...existing, ...patch };
    await sequelize.query(
      `UPDATE tenants SET settings = CAST(:settings AS jsonb)${setUpdated} WHERE id = :id`,
      { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
    );
  }, 'golive_flag_fallback');
}

export async function markGoLiveFlagSafe(tenantId: string | null | undefined, flag: GoLiveFlag): Promise<void> {
  if (!tenantId) return;
  try {
    await markGoLiveFlag(String(tenantId), flag);
  } catch {
    /* checklist must never block the real save */
  }
}

async function hasAttendanceReady(tenantId: string, flags: Record<string, any>): Promise<boolean> {
  if (flags.attendanceConfigured || flags.completed) return true;
  if (!sequelize) return false;
  if (await probeTenantRow(
    `SELECT 1 FROM employee_attendance ea
     JOIN employees e ON ea.employee_id::text = e.id::text
     WHERE e.tenant_id = :tid LIMIT 1`,
    tenantId,
    'golive_att_ea',
  )) return true;
  if (await probeTenantRow(
    `SELECT 1 FROM employee_attendances ea
     JOIN employees e ON ea.employee_id::text = e.id::text
     WHERE e.tenant_id = :tid LIMIT 1`,
    tenantId,
    'golive_att_eas',
  )) return true;
  if (await probeTenantRow(
    `SELECT 1 FROM attendance_settings WHERE tenant_id = :tid LIMIT 1`,
    tenantId,
    'golive_att_settings',
  )) return true;
  if (await probeTenantRow(
    `SELECT 1 FROM work_shifts WHERE tenant_id = :tid LIMIT 1`,
    tenantId,
    'golive_att_shifts',
  )) return true;
  if (await probeTenantRow(
    `SELECT 1 FROM geofence_locations WHERE tenant_id = :tid LIMIT 1`,
    tenantId,
    'golive_att_geo',
  )) return true;
  return probeTenantRow(
    `SELECT 1 FROM hris_settings WHERE tenant_id = :tid
     AND setting_key IN ('attendance','geofence','shift','shifts','policy')
     LIMIT 1`,
    tenantId,
    'golive_att_hris',
  );
}

async function hasLeaveReady(tenantId: string, flags: Record<string, any>): Promise<boolean> {
  if (flags.leaveConfigured || flags.completed) return true;
  if (!sequelize) return false;
  // Seeded leave_types must not auto-complete Day-1 — require a request, approval flow, or saved config
  if (await probeTenantRow(
    `SELECT 1 FROM leave_requests WHERE tenant_id = :tid LIMIT 1`,
    tenantId,
    'golive_leave_req',
  )) return true;
  if (await probeTenantRow(
    `SELECT 1 FROM leave_approval_configs WHERE tenant_id = :tid LIMIT 1`,
    tenantId,
    'golive_leave_cfg',
  )) return true;
  return probeTenantRow(
    `SELECT 1 FROM leave_balances lb
     JOIN employees e ON lb.employee_id::text = e.id::text
     WHERE e.tenant_id = :tid OR lb.tenant_id = :tid
     LIMIT 1`,
    tenantId,
    'golive_leave_bal',
  );
}

async function hasPayrollReady(tenantId: string, flags: Record<string, any>): Promise<boolean> {
  if (flags.payrollConfigured || flags.completed) return true;
  if (!sequelize) return false;
  const runs = await safeQueryWithSavepoint(
    sequelize,
    `SELECT 1 FROM payroll_runs WHERE tenant_id = :tid LIMIT 1`,
    { tid: tenantId },
    'golive_payroll_runs',
  );
  if (runs?.length) return true;
  const salaries = await safeQueryWithSavepoint(
    sequelize,
    `SELECT 1 FROM employee_salaries es
     LEFT JOIN employees e ON es.employee_id::text = e.id::text
     WHERE es.tenant_id = :tid OR e.tenant_id = :tid
     LIMIT 1`,
    { tid: tenantId },
    'golive_payroll_sal',
  );
  if (salaries?.length) return true;
  const empSalary = await safeQueryWithSavepoint(
    sequelize,
    `SELECT 1 FROM employees
     WHERE tenant_id = :tid AND COALESCE(salary, 0) > 0
     LIMIT 1`,
    { tid: tenantId },
    'golive_payroll_emp',
  );
  return Boolean(empSalary?.length);
}

export async function getGoLiveStatus(tenantId: string): Promise<GoLiveStatus> {
  const tenant = await resolveTenantById(tenantId);
  const seats = await countTenantSeats(tenantId);
  const emailOk = await isTenantEmailVerified(tenantId);
  const setupOk = await isSaasOnboardingComplete(tenantId);
  let flags: Record<string, any> = {};
  let billingAware = false;
  try {
    const cols = await getTenantColumns();
    if (cols.has('settings')) {
      const rows = await safeQueryWithSavepoint(
        sequelize,
        `SELECT settings, subscription_plan FROM tenants WHERE id = :id LIMIT 1`,
        { id: tenantId },
        'golive_settings',
      );
      const settings = parseTenantSettings(rows?.[0]?.settings);
      flags = goLiveFlags(settings);
      billingAware = Boolean(flags.billingAcknowledged)
        || Boolean(flags.completed)
        || (rows?.[0]?.subscription_plan && String(rows[0].subscription_plan).toLowerCase() !== 'trial');
    }
  } catch { /* catalog / settings must not abort the checklist */ }

  const jobsOk = Boolean(flags.careersConfigured || flags.completed) || await hasCareerJobs(tenantId);
  const assetsOk = await hasAssetInventory(tenantId, flags);
  const attendanceOk = await hasAttendanceReady(tenantId, flags);
  const leaveOk = await hasLeaveReady(tenantId, flags);
  const payrollOk = await hasPayrollReady(tenantId, flags);

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
      title: 'Portal karir siap (slug + lowongan)',
      // Slug is auto-provisioned at signup — do not mark done until a job opening exists
      done: Boolean(tenant?.slug) && jobsOk,
      href: careersChecklistHref(tenant?.slug, jobsOk),
      hint: jobsOk
        ? 'Ada lowongan di portal karir'
        : tenant?.slug
          ? 'Slug siap — tambah lowongan di Rekrutmen agar misi ini selesai'
          : 'Lengkapi slug perusahaan lalu buat lowongan',
    },
    {
      id: 'billing_aware',
      title: 'Pahami trial / paket berbayar',
      done: billingAware,
      href: '/humanify/billing',
    },
    {
      id: 'attendance_ready',
      title: 'Absensi siap (data atau kebijakan)',
      done: attendanceOk,
      href: '/humanify/attendance/settings',
      hint: attendanceOk
        ? 'Ada absensi atau pengaturan shift/geofence'
        : 'Atur shift/geofence atau catat absensi pertama',
    },
    {
      id: 'leave_ready',
      title: 'Cuti siap (tipe atau pengajuan)',
      done: leaveOk,
      href: '/humanify/leave',
      hint: leaveOk ? 'Tipe cuti / alur approval / pengajuan ada' : 'Simpan tipe cuti, alur approval, atau buat pengajuan uji',
    },
    {
      id: 'payroll_ready',
      title: 'Payroll Day-1 (gaji karyawan atau run)',
      done: payrollOk,
      href: '/humanify/payroll',
      hint: payrollOk
        ? 'Ada salary master atau payroll run'
        : 'Isi gaji karyawan atau buat payroll run pertama (Growth+)',
    },
  ];

  if (flags.completed) {
    for (const item of items) item.done = true;
  }

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
    ready: flags.completed === true || coreDone >= 3,
    items,
    careersUrl: tenant?.slug ? `/c/${tenant.slug}/careers` : null,
    subdomainHint: tenant?.slug ? `https://${tenant.slug}.humanify.id` : null,
  };
}

export async function acknowledgeBillingGoLive(tenantId: string): Promise<GoLiveStatus> {
  return acknowledgeGoLiveFlag(tenantId, 'billingAcknowledged');
}

export async function acknowledgeGoLiveFlag(tenantId: string, flag: GoLiveFlag): Promise<GoLiveStatus> {
  if (!sequelize) throw new Error('Database unavailable');
  await markGoLiveFlag(tenantId, flag);
  if (flag === 'billingAcknowledged' || flag === 'completed') {
    try {
      const { recordFunnelEvent } = await import('./activation-funnel');
      await recordFunnelEvent(tenantId, 'go_live');
    } catch { /* funnel best-effort */ }
  }
  return getGoLiveStatus(tenantId);
}
