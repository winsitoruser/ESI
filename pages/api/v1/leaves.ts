/**
 * Public Humanify API v1 — leaves
 * GET  /api/v1/leaves
 * POST /api/v1/leaves  (scope: leave:write)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireV1Auth } from '@/lib/saas/v1-auth';
import { listTenantLeavesLean, createTenantLeaveLean } from '@/lib/saas/humanify-leaves';
import { dispatchOutboundWebhook } from '@/lib/saas/outbound-webhooks';
import { withObservability } from '@/lib/observability';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
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

  if (req.method === 'POST') {
    const auth = await requireV1Auth(req, res, 'leave:write');
    if (!auth) return;

    const { employeeId, leaveType, startDate, endDate, reason, status } = req.body || {};
    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: employeeId, startDate, endDate',
      });
    }

    try {
      const row = await createTenantLeaveLean(auth.tenantId, {
        employeeId: String(employeeId),
        leaveType: leaveType ? String(leaveType) : undefined,
        startDate: String(startDate),
        endDate: String(endDate),
        reason: reason ? String(reason) : null,
        status: status ? String(status) : undefined,
      });
      dispatchOutboundWebhook(auth.tenantId, 'leave.created', row).catch(() => {});
      return res.status(201).json({
        success: true,
        data: row,
        meta: { tenantId: auth.tenantId, keyName: auth.name },
      });
    } catch (e: any) {
      const statusCode = e?.statusCode === 400 || e?.statusCode === 404 ? e.statusCode : 500;
      return res.status(statusCode).json({ success: false, error: e.message || 'Error' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withObservability(handler, 'api/v1/leaves');
