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
  const flag = String(process.env.HUMANIFY_RLS_REQUEST_BOUND || '').toLowerCase();
  if (flag === 'true' || flag === '1' || flag === 'on') return true;
  if (flag === 'false' || flag === '0' || flag === 'off') return false;
  // Auto-enable with FORCE/strict RLS — pool-safe tenant GUC requires a request TX
  const rls = String(process.env.HUMANIFY_RLS_MODE || '').toLowerCase();
  return rls === 'strict' || rls === 'force';
}

/** Prefer transaction-local set_config when request-bound mode is on. */
export function tenantConfigIsLocal(): boolean {
  return isTenantRequestBoundEnabled();
}

export function isAbortedTransactionError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '');
  const code = String((err as any)?.parent?.code || (err as any)?.original?.code || (err as any)?.code || '');
  return code === '25P02' || /current transaction is aborted/i.test(msg);
}

function interpolateReplacements(sql: string, replacements?: Record<string, unknown>): { text: string; values: unknown[] } {
  if (!replacements || !Object.keys(replacements).length) return { text: sql, values: [] };
  const values: unknown[] = [];
  const text = sql.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_m, key: string) => {
    if (!(key in replacements)) return `:${key}`;
    values.push(replacements[key]);
    return `$${values.length}`;
  });
  return { text, values };
}

async function rawConnectionQuery(connection: any, sql: string, replacements?: Record<string, unknown>): Promise<any> {
  const { text, values } = interpolateReplacements(sql, replacements);
  if (typeof connection.query !== 'function') {
    throw new Error('Raw connection query unavailable');
  }
  // node-pg style: connection.query(text, values) → Promise or callback
  const result = connection.query.length >= 2 && values.length
    ? connection.query(text, values)
    : values.length
      ? connection.query({ text, values })
      : connection.query(text);
  return await Promise.resolve(result);
}

function probeAssignedTx(result: any): boolean {
  const row = result?.rows?.[0] || (Array.isArray(result) ? result[0] : result);
  return row?.tx != null && row.tx !== '';
}

async function withStandalonePgQuery<T>(
  fn: (query: (sql: string, opts?: any) => Promise<any>) => Promise<T>,
  label: string,
): Promise<T | null> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    console.warn(`[withAutocommitQuery:${label}] no DATABASE_URL for standalone client`);
    return null;
  }
  let Client: any;
  try {
    if (typeof window !== 'undefined') return null;
    // webpackIgnore: pages such as ESS import withDbSavepoint; do not bundle `pg`.
    const req = Function('return typeof require === "function" ? require : null')();
    Client = req && req('pg').Client;
  } catch {
    console.warn(`[withAutocommitQuery:${label}] pg client unavailable`);
    return null;
  }
  if (!Client) {
    console.warn(`[withAutocommitQuery:${label}] pg client unavailable`);
    return null;
  }
  const local = /localhost|127\.0\.0\.1/.test(url);
  const client = new Client({
    connectionString: url,
    ssl: local ? false : { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const query = async (sql: string, opts?: any) => {
      const { text, values } = interpolateReplacements(sql, opts?.replacements);
      const result = await client.query(text, values);
      return [result.rows, result];
    };
    return await fn(query);
  } catch (e: any) {
    console.warn(`[withAutocommitQuery:${label}] standalone`, e?.message || e);
    return null;
  } finally {
    try { await client.end(); } catch { /* ignore */ }
  }
}

/**
 * Run DDL / one-off schema work on a dedicated connection so it cannot
 * abort the request-bound RLS transaction (25P02).
 *
 * IMPORTANT: must not use sequelize.query() while CLS transaction is active —
 * even `transaction: null` may still bind depending on Sequelize version.
 */
export async function withAutocommitQuery<T>(
  sequelize: any,
  fn: (query: (sql: string, opts?: any) => Promise<any>) => Promise<T>,
  label = 'ddl',
): Promise<T | null> {
  if (!sequelize) return null;

  if (!sequelize.connectionManager?.getConnection) {
    console.warn(`[withAutocommitQuery:${label}] no connectionManager — skip`);
    return null;
  }

  let connection: any;
  try {
    connection = await sequelize.connectionManager.getConnection({ type: 'write' });
    // If CLS handed us the request-bound TX connection, ROLLBACK would abort
    // clock-in / ESS writes (25P02 → "Sesi database terganggu").
    try {
      const probe = await rawConnectionQuery(connection, 'SELECT txid_current_if_assigned() AS tx');
      if (probeAssignedTx(probe)) {
        try { await sequelize.connectionManager.releaseConnection(connection); } catch { /* ignore */ }
        connection = null;
        return await withStandalonePgQuery(fn, label);
      }
    } catch {
      /* probe failed — still try ROLLBACK on a presumed idle pooled connection */
    }
    try {
      await rawConnectionQuery(connection, 'ROLLBACK');
    } catch {
      /* no open transaction — fine */
    }

    const query = async (sql: string, opts?: any) => {
      const replacements = opts?.replacements as Record<string, unknown> | undefined;
      const result = await rawConnectionQuery(connection, sql, replacements);
      // Match sequelize.query shape: [rows, meta]
      if (Array.isArray(result?.rows)) return [result.rows, result];
      if (Array.isArray(result)) return result;
      return [result, result];
    };

    return await fn(query);
  } catch (e: any) {
    console.warn(`[withAutocommitQuery:${label}]`, e?.message || e);
    return null;
  } finally {
    if (connection) {
      try {
        await sequelize.connectionManager.releaseConnection(connection);
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Run side-work inside a SAVEPOINT so a failure cannot abort the
 * request-bound outer transaction (and silently roll back earlier INSERTs).
 *
 * When not inside a transaction (RLS request-bound off), SAVEPOINT is invalid —
 * fall back to running fn() directly so callers still get data.
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
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (/SAVEPOINT can only be used in transaction blocks/i.test(msg)) {
      try {
        return await fn();
      } catch (e2: any) {
        console.warn(`[withDbSavepoint:${label}]`, e2?.message || e2);
        return null;
      }
    }
    if (isAbortedTransactionError(err)) {
      console.warn(`[withDbSavepoint:${label}] outer TX aborted — refusing to continue`);
      throw Object.assign(
        new Error('Sesi database terganggu. Muat ulang halaman lalu coba lagi.'),
        { code: 'TX_ABORTED' },
      );
    }
    console.warn(`[withDbSavepoint:${label}]`, msg);
    return null;
  }

  try {
    const result = await fn();
    try {
      await sequelize.query(`RELEASE SAVEPOINT ${sp}`);
      return result;
    } catch (releaseErr: any) {
      try {
        await sequelize.query(`ROLLBACK TO SAVEPOINT ${sp}`);
      } catch {
        /* ignore */
      }
      if (isAbortedTransactionError(releaseErr)) {
        console.warn(`[withDbSavepoint:${label}] TX still aborted after RELEASE failure`);
        throw Object.assign(
          new Error('Sesi database terganggu. Muat ulang halaman lalu coba lagi.'),
          { code: 'TX_ABORTED' },
        );
      }
      console.warn(
        `[withDbSavepoint:${label}] recovered after swallowed error:`,
        releaseErr?.message || releaseErr,
      );
      return result;
    }
  } catch (err: any) {
    if ((err as any)?.code === 'TX_ABORTED') throw err;
    if (isAbortedTransactionError(err)) {
      try {
        await sequelize.query(`ROLLBACK TO SAVEPOINT ${sp}`);
      } catch {
        /* ignore */
      }
      throw Object.assign(
        new Error('Sesi database terganggu. Muat ulang halaman lalu coba lagi.'),
        { code: 'TX_ABORTED' },
      );
    }
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
