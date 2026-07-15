/**
 * Humanify SaaS Phase 9 — account health & lifecycle alerts
 *
 * Pure `buildAccountAlerts(signals)` so callers that already computed the
 * signals (e.g. saas-context) can derive alerts with zero extra queries,
 * plus `getAccountAlerts(tenantId)` that gathers signals on its own.
 */
import {
  normalizeHumanifyPlan,
  type HumanifyPlanId,
} from './plan-entitlements';
import { getSeatUsage, type SeatUsage } from './seat-metering';
import { isTenantEmailVerified } from './email-verify';
import { getGoLiveStatus } from './go-live';
import { getTenantColumns } from './tenant-schema';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AccountAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface AccountAlertSignals {
  planId: HumanifyPlanId;
  status?: string | null;
  subscriptionEnd?: string | Date | null;
  trialEndsAt?: string | Date | null;
  daysLeftInTrial?: number | null;
  seats?: Pick<
    SeatUsage,
    'overLimit' | 'nearLimit' | 'employees' | 'maxEmployees' | 'users' | 'maxUsers'
  > | null;
  emailVerified?: boolean;
  goLivePct?: number | null;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function toMillis(value?: string | Date | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Derive ranked alerts from already-known account signals (no DB access). */
export function buildAccountAlerts(signals: AccountAlertSignals): AccountAlert[] {
  const alerts: AccountAlert[] = [];
  const now = Date.now();
  const status = String(signals.status || '').toLowerCase();
  const isPaid = signals.planId !== 'trial';
  const subEnd = toMillis(signals.subscriptionEnd);
  const trialEnd = toMillis(signals.trialEndsAt);

  if (status === 'suspended') {
    alerts.push({
      id: 'subscription_suspended',
      severity: 'critical',
      title: 'Akun ditangguhkan',
      message: 'Langganan Anda ditangguhkan. Aktifkan kembali untuk memulihkan akses penuh.',
      actionLabel: 'Aktifkan paket',
      actionHref: '/humanify/billing',
    });
  }

  if (isPaid && status !== 'suspended' && subEnd !== null && subEnd < now) {
    alerts.push({
      id: 'subscription_overdue',
      severity: 'critical',
      title: 'Langganan jatuh tempo',
      message: 'Masa aktif paket berbayar telah berakhir. Perpanjang untuk menghindari penangguhan.',
      actionLabel: 'Perpanjang',
      actionHref: '/humanify/billing',
    });
  }

  if (!isPaid && status !== 'suspended' && trialEnd !== null && trialEnd < now) {
    alerts.push({
      id: 'trial_expired',
      severity: 'critical',
      title: 'Masa trial berakhir',
      message: 'Trial Anda sudah habis. Pilih paket berbayar untuk melanjutkan layanan.',
      actionLabel: 'Pilih paket',
      actionHref: '/humanify/billing',
    });
  } else if (
    !isPaid &&
    status !== 'suspended' &&
    typeof signals.daysLeftInTrial === 'number' &&
    signals.daysLeftInTrial >= 0 &&
    signals.daysLeftInTrial <= 3
  ) {
    const d = signals.daysLeftInTrial;
    alerts.push({
      id: 'trial_ending',
      severity: 'warning',
      title: `Trial berakhir ${d === 0 ? 'hari ini' : `dalam ${d} hari`}`,
      message: 'Upgrade sebelum trial habis agar layanan tidak terputus.',
      actionLabel: 'Upgrade',
      actionHref: '/humanify/billing',
    });
  }

  if (signals.seats?.overLimit) {
    const s = signals.seats;
    alerts.push({
      id: 'seats_over',
      severity: 'critical',
      title: 'Kuota paket penuh',
      message: `Karyawan ${s.employees}/${s.maxEmployees} · user ${s.users}/${s.maxUsers}. Upgrade untuk menambah kapasitas.`,
      actionLabel: 'Upgrade paket',
      actionHref: '/humanify/billing',
    });
  } else if (signals.seats?.nearLimit) {
    const s = signals.seats;
    alerts.push({
      id: 'seats_near',
      severity: 'warning',
      title: 'Kuota hampir penuh',
      message: `Karyawan ${s.employees}/${s.maxEmployees} · user ${s.users}/${s.maxUsers}. Pertimbangkan upgrade paket.`,
      actionLabel: 'Lihat paket',
      actionHref: '/humanify/billing',
    });
  }

  if (signals.emailVerified === false) {
    alerts.push({
      id: 'email_unverified',
      severity: 'warning',
      title: 'Email belum terverifikasi',
      message: 'Verifikasi email pemilik untuk mengamankan akun dan menerima notifikasi penting.',
      actionLabel: 'Verifikasi',
      actionHref: '/humanify/verify-email',
    });
  }

  if (typeof signals.goLivePct === 'number' && signals.goLivePct >= 0 && signals.goLivePct < 100) {
    alerts.push({
      id: 'go_live_incomplete',
      severity: 'info',
      title: `Setup ${signals.goLivePct}% selesai`,
      message: 'Selesaikan checklist go-live untuk mengaktifkan seluruh alur HRIS.',
      actionLabel: 'Lanjutkan setup',
      actionHref: '/humanify/go-live',
    });
  }

  return alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

export function summarizeAlerts(alerts: AccountAlert[]) {
  return {
    total: alerts.length,
    critical: alerts.filter((a) => a.severity === 'critical').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  };
}

/** Schema-safe read of the billing-relevant tenant columns. */
async function readTenantAccountRow(tenantId: string): Promise<{
  status: string | null;
  subscriptionPlan: string | null;
  subscriptionEnd: string | null;
  trialEndsAt: string | null;
  daysLeftInTrial: number | null;
}> {
  const empty = {
    status: null,
    subscriptionPlan: null,
    subscriptionEnd: null,
    trialEndsAt: null,
    daysLeftInTrial: null,
  };
  if (!sequelize) return empty;
  try {
    const cols = await getTenantColumns();
    const select: string[] = [
      cols.has('status') ? 'status' : `NULL AS status`,
      cols.has('subscription_plan') ? 'subscription_plan' : `NULL AS subscription_plan`,
      cols.has('subscription_end') ? 'subscription_end' : `NULL AS subscription_end`,
      cols.has('trial_ends_at') ? 'trial_ends_at' : `NULL AS trial_ends_at`,
      cols.has('trial_ends_at')
        ? 'EXTRACT(DAY FROM (trial_ends_at - NOW()))::int AS days_left'
        : `NULL AS days_left`,
    ];
    const [rows] = await sequelize.query(
      `SELECT ${select.join(', ')} FROM tenants WHERE id = :id LIMIT 1`,
      { replacements: { id: tenantId } },
    );
    const r = rows?.[0];
    if (!r) return empty;
    return {
      status: r.status ?? null,
      subscriptionPlan: r.subscription_plan ?? null,
      subscriptionEnd: r.subscription_end ?? null,
      trialEndsAt: r.trial_ends_at ?? null,
      daysLeftInTrial: typeof r.days_left === 'number' ? r.days_left : null,
    };
  } catch {
    return empty;
  }
}

/** Gather live signals for a tenant then build alerts. */
export async function getAccountAlerts(
  tenantId: string,
  planRaw?: string | null,
): Promise<AccountAlert[]> {
  if (!tenantId) return [];
  const row = await readTenantAccountRow(tenantId);
  const planId = normalizeHumanifyPlan(planRaw ?? row.subscriptionPlan);

  let seats: SeatUsage | null = null;
  try { seats = await getSeatUsage(tenantId, planId); } catch { /* */ }

  let emailVerified = true;
  try { emailVerified = await isTenantEmailVerified(tenantId); } catch { /* */ }

  let goLivePct: number | null = null;
  try { goLivePct = (await getGoLiveStatus(tenantId)).pct; } catch { /* */ }

  return buildAccountAlerts({
    planId,
    status: row.status,
    subscriptionEnd: row.subscriptionEnd,
    trialEndsAt: row.trialEndsAt,
    daysLeftInTrial: row.daysLeftInTrial,
    seats,
    emailVerified,
    goLivePct,
  });
}
