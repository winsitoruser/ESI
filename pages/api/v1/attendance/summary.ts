/**
 * GET /api/v1/attendance/summary — public attendance summary
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireV1Auth } from '@/lib/saas/v1-auth';
import { getTenantAttendanceSummary } from '@/lib/saas/humanify-attendance';
import { withObservability } from '@/lib/observability';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const auth = await requireV1Auth(req, res, 'attendance:read');
  if (!auth) return;

  try {
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
    const data = await getTenantAttendanceSummary(auth.tenantId, { startDate, endDate });
    return res.json({
      success: true,
      data,
      meta: { tenantId: auth.tenantId, keyName: auth.name },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Error' });
  }
}

export default withObservability(handler, 'api/v1/attendance/summary');
