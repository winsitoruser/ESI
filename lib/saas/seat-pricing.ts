/**
 * Humanify subscription — per-karyawan rates (DB) + tenant billing settings.
 * Pure quote math lives in seat-pricing-core.ts (client-safe).
 */
import { getTenantColumns, parseTenantSettings } from './tenant-schema';
import {
  DEFAULT_SEAT_PRICING,
  normalizeAddons,
  type BillingAddons,
  type SeatPricingRates,
} from './seat-pricing-core';

export {
  DEFAULT_SEAT_PRICING,
  clampSeats,
  normalizeAddons,
  parseOrderAddons,
  quoteSeatSubscription,
  seatRateForCount,
} from './seat-pricing-core';
export type { BillingAddons, SeatPricingRates, SeatQuote } from './seat-pricing-core';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type TenantBillingState = {
  billedSeats: number | null;
  addons: BillingAddons;
};

let ratesReady = false;
let ratesCache: SeatPricingRates | null = null;
let ratesCacheAt = 0;
const RATES_TTL_MS = 30_000;

export async function ensureSeatPricingTable() {
  if (!sequelize || ratesReady) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_seat_pricing (
      id SMALLINT PRIMARY KEY DEFAULT 1,
      price_per_user_idr INTEGER NOT NULL DEFAULT 10000,
      price_per_user_over_250_idr INTEGER NOT NULL DEFAULT 9500,
      price_per_user_over_1000_idr INTEGER NOT NULL DEFAULT 9000,
      lms_per_user_idr INTEGER NOT NULL DEFAULT 1500,
      ai_monthly_idr INTEGER NOT NULL DEFAULT 65000,
      ats_per_user_idr INTEGER NOT NULL DEFAULT 2000,
      talent_bank_per_user_idr INTEGER NOT NULL DEFAULT 1500,
      yearly_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 20,
      min_seats INTEGER NOT NULL DEFAULT 1,
      max_seats INTEGER NOT NULL DEFAULT 100000,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    ALTER TABLE saas_seat_pricing ADD COLUMN IF NOT EXISTS ats_per_user_idr INTEGER NOT NULL DEFAULT 2000
  `);
  await sequelize.query(`
    ALTER TABLE saas_seat_pricing ADD COLUMN IF NOT EXISTS talent_bank_per_user_idr INTEGER NOT NULL DEFAULT 1500
  `);
  await sequelize.query(`
    INSERT INTO saas_seat_pricing (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `);
  ratesReady = true;
}

function rowToRates(row: any): SeatPricingRates {
  return {
    pricePerUserIdr: Number(row?.price_per_user_idr ?? DEFAULT_SEAT_PRICING.pricePerUserIdr),
    pricePerUserOver250Idr: Number(row?.price_per_user_over_250_idr ?? DEFAULT_SEAT_PRICING.pricePerUserOver250Idr),
    pricePerUserOver1000Idr: Number(row?.price_per_user_over_1000_idr ?? DEFAULT_SEAT_PRICING.pricePerUserOver1000Idr),
    lmsPerUserIdr: Number(row?.lms_per_user_idr ?? DEFAULT_SEAT_PRICING.lmsPerUserIdr),
    aiMonthlyIdr: Number(row?.ai_monthly_idr ?? DEFAULT_SEAT_PRICING.aiMonthlyIdr),
    atsPerUserIdr: Number(row?.ats_per_user_idr ?? DEFAULT_SEAT_PRICING.atsPerUserIdr),
    talentBankPerUserIdr: Number(row?.talent_bank_per_user_idr ?? DEFAULT_SEAT_PRICING.talentBankPerUserIdr),
    yearlyDiscountPct: Number(row?.yearly_discount_pct ?? DEFAULT_SEAT_PRICING.yearlyDiscountPct),
    minSeats: Number(row?.min_seats ?? DEFAULT_SEAT_PRICING.minSeats),
    maxSeats: Number(row?.max_seats ?? DEFAULT_SEAT_PRICING.maxSeats),
  };
}

export async function getSeatPricingRates(force = false): Promise<SeatPricingRates> {
  if (!force && ratesCache && Date.now() - ratesCacheAt < RATES_TTL_MS) return ratesCache;
  if (!sequelize) {
    ratesCache = { ...DEFAULT_SEAT_PRICING };
    ratesCacheAt = Date.now();
    return ratesCache;
  }
  try {
    await ensureSeatPricingTable();
    const [rows] = await sequelize.query(`SELECT * FROM saas_seat_pricing WHERE id = 1 LIMIT 1`);
    ratesCache = rowToRates(rows?.[0]);
  } catch {
    ratesCache = { ...DEFAULT_SEAT_PRICING };
  }
  ratesCacheAt = Date.now();
  return ratesCache;
}

export async function upsertSeatPricingRates(input: Partial<SeatPricingRates>): Promise<SeatPricingRates> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureSeatPricingTable();
  const cur = await getSeatPricingRates(true);
  const next: SeatPricingRates = {
    pricePerUserIdr: Math.max(0, Math.round(input.pricePerUserIdr ?? cur.pricePerUserIdr)),
    pricePerUserOver250Idr: Math.max(0, Math.round(input.pricePerUserOver250Idr ?? cur.pricePerUserOver250Idr)),
    pricePerUserOver1000Idr: Math.max(0, Math.round(input.pricePerUserOver1000Idr ?? cur.pricePerUserOver1000Idr)),
    lmsPerUserIdr: Math.max(0, Math.round(input.lmsPerUserIdr ?? cur.lmsPerUserIdr)),
    aiMonthlyIdr: Math.max(0, Math.round(input.aiMonthlyIdr ?? cur.aiMonthlyIdr)),
    atsPerUserIdr: Math.max(0, Math.round(input.atsPerUserIdr ?? cur.atsPerUserIdr)),
    talentBankPerUserIdr: Math.max(0, Math.round(input.talentBankPerUserIdr ?? cur.talentBankPerUserIdr)),
    yearlyDiscountPct: Math.min(90, Math.max(0, Number(input.yearlyDiscountPct ?? cur.yearlyDiscountPct))),
    minSeats: Math.max(1, Math.round(input.minSeats ?? cur.minSeats)),
    maxSeats: Math.max(1, Math.round(input.maxSeats ?? cur.maxSeats)),
  };
  await sequelize.query(`
    UPDATE saas_seat_pricing SET
      price_per_user_idr = :a,
      price_per_user_over_250_idr = :b,
      price_per_user_over_1000_idr = :c,
      lms_per_user_idr = :d,
      ai_monthly_idr = :e,
      ats_per_user_idr = :ats,
      talent_bank_per_user_idr = :tb,
      yearly_discount_pct = :f,
      min_seats = :g,
      max_seats = :h,
      updated_at = NOW()
    WHERE id = 1
  `, {
    replacements: {
      a: next.pricePerUserIdr,
      b: next.pricePerUserOver250Idr,
      c: next.pricePerUserOver1000Idr,
      d: next.lmsPerUserIdr,
      e: next.aiMonthlyIdr,
      ats: next.atsPerUserIdr,
      tb: next.talentBankPerUserIdr,
      f: next.yearlyDiscountPct,
      g: next.minSeats,
      h: next.maxSeats,
    },
  });
  ratesCache = next;
  ratesCacheAt = Date.now();
  return next;
}

export function parseTenantBillingState(settingsRaw: unknown): TenantBillingState {
  const settings = parseTenantSettings(settingsRaw);
  const billing = settings.billing && typeof settings.billing === 'object' ? settings.billing : {};
  const seats = billing.billedSeats != null ? Number(billing.billedSeats) : null;
  return {
    billedSeats: Number.isFinite(seats) && (seats as number) > 0 ? Math.round(seats as number) : null,
    addons: normalizeAddons(billing.addons),
  };
}

export async function readTenantBillingState(tenantId: string): Promise<TenantBillingState> {
  if (!sequelize || !tenantId) return { billedSeats: null, addons: normalizeAddons(null) };
  try {
    const [rows] = await sequelize.query(
      `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
      { replacements: { id: tenantId } },
    );
    return parseTenantBillingState(rows?.[0]?.settings);
  } catch {
    return { billedSeats: null, addons: normalizeAddons(null) };
  }
}

export async function persistTenantBillingState(
  tenantId: string,
  patch: { billedSeats?: number; addons?: BillingAddons },
) {
  if (!sequelize || !tenantId) return;
  const cols = await getTenantColumns();
  if (!cols.has('settings')) return;
  const [rows] = await sequelize.query(
    `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  const settings = parseTenantSettings(rows?.[0]?.settings);
  const prev = parseTenantBillingState(settings);
  settings.billing = {
    ...(typeof settings.billing === 'object' && settings.billing ? settings.billing : {}),
    billedSeats: patch.billedSeats ?? prev.billedSeats,
    addons: patch.addons ?? prev.addons,
    updatedAt: new Date().toISOString(),
  };
  await sequelize.query(
    `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
    { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
  );
}
