/**
 * Humanify multi-company: a privileged user may own/manage several tenants
 * (companies) and switch the active tenant in the session without impersonation.
 *
 * Isolation stays row-level on tenant_id. Membership only answers “may this
 * login activate that tenant?” — it never widens queries across companies.
 */
import crypto from 'crypto';
import { createHumanifyTenantRecord } from './humanify-provision';
import { getTenantColumns } from './tenant-schema';
import { resolveTenantById } from './tenant-slug';
import {
  COMPANY_MAX_PER_USER,
  COMPANY_MAX_PLATFORM,
  canManageCompanies,
  isTenantUuid,
  membershipRoleForUserRole,
  normalizeCompanyRole,
  pickDefaultCompanyId,
  resolveParentTenantId,
  type CompanyMembershipRole,
} from './company-membership-policy';

export {
  COMPANY_MANAGER_ROLES,
  COMPANY_MAX_PER_USER,
  COMPANY_MAX_PLATFORM,
  canManageCompanies,
  isCompanySwitchAllowed,
  isTenantUuid,
  membershipRoleForUserRole,
  normalizeCompanyRole,
  pickDefaultCompanyId,
  resolveParentTenantId,
  shouldShowCompanySwitcher,
} from './company-membership-policy';
export type { CompanyMembershipRole } from './company-membership-policy';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type CompanyListItem = {
  id: string;
  name: string;
  slug: string | null;
  status: string | null;
  plan: string | null;
  role: CompanyMembershipRole;
  isDefault: boolean;
  isActive: boolean;
};

let ready = false;

export async function ensureCompanyMembershipTable(): Promise<boolean> {
  if (!sequelize) return false;
  if (ready) return true;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_company_memberships (
      id UUID PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      tenant_id UUID NOT NULL,
      role VARCHAR(16) NOT NULL DEFAULT 'owner',
      is_default BOOLEAN NOT NULL DEFAULT false,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_switched_at TIMESTAMPTZ
    )
  `);
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_co_mem_user_tenant
    ON saas_company_memberships (user_id, tenant_id)
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_co_mem_user
    ON saas_company_memberships (user_id, status)
  `);
  try {
    await sequelize.query(`
      DELETE FROM saas_company_memberships m
      WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = m.tenant_id)
    `);
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE saas_company_memberships
          ADD CONSTRAINT fk_saas_co_mem_tenant
          FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  } catch (e: any) {
    console.warn('[company-membership] tenant FK:', e?.message || e);
  }
  try {
    await sequelize.query(`
      INSERT INTO saas_company_memberships
        (id, user_id, tenant_id, role, is_default, status, created_at, updated_at)
      SELECT gen_random_uuid(), CAST(u.id AS TEXT), u.tenant_id,
        CASE
          WHEN lower(u.role::text) IN ('owner', 'super_admin', 'superadmin', 'platform_admin') THEN 'owner'
          WHEN lower(u.role::text) IN ('admin', 'hq_admin', 'hr_admin') THEN 'admin'
          ELSE 'member'
        END,
        true, 'active', NOW(), NOW()
      FROM users u
      WHERE u.tenant_id IS NOT NULL
        AND lower(COALESCE(u.role::text, '')) NOT IN ('super_admin', 'superadmin', 'platform_admin')
        AND NOT EXISTS (
          SELECT 1 FROM saas_company_memberships m
          WHERE m.user_id = CAST(u.id AS TEXT) AND m.tenant_id = u.tenant_id
        )
    `);
  } catch (e: any) {
    console.warn('[company-membership] backfill:', e?.message || e);
  }
  ready = true;
  return true;
}

function uid(userId: string | number): string {
  return String(userId);
}

export async function grantCompanyMembership(opts: {
  userId: string | number;
  tenantId: string;
  role?: CompanyMembershipRole;
  isDefault?: boolean;
}): Promise<void> {
  if (!sequelize || !opts.userId || !isTenantUuid(opts.tenantId)) return;
  await ensureCompanyMembershipTable();
  const role = opts.role || 'owner';
  await sequelize.query(
    `
    INSERT INTO saas_company_memberships
      (id, user_id, tenant_id, role, is_default, status, created_at, updated_at)
    VALUES
      (:id, :uid, :tid, :role, :def, 'active', NOW(), NOW())
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET
      role = EXCLUDED.role,
      status = 'active',
      is_default = CASE WHEN EXCLUDED.is_default THEN true ELSE saas_company_memberships.is_default END,
      updated_at = NOW()
    `,
    {
      replacements: {
        id: crypto.randomUUID(),
        uid: uid(opts.userId),
        tid: opts.tenantId,
        role,
        def: Boolean(opts.isDefault),
      },
    },
  );
  if (opts.isDefault) {
    await sequelize.query(
      `UPDATE saas_company_memberships
       SET is_default = false, updated_at = NOW()
       WHERE user_id = :uid AND tenant_id <> :tid AND is_default = true`,
      { replacements: { uid: uid(opts.userId), tid: opts.tenantId } },
    );
  }
}

export async function ensureHomeMembership(
  userId: string | number,
  homeTenantId?: string | null,
  role?: string | null,
): Promise<void> {
  const r = normalizeCompanyRole(role);
  // Platform ops must not inherit membership on the lookup-default tenant.
  if (['super_admin', 'superadmin', 'platform_admin'].includes(r)) return;
  if (!sequelize || !userId) return;
  await ensureCompanyMembershipTable();

  let dbTenantId: string | null = null;
  try {
    const [rows] = await sequelize.query(
      `SELECT tenant_id FROM users WHERE CAST(id AS TEXT) = :uid LIMIT 1`,
      { replacements: { uid: uid(userId) } },
    );
    dbTenantId = rows?.[0]?.tenant_id ? String(rows[0].tenant_id) : null;
  } catch {
    dbTenantId = null;
  }

  // Prefer the user's persisted home tenant. JWT/session tenant is only used
  // when it already matches an existing membership (never impersonated tenants).
  let tid = isTenantUuid(dbTenantId) ? dbTenantId : null;
  if (!tid && isTenantUuid(homeTenantId)) {
    const already = await userCanAccessCompany(userId, String(homeTenantId));
    if (already) tid = String(homeTenantId);
  }
  if (!tid) return;

  await grantCompanyMembership({
    userId,
    tenantId: tid,
    role: membershipRoleForUserRole(role),
    isDefault: false,
  });
}

export async function listCompanyMemberships(
  userId: string | number,
): Promise<Array<{ tenantId: string; role: CompanyMembershipRole; isDefault: boolean; status: string }>> {
  if (!sequelize || !userId) return [];
  await ensureCompanyMembershipTable();
  const [rows] = await sequelize.query(
    `SELECT tenant_id AS "tenantId", role, is_default AS "isDefault", status
     FROM saas_company_memberships
     WHERE user_id = :uid AND status = 'active'
     ORDER BY is_default DESC, created_at ASC`,
    { replacements: { uid: uid(userId) } },
  );
  return (rows || []).map((r: any) => ({
    tenantId: String(r.tenantId),
    role: (r.role || 'member') as CompanyMembershipRole,
    isDefault: Boolean(r.isDefault),
    status: String(r.status || 'active'),
  }));
}

export async function userCanAccessCompany(
  userId: string | number,
  tenantId: string,
): Promise<boolean> {
  if (!sequelize || !userId || !isTenantUuid(tenantId)) return false;
  await ensureCompanyMembershipTable();
  const [rows] = await sequelize.query(
    `SELECT 1 FROM saas_company_memberships
     WHERE user_id = :uid AND tenant_id = :tid AND status = 'active' LIMIT 1`,
    { replacements: { uid: uid(userId), tid: tenantId } },
  );
  return Boolean(rows?.[0]);
}

export async function setActiveCompany(
  userId: string | number,
  tenantId: string,
): Promise<boolean> {
  if (!sequelize || !userId || !isTenantUuid(tenantId)) return false;
  const ok = await userCanAccessCompany(userId, tenantId);
  if (!ok) return false;

  await sequelize.query(
    `UPDATE saas_company_memberships
     SET is_default = (tenant_id = :tid), last_switched_at = CASE WHEN tenant_id = :tid THEN NOW() ELSE last_switched_at END, updated_at = NOW()
     WHERE user_id = :uid AND status = 'active'`,
    { replacements: { uid: uid(userId), tid: tenantId } },
  );

  try {
    await sequelize.query(
      `UPDATE users SET tenant_id = :tid, updated_at = NOW() WHERE CAST(id AS TEXT) = :uid`,
      { replacements: { tid: tenantId, uid: uid(userId) } },
    );
  } catch (e: any) {
    console.warn('[company-membership] persist home tenant:', e?.message || e);
  }
  return true;
}

export async function resolveLoginCompany(
  userId: string | number,
  homeTenantId?: string | null,
  role?: string | null,
): Promise<{ tenantId: string; name?: string } | null> {
  await ensureHomeMembership(userId, homeTenantId, role);
  const memberships = await listCompanyMemberships(userId);
  const tid = pickDefaultCompanyId({ memberships, homeTenantId: homeTenantId || null });
  if (!tid) return null;
  const tenant = await resolveTenantById(tid).catch(() => null);
  return { tenantId: tid, name: tenant?.name };
}

export async function listCompaniesForUser(opts: {
  userId: string | number;
  role?: string | null;
  homeTenantId?: string | null;
  activeTenantId?: string | null;
  skipBackfill?: boolean;
}): Promise<{
  companies: CompanyListItem[];
  canCreate: boolean;
  canSwitch: boolean;
  activeTenantId: string | null;
}> {
  if (!sequelize) {
    return {
      companies: [],
      canCreate: canManageCompanies(opts.role),
      canSwitch: false,
      activeTenantId: opts.activeTenantId || null,
    };
  }
  if (!opts.skipBackfill) {
    await ensureHomeMembership(opts.userId, opts.homeTenantId, opts.role);
  }
  const memberships = await listCompanyMemberships(opts.userId);
  const cols = await getTenantColumns();
  const nameExpr = [
    cols.has('business_name') ? 'business_name' : null,
    cols.has('name') ? 'name' : null,
    cols.has('code') ? 'code' : null,
    `'Perusahaan'`,
  ].filter(Boolean).join(', ');
  const planExpr = cols.has('subscription_plan') ? 'subscription_plan' : 'NULL';
  const slugExpr = cols.has('slug') ? 'slug' : 'NULL';

  const companies: CompanyListItem[] = [];
  for (const m of memberships) {
    const [rows] = await sequelize.query(
      `SELECT id,
              COALESCE(${nameExpr}) AS name,
              ${slugExpr} AS slug,
              status,
              ${planExpr} AS plan
       FROM tenants WHERE id = :id LIMIT 1`,
      { replacements: { id: m.tenantId } },
    );
    const t = rows?.[0];
    if (!t) continue;
    companies.push({
      id: String(t.id),
      name: String(t.name || 'Perusahaan'),
      slug: t.slug ? String(t.slug) : null,
      status: t.status ? String(t.status) : null,
      plan: t.plan ? String(t.plan) : null,
      role: m.role,
      isDefault: m.isDefault,
      isActive: String(t.id) === String(opts.activeTenantId || ''),
    });
  }

  const canCreate = canManageCompanies(opts.role);
  return {
    companies,
    canCreate,
    canSwitch: companies.length > 1 || canCreate,
    activeTenantId: opts.activeTenantId || pickDefaultCompanyId({
      memberships,
      homeTenantId: opts.homeTenantId || null,
    }),
  };
}

export async function createCompanyForUser(opts: {
  userId: string | number;
  role?: string | null;
  homeTenantId?: string | null;
  ownerName?: string | null;
  email?: string | null;
  companyName: string;
  industry?: string;
  employeeRange?: string;
}): Promise<{ tenantId: string; slug: string; setupCompleted: boolean }> {
  if (!canManageCompanies(opts.role)) {
    throw Object.assign(new Error('Hanya owner/admin yang dapat menambah perusahaan'), { status: 403 });
  }
  const name = String(opts.companyName || '').trim();
  if (name.length < 2) {
    throw Object.assign(new Error('Nama perusahaan minimal 2 karakter'), { status: 400 });
  }

  await ensureHomeMembership(opts.userId, opts.homeTenantId, opts.role);
  const existing = await listCompanyMemberships(opts.userId);
  const cap = ['super_admin', 'superadmin', 'platform_admin'].includes(normalizeCompanyRole(opts.role))
    ? COMPANY_MAX_PLATFORM
    : COMPANY_MAX_PER_USER;
  if (existing.length >= cap) {
    throw Object.assign(new Error(`Batas perusahaan tercapai (${cap})`), { status: 400 });
  }

  const parentTenantId = resolveParentTenantId({
    homeTenantId: opts.homeTenantId,
    memberships: existing,
  });
  const created = await createHumanifyTenantRecord({
    companyName: name,
    ownerName: opts.ownerName || undefined,
    email: opts.email || undefined,
    industry: opts.industry,
    employeeRange: opts.employeeRange,
    parentTenantId,
  });

  await grantCompanyMembership({
    userId: opts.userId,
    tenantId: created.tenantId,
    role: 'owner',
    isDefault: true,
  });
  await setActiveCompany(opts.userId, created.tenantId);

  if (parentTenantId) {
    try {
      const cols = await getTenantColumns();
      if (cols.has('business_structure')) {
        await sequelize.query(
          `UPDATE tenants SET business_structure = 'group', updated_at = NOW() WHERE id = :id`,
          { replacements: { id: parentTenantId } },
        );
      }
    } catch { /* optional */ }
  }

  try {
    const { logAdminAction } = await import('./admin-audit');
    await logAdminAction({
      tenantId: created.tenantId,
      actorUserId: uid(opts.userId),
      actorEmail: opts.email || null,
      action: 'company.create',
      resourceType: 'tenant',
      resourceId: created.tenantId,
      meta: { name, parentTenantId },
    });
  } catch { /* ignore */ }

  return { tenantId: created.tenantId, slug: created.slug, setupCompleted: false };
}
