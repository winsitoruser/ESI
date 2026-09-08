/**
 * Defense-in-depth tenant scoping — never return orphan (NULL tenant) or
 * other-tenant rows even if SQL/RLS misbehaves.
 */

export function sameTenantId(rowTenant: unknown, sessionTenant: unknown): boolean {
  if (rowTenant == null || sessionTenant == null) return false;
  return String(rowTenant) === String(sessionTenant);
}

export function filterRowsByTenant<T extends Record<string, any>>(
  rows: T[] | null | undefined,
  sessionTenant: string | null | undefined,
  keys: string[] = ['tenant_id', 'tenantId'],
): T[] {
  if (!sessionTenant || !rows?.length) return [];
  return rows.filter((row) => {
    for (const k of keys) {
      if (row[k] != null) return sameTenantId(row[k], sessionTenant);
    }
    // No tenant column on mapped DTO — caller must join-scope; drop orphans
    return false;
  });
}

/** Keep only rows that explicitly belong to sessionTenant. */
export function requireTenantMatch<T extends Record<string, any>>(
  rows: T[] | null | undefined,
  sessionTenant: string | null | undefined,
  getTenant: (row: T) => unknown,
): T[] {
  if (!sessionTenant || !rows?.length) return [];
  return rows.filter((row) => sameTenantId(getTenant(row), sessionTenant));
}
