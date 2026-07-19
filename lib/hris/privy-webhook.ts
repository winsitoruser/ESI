/**
 * Apply Privy webhook / callback status updates to hris_esign_documents.
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch { /* */ }

let ready = false;

export async function ensurePrivyWebhookIdempotencyTable(db?: any): Promise<boolean> {
  const seq = db || sequelize;
  if (!seq) return false;
  if (ready) return true;
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS privy_webhook_events (
        id UUID PRIMARY KEY,
        idempotency_key VARCHAR(255) NOT NULL UNIQUE,
        doc_token VARCHAR(200),
        event_type VARCHAR(80),
        payload JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    ready = true;
    return true;
  } catch (e: any) {
    console.warn('[privy-webhook] ensure:', e?.message || e);
    return false;
  }
}

export function buildPrivyIdempotencyKey(body: Record<string, unknown>): string {
  const header = String(body.idempotency_key || '').trim();
  if (header) return header.slice(0, 255);
  const token = String(body.doc_token || body.document_token || body.token || '');
  const event = String(body.event || body.event_type || body.status || 'update');
  const sig = String(body.signature || body.id || '').slice(0, 40);
  const digest = crypto
    .createHash('sha256')
    .update(JSON.stringify({ token, event, sig }))
    .digest('hex')
    .slice(0, 32);
  return `privy:${token || 'na'}:${digest}`.slice(0, 255);
}

export function mapPrivyStatusToEsign(status: string): string | null {
  const s = String(status || '').toLowerCase();
  if (['completed', 'done', 'signed', 'fully_signed'].includes(s)) return 'completed';
  if (['partial', 'partially_signed', 'in_progress'].includes(s)) return 'partially_signed';
  if (['pending', 'waiting', 'sent'].includes(s)) return 'pending';
  if (['rejected', 'declined', 'cancelled', 'canceled'].includes(s)) return 'rejected';
  if (['expired'].includes(s)) return 'expired';
  return null;
}

export async function claimPrivyWebhookEvent(opts: {
  key: string;
  docToken?: string | null;
  eventType?: string | null;
  body?: Record<string, unknown>;
  db?: any;
}): Promise<{ duplicate: boolean }> {
  const seq = opts.db || sequelize;
  const key = String(opts.key || '').slice(0, 255);
  if (!seq || !key) return { duplicate: false };
  await ensurePrivyWebhookIdempotencyTable(seq);
  try {
    await seq.query(
      `INSERT INTO privy_webhook_events (id, idempotency_key, doc_token, event_type, payload)
       VALUES (:id, :key, :token, :etype, CAST(:payload AS jsonb))`,
      {
        replacements: {
          id: crypto.randomUUID(),
          key,
          token: opts.docToken || null,
          etype: opts.eventType || null,
          payload: JSON.stringify(opts.body || {}),
        },
      },
    );
    return { duplicate: false };
  } catch (e: any) {
    const code = e?.parent?.code || e?.original?.code || '';
    if (code === '23505' || /unique/i.test(String(e?.message))) {
      return { duplicate: true };
    }
    console.warn('[privy-webhook] claim:', e?.message || e);
    return { duplicate: false };
  }
}

/** Update esign row by privy_doc_token. */
export async function applyPrivyDocumentStatus(opts: {
  docToken: string;
  status: string;
  signerEmail?: string | null;
  db?: any;
}): Promise<{ updated: boolean; id?: string }> {
  const seq = opts.db || sequelize;
  if (!seq || !opts.docToken) return { updated: false };

  const mapped = mapPrivyStatusToEsign(opts.status);
  if (!mapped) return { updated: false };

  try {
    const [rows] = await seq.query(
      `SELECT id, signers, status FROM hris_esign_documents WHERE privy_doc_token = :token LIMIT 1`,
      { replacements: { token: opts.docToken } },
    );
    const row = rows?.[0];
    if (!row) return { updated: false };

    let signers = row.signers;
    if (typeof signers === 'string') {
      try { signers = JSON.parse(signers); } catch { signers = []; }
    }
    if (!Array.isArray(signers)) signers = [];

    if (opts.signerEmail) {
      const email = String(opts.signerEmail).toLowerCase();
      signers = signers.map((s: any) =>
        String(s.email || '').toLowerCase() === email
          ? { ...s, signed: true, signedAt: new Date().toISOString() }
          : s,
      );
    }

    const completedAt = mapped === 'completed' ? new Date().toISOString() : null;
    await seq.query(
      `UPDATE hris_esign_documents
       SET status = :status,
           signers = CAST(:signers AS jsonb),
           completed_at = COALESCE(:completedAt::timestamptz, completed_at),
           updated_at = NOW()
       WHERE id = :id`,
      {
        replacements: {
          id: row.id,
          status: mapped,
          signers: JSON.stringify(signers),
          completedAt,
        },
      },
    );
    return { updated: true, id: String(row.id) };
  } catch (e: any) {
    console.warn('[privy-webhook] apply:', e?.message || e);
    return { updated: false };
  }
}

/** Soft verify: if PRIVY_WEBHOOK_SECRET set, require matching header/body signature. */
export function validatePrivyWebhookSecret(
  reqSecret: string | null | undefined,
  envSecret?: string | null,
): boolean {
  const expected = String(envSecret ?? process.env.PRIVY_WEBHOOK_SECRET ?? '').trim();
  if (!expected) return true; // open in sandbox when unset
  return String(reqSecret || '').trim() === expected;
}

/** Ops health — no live Privy API calls. */
export async function getPrivyWebhookHealth(db?: any): Promise<{
  secretConfigured: boolean;
  tableReady: boolean;
  events24h: number;
  lastEventAt: string | null;
  mode: 'open' | 'signed';
}> {
  const secretConfigured = Boolean(process.env.PRIVY_WEBHOOK_SECRET?.trim());
  const seq = db || sequelize;
  const out = {
    secretConfigured,
    tableReady: false,
    events24h: 0,
    lastEventAt: null as string | null,
    mode: (secretConfigured ? 'signed' : 'open') as 'open' | 'signed',
  };
  if (!seq) return out;
  const ok = await ensurePrivyWebhookIdempotencyTable(seq);
  out.tableReady = ok;
  if (!ok) return out;
  try {
    const [rows] = await seq.query(`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS events24h,
        MAX(created_at) AS last_event_at
      FROM privy_webhook_events
    `);
    out.events24h = Number(rows?.[0]?.events24h || 0);
    out.lastEventAt = rows?.[0]?.last_event_at
      ? new Date(rows[0].last_event_at).toISOString()
      : null;
  } catch (e: any) {
    console.warn('[privy-webhook] health:', e?.message || e);
  }
  return out;
}
