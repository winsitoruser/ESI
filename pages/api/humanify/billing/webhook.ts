/**
 * Midtrans notification webhook for Humanify SaaS orders
 * POST /api/humanify/billing/webhook
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  applyMidtransNotification,
  ensureBillingOrdersTable,
  verifyMidtransWebhook,
} from '@/lib/saas/humanify-billing';
import { claimBillingWebhookEvent } from '@/lib/saas/billing-webhook-idempotency';
import { withObservability, logEvent } from '@/lib/observability';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    await ensureBillingOrdersTable();

    const verified = await verifyMidtransWebhook(req.body || {});
    if (!verified) {
      logEvent({
        level: 'warn',
        msg: 'Billing webhook unverified',
        route: '/api/humanify/billing/webhook',
        method: 'POST',
      });
      return res.status(200).json({ success: true, handled: false });
    }

    const result = await applyMidtransNotification(req.body || {});
    const claim = await claimBillingWebhookEvent({ body: req.body || {} });
    logEvent({
      level: 'info',
      msg: 'Billing webhook processed',
      route: '/api/humanify/billing/webhook',
      method: 'POST',
      context: { orderCode: verified.orderCode, paid: verified.paid, duplicate: claim.duplicate },
    });
    return res.json({ success: true, ...result, duplicate: claim.duplicate });
  } catch (e: any) {
    console.error('[billing/webhook]', e);
    return res.status(400).json({ success: false, error: e.message });
  }
}

export default withObservability(handler, 'humanify/billing/webhook');
