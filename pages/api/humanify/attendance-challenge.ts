/**
 * GET/POST — mint short-lived attendance nonce (Wave 5 / SEC-ABU-013)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { mintAttendanceNonce } from '@/lib/hris/attendance-anti-cheat';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  const session = (req as any).session;
  const userId = String(session?.user?.id || '');
  const tenantId = String(session?.user?.tenantId || '');
  if (!userId || !tenantId) {
    return res.status(403).json({ success: false, error: 'NO_TENANT' });
  }
  const data = mintAttendanceNonce({ userId, tenantId });
  return res.json({ success: true, data });
}

export default withHQAuth(handler, { module: 'hris' });
