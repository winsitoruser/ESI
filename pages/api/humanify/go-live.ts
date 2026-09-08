/**
 * Go-live checklist API
 * GET  — status
 * POST ?action=ack-billing | ack-complete | ack
 * POST body { action, flag } — persist a Day-1 checklist acknowledgement
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  acknowledgeBillingGoLive,
  acknowledgeGoLiveFlag,
  getGoLiveStatus,
  GO_LIVE_ACK_FLAGS,
  type GoLiveFlag,
} from '@/lib/saas/go-live';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';
import { resolveEffectiveTenantId } from '@/lib/hris/resolve-employee-tenant';

async function tenantForGoLive(session: any): Promise<string | null> {
  let sequelize: any;
  try { sequelize = require('@/lib/sequelize'); } catch { return tenantIdFromSession(session); }
  return resolveEffectiveTenantId({
    sequelize,
    session,
    sessionTenantId: tenantIdFromSession(session) || session?.user?.tenantId,
  });
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tenantId = await tenantForGoLive(session);
  if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });

  try {
    if (req.method === 'GET') {
      const data = await getGoLiveStatus(tenantId);
      return res.json({ success: true, data });
    }

    if (req.method === 'POST') {
      const action = String(req.query.action || req.body?.action || '');
      if (action === 'ack-billing') {
        const data = await acknowledgeBillingGoLive(tenantId);
        return res.json({ success: true, data });
      }
      if (action === 'ack-complete') {
        const data = await acknowledgeGoLiveFlag(tenantId, 'completed');
        return res.json({ success: true, data });
      }
      if (action === 'ack') {
        const flag = String(req.body?.flag || '') as GoLiveFlag;
        if (!GO_LIVE_ACK_FLAGS.includes(flag)) {
          return res.status(400).json({ success: false, error: 'Unknown flag' });
        }
        const data = await acknowledgeGoLiveFlag(tenantId, flag);
        return res.json({ success: true, data });
      }
      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    const raw = String(e?.message || 'Error');
    const error = /current transaction is aborted/i.test(raw)
      ? 'Gagal menyimpan checklist. Muat ulang halaman lalu coba lagi.'
      : raw;
    return res.status(500).json({ success: false, error });
  }
}

export default withHQAuth(handler);
