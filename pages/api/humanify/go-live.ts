/**
 * Go-live checklist API
 * GET  — status
 * POST ?action=ack-billing
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { acknowledgeBillingGoLive, getGoLiveStatus } from '@/lib/saas/go-live';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tenantId = (session.user as any).tenantId as string | null;
  if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });

  try {
    if (req.method === 'GET') {
      const data = await getGoLiveStatus(tenantId);
      return res.json({ success: true, data });
    }

    if (req.method === 'POST') {
      const action = String(req.query.action || req.body?.action || '');
      if (action === 'ack-billing') {
        const data = await acknowledgeBillingGoLive(tenantId);
        return res.json({ success: true, data });
      }
      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Error' });
  }
}
