/**
 * Pure per-karyawan pricing (safe for client bundles).
 * Volume is all-units: 251+ seats all bill at the 251-tier rate.
 */

export type SeatPricingRates = {
  pricePerUserIdr: number;
  pricePerUserOver250Idr: number;
  pricePerUserOver1000Idr: number;
  lmsPerUserIdr: number;
  aiMonthlyIdr: number;
  /** ATS Talent Intelligence (Recruit + match) — per seat / month */
  atsPerUserIdr: number;
  /** Bank Data / Talent Bank — per seat / month */
  talentBankPerUserIdr: number;
  yearlyDiscountPct: number;
  minSeats: number;
  maxSeats: number;
};

export const DEFAULT_SEAT_PRICING: SeatPricingRates = {
  pricePerUserIdr: 10_000,
  pricePerUserOver250Idr: 9_500,
  pricePerUserOver1000Idr: 9_000,
  lmsPerUserIdr: 1_500,
  aiMonthlyIdr: 65_000,
  atsPerUserIdr: 2_000,
  talentBankPerUserIdr: 1_500,
  yearlyDiscountPct: 20,
  minSeats: 1,
  maxSeats: 100_000,
};

export type BillingAddons = {
  lms: boolean;
  ai: boolean;
  ats: boolean;
  talentBank: boolean;
};

export type SeatQuote = {
  seats: number;
  rateIdr: number;
  tier: '1-250' | '251-1000' | '1001+';
  tierLabel: string;
  addons: BillingAddons;
  coreIdr: number;
  lmsIdr: number;
  aiIdr: number;
  atsIdr: number;
  talentBankIdr: number;
  monthlyIdr: number;
  periodCoreIdr: number;
  periodLmsIdr: number;
  periodAiIdr: number;
  periodAtsIdr: number;
  periodTalentBankIdr: number;
  periodIdr: number;
  interval: 'monthly' | 'yearly';
  yearlyDiscountPct: number;
};

export type AddonInput = {
  lms?: boolean;
  ai?: boolean;
  ats?: boolean;
  talentBank?: boolean;
} | null | undefined;

export function normalizeAddons(raw?: AddonInput): BillingAddons {
  return {
    lms: Boolean(raw?.lms),
    ai: Boolean(raw?.ai),
    ats: Boolean(raw?.ats),
    talentBank: Boolean(raw?.talentBank),
  };
}

export function clampSeats(seats: number, rates: SeatPricingRates = DEFAULT_SEAT_PRICING): number {
  const n = Math.round(Number(seats) || 0);
  return Math.min(rates.maxSeats, Math.max(rates.minSeats, n));
}

export function seatRateForCount(seats: number, rates: SeatPricingRates = DEFAULT_SEAT_PRICING): {
  rateIdr: number;
  tier: SeatQuote['tier'];
  tierLabel: string;
} {
  const n = clampSeats(seats, rates);
  if (n > 1000) {
    return {
      rateIdr: rates.pricePerUserOver1000Idr,
      tier: '1001+',
      tierLabel: 'Volume 1.001+ karyawan · Rp 9.000/orang',
    };
  }
  if (n > 250) {
    return {
      rateIdr: rates.pricePerUserOver250Idr,
      tier: '251-1000',
      tierLabel: 'Volume 251–1.000 karyawan · Rp 9.500/orang',
    };
  }
  return {
    rateIdr: rates.pricePerUserIdr,
    tier: '1-250',
    tierLabel: 'Standar 1–250 karyawan · Rp 10.000/orang',
  };
}

export function quoteSeatSubscription(opts: {
  seats: number;
  addons?: AddonInput;
  interval?: 'monthly' | 'yearly';
  rates?: SeatPricingRates;
}): SeatQuote {
  const rates = opts.rates || DEFAULT_SEAT_PRICING;
  const seats = clampSeats(opts.seats, rates);
  const addons = normalizeAddons(opts.addons);
  const { rateIdr, tier, tierLabel } = seatRateForCount(seats, rates);
  const coreIdr = seats * rateIdr;
  const lmsIdr = addons.lms ? seats * rates.lmsPerUserIdr : 0;
  const aiIdr = addons.ai ? rates.aiMonthlyIdr : 0;
  const atsIdr = addons.ats ? seats * rates.atsPerUserIdr : 0;
  const talentBankIdr = addons.talentBank ? seats * rates.talentBankPerUserIdr : 0;
  const monthlyIdr = coreIdr + lmsIdr + aiIdr + atsIdr + talentBankIdr;
  const interval = opts.interval === 'yearly' ? 'yearly' : 'monthly';
  const yearlyDiscountPct = Number(rates.yearlyDiscountPct) || 0;
  const factor = interval === 'yearly' ? 12 * (1 - yearlyDiscountPct / 100) : 1;
  const periodCoreIdr = Math.round(coreIdr * factor);
  const periodLmsIdr = Math.round(lmsIdr * factor);
  const periodAiIdr = Math.round(aiIdr * factor);
  const periodAtsIdr = Math.round(atsIdr * factor);
  const periodTalentBankIdr = Math.round(talentBankIdr * factor);
  const periodIdr = periodCoreIdr + periodLmsIdr + periodAiIdr + periodAtsIdr + periodTalentBankIdr;
  return {
    seats,
    rateIdr,
    tier,
    tierLabel,
    addons,
    coreIdr,
    lmsIdr,
    aiIdr,
    atsIdr,
    talentBankIdr,
    monthlyIdr,
    periodCoreIdr,
    periodLmsIdr,
    periodAiIdr,
    periodAtsIdr,
    periodTalentBankIdr,
    periodIdr,
    interval,
    yearlyDiscountPct,
  };
}

export function parseOrderAddons(raw: unknown): BillingAddons {
  if (!raw) return normalizeAddons(null);
  if (typeof raw === 'string') {
    try { return normalizeAddons(JSON.parse(raw)); } catch { return normalizeAddons(null); }
  }
  if (typeof raw === 'object') return normalizeAddons(raw as AddonInput);
  return normalizeAddons(null);
}
