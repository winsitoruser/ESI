import { DEFAULT_SEAT_PRICING } from './seat-pricing-core';
import { HUMANIFY_PLANS } from './plan-entitlements';

function idr(n: number): string {
  return n.toLocaleString('id-ID');
}

/** Substrings that public marketing HTML must contain (price-book 9 Sep). */
export function requiredPublicPriceClaims(
  rates = DEFAULT_SEAT_PRICING,
): string[] {
  return [
    `Rp ${idr(rates.pricePerUserIdr)}`,
    `Rp ${idr(rates.pricePerUserOver250Idr)}`,
    `Rp ${idr(rates.pricePerUserOver1000Idr)}`,
    `Rp ${idr(rates.lmsPerUserIdr)}`,
    `Rp ${idr(rates.aiMonthlyIdr)}`,
  ];
}

/** Enterprise card must not claim LMS/AIMAN/ATS/Bank Data as bundled plan features. */
export function enterpriseBundlesLmsOrAi(): boolean {
  const feats = HUMANIFY_PLANS.enterprise.features;
  return feats.includes('lms') || feats.includes('ai')
    || feats.includes('recruitment') || feats.includes('talent_bank');
}

export function flattenMarketingHtml(html: string): string {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

export function assertPublicHtmlMatchesPriceBook(html: string): { ok: boolean; missing: string[] } {
  const flat = flattenMarketingHtml(html);
  const missing = requiredPublicPriceClaims().filter((claim) => !flat.includes(claim));
  return { ok: missing.length === 0, missing };
}
