/**
 * Public API v1 — outbound webhook subscriptions
 * GET  /api/v1/webhooks
 * POST /api/v1/webhooks  { url, events?, secret? }  scope: webhooks:manage
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireV1Auth } from '@/lib/saas/v1-auth';
import {
  listOutboundWebhooks,
  registerOutboundWebhook,
} from '@/lib/saas/outbound-webhooks';
import { withObservability } from '@/lib/observability';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const auth = await requireV1Auth(req, res, 'webhooks:manage');
    if (!auth) return;
    const data = await listOutboundWebhooks(auth.tenantId);
    return res.json({ success: true, data, meta: { count: data.length } });
  }

  if (req.method === 'POST') {
    const auth = await requireV1Auth(req, res, 'webhooks:manage');
    if (!auth) return;
    const { url, events, secret } = req.body || {};
    if (!url) return res.status(400).json({ success: false, error: 'url wajib diisi' });
    try {
      const result = await registerOutboundWebhook({
        tenantId: auth.tenantId,
        url: String(url),
        events: Array.isArray(events) ? events.map(String) : undefined,
        secret: secret ? String(secret) : undefined,
      });
      return res.status(201).json({
        success: true,
        data: result,
        message: 'Simpan secret — ditampilkan sekali saja',
      });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e.message || 'Error' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withObservability(handler, 'api/v1/webhooks');
