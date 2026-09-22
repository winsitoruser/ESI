/**
 * Humanify SaaS Phase 11 — tenant account lifecycle (offboarding + export)
 * GET  ?action=offboarding-status|export
 * POST ?action=request-offboarding|cancel-offboarding
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildOffboardingExport,
  cancelOffboarding,
  getOffboardingStatus,
  requestOffboarding,
} from '@/lib/saas/tenant-offboarding';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { assertStepUp } from '@/lib/saas/step-up-auth';
import { logDataExport } from '@/lib/saas/export-audit';

const OWNER_ROLES = new Set([
  'owner', 'hq_admin', 'super_admin', 'superadmin', 'platform_admin',
]);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const role = String((session.user as any).role || '');
  const tenantId = (session.user as any).tenantId as string | null;
  const userId = String((session.user as any).id || '');
  const action = String(req.query.action || (req.method === 'GET' ? 'offboarding-status' : ''));

  if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });
  if (!OWNER_ROLES.has(role.toLowerCase()) && !isPlatformOperator(role)) {
    return res.status(403).json({ success: false, error: 'Hanya owner dapat mengelola akun' });
  }

  try {
    if (req.method === 'GET' && action === 'offboarding-status') {
      const data = await getOffboardingStatus(tenantId);
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'export') {
      const stepErr = assertStepUp(req, { userId, tenantId, purpose: 'export' });
      if (stepErr) return res.status(403).json({ success: false, ...stepErr });

      const bundle = await buildOffboardingExport(tenantId);
      try {
        await logDataExport({
          req,
          tenantId,
          actorUserId: userId,
          actorEmail: session.user.email,
          exportType: 'account',
          format: String(req.query.format || 'json'),
          rowCount: Number(bundle?.employees?.count || 0),
          resourceType: 'account',
          meta: { employees: bundle?.employees?.count },
        });
      } catch { /* ignore */ }
      const format = String(req.query.format || 'json');
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="humanify-account-export.csv"`);
        return res.status(200).send(bundle.employees.csv);
      }
      return res.json({ success: true, data: bundle });
    }

    if (req.method === 'POST' && action === 'request-offboarding') {
      const stepErr = assertStepUp(req, { userId, tenantId, purpose: 'offboarding' });
      if (stepErr) return res.status(403).json({ success: false, ...stepErr });

      const data = await requestOffboarding(tenantId, {
        reason: req.body?.reason,
        requestedBy: session.user.email || null,
      });
      try {
        const { logAdminAction } = await import('@/lib/saas/admin-audit');
        await logAdminAction({
          tenantId,
          actorUserId: userId,
          actorEmail: session.user.email,
          action: 'account.offboard_request',
          resourceType: 'account',
          meta: { reason: req.body?.reason || null },
        });
      } catch { /* ignore */ }
      return res.json({ success: true, data, message: 'Penutupan akun dijadwalkan. Data dapat diekspor selama masa tenggang.' });
    }

    if (req.method === 'POST' && action === 'cancel-offboarding') {
      const data = await cancelOffboarding(tenantId);
      return res.json({ success: true, data, message: 'Penutupan akun dibatalkan.' });
    }

    return res.status(400).json({ success: false, error: 'Action tidak dikenal' });
  } catch (e: any) {
    console.error('[account]', e);
    return res.status(500).json({ success: false, error: e.message || 'Gagal' });
  }
}

export default withHQAuth(handler);
