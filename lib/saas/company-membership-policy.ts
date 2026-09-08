/**
 * Pure policy for Humanify multi-company switcher (no DB).
 */
export const COMPANY_MANAGER_ROLES = new Set([
  'owner',
  'admin',
  'hq_admin',
  'hr_admin',
  'super_admin',
  'superadmin',
  'platform_admin',
]);

export const COMPANY_MAX_PER_USER = 20;
export const COMPANY_MAX_PLATFORM = 100;

export type CompanyMembershipRole = 'owner' | 'admin' | 'member';

export function normalizeCompanyRole(role?: string | null): string {
  return String(role || '').toLowerCase().trim();
}

export function canManageCompanies(role?: string | null): boolean {
  return COMPANY_MANAGER_ROLES.has(normalizeCompanyRole(role));
}

export function membershipRoleForUserRole(role?: string | null): CompanyMembershipRole {
  const r = normalizeCompanyRole(role);
  if (r === 'owner' || r === 'super_admin' || r === 'superadmin' || r === 'platform_admin') {
    return 'owner';
  }
  if (['admin', 'hq_admin', 'hr_admin'].includes(r)) return 'admin';
  return 'member';
}

export function shouldShowCompanySwitcher(opts: {
  canCreate: boolean;
  companyCount: number;
}): boolean {
  return Boolean(opts.canCreate) || opts.companyCount > 1;
}

export function isCompanySwitchAllowed(opts: {
  requestedTenantId: string;
  memberships: { tenantId: string; status?: string }[];
  impersonating?: boolean;
}): boolean {
  if (opts.impersonating) return false;
  const id = String(opts.requestedTenantId || '');
  if (!id) return false;
  return opts.memberships.some(
    (m) => String(m.tenantId) === id && String(m.status || 'active') === 'active',
  );
}

export function pickDefaultCompanyId(opts: {
  memberships: { tenantId: string; isDefault?: boolean }[];
  homeTenantId?: string | null;
}): string | null {
  const def = opts.memberships.find((m) => m.isDefault);
  if (def?.tenantId) return String(def.tenantId);
  if (opts.homeTenantId && opts.memberships.some((m) => String(m.tenantId) === String(opts.homeTenantId))) {
    return String(opts.homeTenantId);
  }
  return opts.memberships[0]?.tenantId ? String(opts.memberships[0].tenantId) : (opts.homeTenantId || null);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isTenantUuid(value?: string | null): boolean {
  return Boolean(value && UUID_RE.test(String(value)));
}

/**
 * Child companies may nest under a parent tenant only if that parent is already
 * in the actor's memberships — never under a JWT/impersonated/default tenant.
 */
export function resolveParentTenantId(opts: {
  homeTenantId?: string | null;
  memberships: { tenantId: string }[];
}): string | null {
  const owned = new Set(opts.memberships.map((m) => String(m.tenantId)));
  const home = opts.homeTenantId ? String(opts.homeTenantId) : '';
  if (home && owned.has(home)) return home;
  const first = opts.memberships[0]?.tenantId;
  return first ? String(first) : null;
}
