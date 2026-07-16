/**
 * Tenant scoping helpers for Humanify SaaS APIs.
 * New tenants must only see their own rows — never platform-wide or other tenants' data.
 */

export function tenantIdFromSession(session: any): string | null {
  const tid = session?.user?.tenantId ?? session?.user?.tenant_id ?? null;
  if (!tid) return null;
  const s = String(tid);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
    ? s
    : null;
}

/** SQL fragment: require exact tenant match. Empty string if no alias needed. */
export function sqlTenantEq(column: string, param = 'tid'): string {
  return `${column} = :${param}`;
}

/**
 * Bind helper — when tenantId is missing (platform ops without tenant),
 * Humanify customer modules should return empty, not all rows.
 */
export function requireTenantOrEmpty(tenantId: string | null): boolean {
  return !tenantId;
}
