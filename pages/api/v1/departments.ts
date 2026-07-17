/**
 * GET /api/v1/departments — public department list + headcount
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireV1Auth } from '@/lib/saas/v1-auth';
import { listTenantDepartmentsLean } from '@/lib/saas/humanify-departments';
import { withObservability } from '@/lib/observability';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const auth = await requireV1Auth(req, res, 'employees:read');
  if (!auth) return;

  try {
    const data = await listTenantDepartmentsLean(auth.tenantId);
    return res.json({
      success: true,
      data,
      meta: { count: data.length, tenantId: auth.tenantId, keyName: auth.name },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Error' });
  }
}

export default withObservability(handler, 'api/v1/departments');
