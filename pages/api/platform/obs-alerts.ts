/**
 * Platform ops — evaluate / trigger internal observability alerts.
 * GET  — snapshot (platform ops session)
 * POST — evaluate spike (platform ops OR x-cron-secret)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import { evaluateObsErrorSpike, obsAlertSnapshot } from '@/lib/observability/alerts';

function cronAuthorized(req: NextApiRequest): boolean {
  const secret = String(process.env.OBS_ALERT_CRON_SECRET || process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const header = String(req.headers['x-cron-secret'] || '').trim();
  return header === secret;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!isPlatformOperator((session.user as any).role)) {
      return res.status(403).json({ success: false, error: 'Platform operator only' });
    }
    const data = await obsAlertSnapshot();
    return res.json({ success: true, data });
  }

  if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions);
    const ops =
      session?.user && isPlatformOperator((session.user as any).role);
    if (!ops && !cronAuthorized(req)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const result = await evaluateObsErrorSpike();
    return res.json({ success: true, data: result });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
