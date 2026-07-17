/**
 * Humanify SaaS Phase 11 — tenant account lifecycle (offboarding + export)
 * GET  ?action=offboarding-status|export
 * POST ?action=request-offboarding|cancel-offboarding
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import {
  buildOffboardingExport,
  cancelOffboarding,
  getOffboardingStatus,
  requestOffboarding,
} from '@/lib/saas/tenant-offboarding';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';

const OWNER_ROLES = new Set([
  'owner', 'hq_admin', 'super_admin', 'superadmin', 'platform_admin',
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const role = String((session.user as any).role || '');
  const tenantId = (session.user as any).tenantId as string | null;
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
      const bundle = await buildOffboardingExport(tenantId);
      try {
        const { logAdminAction } = await import('@/lib/saas/admin-audit');
        await logAdminAction({
          tenantId,
          actorUserId: (session.user as any).id,
          actorEmail: session.user.email,
          action: 'account.export',
          resourceType: 'account',
          meta: { format: String(req.query.format || 'json'), employees: bundle?.employees?.count },
          ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
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
      const data = await requestOffboarding(tenantId, {
        reason: req.body?.reason,
        requestedBy: session.user.email || null,
      });
      try {
        const { logAdminAction } = await import('@/lib/saas/admin-audit');
        await logAdminAction({
          tenantId,
          actorUserId: (session.user as any).id,
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
