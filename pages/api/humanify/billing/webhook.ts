/**
 * Midtrans notification webhook for Humanify SaaS orders
 * POST /api/humanify/billing/webhook
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  activatePaidOrder,
  ensureBillingOrdersTable,
  verifyMidtransWebhook,
} from '@/lib/saas/humanify-billing';
import { claimBillingWebhookEvent } from '@/lib/saas/billing-webhook-idempotency';
import { withObservability, logEvent } from '@/lib/observability';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch {}

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

    const claim = await claimBillingWebhookEvent({ body: req.body || {} });
    if (claim.duplicate) {
      logEvent({
        level: 'info',
        msg: 'Billing webhook duplicate skipped',
        route: '/api/humanify/billing/webhook',
        method: 'POST',
        context: { key: claim.key },
      });
      return res.status(200).json({ success: true, handled: true, duplicate: true });
    }

    if (verified.paid) {
      const result = await activatePaidOrder(verified.orderCode, { raw: verified.raw });
      logEvent({
        level: 'info',
        msg: 'Billing webhook paid',
        route: '/api/humanify/billing/webhook',
        method: 'POST',
        context: { orderCode: verified.orderCode, activated: !result.alreadyPaid },
      });
      return res.json({ success: true, handled: true, activated: !result.alreadyPaid, orderCode: verified.orderCode });
    }

    if (verified.failed && sequelize) {
      await sequelize.query(`
        UPDATE saas_billing_orders
        SET status = 'failed', updated_at = NOW(), raw = COALESCE(raw, '{}'::jsonb) || CAST(:raw AS jsonb)
        WHERE order_code = :code AND status = 'pending'
      `, {
        replacements: { code: verified.orderCode, raw: JSON.stringify(verified.raw) },
      });
    }

    return res.json({ success: true, handled: true, paid: false });
  } catch (e: any) {
    console.error('[billing/webhook]', e);
    return res.status(400).json({ success: false, error: e.message });
  }
}

export default withObservability(handler, 'humanify/billing/webhook');
