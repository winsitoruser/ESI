/**
 * GET /api/humanify/admin-audit — tenant admin audit trail
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { listAdminAudit } from '@/lib/saas/admin-audit';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

const VIEW_ROLES = new Set([
  'owner', 'hq_admin', 'super_admin', 'superadmin', 'platform_admin', 'hr_admin',
]);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const role = String((session.user as any).role || '');
  const tenantId = (session.user as any).tenantId as string | null;
  if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });
  if (!VIEW_ROLES.has(role.toLowerCase()) && !isPlatformOperator(role)) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const rows = await listAdminAudit(tenantId, limit);
    return res.json({ success: true, data: rows });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Error' });
  }
}

export default withHQAuth(handler);
