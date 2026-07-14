/**
 * Humanify SaaS — tenant slug helpers (public portal routing)
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let slugColumnReady = false;

export function slugifyTenantName(input: string): string {
  const base = String(input || 'tenant')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'tenant';
}

export async function ensureTenantSlugColumn() {
  if (!sequelize || slugColumnReady) return;
  try {
    await sequelize.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(64)
    `);
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug_unique
      ON tenants (slug) WHERE slug IS NOT NULL
    `);
    slugColumnReady = true;
  } catch (e: any) {
    console.warn('[tenant-slug] ensure column:', e?.message);
  }
}

export async function ensureUniqueTenantSlug(baseName: string, excludeId?: string | null): Promise<string> {
  await ensureTenantSlugColumn();
  let candidate = slugifyTenantName(baseName);
  if (!sequelize) return candidate;

  for (let i = 0; i < 20; i++) {
    const trySlug = i === 0 ? candidate : `${candidate}-${i + 1}`;
    const [rows] = await sequelize.query(
      `SELECT id FROM tenants WHERE slug = :slug ${excludeId ? 'AND id <> :eid' : ''} LIMIT 1`,
      { replacements: { slug: trySlug, eid: excludeId || null } },
    );
    if (!rows?.length) return trySlug;
  }
  return `${candidate}-${Date.now().toString(36).slice(-4)}`;
}

export async function backfillTenantSlugs(): Promise<number> {
  if (!sequelize) return 0;
  await ensureTenantSlugColumn();
  const [rows] = await sequelize.query(`
    SELECT id, COALESCE(business_name, name, code, business_code, 'tenant') AS label
    FROM tenants
    WHERE slug IS NULL OR TRIM(slug) = ''
  `);
  let n = 0;
  for (const row of rows || []) {
    const slug = await ensureUniqueTenantSlug(row.label, row.id);
    await sequelize.query(`UPDATE tenants SET slug = :slug, updated_at = NOW() WHERE id = :id`, {
      replacements: { slug, id: row.id },
    });
    n++;
  }
  return n;
}

export interface ResolvedTenant {
  id: string;
  slug: string;
  name: string;
  status: string;
  subscriptionPlan?: string | null;
  isActive?: boolean;
}

export async function resolveTenantBySlug(slug: string): Promise<ResolvedTenant | null> {
  if (!sequelize || !slug) return null;
  await ensureTenantSlugColumn();
  const cleaned = slugifyTenantName(slug);
  const [rows] = await sequelize.query(`
    SELECT id, slug,
      COALESCE(business_name, name, code) AS name,
      status, subscription_plan AS "subscriptionPlan", is_active AS "isActive"
    FROM tenants
    WHERE slug = :slug
    LIMIT 1
  `, { replacements: { slug: cleaned } });
  return rows?.[0] || null;
}

export async function resolveTenantById(id: string): Promise<ResolvedTenant | null> {
  if (!sequelize || !id) return null;
  await ensureTenantSlugColumn();
  const [rows] = await sequelize.query(`
    SELECT id, slug,
      COALESCE(business_name, name, code) AS name,
      status, subscription_plan AS "subscriptionPlan", is_active AS "isActive"
    FROM tenants WHERE id = :id LIMIT 1
  `, { replacements: { id } });
  return rows?.[0] || null;
}

/** Set PostgreSQL session var for future RLS policies (ADR-001). */
export async function setDbTenantContext(tenantId: string | null, isSuperAdmin = false) {
  if (!sequelize) return;
  try {
    if (isSuperAdmin) {
      await sequelize.query(`SELECT set_config('app.current_tenant', '', true)`);
      await sequelize.query(`SELECT set_config('app.is_super_admin', 'true', true)`);
      return;
    }
    if (!tenantId) {
      await sequelize.query(`SELECT set_config('app.current_tenant', '', true)`);
      await sequelize.query(`SELECT set_config('app.is_super_admin', 'false', true)`);
      return;
    }
    await sequelize.query(`SELECT set_config('app.current_tenant', :tid, true)`, {
      replacements: { tid: String(tenantId) },
    });
    await sequelize.query(`SELECT set_config('app.is_super_admin', 'false', true)`);
  } catch {
    /* older PG / no permission — ignore until RLS migration live */
  }
}
