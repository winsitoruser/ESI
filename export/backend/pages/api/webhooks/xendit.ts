import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
const db = require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { Invoice, PartnerSubscription, IntegrationLog } = db;
    
    // Verify webhook signature
    const webhookToken = process.env.XENDIT_WEBHOOK_TOKEN;
    const callbackToken = req.headers['x-callback-token'];
    
    if (webhookToken && callbackToken !== webhookToken) {
      return res.status(401).json({ error: 'Invalid callback token' });
    }

    const payload = req.body;
    const eventType = payload.status;

    // Log the webhook
    await IntegrationLog.create({
      integrationId: null,
      action: 'webhook',
      status: 'pending',
      message: `Xendit webhook: ${eventType}`,
      requestData: payload,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });

    switch (eventType) {
      case 'PAID':
      case 'SETTLED':
        await handlePaymentSuccess(payload, Invoice, PartnerSubscription);
        break;
      case 'EXPIRED':
        await handlePaymentExpired(payload, Invoice);
        break;
      case 'FAILED':
        await handlePaymentFailed(payload, Invoice);
        break;
      default:
        console.log('Unhandled Xendit event:', eventType);
    }

    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error: any) {
    console.error('Xendit Webhook Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handlePaymentSuccess(payload: any, Invoice: any, PartnerSubscription: any) {
  const { external_id, paid_amount, payment_method } = payload;
  
  const invoice = await Invoice.findOne({ where: { externalId: external_id } });
  if (invoice) {
    await invoice.update({
      status: 'paid',
      paidAt: new Date(),
      paidAmount: paid_amount,
      paymentMethod: payment_method
    });

    // Activate subscription if applicable
    if (invoice.subscriptionId) {
      await PartnerSubscription.update(
        { status: 'active', activatedAt: new Date() },
        { where: { id: invoice.subscriptionId } }
      );
    }
  }
}

async function handlePaymentExpired(payload: any, Invoice: any) {
  const { external_id } = payload;
  await Invoice.update(
    { status: 'expired' },
    { where: { externalId: external_id } }
  );
}

async function handlePaymentFailed(payload: any, Invoice: any) {
  const { external_id, failure_reason } = payload;
  await Invoice.update(
    { status: 'failed', failureReason: failure_reason },
    { where: { externalId: external_id } }
  );
}
