/**
 * Client `session.update()` must never overwrite privileged JWT claims.
 * Impersonation / company switch are handled in dedicated jwt() branches.
 */
export const SESSION_UPDATE_PRIVILEGED_KEYS = [
  'id',
  'sub',
  'role',
  'originalRole',
  'tenantId',
  'tenantName',
  'businessName',
  'impersonating',
  'impersonateTenantId',
  'impersonatedTenantSlug',
  'operatorTenantId',
  'operatorRole',
  'operatorTenantName',
  'switchCompanyId',
  'endImpersonation',
  'subscriptionPlan',
  'addonLms',
  'addonAi',
  'addonAts',
  'addonTalentBank',
  'billedSeats',
  'exp',
  'iat',
  'jti',
] as const;

const PRIVILEGED = new Set<string>(SESSION_UPDATE_PRIVILEGED_KEYS);

/** Fields a browser may set via session.update besides dedicated switch/impersonate. */
export const SESSION_UPDATE_ALLOWLIST = new Set(['mfaSetupRequired']);

export function applyClientSessionPatch(
  token: Record<string, unknown>,
  sessionPatch: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!sessionPatch || typeof sessionPatch !== 'object') return token;
  const next = { ...token };
  for (const [key, value] of Object.entries(sessionPatch)) {
    if (PRIVILEGED.has(key)) continue;
    if (!SESSION_UPDATE_ALLOWLIST.has(key)) continue;
    next[key] = value;
  }
  return next;
}
