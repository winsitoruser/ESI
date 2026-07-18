/**
 * Policy library + ESS acknowledgment.
 *   GET  ?action=library     → published policies
 *   GET  ?action=my          → pending + acknowledged for current user
 *   POST ?action=acknowledge → { regulationId }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../lib/middleware/withHQAuth';
import {
  acknowledgePolicy,
  listMyPolicyStatus,
  listPublishedPolicies,
} from '@/lib/hris/policy-ack';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  const tenantId = session?.user?.tenantId || null;
  const userId = session?.user?.id != null ? String(session.user.id) : null;
  const action = String(req.query.action || (req.method === 'GET' ? 'my' : ''));

  try {
    if (req.method === 'GET') {
      if (!tenantId) return res.json({ success: true, data: { pending: [], acknowledged: [], library: [] } });

      if (action === 'library') {
        const library = await listPublishedPolicies(tenantId);
        return res.json({ success: true, data: { library } });
      }

      if (action === 'my' || action === '') {
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
        const data = await listMyPolicyStatus({ tenantId, userId });
        return res.json({ success: true, data });
      }

      return res.status(400).json({ success: false, error: 'action tidak dikenal' });
    }

    if (req.method === 'POST') {
      if (action !== 'acknowledge') {
        return res.status(400).json({ success: false, error: 'Gunakan action=acknowledge' });
      }
      if (!tenantId || !userId) {
        return res.status(403).json({ success: false, error: 'Tenant/user diperlukan' });
      }
      const regulationId = String(req.body?.regulationId || '');
      if (!regulationId) return res.status(400).json({ success: false, error: 'regulationId wajib' });

      const result = await acknowledgePolicy({
        tenantId,
        userId,
        regulationId,
        employeeId: req.body?.employeeId || null,
      });

      try {
        const { logAdminAction } = await import('@/lib/saas/admin-audit');
        await logAdminAction({
          tenantId,
          actorUserId: userId,
          actorEmail: session?.user?.email,
          action: 'policy.acknowledge',
          resourceType: 'company_regulation',
          resourceId: regulationId,
        });
      } catch { /* */ }

      return res.json({ success: true, data: result, message: 'Kebijakan ditandai sudah dibaca' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    const msg = e?.message || 'Policy error';
    const status = /tidak ditemukan|wajib/i.test(msg) ? 400 : 500;
    return res.status(status).json({ success: false, error: msg });
  }
}

export default withHQAuth(handler, { module: 'hris' });
