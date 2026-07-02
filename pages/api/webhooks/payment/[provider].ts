import type { NextApiRequest, NextApiResponse } from 'next';
import { getPaymentGateway, PaymentProvider } from '../../../../lib/services/payment';
import SubscriptionService from '../../../../lib/services/SubscriptionService';

export const config = {
  api: { bodyParser: true }
};

/**
 * Generic webhook handler for payment providers.
 *
 * POST /api/webhooks/payment/midtrans
 * POST /api/webhooks/payment/xendit
 *
 * Each adapter verifies the signature/token and normalizes the event before
 * SubscriptionService applies it to the invoice + subscription.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const provider = (req.query.provider as string)?.toLowerCase() as PaymentProvider;
  if (!provider || !['midtrans', 'xendit', 'manual'].includes(provider)) {
    return res.status(400).json({ success: false, error: 'Unknown provider' });
  }

  try {
    const gateway = getPaymentGateway(provider);
    const event = await gateway.verifyWebhook({
      headers: req.headers as any,
      body: req.body
    });

    if (!event) {
      return res.status(200).json({ success: true, handled: false });
    }

    const result = await SubscriptionService.handlePaymentEvent(event);
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error(`Webhook error (${provider}):`, error);
    return res.status(400).json({ success: false, error: error.message });
  }
}
