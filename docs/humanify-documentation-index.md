# Humanify — Documentation Pack

**Product:** Humanify HRIS SaaS  
**Owner:** Naincode Inti Teknologi  
**Version:** 2.0  
**Evidence cutoff:** 30 July 2026  
**Status:** Living documentation; implementation and operational evidence remain authoritative.

## Purpose

This pack consolidates Humanify documentation for product, business, engineering,
quality assurance, operations, security, and investment review. It covers
Humanify only. SIMESI and legacy Bedagang modules are separate products and are
out of scope.

## Documents

1. [Business Plan + Executive Summary](./humanify-business-plan.md)
   - One-page executive summary, company, market, product, monetization,
     GTM, competition, ops, financial framework, risks, 90/180-day milestones.
2. [Product Requirements & Business](./humanify-prd-v2.md)
   - Vision, market problem, personas, journeys, functional requirements,
     business rules, packaging, success metrics, scope, and roadmap.
3. [Technical Architecture](./humanify-technical-architecture.md)
   - Runtime topology, application surfaces, API patterns, data, tenancy,
     authentication, security, integrations, deployment, observability, and risks.
4. [Quality Assurance & Release](./humanify-quality-assurance.md)
   - QA strategy, release gates, test inventory, evidence, environments,
     severity model, gaps, and quality roadmap.
5. [Business & Investment Memo](./humanify-investment-memo.md)
   - Commercial model, pricing, channel, economic inputs, readiness, potential
     moats, risks, diligence requests, and financial-model inputs.

## PDF exports

Printable PDFs (A4) live in [`docs/pdf/`](./pdf/):

- [`pdf/humanify-documentation-pack.pdf`](./pdf/humanify-documentation-pack.pdf) — combined pack
- Individual PDFs for index, business plan, PRD, architecture, QA, and investment memo

Generated 30 July 2026 from the Markdown sources above.

## Evidence hierarchy

When documents disagree, use this order:

1. Runtime implementation and database behavior.
2. `.hermes/DECISIONS.md` for accepted architectural/product decisions.
3. `.hermes/HANDOFF.md` for recent delivery and recorded QA evidence.
4. `config/humanify-sidebar.config.ts` and plan entitlement rules for visible
   product scope.
5. This documentation pack.
6. Marketing copy and illustrative UI.

## Current product statement

Humanify is a multi-tenant Indonesian HRIS SaaS covering employee records,
attendance, leave, payroll, claims, ESS/MSS, recruitment, HR operations,
analytics, billing, and platform operations. The GA core is operational with
important declared ceilings:

- Production tenant isolation uses application scoping plus request-bound soft
  RLS; strict RLS is validated in staging and not yet enabled in production.
- Internal observability is the production standard; external Sentry.io is
  deferred.
- Partner commissions use a manual ledger/CSV process; automatic Midtrans
  disbursement is not implemented.
- Privy e-sign remains hidden until the provider GA checklist is completed.
- Advanced LMS remains lab-gated; visible product scope must not imply all
  advanced LMS surfaces are GA.

## Canonical sources

- Product delivery: `../.hermes/HANDOFF.md`
- Decisions: `../.hermes/DECISIONS.md`
- GA scope: `./humanify-ga-scope.md`
- Sidebar IA: `../config/humanify-sidebar.config.ts`
- Entitlements/pricing: `../lib/saas/plan-entitlements.ts`
- Tenant security: `./humanify-tenant-isolation-faq.md`
- Deployment: `../scripts/deploy-humanify-vps.sh`
- Staging: `./humanify-staging-deploy.md`
- Fiscal sign-off: `./humanify-payroll-fiscal-signoff.md`
- Backup/restore: `./humanify-backup-restore-runbook.md`

## Maintenance rules

- Update this pack when a module changes GA status, pricing changes, an ADR
  ceiling is removed, or release gates change.
- Never convert “implemented in code” into “commercially validated” without
  customer, revenue, or usage evidence.
- Never treat demo tenants, seeded users, smoke-test records, or self-scored
  readiness as customer traction.
- Add dates and source paths to new claims.
- Keep sensitive credentials, customer PII, production database values, and
  non-public commercial contracts out of this repository.
