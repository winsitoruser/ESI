/**
 * Humanify internal observability (no external Sentry by default).
 *
 * - Structured JSON logs → stdout (PM2)
 * - In-memory ring buffer (live process)
 * - Postgres persistence (`humanify_obs_events`) for errors/warns (survives restart)
 * - External Sentry.io only if HUMANIFY_SENTRY_EXTERNAL=true + valid DSN (opt-in, deferred)
 */
import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import crypto from 'crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ObsEvent {
  id: string;
  at: string;
  level: LogLevel;
  msg: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  requestId?: string;
  tenantId?: string | null;
  error?: { name?: string; message?: string; stack?: string };
  context?: Record<string, unknown>;
}

const RING_SIZE = Number(process.env.OBS_RING_SIZE || 300);
const SLOW_MS = Number(process.env.OBS_SLOW_MS || 2000);

const ring: ObsEvent[] = [];
const counters = {
  requests: 0,
  errors: 0,
  slow: 0,
  byStatus: {} as Record<string, number>,
};
const startedAt = Date.now();

function pushRing(ev: ObsEvent) {
  ring.push(ev);
  if (ring.length > RING_SIZE) ring.splice(0, ring.length - RING_SIZE);
}

function resolveSentryDsn(): string | null {
  const dsn = String(process.env.SENTRY_DSN || '').trim();
  if (!dsn) return null;
  if (!/^https:\/\/[^@\s]+@[^/\s]+\/\S+/.test(dsn)) return null;
  return dsn;
}

/**
 * Production default: internal monitoring only.
 * External Sentry.io requires HUMANIFY_SENTRY_EXTERNAL=true + SENTRY_MODE=external + real DSN.
 */
export function isInternalMonitorMode(): boolean {
  const externalOptIn = String(process.env.HUMANIFY_SENTRY_EXTERNAL || '').toLowerCase() === 'true';
  const mode = String(process.env.SENTRY_MODE || 'internal').toLowerCase();
  const dsn = resolveSentryDsn() || '';
  const looksInternal =
    !dsn ||
    dsn.includes('@internal.humanify.local/') ||
    dsn.includes('@127.0.0.1/');

  if (externalOptIn && mode === 'external' && dsn && !looksInternal) return false;
  return true;
}

let sentryTried = false;
let sentry: any = null;

async function getSentry(): Promise<any> {
  if (sentryTried) return sentry;
  sentryTried = true;

  // Always prefer internal transport unless explicit external opt-in
  if (isInternalMonitorMode()) {
    sentry = {
      captureMessage(msg: string, level: string = 'info') {
        const id = crypto.randomUUID();
        const ev: ObsEvent = {
          id,
          at: new Date().toISOString(),
          level: level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info',
          msg: `[internal-monitor] ${msg}`,
          context: { transport: 'internal' },
        };
        pushRing(ev);
        void persistSafe(ev);
        return id;
      },
      captureException(err: Error, ctx?: any) {
        const id = crypto.randomUUID();
        const ev: ObsEvent = {
          id,
          at: new Date().toISOString(),
          level: 'error',
          msg: err.message || 'exception',
          error: { name: err.name, message: err.message, stack: err.stack },
          context: { transport: 'internal', ...(ctx?.extra || {}) },
        };
        pushRing(ev);
        void persistSafe(ev);
        return id;
      },
      flush: async () => true,
      __internal: true,
    };
    return sentry;
  }

  const dsn = resolveSentryDsn();
  if (!dsn) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createRequire } = require('module') as typeof import('module');
    const requireFromHere = createRequire(__filename);
    const mod = requireFromHere('@sentry/node');
    if (mod?.init) {
      mod.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
      });
      sentry = mod;
    }
  } catch {
    sentry = null;
  }
  return sentry;
}

async function persistSafe(ev: ObsEvent) {
  try {
    const { persistObsEvent } = await import('./persist');
    await persistObsEvent(ev);
  } catch {
    /* ignore */
  }
}

export function logEvent(input: Omit<ObsEvent, 'id' | 'at'> & { at?: string }): ObsEvent {
  const ev: ObsEvent = {
    id: crypto.randomUUID(),
    at: input.at || new Date().toISOString(),
    ...input,
  };
  try {
    const line = JSON.stringify({ src: 'obs', ...ev });
    if (ev.level === 'error') console.error(line);
    else if (ev.level === 'warn') console.warn(line);
    else console.log(line);
  } catch { /* ignore */ }

  const noteworthy =
    ev.level === 'error' ||
    ev.level === 'warn' ||
    Boolean(ev.durationMs && ev.durationMs >= SLOW_MS) ||
    Boolean(ev.context?.transport === 'internal');

  if (noteworthy) {
    pushRing(ev);
    if (ev.level === 'error' || ev.level === 'warn' || ev.context?.transport === 'internal') {
      void persistSafe(ev);
    }
  }

  // Forward only when external Sentry is explicitly enabled
  if (ev.level === 'error' && !isInternalMonitorMode() && resolveSentryDsn()) {
    getSentry().then((s) => {
      try {
        if (!s || s.__internal) return;
        if (ev.error?.stack) {
          const e = new Error(ev.error.message || ev.msg);
          e.name = ev.error.name || 'Error';
          e.stack = ev.error.stack;
          s.captureException(e, { extra: { ...ev.context, route: ev.route, requestId: ev.requestId } });
        } else {
          s.captureMessage(ev.msg, 'error');
        }
      } catch { /* best effort */ }
    });
  }

  return ev;
}

function buildObservabilitySnapshot() {
  const mem = process.memoryUsage();
  const internal = isInternalMonitorMode();
  return {
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    processUptimeSec: Math.round(process.uptime()),
    node: process.version,
    pid: process.pid,
    memory: {
      rssMb: +(mem.rss / 1048576).toFixed(1),
      heapUsedMb: +(mem.heapUsed / 1048576).toFixed(1),
      heapTotalMb: +(mem.heapTotal / 1048576).toFixed(1),
    },
    counters: { ...counters, byStatus: { ...counters.byStatus } },
    monitorMode: internal ? 'internal' : 'external',
    sentry: Boolean(resolveSentryDsn()) || internal,
    sentrySdk: Boolean(sentry),
    sentryMode: internal ? 'internal' : (resolveSentryDsn() ? 'external' : 'off'),
    sentryDsnConfigured: Boolean(resolveSentryDsn()),
    sentryDsnPresentButInvalid: Boolean(String(process.env.SENTRY_DSN || '').trim()) && !resolveSentryDsn(),
    sentryExternalAllowed: String(process.env.HUMANIFY_SENTRY_EXTERNAL || '').toLowerCase() === 'true',
    redisUrl: Boolean(process.env.REDIS_URL),
    rlsRequestBound: String(process.env.HUMANIFY_RLS_REQUEST_BOUND || '').toLowerCase() === 'true',
    rlsMode: String(process.env.HUMANIFY_RLS_MODE || 'soft').toLowerCase() === 'strict' ? 'strict' : 'soft',
    slowMs: SLOW_MS,
    ringSize: RING_SIZE,
    recent: ring.slice(-80).reverse(),
  };
}

export function getObservabilitySnapshot() {
  return buildObservabilitySnapshot();
}

export async function getObservabilitySnapshotAsync() {
  const base = buildObservabilitySnapshot();
  let redis = { configured: false, ok: false } as {
    configured: boolean;
    ok: boolean;
    latencyMs?: number;
    error?: string;
  };
  try {
    const { probeRedis } = await import('@/lib/redis/client');
    redis = await probeRedis();
  } catch {
    /* redis unavailable */
  }

  let persist = {
    configured: false,
    tableReady: false,
    retentionDays: Number(process.env.OBS_RETENTION_DAYS || 14),
  } as Awaited<ReturnType<typeof import('./persist').obsPersistStats>>;
  let recentPersisted: ObsEvent[] = [];
  try {
    const { obsPersistStats, fetchRecentObsEvents } = await import('./persist');
    persist = await obsPersistStats();
    recentPersisted = await fetchRecentObsEvents(50);
  } catch {
    /* ignore */
  }

  // Merge ring + persisted (dedupe by id, prefer newest)
  const byId = new Map<string, ObsEvent>();
  for (const ev of [...recentPersisted, ...base.recent]) {
    if (!byId.has(ev.id)) byId.set(ev.id, ev);
  }
  const recent = Array.from(byId.values())
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 80);

  return { ...base, redis, persist, recent, recentLive: base.recent };
}

export function withObservability(handler: NextApiHandler, routeName?: string): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const t0 = Date.now();
    const requestId = crypto.randomUUID();
    const route = routeName || req.url?.split('?')[0] || 'unknown';
    try {
      res.setHeader('X-Request-Id', requestId);
    } catch { /* headers may be locked */ }

    try {
      await handler(req, res);
    } catch (err: any) {
      counters.errors += 1;
      logEvent({
        level: 'error',
        msg: `Unhandled error in ${route}`,
        route,
        method: req.method,
        requestId,
        durationMs: Date.now() - t0,
        error: { name: err?.name, message: err?.message, stack: err?.stack },
      });
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Internal error', requestId });
      }
      return;
    } finally {
      counters.requests += 1;
      const status = res.statusCode;
      const key = String(Math.floor(status / 100)) + 'xx';
      counters.byStatus[key] = (counters.byStatus[key] || 0) + 1;
      const durationMs = Date.now() - t0;
      if (durationMs >= SLOW_MS) {
        counters.slow += 1;
        logEvent({
          level: 'warn',
          msg: `Slow request ${route} (${durationMs}ms)`,
          route,
          method: req.method,
          status,
          durationMs,
          requestId,
        });
      }
    }
  };
}
