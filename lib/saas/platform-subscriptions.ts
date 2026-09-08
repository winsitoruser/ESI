/**
 * Admin Total — subscription inventory + trial extension.
 */
import { logAdminAction } from '@/lib/saas/admin-audit';
import { HUMANIFY_PLANS, normalizeHumanifyPlan } from '@/lib/saas/plan-entitlements';
import { QA_TENANT_SLUG_REGEX } from '@/lib/saas/partners';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type SubscriptionRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  planName: string;
  mrrIdr: number;
  userCount: number;
  trialEndsAt: string | null;
  daysLeft: number | null;
  createdAt: string | null;
  risk: 'ok' | 'renewal' | 'churn';
};

async function tenantCols(): Promise<Set<string>> {
  const [cols] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'tenants' AND table_schema = 'public'
  `);
  return new Set((cols || []).map((c: any) => c.column_name));
}

export async function listSubscriptions(): Promise<{
  rows: SubscriptionRow[];
  counts: { active: number; trial: number; renewal14: number; churnRisk: number };
}> {
  if (!sequelize) return { rows: [], counts: { active: 0, trial: 0, renewal14: 0, churnRisk: 0 } };
  const cols = await tenantCols();
  const nameParts = [
    cols.has('business_name') ? 't.business_name' : null,
    cols.has('name') ? 't.name' : null,
    `t.slug`,
  ].filter(Boolean);
  const trialCol = cols.has('trial_ends_at') ? 't.trial_ends_at' : 'NULL';
  const [rows] = await sequelize.query(`
    SELECT t.id, t.slug, t.status,
      ${cols.has('subscription_plan') ? 't.subscription_plan' : `NULL AS subscription_plan`},
      COALESCE(${nameParts.join(', ')}) AS name,
      t.created_at,
      ${trialCol} AS trial_ends_at,
      ${cols.has('trial_ends_at') ? 'EXTRACT(DAY FROM (t.trial_ends_at - NOW()))::int' : 'NULL'} AS days_left,
      (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id) AS user_count
    FROM tenants t
    WHERE COALESCE(t.status::text, 'trial') <> 'archived'
      AND COALESCE(t.slug, '') !~* :qaRegex
    ORDER BY t.created_at DESC NULLS LAST
    LIMIT 200
  `, { replacements: { qaRegex: QA_TENANT_SLUG_REGEX } });

  const mapped: SubscriptionRow[] = (rows || []).map((r: any) => {
    const plan = normalizeHumanifyPlan(r.subscription_plan);
    const status = String(r.status || 'trial').toLowerCase();
    const daysLeft = r.days_left == null ? null : Number(r.days_left);
    let risk: SubscriptionRow['risk'] = 'ok';
    if (status === 'trial' && daysLeft != null && daysLeft <= 14) risk = 'renewal';
    if (status === 'trial' && daysLeft != null && daysLeft <= 3) risk = 'churn';
    if (status === 'suspended') risk = 'churn';
    return {
      id: String(r.id),
      name: r.name || 'Tenant',
      slug: r.slug || '—',
      status,
      plan,
      planName: HUMANIFY_PLANS[plan]?.name || plan,
      mrrIdr: status === 'suspended' ? 0 : HUMANIFY_PLANS[plan]?.priceMonthlyIdr || 0,
      userCount: Number(r.user_count || 0),
      trialEndsAt: r.trial_ends_at || null,
      daysLeft,
      createdAt: r.created_at || null,
      risk,
    };
  });

  return {
    rows: mapped,
    counts: {
      active: mapped.filter((r) => r.status === 'active').length,
      trial: mapped.filter((r) => r.status === 'trial').length,
      renewal14: mapped.filter((r) => r.risk === 'renewal' || (r.risk === 'churn' && r.status === 'trial')).length,
      churnRisk: mapped.filter((r) => r.risk === 'churn').length,
    },
  };
}

export async function extendTenantTrial(opts: {
  tenantId: string;
  days: number;
  actorEmail?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<{ id: string; trialEndsAt: string | null }> {
  if (!sequelize) throw new Error('Database unavailable');
  const id = String(opts.tenantId || '').trim();
  const days = Math.min(90, Math.max(1, Number(opts.days) || 14));
  if (!id) throw new Error('tenantId required');
  const cols = await tenantCols();
  if (!cols.has('trial_ends_at')) throw new Error('Kolom trial_ends_at tidak tersedia');
  await sequelize.query(`
    UPDATE tenants SET
      trial_ends_at = COALESCE(GREATEST(trial_ends_at, NOW()), NOW()) + (:days)::int * INTERVAL '1 day',
      updated_at = NOW()
    WHERE id = :id
  `, { replacements: { id, days } });
  const [rows] = await sequelize.query(
    `SELECT trial_ends_at FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id } },
  );
  await logAdminAction({
    tenantId: id,
    actorUserId: opts.actorUserId || null,
    actorEmail: opts.actorEmail || null,
    action: 'subscription.extend_trial',
    resourceType: 'tenant',
    resourceId: id,
    meta: { days },
    ip: opts.ip || null,
  });
  return { id, trialEndsAt: rows?.[0]?.trial_ends_at || null };
}

export function overviewPeriodBounds(period: string, from?: string, to?: string): {
  from: Date;
  to: Date;
  label: string;
  key: string;
} {
  const now = new Date();
  const end = to ? new Date(to) : now;
  if (from) {
    const start = new Date(from);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return { from: start, to: end, label: 'Kustom', key: 'custom' };
    }
  }
  const key = String(period || '30d').toLowerCase();
  const start = new Date(now);
  if (key === 'today' || key === '1d') {
    start.setHours(0, 0, 0, 0);
    return { from: start, to: now, label: 'Hari ini', key: 'today' };
  }
  if (key === '7d' || key === 'week') {
    start.setDate(start.getDate() - 7);
    return { from: start, to: now, label: '7 hari', key: '7d' };
  }
  if (key === '90d' || key === 'quarter') {
    start.setDate(start.getDate() - 90);
    return { from: start, to: now, label: 'Kuartal', key: '90d' };
  }
  if (key === 'ytd' || key === 'year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: now, label: 'Tahun ini', key: 'ytd' };
  }
  start.setDate(start.getDate() - 30);
  return { from: start, to: now, label: '30 hari', key: '30d' };
}
