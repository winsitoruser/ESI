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

/**
 * Sequelize `where` for id-scoped mutations.
 * When tenantId is set, always include it (blocks cross-tenant IDOR).
 */
export function scopedWhere(
  id: string | number,
  tenantId: string | null | undefined,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const where: Record<string, unknown> = { id, ...extra };
  if (tenantId) where.tenantId = tenantId;
  return where;
}

export async function findScopedById(
  Model: any,
  id: string | number | null | undefined,
  tenantId: string | null | undefined,
): Promise<any | null> {
  if (!Model || id == null || id === '') return null;
  return Model.findOne({ where: scopedWhere(id, tenantId) });
}

export async function updateScoped(
  Model: any,
  id: string | number,
  tenantId: string | null | undefined,
  data: Record<string, unknown>,
): Promise<[affectedCount: number, rows?: any[]]> {
  const payload = { ...data };
  delete payload.tenantId;
  delete (payload as any).tenant_id;
  return Model.update(payload, { where: scopedWhere(id, tenantId) });
}

export async function destroyScoped(
  Model: any,
  id: string | number,
  tenantId: string | null | undefined,
): Promise<number> {
  return Model.destroy({ where: scopedWhere(id, tenantId) });
}

/** 404 helper when scoped find misses (hides cross-tenant existence). */
export function notFoundOrForbidden(res: any, message = 'Not found') {
  return res.status(404).json({ success: false, error: message });
}
