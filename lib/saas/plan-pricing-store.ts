/**
 * Humanify SaaS — ops-editable plan catalog (pricing, seats, feature modules)
 * Defaults live in plan-entitlements.ts; DB overrides merge at runtime.
 */
import {
  HUMANIFY_FEATURE_ORDER,
  HUMANIFY_PLANS,
  type HumanifyFeature,
  type HumanifyPlanDefinition,
  type HumanifyPlanId,
} from './plan-entitlements';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30_000;

export type PlanCatalogRow = {
  plan_id: HumanifyPlanId;
  name: string | null;
  description: string | null;
  price_monthly_idr: number | null;
  price_yearly_idr: number | null;
  max_users: number | null;
  max_employees: number | null;
  features: HumanifyFeature[] | null;
  updated_at?: string;
};

/** In-memory overrides consumed by getPlanDefinition via apply hook */
const overrides = new Map<HumanifyPlanId, Partial<HumanifyPlanDefinition>>();

export function getPlanCatalogOverride(planId: HumanifyPlanId): Partial<HumanifyPlanDefinition> | undefined {
  return overrides.get(planId);
}

export function listRuntimePlanOverrides(): Record<string, Partial<HumanifyPlanDefinition>> {
  const out: Record<string, Partial<HumanifyPlanDefinition>> = {};
  for (const [k, v] of overrides.entries()) out[k] = v;
  return out;
}

export async function ensurePlanCatalogTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_plan_catalog (
      plan_id VARCHAR(32) PRIMARY KEY,
      name VARCHAR(80),
      description TEXT,
      price_monthly_idr INTEGER,
      price_yearly_idr INTEGER,
      max_users INTEGER,
      max_employees INTEGER,
      features JSONB,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  ready = true;
}

function applyRow(row: PlanCatalogRow) {
  const id = row.plan_id;
  if (!HUMANIFY_PLANS[id]) return;
  const patch: Partial<HumanifyPlanDefinition> = {};
  if (row.name) patch.name = row.name;
  if (row.description) patch.description = row.description;
  if (row.price_monthly_idr != null) patch.priceMonthlyIdr = Number(row.price_monthly_idr);
  if (row.max_users != null) patch.maxUsers = Number(row.max_users);
  if (row.max_employees != null) patch.maxEmployees = Number(row.max_employees);
  if (Array.isArray(row.features) && row.features.length) {
    patch.features = row.features.filter((f): f is HumanifyFeature =>
      HUMANIFY_FEATURE_ORDER.includes(f as HumanifyFeature),
    );
  }
  overrides.set(id, patch);
}

export async function refreshPlanCatalogCache(force = false): Promise<void> {
  if (!sequelize) return;
  if (!force && Date.now() - cacheLoadedAt < CACHE_TTL_MS && overrides.size >= 0 && cacheLoadedAt > 0) {
    return;
  }
  await ensurePlanCatalogTable();
  const [rows] = await sequelize.query(`SELECT * FROM saas_plan_catalog`);
  overrides.clear();
  for (const row of rows || []) {
    const features = typeof row.features === 'string' ? JSON.parse(row.features) : row.features;
    applyRow({ ...row, features });
  }
  cacheLoadedAt = Date.now();
}

export async function listPlanCatalog(): Promise<Array<HumanifyPlanDefinition & {
  priceYearlyIdr: number;
  overridden: boolean;
}>> {
  await refreshPlanCatalogCache(true);
  const [rawRows] = sequelize
    ? await sequelize.query(`SELECT plan_id, price_yearly_idr FROM saas_plan_catalog`)
    : [[]];
  const yearlyMap = new Map<string, number>();
  for (const r of rawRows || []) {
    if (r.price_yearly_idr != null) yearlyMap.set(r.plan_id, Number(r.price_yearly_idr));
  }

  return (Object.keys(HUMANIFY_PLANS) as HumanifyPlanId[]).map((id) => {
    const base = HUMANIFY_PLANS[id];
    const o = overrides.get(id) || {};
    const merged: HumanifyPlanDefinition = { ...base, ...o, id, features: o.features || base.features };
    const yearly = yearlyMap.get(id) ?? Math.round(merged.priceMonthlyIdr * 12 * 0.8);
    return {
      ...merged,
      priceYearlyIdr: yearly,
      overridden: overrides.has(id),
    };
  });
}

export async function getEffectiveQuoteAmount(planId: string, interval: 'monthly' | 'yearly' = 'monthly'): Promise<number> {
  await refreshPlanCatalogCache();
  const id = (['trial', 'starter', 'growth', 'enterprise'].includes(String(planId).toLowerCase())
    ? String(planId).toLowerCase()
    : 'starter') as HumanifyPlanId;
  if (id === 'trial') throw new Error('Pilih paket berbayar (starter/growth/enterprise)');
  const base = HUMANIFY_PLANS[id];
  const o = overrides.get(id);
  const monthly = o?.priceMonthlyIdr ?? base.priceMonthlyIdr;

  // Prefer stored yearly if present
  if (interval === 'yearly' && sequelize) {
    const [rows] = await sequelize.query(
      `SELECT price_yearly_idr FROM saas_plan_catalog WHERE plan_id = :id LIMIT 1`,
      { replacements: { id } },
    );
    if (rows?.[0]?.price_yearly_idr != null) return Number(rows[0].price_yearly_idr);
    return Math.round(monthly * 12 * 0.8);
  }
  return monthly;
}

export async function upsertPlanCatalog(input: {
  planId: string;
  name?: string;
  description?: string;
  priceMonthlyIdr?: number;
  priceYearlyIdr?: number | null;
  maxUsers?: number;
  maxEmployees?: number;
  features?: HumanifyFeature[];
}): Promise<PlanCatalogRow> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensurePlanCatalogTable();
  const planId = String(input.planId || '').toLowerCase() as HumanifyPlanId;
  if (!HUMANIFY_PLANS[planId]) throw new Error('Plan tidak dikenal');

  const base = HUMANIFY_PLANS[planId];
  const features = input.features?.length
    ? input.features
    : (overrides.get(planId)?.features || base.features);

  await sequelize.query(
    `INSERT INTO saas_plan_catalog (
      plan_id, name, description, price_monthly_idr, price_yearly_idr,
      max_users, max_employees, features, updated_at
    ) VALUES (
      :planId, :name, :description, :priceMonthlyIdr, :priceYearlyIdr,
      :maxUsers, :maxEmployees, CAST(:features AS jsonb), NOW()
    )
    ON CONFLICT (plan_id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price_monthly_idr = EXCLUDED.price_monthly_idr,
      price_yearly_idr = EXCLUDED.price_yearly_idr,
      max_users = EXCLUDED.max_users,
      max_employees = EXCLUDED.max_employees,
      features = EXCLUDED.features,
      updated_at = NOW()`,
    {
      replacements: {
        planId,
        name: input.name ?? overrides.get(planId)?.name ?? base.name,
        description: input.description ?? overrides.get(planId)?.description ?? base.description,
        priceMonthlyIdr: input.priceMonthlyIdr ?? overrides.get(planId)?.priceMonthlyIdr ?? base.priceMonthlyIdr,
        priceYearlyIdr:
          input.priceYearlyIdr !== undefined
            ? input.priceYearlyIdr
            : Math.round((input.priceMonthlyIdr ?? base.priceMonthlyIdr) * 12 * 0.8),
        maxUsers: input.maxUsers ?? overrides.get(planId)?.maxUsers ?? base.maxUsers,
        maxEmployees: input.maxEmployees ?? overrides.get(planId)?.maxEmployees ?? base.maxEmployees,
        features: JSON.stringify(features),
      },
    },
  );

  await refreshPlanCatalogCache(true);
  const [rows] = await sequelize.query(
    `SELECT * FROM saas_plan_catalog WHERE plan_id = :planId LIMIT 1`,
    { replacements: { planId } },
  );
  return rows[0];
}
