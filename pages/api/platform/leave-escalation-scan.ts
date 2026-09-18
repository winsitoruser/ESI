/**
 * Platform cron — escalate stale leave approvals (escalation_hours SLA).
 * POST — x-cron-secret / loopback OR platform operator
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { assertOpsApiHost } from '@/lib/humanify/assert-ops-host';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import { scanAllActiveTenantsLeaveEscalation } from '@/lib/hris/leave-escalation';

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
    ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
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
        endpoint: 'POST /api/platform/leave-escalation-scan',
        scheduleHint: 'hourly via ensure-humanify-crons.sh tag leave-escalation',
        behavior: 'notify approver+HR; stamp escalated_at; never auto-approve',
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
    const result = await scanAllActiveTenantsLeaveEscalation({
      tenantId: body.tenantId ? String(body.tenantId) : undefined,
      limit: body.limit != null ? Number(body.limit) : undefined,
    });
    return res.json({
      success: true,
      data: { at: new Date().toISOString(), source: ops ? 'ops' : 'cron', ...result },
    });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
