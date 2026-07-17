/**
 * Humanify SaaS Phase 3+ — estimated MRR / health (+ paid orders when available)
 */
import {
  HUMANIFY_PLANS,
  normalizeHumanifyPlan,
  type HumanifyPlanId,
} from './plan-entitlements';
import { QA_TENANT_SLUG_REGEX } from './partners';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export interface TenantMetricRow {
  id: string;
  slug?: string | null;
  name?: string | null;
  status?: string | null;
  subscription_plan?: string | null;
  setup_completed?: boolean | null;
  user_count?: number;
  employee_count?: number;
  created_at?: string | Date | null;
}

export function planListPriceIdr(planRaw: string | null | undefined): number {
  const id = normalizeHumanifyPlan(planRaw);
  return HUMANIFY_PLANS[id].priceMonthlyIdr;
}

/** Paid = not trial/free and status not suspended/inactive */
export function isPayingTenant(row: TenantMetricRow): boolean {
  const status = String(row.status || 'trial').toLowerCase();
  if (status === 'suspended' || status === 'inactive') return false;
  const plan = normalizeHumanifyPlan(row.subscription_plan);
  return plan !== 'trial' && HUMANIFY_PLANS[plan].priceMonthlyIdr > 0;
}

export function estimateMrrFromTenants(rows: TenantMetricRow[]): {
  mrrIdr: number;
  arrIdr: number;
  payingTenants: number;
  trialTenants: number;
  byPlan: Array<{ plan: HumanifyPlanId; count: number; mrrIdr: number }>;
} {
  const byPlanMap = new Map<HumanifyPlanId, { count: number; mrrIdr: number }>();
  for (const id of Object.keys(HUMANIFY_PLANS) as HumanifyPlanId[]) {
    byPlanMap.set(id, { count: 0, mrrIdr: 0 });
  }

  let mrrIdr = 0;
  let payingTenants = 0;
  let trialTenants = 0;

  for (const row of rows) {
    const plan = normalizeHumanifyPlan(row.subscription_plan);
    const bucket = byPlanMap.get(plan)!;
    bucket.count += 1;

    const status = String(row.status || 'trial').toLowerCase();
    if (plan === 'trial' || status === 'trial') trialTenants += 1;

    if (isPayingTenant(row)) {
      const price = HUMANIFY_PLANS[plan].priceMonthlyIdr;
      mrrIdr += price;
      bucket.mrrIdr += price;
      payingTenants += 1;
    }
  }

  const byPlan = (Object.keys(HUMANIFY_PLANS) as HumanifyPlanId[]).map((plan) => ({
    plan,
    count: byPlanMap.get(plan)!.count,
    mrrIdr: byPlanMap.get(plan)!.mrrIdr,
  }));

  return {
    mrrIdr,
    arrIdr: mrrIdr * 12,
    payingTenants,
    trialTenants,
    byPlan,
  };
}

/**
 * Live MRR from saas_billing_orders: newest paid order per tenant,
 * yearly amounts normalized to monthly (/12).
 */
export async function computePaidOrdersMrr(): Promise<{
  paidMrrIdr: number;
  paidTenantCount: number;
  paidOrdersCount: number;
  available: boolean;
}> {
  if (!sequelize) {
    return { paidMrrIdr: 0, paidTenantCount: 0, paidOrdersCount: 0, available: false };
  }
  try {
    const [exists] = await sequelize.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'saas_billing_orders' LIMIT 1
    `);
    if (!exists?.length) {
      return { paidMrrIdr: 0, paidTenantCount: 0, paidOrdersCount: 0, available: false };
    }

    const [rows] = await sequelize.query(`
      SELECT DISTINCT ON (b.tenant_id)
        b.tenant_id, b.amount_idr, b."interval", b.plan
      FROM saas_billing_orders b
      JOIN tenants t ON t.id = b.tenant_id
      WHERE b.status = 'paid'
        AND COALESCE(t.status::text, 'trial') <> 'archived'
        AND COALESCE(t.slug, '') !~* :qaRegex
      ORDER BY b.tenant_id, b.paid_at DESC NULLS LAST, b.created_at DESC
    `, { replacements: { qaRegex: QA_TENANT_SLUG_REGEX } });
    let paidMrrIdr = 0;
    for (const row of rows || []) {
      const amount = Number(row.amount_idr) || 0;
      paidMrrIdr += String(row.interval) === 'yearly' ? Math.round(amount / 12) : amount;
    }
    const [cnt] = await sequelize.query(`
      SELECT COUNT(*)::int AS c FROM saas_billing_orders WHERE status = 'paid'
    `);
    return {
      paidMrrIdr,
      paidTenantCount: (rows || []).length,
      paidOrdersCount: cnt?.[0]?.c || 0,
      available: true,
    };
  } catch {
    return { paidMrrIdr: 0, paidTenantCount: 0, paidOrdersCount: 0, available: false };
  }
}

/**
 * Simple health 0–100 for ops triage.
 * Not a security score — onboarding & engagement proxy.
 */
export function computeTenantHealth(row: TenantMetricRow): {
  score: number;
  label: 'healthy' | 'watch' | 'at_risk';
  factors: string[];
} {
  let score = 0;
  const factors: string[] = [];
  const status = String(row.status || 'trial').toLowerCase();

  if (status === 'active') {
    score += 25;
    factors.push('status:active');
  } else if (status === 'trial') {
    score += 15;
    factors.push('status:trial');
  } else if (status === 'suspended') {
    factors.push('status:suspended');
  }

  if (row.setup_completed) {
    score += 25;
    factors.push('setup:done');
  } else {
    factors.push('setup:pending');
  }

  const users = Number(row.user_count || 0);
  if (users > 0) {
    score += 15;
    factors.push(`users:${users}`);
  }

  const employees = Number(row.employee_count || 0);
  if (employees > 0) {
    score += 20;
    factors.push(`employees:${employees}`);
  } else {
    factors.push('employees:0');
  }

  if (row.slug) {
    score += 10;
    factors.push('slug:ok');
  }

  if (row.subscription_plan) {
    score += 5;
    factors.push(`plan:${row.subscription_plan}`);
  }

  score = Math.min(100, Math.max(0, score));
  const label = score >= 70 ? 'healthy' : score >= 40 ? 'watch' : 'at_risk';
  return { score, label, factors };
}

export function formatIdr(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n || 0);
}
