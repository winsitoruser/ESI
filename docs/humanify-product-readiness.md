# Humanify — Product Readiness closeout (Sep 2026)

Tracker: [Product Readiness spreadsheet](https://docs.google.com/spreadsheets/d/1hkuiPd5G7livbJfdIlP3nzHdmJ7jXwMa/edit)  
Launch rule: P0 complete, no security/payroll blocker, signup→go-live→payroll validated, pricing + GA scope consistent, release/backup/rollback evidenced.

**Engineering verification:** `npm run smoke:product-readiness`  
**UAT list (manual):** [`docs/humanify-uat-product-readiness.md`](./humanify-uat-product-readiness.md)

## Launch exit criteria

| Gate | Status | Evidence |
|---|---|---|
| P0 completion | Implemented in code/docs/smokes | PR-001…PR-033 below |
| Security — no P0 cross-tenant leak | Existing IDOR pack + payslip 403 | `npm run smoke:idor` · `smoke:payslip-idor` |
| Payroll golden + OT bridge + approve→paid | Existing | `npm run smoke:payroll-golden` |
| Claim-proof | Existing | `npm run smoke:claim-proof` |
| Signup → verify → setup → first employee → go-live | Wizard now includes employee | `smoke:phase1-signup` · `smoke:ga-journey` · `smoke:trial` |
| ESS/MSS | Portal + manager scope | `smoke:ess-empty-state` · `assertPendingOnTeam` |
| Pricing truth | Canonical book | `docs/humanify-price-book.md` |
| Scope truth | Lab hidden | sidebar + `docs/humanify-privy-lms-commercialization.md` |
| Release Gate A–E | Artifact runner + backup check | `npm run gate:ae` |
| Recovery | Backup scripts + Gate E | `docs/humanify-backup-restore-runbook.md` |
| Production data | Mock off + demo seed gated | `allowHrMockFallback` · `HUMANIFY_SEED_DEMO` |
| AI guardrail | Confirm + audit fail-closed | AIMAN agent tools |

## P0 (PR-001…PR-033)

| ID | Implementation |
|---|---|
| PR-001 | `HUMANIFY_CANONICAL_PRICES_IDR` + price-book memo |
| PR-002 | Entitlement regex + okr/ai-insights rules |
| PR-003 | Unknown/null plan → starter (middleware, HQLayout, plan-change) |
| PR-004 | Sales / GA / commercialization docs aligned |
| PR-005 | E-Sign, LMS lab, engagement, projects hidden by default |
| PR-006 | Existing signup e2e |
| PR-007 | 14-day trial smoke |
| PR-008 | Setup wizard employee step |
| PR-009 | Funnel `first_employee` |
| PR-010 | Go-live checklist |
| PR-011 | Payroll golden |
| PR-012 | Fiscal checklist + `HUMANIFY_FISCAL_SIGNED_OFF` (human signature remains finance ops) |
| PR-013 | Approve→paid in golden + funnel `paid` |
| PR-014 | ESS payslip `PAYSLIP_FORBIDDEN` |
| PR-015 | Attendance→OT in golden |
| PR-016 | Leave smokes |
| PR-017 | Claim-proof |
| PR-018 | Playwright `mobile-chrome` when `HUMANIFY_E2E_BROWSERS=all` |
| PR-019 | Manager `assertPendingOnTeam` |
| PR-020 | IDOR scorecard (existing) |
| PR-021 | `lint:humanify-hq-auth` + employee/v1 trees |
| PR-022 | `mustFailClosed` on seats / MFA / AIMAN audit |
| PR-023 | `docs/humanify-production-rls-truth.md` |
| PR-024 | MFA/login-guard policy |
| PR-025 | Gate A–E + real backup check |
| PR-026 | CI SHA artifact upload |
| PR-027 | Blocking Humanify smokes in CI |
| PR-028 | `/api/health` in healthcheck; deploy no longer `\|\| true` |
| PR-029 | Backup freshness in Gate E |
| PR-030 | Demo seeds skipped unless `HUMANIFY_SEED_DEMO=true` |
| PR-031 | AIMAN `CONFIRM_REQUIRED` |
| PR-032 | Payroll insights rules-only |
| PR-033 | AIMAN audit before confirm |

## P1 / P2

See CS runbook, connector matrix, funnel lib, capacity/a11y notes, off-VPS build, S3 dual-read, Privy/LMS memo, Redis `REDIS_URL`.

Ops-only remaining (cannot be closed from this repo alone): live finance wet signature, restore drill on the production box, real IdP QC, Discord alert drill, CI artifact *promote* of `.next` (path is ready).
