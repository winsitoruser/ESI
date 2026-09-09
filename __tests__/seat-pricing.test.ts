import {
  DEFAULT_SEAT_PRICING,
  quoteSeatSubscription,
  seatRateForCount,
  normalizeAddons,
} from '@/lib/saas/seat-pricing-core';
import { HUMANIFY_CANONICAL_PRICES_IDR } from '@/lib/saas/plan-entitlements';

describe('Humanify per-user seat pricing', () => {
  it('uses 10k for 1–250 seats (all units)', () => {
    expect(seatRateForCount(1).rateIdr).toBe(10_000);
    expect(seatRateForCount(250).rateIdr).toBe(10_000);
    expect(quoteSeatSubscription({ seats: 100 }).monthlyIdr).toBe(1_000_000);
  });

  it('drops to 9.5k for 251–1000 (all units, not graduated)', () => {
    expect(seatRateForCount(251).rateIdr).toBe(9_500);
    expect(quoteSeatSubscription({ seats: 251 }).coreIdr).toBe(251 * 9_500);
    expect(seatRateForCount(1000).rateIdr).toBe(9_500);
  });

  it('drops to 9k above 1000', () => {
    expect(seatRateForCount(1001).rateIdr).toBe(9_000);
    expect(quoteSeatSubscription({ seats: 1001 }).coreIdr).toBe(1001 * 9_000);
  });

  it('adds LMS per user and AIMAN as a monthly flat fee', () => {
    const q = quoteSeatSubscription({
      seats: 10,
      addons: { lms: true, ai: true },
    });
    expect(q.coreIdr).toBe(100_000);
    expect(q.lmsIdr).toBe(15_000);
    expect(q.aiIdr).toBe(65_000);
    expect(q.monthlyIdr).toBe(180_000);
  });

  it('applies yearly 20% off to the full monthly total', () => {
    const monthly = quoteSeatSubscription({
      seats: 10,
      addons: { lms: true, ai: true },
      interval: 'monthly',
    });
    const yearly = quoteSeatSubscription({
      seats: 10,
      addons: { lms: true, ai: true },
      interval: 'yearly',
    });
    expect(yearly.periodIdr).toBe(Math.round(monthly.monthlyIdr * 12 * 0.8));
    expect(DEFAULT_SEAT_PRICING.yearlyDiscountPct).toBe(20);
  });

  it('normalizes add-on flags', () => {
    expect(normalizeAddons(undefined)).toEqual({ lms: false, ai: false });
    expect(normalizeAddons({ lms: true })).toEqual({ lms: true, ai: false });
  });

  it('matches canonical plan list price (10k / user)', () => {
    expect(HUMANIFY_CANONICAL_PRICES_IDR.starter).toBe(DEFAULT_SEAT_PRICING.pricePerUserIdr);
    expect(HUMANIFY_CANONICAL_PRICES_IDR.growth).toBe(10_000);
    expect(HUMANIFY_CANONICAL_PRICES_IDR.enterprise).toBe(10_000);
    expect(DEFAULT_SEAT_PRICING.lmsPerUserIdr).toBe(1_500);
    expect(DEFAULT_SEAT_PRICING.aiMonthlyIdr).toBe(65_000);
  });
});
