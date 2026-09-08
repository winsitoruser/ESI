/**
 * Midtrans Snap + notification helpers for Humanify SaaS billing.
 * Server key never leaves the server; client key is public (Snap.js).
 */
import crypto from 'crypto';

export const HUMANIFY_MIDTRANS_METHODS = [
  { id: 'qris', label: 'QRIS' },
  { id: 'gopay', label: 'GoPay' },
  { id: 'shopeepay', label: 'ShopeePay' },
  { id: 'bca_va', label: 'BCA VA' },
  { id: 'bni_va', label: 'BNI VA' },
  { id: 'bri_va', label: 'BRI VA' },
  { id: 'permata_va', label: 'Permata VA' },
  { id: 'other_va', label: 'VA lain' },
  { id: 'credit_card', label: 'Kartu' },
] as const;

export const SNAP_ENABLED_PAYMENTS = HUMANIFY_MIDTRANS_METHODS.map((m) => m.id);

export function isMidtransConfigured(): boolean {
  return Boolean(String(process.env['MIDTRANS_SERVER_KEY'] || '').trim());
}

export function midtransIsProduction(): boolean {
  return String(process.env['MIDTRANS_IS_PRODUCTION'] || '').toLowerCase() === 'true';
}

export function snapJsUrl(): string {
  return midtransIsProduction()
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';
}

function snapCreateUrl(): string {
  return midtransIsProduction()
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
}

function midtransApiBase(): string {
  return midtransIsProduction()
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
}

function basicAuthHeader(): string {
  const key = String(process.env['MIDTRANS_SERVER_KEY'] || '');
  return 'Basic ' + Buffer.from(`${key}:`).toString('base64');
}

export function getMidtransPublicConfig() {
  const origin = String(process.env.NEXTAUTH_URL || 'https://humanify.id').replace(/\/$/, '');
  return {
    configured: isMidtransConfigured(),
    clientKey: process.env.MIDTRANS_CLIENT_KEY || null,
    isProduction: midtransIsProduction(),
    snapJsUrl: snapJsUrl(),
    webhookPath: '/api/humanify/billing/webhook',
    webhookUrl: `${origin}/api/humanify/billing/webhook`,
    methods: HUMANIFY_MIDTRANS_METHODS.map((m) => ({ id: m.id, label: m.label })),
  };
}

export function computeMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string | number,
  serverKey: string,
): string {
  return crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
}

export type MidtransTxClass = 'paid' | 'pending' | 'failed' | 'unknown';

export function classifyMidtransStatus(txStatus?: string, fraud?: string): MidtransTxClass {
  const st = String(txStatus || '').toLowerCase();
  const fr = String(fraud || '').toLowerCase();
  if (st === 'settlement') return 'paid';
  if (st === 'capture' && fr === 'challenge') return 'pending';
  if (st === 'capture' && (fr === 'accept' || !fr)) return 'paid';
  if (st === 'pending' || st === 'authorize') return 'pending';
  if (['deny', 'cancel', 'expire', 'failure', 'refund', 'partial_refund'].includes(st)) return 'failed';
  return 'unknown';
}

export async function createSnapTransaction(payload: Record<string, unknown>): Promise<{
  token: string;
  redirectUrl: string;
  raw: any;
}> {
  if (!isMidtransConfigured()) throw new Error('MIDTRANS_SERVER_KEY belum dikonfigurasi');
  const res = await fetch(snapCreateUrl(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: basicAuthHeader(),
    },
    body: JSON.stringify(payload),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json?.token) {
    const msg = Array.isArray(json?.error_messages)
      ? json.error_messages.join(', ')
      : json?.status_message || json?.error || JSON.stringify(json);
    throw new Error(`Midtrans Snap gagal: ${msg}`);
  }
  return {
    token: String(json.token),
    redirectUrl: String(json.redirect_url || ''),
    raw: json,
  };
}

export async function fetchMidtransTransactionStatus(orderId: string): Promise<any | null> {
  if (!isMidtransConfigured() || !orderId) return null;
  const res = await fetch(`${midtransApiBase()}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: 'application/json', Authorization: basicAuthHeader() },
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return json;
}

export function buildHumanifySnapPayload(opts: {
  orderCode: string;
  amountIdr: number;
  planId: string;
  planName: string;
  interval: string;
  tenantId: string;
  customerName?: string;
  customerEmail?: string;
  finishUrl: string;
}): Record<string, unknown> {
  const origin = String(process.env.NEXTAUTH_URL || 'https://humanify.id').replace(/\/$/, '');
  const start = new Date();
  const startTime = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')} ${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}:${String(start.getSeconds()).padStart(2, '0')} +0700`;
  return {
    transaction_details: {
      order_id: opts.orderCode,
      gross_amount: opts.amountIdr,
    },
    item_details: [{
      id: opts.planId,
      price: opts.amountIdr,
      quantity: 1,
      name: `Humanify ${opts.planName} (${opts.interval})`.slice(0, 50),
      category: 'SaaS',
    }],
    customer_details: {
      first_name: (opts.customerName || 'Humanify').slice(0, 50),
      email: opts.customerEmail || undefined,
    },
    credit_card: { secure: true },
    enabled_payments: SNAP_ENABLED_PAYMENTS,
    expiry: { start_time: startTime, unit: 'hour', duration: 24 },
    callbacks: {
      finish: opts.finishUrl,
      error: opts.finishUrl,
      pending: opts.finishUrl,
    },
    notification_url: `${origin}/api/humanify/billing/webhook`,
    custom_field1: opts.tenantId,
    custom_field2: opts.planId,
    custom_field3: opts.interval,
  };
}
