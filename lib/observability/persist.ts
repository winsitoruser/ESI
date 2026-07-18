/**
 * Internal monitoring persistence — survives PM2 restart.
 * Best-effort: never throws to callers; table auto-created once.
 */
import type { ObsEvent } from './index';

const RETENTION_DAYS = Number(process.env.OBS_RETENTION_DAYS || 14);
const MAX_ROWS = Number(process.env.OBS_PERSIST_MAX_ROWS || 5000);

let ensured = false;
let ensurePromise: Promise<void> | null = null;
let writeCount = 0;

function getSequelize(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../../lib/sequelize');
  } catch {
    return null;
  }
}

async function ensureTable(): Promise<void> {
  if (ensured) return;
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    const sequelize = getSequelize();
    if (!sequelize) return;
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS humanify_obs_events (
        id UUID PRIMARY KEY,
        at TIMESTAMPTZ NOT NULL,
        level VARCHAR(16) NOT NULL,
        msg TEXT NOT NULL,
        route TEXT,
        method VARCHAR(16),
        status INT,
        duration_ms INT,
        request_id TEXT,
        tenant_id TEXT,
        error_json JSONB,
        context_json JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_humanify_obs_events_at
      ON humanify_obs_events (at DESC)
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_humanify_obs_events_level_at
      ON humanify_obs_events (level, at DESC)
    `);
    ensured = true;
  })().catch(() => {
    ensurePromise = null;
  });
  return ensurePromise;
}

export async function persistObsEvent(ev: ObsEvent): Promise<void> {
  try {
    await ensureTable();
    const sequelize = getSequelize();
    if (!sequelize || !ensured) return;
    await sequelize.query(
      `INSERT INTO humanify_obs_events
        (id, at, level, msg, route, method, status, duration_ms, request_id, tenant_id, error_json, context_json)
       VALUES
        (:id, :at, :level, :msg, :route, :method, :status, :duration_ms, :request_id, :tenant_id, CAST(:error_json AS jsonb), CAST(:context_json AS jsonb))
       ON CONFLICT (id) DO NOTHING`,
      {
        replacements: {
          id: ev.id,
          at: ev.at,
          level: ev.level,
          msg: ev.msg,
          route: ev.route || null,
          method: ev.method || null,
          status: ev.status ?? null,
          duration_ms: ev.durationMs ?? null,
          request_id: ev.requestId || null,
          tenant_id: ev.tenantId || null,
          error_json: JSON.stringify(ev.error || null),
          context_json: JSON.stringify(ev.context || null),
        },
      },
    );
    writeCount += 1;
    if (writeCount % 25 === 0) {
      await pruneObsEvents().catch(() => undefined);
    }
  } catch {
    /* best effort */
  }
}

export async function pruneObsEvents(): Promise<{ deleted: number }> {
  const sequelize = getSequelize();
  if (!sequelize) return { deleted: 0 };
  await ensureTable();
  if (!ensured) return { deleted: 0 };
  const days = Math.max(1, Math.min(365, RETENTION_DAYS | 0));
  const [byAge]: any = await sequelize.query(
    `DELETE FROM humanify_obs_events
     WHERE at < NOW() - INTERVAL '${days} days'
     RETURNING id`,
  );
  const [byCap]: any = await sequelize.query(
    `DELETE FROM humanify_obs_events
     WHERE id IN (
       SELECT id FROM humanify_obs_events
       ORDER BY at DESC
       OFFSET :max
     )
     RETURNING id`,
    { replacements: { max: MAX_ROWS } },
  );
  return { deleted: (byAge?.length || 0) + (byCap?.length || 0) };
}

export async function fetchRecentObsEvents(limit = 50): Promise<ObsEvent[]> {
  try {
    await ensureTable();
    const sequelize = getSequelize();
    if (!sequelize || !ensured) return [];
    const [rows]: any = await sequelize.query(
      `SELECT id, at, level, msg, route, method, status, duration_ms AS "durationMs",
              request_id AS "requestId", tenant_id AS "tenantId",
              error_json AS error, context_json AS context
       FROM humanify_obs_events
       ORDER BY at DESC
       LIMIT :limit`,
      { replacements: { limit } },
    );
    return (rows || []).map((r: any) => ({
      id: r.id,
      at: r.at instanceof Date ? r.at.toISOString() : String(r.at),
      level: r.level,
      msg: r.msg,
      route: r.route || undefined,
      method: r.method || undefined,
      status: r.status ?? undefined,
      durationMs: r.durationMs ?? undefined,
      requestId: r.requestId || undefined,
      tenantId: r.tenantId || undefined,
      error: r.error || undefined,
      context: r.context || undefined,
    }));
  } catch {
    return [];
  }
}

export async function obsPersistStats(): Promise<{
  configured: boolean;
  tableReady: boolean;
  total?: number;
  errors24h?: number;
  retentionDays: number;
}> {
  const base = { configured: true, tableReady: ensured, retentionDays: RETENTION_DAYS };
  try {
    await ensureTable();
    const sequelize = getSequelize();
    if (!sequelize || !ensured) return { ...base, configured: Boolean(sequelize), tableReady: false };
    const [tot]: any = await sequelize.query(`SELECT COUNT(*)::int AS c FROM humanify_obs_events`);
    const [err]: any = await sequelize.query(
      `SELECT COUNT(*)::int AS c FROM humanify_obs_events
       WHERE level = 'error' AND at > NOW() - INTERVAL '24 hours'`,
    );
    return {
      configured: true,
      tableReady: true,
      total: tot?.[0]?.c ?? 0,
      errors24h: err?.[0]?.c ?? 0,
      retentionDays: RETENTION_DAYS,
    };
  } catch {
    return { ...base, tableReady: false };
  }
}
