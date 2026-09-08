# Humanify — Business & Investment Memo

**Version:** 2.0  
**Evidence cutoff:** 30 July 2026  
**Purpose:** Commercial and investor-oriented summary grounded in repository
evidence. This document does **not** invent TAM, customer counts, ARR, CAC,
LTV, runway, or valuation.

## 1. Investment framing

Humanify is a multi-tenant HRIS SaaS for Indonesian companies, built and
operated by Naincode Inti Teknologi. It has broad feature depth for the HR core
stack and a meaningful amount of operational hardening in QA, billing,
tenant-isolation controls, and release discipline. It is investable as a
product story only if commercial claims remain separated from engineering
readiness.

The strongest evidence in-repo is:

- A coherent, shipped product across HR, payroll, ESS/MSS, billing, platform,
  and security.
- Clear plan entitlements and Midtrans billing path.
- Strong internal QA culture with many smoke and E2E scripts.
- Explicit honesty about deferred ceilings instead of hiding them.

The weakest evidence in-repo is:

- No committed paying-customer count.
- No canonical exported paid MRR/ARR history.
- No CAC, churn, LTV, runway, or valuation basis.
- Pricing is canonical (`docs/humanify-price-book.md`); remaining diligence gaps are CAC/churn/LTV, not list price.

## 2. Product and commercial thesis

### Problem solved

Indonesian HR teams need one cloud system for people records, time, leave,
claims, payroll, and statutory workflows without the complexity of a generic
ERP or disconnected tools.

### Why the product can win

- Built specifically for Indonesia-oriented HR workflows including PPh 21,
  PTKP, BPJS, THR, leave presets, and payroll audit transitions.
- Multi-tenant SaaS controls are not an afterthought; plans, entitlements,
  invites, onboarding, platform ops, and billing are part of the product.
- ESS and MSS reduce dependence on HR administrators.
- Platform control plane and internal observability improve supportability.
- AIMAN creates an AI narrative without requiring fully autonomous HR actions.

### Why the story needs caution

- Product readiness is not the same as market traction.
- Several impressive capabilities remain hidden, lab-gated, or partially
  integrated.
- Partner monetization exists operationally but not as a finished payout
  product.
- Security posture is credible but production strict RLS is intentionally not
  yet live.

## 3. Pricing and packaging

### Canonical billable price book

Current source of truth:

- Trial: Rp0, 14 days, up to 25 users and 100 employees.
- Starter: Rp499,000/month.
- Growth: Rp1,499,000/month.
- Enterprise: Rp4,999,000/month.
- Annual: 20% discount on monthly × 12.

### Included structure

- Starter focuses on core, attendance, and recruitment.
- Growth adds payroll and analytics.
- Enterprise adds LMS, AIMAN, API, white-label, and SSO.

### Key commercial issue

### Key commercial issue

Closed. ROI, billing, and sales use one list-price book (`docs/humanify-price-book.md`).
Custom Enterprise quotes may discount from Starter/Growth/Enterprise list prices; they must not invent a public second book.

## 4. Revenue model

### Direct SaaS revenue

- Monthly and annual recurring subscriptions.
- Paid through Midtrans when merchant credentials are configured.
- Manual fallback flow when billing credentials are absent.

### Expansion revenue candidates

- Enterprise upgrades.
- More employee/user allowance via plan step-up.
- API/SSO/white-label attach.
- Professional services or onboarding assistance.

### Current limitation

There is no clear coded overage billing model; present logic favors plan
boundaries and upgrade prompts over metered overage.

## 5. Partner/channel model

Documented partner thesis:

- Payroll and tax consultants.
- SME accounting firms.
- Attendance-device vendors.

Implemented today:

- Referral code capture.
- Partner lead intake and triage.
- Commission snapshot on orders.
- Commission preview calculator.
- CSV export.
- Manual payout ledger and mark-paid flow.

Not yet implemented:

- Automatic partner payout.
- Completed legal/financial channel pack evidenced in-repo.
- Mature partner scorecards or partner-specific retention economics.

Practical implication:

The partner story is credible as a distribution hypothesis, but not yet mature
enough to be treated as a proven revenue engine.

## 6. Evidence-backed strengths

### 6.1 Product depth

Humanify covers more than a basic HRIS CRUD app. It includes:

- employee data and documents,
- attendance and devices,
- leave and overtime,
- payroll and tax/statutory modules,
- claims and private proof,
- assets and lifecycle,
- ESS/MSS,
- recruitment,
- analytics,
- billing,
- platform operations.

That breadth lowers the risk of a “thin feature wrapper” thesis.

### 6.2 Operational maturity

The repository shows repeated production/staging smoke verification, QA gates,
deployment scripts, backup/restore documentation, and internal observability.

This does not prove scale, but it does show discipline.

### 6.3 Honest scope management

The product explicitly marks these as deferred or not GA:

- production strict RLS,
- external Sentry.io,
- partner auto-payout,
- Privy e-sign unhide,
- advanced LMS depth.

That honesty is stronger than sales material that implies everything is fully
live.

### 6.4 Localization

Indonesian payroll and compliance logic is more defensible than generic HR
feature breadth alone.

## 7. Evidence-backed risks

### 7.1 Commercial data gap

The repo does not prove:

- number of paying tenants,
- live ARR,
- churn,
- expansion,
- CAC,
- payback,
- pipeline value,
- or runway.

Without DB/finance exports, any investor deck using those numbers would be
speculative.

### 7.2 Pricing inconsistency

Two pricing models in one product create:

- sales confusion,
- forecasting error,
- board-report inconsistency,
- and diligence questions about what customers actually pay.

### 7.3 Security caveat

Soft request-bound RLS in production is a conscious design choice, not a hidden
bug. But enterprise security reviews may still treat this as a negotiation
point until strict production RLS is live.

### 7.4 Infrastructure concentration

A single VPS/process deployment pattern increases:

- operational concentration risk,
- deployment fragility,
- and capacity uncertainty.

### 7.5 Hidden/lab features risk

If sales collateral overstates:

- advanced LMS,
- AI capabilities,
- e-sign readiness,
- or external job integrations,

then commercial trust risk increases.

## 8. Competitive angle

Based on repository positioning:

- Humanify wants to compete on integrated HR operations, tenant-aware SaaS
  controls, platform ops, and Indonesia-localized payroll/compliance.
- It frames Mekari/Talenta and generic HRIS as less aligned with first-class
  multi-tenant operation and internal observability posture.

What is still missing:

- dated competitive pricing comparisons,
- migration win stories,
- switching-cost evidence,
- or measurable implementation-time advantage versus competitors.

## 9. Moat candidates and confidence level

### Higher-confidence moat candidates

- Indonesia payroll/compliance depth.
- Multi-tenant SaaS operational layer built into the product.
- Strong internal QA/security culture relative to many early SaaS products.

### Lower-confidence moat candidates

- AIMAN as AI differentiation.
- partner channel defensibility.
- pet-ecosystem adjacency.
- data network effects.

These lower-confidence items need customer adoption and commercial proof.

## 10. Investment interpretation by stage

### As an early product-stage opportunity

Humanify is strong enough to support:

- pre-seed/seed product and execution arguments,
- strategic angel/institutional diligence on technical quality,
- and operator confidence in shipping capability.

### As a growth-stage SaaS case

Humanify is not yet evidenced in-repo as a growth-stage commercial asset,
because the needed metrics and audited customer/revenue history are absent from
the repository.

## 11. Data required for a real investor model

### Market sizing

- TAM/SAM/SOM with dated external sources.
- Segment definitions by company size, industry, and buyer type.
- Competitive pricing matrix and feature positioning.

### Revenue

- Paid tenants by plan and cohort.
- Paid-order MRR and ARR by month.
- Annual versus monthly mix.
- Discounts, credits, refunds, and churned revenue.

### Growth and retention

- Trial starts, conversions, time-to-paid.
- Gross and net revenue retention.
- Logo churn and revenue churn.
- Expansion by plan and seat growth.

### Efficiency

- CAC by channel.
- Partner acquisition economics.
- Implementation cost.
- Support cost per tenant.
- Gross margin.

### Finance and runway

- Cash on hand.
- Burn.
- committed funding,
- cap table,
- runway,
- revenue recognition policy,
- and valuation methodology.

## 12. Immediate recommendations

1. Price book is canonical (`docs/humanify-price-book.md`). Keep billing/ROI/sales in lockstep.
2. Export paid-order MRR/ARR and paying-tenant cohort data from production.
3. Produce a monthly commercial operating pack:
   - trials,
   - conversions,
   - paid tenants,
   - churn,
   - expansion,
   - partner contribution.
4. Separate “implemented”, “GA”, and “sold” features in sales materials.
5. Track product readiness and commercial traction independently.
6. Close or roadmap the most visible deferred items before enterprise pitches:
   pricing consistency, production security narrative, e-sign status, and
   channel economics.

## 13. Diligence checklist

Before using Humanify in an investor room, assemble:

- latest plan/pricing decision memo,
- paid-order export and cohort tables,
- tenant count by plan,
- monthly revenue waterfall,
- channel/partner contribution,
- finance sign-off on payroll posture,
- security FAQ and RLS roadmap,
- customer case studies or references,
- contracts/MSA samples,
- support and onboarding process metrics,
- release evidence artifacts, not only handoff narrative.

## 14. Bottom line

Humanify already supports a credible product, architecture, and operational
readiness story. It does **not** yet support a fully evidenced financial or
valuation story from the repository alone.

The highest-leverage next step is not another architecture claim. It is
commercial truth consolidation:

- one price book (**done** — `HUMANIFY_CANONICAL_PRICES_IDR`),
- one paid-order revenue dataset,
- one cohort view,
- and one honest feature-status matrix.

Once those exist, Humanify can be presented more convincingly to investors,
partners, and enterprise buyers.

## 15. References

- `lib/saas/plan-entitlements.ts`
- `lib/saas/humanify-billing.ts`
- `lib/saas/platform-metrics.ts`
- `lib/saas/partners.ts`
- `lib/saas/partner-payouts.ts`
- `lib/humanify/roi-calculator.ts`
- `docs/humanify-positioning.md`
- `docs/humanify-product-brd-prd.md`
- `docs/humanify-partner-channel.md`
- `docs/humanify-ga-scope.md`
- `docs/humanify-tenant-isolation-faq.md`
- `.hermes/HANDOFF.md`
- `.hermes/DECISIONS.md`
