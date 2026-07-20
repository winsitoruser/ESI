/**
 * Humanify SaaS Phase 12 — alert digest (platform ops)
 * GET  ?limit=  → preview (no email sent)
 * POST ?send=1  → run + email owners (if SMTP configured)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { runAlertDigest } from '@/lib/saas/alert-digest';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const role = (session.user as any).role;
  if (!isPlatformOperator(role)) {
    return res.status(403).json({ success: false, error: 'Platform only' });
  }

  const limit = Number(req.query.limit) || undefined;

  try {
    if (req.method === 'GET') {
      const data = await runAlertDigest({ send: false, limit });
      return res.json({ success: true, data });
    }
    if (req.method === 'POST') {
      const send = req.query.send === '1' || req.query.send === 'true' || req.body?.send === true;
      const data = await runAlertDigest({ send, limit });
      return res.json({ success: true, data });
    }
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[alert-digest]', e);
    return res.status(500).json({ success: false, error: e.message || 'Error' });
  }
}

export default withHQAuth(handler, { module: 'hris' });
