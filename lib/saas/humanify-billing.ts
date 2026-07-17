/**
 * Humanify SaaS Phase 4 — lean billing (Midtrans Snap + manual confirm)
 * Schema-safe: creates saas_billing_orders on demand; updates tenants.subscription_plan.
 */
import crypto from 'crypto';
import {
  HUMANIFY_PLANS,
  normalizeHumanifyPlan,
  type HumanifyPlanId,
} from './plan-entitlements';
import { getTenantColumns } from './tenant-schema';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type BillingInterval = 'monthly' | 'yearly';

let ordersReady = false;

export async function ensureBillingOrdersTable() {
  if (!sequelize || ordersReady) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_billing_orders (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      order_code VARCHAR(80) NOT NULL UNIQUE,
      plan VARCHAR(32) NOT NULL,
      interval VARCHAR(16) NOT NULL DEFAULT 'monthly',
      amount_idr INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      provider VARCHAR(20) NOT NULL DEFAULT 'manual',
      snap_token TEXT,
      redirect_url TEXT,
      raw JSONB,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_billing_orders_tenant
    ON saas_billing_orders (tenant_id)
  `);
  ordersReady = true;
}

export function listBillablePlans() {
  return (Object.values(HUMANIFY_PLANS) as typeof HUMANIFY_PLANS[HumanifyPlanId][])
    .filter((p) => p.id !== 'trial')
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      features: p.features,
      maxUsers: p.maxUsers,
      maxEmployees: p.maxEmployees,
      priceMonthlyIdr: p.priceMonthlyIdr,
      priceYearlyIdr: Math.round(p.priceMonthlyIdr * 12 * 0.8),
    }));
}

export function quoteAmount(planId: string, interval: BillingInterval = 'monthly'): number {
  const plan = HUMANIFY_PLANS[normalizeHumanifyPlan(planId)];
  if (!plan || plan.id === 'trial') throw new Error('Pilih paket berbayar (starter/growth/enterprise)');
  if (interval === 'yearly') return Math.round(plan.priceMonthlyIdr * 12 * 0.8);
  return plan.priceMonthlyIdr;
}

function midtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY);
}

function midtransIsProduction(): boolean {
  return process.env.MIDTRANS_IS_PRODUCTION === 'true';
}

function snapEndpoint() {
  return midtransIsProduction()
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
}

export async function createHumanifyCheckout(opts: {
  tenantId: string;
  plan: string;
  interval?: BillingInterval;
  customerName?: string;
  customerEmail?: string;
  successUrl?: string;
  forceManual?: boolean;
}) {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureBillingOrdersTable();

  const plan = normalizeHumanifyPlan(opts.plan);
  if (plan === 'trial') throw new Error('Paket trial tidak perlu checkout');
  const interval: BillingInterval = opts.interval === 'yearly' ? 'yearly' : 'monthly';
  const amount = quoteAmount(plan, interval);
  const id = crypto.randomUUID();
  const orderCode = `HFY-${plan.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  let provider: 'midtrans' | 'manual' = 'manual';
  let snapToken: string | null = null;
  let redirectUrl: string | null = null;
  let raw: any = { mode: 'manual' };

  if (midtransConfigured() && !opts.forceManual) {
    provider = 'midtrans';
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const payload = {
      transaction_details: { order_id: orderCode, gross_amount: amount },
      item_details: [{
        id: plan,
        price: amount,
        quantity: 1,
        name: `Humanify ${HUMANIFY_PLANS[plan].name} (${interval})`.slice(0, 50),
      }],
      customer_details: {
        first_name: (opts.customerName || 'Humanify').slice(0, 50),
        email: opts.customerEmail || undefined,
      },
      callbacks: opts.successUrl ? { finish: opts.successUrl } : undefined,
      custom_field1: opts.tenantId,
      custom_field2: plan,
      custom_field3: interval,
    };

    const res = await fetch(snapEndpoint(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${serverKey}:`).toString('base64'),
      },
      body: JSON.stringify(payload),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Midtrans gagal: ${json?.error_messages?.join?.(', ') || JSON.stringify(json)}`);
    }
    snapToken = json.token || null;
    redirectUrl = json.redirect_url || null;
    raw = json;
  }

  await sequelize.query(`
    INSERT INTO saas_billing_orders
      (id, tenant_id, order_code, plan, interval, amount_idr, status, provider, snap_token, redirect_url, raw)
    VALUES
      (:id, :tenantId, :orderCode, :plan, :interval, :amount, 'pending', :provider, :snapToken, :redirectUrl, CAST(:raw AS jsonb))
  `, {
    replacements: {
      id,
      tenantId: opts.tenantId,
      orderCode,
      plan,
      interval,
      amount,
      provider,
      snapToken,
      redirectUrl,
      raw: JSON.stringify(raw),
    },
  });

  return {
    orderId: id,
    orderCode,
    plan,
    interval,
    amountIdr: amount,
    provider,
    snapToken,
    redirectUrl,
    clientKey: process.env.MIDTRANS_CLIENT_KEY || null,
    isProduction: midtransIsProduction(),
    midtransConfigured: midtransConfigured(),
  };
}

export async function activatePaidOrder(orderCodeOrId: string, opts?: { raw?: any }) {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureBillingOrdersTable();

  const [rows] = await sequelize.query(`
    SELECT * FROM saas_billing_orders
    WHERE order_code = :q OR id::text = :q
    LIMIT 1
  `, { replacements: { q: orderCodeOrId } });
  const order = rows?.[0];
  if (!order) throw new Error('Order tidak ditemukan');
  if (order.status === 'paid') {
    return { alreadyPaid: true, order };
  }

  const plan = normalizeHumanifyPlan(order.plan);
  const interval = order.interval === 'yearly' ? 'yearly' : 'monthly';
  const cols = await getTenantColumns();

  const sets: string[] = [`updated_at = NOW()`];
  const replacements: Record<string, unknown> = { id: order.tenant_id, plan };

  if (cols.has('subscription_plan')) sets.push('subscription_plan = :plan');
  if (cols.has('status')) sets.push(`status = 'active'`);
  if (cols.has('is_active')) sets.push('is_active = true');
  if (cols.has('subscription_start')) sets.push('subscription_start = NOW()');
  if (cols.has('subscription_end')) {
    sets.push(
      interval === 'yearly'
        ? `subscription_end = NOW() + INTERVAL '1 year'`
        : `subscription_end = NOW() + INTERVAL '1 month'`,
    );
  }

  await sequelize.query(`UPDATE tenants SET ${sets.join(', ')} WHERE id = :id`, { replacements });

  await sequelize.query(`
    UPDATE saas_billing_orders
    SET status = 'paid', paid_at = NOW(), updated_at = NOW(),
        raw = COALESCE(raw, '{}'::jsonb) || CAST(:raw AS jsonb)
    WHERE id = :oid
  `, {
    replacements: {
      oid: order.id,
      raw: JSON.stringify(opts?.raw || { activatedAt: new Date().toISOString() }),
    },
  });

  return { alreadyPaid: false, order: { ...order, status: 'paid', plan } };
}

export async function verifyMidtransWebhook(body: any) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY missing');

  const orderId = body.order_id;
  const statusCode = body.status_code;
  const grossAmount = body.gross_amount;
  const signatureKey = body.signature_key;
  if (!orderId || !statusCode || !grossAmount) return null;

  const expected = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
  if (signatureKey && signatureKey !== expected) {
    throw new Error('Invalid Midtrans signature');
  }

  const txStatus = body.transaction_status;
  const fraud = body.fraud_status;
  let paid = false;
  if (txStatus === 'settlement') paid = true;
  if (txStatus === 'capture' && fraud === 'accept') paid = true;

  return { orderCode: orderId, paid, failed: ['deny', 'cancel', 'expire', 'failure'].includes(txStatus), raw: body };
}

export async function getTenantBillingStatus(tenantId: string) {
  if (!sequelize) return null;
  await ensureBillingOrdersTable();
  const cols = await getTenantColumns();
  const [tenants] = await sequelize.query(`SELECT * FROM tenants WHERE id = :id LIMIT 1`, {
    replacements: { id: tenantId },
  });
  const t = tenants?.[0];
  if (!t) return null;

  const [orders] = await sequelize.query(`
    SELECT id, order_code, plan, interval, amount_idr, status, provider, redirect_url, paid_at, created_at
    FROM saas_billing_orders
    WHERE tenant_id = :tid
    ORDER BY created_at DESC
    LIMIT 10
  `, { replacements: { tid: tenantId } });

  const planId = normalizeHumanifyPlan(cols.has('subscription_plan') ? t.subscription_plan : 'trial');
  return {
    plan: planId,
    planName: HUMANIFY_PLANS[planId].name,
    status: t.status,
    subscriptionStart: t.subscription_start || null,
    subscriptionEnd: t.subscription_end || null,
    orders: orders || [],
    midtransConfigured: midtransConfigured(),
    clientKey: process.env.MIDTRANS_CLIENT_KEY || null,
  };
}

/** Suspend expired paid subs + expire overdue trials (simple dunning). */
export async function runDunningScan(): Promise<{
  suspended: number;
  trialsExpired: number;
}> {
  if (!sequelize) return { suspended: 0, trialsExpired: 0 };
  const cols = await getTenantColumns();
  let suspended = 0;
  let trialsExpired = 0;

  if (cols.has('subscription_end') && cols.has('status')) {
    const [rows] = await sequelize.query(`
      UPDATE tenants
      SET status = 'suspended',
          ${cols.has('is_active') ? 'is_active = false,' : ''}
          updated_at = NOW()
      WHERE COALESCE(status::text, '') IN ('active')
        AND subscription_end IS NOT NULL
        AND subscription_end < NOW()
        AND COALESCE(subscription_plan, 'trial') NOT IN ('trial', 'free')
      RETURNING id
    `);
    suspended = rows?.length || 0;
  }

  if (cols.has('trial_ends_at') && cols.has('status')) {
    const [rows] = await sequelize.query(`
      UPDATE tenants
      SET status = 'suspended',
          ${cols.has('is_active') ? 'is_active = false,' : ''}
          updated_at = NOW()
      WHERE COALESCE(status::text, '') IN ('trial')
        AND trial_ends_at IS NOT NULL
        AND trial_ends_at < NOW()
        AND COALESCE(subscription_plan, 'trial') IN ('trial', 'free')
      RETURNING id
    `);
    trialsExpired = rows?.length || 0;
  }

  return { suspended, trialsExpired };
}

/** PPN 11% inclusive: amount_idr is gross (customer paid). */
export const HUMANIFY_PPN_RATE = 11;

export function splitInclusivePpn(amountIdr: number): {
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
} {
  const total = Math.max(0, Math.round(Number(amountIdr) || 0));
  const tax = Math.round((total * HUMANIFY_PPN_RATE) / (100 + HUMANIFY_PPN_RATE));
  return { subtotal: total - tax, tax, total, taxRate: HUMANIFY_PPN_RATE };
}

/**
 * Build invoice/kwitansi payload for a paid order owned by tenant.
 * Seller = Naincode/Humanify; buyer = tenant.
 */
export async function getPaidOrderInvoice(tenantId: string, orderCode: string) {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureBillingOrdersTable();
  const cols = await getTenantColumns();

  const [orders] = await sequelize.query(`
    SELECT id, tenant_id, order_code, plan, interval, amount_idr, status, provider, paid_at, created_at
    FROM saas_billing_orders
    WHERE tenant_id = :tid
      AND (order_code = :code OR id::text = :code)
    LIMIT 1
  `, { replacements: { tid: tenantId, code: orderCode } });
  const order = orders?.[0];
  if (!order) throw Object.assign(new Error('Order tidak ditemukan'), { statusCode: 404 });
  if (String(order.status) !== 'paid') {
    throw Object.assign(new Error('Invoice hanya untuk order berstatus paid'), { statusCode: 400 });
  }

  const [tenants] = await sequelize.query(`SELECT * FROM tenants WHERE id = :id LIMIT 1`, {
    replacements: { id: tenantId },
  });
  const t = tenants?.[0] || {};
  const name = String(t.business_name || t.name || t.slug || 'Tenant');
  const addressParts = [t.address, t.city, t.province, t.postal_code].filter(Boolean);
  let npwp: string | null = null;
  try {
    const [kyb] = await sequelize.query(`
      SELECT npwp_number FROM kyb_applications
      WHERE tenant_id = :tid AND npwp_number IS NOT NULL AND npwp_number <> ''
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1
    `, { replacements: { tid: tenantId } });
    npwp = kyb?.[0]?.npwp_number || null;
  } catch {
    /* table optional */
  }

  const money = splitInclusivePpn(order.amount_idr);
  const planId = normalizeHumanifyPlan(order.plan);
  const planName = HUMANIFY_PLANS[planId]?.name || String(order.plan);
  const intervalLabel = order.interval === 'yearly' ? 'Tahunan' : 'Bulanan';
  const paidAt = order.paid_at || order.created_at;

  return {
    orderCode: order.order_code,
    orderId: order.id,
    status: order.status,
    provider: order.provider,
    plan: planId,
    planName,
    interval: order.interval,
    paidAt,
    createdAt: order.created_at,
    money,
    company: {
      name: 'Humanify by Naincode',
      address: 'Jl. Tanah Abang II No.74A, Petojo Sel., Gambir, Jakarta Pusat 10160',
      city: 'Jakarta Pusat',
      province: 'DKI Jakarta',
      phone: '+62 877-8814-1650',
      email: 'billing@humanify.id',
      website: 'https://humanify.id',
      taxId: process.env.HUMANIFY_SELLER_NPWP || undefined,
    },
    customer: {
      name,
      address: addressParts.join(', ') || undefined,
      phone: t.contact_phone || t.business_phone || undefined,
      email: t.contact_email || t.business_email || undefined,
      npwp,
      slug: t.slug || null,
    },
    items: [{
      description: `Langganan Humanify ${planName} (${intervalLabel})`,
      quantity: 1,
      unit: 'paket',
      unitPrice: money.subtotal,
      total: money.subtotal,
    }],
    documentNumber: `INV-${order.order_code}`,
    notes: cols.has('slug') ? `Tenant: ${t.slug}` : undefined,
  };
}

/** Tenants whose trial ends within N days (for platform ops). */
export async function listExpiringTrials(withinDays = 7): Promise<any[]> {
  if (!sequelize) return [];
  const cols = await getTenantColumns();
  if (!cols.has('trial_ends_at')) return [];

  const nameExpr = [
    cols.has('business_name') ? 'business_name' : null,
    cols.has('name') ? 'name' : null,
    cols.has('code') ? 'code' : null,
    `'tenant'`,
  ].filter(Boolean).join(', ');

  const [rows] = await sequelize.query(`
    SELECT id, slug, COALESCE(${nameExpr}) AS name, status, trial_ends_at,
      EXTRACT(DAY FROM (trial_ends_at - NOW()))::int AS days_left
    FROM tenants
    WHERE COALESCE(status::text, '') = 'trial'
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at <= NOW() + (:days)::int * INTERVAL '1 day'
    ORDER BY trial_ends_at ASC
    LIMIT 50
  `, { replacements: { days: withinDays } });
  return rows || [];
}
