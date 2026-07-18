/**
 * Request-bound Postgres tenant context for RLS.
 *
 * When HUMANIFY_RLS_REQUEST_BOUND=true, withHQAuth wraps each request in a
 * Sequelize transaction + CLS so set_config(..., true) (transaction-local)
 * applies to every query on that request — safe with connection pools.
 *
 * Note: no async_hooks import here (Next client bundling); flag is env-only.
 */
export function isTenantRequestBoundEnabled(): boolean {
  return String(process.env.HUMANIFY_RLS_REQUEST_BOUND || '').toLowerCase() === 'true';
}

/** Prefer transaction-local set_config when request-bound mode is on. */
export function tenantConfigIsLocal(): boolean {
  return isTenantRequestBoundEnabled();
}

/**
 * Run side-work inside a SAVEPOINT so a failure cannot abort the
 * request-bound outer transaction (and silently roll back earlier INSERTs).
 */
export async function withDbSavepoint<T>(
  sequelize: { query: (sql: string, opts?: any) => Promise<any> },
  fn: () => Promise<T>,
  label = 'side'
): Promise<T | null> {
  if (!sequelize) {
    try {
      return await fn();
    } catch {
      return null;
    }
  }
  const sp = `sp_${label}_${Math.random().toString(36).slice(2, 10)}`.replace(/[^a-zA-Z0-9_]/g, '_');
  try {
    await sequelize.query(`SAVEPOINT ${sp}`);
    const result = await fn();
    await sequelize.query(`RELEASE SAVEPOINT ${sp}`);
    return result;
  } catch (err: any) {
    try {
      await sequelize.query(`ROLLBACK TO SAVEPOINT ${sp}`);
    } catch {
      /* ignore */
    }
    console.warn(`[withDbSavepoint:${label}]`, err?.message || err);
    return null;
  }
}

/**
 * Run a SELECT (or any query) inside a SAVEPOINT and return rows[].
 * On failure: roll back to savepoint and return [] (never abort outer TX).
 */
export async function safeQueryWithSavepoint(
  sequelize: { query: (sql: string, opts?: any) => Promise<any> } | null | undefined,
  sql: string,
  replacements: Record<string, unknown> = {},
  label = 'query',
): Promise<any[]> {
  if (!sequelize) return [];
  const rows = await withDbSavepoint(
    sequelize,
    async () => {
      const [r] = await sequelize.query(sql, { replacements });
      return Array.isArray(r) ? r : [];
    },
    label,
  );
  return rows || [];
}
