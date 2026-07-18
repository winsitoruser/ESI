/**
 * Billing webhook event idempotency (Midtrans retries).
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch { /* */ }

let ready = false;

export async function ensureBillingWebhookIdempotencyTable(db?: any): Promise<boolean> {
  const seq = db || sequelize;
  if (!seq) return false;
  if (ready) return true;
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS saas_billing_webhook_events (
        id UUID PRIMARY KEY,
        idempotency_key VARCHAR(255) NOT NULL UNIQUE,
        order_code VARCHAR(120),
        transaction_status VARCHAR(40),
        status_code VARCHAR(20),
        payload JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    ready = true;
    return true;
  } catch (e: any) {
    console.warn('[billing-idempotency] ensure:', e?.message || e);
    return false;
  }
}

/** Returns true if this event was already processed (caller should no-op). */
export async function claimBillingWebhookEvent(opts: {
  body: Record<string, unknown>;
  db?: any;
}): Promise<{ duplicate: boolean; key: string }> {
  const seq = opts.db || sequelize;
  const body = opts.body || {};
  const orderId = String(body.order_id || '');
  const statusCode = String(body.status_code || '');
  const txStatus = String(body.transaction_status || body.fraud_status || '');
  const sig = String(body.signature_key || '').slice(0, 32);
  const key = [orderId, statusCode, txStatus, sig].filter(Boolean).join(':') || crypto.randomUUID();

  if (!seq) return { duplicate: false, key };

  await ensureBillingWebhookIdempotencyTable(seq);
  try {
    await seq.query(
      `INSERT INTO saas_billing_webhook_events
        (id, idempotency_key, order_code, transaction_status, status_code, payload)
       VALUES (:id, :key, :ocode, :tstat, :scode, CAST(:payload AS jsonb))`,
      {
        replacements: {
          id: crypto.randomUUID(),
          key,
          ocode: orderId || null,
          tstat: txStatus || null,
          scode: statusCode || null,
          payload: JSON.stringify(body),
        },
      },
    );
    return { duplicate: false, key };
  } catch (e: any) {
    const code = e?.parent?.code || e?.original?.code || '';
    if (code === '23505' || /unique/i.test(String(e?.message))) {
      return { duplicate: true, key };
    }
    console.warn('[billing-idempotency] insert:', e?.message || e);
    return { duplicate: false, key };
  }
}
