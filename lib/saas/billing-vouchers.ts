/**
 * Humanify SaaS — billing promo vouchers / discount codes (ops-managed)
 */
import { randomBytes, randomUUID } from 'crypto';
import type { HumanifyPlanId } from './plan-entitlements';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export type VoucherDiscountType = 'percent' | 'fixed';

export interface BillingVoucher {
  id: string;
  code: string;
  label: string | null;
  discount_type: VoucherDiscountType;
  discount_value: number;
  max_discount_idr: number | null;
  min_amount_idr: number;
  applicable_plans: string[] | null;
  max_redemptions: number | null;
  redemption_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function ensureBillingVouchersTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_billing_vouchers (
      id UUID PRIMARY KEY,
      code VARCHAR(40) NOT NULL UNIQUE,
      label VARCHAR(120),
      discount_type VARCHAR(16) NOT NULL DEFAULT 'percent',
      discount_value INTEGER NOT NULL,
      max_discount_idr INTEGER,
      min_amount_idr INTEGER NOT NULL DEFAULT 0,
      applicable_plans JSONB,
      max_redemptions INTEGER,
      redemption_count INTEGER NOT NULL DEFAULT 0,
      valid_from TIMESTAMPTZ,
      valid_until TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT true,
      note TEXT,
      created_by VARCHAR(160),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_billing_vouchers_active
    ON saas_billing_vouchers (is_active, code)
  `);
  ready = true;
}

function genCode(prefix = 'HF'): string {
  return `${prefix}${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function listBillingVouchers(limit = 50): Promise<BillingVoucher[]> {
  if (!sequelize) return [];
  await ensureBillingVouchersTable();
  const lim = Math.min(200, Math.max(1, limit));
  const [rows] = await sequelize.query(
    `SELECT * FROM saas_billing_vouchers ORDER BY created_at DESC LIMIT :lim`,
    { replacements: { lim } },
  );
  return (rows || []) as BillingVoucher[];
}

export async function createBillingVoucher(input: {
  code?: string;
  label?: string;
  discountType?: VoucherDiscountType;
  discountValue: number;
  maxDiscountIdr?: number | null;
  minAmountIdr?: number;
  applicablePlans?: string[] | null;
  maxRedemptions?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  note?: string | null;
  createdBy?: string | null;
}): Promise<BillingVoucher> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureBillingVouchersTable();

  const discountType: VoucherDiscountType = input.discountType === 'fixed' ? 'fixed' : 'percent';
  const discountValue = Math.max(0, Math.floor(Number(input.discountValue) || 0));
  if (discountType === 'percent' && (discountValue < 1 || discountValue > 100)) {
    throw new Error('Diskon persen harus 1–100');
  }
  if (discountType === 'fixed' && discountValue < 1000) {
    throw new Error('Diskon fixed minimal Rp1.000');
  }

  const code = String(input.code || genCode()).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (code.length < 4) throw new Error('Kode voucher minimal 4 karakter');

  const uuid = randomUUID();

  await sequelize.query(
    `INSERT INTO saas_billing_vouchers (
      id, code, label, discount_type, discount_value, max_discount_idr, min_amount_idr,
      applicable_plans, max_redemptions, valid_from, valid_until, note, created_by
    ) VALUES (
      :id, :code, :label, :discountType, :discountValue, :maxDiscountIdr, :minAmountIdr,
      CAST(:applicablePlans AS jsonb), :maxRedemptions, :validFrom, :validUntil, :note, :createdBy
    )`,
    {
      replacements: {
        id: uuid,
        code,
        label: input.label || null,
        discountType,
        discountValue,
        maxDiscountIdr: input.maxDiscountIdr ?? null,
        minAmountIdr: Math.max(0, Math.floor(Number(input.minAmountIdr) || 0)),
        applicablePlans: input.applicablePlans?.length ? JSON.stringify(input.applicablePlans) : null,
        maxRedemptions: input.maxRedemptions ?? null,
        validFrom: input.validFrom || null,
        validUntil: input.validUntil || null,
        note: input.note || null,
        createdBy: input.createdBy || null,
      },
    },
  );

  const [rows] = await sequelize.query(
    `SELECT * FROM saas_billing_vouchers WHERE id = :id LIMIT 1`,
    { replacements: { id: uuid } },
  );
  return rows[0] as BillingVoucher;
}

export async function setBillingVoucherActive(id: string, isActive: boolean): Promise<BillingVoucher | null> {
  if (!sequelize) return null;
  await ensureBillingVouchersTable();
  await sequelize.query(
    `UPDATE saas_billing_vouchers SET is_active = :isActive, updated_at = NOW() WHERE id = :id`,
    { replacements: { id, isActive } },
  );
  const [rows] = await sequelize.query(
    `SELECT * FROM saas_billing_vouchers WHERE id = :id LIMIT 1`,
    { replacements: { id } },
  );
  return rows?.[0] || null;
}

export function computeVoucherDiscount(
  voucher: BillingVoucher,
  amountIdr: number,
  plan?: string | null,
): { ok: boolean; discountIdr: number; error?: string } {
  if (!voucher.is_active) return { ok: false, discountIdr: 0, error: 'Voucher nonaktif' };
  if (voucher.max_redemptions != null && voucher.redemption_count >= voucher.max_redemptions) {
    return { ok: false, discountIdr: 0, error: 'Kuota redeem habis' };
  }
  const now = Date.now();
  if (voucher.valid_from && new Date(voucher.valid_from).getTime() > now) {
    return { ok: false, discountIdr: 0, error: 'Voucher belum berlaku' };
  }
  if (voucher.valid_until && new Date(voucher.valid_until).getTime() < now) {
    return { ok: false, discountIdr: 0, error: 'Voucher kedaluwarsa' };
  }
  if (amountIdr < (voucher.min_amount_idr || 0)) {
    return { ok: false, discountIdr: 0, error: 'Di bawah minimum belanja' };
  }
  if (Array.isArray(voucher.applicable_plans) && voucher.applicable_plans.length && plan) {
    const p = String(plan).toLowerCase();
    if (!voucher.applicable_plans.map((x) => String(x).toLowerCase()).includes(p)) {
      return { ok: false, discountIdr: 0, error: 'Tidak berlaku untuk paket ini' };
    }
  }

  let discount = 0;
  if (voucher.discount_type === 'percent') {
    discount = Math.floor((amountIdr * voucher.discount_value) / 100);
    if (voucher.max_discount_idr != null) discount = Math.min(discount, voucher.max_discount_idr);
  } else {
    discount = voucher.discount_value;
  }
  discount = Math.max(0, Math.min(discount, amountIdr));
  return { ok: true, discountIdr: discount };
}

export async function findBillingVoucherByCode(code: string): Promise<BillingVoucher | null> {
  if (!sequelize) return null;
  const raw = String(code || '').trim();
  if (!raw) return null;
  await ensureBillingVouchersTable();
  const [rows] = await sequelize.query(
    `SELECT * FROM saas_billing_vouchers WHERE UPPER(code) = UPPER(:code) LIMIT 1`,
    { replacements: { code: raw } },
  );
  return (rows?.[0] as BillingVoucher) || null;
}

export async function incrementVoucherRedemption(id: string): Promise<void> {
  if (!sequelize || !id) return;
  await sequelize.query(
    `UPDATE saas_billing_vouchers
     SET redemption_count = redemption_count + 1, updated_at = NOW()
     WHERE id = :id`,
    { replacements: { id } },
  );
}

export type { HumanifyPlanId };
