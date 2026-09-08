# Humanify — CS implementation runbook (PR-044)

Playbooks differ by plan. Do not skip isolation / empty-tenant checks.

## Trial (14 hari)

1. Signup → verify email → `/humanify/setup` (company → org → policies → **karyawan pertama** → Go Live).
2. Confirm trial banner + `trialDays: 14`.
3. Walk `/humanify/go-live` until core items (email, setup, first employee, billing ack) are done.
4. ESS: employee clocks in / requests leave on mobile viewport.
5. Do **not** promise Privy, advanced LMS, engagement, or FORCE RLS.

## Growth

Trial steps, plus:

1. Import employees (`/humanify/employees-import`) if >5 staff.
2. Configure leave types and attendance shift.
3. First payroll run on staging-like sample, then production: `npm run smoke:payroll-golden` evidence from last release.
4. Finance reviews fiscal checklist (`docs/humanify-payroll-fiscal-signoff.md`).
5. Enable payslip ESS after first **paid** run.

## Enterprise

Growth steps, plus:

1. SSO: `docs/humanify-sso-idp-runbook.md` + synthetic ACS `npm run smoke:sso-acs`.
2. API keys: `/humanify/enterprise` create → scope → revoke (`npm run smoke:phase24-v1-write`).
3. White-label / custom domain only after ops ticket.
4. AIMAN: confirm-required writes; no autonomous payroll numbers.

## Handoff artifacts

- Tenant slug, plan id, go-live score
- First employee created timestamp (funnel step `first_employee`)
- Backup freshness + release SHA from Gate A–E
