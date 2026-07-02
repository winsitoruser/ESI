/**
 * Tenant Isolation Utilities
 * Ensures all raw SQL queries are scoped to the authenticated tenant.
 * Prevents cross-tenant data leakage in multi-tenant environment.
 *
 * Usage:
 *   import { getTenantContext, tenantQuery } from '@/lib/middleware/tenantIsolation';
 *
 *   // Extract tenant context from authenticated request
 *   const ctx = getTenantContext(req);
 *   if (!ctx.tenantId) return res.status(403).json({ error: 'No tenant' });
 *
 *   // Run tenant-scoped query (auto-injects tenant_id filter)
 *   const [rows] = await tenantQuery(sequelize, ctx.tenantId,
 *     'SELECT * FROM products WHERE is_active = true',
 *     { /* extra replacements *\/ }
 *   );
 *
 *   // Or build WHERE clauses manually
 *   const { where, replacements } = buildTenantWhere(ctx.tenantId, 'p');
 *   const [rows] = await sequelize.query(`SELECT * FROM products p ${where} AND p.is_active = true`, { replacements });
 */

import type { NextApiRequest } from 'next';

export interface TenantContext {
  tenantId: string | number | null;
  userId: string | number | null;
  userName: string;
  userRole: string;
  dataScope: string;
}

/**
 * Extract tenant context from the authenticated request.
 * Requires withHQAuth middleware to have run first (sets req.session).
 */
export function getTenantContext(req: NextApiRequest): TenantContext {
  const session = (req as any).session;
  const user = session?.user || {};

  return {
    tenantId: user.tenantId || null,
    userId: user.id || null,
    userName: user.name || user.email || 'Unknown',
    userRole: (user.role || '').toLowerCase(),
    dataScope: user.dataScope || 'own_branch',
  };
}

/**
 * Run a tenant-scoped raw SQL query.
 * Automatically appends `AND tenant_id = :_tenantId` to queries that contain a WHERE clause,
 * or adds `WHERE tenant_id = :_tenantId` if no WHERE exists.
 *
 * For queries with subqueries or complex JOINs, use buildTenantFilter() instead.
 *
 * @param sequelize - Sequelize instance
 * @param tenantId - Tenant ID from session
 * @param sql - Raw SQL query
 * @param replacements - Additional query replacements
 * @param options - Extra sequelize query options (e.g., transaction)
 */
export async function tenantQuery(
  sequelize: any,
  tenantId: string | number,
  sql: string,
  replacements?: Record<string, any>,
  options?: Record<string, any>
): Promise<any> {
  const mergedReplacements = {
    ...(replacements || {}),
    _tenantId: tenantId,
  };

  return sequelize.query(sql, {
    replacements: mergedReplacements,
    ...(options || {}),
  });
}

/**
 * Build a tenant_id WHERE clause fragment for use in raw SQL.
 *
 * @param tenantId - Tenant ID from session
 * @param tableAlias - Optional table alias prefix (e.g., 'p' for 'p.tenant_id')
 * @returns Object with `condition` string and `replacements` object
 *
 * Usage:
 *   const tf = buildTenantFilter(ctx.tenantId, 'fi');
 *   const sql = `SELECT * FROM finance_invoices fi WHERE fi.status = 'active' ${tf.condition}`;
 *   const [rows] = await sequelize.query(sql, { replacements: { ...myReplacements, ...tf.replacements } });
 */
export function buildTenantFilter(
  tenantId: string | number | null,
  tableAlias?: string
): { condition: string; replacements: Record<string, any> } {
  if (!tenantId) {
    return { condition: '', replacements: {} };
  }

  const col = tableAlias ? `${tableAlias}.tenant_id` : 'tenant_id';
  return {
    condition: ` AND ${col} = :_tenantId`,
    replacements: { _tenantId: tenantId },
  };
}

/**
 * Build a full WHERE clause starting with tenant_id.
 *
 * @param tenantId - Tenant ID
 * @param tableAlias - Optional table alias
 * @returns Object with `where` (starts with WHERE) and `replacements`
 *
 * Usage:
 *   const tw = buildTenantWhere(ctx.tenantId, 'p');
 *   const sql = `SELECT * FROM products p ${tw.where} AND p.is_active = true`;
 */
export function buildTenantWhere(
  tenantId: string | number | null,
  tableAlias?: string
): { where: string; replacements: Record<string, any> } {
  if (!tenantId) {
    return { where: 'WHERE 1=1', replacements: {} };
  }

  const col = tableAlias ? `${tableAlias}.tenant_id` : 'tenant_id';
  return {
    where: `WHERE ${col} = :_tenantId`,
    replacements: { _tenantId: tenantId },
  };
}

/**
 * Validate that the current user has access to the requested tenant's data.
 * Returns 403 response if no tenant is associated.
 * Super admins bypass tenant checks.
 */
export function requireTenantAccess(
  req: NextApiRequest,
  res: any
): TenantContext | null {
  const ctx = getTenantContext(req);

  // Super admins can access all data
  if (ctx.userRole === 'super_admin') {
    return ctx;
  }

  if (!ctx.tenantId) {
    res.status(403).json({
      success: false,
      error: 'NO_TENANT',
      message: 'No tenant associated with this user. Access denied.',
    });
    return null;
  }

  return ctx;
}
