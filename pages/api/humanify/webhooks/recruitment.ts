/**
 * Public recruitment webhook — Dealls, LinkedIn, Indeed, etc.
 * POST /api/humanify/webhooks/recruitment
 * Headers: x-webhook-signature (optional in dev), Idempotency-Key (recommended)
 * Body: { provider, event, payload, signature?, tenant_id? }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { upsertCandidateFromWebhook, validateWebhookSignature } from '@/lib/hris/webhook-candidate-sync';
import {
  buildRecruitmentIdempotencyKey,
  claimRecruitmentWebhookEvent,
  storeRecruitmentWebhookResult,
} from '@/lib/hris/recruitment-webhook-idempotency';

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

    const idemKey = buildRecruitmentIdempotencyKey({
      headerKey: String(req.headers['idempotency-key'] || '').trim(),
      provider,
      event,
      body: req.body || {},
    });

    const claim = await claimRecruitmentWebhookEvent({
      key: idemKey,
      provider: provider || 'unknown',
      tenantId,
    });
    if (claim.duplicate) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        ...(claim.prior && typeof claim.prior === 'object' ? claim.prior : {}),
      });
    }

    const syncResult = await upsertCandidateFromWebhook(provider || 'unknown', candidatePayload, tenantId);

    const responseBody = {
      success: true,
      data: {
        id: `wh-${Date.now()}`,
        provider,
        event: event || 'candidate.applied',
        receivedAt: new Date().toISOString(),
        syncResult,
        idempotencyKey: idemKey,
      },
      message: `Kandidat ${syncResult.candidateName} ${syncResult.action === 'created' ? 'ditambahkan' : 'diperbarui'}`,
    };

    await storeRecruitmentWebhookResult({ key: idemKey, result: responseBody });

    return res.json(responseBody);
  } catch (error: any) {
    console.warn('[recruitment webhook]', error?.message);
    return res.status(500).json({ success: false, error: error.message || 'Webhook processing failed' });
  }
}
