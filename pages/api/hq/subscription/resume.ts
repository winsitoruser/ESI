import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import SubscriptionService from '../../../../lib/services/SubscriptionService';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant not found' });

  try {
    const sub = await SubscriptionService.resume(tenantId);
    return res.status(200).json({ success: true, data: sub });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
}

export default withHQAuth(handler);
