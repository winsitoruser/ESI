/**
 * Phase 18 — lightweight observability foundation (no heavy deps).
 *
 * - Structured JSON logs to stdout (captured by PM2).
 * - In-memory ring buffer of recent errors + slow requests for the platform
 *   ops dashboard (survives until process restart).
 * - Optional Sentry forwarding: only if `@sentry/node` is installed AND
 *   `SENTRY_DSN` is set. Fully dynamic — no hard dependency, no build impact.
 * - `withObservability(handler, name)` wraps an API route: assigns a request id,
 *   times it, logs slow/errored requests, and returns a safe 500 on throw.
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

const RING_SIZE = 200;
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

function isInternalSentryMode(): boolean {
  const mode = String(process.env.SENTRY_MODE || '').toLowerCase();
  if (mode === 'internal') return true;
  const dsn = resolveSentryDsn() || '';
  return dsn.includes('@internal.humanify.local/') || dsn.includes('@127.0.0.1/');
}

let sentryTried = false;
let sentry: any = null;
async function getSentry(): Promise<any> {
  if (sentryTried) return sentry;
  sentryTried = true;
  const dsn = resolveSentryDsn();
  if (!dsn) return null;

  // Internal mode: capture into obs ring (no external Sentry account required)
  if (isInternalSentryMode()) {
    sentry = {
      captureMessage(msg: string, level: string = 'info') {
        const id = crypto.randomUUID();
        pushRing({
          id,
          at: new Date().toISOString(),
          level: level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info',
          msg: `[sentry-internal] ${msg}`,
          context: { transport: 'internal' },
        });
        return id;
      },
      captureException(err: Error, ctx?: any) {
        const id = crypto.randomUUID();
        pushRing({
          id,
          at: new Date().toISOString(),
          level: 'error',
          msg: err.message || 'exception',
          error: { name: err.name, message: err.message, stack: err.stack },
          context: { transport: 'internal', ...(ctx?.extra || {}) },
        });
        return id;
      },
      flush: async () => true,
      __internal: true,
    };
    return sentry;
  }

  try {
    // Optional peer — resolve at runtime only (avoid Next/webpack bundling).
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

export function logEvent(input: Omit<ObsEvent, 'id' | 'at'> & { at?: string }): ObsEvent {
  const ev: ObsEvent = {
    id: crypto.randomUUID(),
    at: input.at || new Date().toISOString(),
    ...input,
  };
  // Structured stdout line
  try {
    const line = JSON.stringify({ src: 'obs', ...ev });
    if (ev.level === 'error') console.error(line);
    else if (ev.level === 'warn') console.warn(line);
    else console.log(line);
  } catch { /* ignore serialization issues */ }

  if (ev.level === 'error' || ev.level === 'warn' || (ev.durationMs && ev.durationMs >= SLOW_MS)) {
    pushRing(ev);
  }

  if (ev.level === 'error' && resolveSentryDsn()) {
    getSentry().then((s) => {
      try {
        if (!s) return;
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
    sentry: Boolean(resolveSentryDsn()),
    sentrySdk: Boolean(sentry),
    sentryMode: isInternalSentryMode() ? 'internal' : (resolveSentryDsn() ? 'external' : 'off'),
    sentryDsnConfigured: Boolean(resolveSentryDsn()),
    sentryDsnPresentButInvalid: Boolean(String(process.env.SENTRY_DSN || '').trim()) && !resolveSentryDsn(),
    redisUrl: Boolean(process.env.REDIS_URL),
    rlsRequestBound: String(process.env.HUMANIFY_RLS_REQUEST_BOUND || '').toLowerCase() === 'true',
    slowMs: SLOW_MS,
    recent: ring.slice(-50).reverse(),
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
    /* redis module unavailable */
  }
  return { ...base, redis };
}

export function withObservability(handler: NextApiHandler, routeName?: string): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const t0 = Date.now();
    const requestId = crypto.randomUUID();
    const route = routeName || req.url?.split('?')[0] || 'unknown';
    try {
      res.setHeader('X-Request-Id', requestId);
    } catch { /* headers may be locked in edge cases */ }

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
