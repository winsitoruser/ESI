/**
 * Public recruitment webhook — Dealls, LinkedIn, Indeed, etc.
 * POST /api/humanify/webhooks/recruitment
 * Headers: x-webhook-signature (optional in dev)
 * Body: { provider, event, payload, signature? }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { upsertCandidateFromWebhook, validateWebhookSignature } from '@/lib/hris/webhook-candidate-sync';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { provider, event, payload } = req.body || {};
    const signature = (req.headers['x-webhook-signature'] as string) || req.body?.signature;
    const secretKey = process.env[`${(provider || '').toUpperCase()}_WEBHOOK_SECRET`];
    const rawBody = JSON.stringify(req.body || {});

    if (!validateWebhookSignature(signature, secretKey, rawBody)) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
    }

    const tenantId = req.body?.tenant_id || process.env.DEFAULT_TENANT_ID || null;
    const candidatePayload = payload?.candidate || payload?.applicant || payload;

    if (!candidatePayload?.full_name && !candidatePayload?.name) {
      return res.status(400).json({ success: false, error: 'candidate.full_name required' });
    }

    const syncResult = await upsertCandidateFromWebhook(provider || 'unknown', candidatePayload, tenantId);

    return res.json({
      success: true,
      data: {
        id: `wh-${Date.now()}`,
        provider,
        event: event || 'candidate.applied',
        receivedAt: new Date().toISOString(),
        syncResult,
      },
      message: `Kandidat ${syncResult.candidateName} ${syncResult.action === 'created' ? 'ditambahkan' : 'diperbarui'}`,
    });
  } catch (error: any) {
    console.warn('[recruitment webhook]', error?.message);
    return res.status(500).json({ success: false, error: error.message || 'Webhook processing failed' });
  }
}
