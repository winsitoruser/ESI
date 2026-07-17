/**
 * Public Humanify API v1 — employees
 * GET  /api/v1/employees
 * POST /api/v1/employees  (scope: employees:write)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireV1Auth } from '@/lib/saas/v1-auth';
import { listTenantEmployeesLean } from '@/lib/saas/humanify-employees';
import { createTenantEmployeeLean } from '@/lib/saas/humanify-employee-create';
import { dispatchOutboundWebhook } from '@/lib/saas/outbound-webhooks';
import { withObservability } from '@/lib/observability';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const auth = await requireV1Auth(req, res, 'employees:read');
    if (!auth) return;
    try {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
      const rows = await listTenantEmployeesLean(auth.tenantId, limit);
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
    const auth = await requireV1Auth(req, res, 'employees:write');
    if (!auth) return;

    const { name, email, phone, position, department, workLocation, employmentCategory } = req.body || {};
    if (!name || !email || !position) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, position',
      });
    }

    try {
      const { assertEmployeeSeatAvailable } = await import('@/lib/saas/seat-metering');
      const seat = await assertEmployeeSeatAvailable(auth.tenantId, null);
      if (!seat.ok) return res.status(seat.status).json(seat.body);
    } catch { /* fail-open on seat check infra */ }

    try {
      const row = await createTenantEmployeeLean(auth.tenantId, {
        name: String(name),
        email: String(email).toLowerCase(),
        phone: phone ? String(phone) : null,
        position: String(position),
        department: department ? String(department) : null,
        workLocation: workLocation ? String(workLocation) : null,
        employmentCategory: employmentCategory ? String(employmentCategory) : null,
      });

      dispatchOutboundWebhook(auth.tenantId, 'employee.created', row).catch(() => {});

      return res.status(201).json({
        success: true,
        data: row,
        meta: { tenantId: auth.tenantId, keyName: auth.name },
      });
    } catch (e: any) {
      const status = e?.statusCode === 409 ? 409 : 500;
      return res.status(status).json({ success: false, error: e.message || 'Error' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withObservability(handler, 'api/v1/employees');
