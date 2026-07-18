/**
 * PPh21 TER-lite annual progressive calc + PTKP (UU HPP brackets).
 * Shared by compliance export + fiscal smoke fixtures.
 */

export const PTKP_ANNUAL: Record<string, number> = {
  'TK/0': 54_000_000,
  'TK/1': 58_500_000,
  'TK/2': 63_000_000,
  'TK/3': 67_500_000,
  'K/0': 58_500_000,
  'K/1': 63_000_000,
  'K/2': 67_500_000,
  'K/3': 72_000_000,
};

const BRACKETS: { limit: number; rate: number }[] = [
  { limit: 60_000_000, rate: 0.05 },
  { limit: 250_000_000, rate: 0.15 },
  { limit: 500_000_000, rate: 0.25 },
  { limit: 5_000_000_000, rate: 0.3 },
  { limit: Infinity, rate: 0.35 },
];

export function getPTKP(status: string): number {
  return PTKP_ANNUAL[status] || PTKP_ANNUAL['TK/0'];
}

/** Annual progressive PPh21 on PKP (penghasilan kena pajak). */
export function calculatePPh21Annual(pkp: number): number {
  if (pkp <= 0) return 0;
  let tax = 0;
  let remaining = pkp;
  let prev = 0;
  for (const b of BRACKETS) {
    const band = Math.min(remaining, b.limit - prev);
    if (band <= 0) break;
    tax += band * b.rate;
    remaining -= band;
    prev = b.limit;
    if (remaining <= 0) break;
  }
  return Math.round(tax);
}

/** Monthly estimate = annual tax / 12 (export convenience). */
export function calculatePPh21MonthlyFromAnnualGross(
  annualGross: number,
  taxStatus: string,
): number {
  const ptkp = getPTKP(taxStatus);
  const pkp = Math.max(0, annualGross - ptkp);
  return Math.round(calculatePPh21Annual(pkp) / 12);
}
