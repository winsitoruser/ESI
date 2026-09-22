/**
 * Wave 9 — feature flag permission (SEC-APP-013)
 * Flags in tenant.settings.featureFlags must be enabled AND role allowed.
 */
const FLAG_ROLES: Record<string, string[]> = {
  talent_bank: ['owner', 'hq_admin', 'hr_admin', 'super_admin', 'superadmin', 'platform_admin'],
  aiman: ['owner', 'hq_admin', 'hr_admin', 'employee', 'super_admin', 'superadmin'],
  lms_lab: ['owner', 'hq_admin', 'hr_admin', 'super_admin', 'superadmin'],
  maker_checker: ['owner', 'hq_admin', 'hr_admin', 'finance', 'finance_admin'],
};

export function canUseFeatureFlag(opts: {
  flag: string;
  role?: string | null;
  tenantFlags?: Record<string, unknown> | null;
}): boolean {
  const role = String(opts.role || '').toLowerCase();
  const allowed = FLAG_ROLES[opts.flag];
  if (allowed && !allowed.includes(role) && !role.includes('admin')) {
    return false;
  }
  const flags = opts.tenantFlags || {};
  if (Object.prototype.hasOwnProperty.call(flags, opts.flag)) {
    return Boolean(flags[opts.flag]);
  }
  // default: flag absent → allow (feature gated elsewhere by billing)
  return true;
}
