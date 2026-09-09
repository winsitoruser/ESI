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

/** Canonical per-user list price (volume tiers live in seat-pricing.ts). */
export const HUMANIFY_CANONICAL_PRICES_IDR = {
  trial: 0,
  starter: 10_000,
  growth: 10_000,
  enterprise: 10_000,
} as const;

export const HUMANIFY_PLANS: Record<HumanifyPlanId, HumanifyPlanDefinition> = {
  trial: {
    id: 'trial',
    name: 'Trial',
    description: '14 hari full access untuk evaluasi',
    features: ['core', 'attendance', 'payroll', 'recruitment', 'lms', 'analytics', 'ai', 'api', 'white_label', 'sso'],
    maxUsers: 25,
    maxEmployees: 100,
    trialDays: 14,
    priceMonthlyIdr: HUMANIFY_CANONICAL_PRICES_IDR.trial,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'HRIS inti: karyawan, absensi, rekrutmen — dihitung per karyawan',
    features: ['core', 'attendance', 'recruitment'],
    maxUsers: 10_000,
    maxEmployees: 10_000,
    priceMonthlyIdr: HUMANIFY_CANONICAL_PRICES_IDR.starter,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    description: 'Payroll + analytics untuk tim berkembang — dihitung per karyawan',
    features: ['core', 'attendance', 'recruitment', 'payroll', 'analytics'],
    maxUsers: 10_000,
    maxEmployees: 10_000,
    priceMonthlyIdr: HUMANIFY_CANONICAL_PRICES_IDR.growth,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Semua modul HR + API, white-label & SSO. LMS dan AIMAN add-on.',
    features: ['core', 'attendance', 'payroll', 'recruitment', 'analytics', 'api', 'white_label', 'sso'],
    maxUsers: 50_000,
    maxEmployees: 50_000,
    priceMonthlyIdr: HUMANIFY_CANONICAL_PRICES_IDR.enterprise,
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
  { test: /^\/humanify\/travel-expense/, feature: 'payroll' },
  { test: /^\/humanify\/overtime/, feature: 'payroll' },
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
  { test: /^\/humanify\/kpi/, feature: 'analytics' },
  { test: /^\/humanify\/kpi-settings/, feature: 'analytics' },
  { test: /^\/humanify\/performance/, feature: 'analytics' },
  { test: /^\/humanify\/okr/, feature: 'analytics' },
  { test: /^\/humanify\/attendance/, feature: 'attendance' },
  { test: /^\/humanify\/leave/, feature: 'attendance' },
];

/** API action prefixes → feature. Match path segment (with or without trailing slash). */
const API_FEATURE_RULES: Array<{ test: RegExp; feature: HumanifyFeature }> = [
  { test: /\/api\/humanify\/payroll(?:\/|$)/, feature: 'payroll' },
  { test: /\/api\/humanify\/reimbursement(?:\/|$)/, feature: 'payroll' },
  { test: /\/api\/humanify\/casual-workforce(?:\/|$)/, feature: 'payroll' },
  { test: /\/api\/humanify\/travel-expense(?:\/|$)/, feature: 'payroll' },
  { test: /\/api\/humanify\/overtime(?:\/|$)/, feature: 'payroll' },
  { test: /\/api\/humanify\/disbursement(?:\/|$)/, feature: 'payroll' },
  { test: /\/api\/humanify\/compliance-export(?:\/|$)/, feature: 'payroll' },
  // Note: /api/humanify/workflow stays core at path level — claim* actions assert payroll in-handler
  // (mutations remain available on Starter).
  { test: /\/api\/humanify\/lms(?:\/|$)/, feature: 'lms' },
  { test: /\/api\/humanify\/training(?:\/|$)/, feature: 'lms' },
  { test: /\/api\/humanify\/certificates(?:\/|$)/, feature: 'lms' },
  { test: /\/api\/humanify\/recruitment(?:\/|$)/, feature: 'recruitment' },
  { test: /\/api\/humanify\/attendance(?:\/|$)/, feature: 'attendance' },
  { test: /\/api\/humanify\/leave(?:\/|$)/, feature: 'attendance' },
  { test: /\/api\/humanify\/workforce-analytics(?:\/|$)/, feature: 'analytics' },
  { test: /\/api\/humanify\/predictive-analytics(?:\/|$)/, feature: 'analytics' },
  { test: /\/api\/humanify\/hr-analytics(?:\/|$)/, feature: 'analytics' },
  { test: /\/api\/humanify\/kpi(?:\/|$)/, feature: 'analytics' },
  { test: /\/api\/humanify\/performance(?:\/|$)/, feature: 'analytics' },
  { test: /\/api\/humanify\/okr(?:\/|$)/, feature: 'analytics' },
  { test: /\/api\/humanify\/ai(?:\/|$)/, feature: 'ai' },
  { test: /\/api\/humanify\/ai-hub(?:\/|$)/, feature: 'ai' },
  { test: /\/api\/humanify\/ai-insights(?:\/|$)/, feature: 'ai' },
  { test: /\/api\/humanify\/enterprise(?:\/|$)/, feature: 'api' },
  { test: /\/api\/humanify\/sso(?:\/|$)/, feature: 'sso' },
  { test: /\/api\/v1(?:\/|$)/, feature: 'api' },
];

export function normalizeHumanifyPlan(raw: string | null | undefined): HumanifyPlanId {
  // Least privilege: missing/unknown plan → starter (not enterprise). Ops must set subscription_plan.
  if (!raw) return 'starter';
  const key = String(raw).trim().toLowerCase();
  return PLAN_ALIASES[key] || 'starter';
}

export function getPlanDefinition(plan: string | null | undefined): HumanifyPlanDefinition {
  const id = normalizeHumanifyPlan(plan);
  const base = HUMANIFY_PLANS[id];
  try {
    // Lazy require avoids circular import at module init
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getPlanCatalogOverride } = require('./plan-pricing-store') as typeof import('./plan-pricing-store');
    const o = getPlanCatalogOverride(id);
    if (!o) return base;
    return {
      ...base,
      ...o,
      id,
      features: (o.features && o.features.length ? o.features : base.features) as HumanifyFeature[],
    };
  } catch {
    return base;
  }
}

export function planHasFeature(plan: string | null | undefined, feature: HumanifyFeature): boolean {
  const def = getPlanDefinition(plan);
  return def.features.includes(feature);
}

export type BillingAddonFlags = { lms?: boolean; ai?: boolean };

export function mergeAddonFeatures(
  planFeatures: HumanifyFeature[],
  addons?: BillingAddonFlags | null,
): HumanifyFeature[] {
  const set = new Set(planFeatures);
  if (addons?.lms) set.add('lms');
  if (addons?.ai) set.add('ai');
  return Array.from(set);
}

export function entitlementsHaveFeature(
  plan: string | null | undefined,
  feature: HumanifyFeature,
  addons?: BillingAddonFlags | null,
): boolean {
  if (planHasFeature(plan, feature)) return true;
  if (feature === 'lms' && addons?.lms) return true;
  if (feature === 'ai' && addons?.ai) return true;
  return false;
}

export const HUMANIFY_FEATURE_LABELS: Record<HumanifyFeature, string> = {
  core: 'Karyawan & organisasi',
  attendance: 'Absensi',
  payroll: 'Payroll & PPh21',
  recruitment: 'Rekrutmen',
  lms: 'LMS / Training',
  analytics: 'HR Analytics',
  ai: 'AI Copilot',
  api: 'API keys',
  white_label: 'White-label',
  sso: 'SSO SAML',
};

/** Display order for customer-facing comparison matrix. */
export const HUMANIFY_FEATURE_ORDER: HumanifyFeature[] = [
  'core', 'attendance', 'payroll', 'recruitment', 'analytics', 'lms', 'ai', 'api', 'sso', 'white_label',
];

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

export function isPathAllowedForEntitlements(
  pathname: string,
  plan: string | null | undefined,
  addons?: BillingAddonFlags | null,
): boolean {
  return entitlementsHaveFeature(plan, featureForPath(pathname), addons);
}

export function isApiPathAllowedForEntitlements(
  pathname: string,
  plan: string | null | undefined,
  addons?: BillingAddonFlags | null,
): boolean {
  return entitlementsHaveFeature(plan, featureForApiPath(pathname), addons);
}

export interface EntitlementSnapshot {
  planId: HumanifyPlanId;
  planName: string;
  features: HumanifyFeature[];
  maxUsers: number;
  maxEmployees: number;
  upgradeHint?: string;
}

export function buildEntitlementSnapshot(
  plan: string | null | undefined,
  opts?: { addons?: BillingAddonFlags | null; billedSeats?: number | null },
): EntitlementSnapshot {
  const def = getPlanDefinition(plan);
  const features = mergeAddonFeatures(def.features, opts?.addons);
  const billed = opts?.billedSeats && opts.billedSeats > 0 ? opts.billedSeats : null;
  const upgradeHint =
    def.id === 'starter'
      ? 'Upgrade ke Growth untuk Payroll & Analytics, atau tambah LMS / AIMAN di Billing'
      : def.id === 'growth'
        ? 'Tambah LMS (Rp 1.500/karyawan) atau AIMAN (Rp 65.000/bulan) di Billing'
        : def.id === 'trial'
          ? 'Langganan dihitung per karyawan setelah trial'
          : undefined;

  return {
    planId: def.id,
    planName: def.name,
    features,
    maxUsers: billed || def.maxUsers,
    maxEmployees: billed || def.maxEmployees,
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
  opts?: { bypass?: boolean; addons?: BillingAddonFlags | null; keepLocked?: boolean },
): T[] {
  if (opts?.bypass) return items;
  const allowed = (href: string) => isPathAllowedForEntitlements(href, plan, opts?.addons);

  return items
    .map((item) => {
      const children = item.children
        ? filterMenuByPlanFeatures(item.children as T[], plan, opts)
        : undefined;

      if (children) {
        const next = { ...item, children };
        if (children.length === 0 && !item.href) {
          if (opts?.keepLocked) return { ...item, locked: true, children: item.children } as T;
          return null;
        }
        if (item.href && !allowed(String(item.href)) && children.length === 0) {
          if (opts?.keepLocked) return { ...next, locked: true } as T;
          return null;
        }
        if (item.href && !allowed(String(item.href))) {
          return { ...next, href: undefined, locked: true } as T;
        }
        return next;
      }

      if (item.href && !allowed(String(item.href))) {
        if (opts?.keepLocked) return { ...item, locked: true } as T;
        return null;
      }
      return item;
    })
    .filter(Boolean) as T[];
}

export function filterSidebarGroupsByPlan<T extends { items: MenuLike[] }>(
  groups: T[],
  plan: string | null | undefined,
  opts?: { bypass?: boolean; addons?: BillingAddonFlags | null; keepLocked?: boolean },
): T[] {
  return groups
    .map((g) => ({
      ...g,
      items: filterMenuByPlanFeatures(g.items, plan, opts),
    }))
    .filter((g) => g.items.length > 0);
}
