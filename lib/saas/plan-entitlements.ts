/**
 * Humanify SaaS Phase 2 — plan entitlement matrix (schema-safe)
 * Source of truth: tenants.subscription_plan string
 */

export type HumanifyPlanId = 'trial' | 'starter' | 'growth' | 'enterprise';

export type HumanifyFeature =
  | 'core'
  | 'attendance'
  | 'payroll'
  | 'recruitment'
  | 'lms'
  | 'analytics'
  | 'ai'
  | 'api'
  | 'white_label'
  | 'sso';

export interface HumanifyPlanDefinition {
  id: HumanifyPlanId;
  name: string;
  description: string;
  features: HumanifyFeature[];
  maxUsers: number;
  maxEmployees: number;
  trialDays?: number;
  /** List price IDR / month (estimated MRR until billing live) */
  priceMonthlyIdr: number;
}

export const HUMANIFY_PLANS: Record<HumanifyPlanId, HumanifyPlanDefinition> = {
  trial: {
    id: 'trial',
    name: 'Trial',
    description: '14 hari full access untuk evaluasi',
    features: ['core', 'attendance', 'payroll', 'recruitment', 'lms', 'analytics', 'ai', 'api', 'white_label', 'sso'],
    maxUsers: 25,
    maxEmployees: 100,
    trialDays: 14,
    priceMonthlyIdr: 0,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'HRIS inti: karyawan, absensi, rekrutmen',
    features: ['core', 'attendance', 'recruitment'],
    maxUsers: 10,
    maxEmployees: 50,
    priceMonthlyIdr: 499_000,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    description: 'Payroll + analytics untuk tim berkembang',
    features: ['core', 'attendance', 'recruitment', 'payroll', 'analytics'],
    maxUsers: 50,
    maxEmployees: 500,
    priceMonthlyIdr: 1_499_000,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Semua modul + API keys, white-label & SSO',
    features: ['core', 'attendance', 'payroll', 'recruitment', 'lms', 'analytics', 'ai', 'api', 'white_label', 'sso'],
    maxUsers: 500,
    maxEmployees: 10000,
    priceMonthlyIdr: 4_999_000,
  },
};

const PLAN_ALIASES: Record<string, HumanifyPlanId> = {
  trial: 'trial',
  free: 'trial',
  starter: 'starter',
  basic: 'starter',
  growth: 'growth',
  pro: 'growth',
  professional: 'growth',
  enterprise: 'enterprise',
  business: 'enterprise',
};

/** Map pathname → required feature (first match wins). */
const ROUTE_FEATURE_RULES: Array<{ test: RegExp; feature: HumanifyFeature }> = [
  { test: /^\/humanify\/payroll/, feature: 'payroll' },
  { test: /^\/humanify\/reimbursement/, feature: 'payroll' },
  { test: /^\/humanify\/casual-workforce/, feature: 'payroll' },
  { test: /^\/humanify\/lms/, feature: 'lms' },
  { test: /^\/humanify\/training/, feature: 'lms' },
  { test: /^\/humanify\/certificates/, feature: 'lms' },
  { test: /^\/humanify\/recruitment/, feature: 'recruitment' },
  { test: /^\/careers/, feature: 'recruitment' },
  { test: /^\/c\/[^/]+\/careers/, feature: 'recruitment' },
  { test: /^\/humanify\/ai/, feature: 'ai' },
  { test: /^\/humanify\/enterprise/, feature: 'api' },
  { test: /^\/humanify\/sso/, feature: 'sso' },
  { test: /^\/humanify\/hr-analytics/, feature: 'analytics' },
  { test: /^\/humanify\/workforce-analytics/, feature: 'analytics' },
  { test: /^\/humanify\/reports/, feature: 'analytics' },
  { test: /^\/humanify\/attendance/, feature: 'attendance' },
  { test: /^\/humanify\/leave/, feature: 'attendance' },
];

/** API action prefixes → feature */
const API_FEATURE_RULES: Array<{ test: RegExp; feature: HumanifyFeature }> = [
  { test: /\/api\/humanify\/payroll/, feature: 'payroll' },
  { test: /\/api\/humanify\/reimbursement/, feature: 'payroll' },
  { test: /\/api\/humanify\/casual-workforce/, feature: 'payroll' },
  { test: /\/api\/humanify\/travel-expense/, feature: 'payroll' },
  { test: /\/api\/humanify\/lms/, feature: 'lms' },
  { test: /\/api\/humanify\/training/, feature: 'lms' },
  { test: /\/api\/humanify\/certificates/, feature: 'lms' },
  { test: /\/api\/humanify\/recruitment/, feature: 'recruitment' },
  { test: /\/api\/humanify\/attendance/, feature: 'attendance' },
  { test: /\/api\/humanify\/leave/, feature: 'attendance' },
  { test: /\/api\/humanify\/workforce-analytics/, feature: 'analytics' },
  { test: /\/api\/humanify\/predictive-analytics/, feature: 'analytics' },
  { test: /\/api\/humanify\/hr-analytics/, feature: 'analytics' },
  { test: /\/api\/humanify\/ai/, feature: 'ai' },
  { test: /\/api\/humanify\/ai-hub/, feature: 'ai' },
  { test: /\/api\/humanify\/enterprise/, feature: 'api' },
  { test: /\/api\/humanify\/sso/, feature: 'sso' },
  { test: /\/api\/v1\//, feature: 'api' },
];

export function normalizeHumanifyPlan(raw: string | null | undefined): HumanifyPlanId {
  if (!raw) return 'enterprise'; // legacy tenants without plan denorm → full access
  const key = String(raw).trim().toLowerCase();
  return PLAN_ALIASES[key] || 'enterprise';
}

export function getPlanDefinition(plan: string | null | undefined): HumanifyPlanDefinition {
  return HUMANIFY_PLANS[normalizeHumanifyPlan(plan)];
}

export function planHasFeature(plan: string | null | undefined, feature: HumanifyFeature): boolean {
  const def = getPlanDefinition(plan);
  return def.features.includes(feature);
}

export function featureForPath(pathname: string): HumanifyFeature {
  const path = pathname.split('?')[0];
  for (const rule of ROUTE_FEATURE_RULES) {
    if (rule.test.test(path)) return rule.feature;
  }
  return 'core';
}

export function featureForApiPath(pathname: string): HumanifyFeature {
  const path = pathname.split('?')[0];
  for (const rule of API_FEATURE_RULES) {
    if (rule.test.test(path)) return rule.feature;
  }
  return 'core';
}

export function isPathAllowedForPlan(pathname: string, plan: string | null | undefined): boolean {
  return planHasFeature(plan, featureForPath(pathname));
}

export interface EntitlementSnapshot {
  planId: HumanifyPlanId;
  planName: string;
  features: HumanifyFeature[];
  maxUsers: number;
  maxEmployees: number;
  upgradeHint?: string;
}

export function buildEntitlementSnapshot(plan: string | null | undefined): EntitlementSnapshot {
  const def = getPlanDefinition(plan);
  const upgradeHint =
    def.id === 'starter'
      ? 'Upgrade ke Growth untuk Payroll & Analytics'
      : def.id === 'growth'
        ? 'Upgrade ke Enterprise untuk LMS, AIMAN, API, white-label & SSO'
        : def.id === 'trial'
          ? 'Pilih paket Starter/Growth/Enterprise setelah trial'
          : undefined;

  return {
    planId: def.id,
    planName: def.name,
    features: [...def.features],
    maxUsers: def.maxUsers,
    maxEmployees: def.maxEmployees,
    upgradeHint,
  };
}

type MenuLike = {
  href?: string;
  children?: MenuLike[];
  [key: string]: unknown;
};

/** Filter Humanify sidebar items by plan — applies to owner too (unlike module filter). */
export function filterMenuByPlanFeatures<T extends MenuLike>(
  items: T[],
  plan: string | null | undefined,
  opts?: { bypass?: boolean },
): T[] {
  if (opts?.bypass) return items;

  return items
    .map((item) => {
      const children = item.children
        ? filterMenuByPlanFeatures(item.children as T[], plan, opts)
        : undefined;

      if (children) {
        const next = { ...item, children };
        if (children.length === 0 && !item.href) return null;
        if (item.href && !isPathAllowedForPlan(String(item.href), plan) && children.length === 0) {
          return null;
        }
        if (item.href && !isPathAllowedForPlan(String(item.href), plan)) {
          return { ...next, href: undefined };
        }
        return next;
      }

      if (item.href && !isPathAllowedForPlan(String(item.href), plan)) return null;
      return item;
    })
    .filter(Boolean) as T[];
}

export function filterSidebarGroupsByPlan<T extends { items: MenuLike[] }>(
  groups: T[],
  plan: string | null | undefined,
  opts?: { bypass?: boolean },
): T[] {
  return groups
    .map((g) => ({
      ...g,
      items: filterMenuByPlanFeatures(g.items, plan, opts),
    }))
    .filter((g) => g.items.length > 0);
}
