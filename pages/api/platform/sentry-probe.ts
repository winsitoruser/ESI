/**
 * Platform ops — send a test event to Sentry when SENTRY_DSN is configured.
 * Supports SENTRY_MODE=internal (ring-buffer transport) for prod without external DSN.
 * POST /api/platform/sentry-probe
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';

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

  const dsn = String(process.env.SENTRY_DSN || '').trim();
  if (!dsn) {
    return res.status(400).json({
      success: false,
      error: 'SENTRY_DSN not configured',
      hint: 'Set SENTRY_DSN in .env then pm2 restart humanify --update-env',
    });
  }
  if (!/^https:\/\/[^@\s]+@[^/\s]+\/\S+/.test(dsn)) {
    return res.status(400).json({
      success: false,
      error: 'SENTRY_DSN invalid shape',
      hint: 'Expect https://<key>@<host>/<projectId> from Sentry Client Keys',
    });
  }

  const internal =
    String(process.env.SENTRY_MODE || '').toLowerCase() === 'internal' ||
    dsn.includes('@internal.humanify.local/') ||
    dsn.includes('@127.0.0.1/');

  try {
    if (internal) {
      const { logEvent } = await import('@/lib/observability');
      const ev = logEvent({
        level: 'info',
        msg: 'Humanify sentry-probe (internal transport)',
        context: { transport: 'internal', actor: (session.user as any).email },
      });
      return res.json({
        success: true,
        eventId: ev.id,
        mode: 'internal',
        message: 'Test event stored in observability ring buffer (SENTRY_MODE=internal)',
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
      message: 'Test event sent — check Sentry Issues within ~1 minute',
    });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: e?.message || 'Sentry probe failed',
      hint: 'Ensure @sentry/node is installed or use SENTRY_MODE=internal',
    });
  }
}
