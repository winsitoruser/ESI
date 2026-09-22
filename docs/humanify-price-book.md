# Humanify — Canonical price book (PR-001)

**Decision date:** 9 September 2026  
**Owners:** Product + Finance  
**Source of truth:** `lib/saas/seat-pricing.ts` → `DEFAULT_SEAT_PRICING` (paket = `lib/saas/plan-entitlements.ts`)

## Decision

Langganan Humanify dihitung **per karyawan** (all-units volume). Starter / Growth / Enterprise membedakan fitur, bukan harga satuan.

| Komponen | IDR |
|---|---:|
| 1–250 karyawan | 10.000 / orang / bulan |
| 251–1.000 | 9.500 / orang (semua kursi) |
| 1.001+ | 9.000 / orang (semua kursi) |
| LMS add-on | +1.500 / orang / bulan |
| ATS / Rekrutmen add-on | +2.000 / orang / bulan |
| Bank Data Talent add-on | +1.500 / orang / bulan |
| AIMAN Copilot | +65.000 / bulan (flat) |
| Trial | 0 (14 hari, full access) |

Annual quote: `monthly × 12 × 0.8`. Tax: PPN 11% inclusive.

Ops dapat mengubah rate card di `/platform/billing` tab Plans (`saas_seat_pricing`).

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
