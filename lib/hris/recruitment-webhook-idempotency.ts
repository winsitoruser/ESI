/**
 * Recruitment webhook Idempotency-Key (provider retries).
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch { /* */ }

let ready = false;

export async function ensureRecruitmentWebhookIdempotencyTable(db?: any): Promise<boolean> {
  const seq = db || sequelize;
  if (!seq) return false;
  if (ready) return true;
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS recruitment_webhook_events (
        id UUID PRIMARY KEY,
        idempotency_key VARCHAR(255) NOT NULL UNIQUE,
        provider VARCHAR(80),
        tenant_id UUID,
        result JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    ready = true;
    return true;
  } catch (e: any) {
    console.warn('[recruitment-webhook-idempotency] ensure:', e?.message || e);
    return false;
  }
}

export function buildRecruitmentIdempotencyKey(opts: {
  headerKey?: string | null;
  provider?: string | null;
  event?: string | null;
  body?: Record<string, unknown>;
}): string {
  const header = String(opts.headerKey || '').trim().slice(0, 255);
  if (header) return header;

  const body = opts.body || {};
  const provider = String(opts.provider || body.provider || 'unknown');
  const event = String(opts.event || body.event || 'candidate.applied');
  const payload = body.payload && typeof body.payload === 'object' ? body.payload as Record<string, unknown> : body;
  const candidate = (payload.candidate || payload.applicant || payload) as Record<string, unknown>;
  const identity = String(
    candidate.external_id || candidate.id || candidate.email || candidate.full_name || candidate.name || '',
  ).slice(0, 120);
  const digest = crypto
    .createHash('sha256')
    .update(JSON.stringify({ provider, event, identity, tenant: body.tenant_id || '' }))
    .digest('hex')
    .slice(0, 32);
  return `auto:${provider}:${digest}`.slice(0, 255);
}

/** Returns prior result if duplicate; otherwise claims the key. */
export async function claimRecruitmentWebhookEvent(opts: {
  key: string;
  provider?: string | null;
  tenantId?: string | null;
  db?: any;
}): Promise<{ duplicate: boolean; prior?: any }> {
  const seq = opts.db || sequelize;
  const key = String(opts.key || '').slice(0, 255);
  if (!seq || !key) return { duplicate: false };

  await ensureRecruitmentWebhookIdempotencyTable(seq);
  try {
    const [existing] = await seq.query(
      `SELECT result FROM recruitment_webhook_events WHERE idempotency_key = :key LIMIT 1`,
      { replacements: { key } },
    );
    if (existing?.[0]) {
      let prior = existing[0].result;
      if (typeof prior === 'string') {
        try { prior = JSON.parse(prior); } catch { /* */ }
      }
      return { duplicate: true, prior };
    }

    await seq.query(
      `INSERT INTO recruitment_webhook_events (id, idempotency_key, provider, tenant_id, result)
       VALUES (:id, :key, :provider, :tid, '{}'::jsonb)`,
      {
        replacements: {
          id: crypto.randomUUID(),
          key,
          provider: opts.provider || null,
          tid: opts.tenantId || null,
        },
      },
    );
    return { duplicate: false };
  } catch (e: any) {
    const code = e?.parent?.code || e?.original?.code || '';
    if (code === '23505' || /unique/i.test(String(e?.message))) {
      return { duplicate: true };
    }
    console.warn('[recruitment-webhook-idempotency]', e?.message || e);
    return { duplicate: false };
  }
}

export async function storeRecruitmentWebhookResult(opts: {
  key: string;
  result: Record<string, unknown>;
  db?: any;
}): Promise<void> {
  const seq = opts.db || sequelize;
  if (!seq || !opts.key) return;
  try {
    await seq.query(
      `UPDATE recruitment_webhook_events
       SET result = CAST(:result AS jsonb)
       WHERE idempotency_key = :key`,
      { replacements: { key: opts.key, result: JSON.stringify(opts.result || {}) } },
    );
  } catch (e: any) {
    console.warn('[recruitment-webhook-idempotency] store:', e?.message || e);
  }
}
