# Humanify — Product BRD, PRD & Software Guidelines

**Product:** Humanify HRIS SaaS (`humanify.id`)  
**Owner:** Naincode Inti Teknologi  
**Version:** 1.0 · Wave-68 baseline (Jul 2026)  
**Status:** Living document — pair with `.hermes/HANDOFF.md` & `.hermes/DECISIONS.md`  
**Companion canvas:** Cursor canvas `humanify-multi-role-brd-prd-readiness.canvas.tsx`

---

## 1. Executive summary

Humanify is a **multi-tenant HRIS SaaS** for Indonesian companies: employee database, attendance, leave, payroll (PPh 21 / BPJS / THR), reimbursement, ESS/MSS, recruitment, and platform billing.

**Overall readiness:** **Ready with caveats** for GA core journeys.

| Dimension | Score | Status |
|---|---:|---|
| Business / GTM | 88 | Ready w/ caveats |
| User personas | 86 | Ready w/ caveats |
| Ops workflow | 92 | Ready w/ caveats |
| Interface / IA | 88 | Ready w/ caveats |
| Product depth | 86 | Ready w/ caveats |
| Technical / security | 88 | Ready w/ caveats |
| Quality (QA/QC) | 90 | Ready w/ caveats |

**Intentional ceilings (not open P0 bugs):**

- Prod **soft RLS** + request-bound (FORCE strict deferred — D-013b)
- **Sentry.io** deferred — internal observability (D-010b)
- Midtrans **partner auto-payout won’t-do** (D-015)
- **E-Sign / Privy** UI hidden until GA checklist

---

## 2. BRD — Business Requirements

### 2.1 Problem

HR teams need a cloud HRIS that is Indonesia-compliance capable, supports employee/manager self-service, and isolates company data — without buying a full retail/FnB ERP.

### 2.2 Business goals

| ID | Goal | Priority |
|---|---|---|
| BG-1 | Digitalize hire-to-retire in multi-tenant SaaS | P0 |
| BG-2 | Accurate, auditable Indonesian payroll & tax | P0 |
| BG-3 | ESS/MSS reduce HR admin load | P0 |
| BG-4 | Zero cross-tenant data leakage | P0 |
| BG-5 | Seat billing + partner channel monetization | P1 |
| BG-6 | PSrE e-sign (Privy) for contracts | P2 (deferred) |

### 2.3 Stakeholders

| Role | Actor | Primary need |
|---|---|---|
| Buyer | HRD / Owner | Compliance + cost control |
| Admin HR | `hr_admin`, finance | Payroll, leave, attendance, claims |
| Manager | MSS | Approvals, team visibility |
| Employee | ESS `/employee` | Attendance, leave, payslip, claims |
| Platform | `super_admin` | Tenants, obs, billing |

### 2.4 Business rules

1. One tenant = one company; session `tenant_id` is the only trust boundary for isolation.
2. Payroll transitions are auditable (`approve` → `paid`); golden smoke must pass.
3. Staff must not see billing/payroll-run surfaces unless role allows.
4. Partner payout is manual/CSV — not automatic Midtrans disbursement.
5. E-sign is not a go-live blocker for core HRIS.
6. Empty tenant inventory stays empty in production (no demo seed assets/payroll).

### 2.5 Success metrics

- Time-to-first-employee &lt; 1 day after signup
- Time-to-first-payroll run &lt; 14 days
- `smoke:payroll-golden` and `smoke:claim-proof` green on staging/prod
- Zero open P0 IDOR / tenant leak
- ESS weekly active usage (tenant-defined KPI)

### 2.6 Out of scope

PoS, FnB, DMS, manufacturing, BUMDes, wildlife/field ops, SIMESI pet ERP as the same product, mandatory Sentry.io, prod FORCE RLS without CTO sign-off.

---

## 3. PRD — Product Requirements

### 3.1 Vision

Humanify = tenant-first HRIS for people, time, pay, claims, and self-service — with Indonesian compliance modules and dual surfaces (marketing vs ops).

### 3.2 Personas & journeys (acceptance)

**Admin HR**  
Login → employees (CRUD/import) → attendance settings → leave queue → payroll run → slip distribution → claim approval.  
AC: no other-tenant data; empty states instruct data entry.

**Manager (MSS)**  
`/humanify/mss` → pending leave/claim/OT → view evidence → approve/reject.  
AC: filtered sidebar; no billing unless entitled.

**Employee (ESS)**  
`/employee` → clock-in → leave/claim → payslip.  
AC: own data only; non-legacy claim attachments previewable.

**Platform admin**  
`/platform` tenants + observability + billing.  
AC: cross-tenant only for super/platform admin.

### 3.3 Epics

| Epic | Status | Scope |
|---|---|---|
| E1 People & Org | Live | Employees, org, onboarding/offboarding, contracts, assets assign |
| E2 Time & Leave | Live | Attendance, devices, shifts, leave approvals, OT→payroll |
| E3 Payroll & Tax | Live | Run, slip, THR, PPh21, BPJS, loans, disbursement |
| E4 Claims | Live | Reimbursement + private bukti + preview |
| E5 Talent & LMS | Partial | Recruitment live; LMS core sidebar; advanced URL-only |
| E6 Platform & Security | Live | SSO, roles, billing, soft RLS prod / strict staging |
| E7 E-Sign | Hidden | Privy simulasi gated; APIs retained |

### 3.4 Non-functional requirements

| NFR | Requirement | Evidence |
|---|---|---|
| Security | App scopedWhere + RLS; IDOR packs | `smoke:idor`, staging scorecard |
| Reliability | Health, PM2, BUILD_OK deploys | `/api/health` |
| Audit | Payroll approve→paid events | `smoke:payroll-golden` |
| Privacy | Claim files outside `public/` | `claim-file` API |
| Compliance | PPh21 / BPJS / THR | Payroll modules |
| Observability | Internal ring + UI | `/platform/observability` |

### 3.5 Open product decisions

| Decision | Recommendation | Owner |
|---|---|---|
| Unhide e-sign | After Privy credentials + GA doc | PM |
| Assets ↔ lifecycle auto | Checklist complete → assign/return API | PM + BE |
| Prod FORCE RLS | After cron audit + CTO sign-off | CTO |
| LMS in sales pitch | Core only; advanced = lab | PM + UX |

---

## 4. Product & software guidelines

### 4.1 Product

- Empty tenant ⇒ empty UI (never seed demo MacBooks/payroll in prod).
- Hidden ≠ deleted (`ESIGN_UI_ENABLED`, sidebar `hidden`).
- Every CTA must hit a real route (aliases via redirect OK).
- Persona-aware IA: staff/manager/hq filters must stay green (`smoke:sidebar-persona`).

### 4.2 Engineering

- Never accept `tenantId` from client body/query for authorization.
- Mutating SQL: `withHQAuth` or explicit tenant DB context (cron Wave-68).
- Mock HR only via `allowHrMockFallback()` in non-production.
- Claim blobs in private storage; serve with session or HMAC.

### 4.3 UX / UI

- Ops: `HumanifyLayout` + `--hf-*` tokens.
- Marketing: `HumanifyMarketingShell` (ADR dual surface).
- Empty states: one primary action + one secondary related link.
- Default copy: Bahasa Indonesia for ops.

### 4.4 QA / QC

**Release gates**

| Gate | Check |
|---|---|
| A | Build + `/api/health` + login 200 |
| B | Security scorecard / IDOR subset |
| C | `payroll-golden` + `claim-proof` |
| D | Persona / GA journey e2e |

**Defect classes:** Blocker (tenant leak) · Major (wrong pay) · Minor (copy/CTA).

**DoD feature:** AC met · tenant-scoped API · empty/error UI · smoke/e2e · HANDOFF note · no secrets.

---

## 5. Multi-role verdicts (summary)

| Role | Verdict |
|---|---|
| CTO | Ship GA core; hold ADR ceilings |
| HRD Manager | Day-1 operable; lifecycle polish (assets auto) |
| Product Manager | Scope freeze core; clear P1 backlog |
| Product Specialist | Sync KB with hidden modules; honest demos |
| Backend | Solid isolation; watch schema drift |
| Frontend | Ops chrome OK; hunt dead CTAs |
| UX/UI | Dual surface OK; reduce IA density |
| QA | Automation strong; sequential deploy+test |
| QC | Gate A–D sign-off before prod promote |

---

## 6. Priority backlog

| Pri | Item | Owner |
|---|---|---|
| P0 | Post-deploy smoke + QC Gate A–D sign-off | QA + QC |
| P0 | Go-live checklist + isi karyawan/aset per tenant | HRD |
| P0 | Playbook/KB sync modul hidden + uptime alert | PS + DevOps |
| P1 | Commit/push Wave-69 · empty-state crawl · assets di matrix | DevOps + FE + QA |
| P1 | Legacy claim re-upload campaign (ESS CTA + report) | HRD + PS |
| P1 | ESS mobile 5-journey spot-check | UX + QA |
| P2 | ADR: FORCE RLS / Sentry / Privy unhide (opsional) | CTO + PM |
| P2 | Midtrans auto-payout tetap won’t-do | CTO |

---

## 7. References

- Prod: https://humanify.id/humanify/login  
- Staging: https://staging.humanify.id/humanify/login  
- Handoff: `.hermes/HANDOFF.md`  
- ADRs: `.hermes/DECISIONS.md`  
- Sidebar IA: `config/humanify-sidebar.config.ts`  
- GA scripts: `npm run smoke:ga-journey` · `npm run smoke:payroll-golden` · `npm run qa:humanify:matrix`
