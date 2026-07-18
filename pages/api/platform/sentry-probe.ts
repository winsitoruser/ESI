/**
 * Platform ops — probe internal monitoring (default) or external Sentry (opt-in).
 * POST /api/platform/sentry-probe
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import { isInternalMonitorMode, logEvent } from '@/lib/observability';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const role = (session.user as any).role;
  if (!isPlatformOperator(role)) {
    return res.status(403).json({ success: false, error: 'Platform operator only' });
  }

  try {
    if (isInternalMonitorMode()) {
      const ev = logEvent({
        level: 'info',
        msg: 'Humanify internal-monitor probe',
        context: {
          transport: 'internal',
          actor: (session.user as any).email,
          probe: true,
        },
      });
      return res.json({
        success: true,
        eventId: ev.id,
        mode: 'internal',
        message: 'Test event stored in ring buffer + Postgres (humanify_obs_events)',
        ui: '/platform/observability',
      });
    }

    const dsn = String(process.env.SENTRY_DSN || '').trim();
    if (!dsn || !/^https:\/\/[^@\s]+@[^/\s]+\/\S+/.test(dsn)) {
      return res.status(400).json({
        success: false,
        error: 'External Sentry enabled but SENTRY_DSN missing/invalid',
        hint: 'Set SENTRY_DSN or switch back to SENTRY_MODE=internal',
      });
    }

    const { createRequire } = require('module') as typeof import('module');
    const requireFromHere = createRequire(__filename);
    const Sentry = requireFromHere('@sentry/node');
    Sentry.init({
      dsn,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
      environment: process.env.NODE_ENV || 'production',
    });
    const eventId = Sentry.captureMessage('Humanify sentry-probe (platform ops)', 'info');
    await Sentry.flush(2000);
    return res.json({
      success: true,
      eventId,
      mode: 'external',
      message: 'Test event sent to Sentry.io',
    });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: e?.message || 'Monitor probe failed',
    });
  }
}
