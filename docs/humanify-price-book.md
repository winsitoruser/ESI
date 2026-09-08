# Humanify — Canonical price book (PR-001)

**Decision date:** 1 September 2026  
**Owners:** Product + Finance  
**Source of truth:** `lib/saas/plan-entitlements.ts` → `HUMANIFY_CANONICAL_PRICES_IDR`

## Decision

One list-price book is used on billing, website, ROI calculator, sales sheet, and proposals.

| Plan | List price / month (IDR) | Seats (users / employees) |
|---|---:|---|
| Trial | 0 (14 days) | 25 / 100 |
| Starter | 499.000 | 10 / 50 |
| Growth | 1.499.000 | 50 / 500 |
| Enterprise | 4.999.000 | 500 / 10.000 |

Annual quote: `monthly × 12 × 0.8`. Tax: PPN 11% inclusive.

Custom Enterprise quotes may discount from this list; they must not invent a second public price book.

## Surfaces that must match

- Billing quotes: `lib/saas/humanify-billing.ts`
- ROI: `lib/humanify/roi-calculator.ts`
- Sales: `docs/humanify-sales-feature-status.md`
- Ops catalog: `lib/saas/plan-pricing-store.ts` (overrides are ops-controlled, still keyed to the same plan ids)

## Verification

```bash
npm run smoke:wave79-entitlements
npm run smoke:product-readiness
```
