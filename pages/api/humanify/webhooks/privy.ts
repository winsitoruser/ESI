/**
 * Public Privy e-sign webhook.
 * POST /api/humanify/webhooks/privy
 * Headers: x-privy-signature or x-webhook-secret (optional if PRIVY_WEBHOOK_SECRET unset)
 * Body: { doc_token, status|event, signer_email?, idempotency_key? }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  applyPrivyDocumentStatus,
  buildPrivyIdempotencyKey,
  claimPrivyWebhookEvent,
  validatePrivyWebhookSecret,
} from '@/lib/hris/privy-webhook';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const secret =
      (req.headers['x-privy-signature'] as string) ||
      (req.headers['x-webhook-secret'] as string) ||
      req.body?.signature;
    if (!validatePrivyWebhookSecret(secret)) {
      return res.status(401).json({ success: false, error: 'Invalid webhook secret' });
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const docToken = String(
      body.doc_token || body.document_token || body.token || body.docToken || '',
    ).trim();
    const status = String(body.status || body.event || body.event_type || '').trim();
    const signerEmail = body.signer_email || body.signerEmail || body.email || null;

    if (!docToken) {
      return res.status(400).json({ success: false, error: 'doc_token required' });
    }

    const key = buildPrivyIdempotencyKey({
      ...body,
      idempotency_key: req.headers['idempotency-key'] || body.idempotency_key,
    });
    const claim = await claimPrivyWebhookEvent({
      key,
      docToken,
      eventType: status,
      body,
    });
    if (claim.duplicate) {
      return res.status(200).json({ success: true, duplicate: true });
    }

    const result = await applyPrivyDocumentStatus({
      docToken,
      status: status || 'pending',
      signerEmail: signerEmail ? String(signerEmail) : null,
    });

    return res.json({
      success: true,
      data: {
        updated: result.updated,
        id: result.id || null,
        docToken,
        idempotencyKey: key,
      },
    });
  } catch (e: any) {
    console.warn('[privy webhook]', e?.message || e);
    return res.status(500).json({ success: false, error: e.message || 'Webhook failed' });
  }
}
