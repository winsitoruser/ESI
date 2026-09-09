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

function envTrim(name: string): string {
  return String(process.env[name] || '').trim();
}

export function midtransServerKey(): string {
  return envTrim('MIDTRANS_SERVER_KEY');
}

export function midtransClientKey(): string {
  return envTrim('MIDTRANS_CLIENT_KEY');
}

export function isMidtransConfigured(): boolean {
  return Boolean(midtransServerKey());
}

/**
 * Production if:
 * - MIDTRANS_IS_PRODUCTION=true, or
 * - server key is a live Midtrans key (`Mid-server-…`, not `SB-Mid-server-…`)
 * Sandbox keys (`SB-…`) always stay on sandbox even if the flag is true.
 */
export function midtransIsProduction(): boolean {
  const key = midtransServerKey();
  if (/^SB[-_]/i.test(key) || /^SB-Mid-/i.test(key)) return false;
  const flag = envTrim('MIDTRANS_IS_PRODUCTION').toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') {
    return /^Mid-server-/i.test(key);
  }
  return /^Mid-server-/i.test(key);
}

export function snapJsUrl(): string {
  return midtransIsProduction()
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';
}

export function snapCreateUrl(): string {
  const override = envTrim('MIDTRANS_SNAP_URL');
  if (override) return override.replace(/\/$/, '');
  return midtransIsProduction()
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
}

export function midtransApiBase(): string {
  return midtransIsProduction()
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
}

function basicAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${midtransServerKey()}:`).toString('base64');
}

function maskSecret(value: string, keep = 4): string | null {
  const v = String(value || '').trim();
  if (!v) return null;
  if (v.length <= keep) return '••••';
  return `${v.slice(0, 3)}…${v.slice(-keep)}`;
}

export function getIrisConfig() {
  const prod = midtransIsProduction();
  const apiKey = prod
    ? (envTrim('MIDTRANS_IRIS_KEY_PROD') || envTrim('MIDTRANS_IRIS_API_KEY') || envTrim('MIDTRANS_IRIS_KEY'))
    : (envTrim('MIDTRANS_IRIS_KEY_DEV') || envTrim('MIDTRANS_IRIS_API_KEY') || envTrim('MIDTRANS_IRIS_KEY'));
  const merchantKey = prod
    ? (envTrim('MIDTRANS_IRIS_MERCHANT_KEY_PROD') || envTrim('MIDTRANS_IRIS_MERCHANT_KEY'))
    : (envTrim('MIDTRANS_IRIS_MERCHANT_KEY_DEV') || envTrim('MIDTRANS_IRIS_MERCHANT_KEY'));
  return {
    configured: Boolean(apiKey),
    merchantConfigured: Boolean(merchantKey),
    isProduction: prod,
    apiKey,
    merchantKey,
    irisApiBase: prod
      ? 'https://app.midtrans.com/iris'
      : 'https://app.sandbox.midtrans.com/iris',
  };
}

export function getIrisPublicConfig() {
  const iris = getIrisConfig();
  return {
    configured: iris.configured,
    merchantConfigured: iris.merchantConfigured,
    isProduction: iris.isProduction,
    irisApiBase: iris.irisApiBase,
  };
}

export function getMidtransPublicConfig() {
  const origin = String(process.env.NEXTAUTH_URL || 'https://humanify.id').replace(/\/$/, '');
  const iris = getIrisPublicConfig();
  return {
    configured: isMidtransConfigured(),
    clientKey: midtransClientKey() || null,
    isProduction: midtransIsProduction(),
    snapJsUrl: snapJsUrl(),
    snapCreateUrl: snapCreateUrl(),
    webhookPath: '/api/humanify/billing/webhook',
    webhookUrl: `${origin}/api/humanify/billing/webhook`,
    finishUrl: `${origin}/humanify/billing?paid=1`,
    serverKeyFingerprint: maskSecret(midtransServerKey()),
    clientKeyFingerprint: maskSecret(midtransClientKey()),
    iris,
    methods: HUMANIFY_MIDTRANS_METHODS.map((m) => ({ id: m.id, label: m.label })),
  };
}

/** Cheap auth check — never returns secrets. */
export async function probeMidtransHealth(): Promise<{
  configured: boolean;
  isProduction: boolean;
  reachable: boolean | null;
  status: number | null;
  detail: string;
}> {
  const configured = isMidtransConfigured();
  const isProduction = midtransIsProduction();
  if (!configured) {
    return { configured: false, isProduction, reachable: false, status: null, detail: 'MIDTRANS_SERVER_KEY kosong' };
  }
  try {
    const res = await fetch(
      `${midtransApiBase()}/v2/${encodeURIComponent('HFY-HEALTH-PROBE')}/status`,
      { headers: { Accept: 'application/json', Authorization: basicAuthHeader() } },
    );
    const reachable = res.status !== 401 && res.status !== 403;
    return {
      configured: true,
      isProduction,
      reachable,
      status: res.status,
      detail: reachable
        ? (isProduction ? 'Live Midtrans merespons' : 'Sandbox Midtrans merespons')
        : 'Key ditolak (401/403) — cek server key vs environment',
    };
  } catch (e: any) {
    return {
      configured: true,
      isProduction,
      reachable: false,
      status: null,
      detail: e?.message || 'Tidak bisa menghubungi Midtrans',
    };
  }
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
  itemDetails?: Array<{ id: string; price: number; quantity: number; name: string; category?: string }>;
}): Record<string, unknown> {
  const origin = String(process.env.NEXTAUTH_URL || 'https://humanify.id').replace(/\/$/, '');
  const start = new Date();
  const startTime = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')} ${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}:${String(start.getSeconds()).padStart(2, '0')} +0700`;
  const defaultItem = [{
    id: opts.planId,
    price: Math.round(opts.amountIdr),
    quantity: 1,
    name: `Humanify ${opts.planName} (${opts.interval})`.slice(0, 50),
    category: 'SaaS',
  }];
  const itemDetails = Array.isArray(opts.itemDetails) && opts.itemDetails.length > 0
    ? opts.itemDetails.map((item) => ({
        id: item.id,
        price: Math.round(item.price),
        quantity: item.quantity || 1,
        name: String(item.name || '').slice(0, 50),
        category: item.category || 'SaaS',
      }))
    : defaultItem;
  return {
    transaction_details: {
      order_id: opts.orderCode,
      gross_amount: Math.round(opts.amountIdr),
    },
    item_details: itemDetails,
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
