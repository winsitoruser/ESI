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
import { getTenantColumns, parseTenantSettings } from './tenant-schema';
import { countTenantSeats } from './seat-metering';
import {
  getSeatPricingRates,
  normalizeAddons,
  parseOrderAddons,
  persistTenantBillingState,
  quoteSeatSubscription,
  readTenantBillingState,
  parseTenantBillingState,
  type BillingAddons,
  type SeatQuote,
} from './seat-pricing';
import { estimatePartnerCommission, resolvePartnerByCode } from './partners';
import {
  buildHumanifySnapPayload,
  classifyMidtransStatus,
  computeMidtransSignature,
  createSnapTransaction,
  fetchMidtransTransactionStatus,
  getMidtransPublicConfig,
  isMidtransConfigured,
} from './midtrans';
import {
  computeVoucherDiscount,
  findBillingVoucherByCode,
  incrementVoucherRedemption,
} from './billing-vouchers';

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
  for (const col of [
    'ADD COLUMN IF NOT EXISTS partner_code VARCHAR(32)',
    'ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2)',
    'ADD COLUMN IF NOT EXISTS commission_idr INTEGER',
    'ADD COLUMN IF NOT EXISTS payment_type VARCHAR(40)',
    'ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(40)',
    'ADD COLUMN IF NOT EXISTS discount_idr INTEGER',
    'ADD COLUMN IF NOT EXISTS midtrans_transaction_id VARCHAR(80)',
    'ADD COLUMN IF NOT EXISTS billed_seats INTEGER',
    'ADD COLUMN IF NOT EXISTS addons JSONB',
  ]) {
    try {
      await sequelize.query(`ALTER TABLE saas_billing_orders ${col}`);
    } catch { /* already exists */ }
  }
  ordersReady = true;
}

export function quoteAmount(
  planId: string,
  interval: BillingInterval = 'monthly',
  seats = 1,
): number {
  const plan = HUMANIFY_PLANS[normalizeHumanifyPlan(planId)];
  if (!plan || plan.id === 'trial') throw new Error('Pilih paket berbayar (starter/growth/enterprise)');
  return quoteSeatSubscription({ seats, interval }).periodIdr;
}

export async function listBillablePlans() {
  const rates = await getSeatPricingRates();
  const fromMonthly = quoteSeatSubscription({ seats: 1, interval: 'monthly', rates }).periodIdr;
  const fromYearly = quoteSeatSubscription({ seats: 1, interval: 'yearly', rates }).periodIdr;
  return (Object.values(HUMANIFY_PLANS) as typeof HUMANIFY_PLANS[HumanifyPlanId][])
    .filter((p) => p.id !== 'trial')
    .map((p) => {
      const def = (() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { getPlanCatalogOverride } = require('./plan-pricing-store') as typeof import('./plan-pricing-store');
          const o = getPlanCatalogOverride(p.id);
          if (!o) return p;
          return { ...p, ...o, features: o.features?.length ? o.features : p.features };
        } catch {
          return p;
        }
      })();
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        features: def.features,
        maxUsers: def.maxUsers,
        maxEmployees: def.maxEmployees,
        priceMonthlyIdr: fromMonthly,
        priceYearlyIdr: fromYearly,
        pricingModel: 'per_seat' as const,
        seatPricing: rates,
      };
    });
}

export { getMidtransPublicConfig, isMidtransConfigured };

export type CheckoutQuote = {
  plan: HumanifyPlanId;
  planName: string;
  interval: BillingInterval;
  listPriceIdr: number;
  discountIdr: number;
  payableIdr: number;
  voucherCode: string | null;
  voucherLabel: string | null;
  money: ReturnType<typeof splitInclusivePpn>;
  seat: SeatQuote;
  minSeats: number;
  activeEmployees: number;
  change: null | {
    currentPlan: HumanifyPlanId;
    direction: 'upgrade' | 'downgrade' | 'same';
    seats: { users: number; employees: number };
    targetMaxUsers: number;
    targetMaxEmployees: number;
    fits: boolean;
    blockers: string[];
    requiresCheckout: boolean;
  };
  errors: string[];
  warnings: string[];
  canCheckout: boolean;
  canDowngrade: boolean;
  isRenewal: boolean;
};

export async function quoteHumanifyCheckout(opts: {
  tenantId?: string | null;
  plan: string;
  interval?: BillingInterval;
  voucherCode?: string;
  seats?: number;
  addons?: { lms?: boolean; ai?: boolean } | null;
}): Promise<CheckoutQuote> {
  const plan = normalizeHumanifyPlan(opts.plan);
  const interval: BillingInterval = opts.interval === 'yearly' ? 'yearly' : 'monthly';
  const errors: string[] = [];
  const warnings: string[] = [];
  const rates = await getSeatPricingRates();
  const addons = normalizeAddons(opts.addons);

  if (plan === 'trial') {
    errors.push('Pilih paket berbayar: Starter, Growth, atau Enterprise.');
  }

  let activeEmployees = 0;
  let billedSeats: number | null = null;
  let currentAddons: BillingAddons = { lms: false, ai: false };
  if (opts.tenantId) {
    try {
      const usage = await countTenantSeats(opts.tenantId);
      activeEmployees = usage.employees;
    } catch { /* */ }
    try {
      const billing = await readTenantBillingState(opts.tenantId);
      billedSeats = billing.billedSeats;
      currentAddons = billing.addons;
    } catch { /* */ }
  }

  const minSeats = Math.max(rates.minSeats, activeEmployees || 0, 1);
  const requestedRaw = opts.seats != null ? Number(opts.seats) : (billedSeats || minSeats);
  const seats = quoteSeatSubscription({ seats: requestedRaw, interval, addons, rates }).seats;
  if (seats < minSeats) {
    errors.push(`Minimal ${minSeats.toLocaleString('id-ID')} kursi sesuai jumlah karyawan aktif.`);
  }

  const seat = quoteSeatSubscription({
    seats: Math.max(seats, minSeats),
    addons,
    interval,
    rates,
  });

  const listPriceIdr = plan === 'trial' ? 0 : seat.periodIdr;

  let voucherCode: string | null = null;
  let voucherLabel: string | null = null;
  let discountIdr = 0;
  const rawVoucher = String(opts.voucherCode || '').trim();
  if (rawVoucher && plan !== 'trial') {
    const voucher = await findBillingVoucherByCode(rawVoucher);
    if (!voucher) {
      errors.push('Kode voucher tidak ditemukan.');
    } else {
      const applied = computeVoucherDiscount(voucher, listPriceIdr, plan);
      if (!applied.ok) {
        errors.push(applied.error || 'Voucher tidak dapat dipakai.');
      } else {
        voucherCode = voucher.code;
        voucherLabel = voucher.label || voucher.code;
        discountIdr = applied.discountIdr;
      }
    }
  }

  const payableIdr = Math.max(0, Math.round(listPriceIdr - discountIdr));
  const money = splitInclusivePpn(payableIdr);

  let change: CheckoutQuote['change'] = null;
  if (opts.tenantId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { previewPlanChange } = require('./plan-change') as typeof import('./plan-change');
      const preview = await previewPlanChange(opts.tenantId, plan);
      change = {
        currentPlan: preview.currentPlan,
        direction: preview.direction,
        seats: preview.seats,
        targetMaxUsers: preview.targetMaxUsers,
        targetMaxEmployees: preview.targetMaxEmployees,
        fits: preview.fits,
        blockers: preview.blockers,
        requiresCheckout: preview.requiresCheckout,
      };
      if (!preview.fits) errors.push(...preview.blockers);
      if (preview.direction === 'downgrade') {
        warnings.push('Penurunan paket tidak lewat Midtrans — berlaku segera setelah konfirmasi.');
      }
      if (preview.direction === 'same' && plan !== 'trial') {
        const sameAddons = currentAddons.lms === addons.lms && currentAddons.ai === addons.ai;
        const sameSeats = billedSeats === seat.seats;
        if (sameAddons && sameSeats) {
          warnings.push('Paket, kursi, dan add-on ini sudah aktif. Melanjutkan akan memperpanjang langganan.');
        } else {
          warnings.push('Perubahan kursi atau add-on akan ditagih lewat checkout.');
        }
      }
    } catch {
      warnings.push('Tidak bisa cek kuota karyawan — lanjutkan dengan hati-hati.');
    }
  }

  const canDowngrade = Boolean(change?.direction === 'downgrade' && change.fits);
  const canCheckout =
    errors.length === 0 &&
    plan !== 'trial' &&
    change?.direction !== 'downgrade';

  return {
    plan,
    planName: HUMANIFY_PLANS[plan]?.name || plan,
    interval,
    listPriceIdr,
    discountIdr,
    payableIdr,
    voucherCode,
    voucherLabel,
    money,
    seat,
    minSeats,
    activeEmployees,
    change,
    errors,
    warnings,
    canCheckout,
    canDowngrade,
    isRenewal: change?.direction === 'same' && plan !== 'trial',
  };
}

function snapItemsFromSeatQuote(quote: CheckoutQuote): Array<{
  id: string;
  price: number;
  quantity: number;
  name: string;
  category: string;
}> {
  const scale = quote.listPriceIdr > 0 ? quote.payableIdr / quote.listPriceIdr : 1;
  const lines: Array<{ id: string; amount: number; name: string }> = [];
  if (quote.seat.periodCoreIdr > 0) {
    lines.push({
      id: `${quote.plan}-seats`,
      amount: quote.seat.periodCoreIdr,
      name: `Humanify ${quote.planName} · ${quote.seat.seats} karyawan`,
    });
  }
  if (quote.seat.periodLmsIdr > 0) {
    lines.push({
      id: 'addon-lms',
      amount: quote.seat.periodLmsIdr,
      name: `Add-on LMS · ${quote.seat.seats} karyawan`,
    });
  }
  if (quote.seat.periodAiIdr > 0) {
    lines.push({
      id: 'addon-ai',
      amount: quote.seat.periodAiIdr,
      name: 'Add-on AIMAN Copilot',
    });
  }
  const items = lines
    .map((line) => ({
      id: line.id,
      price: Math.max(0, Math.round(line.amount * scale)),
      quantity: 1,
      name: line.name.slice(0, 50),
      category: 'SaaS',
    }))
    .filter((item) => item.price > 0);
  const sum = items.reduce((s, item) => s + item.price, 0);
  const delta = quote.payableIdr - sum;
  if (items.length && delta !== 0) items[0].price = Math.max(0, items[0].price + delta);
  return items;
}

export async function createHumanifyCheckout(opts: {
  tenantId: string;
  plan: string;
  interval?: BillingInterval;
  customerName?: string;
  customerEmail?: string;
  successUrl?: string;
  forceManual?: boolean;
  voucherCode?: string;
  seats?: number;
  addons?: { lms?: boolean; ai?: boolean } | null;
}) {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureBillingOrdersTable();

  const quote = await quoteHumanifyCheckout({
    tenantId: opts.tenantId,
    plan: opts.plan,
    interval: opts.interval,
    voucherCode: opts.voucherCode,
    seats: opts.seats,
    addons: opts.addons,
  });
  if (!quote.canCheckout) {
    throw Object.assign(
      new Error(quote.errors[0] || 'Checkout tidak dapat dilanjutkan. Periksa paket dan kuota karyawan.'),
      { statusCode: 422, quote },
    );
  }

  const plan = quote.plan;
  const interval = quote.interval;
  const listPrice = quote.listPriceIdr;
  const voucherCode = quote.voucherCode;
  const discountIdr = quote.discountIdr;
  const amount = quote.payableIdr;
  const billedSeats = quote.seat.seats;
  const addons = quote.seat.addons;
  const addonsJson = JSON.stringify(addons);

  const [pendingRows] = await sequelize.query(`
    SELECT * FROM saas_billing_orders
    WHERE tenant_id = :tid AND plan = :plan AND interval = :interval
      AND status = 'pending' AND provider = 'midtrans'
      AND created_at > NOW() - INTERVAL '20 hours'
      AND COALESCE(amount_idr, 0) = :amount
      AND COALESCE(billed_seats, 0) = :billedSeats
      AND COALESCE(addons->>'lms', 'false') = :lms
      AND COALESCE(addons->>'ai', 'false') = :ai
    ORDER BY created_at DESC
    LIMIT 1
  `, {
    replacements: {
      tid: opts.tenantId,
      plan,
      interval,
      amount,
      billedSeats,
      lms: String(addons.lms),
      ai: String(addons.ai),
    },
  });
  const existing = pendingRows?.[0];
  if (existing?.snap_token && isMidtransConfigured() && !opts.forceManual) {
    const pub = getMidtransPublicConfig();
    return {
      orderId: existing.id,
      orderCode: existing.order_code,
      plan,
      interval,
      amountIdr: existing.amount_idr,
      listPriceIdr: listPrice,
      discountIdr: existing.discount_idr || 0,
      voucherCode: existing.voucher_code || voucherCode,
      billedSeats,
      addons,
      provider: 'midtrans' as const,
      snapToken: existing.snap_token,
      redirectUrl: existing.redirect_url,
      resumed: true,
      ...pub,
      midtransConfigured: pub.configured,
      partnerCode: existing.partner_code || null,
      commissionPct: existing.commission_pct || null,
      commissionIdr: existing.commission_idr || null,
    };
  }

  const id = crypto.randomUUID();
  const orderCode = `HFY-${plan.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  let partnerCode: string | null = null;
  let commissionPct: number | null = null;
  let commissionIdr: number | null = null;
  try {
    const cols = await getTenantColumns();
    if (cols.has('settings')) {
      const [trows] = await sequelize.query(
        `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
        { replacements: { id: opts.tenantId } },
      );
      const settings = parseTenantSettings(trows?.[0]?.settings);
      const code = String(settings.partner_code || settings.partner?.code || '').trim();
      if (code) {
        const partner = await resolvePartnerByCode(code);
        if (partner) {
          partnerCode = partner.code;
          commissionPct = Number(partner.commission_pct ?? 10);
          commissionIdr = estimatePartnerCommission(amount, commissionPct).commissionIdr;
        }
      }
    }
  } catch {
    /* commission snapshot best-effort */
  }

  let provider: 'midtrans' | 'manual' = 'manual';
  let snapToken: string | null = null;
  let redirectUrl: string | null = null;
  let raw: any = { mode: 'manual' };

  const wantMidtrans = isMidtransConfigured() && !opts.forceManual;
  if (wantMidtrans && amount > 0) {
    provider = 'midtrans';
    const finishUrl = opts.successUrl || 'https://humanify.id/humanify/billing?paid=1';
    const snap = await createSnapTransaction(buildHumanifySnapPayload({
      orderCode,
      amountIdr: amount,
      planId: plan,
      planName: HUMANIFY_PLANS[plan].name,
      interval,
      tenantId: opts.tenantId,
      customerName: opts.customerName,
      customerEmail: opts.customerEmail,
      finishUrl,
      itemDetails: snapItemsFromSeatQuote(quote),
    }));
    snapToken = snap.token;
    redirectUrl = snap.redirectUrl || finishUrl;
    raw = snap.raw;
  } else if (wantMidtrans && amount === 0) {
    raw = { mode: 'voucher_full' };
  }

  await sequelize.query(`
    INSERT INTO saas_billing_orders
      (id, tenant_id, order_code, plan, interval, amount_idr, status, provider, snap_token, redirect_url, raw,
       partner_code, commission_pct, commission_idr, voucher_code, discount_idr, billed_seats, addons)
    VALUES
      (:id, :tenantId, :orderCode, :plan, :interval, :amount, 'pending', :provider, :snapToken, :redirectUrl, CAST(:raw AS jsonb),
       :partnerCode, :commissionPct, :commissionIdr, :voucherCode, :discountIdr, :billedSeats, CAST(:addons AS jsonb))
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
      partnerCode,
      commissionPct,
      commissionIdr,
      voucherCode,
      discountIdr,
      billedSeats,
      addons: addonsJson,
    },
  });

  if (amount === 0) {
    const paid = await activatePaidOrder(orderCode, { raw: { via: 'voucher_full', voucherCode } });
    const pub = getMidtransPublicConfig();
    return {
      orderId: id,
      orderCode,
      plan,
      interval,
      amountIdr: 0,
      listPriceIdr: listPrice,
      discountIdr,
      voucherCode,
      billedSeats,
      addons,
      provider: 'manual' as const,
      snapToken: null,
      redirectUrl: null,
      activated: !paid.alreadyPaid,
      ...pub,
      midtransConfigured: pub.configured,
      partnerCode,
      commissionPct,
      commissionIdr,
    };
  }

  const pub = getMidtransPublicConfig();
  return {
    orderId: id,
    orderCode,
    plan,
    interval,
    amountIdr: amount,
    listPriceIdr: listPrice,
    discountIdr,
    voucherCode,
    billedSeats,
    addons,
    provider,
    snapToken,
    redirectUrl,
    resumed: false,
    ...pub,
    midtransConfigured: pub.configured,
    partnerCode,
    commissionPct,
    commissionIdr,
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

  try {
    await persistTenantBillingState(String(order.tenant_id), {
      billedSeats: order.billed_seats != null ? Number(order.billed_seats) : undefined,
      addons: parseOrderAddons(order.addons),
    });
  } catch { /* settings column optional */ }

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

  if (order.voucher_code) {
    try {
      const voucher = await findBillingVoucherByCode(String(order.voucher_code));
      if (voucher?.id) await incrementVoucherRedemption(voucher.id);
    } catch { /* best-effort */ }
  }

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

  const allowUnsigned =
    String(process.env.HUMANIFY_MIDTRANS_ALLOW_UNSIGNED || '').toLowerCase() === 'true';
  if (!signatureKey) {
    if (process.env.NODE_ENV === 'production' && !allowUnsigned) {
      throw new Error('MIDTRANS_SIGNATURE_REQUIRED');
    }
  } else {
    const expected = computeMidtransSignature(orderId, statusCode, grossAmount, serverKey);
    if (signatureKey !== expected) {
      throw new Error('Invalid Midtrans signature');
    }
  }

  const klass = classifyMidtransStatus(body.transaction_status, body.fraud_status);
  return {
    orderCode: orderId,
    paid: klass === 'paid',
    failed: klass === 'failed',
    pending: klass === 'pending',
    paymentType: body.payment_type || null,
    transactionId: body.transaction_id || null,
    raw: body,
  };
}

export async function applyMidtransNotification(body: any, tenantId?: string | null) {
  const verified = await verifyMidtransWebhook(body);
  if (!verified) return { handled: false as const };
  await ensureBillingOrdersTable();

  if (tenantId) {
    const [owned] = await sequelize.query(
      `SELECT id FROM saas_billing_orders WHERE order_code = :code AND tenant_id = :tid LIMIT 1`,
      { replacements: { code: verified.orderCode, tid: tenantId } },
    );
    if (!owned?.[0]) throw Object.assign(new Error('Order bukan milik tenant Anda'), { statusCode: 403 });
  }

  const extras: Record<string, unknown> = {
    raw: JSON.stringify(verified.raw),
    code: verified.orderCode,
    pt: verified.paymentType,
    txid: verified.transactionId,
  };

  if (verified.paid) {
    try {
      const result = await activatePaidOrder(verified.orderCode, { raw: verified.raw });
      if (verified.paymentType || verified.transactionId) {
        await sequelize.query(`
          UPDATE saas_billing_orders
          SET payment_type = COALESCE(:pt, payment_type),
              midtrans_transaction_id = COALESCE(:txid, midtrans_transaction_id),
              updated_at = NOW()
          WHERE order_code = :code
        `, { replacements: extras });
      }
      return { handled: true as const, paid: true, alreadyPaid: result.alreadyPaid, orderCode: verified.orderCode };
    } catch (e: any) {
      if (/tidak ditemukan/i.test(String(e?.message))) {
        return { handled: false as const, orderCode: verified.orderCode };
      }
      throw e;
    }
  }

  if (verified.failed) {
    await sequelize.query(`
      UPDATE saas_billing_orders
      SET status = 'failed',
          payment_type = COALESCE(:pt, payment_type),
          midtrans_transaction_id = COALESCE(:txid, midtrans_transaction_id),
          updated_at = NOW(),
          raw = COALESCE(raw, '{}'::jsonb) || CAST(:raw AS jsonb)
      WHERE order_code = :code AND status = 'pending'
    `, { replacements: extras });
    return { handled: true as const, paid: false, failed: true, orderCode: verified.orderCode };
  }

  if (verified.pending) {
    await sequelize.query(`
      UPDATE saas_billing_orders
      SET payment_type = COALESCE(:pt, payment_type),
          midtrans_transaction_id = COALESCE(:txid, midtrans_transaction_id),
          updated_at = NOW(),
          raw = COALESCE(raw, '{}'::jsonb) || CAST(:raw AS jsonb)
      WHERE order_code = :code AND status = 'pending'
    `, { replacements: extras });
  }

  return { handled: true as const, paid: false, pending: verified.pending, orderCode: verified.orderCode };
}

export async function syncOrderFromMidtrans(orderCode: string, tenantId?: string | null) {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureBillingOrdersTable();
  const [rows] = await sequelize.query(`
    SELECT * FROM saas_billing_orders
    WHERE order_code = :q OR id::text = :q
    LIMIT 1
  `, { replacements: { q: orderCode } });
  const order = rows?.[0];
  if (!order) throw Object.assign(new Error('Order tidak ditemukan'), { statusCode: 404 });
  if (tenantId && String(order.tenant_id) !== String(tenantId)) {
    throw Object.assign(new Error('Order bukan milik tenant Anda'), { statusCode: 403 });
  }
  if (order.status === 'paid') {
    return { alreadyPaid: true, order, source: 'local' as const };
  }

  const remote = await fetchMidtransTransactionStatus(order.order_code);
  if (!remote) {
    return { alreadyPaid: false, order, source: 'midtrans_unavailable' as const };
  }
  return applyMidtransNotification(remote, tenantId || null);
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
    SELECT id, order_code, plan, interval, amount_idr, status, provider, redirect_url, snap_token,
           paid_at, created_at, payment_type, voucher_code, discount_idr, billed_seats, addons
    FROM saas_billing_orders
    WHERE tenant_id = :tid
    ORDER BY created_at DESC
    LIMIT 20
  `, { replacements: { tid: tenantId } });

  const planId = normalizeHumanifyPlan(cols.has('subscription_plan') ? t.subscription_plan : 'trial');
  const billing = parseTenantBillingState(t.settings);
  const trialEndsAt = cols.has('trial_ends_at') ? (t.trial_ends_at || null) : null;
  let trialDaysLeft: number | null = null;
  if (trialEndsAt) {
    const ms = new Date(trialEndsAt).getTime() - Date.now();
    trialDaysLeft = Math.ceil(ms / 86400000);
  }
  const isTrial =
    planId === 'trial' ||
    String(t.status || '').toLowerCase() === 'trial' ||
    (trialEndsAt && trialDaysLeft != null && trialDaysLeft >= 0 && planId === 'trial');

  return {
    plan: planId,
    planName: HUMANIFY_PLANS[planId].name,
    status: t.status,
    subscriptionStart: t.subscription_start || null,
    subscriptionEnd: t.subscription_end || null,
    trialEndsAt,
    trialDaysLeft,
    trialExpiringSoon: Boolean(isTrial && trialDaysLeft != null && trialDaysLeft <= 7),
    trialExpired: Boolean(trialEndsAt && trialDaysLeft != null && trialDaysLeft < 0),
    billedSeats: billing.billedSeats,
    addons: billing.addons,
    orders: (orders || []).map((o: any) => ({
      ...o,
      snap_token: o.status === 'pending' ? o.snap_token : undefined,
    })),
    ...getMidtransPublicConfig(),
    midtransConfigured: isMidtransConfigured(),
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
    SELECT id, tenant_id, order_code, plan, interval, amount_idr, status, provider, paid_at, created_at,
           billed_seats, addons
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
  const addons = parseOrderAddons(order.addons);
  const billedSeats = order.billed_seats != null ? Number(order.billed_seats) : 0;
  const seatQuote = billedSeats > 0
    ? quoteSeatSubscription({
        seats: billedSeats,
        addons,
        interval: order.interval === 'yearly' ? 'yearly' : 'monthly',
      })
    : null;
  const scale = seatQuote && seatQuote.periodIdr > 0 ? money.subtotal / seatQuote.periodIdr : 1;
  const items = seatQuote
    ? [
        {
          description: `Humanify ${planName} · ${seatQuote.seats} karyawan (${intervalLabel})`,
          quantity: seatQuote.seats,
          unit: 'karyawan',
          unitPrice: Math.round((seatQuote.periodCoreIdr * scale) / Math.max(1, seatQuote.seats)),
          total: Math.round(seatQuote.periodCoreIdr * scale),
        },
        ...(seatQuote.periodLmsIdr > 0 ? [{
          description: `Add-on LMS (${intervalLabel})`,
          quantity: seatQuote.seats,
          unit: 'karyawan',
          unitPrice: Math.round((seatQuote.periodLmsIdr * scale) / Math.max(1, seatQuote.seats)),
          total: Math.round(seatQuote.periodLmsIdr * scale),
        }] : []),
        ...(seatQuote.periodAiIdr > 0 ? [{
          description: `Add-on AIMAN Copilot (${intervalLabel})`,
          quantity: 1,
          unit: 'paket',
          unitPrice: Math.round(seatQuote.periodAiIdr * scale),
          total: Math.round(seatQuote.periodAiIdr * scale),
        }] : []),
      ]
    : [{
        description: `Langganan Humanify ${planName} (${intervalLabel})`,
        quantity: 1,
        unit: 'paket',
        unitPrice: money.subtotal,
        total: money.subtotal,
      }];
  const itemSum = items.reduce((s, i) => s + i.total, 0);
  if (items.length && itemSum !== money.subtotal) {
    items[0].total += money.subtotal - itemSum;
  }

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
    items,
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
