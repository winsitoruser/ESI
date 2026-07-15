/**
 * Health / liveness + readiness probe.
 * Public, unauthenticated — safe for uptime monitors & load balancers.
 *
 *   GET /api/health        → shallow liveness (no DB)
 *   GET /api/health?deep=1 → readiness (pings DB)
 */
import type { NextApiRequest, NextApiResponse } from 'next';

let sequelize: any;
try { sequelize = require('../../lib/sequelize'); } catch {}

const startedAt = Date.now();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const deep = req.query.deep === '1' || req.query.deep === 'true';
  const base = {
    status: 'ok' as 'ok' | 'degraded',
    service: 'humanify',
    time: new Date().toISOString(),
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    env: process.env.NODE_ENV || 'development',
  };

  if (!deep) {
    return res.status(200).json(base);
  }

  let db = false;
  let dbLatencyMs: number | null = null;
  if (sequelize) {
    const t0 = Date.now();
    try {
      await sequelize.query('SELECT 1');
      db = true;
      dbLatencyMs = Date.now() - t0;
    } catch (e: any) {
      db = false;
      console.error('[health] db ping failed:', e?.message);
    }
  }

  const status: 'ok' | 'degraded' = db ? 'ok' : 'degraded';
  return res.status(db ? 200 : 503).json({ ...base, status, db, dbLatencyMs });
}
