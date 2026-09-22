/**
 * GET — current session security view (SEC-IAM-014 light)
 * Lists this device's session metadata; full multi-device revoke needs Redis session store.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { clientIpFromReq, clientUaFromReq } from '@/lib/saas/risk-based-auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  return res.json({
    success: true,
    data: {
      current: {
        userId: session.user.id,
        email: session.user.email,
        role: (session.user as any).role,
        tenantId: (session.user as any).tenantId || null,
        ip: clientIpFromReq(req),
        userAgent: clientUaFromReq(req),
        mfaSetupRequired: Boolean((session.user as any).mfaSetupRequired),
      },
      note: 'Multi-device revoke membutuhkan session store terpusat; gunakan ganti password untuk invalidate semua JWT (password_changed_at).',
    },
  });
}

export default withHQAuth(handler);
