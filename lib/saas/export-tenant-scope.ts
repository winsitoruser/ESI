/**
 * Search/export after company switch: always the JWT/session tenant.
 * Query/body tenantId is ignored (cannot spoof a previous company).
 */
export function resolveExportTenantId(opts: {
  sessionTenantId?: string | null;
  requestedTenantId?: string | null;
}): { tenantId: string | null; rejectedSpoof: boolean } {
  const session = opts.sessionTenantId ? String(opts.sessionTenantId) : null;
  const requested = opts.requestedTenantId ? String(opts.requestedTenantId) : '';
  const rejectedSpoof = Boolean(requested && session && requested !== session);
  return { tenantId: session, rejectedSpoof };
}
