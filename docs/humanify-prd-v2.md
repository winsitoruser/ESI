# Humanify — Product Requirements Document & Business Requirements

**Version:** 2.0  
**Evidence cutoff:** 30 July 2026  
**Owner:** Naincode Inti Teknologi  
**Product:** Humanify HRIS SaaS (`humanify.id`)  
**Status:** GA core ready with declared technical and commercial caveats.

## 1. Executive summary

Humanify is a cloud HRIS for Indonesian organizations. It combines employee
master data, attendance, leave, payroll and Indonesian compliance, claims,
employee and manager self-service, recruitment, HR operations, analytics,
billing, and a SaaS control plane.

Humanify is one product within a dual-product repository. It must not be
described as SIMESI, a pet ecosystem ERP, or as a retail/FnB platform.

### Product promise

Humanify helps HR teams run hire-to-retire workflows in one tenant-isolated
system, reduce repetitive administration through ESS/MSS, and operate payroll
with auditable Indonesian tax and statutory components.

### Current verdict

The operational core is suitable for controlled production use. Product claims
must preserve the distinction between:

- **GA/live:** sold and operated as part of the core product.
- **Partial:** implemented with limited depth, integration, or rollout.
- **Lab/hidden:** present in code but not part of the GA sales commitment.
- **Deferred:** deliberately held behind an architectural or provider gate.

## 2. Business requirements

### 2.1 Market problem

Indonesian HR teams often manage employee records, attendance, leave,
reimbursements, payroll, and compliance across spreadsheets and disconnected
tools. This creates duplicated input, weak auditability, slow approvals,
employee dependence on HR, and payroll/compliance risk.

### 2.2 Target customers

Primary target:

- Indonesian small and mid-market organizations needing cloud HRIS.
- Companies requiring PPh 21, BPJS, THR, leave, payroll, and employee
  self-service in Bahasa Indonesia.
- Organizations with field, distributed, or multi-location teams.
- Enterprise buyers requiring SSO, API access, role control, and auditability.

Channel target:

- Payroll, tax, and BPJS consultants.
- SME accounting firms.
- Attendance-device vendors and implementation partners.

### 2.3 Buyers and users

**Owner / HR Director**

- Buys the product.
- Needs compliance confidence, implementation speed, cost control, and reports.

**HR administrator**

- Configures organization, employees, attendance, leave, payroll, claims,
  onboarding, offboarding, and employee communications.

**Finance / payroll operator**

- Runs payroll, tax, BPJS, THR, disbursement, adjustments, and audit review.

**Manager**

- Reviews team data and approves leave, overtime, claims, and mutations.

**Employee**

- Uses ESS for attendance, leave, claims, payslips, profile, documents, and
  selected learning or disciplinary records.

**Platform operator**

- Uses `/platform` to operate tenants, billing, partner leads, support
  impersonation, email verification, and observability.

### 2.4 Business goals

1. Digitize hire-to-retire workflows in a tenant-first SaaS model.
2. Reduce payroll and statutory calculation risk through tested engines and
   auditable state changes.
3. Reduce HR administrative workload through ESS, MSS, bulk operations, and
   actionable queues.
4. Prevent cross-tenant data exposure.
5. Monetize with plan entitlements, annual billing, and partner referrals.
6. Support enterprise expansion through SSO, API keys, white-label
   entitlements, and operational controls.
7. Introduce AI assistance only where generated output is grounded and writes
   require human confirmation.

### 2.5 Product success measures

Operational product KPIs:

- Time to first employee: less than one business day after signup.
- Time to first payroll run: less than fourteen days after onboarding.
- Go-live checklist ready with at least one active employee.
- Payroll golden and claim-proof suites green before release promotion.
- Zero unresolved P0 cross-tenant leakage.
- Approval cycle time for leave, overtime, and claims.
- ESS weekly active users per tenant.
- Payroll run completion and payslip distribution success.

Commercial KPIs requiring production/finance data:

- Trial-to-paid conversion.
- Paying tenants by plan and cohort.
- Paid-order MRR/ARR, not list-price estimates.
- Gross and net revenue retention.
- Logo and revenue churn.
- Partner-attributed revenue and commission cost.
- Customer acquisition cost and payback period.

These commercial values are not established by the repository alone.

## 3. Product scope

### 3.1 GA/live core

**People and organization**

- Employee database, import/export, bulk edit, profile and photos.
- Organization structure and settings.
- Onboarding and offboarding checklists.
- Contract reminders.
- Asset inventory, assignment, and return.
- Employee documents and private file access.

**Time, attendance, and leave**

- Attendance dashboard and daily recap.
- Shift and schedule management.
- Attendance settings and device administration.
- Leave types, requests, balances, and approvals.
- Overtime workflow and payroll bridge.

**Payroll and statutory administration**

- Payroll runs and attendance-generated components.
- Payslips, THR, PPh 21, BPJS, overtime, bonuses, loans, and cash advances.
- Bank transfer/disbursement files.
- Payroll reports and audit events.
- Indonesia-oriented PPh 21/PTKP calculation fixtures.

**Claims and expenses**

- Reimbursement requests and approval.
- Private receipt storage and signed/session access.
- Travel expense and payroll-related claim integration.

**ESS and MSS**

- Employee portal for self-service workflows.
- Manager portal/action hub for team approvals.
- Persona-aware navigation and role restrictions.

**Talent and HR operations**

- Recruitment and careers portal.
- Training/LMS core surfaces.
- Certificates.
- Mutations, industrial relations, disciplinary letters, HR activities, team
  tasks, announcements, and calendar.

**Platform and enterprise**

- Tenant signup, onboarding wizard, invitations, users, roles, and security.
- Midtrans checkout path, billing orders, plan changes, and invoice data.
- SAML SSO foundation and API keys.
- Platform tenant operations and internal observability.
- Go-live readiness workflow.

### 3.2 Partial capabilities

- Recruitment publishing depth differs by external job portal; some connectors
  are credential, webhook, outbound-link, or manual-readiness layers.
- Real SAML IdP onboarding remains customer-specific even though synthetic ACS
  is release-tested.
- Local document storage is production-ready; S3/R2 is optional and does not
  automatically migrate existing local files.
- AIMAN is available to entitled plans, but it remains a rule-engine-first,
  human-confirmed assistant rather than autonomous HR decision-making.
- Core LMS is visible; advanced LMS capabilities are lab-gated.

### 3.3 Hidden, lab, or deferred

- Privy e-sign UI: hidden until credentials and GA checklist are approved.
- Advanced LMS: URL/lab only through `HUMANIFY_LMS_LAB`.
- Engagement and HR projects: hidden in current sidebar IA.
- Partner auto-disbursement: not implemented; payout is manual ledger/CSV.
- Offline ESS mutation queue: not implemented; service worker is online-first.
- Production strict RLS: deferred behind staging and cron-context gates.
- External Sentry.io: deferred by decision; internal observability is standard.

### 3.4 Out of scope

- Point of sale, restaurant/FnB, manufacturing, BUMDes, and DMS.
- SIMESI pet ERP workflows.
- Wildlife conservation operations.
- Fully autonomous AI writes without confirmation.
- DJP certification claims; fiscal fixtures are acceptance evidence, not
  government certification.

## 4. Core user journeys and acceptance criteria

### 4.1 Tenant acquisition and go-live

Journey:

1. Buyer signs up and verifies email.
2. Tenant selects or starts a plan/trial.
3. Admin completes company, organization, and policy setup.
4. Admin adds employees and optional asset inventory.
5. Go-live checklist reports readiness.

Acceptance:

- Tenant context is attached to the authenticated session.
- Unknown tenants cannot read another tenant's data.
- Empty tenants see actionable empty states, never fake production data.
- Plan limits and feature entitlements are enforced in routes and APIs.

### 4.2 HR administration

Journey:

1. Import or create employees.
2. Configure attendance, leave, organization, and policies.
3. Review pending HR actions.
4. Run reports and lifecycle workflows.

Acceptance:

- Mutations are tenant-scoped and permission checked.
- Import errors are actionable and do not partially corrupt unrelated tenants.
- Destructive or sensitive actions are auditable where required.

### 4.3 Payroll

Journey:

1. Select period and employee population.
2. Import or aggregate attendance and adjustments.
3. Calculate payroll and statutory components.
4. Review exceptions.
5. Approve, mark paid, distribute payslips, and export payment files.

Acceptance:

- Net pay identity and attendance-to-overtime bridge pass golden tests.
- Approve and paid transitions create audit events.
- Employee payslips expose only the authorized employee's data.
- Fiscal engine changes require regression fixtures and finance sign-off.

### 4.4 Employee self-service

Journey:

1. Employee logs in.
2. Records attendance or views attendance history.
3. Submits leave, overtime, or claim.
4. Views status, payslips, profile, and documents.

Acceptance:

- Employee only sees own records unless separately authorized as manager.
- Private attachments use authenticated or signed access.
- Mobile layouts support critical workflows.
- Offline mode must not imply successful offline mutations.

### 4.5 Manager self-service

Journey:

1. Manager opens pending actions.
2. Reviews employee, policy, amount, and proof.
3. Approves or rejects.
4. Employee and HR see updated status.

Acceptance:

- Manager scope is limited to authorized team records.
- Approval actions are idempotent or safely reject invalid state transitions.
- Evidence links remain private.

### 4.6 Platform operations

Journey:

1. Platform operator reviews tenant health, billing, and verification.
2. Creates or updates tenant profile.
3. Enters audited support impersonation when needed.
4. Reviews observability and partner operations.

Acceptance:

- Only super/platform admin roles have cross-tenant access.
- Impersonation is explicit, visible, time-bound by session behavior, and logged.
- Platform metrics distinguish paid-order revenue from list-price estimates.

## 5. Packaging and monetization

Canonical plan definitions are in `lib/saas/plan-entitlements.ts`:

- Trial: Rp0 for 14 days; up to 25 users and 100 employees; full feature
  evaluation.
- Starter: Rp499,000/month; up to 10 users and 50 employees; core, attendance,
  and recruitment.
- Growth: Rp1,499,000/month; up to 50 users and 500 employees; adds payroll and
  analytics.
- Enterprise: Rp4,999,000/month; up to 500 users and 10,000 employees; adds
  LMS, AIMAN, API, white-label, and SSO.
- Annual quote: monthly price × 12 with a 20% discount.

Pricing issue requiring product decision:

The ROI calculator imports `HUMANIFY_PLANS` / `HUMANIFY_CANONICAL_PRICES_IDR`
(Trial Rp0 · Starter Rp499.000 · Growth Rp1.499.000 · Enterprise Rp4.999.000).
See `docs/humanify-price-book.md`. There is no second public price book.

## 6. AI product policy

AIMAN is a hybrid assistant:

- Rule-based tools calculate or retrieve business data.
- Optional LLM output improves explanation, not source calculations.
- Read actions may run directly.
- Write actions require explicit human confirmation.
- Confirmations should remain audit logged.
- AI must not fabricate employee, payroll, compliance, or financial values.
- AI recommendations do not replace HR, legal, tax, or management decisions.

## 7. Non-functional requirements

**Security**

- Tenant isolation at application query level and PostgreSQL policy level.
- Role, permission, plan, and module checks.
- Private document storage.
- Rate limiting, login lockout, MFA capability, hashed API keys, and signed
  integrations.

**Reliability**

- Production and staging health endpoints.
- PM2 process supervision and Nginx proxying.
- Daily backup target, retention, and restore runbook.
- Request-bound database context where enabled.

**Performance**

- Critical HR tables and dashboards should remain responsive at plan limits.
- Dedicated capacity baselines and sustained load testing remain required.

**Observability**

- Structured logs, internal event ring, persisted errors/warnings, health,
  Discord/email alert paths, and platform dashboard.

**Accessibility and UX**

- Bahasa Indonesia is the default operations language.
- Operations, ESS, and marketing use intentional separate design surfaces.
- Empty/error/loading states must be explicit.
- Keyboard, screen-reader, contrast, and cross-browser verification must be
  added to the formal quality matrix.

## 8. Roadmap priorities

### P0 — truth, safety, and release discipline

- Keep plan/pricing sources consistent across billing, ROI, and sales collateral.
- Make release evidence immutable and attached to CI/release artifacts.
- Close source-backed fail-open risks in public webhooks and token delivery.
- Maintain zero unresolved P0 tenant-isolation defects.

### P1 — commercial and operational maturity

- Establish paid-order cohort reporting, conversion, churn, and customer health.
- Add sustained load/capacity baselines.
- Make post-deploy health and critical migrations blocking.
- Complete customer evidence: contracts, case studies, and measured outcomes.

### P2 — gated expansion

- Privy e-sign GA only after provider, legal, security, and QA sign-off.
- Decide advanced LMS commercialization.
- Evaluate production strict RLS after cron/job context evidence remains green.
- Revisit external observability only when operational scale justifies it.

## 9. Product decisions that remain open

- Canonical commercial pricing and enterprise custom-pricing policy.
- Whether Trial should expose all enterprise-only features.
- Whether unknown/null plans should continue defaulting to Enterprise access.
- Date and exit criteria for strict production RLS.
- Scope and commercial promise for AIMAN and advanced LMS.
- E-sign provider GA timing.
- Seat overage versus forced plan upgrade.

## 10. Definition of done

A Humanify feature is done when:

1. Acceptance criteria are implemented.
2. Authorization and tenant scoping are explicit.
3. Plan entitlement is enforced where applicable.
4. Loading, empty, error, and success states exist.
5. Relevant unit, smoke, and/or E2E evidence is green.
6. Sensitive actions are logged or audited.
7. Documentation and sidebar/GA status are updated.
8. Production does not depend on mock HR data.
9. No secret, PII, or customer-specific configuration is committed.

## 11. References

- `config/humanify-sidebar.config.ts`
- `lib/saas/plan-entitlements.ts`
- `docs/humanify-ga-scope.md`
- `docs/humanify-positioning.md`
- `docs/humanify-partner-channel.md`
- `docs/humanify-payroll-fiscal-signoff.md`
- `.hermes/DECISIONS.md`
- `.hermes/HANDOFF.md`
