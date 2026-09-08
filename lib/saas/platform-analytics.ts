/**
 * Admin Total — business analytics / reporting (spec §19).
 */
import { QA_TENANT_SLUG_REGEX } from '@/lib/saas/partners';
import { overviewPeriodBounds } from '@/lib/saas/platform-subscriptions';
import { estimateMrrFromTenants } from '@/lib/saas/platform-metrics';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type AnalyticsReport = {
  period: { key: string; label: string; from: string; to: string };
  customers: { total: number; newInPeriod: number; paid: number; trial: number; suspended: number };
  users: { total: number; newInPeriod: number };
  finance: { revenueIdr: number; paidOrders: number; pendingOrders: number; refundedIdr: number };
  rates: { conversionPct: number; churnPct: number; arpuIdr: number };
};

export function computeConversionPct(paid: number, signups: number): number {
  if (signups <= 0) return 0;
  return Math.round((paid / signups) * 1000) / 10;
}

export function computeArpu(revenueIdr: number, payingCustomers: number): number {
  if (payingCustomers <= 0) return 0;
  return Math.round(revenueIdr / payingCustomers);
}

export function computeChurnPct(suspended: number, base: number): number {
  if (base <= 0) return 0;
  return Math.round((suspended / base) * 1000) / 10;
}

export async function getAnalyticsReport(period = '30d', from = '', to = ''): Promise<AnalyticsReport> {
  const bounds = overviewPeriodBounds(period, from, to);
  const empty: AnalyticsReport = {
    period: { key: bounds.key, label: bounds.label, from: bounds.from.toISOString(), to: bounds.to.toISOString() },
    customers: { total: 0, newInPeriod: 0, paid: 0, trial: 0, suspended: 0 },
    users: { total: 0, newInPeriod: 0 },
    finance: { revenueIdr: 0, paidOrders: 0, pendingOrders: 0, refundedIdr: 0 },
    rates: { conversionPct: 0, churnPct: 0, arpuIdr: 0 },
  };
  if (!sequelize) return empty;

  const [cust] = await sequelize.query(`
    SELECT
      COUNT(*) FILTER (WHERE COALESCE(status::text, 'trial') <> 'archived' AND COALESCE(slug, '') !~* :qaRegex)::int AS total,
      COUNT(*) FILTER (WHERE created_at >= :fromTs AND created_at <= :toTs AND COALESCE(slug, '') !~* :qaRegex)::int AS new_in_period,
      COUNT(*) FILTER (WHERE COALESCE(status::text, 'trial') = 'active' AND COALESCE(slug, '') !~* :qaRegex)::int AS paid,
      COUNT(*) FILTER (WHERE COALESCE(status::text, 'trial') = 'trial' AND COALESCE(slug, '') !~* :qaRegex)::int AS trial,
      COUNT(*) FILTER (WHERE status::text = 'suspended' AND COALESCE(slug, '') !~* :qaRegex)::int AS suspended
    FROM tenants
  `, { replacements: { fromTs: bounds.from, toTs: bounds.to, qaRegex: QA_TENANT_SLUG_REGEX } });

  let users = { total: 0, newInPeriod: 0 };
  try {
    const [u] = await sequelize.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at >= :fromTs AND created_at <= :toTs)::int AS new_in_period
      FROM users
    `, { replacements: { fromTs: bounds.from, toTs: bounds.to } });
    users = { total: u?.[0]?.total || 0, newInPeriod: u?.[0]?.new_in_period || 0 };
  } catch { /* */ }

  let finance = { revenueIdr: 0, paidOrders: 0, pendingOrders: 0, refundedIdr: 0 };
  try {
    const [f] = await sequelize.query(`
      SELECT
        COALESCE(SUM(amount_idr) FILTER (WHERE LOWER(status) = 'paid'
          AND COALESCE(paid_at, created_at) >= :fromTs
          AND COALESCE(paid_at, created_at) <= :toTs), 0)::bigint AS revenue_idr,
        COUNT(*) FILTER (WHERE LOWER(status) = 'paid'
          AND COALESCE(paid_at, created_at) >= :fromTs
          AND COALESCE(paid_at, created_at) <= :toTs)::int AS paid_orders,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('pending', 'unpaid', 'challenge'))::int AS pending_orders,
        COALESCE(SUM(amount_idr) FILTER (WHERE LOWER(status) = 'refunded'), 0)::bigint AS refunded_idr
      FROM saas_billing_orders
    `, { replacements: { fromTs: bounds.from, toTs: bounds.to } });
    finance = {
      revenueIdr: Number(f?.[0]?.revenue_idr || 0),
      paidOrders: f?.[0]?.paid_orders || 0,
      pendingOrders: f?.[0]?.pending_orders || 0,
      refundedIdr: Number(f?.[0]?.refunded_idr || 0),
    };
  } catch { /* */ }

  const paid = cust?.[0]?.paid || 0;
  const trial = cust?.[0]?.trial || 0;
  const newInPeriod = cust?.[0]?.new_in_period || 0;
  const suspended = cust?.[0]?.suspended || 0;
  const total = cust?.[0]?.total || 0;

  let arpuIdr = computeArpu(finance.revenueIdr, paid);
  if (!arpuIdr && paid) {
    try {
      const [plans] = await sequelize.query(`
        SELECT t.status, t.subscription_plan
        FROM tenants t
        WHERE COALESCE(t.status::text, 'trial') = 'active'
          AND COALESCE(t.slug, '') !~* :qaRegex
      `, { replacements: { qaRegex: QA_TENANT_SLUG_REGEX } });
      const est = estimateMrrFromTenants(plans || []);
      arpuIdr = computeArpu(est.mrrIdr || 0, paid);
    } catch { /* list-price fallback skipped if column missing */ }
  }

  return {
    period: empty.period,
    customers: { total, newInPeriod, paid, trial, suspended },
    users,
    finance,
    rates: {
      conversionPct: computeConversionPct(paid, Math.max(newInPeriod, paid + trial)),
      churnPct: computeChurnPct(suspended, Math.max(1, total)),
      arpuIdr,
    },
  };
}
