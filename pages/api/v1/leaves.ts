/**
 * GET /api/v1/leaves — public leave list
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireV1Auth } from '@/lib/saas/v1-auth';
import { listTenantLeavesLean } from '@/lib/saas/humanify-leaves';
import { withObservability } from '@/lib/observability';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const auth = await requireV1Auth(req, res, 'leave:read');
  if (!auth) return;

  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const status = req.query.status ? String(req.query.status) : undefined;
    const rows = await listTenantLeavesLean(auth.tenantId, { limit, status });
    return res.json({
      success: true,
      data: rows,
      meta: { count: rows.length, tenantId: auth.tenantId, keyName: auth.name },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Error' });
  }
}

export default withObservability(handler, 'api/v1/leaves');
