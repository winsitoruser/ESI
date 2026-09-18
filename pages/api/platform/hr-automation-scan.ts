/**
 * Platform cron — scan HR automation rules for all active tenants.
 * POST — x-cron-secret / loopback OR platform operator session
 * GET  — platform operator snapshot (last tenants scanned via query dry)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { assertOpsApiHost } from '@/lib/humanify/assert-ops-host';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import { scanAllActiveTenants } from '@/lib/hris/hr-automation';

function cronAuthorized(req: NextApiRequest): boolean {
  const secret = String(process.env.OBS_ALERT_CRON_SECRET || process.env.CRON_SECRET || '').trim();
  const header = String(req.headers['x-cron-secret'] || '').trim();
  if (secret && header === secret) return true;

  const ip = String(
    (req.socket as any)?.remoteAddress ||
    req.headers['x-real-ip'] ||
    '',
  );
  const loopback =
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1';
  if (loopback && (!secret || !header || header === secret)) return true;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!assertOpsApiHost(req, res, { allowLoopbackCron: true })) return;

  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!isPlatformOperator((session.user as any).role)) {
      return res.status(403).json({ success: false, error: 'Platform operator only' });
    }
    return res.json({
      success: true,
      data: {
        endpoint: 'POST /api/platform/hr-automation-scan',
        scheduleHint: '*/6 hours via ensure-humanify-crons.sh tag hr-automation-scan',
        force: false,
        notifies: 'in_app hris_automation_alerts + SMTP when configured',
      },
    });
  }

  if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions);
    const ops = session?.user && isPlatformOperator((session.user as any).role);
    if (!ops && !cronAuthorized(req)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const force = Boolean(body.force);
    const tenantId = body.tenantId ? String(body.tenantId) : undefined;
    const limit = body.limit != null ? Number(body.limit) : undefined;

    const result = await scanAllActiveTenants({ force, tenantId, limit });
    return res.json({
      success: true,
      data: {
        at: new Date().toISOString(),
        source: ops ? 'ops' : 'cron',
        ...result,
      },
    });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
