/**
 * Humanify SaaS Phase 9 — account health & lifecycle alerts
 * GET — ranked alerts for the current tenant (empty for platform ops / no tenant)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getAccountAlerts, summarizeAlerts } from '@/lib/saas/account-alerts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tenantId = (session.user as any).tenantId || null;
  const role = String((session.user as any).role || '').toLowerCase();
  const isPlatform = ['super_admin', 'superadmin', 'platform_admin'].includes(role);

  if (!tenantId || isPlatform) {
    return res.json({
      success: true,
      data: { alerts: [], counts: { total: 0, critical: 0, warning: 0, info: 0 } },
    });
  }

  try {
    const alerts = await getAccountAlerts(tenantId);
    return res.json({ success: true, data: { alerts, counts: summarizeAlerts(alerts) } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Error' });
  }
}
