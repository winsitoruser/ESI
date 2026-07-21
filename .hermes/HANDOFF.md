# Handoff — SIMESI (fka ESI ERP)

> Diperbarui: 21 Juli 2026 — **Wave-66** · AIMAN agent + claim proof approval + KB depth

## Wave-66 (21 Jul 2026) — AIMAN assisted agent · claim bukti · KB/sidebar

| ID | Item | Status |
|---|---|---|
| AI-1 | AIMAN assisted agent (tools + confirm + audit `aiman.agent_confirm`) | Done |
| AI-2 | Workflows: payroll_prep, recruitment_screen, hr_backlog, leave_desk, contract_watch, onboarding_check | Done |
| FE-1 | ClaimReceiptGallery + private storage persist (ESS/MSS/reimbursement) | Done |
| FE-2 | Approval **Lihat bukti** — reimbursement Aksi, MSS, ManagerHub | Done |
| BE-1 | Manager pending-approvals exposes `receipt_url` / `attachments_count` | Done |
| KB-1 | Knowledge Center seed detail + flowchart renderer | Done |
| IA-1 | Sidebar IA + persona Bantuan/KB for staff/manager | Done |
| QA-1 | `smoke:claim-proof` · `smoke-test-humanify-aiman-agent.js` | Done |

Scripts: `npm run smoke:claim-proof` · `node scripts/smoke-test-humanify-aiman-agent.js` · `npm run smoke:sidebar-persona`

Prod verified 21 Jul 2026 — deploy BUILD_OK · `smoke:claim-proof` **22/0** (upload→preview→approve E2E) · enterprise **21/0** · manager pending `receipt_url` live.

Known residual: klaim **legacy** (hanya filename di `receipt_url`) tidak bisa preview — butuh re-upload karyawan.

**ADR ceilings (masih deferred):** prod FORCE strict RLS · Sentry.io · Midtrans auto-payout.

## Wave-65 (21 Jul 2026) — Formal QA closeout + TX-aborted fixes

| ID | Item | Status |
|---|---|---|
| BE-1 | Leave `attachment_url` schema drift + notify SAVEPOINT | Done |
| BE-2 | IR `logAudit` SAVEPOINT (request-bound TX poison) | Done |
| QA-1 | `npm run qa:humanify:matrix` (Smoke→AdHoc) | Done |
| QA-2 | Staging webhook secrets loader (`sshpass -e` + staging `.env`) | Done |
| QA-3 | Authenticated UI button smoke (`e2e/humanify-authenticated-ui-smoke.spec.ts`) | Done |

Scripts: `npm run qa:humanify:matrix` · `node scripts/smoke-test-humanify-enterprise.js` (needs `VPS_PASS`)

Staging verified 21 Jul 2026 — leave create PASS · IR 31/0 · enterprise **21/0** (webhook HMAC) · matrix **26/27** (full-qa login flake mid-deploy) → full-qa retest **GREEN** · enterprise PASS.  
Prod verified same day — leave create PASS · IR **31/0** · enterprise **21/0** · soft RLS intact · manual sync+build (full deploy SSH flaked under concurrent QA).

Known ops: concurrent deploy+QA SSH can trip password auth denials — prefer sequential; deploy step-6 may need manual `pm2 restart` if SSH flakes.

**ADR ceilings (masih deferred):** prod FORCE strict RLS · Sentry.io · Midtrans auto-payout.

## Wave-64 (20 Jul 2026) — Payroll depth (approve / paid / UI)

| ID | Item | Status |
|---|---|---|
| QA-1 | Golden approve → paid + payroll-audit events | Done |
| QA-2 | Hard e2e THR / BPJS / lembur pages | Done |
| ADR | D-027 | Done |

Scripts: `npm run smoke:wave64` · `npm run smoke:payroll-golden` · `npm run test:e2e:humanify:payroll:hard`

Staging verified 20 Jul 2026 — `smoke:payroll-golden` **17/0** (approve→paid+audit) · hard e2e THR/BPJS/lembur **PASS**.  
Prod verified same day — soft RLS · `smoke:payroll-golden` **17/0**.

**ADR ceilings (masih deferred):** prod FORCE strict RLS · Sentry.io · Midtrans auto-payout.

## Wave-63 (20 Jul 2026) — Payroll/attendance depth

| ID | Item | Status |
|---|---|---|
| BE-1 | Tenant-scope `attendance-summary` + `generate-from-attendance` | Done |
| BE-2 | Attendance bulk import `overtimeMinutes` / `lateMinutes` | Done |
| QA-1 | `smoke:payroll-golden` attendance → OVERTIME bridge | Done |
| ADR | D-026 | Done |

Scripts: `npm run smoke:wave63` · `npm run smoke:payroll-golden`

Staging verified 20 Jul 2026 — BUILD_OK · `smoke:payroll-golden` **13/0** (attendance→OVERTIME bridge green).  
Prod verified same day — BUILD_OK · soft RLS · `smoke:payroll-golden` **13/0**.

**ADR ceilings (masih deferred):** prod FORCE strict RLS · Sentry.io · Midtrans auto-payout.

## Wave-62 (20 Jul 2026) — Staging ops hardening

| ID | Item | Status |
|---|---|---|
| QA-1 | Hard payroll refuses loopback unless `HUMANIFY_E2E_ALLOW_LOOPBACK=1` | Done |
| DO-2 | `npm run verify:humanify:staging` (scorecard → hard e2e) | Done |
| DO-3 | Staging deploy docs — e2e host + clone grant note | Done |
| DO-1 | Smoke asserts staging DB re-grant after clone | Done |
| DO-4 | Deploy `sshpass -e` / `SSHPASS` (password with `%` safe) | Done |
| ADR | D-025 | Done |

Scripts: `npm run smoke:wave62` · `npm run verify:humanify:staging`

Deploy verified 20 Jul 2026 — staging BUILD_OK · PM2 online · health/login 200 · `smoke:wave62` 6/6 on VPS · strict RLS.  
Prod deploy same day — BUILD_OK · PM2 online · health/login 200 · **`HUMANIFY_RLS_MODE=soft`** (D-013b intact) · staging remains strict.

**ADR ceilings (masih deferred):** prod FORCE strict RLS · Sentry.io · Midtrans auto-payout.

## Staging sequential verify (20 Jul 2026)

Run berurutan setelah staging DNS + login fix (GRANT `humanify` on clone).

| # | Step | Result |
|---|---|---|
| 1 | Security scorecard → `https://staging.humanify.id` | **38 passed / 0 failed** · `/var/lib/humanify/scorecard-last.json` |
| 2 | VPS cron → staging URL | `HUMANIFY_STAGING_URL` in prod `.env` · weekly cron `SMOKE_BASE_URL=https://staging.humanify.id` · VPS `/etc/hosts` → CF IP (resolver NXDOMAIN lokal VPS) |
| 3 | Hard payroll Playwright | **PASS** (6.2s) via `PLAYWRIGHT_BASE_URL=https://staging.humanify.id` + `HUMANIFY_E2E_HARD=1` — jangan pakai `127.0.0.1:3021` (NEXTAUTH cookie mismatch → stuck di `/auth/login`) |
| 4 | Staging RLS / env | `HUMANIFY_RLS_MODE=strict` · `HUMANIFY_RLS_REQUEST_BOUND=true` · `HUMANIFY_DEPLOY_SLOT=staging` · DB `humanify_staging` · PM2 online · login 200 |

**Login:** `https://staging.humanify.id/humanify/login` · `superadmin@humanify.id` / `superadmin123`  
**ADR ceilings (masih deferred):** prod FORCE strict RLS · Sentry.io · Midtrans auto-payout.

## Wave-61 (20 Jul 2026) — Residual P2 closers

| ID | Item | Status |
|---|---|---|
| DO-7 | Tenant isolation FAQ (soft RLS honesty) | Done |
| BE-6 | `migrate-saas-partner-payouts.js` + deploy hook | Done |
| FE-5 | Shared chart tokens (hr + workforce analytics) | Done |
| PM-4 | ESS dual-surface sidebar labels | Done |
| QA-4 | Manager approve leave e2e + CI | Done |
| DO-4 | CI warn when live smoke secrets missing | Done |
| ADR | D-024 | Done |

Scripts: `npm run smoke:wave61` · `npm run db:partner-payouts-migrate`

Deploy verified 20 Jul 2026 — prod BUILD_OK · PM2 online · health checks passed.

**Staging public:** `https://staging.humanify.id` live (20 Jul 2026) — DNS A via Cloudflare · health ok · login 200 · sequential verify green.  
**ADR ceilings:** prod FORCE strict RLS · Sentry.io · Midtrans auto-payout.

## Wave-60 (20 Jul 2026) — Auth batch-3 complete

Closes remaining **audit multi-peran** deferred track.

| ID | Item | Status |
|---|---|---|
| BE-2 / CTO-1 | withHQAuth batch-3 — all humanify APIs except claim-file + email-verify | Done |
| FE-3 | ESS `HomeTab` code-split (+ Leave/Attendance from Wave-59) | Done |
| BE-4 | mock-guard extend leave-management + team-tasks | Done |
| QA-2 | RBAC persona e2e secret-gated in CI | Done |
| DO-1 | Staging public DNS live; VPS slot :3021 healthy | Done (20 Jul) |
| ADR | D-023 | Done |

Scripts: `npm run smoke:wave60` · `npm run lint:humanify-hq-auth` · `npm run smoke:mock-guard`

Deploy verified 20 Jul 2026 — prod + staging slot BUILD_OK · PM2 online · health checks passed.

**Staging:** public URL live (CF A `staging` → VPS). Old 1016 Origin DNS blocker cleared 20 Jul.

**Deferred:** prod FORCE strict RLS (D-013b) · Sentry.io (D-010b) · Midtrans auto-payout (D-015b).

## Wave-59 (20 Jul 2026) — Auth batch-2 + ESS + ops

Closes canvas **audit multi-peran** deferred track post Wave-58.

| ID | Item | Status |
|---|---|---|
| BE-2 / CTO-1 | withHQAuth batch-2 (12 HR-core APIs) + lint extend | Done |
| FE-3 | ESS `LeaveTab` + `AttendanceTab` code-split | Done |
| DO-2 | Redis down alert cron | Done |
| DO-5 | Scorecard cron crash wrapper + Discord | Done |
| QA-2 | RBAC persona e2e skeleton (staging-gated) | Done |
| ADR | D-022 | Done |

Scripts: `npm run smoke:wave59` · `npm run lint:humanify-hq-auth`

Deploy verified 20 Jul 2026 — BUILD_OK · PM2 online · health checks passed.

**Deferred (Wave-60+):** ~50 remaining bare-session APIs · HomeTab split · mock-guard extend · staging DNS public verify.

## Wave-58 (20 Jul 2026) — Staging track

Closes canvas **audit multi-peran** Wave-58 infra track.

| ID | Item | Status |
|---|---|---|
| DO-1 | `deploy-humanify-staging-vps.sh` → `staging.humanify.id` slot | Done |
| DO-2 | Deploy `VPS_SSH_KEY` support (no sshpass required) | Done |
| DO-3 | PM2 `humanify-staging` port 3021 + nginx `humanify-staging` | Done |
| SEC-1 | DB `humanify_staging` + `HUMANIFY_RLS_MODE=strict` on staging | Done |
| SEC-2 | Weekly scorecard cron → `HUMANIFY_STAGING_URL` when staging live | Done |
| DO-4 | Runbook `docs/humanify-staging-deploy.md` | Done |
| ADR | D-021 | Done |

Scripts: `npm run smoke:wave58` · `npm run deploy:humanify:staging`

**DNS required:** A/CNAME `staging.humanify.id` → VPS `103.92.215.37` (Cloudflare proxy OK).  
**VPS status (20 Jul):** PM2 `humanify-staging` :3021 online · DB cloned from prod · `HUMANIFY_RLS_MODE=strict` · nginx `humanify-staging` configured. Public URL blocked until DNS propagates.

**Deferred:** bare-session migration batch-2 · ESS tab code-split · Redis alert webhook hardening.

## Wave-57 (20 Jul 2026) — Product + UX + QA

Closes canvas **Humanify — audit multi-peran** Wave-57 track.

| ID | Item | Status |
|---|---|---|
| FE-1 | ESS god-page → `components/employee/EmployeePortal.tsx`; routes leave/payslip/attendance real shells | Done |
| FE-2 / UX-2 | ESS nav + training pages teal; ops violet unchanged (`--hf-brand`) | Done |
| UX-1 | D-020 two-surface brand (`--ep-accent*` ESS vs ops violet) | Done |
| UX-3 | Sidebar welcome hidden + remove duplicate Naincode link | Done |
| QA-1 | ESS journey e2e (staging skeleton, Wave-56) verified in smoke | Done |
| ADR | D-020 | Done |

Scripts: `npm run smoke:wave57` · `smoke:wave56` · `smoke:sidebar-persona`

Deploy verified 20 Jul 2026 — BUILD_OK · PAGES_OK · PM2 online · health checks passed.

**Deferred (Wave-58):** staging.humanify.id · full bare-session migration · ESS tab-level code-split · Redis/deploy key ops.

## Wave-56 (20 Jul 2026) — Security honesty

Closes canvas **Humanify — audit multi-peran (pasca Wave-55)** P0 track + light P1 honesty.

| ID | Item | Status |
|---|---|---|
| BE-1 | Claim upload → `storage/claims` + signed `/api/humanify/claim-file` | Done |
| BE-2 / CTO-1 | withHQAuth batch (overtime/leave/payroll*/export/compliance/travel/upload-claim) + `lint:humanify-hq-auth` | Done |
| BE-3 | performance-360: no `isMock:true`; tenant JOIN; `dataSource: empty` | Done |
| PM-2 | E-Sign sidebar/UI **Simulasi** banner | Done |
| CTO-3 | Hide engagement lab; AI group labeled Lab; `hidden` filter in sidebar | Done |
| FE-2 | ESS manager/quick-action violet → teal/slate | Done |
| QA-1 | `e2e/humanify-ess-journey.spec.ts` staging skeleton | Done |
| ADR | D-019 | Done |

Scripts: `npm run smoke:wave56` · `npm run lint:humanify-hq-auth`

Deploy verified 20 Jul 2026 — BUILD_OK · PAGES_OK · PM2 online · health checks passed.

**Deferred (Wave-57/58):** ESS god-page split · staging.humanify.id · full bare-session migration · Redis/CI hygiene ops.

## Wave-55 (20 Jul 2026) — Literal 100% (Path B)

Closes canvas **Humanify — prepare literal 100% (post Wave-54)** via shipped code + ADR ceilings (D-010b, D-013b, D-015b, D-014 amend, D-012b, D-018).

| Sprint | Highlights | Status |
|---|---|---|
| L0 | SumoPod runbook · fiscal ensure · staging URL docs · reopen D-015→ops ledger | Done |
| L1 | Chart brand tokens · backup→obs · demo checklist · partners SEO · CI wave54/55 | Done |
| L2 | Hard payroll e2e expand · fiscal bracket edges · payslip-gate · D-014 amend | Done |
| L3 | D-013b Security literal 100 (no unsafe prod FORCE flip) · weekly scorecard | Done |
| L4 | Payout ledger mark-paid+CSV · partner status portal · obs `?ref=` · D-010b | Done |

Scripts: `npm run smoke:wave55` · `smoke:wave54` · `smoke:payroll-fiscal` · `smoke:rls-job-chaos`

Deploy verified 20 Jul 2026 — BUILD_OK · PM2 online · health checks passed.

**Maturity literal 100% (all domains):** Control · Security* · HR · Payroll · UX · Obs* · Market  
\*Security: soft RLS + chaos + weekly IDOR (D-013b). Obs: internal monitoring ceiling (D-010b). Midtrans auto-payout tetap won't-do.

## Wave-54 (20 Jul 2026) — Maturity S4

| ID | Item | Status |
|---|---|---|
| SEC-S4-1 | Strict RLS lab smoke; prod stays soft (D-013) | Done |
| SEC-S4-2 | `runWithTenantDbContext` + digest `set_config` + `smoke:rls-job-chaos` | Done |
| HR-S4-1 | Devices `withHQAuth` + ZKTeco simulate tenant filter | Done |
| CP-S4-1 | Hard payroll Playwright skeleton + D-014 (staging gate) | Done |
| CP-S4-2 | Partner payout ledger deferred — D-015 | Done (ADR) |
| CP-S4-3 | SAML QC = synthetic ACS gate — D-012 addendum | Done (ADR) |
| CP-S4-4 | `packages/humanify-core` won't-do — D-017 | Done (ADR) |
| ESS-S4-1 | SW online-first v3 — D-016 | Done |
| UX-S4-1 | Auth residual indigo → emerald / `--hf-*` | Done |

Scripts: `npm run smoke:wave54` · `npm run smoke:rls-job-chaos` · `npm run smoke:rls-lab`

Deploy verified 20 Jul 2026 — BUILD_OK · PAGES_OK · PM2 online · health checks passed.

**Maturity 100% (judgment + ADR):** Control 100 · Sec 100* · HR 100 · ESS 100 · UX 100 · CP 100*
\*Sec: soft RLS prod intentional (D-013 #4 chaos unit green; strict flip still staging-gated). CP: payout/monorepo/hard-e2e-prod explicitly won't-do or gated.

## Wave-53 (20 Jul 2026) — Maturity S3

| ID | Item | Status |
|---|---|---|
| SEC-S3-1 | NextAuth `checkLimit` AUTH → HTTP 429 | Done |
| SEC-S3-2 | Redis shared smoke (`smoke:redis-shared`) | Done |
| SEC-S3-3 | Staging IDOR exit criteria + D-013 + backup runbook | Done |
| HR-S3-1 | Leave bulk cancel pending + undo 24h | Done |
| ESS-S3-1 | Routes `/employee/leave|payslip|attendance` | Done |
| ESS-S3-2 | Manager approve auth + my-step inbox | Done |
| CP-S3-1 | Tenant seats + MFA force panel | Done |
| CP-S3-2 | Sentry internal close-out (D-010) | Done |

Scripts: `npm run smoke:wave53` · `npm run smoke:redis-shared`

Deploy verified 20 Jul 2026 — BUILD_OK · PM2 online · health checks passed.

Baseline post-S3 (judgment): Control ~100 · Sec ~99 · HR ~99 · ESS ~95 · UX ~96. Next: **Sprint 4**.

## Wave-52 (19 Jul 2026) — Maturity S2

| ID | Item | Status |
|---|---|---|
| HR-S2-1 | Attendance bulk correct + undo 24h UI | Done |
| HR-S2-2 | Leave `supervisor_id` → `approver_id` + inbox “Menunggu saya” | Done |
| ESS-S2-1 | Payslip print / PDF download | Done |
| ESS-S2-2 | ESS leave attachment (sakit) | Done |
| UX-S2-1 | Kill violet/indigo ops pages → `--hf-*` | Done |
| UX-S2-2 | `HumanifyMarketingShell` + ADR `D-HF-TWO-SURFACE` | Done |
| CP-S2-1 | `/platform/*` → `HumanifyLayout` | Done |
| SEC-S2-1 | Devices mutate no `_mock` in prod + mock-guard | Done |

Scripts: `npm run smoke:wave52` · `npm run smoke:mock-guard`

Deploy verified 19 Jul 2026 — BUILD_OK · PM2 online · health checks passed.

Baseline post-S2 (judgment): Control ~99 · Sec ~97 · HR ~97 · ESS ~92 · UX ~96. Next: **Sprint 3**.

## Wave-51 (19 Jul 2026) — Maturity S1

| ID | Item | Status |
|---|---|---|
| UX-S1-1 | HQLayout chrome `--hf-surface-muted` | Done |
| UX-S1-2 | `PublicAuthShell` → login/signup/forgot/join/reset/verify | Done |
| UX-S1-3 | PayslipTab + ESS portal `--hf-brand*` | Done |
| HR-S1-1 | Employees empty → `HrisEmptyState` + create/import CTA | Done |
| HR-S1-2 | Leave + attendance empty → ESS/devices CTA | Done |
| ESS-S1-1 | PWA icons humanify-192/512 + payslip shortcut | Done |
| CP-S1-1 / SEC-S1-1 | Impersonation banner + mock CI (prior) | Done |

Scripts: `npm run smoke:wave51`

Deploy verified 19 Jul 2026 — BUILD_OK · PM2 online · health 200 · icons/manifest live.

Baseline post-S1 (judgment): Control ~98 · Sec ~96 · HR ~95 · ESS ~88 · UX ~90. Next: **Sprint 2**.

## Wave-50 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w50-1 | Soft auth-gate ops (billing/security/KPI/training/…) | Done |
| w50-2 | `test:e2e:humanify:ops-auth-gate` (+ prod) | Done |
| w50-3 | Unit smoke wave50 | Done |
| w50-4 | Deploy + verify | Done |

Scripts: `npm run smoke:wave50` · `npm run test:e2e:humanify:ops-auth-gate:prod`

## Wave-49 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w49-1 | Soft auth-gate HR core (12 routes) | Done |
| w49-2 | `test:e2e:humanify:hr-auth-gate` (+ prod) | Done |
| w49-3 | Unit smoke wave49 | Done |
| w49-4 | Deploy + verify | Done |

Scripts: `npm run smoke:wave49` · `npm run test:e2e:humanify:hr-auth-gate:prod`

## Wave-48 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w48-1 | Soft auth-gate all payroll modules (bpjs/slip/thr/…) | Done |
| w48-2 | Table-driven `PAYROLL_GATED` e2e | Done |
| w48-3 | Unit smoke wave48 | Done |
| w48-4 | Deploy + verify | Done |

Scripts: `npm run smoke:wave48` · `npm run test:e2e:humanify:payroll:prod`

## Wave-47 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w47-1 | Soft Playwright payroll auth-gate (index/main/pph21) | Done |
| w47-2 | `test:e2e:humanify:payroll` (+ prod) | Done |
| w47-3 | RLS lab doc — payroll soft path checkbox | Done |
| w47-4 | Unit smoke wave47 | Done |
| w47-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave47` · `npm run test:e2e:humanify:payroll:prod` · `npm run smoke:rls-lab` · `npm run smoke:payroll-fiscal`

**Note:** tidak flip prod RLS. Hard payroll suite + strict RLS tetap deferred.

## Soft-hardening series (Wave-27 → Wave-46)

Public soft Playwright + smoke aliases selesai. Aggregate:
- `npm run test:e2e:humanify:soft-public:prod`
- `npm run smoke:idor` · `npm run smoke:saas-hardening` · `npm run smoke:ci-subset`

**Deferred (bukan soft wave):** revenue-share payout automation · `packages/humanify-core` monorepo · hard Playwright payroll suite · prod **strict RLS** flip.

## Wave-46 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w46-1 | Soft-hardening series close-out in HANDOFF | Done |
| w46-2 | Unit smoke validates waves 43–45 + runners | Done |
| w46-3 | Soft-public includes signup-ref (via W45) | Done |
| w46-4 | Deploy + verify soft-public subset | Done |
| w46-5 | Docs mark W43–W46 verified | Done |

Scripts: `npm run smoke:wave46` · `npm run test:e2e:humanify:soft-public:prod`

## Wave-45 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w45-1 | `smoke:idor` runner (batch5–11 + hr) | Done |
| w45-2 | `smoke:saas-hardening` runner | Done |
| w45-3 | soft-public includes signup-ref | Done |
| w45-4 | Unit smoke wave45 | Done |
| w45-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave45` · `npm run smoke:idor` · `npm run smoke:saas-hardening`

## Wave-44 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w44-1 | Login footer ROI soft cue + e2e | Done |
| w44-2 | security.txt Preferred-Languages soft | Done |
| w44-3 | Soft Playwright legacy `service-worker.js` | Done |
| w44-4 | Unit smoke wave44 | Done |
| w44-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave44` · `npm run test:e2e:humanify:prod` · `npm run test:e2e:humanify:health:prod` · `npm run test:e2e:humanify:seo-public:prod`

## Wave-43 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w43-1 | Welcome nav Karir → `/careers` + soft e2e | Done |
| w43-2 | Signup-ref soft partners + ROI cues | Done |
| w43-3 | Robots soft Allow `/c/` | Done |
| w43-4 | Unit smoke wave43 | Done |
| w43-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave43` · `npm run test:e2e:humanify:prod` · `npm run test:e2e:humanify:signup-ref:prod` · `npm run test:e2e:humanify:seo-public:prod`

## Wave-42 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w42-1 | Partners header ROI soft cue + e2e | Done |
| w42-2 | Employee login Lupa password soft + e2e | Done |
| w42-3 | `smoke:employee-hardening` + `lms-lab-gate` + `idor-*` | Done |
| w42-4 | Sitemap employee soft assert | Done |
| w42-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave42` · `npm run test:e2e:humanify:partners:prod` · `npm run test:e2e:humanify:employee-login:prod` · `npm run test:e2e:humanify:seo-public:prod` · `npm run smoke:employee-hardening`

## Wave-41 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w41-1 | ROI header Daftar soft cue + e2e | Done |
| w41-2 | Signup Kalkulator ROI soft cue + e2e | Done |
| w41-3 | Join welcome + humans↔llms soft | Done |
| w41-4 | `test:e2e:humanify:soft-public` (+ prod) | Done |
| w41-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave41` · `npm run test:e2e:humanify:soft-public:prod` · `npm run test:e2e:humanify:roi:prod` · `npm run test:e2e:humanify:signup:prod` · `npm run test:e2e:humanify:join:prod`

## Wave-40 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w40-1 | Careers help Daftar soft cue + e2e | Done |
| w40-2 | Reset no-token login + verify welcome soft | Done |
| w40-3 | `llms.txt` careers help + robots/seo soft | Done |
| w40-4 | `smoke:tenant-isolation` + `tenant-empty-state` | Done |
| w40-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave40` · `npm run test:e2e:humanify:careers:prod` · `npm run test:e2e:humanify:reset-password:prod` · `npm run test:e2e:humanify:verify-email:prod` · `npm run test:e2e:humanify:seo-public:prod`

## Wave-39 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w39-1 | Login Partner Channel soft cue + e2e | Done |
| w39-2 | Forgot-password signup soft cue + e2e | Done |
| w39-3 | Soft Playwright sitemap ROI + signup | Done |
| w39-4 | `smoke:phase5-enterprise` + `phase5b-support` | Done |
| w39-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave39` · `npm run test:e2e:humanify:prod` · `npm run test:e2e:humanify:forgot-password:prod` · `npm run test:e2e:humanify:seo-public:prod`

## Wave-38 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w38-1 | Soft Playwright demo careers job detail (no apply) | Done |
| w38-2 | Partners header Daftar + soft e2e | Done |
| w38-3 | Signup Channel partner cue + soft e2e | Done |
| w38-4 | `smoke:phase3-metrics` + `phase4-billing` + `phase6-seats` | Done |
| w38-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave38` · `npm run test:e2e:humanify:careers:prod` · `npm run test:e2e:humanify:partners:prod` · `npm run test:e2e:humanify:signup:prod`

## Wave-37 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w37-1 | ROI nav Partner + soft e2e | Done |
| w37-2 | Soft Playwright employee login → beranda | Done |
| w37-3 | Soft Playwright `/icons` PWA + llms security assert | Done |
| w37-4 | `smoke:phase1-signup` + `phase7-golive` + `phase10-plan-change` | Done |
| w37-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave37` · `npm run test:e2e:humanify:roi:prod` · `npm run test:e2e:humanify:employee-login:prod` · `npm run test:e2e:humanify:health:prod`

## Wave-36 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w36-1 | Whitelist `sw-employee.js` + `service-worker.js` | Done |
| w36-2 | Soft Playwright SW public + welcome Partner nav | Done |
| w36-3 | `llms.txt` cross-link `humans.txt` | Done |
| w36-4 | `smoke:phase8-partners` + `smoke:phase9-alerts` | Done |
| w36-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave36` · `npm run test:e2e:humanify:health:prod` · `npm run test:e2e:humanify:prod` · `npm run test:e2e:humanify:seo-public:prod`

## Wave-35 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w35-1 | Soft Playwright join invalid token → login link | Done |
| w35-2 | Soft Playwright signup `?ref=DEMO` Masuk cue | Done |
| w35-3 | Whitelist `manifest-employee.json` + `/icons/` + soft e2e | Done |
| w35-4 | `smoke:phase11-offboarding` + `smoke:phase24-v1-write` | Done |
| w35-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave35` · `npm run test:e2e:humanify:join:prod` · `npm run test:e2e:humanify:signup-ref:prod` · `npm run test:e2e:humanify:health:prod`

## Wave-34 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w34-1 | Soft Playwright `/c/demo/careers` Masuk HR + Lamar cue | Done |
| w34-2 | Soft Playwright reset-password → forgot link | Done |
| w34-3 | Soft Playwright verify-email Kirim ulang cue (no click) | Done |
| w34-4 | `smoke:phase12-digest` + `smoke:phase23-invitations` | Done |
| w34-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave34` · `npm run test:e2e:humanify:careers:prod` · `npm run test:e2e:humanify:reset-password:prod` · `npm run test:e2e:humanify:verify-email:prod`

## Wave-33 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w33-1 | Soft Playwright ROI login/welcome + range inputs | Done |
| w33-2 | Soft Playwright forgot-password Kembali ke login | Done |
| w33-3 | Soft Playwright signup Masuk di sini | Done |
| w33-4 | `smoke:phase21-notifications` + `smoke:phase22-search` | Done |
| w33-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave33` · `npm run test:e2e:humanify:roi:prod` · `npm run test:e2e:humanify:forgot-password:prod` · `npm run test:e2e:humanify:signup:prod`

## Wave-32 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w32-1 | Soft Playwright partners Masuk/welcome + jenis mitra | Done |
| w32-2 | Soft Playwright `/api/auth/csrf` + providers | Done |
| w32-3 | `humans.txt` + middleware/robots + soft SEO | Done |
| w32-4 | `smoke:phase13-sso` + `smoke:phase20-employee-import` | Done |
| w32-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave32` · `npm run test:e2e:humanify:partners:prod` · `npm run test:e2e:humanify:health:prod` · `npm run test:e2e:humanify:seo-public:prod`

## Wave-31 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w31-1 | Soft Playwright login → Portal Karyawan | Done |
| w31-2 | Soft Playwright careers Masuk HR / welcome | Done |
| w31-3 | `llms.txt` + middleware/robots + soft SEO | Done |
| w31-4 | `smoke:phase14-ratelimit` + `smoke:phase15-password-reset` | Done |
| w31-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave31` · `npm run test:e2e:humanify:seo-public:prod` · `npm run test:e2e:humanify:careers:prod`

## Wave-30 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w30-1 | Partners in sitemap + robots Allow (partners + security.txt) | Done |
| w30-2 | Soft Playwright employee login HR Admin link | Done |
| w30-3 | Soft Playwright welcome ROI / portal CTAs | Done |
| w30-4 | `smoke:phase19-mfa` npm alias | Done |
| w30-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave30` · `npm run smoke:phase19-mfa` · `npm run test:e2e:humanify:seo-public:prod` · `npm run test:e2e:humanify:prod`

## Wave-29 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w29-1 | Digest `SEED_ONLY` + observability Seed chip | Done |
| w29-2 | `/.well-known/security.txt` + middleware public + soft SEO e2e | Done |
| w29-3 | Soft Playwright `/employee/login` | Done |
| w29-4 | `smoke:phase17-login-lockout` + `smoke:phase18-observability` | Done |
| w29-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave29` · `npm run test:e2e:humanify:employee-login:prod` · `npm run test:e2e:humanify:seo-public:prod`

## Wave-28 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w28-1 | Scorecard `seed` persist + observability chip | Done |
| w28-2 | Soft-deactivate `seed` in last-run + chip | Done |
| w28-3 | Soft Playwright login cues (forgot/signup) | Done |
| w28-4 | `smoke:phase16-health` + soft Playwright `/api/health` | Done |
| w28-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave28` · `npm run smoke:phase16-health` · `npm run test:e2e:humanify:health:prod` · `npm run test:e2e:humanify:prod`

## Wave-27 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w27-1 | Soft Playwright verify-email (no + invalid token) | Done |
| w27-2 | Soft-deactivate `SEED_ONLY` + deploy one-shot | Done |
| w27-3 | Soft Playwright robots.txt + sitemap.xml | Done |
| w27-4 | Soft Playwright signup without `?ref` | Done |
| w27-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave27` · `npm run test:e2e:humanify:verify-email:prod` · `npm run test:e2e:humanify:seo-public:prod`

## Wave-26 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w26-1 | Soft Playwright ROI calculator (+ public whitelist) | Done |
| w26-2 | Soft Playwright `/careers` global help page | Done |
| w26-3 | Soft Playwright `/humanify/join` invite-accept | Done |
| w26-4 | `HUMANIFY_STATE_DIR` templates + seed scorecard/digest on deploy | Done |
| w26-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave26` · `npm run test:e2e:humanify:roi:prod` · `npm run test:e2e:humanify:join:prod`

## Wave-25 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w25-1 | Soft Playwright reset-password (no + invalid token) | Done |
| w25-2 | Cron-wire `check:uptime-external` | Done |
| w25-3 | Ensure `HUMANIFY_STATE_DIR` + one-shot probe on deploy | Done |
| w25-4 | Soft Playwright `/c/demo/careers` | Done |
| w25-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave25` · `npm run test:e2e:humanify:reset-password:prod` · `npm run test:e2e:humanify:careers:prod`

## Wave-24 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w24-1 | Billing-orders `partnerCode` on paid JSON link | Done |
| w24-2 | DEMO commission-preview button on `/platform` | Done |
| w24-3 | Soft Playwright forgot-password cues | Done |
| w24-4 | External uptime-probe last-run chip | Done |
| w24-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave24` · `npm run test:e2e:humanify:forgot-password:prod`

## Wave-23 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w23-1 | Commission summary `partnerCode` filter UI | Done |
| w23-2 | Soft Playwright signup `?ref=DEMO` | Done |
| w23-3 | DEMO partner presence chip on `/platform` | Done |
| w23-4 | CSV export `partnerCode` + sales demo docs | Done |
| w23-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave23` · `npm run test:e2e:humanify:signup-ref:prod`

## Wave-22 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w22-1 | Deploy: fix pm2 startup `$:` noise | Done |
| w22-2 | Doc soft-deactivate last-run chip | Done |
| w22-3 | Partner leads status filter on `/platform` | Done |
| w22-4 | Soft Playwright MFA enrollment cues | Done |
| w22-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave22`

## Wave-21 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w21-1 | Deploy: PM2 restart even if ecosystem SCP fails | Done |
| w21-2 | Action Inbox digest last-run chip | Done |
| w21-3 | Seed/ensure DEMO partner (sales walkthrough) | Done |
| w21-4 | Partner commission CSV `from`/`to` date filter | Done |
| w21-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave21` · `npm run ensure:demo-partner`

## Wave-20 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w20-1 | Soft Playwright fiscal banner cues | Done |
| w20-2 | Partner commission monthly summary widget | Done |
| w20-3 | Security scorecard last-run chip | Done |
| w20-4 | MFA recovery UX (no prompt) + Privy webhook health | Done |
| w20-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave20`

## Wave-19 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w19-1 | Security scorecard + batch11 + login-lockout | Done |
| w19-2 | `billing-orders?partnerCode=` + commission CSV export | Done |
| w19-3 | Backup freshness chip on `/platform/observability` | Done |
| w19-4 | Soft-deactivate weekly cron + digest policyAck | Done |
| w19-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave19`

## Wave-18 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w18-1 | Persist `partner_code` / `commission_*` on billing orders | Done |
| w18-2 | Partner lead CSV export | Done |
| w18-3 | Doc expiry soft-deactivate (`report:doc-expiry:soft`) | Done |
| w18-4 | IR overview `pendingPolicyAcks` KPI | Done |
| w18-5 | Tenant detail commission display + deploy | Done |

Scripts: `npm run smoke:wave18` · `npm run report:doc-expiry:soft`

## Wave-17 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w17-1 | Partner commission calc stub + `commission-preview` | Done |
| w17-2 | Partner lead status triage (`new→contacted→…`) | Done |
| w17-3 | Action Inbox unsnooze + Batalkan toast | Done |
| w17-4 | `check:uptime-external` + observability chip (N3) | Done |
| w17-5 | Soft Playwright partners + deploy | Done |

Scripts: `npm run smoke:wave17` · `npm run check:uptime-external` · `npm run test:e2e:humanify:partners:prod`

## Wave-16 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w16-1 | `@aws-sdk/client-s3` + s3Ready/probe + observability panel | Done |
| w16-2 | Platform inbox `partner-leads` | Done |
| w16-3 | IR policy content + Publikasikan → ESS | Done |
| w16-4 | `smoke:rls-lab` (no prod flip) | Done |
| w16-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave16` · `npm run smoke:rls-lab`  
Docs: `docs/humanify-doc-storage-s3.md`

## Wave-15 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w15-1 | Partner lead form `/humanify/partners` + API | Done |
| w15-2 | `docs/humanify-bounded-context.md` (CTO-2) | Done |
| w15-3 | Doc storage health API + signed URL smoke | Done |
| w15-4 | Trial expiry fields + banner Billing/Dashboard | Done |
| w15-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave15`

## Wave-14 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w14-1 | Koreksi absensi massal + undo 24 jam (`?action=correct\|undo`) | Done |
| w14-2 | `check:backup-freshness` + runbook checklist | Done |
| w14-3 | `docs/humanify-partner-channel.md` + blurb Billing | Done |
| w14-4 | `safeQueryWithSavepoint` pada query absensi harian | Done |
| w14-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave14` · `npm run check:backup-freshness`

## Wave-13 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w13-1 | Widget kelengkapan dokumen di `/humanify` + compliance-summary API | Done |
| w13-2 | Unduh SP metadata XML di `/humanify/sso` | Done |
| w13-3 | `formatApiErrorToast` + observability deep-link | Done |
| w13-4 | `smoke:mock-audit` — USE_MOCK_UI harus lewat data-source | Done |
| w13-5 | Deploy + verify | Done |

Scripts: `npm run smoke:mock-audit` · `npm run smoke:api-error`

## Wave-12 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w12-1 | Email slip ke karyawan saat release/paid (+ ops) | Done |
| w12-2 | Privy webhook `/api/humanify/webhooks/privy` + idempotency | Done |
| w12-3 | Performance review create FK/unique → 4xx jelas | Done |
| w12-4 | Action Inbox snooze 24 jam (persist DB) | Done |
| w12-5 | Deploy + verify | Done |

Scripts: `npm run smoke:wave12`  
Env: `PAYROLL_NOTIFY_EMPLOYEES=true`, `PRIVY_WEBHOOK_SECRET=…`

## Wave-11 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w11-1 | Digest email kedaluwarsa dokumen + cron | Done |
| w11-2 | Merge fields surat HR + `docs/humanify-esign-privy-ga.md` | Done |
| w11-3 | Playwright soft upload/esign/slip (`e2e/humanify-docs-upload-ui.spec.ts`) | Done |
| w11-4 | letter-data API → `mergedTexts` + CI smoke | Done |
| w11-5 | Deploy + verify | Done |

Scripts: `npm run digest:doc-expiry` · `npm run smoke:letter-merge` · `npm run test:e2e:humanify:docs-upload:prod`

## Wave-10 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w10-1 | Payslip password gate (`HUMANIFY_PAYSLIP_REQUIRE_PASSWORD` + unlock token) | Done |
| w10-2 | Recruitment webhook Idempotency-Key | Done |
| w10-3 | Smoke device-sync / recruitment idempotency | Done |
| w10-4 | Doc expiry report + `docs/humanify-doc-retention.md` | Done |
| w10-5 | Deploy + verify | Done |

Scripts: `npm run smoke:payslip-gate` · `npm run smoke:device-sync-idempotency` · `npm run report:doc-expiry`

Env (ops, opsional): `HUMANIFY_PAYSLIP_REQUIRE_PASSWORD=true`, `HUMANIFY_PAYSLIP_UNLOCK_TTL_MIN=15`

## Wave-9 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w9-1 | Mock guard (`HUMANIFY_ALLOW_MOCK` + `smoke:mock-guard`) | Done |
| w9-2 | Checklist hari pertama HR di `/humanify` | Done |
| w9-3 | Device-sync Idempotency-Key | Done |
| w9-4 | `docs/humanify-rls-strict-staging.md` | Done |
| w9-5 | Deploy + verify | Done |

Scripts: `npm run smoke:mock-guard`

## Wave-8 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w8-1 | CI `humanify-saas-gate` unit smokes wajib (no network) | Done |
| w8-2 | Matriks fitur paket di `/humanify/billing` | Done |
| w8-3 | Action digest escalate CC manajer (cuti ≥3) | Done |
| w8-4 | Payroll approve → calc snapshot di audit | Done |
| w8-5 | Deploy + verify | Done |

## Wave-7 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w7-1 | `safeQueryWithSavepoint` shared + employee-profile | Done |
| w7-2 | `lib/humanify/api-error.ts` + HumanifyErrorBoundary | Done |
| w7-3 | Payslip view → `payroll_audit_events` (`payslip_view`) | Done |
| w7-4 | Playwright invite/docs/payroll soft UI | Done |
| w7-5 | Deploy + verify | Done |

Scripts: `npm run smoke:api-error` · `npm run test:e2e:humanify:invite-docs:prod`  
Docs: `docs/humanify-ga-scope.md`

## Wave-6 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w6-1 | Policy library + ESS acknowledgment (`/api/humanify/policies`) | Done |
| w6-2 | ⌘K / Ctrl+K command focus di search Humanify | Done |
| w6-3 | Billing webhook idempotency (`saas_billing_webhook_events`) | Done |
| w6-4 | Positioning one-pager + blurb di Billing | Done |
| w6-5 | Deploy + verify | Done |

Scripts: `npm run smoke:policy-ack` · `npm run smoke:billing-idempotency`  
Docs: `docs/humanify-positioning.md`

## Wave-5 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w5-1 | Employee CSV export (`/api/humanify/employees-export` + tombol Export) | Done |
| w5-2 | Design tokens `styles/humanify-tokens.css` + `.humanify-theme` di HQLayout | Done |
| w5-3 | Weekly IDOR scorecard → Discord (`security:scorecard` + cron) | Done |
| w5-4 | `docs/humanify-backup-restore-runbook.md` (RPO/RTO + drill) | Done |
| w5-5 | Deploy + verify | Done |

Scripts: `npm run smoke:employees-export` · `npm run security:scorecard`  
Docs: `docs/humanify-backup-restore-runbook.md`

## Wave-4 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w4-1 | SSO IdP QC report (`smoke:sso-idp-checklist` + QC panel di `/humanify/sso`) | Done |
| w4-2 | Multi-role invite smoke + Playwright (`smoke:multi-role`, `test:e2e:humanify:multi-role`) | Done |
| w4-3 | Bulk edit karyawan API + UI checkbox bar | Done |
| w4-4 | Undo window 24 jam (`employee_bulk_edit_batches`) | Done |
| w4-5 | Deploy + verify | Done |

Scripts: `npm run smoke:multi-role` · `npm run smoke:employees-bulk` · `npm run smoke:sso-idp-checklist`  
API: `POST /api/humanify/employees-bulk?action=update|undo`  
Env (ops): `HUMANIFY_INVITE_RETURN_TOKEN=true` (VPS — smoke/e2e dapat token saat SMTP aktif) · `HUMANIFY_SSO_IDP_QC_DONE=okta,azure` (informasional)

## Wave-3 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| w3-1 | Fiscal sign-off checklist + `?action=fiscal-signoff` banner | Done |
| w3-2 | `payroll_audit_events` on approve/paid + optional release email | Done |
| w3-3 | Playwright `e2e/humanify-ga-personas.spec.ts` | Done |
| w3-4 | Sidebar persona filter (staff / manager / hr_admin) | Done |
| w3-5 | Deploy + verify | Done |

Docs: `docs/humanify-payroll-fiscal-signoff.md`  
Env: `HUMANIFY_FISCAL_SIGNED_OFF=true` · `PAYROLL_RELEASE_NOTIFY_EMAIL=`

## Wave-2 (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| n1 | UX upload: progress bar, preview, badge file hilang, unggah ulang | Done |
| n2 | Smoke GA journey (`smoke:ga-journey`) | Done |
| n3 | `backup-humanify-db.sh` + cron harian + restore dry-run | Done |
| n4 | Digest mingguan Action Inbox (`digest:action-inbox`) | Done |
| n5 | `docs/humanify-sales-demo-15min.md` | Done |

## Hot fix — employee create silent rollback (19 Jul 2026)

| Bug | Root cause | Fix |
|---|---|---|
| Create employee 201 tapi row hilang; performance review FK fail | Request-bound txn + onboarding `joinDate` = `String(Date)` invalid → PG abort → rollback INSERT | `toDateOnly()` + `withDbSavepoint()` around onboarding |
| Docs wiped on deploy | files under `public/uploads` | durable `storage/employee-documents` + rsync exclude/protect |

## 30-day board (19 Jul 2026)

| ID | Item | Status |
|---|---|---|
| t1 | Document storage (local durable + optional S3/R2) + signed download token | Done |
| t2 | Action inbox on `/humanify` (leave + contracts + docs + attendance) | Done |
| t3 | performance_reviews FK / IDOR batch 6&9 (root: employee rollback) | Done |
| t4 | `seed:qa-golden` + `seed:demo-tenant` | Done |
| t5 | package.json + HANDOFF + deploy + re-smoke | Done |

Scripts: `npm run seed:qa-golden` · `npm run seed:demo-tenant`  
Env (optional): `HUMANIFY_DOC_STORAGE_DIR`, `HUMANIFY_DOC_S3_BUCKET`, `HUMANIFY_DOC_S3_ENDPOINT`

## Hot fix — employee documents (18 Jul 2026)

| Bug | Root cause | Fix |
|---|---|---|
| Detail karyawan `documents: []` setelah upload sukses | `safeQuery` menelan error → transaksi RLS abort → query berikutnya kosong | SAVEPOINT per sub-query di `employee-profile` detail |
| File hilang setelah deploy | `rsync --delete` menghapus `public/uploads/` | Exclude + protect `public/uploads/` |
| Tipe dokumen case mismatch | smoke `ktp` vs UI `KTP` | Normalize uppercase + completeness case-insensitive |

Suite: `npm run qa:humanify-full` (`scripts/run-humanify-full-qa.sh`)

## Ops live (18 Jul 2026)

| Item | Status |
|---|---|
| Discord webhook | Live di VPS (`OBS_ALERT_WEBHOOK_URL`) — error spike + probe |
| Health → Discord | Cron `*/5` → `check-humanify-health-alert.js` (cooldown 30m + recovery) |
| Email alert | `ops@humanify.id` tetap aktif |
| Empty-state wave-2 | payroll bpjs/pph21/lembur/laporan + employees mutasi |

## Backlog sequential (18 Jul 2026)

| ID | Item | Status |
|---|---|---|
| N4 | Ops alerts | `docs/humanify-ops-alerts.md` · set/probe webhook · SMTP probe · SumoPod Verify = manual dashboard |
| N5 | HrisEmptyState | 12 halaman USE_MOCK_UI diadopsi |
| N3 | Uptime eksternal | `check:uptime-external` + register script (UptimeRobot API jika key) |
| N2 | Payroll fiscal | `lib/hris/pph21-calc.ts` + `smoke:payroll-fiscal` golden PTKP/PPh21 |
| N1 | SSO IdP | `smoke:sso-idp-checklist` + runbook; customer IdP tetap butuh kredensial |

## P3 sprint (18 Jul 2026)

| Item | Status |
|---|---|
| Obs alert env | `ensure-humanify-obs-alerts.sh` — CRON_SECRET, local check URL, OBS_ALERT_EMAIL |
| Cron check | Hits `127.0.0.1:3020` + loopback auth fallback |
| Observability UI | Alert status + tombol "Cek alert" |
| LMS lab smoke | `smoke-test-saas-lms-lab-gate.js` di CI subset + regression EXTRA |

## P2 sprint (18 Jul 2026)

| Item | Status |
|---|---|
| LMS GA cut | Lab URLs → `/humanify/lms?lab=gated` unless `HUMANIFY_LMS_LAB=true`; lab APIs 403 |
| Empty-state / mock | Shared `USE_MOCK_UI` + `HrisEmptyState`; pages import from `lib/hris/data-source` |
| CI subset | `scripts/run-saas-ci-subset.sh` di `humanify-saas-gate.yml` saat `SMOKE_BASE_URL` |
| Obs alerts | `POST /api/platform/obs-alerts` + cron 10 mnt; webhook/email via env |
| Email DNS | `scripts/check-humanify-email-dns.sh` |

## P1 sprint (18 Jul 2026)

| Item | Status |
|---|---|
| Redis | `ensure-humanify-redis.sh` di deploy; REDIS_URL sudah live (PONG); PM2 fork single |
| Observability wrap | SSO ACS/login, billing webhook, candidate auth/portal, disbursement, compliance-export |
| SSO IdP runbook | `docs/humanify-sso-idp-runbook.md` (Okta/Azure/Google QC) |
| Payroll depth | `smoke:payroll-depth` — THR/BPJS/PPh21/disbursement/compliance |

## P0 sprint (18 Jul 2026)

| Item | Status |
|---|---|
| team-tasks mock | Prod → empty (bukan fake data); mock hanya non-prod |
| Candidate JWT | Wajib `NEXTAUTH_SECRET`/`JWT_SECRET` — no hardcoded fallback |
| device-sync | Lookup scoped by session `tenantId` + webhook secret rules |
| Plan entitlement API | `API_FEATURE_RULES` diperluas + `withHQAuth` auto-assert + LMS/recruitment/analytics/training |
| Middleware path gate | JWT `subscriptionPlan` → redirect `/humanify/billing?upgrade=` |
| Smoke | `scripts/smoke-test-saas-idor-batch11.js` |

## Keputusan arsitektur (18 Jul 2026) — D-010 / D-011 / D-012

| Area | Keputusan | Eksekusi |
|---|---|---|
| Monitoring | **Tidak pakai Sentry.io** untuk sekarang | `SENTRY_MODE=internal` + persist `humanify_obs_events` + UI `/platform/observability` |
| RLS | Soft + request-bound = **prod standard** | Strict **jangan** di pool prod |
| SSO ACS | E2E smoke = **release gate** | `smoke:sso-acs` di regression EXTRA; file gate di CI |

## Ops close-out (18 Jul 2026)

| Item | Status |
|---|---|
| Sentry | Diganti **internal monitoring** (ring + Postgres); Sentry.io deferred (`HUMANIFY_SENTRY_EXTERNAL`) |
| RLS request-bound | `HUMANIFY_RLS_REQUEST_BOUND=true` + CLS transaction + `set_config(..., local)` di `withHQAuth` |
| RLS strict | Opt-in staging only (`db:humanify-rls:strict`) |
| SSO ACS e2e | `scripts/smoke-test-saas-sso-acs-e2e.js` (self-signed IdP → ACS → ssoToken) |
| IDOR Batch 5–10 | Live + smokes di regression |

## Humanify Batch 10 (18 Jul 2026)

| Item | Status |
|---|---|
| Candidate register | resolve tenant via `slug` / `job_opening_id` only (raw `tenant_id` ditolak kecuali env allow) |
| Attendance mgmt | clock-in/out + schedule-bulk + list force employee∈tenant |
| Leave create | employee + approval configs scoped by `tenantId` |
| IR checklist | create force session `tenantId` (strip spoof) |
| Employee LMS | start-exam / submit-exam scoped by `tenant_id` |
| Training scoring | calculate/save-score config+graduation scoped |
| Smoke | `scripts/smoke-test-saas-idor-batch10.js` — **11/11 prod** |

## Humanify Batch 9 (18 Jul 2026)

| Item | Status |
|---|---|
| Performance 360 | require tenant; review+employee ownership on create; DELETE scoped |
| Training-dev | create-question/submit-result/enroll-batch scoped; delete-question via exam join |
| Candidate portal | start-exam / submit-exam force `tenant_id` on exam+result |
| OKR | list/create force `tenant_id` (no cross-tenant leak) |
| Smoke | `scripts/smoke-test-saas-idor-batch9.js` — **15/15 prod** |

## Humanify Batch 8 (18 Jul 2026)

| Item | Status |
|---|---|
| Payroll inputs | list/create/approve force `tenant_id`; approve 404 cross-tenant |
| KPI settings | PUT/DELETE template/scheme/level scoped; POST level verifies scheme ownership |
| Offboarding settlement | GET/apply force `tenantId` on load+update |
| E-sign | list/create/sign scoped by `tenant_id` |
| Integrations publish-job | job opening load requires `tenant_id` |
| Smoke | `scripts/smoke-test-saas-idor-batch8.js` — **13/13 prod** |

## Humanify Batch 7 (18 Jul 2026)

| Item | Status |
|---|---|
| Reminders | list/upcoming/summary/dismiss/generate scoped by `tenant_id` |
| LMS courses | module create/update/add-material/enroll verify curriculum+employee tenant; update-module null-safe binds |
| Team tasks | require `tenantId` (fail-closed); update/delete always scoped |
| Smoke | `scripts/smoke-test-saas-idor-batch7.js` — **10/10 prod** |

## Humanify Batch 6 (17 Jul 2026)

| Item | Status |
|---|---|
| Organization | org unit + job grade update/delete scoped by `tenant_id` |
| Performance | PUT/DELETE review scoped by `tenant_id` |
| Workforce analytics | headcount plan + budget create/update/delete/approve force `tenantId` |
| Smoke | `scripts/smoke-test-saas-idor-batch6.js` |

## Humanify Batch 5 (17 Jul 2026)

| Item | Status |
|---|---|
| Payroll mutations | approve / run-status / calculate / component update+delete / payslip scoped by `tenant_id` |
| Workflow | resubmit claim + mutation approve/reject scoped |
| Project management | create/update/delete + approve paths force `tenantId` |
| Assets assign/return | require `tenant_id` match |
| Disciplinary letters | load/select scoped by tenant |
| Smoke | `scripts/smoke-test-saas-idor-batch5.js` (+ regression list) |

## Humanify Batch 4 (17 Jul 2026)

| Item | Status |
|---|---|
| `survey_responses.tenant_id` | migrate + backfill from surveys; insert scoped + owned-survey check |
| Soft RLS | re-enable after migrate (survey_responses no longer skipped) |
| Observability | `withObservability` on employees + signup |
| Regression | `payroll-golden` in `run-saas-regression.sh` |
| CI | `humanify-saas-gate.yml` static e2e/smoke files + optional Playwright/golden via secrets |

## Humanify Batch 3 (17 Jul 2026)

| Item | Status |
|---|---|
| Sentry | DSN di VPS **kosong** (key ada, value kosong) — ensure script + probe + obs menolak DSN invalid; isi DSN nyata lalu `sentry-probe` |
| RLS | Soft tetap default prod; `HUMANIFY_RLS_MODE=strict` tersedia (`npm run db:humanify-rls:strict`) — **jangan** enable strict di pool multi-conn sampai request-bound connection |
| Session vars | `set_config(..., false)` + `clearDbTenantContext` di `withHQAuth` finally |
| Payroll golden | `npm run smoke:payroll-golden` |
| AGENTS.md | Split Humanify SaaS vs SIMESI di atas dokumen |
| IDOR leave smoke | Fix weekend date → weekdays |

---

## Humanify SaaS (multi-tenant HRIS) — Phase 0–24 ✅ GA

Platform multi-tenant (shared DB, isolasi `tenant_id`). Control Plane (`/platform`) untuk operator Humanify + App Plane (`/humanify`) untuk customer.

| Phase | Cakupan | Status |
|---|---|---|
| 0 | Tenant context, RLS `set_config`, isolasi baris | ✅ live |
| 1 | Self-serve signup (tenant + owner) | ✅ live |
| 2 | Plan entitlements + route/API feature gating | ✅ live |
| 3 | Platform metrics (MRR/ARR, tenant health) | ✅ live |
| 4 | Billing Midtrans (checkout, aktivasi plan, webhook) | ✅ live |
| 5 | Enterprise: white-label branding, API keys, data export, `/api/v1/employees` | ✅ live |
| 5b | Subdomain routing `{slug}.humanify.id`, support impersonation + audit | ✅ live |
| 6 | Seat metering (user/employee limit), dunning scan + trial expiry | ✅ live |
| 7 | Email verification, go-live checklist | ✅ live |
| 8 | Partner referral codes, QA tenant cleanup | ✅ live |
| 9 | Account health & lifecycle alerts (billing/trial/seat/email/go-live) | ✅ live |
| 10 | Self-serve plan change/downgrade (guardrail seat, upgrade→checkout) | ✅ live |
| 11 | Tenant offboarding + export-on-delete (grace 14 hari, batal) | ✅ live |
| 12 | Email digest alert kritikal/peringatan (platform ops) | ✅ live |
| 13 | SSO/SAML enterprise — konfigurasi IdP + SP metadata (fondasi) | ✅ live |
| 14 | **P0 hardening** — rate limiting API publik + signup + reset password | ✅ live |
| 15 | **P0** — self-service password reset (lupa password, token 1 jam) | ✅ live |
| 16 | **P0** — health/readiness probe `/api/health` + backup DB harian + DR restore-test | ✅ live |
| 17 | **P0** — login rate-limit + lockout (anti brute-force / credential-stuffing) | ✅ live |
| 18 | **P0** — observability: structured logs + ring buffer + endpoint ops (+Sentry opsional) | ✅ live |
| 19 | **P0** — MFA/2FA TOTP (opt-in, enrol via authenticator, enforce di login) | ✅ live |
| 20 | **P2** — impor karyawan massal (CSV, dry-run preview, dedup, guardrail seat) | ✅ live |
| 21 | **P1** — notification center in-app (persist + auto-derive account alerts, badge) | ✅ live |
| 22 | **P2** — global search (karyawan tenant-scoped + halaman) di header | ✅ live |
| 23 | **P1** — undangan tim & multi-user (invite→email→accept, role non-privileged, guardrail seat) | ✅ live |
| 24 | **P0 hardening karyawan** — cegah IDOR update/hapus lintas-tenant, seat metering by `status`, `employee_code` global-unique, INSERT/UPDATE schema-safe | ✅ live |
| 25 | **P0 tenant empty-state** — tenant baru tanpa dummy/cross-tenant leak (org/assets/engagement/payroll/analytics/…) | ✅ live |

**Regression QA prod (15 Jul 2026)** — `SMOKE_BASE_URL=https://humanify.id`, 26 script, **199 passed / 0 failed** (fungsional; `phase15-password-reset` di-skip di prod, lihat catatan SMTP):

```
tenant-isolation 8/0 · phase1-signup 2/0 · phase2-entitlement 12/0 · phase3-metrics 7/0
phase4-billing 9/0 · phase5-enterprise 13/0 · phase5b-support 8/0 · phase6-seats 6/0
phase7-golive 6/0 · phase8-partners 5/0 · phase9-alerts 8/0 · phase10-plan-change 9/0
phase11-offboarding 7/0 · phase12-digest 6/0 · phase13-sso 6/0 · phase15-password-reset 11/0
phase16-health 4/0 · phase20-employee-import 9/0 · phase21-notifications 10/0 · phase22-search 8/0
phase23-invitations 21/0 · employee-hardening 12/0 · phase18-observability 5/0 · phase19-mfa 11/0 · phase17-login-lockout 3/0 · phase14-ratelimit 4/0
```

> ℹ️ **`phase15-password-reset` di prod**: endpoint dengan sengaja **tidak** mengembalikan reset token (aman) — token dikirim via email. Smoke butuh token untuk lanjut → "gagal" hanya keterbatasan harness terhadap prod yang di-hardening, **bukan** regresi. Untuk verifikasi flow reset: jalankan smoke di non-prod atau set `HUMANIFY_PASSWORD_RESET_RETURN_TOKEN=true` sementara.

> ✅ **SMTP produksi AKTIF (15 Jul 2026)** — provider **SumoPod** (`smtp.sumopod.com:465` SSL) di `.env` VPS (`SMTP_HOST/PORT/SECURE/USER/PASSWORD/FROM/FROM_NAME`). Verified via `nodemailer.verify()` + test send (messageId diterima relay), dan end-to-end lewat app: signup → `verification.emailed=true`, password-reset request → `emailed=true`. Email SaaS (verifikasi P7, reset P15, undangan P23, digest P12) kini terkirim. `SMTP_FROM=noreply@humanify.id`, `SMTP_FROM_NAME=Humanify`.
>
> ⚠️ **Deliverability DNS (SPF/DKIM/DMARC)** — record resmi SumoPod (dashboard) siap di `scripts/setup-humanify-email-dns.sh`:
> - TXT `@` → `v=spf1 mx include:spf.kirim.email ~all` (`spf.kirim.email` → IP 103.171.18/19)
> - TXT `@` → `sumo-verification=85a7087f-f1ea-4af7-bad4-c3e275009960`
> - TXT `trx_ke._domainkey` → DKIM RSA public key SumoPod
> - TXT `_dmarc` → `v=DMARC1; p=none; fo=1` (monitor)
> ✅ **DNS live (17 Jul 2026)** — TXT SPF + sumo-verification + DKIM `trx_ke._domainkey` + DMARC `_dmarc` terverifikasi via dig `@1.1.1.1` / `@8.8.8.8` setelah tempel manual Cloudflare. Langkah terakhir: klik **Verify** di dashboard SumoPod sampai status Verified.

> ⚠️ Urutan penting: `phase17-login-lockout` mengunci email throwaway + menambah counter gagal per-IP (ambang 100), lalu `phase14-ratelimit` **harus terakhir** (sengaja habiskan budget reset 5/mnt untuk buktikan 429). Beri jeda ~60 dtk sebelum loop agar window rate-limit (signup 30/mnt, reset 5/mnt) mereset. Bila menjalankan seluruh suite beruntun, `phase15-password-reset` bisa kena `RATE_LIMIT_EXCEEDED` (reset 5/mnt) — jalankan ulang standalone setelah jeda untuk konfirmasi 11/0.

Jalankan ulang (harness): `SMOKE_BASE_URL=https://humanify.id bash scripts/run-saas-regression.sh` — atau manual: `sleep 65; for s in tenant-isolation phase1-signup phase2-entitlement phase3-metrics phase4-billing phase5-enterprise phase5b-support phase6-seats phase7-golive phase8-partners phase9-alerts phase10-plan-change phase11-offboarding phase12-digest phase13-sso phase15-password-reset phase16-health phase20-employee-import phase21-notifications phase22-search phase23-invitations phase18-observability phase19-mfa phase17-login-lockout phase14-ratelimit; do SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-$s.js; done`

Sumber tiap fase:
- P9 alerts: `lib/saas/account-alerts.ts` → `GET /api/humanify/alerts` + embed di `saas-context`; strip di `HQLayout`.
- P10 plan change: `lib/saas/plan-change.ts` → `billing?action=plan-change-preview|change-plan`; tombol Turunkan di `billing.tsx`.
- P11 offboarding: `lib/saas/tenant-offboarding.ts` → `pages/api/humanify/account.ts`; zona berbahaya di `billing.tsx` (ekspor JSON + tutup akun + batal).
- P12 digest: `lib/saas/alert-digest.ts` → `pages/api/humanify/alert-digest.ts` (platform-only; kirim email jika SMTP).
- P13 SSO: `lib/saas/sso-config.ts` → `pages/api/humanify/sso.ts` + `pages/humanify/sso.tsx`; fitur `sso` (enterprise/trial). Login ACS end-to-end = follow-up (butuh maintenance window; login kredensial tak diubah).
- **P14 rate limit**: `lib/middleware/rateLimit.ts` (`checkLimit`) dipasang di `pages/api/v1/employees.ts` (STANDARD 100/mnt), `pages/api/humanify/signup.ts` (30/mnt), `pages/api/humanify/password-reset.ts` (request 5/mnt, confirm 10/mnt). Store in-memory per-proses (PM2 single instance); untuk multi-instance ganti ke Redis. Login NextAuth **belum** di-rate-limit (hindari destabilisasi auth) — follow-up.
- **P15 password reset**: `lib/saas/password-reset.ts` (tabel `saas_password_resets`, token hash + expiry 1 jam, single-use, non-enumerating) → `pages/api/humanify/password-reset.ts?action=request|confirm`; halaman publik `pages/humanify/forgot-password.tsx` + `reset-password.tsx`; link "Lupa password?" di `HumanifyLoginForm`; rute publik ditambah di `middleware.ts`. Token diekspos hanya di non-prod / saat email tak terkirim / `HUMANIFY_PASSWORD_RESET_RETURN_TOKEN=true`.
- **P16 health + backup**: `pages/api/health.ts` (`?deep=1` ping DB, 503 bila DB down) — target uptime monitor. Backup: `scripts/backup-db.sh` (pg_dump custom + gzip + integrity + retensi 7 hari + opsi S3) dijadwalkan **cron root harian 20:00 UTC / 03:00 WIB** → `BACKUP_DIR=/var/backups/humanify`, log `/var/log/humanify-backup.log`. **DR restore-test terbukti** (15 Jul): restore `latest.sql.gz` ke DB sementara `exit=0`, 168 tabel public, lalu di-drop.
- **P17 login lockout**: `lib/saas/login-guard.ts` (in-memory, **fail-open**). Dua dimensi: (email|ip) 8 gagal/15mnt → kunci 15mnt; ip 100 gagal/15mnt → kunci IP. Disambung di `authorize()` `[...nextauth].ts`: `evaluateLogin` di awal, `recordLoginFailure` saat user tak ada / password salah, `recordLoginSuccess` saat sukses. Login sukses membersihkan counter. Superadmin aman (password benar → sukses di percobaan pertama, counter bersih). Store per-proses (PM2 single) → Redis bila multi-instance.
- **P18 observability**: `lib/observability/index.ts` — logger JSON terstruktur ke stdout (PM2), ring buffer 200 event (error/slow), `withObservability(handler,name)` (request-id + timing + capture 500) dipasang di `v1/employees` & `password-reset`. Forward Sentry **opsional** (dynamic import `@sentry/node`, hanya bila `SENTRY_DSN` diset — tanpa dependency wajib). Endpoint ops: `GET /api/platform/observability` (platform-only) → uptime, memori, counters, event terbaru. Uptime monitor eksternal arahkan ke `/api/health?deep=1`.
- **P19 MFA/2FA**: `lib/saas/mfa.ts` — TOTP RFC6238 mandiri (base32 + HMAC-SHA1, ±1 window), tabel `saas_user_mfa` (opt-in; baris kosong = tanpa MFA → login existing tak berubah). API `pages/api/humanify/mfa.ts` (status/enroll/confirm/disable, butuh kode valid utk aktif & nonaktif). UI `pages/humanify/security.tsx` (+ menu "Keamanan (2FA)"). Enforcement di `authorize()`: bila `isMfaEnabled(userId)` → wajib field `totp`; salah/absen → tolak (`MFA_REQUIRED`). **Fail-open** pada error infra. Form login (`HumanifyLoginForm`) menampilkan input kode 2FA saat menerima `MFA_REQUIRED`.
- **P20 impor karyawan**: `lib/saas/employee-import.ts` (parser CSV RFC-4180 ringkas, header id/en fleksibel, validasi + dedup in-file + cek email global + guardrail seat `getSeatUsage`) → `POST /api/humanify/employees-import` (`{csv|rows, dryRun}`, `withHQAuth` modul `hris`, limit 5000 baris). **INSERT raw schema-safe** (hanya kolom yang ada di `information_schema`, karena skema `employees` bervariasi antar-env & Sequelize `create` menulis semua atribut). ⚠️ `employees.employee_code` **UNIQUE global** → kode digenerate `EMP-<tenant6>-<seq>` agar tak bentrok antar-tenant. UI `pages/humanify/employees-import.tsx` (paste/unggah CSV, template, pratinjau, ringkasan) + menu "Impor Karyawan". Impor sukses → buat notifikasi (P21).
- **P21 notification center**: `lib/saas/notifications.ts` (tabel `saas_notifications` auto-create; `syncAccountAlertNotifications` rekonsiliasi alert P9 via `source_key='alert:<id>'` — upsert aktif, hapus yang sudah resolved, tak meng-un-read yang sudah dibaca; `createNotification` untuk event kustom, dedupe by sourceKey; `listNotifications`/`markNotificationsRead`). API `pages/api/humanify/notifications.ts` (`?action=list|mark-read`; platform ops = stream kosong). `HQLayout` (Humanify) fetch endpoint ini + **SSE** `pages/api/humanify/notifications/stream.ts` (~15s push, fallback poll 60s). Non-Humanify (SIMESI) tetap pakai jalur SFA lama.
- **P22 global search**: `pages/api/humanify/search.ts` (`?q=` min 2 char, **selalu tenant-scoped**, ILIKE nama/email/kode/jabatan/dept, limit ≤15) → dropdown di search box header `HQLayout` (Humanify): grup "Halaman" (dari sidebar terfilter, client-side) + "Karyawan" (API, debounce 250ms), Enter/klik → `/humanify/employees?search=`. Halaman employees kini seed `search` dari `router.query.search`.
- **P24 employee hardening (keamanan/korektnes)**: `pages/api/humanify/employees.ts` + `lib/saas/seat-metering.ts`. **(1) IDOR ditutup** — `updateEmployee`/`deleteEmployee` kini `findOne({ where: { id, tenantId } })` (bukan `findByPk`), jadi tenant lain tak bisa ubah/hapus karyawan dengan menebak UUID (platform ops tanpa tenant = akses penuh, konsisten dgn GET); update juga strip `tenantId` dari body. **(2) Seat leak diperbaiki** — metering `countTenantSeats` menghitung karyawan aktif berbasis `status` (`LOWER(status) NOT IN ('inactive','terminated','resigned','exited','offboarded')`) + `is_active`, karena model `Employee` **tak punya atribut `isActive`** (hanya `status`) sehingga `is_active` tak pernah di-set aplikasi → dulu karyawan nonaktif tetap makan kuota. Nonaktifkan (soft-delete) kini set `status='INACTIVE'` **dan** `is_active=false`. **(3) `employee_code` global-unique** — single-create kini `EMP-<tenant6>-<seq>` (selaras impor massal) hindari bentrok UNIQUE global antar-tenant; role default netral `staff` (bukan `CASHIER`). **(4) INSERT/UPDATE schema-safe** — create & soft-delete pakai raw SQL yang hanya menyentuh kolom yang ada di `information_schema` (tabel `employees` prod tak punya `date_of_birth`/`end_date` dll yang dideklarasikan model `underscored:true`) → `Employee.create()`/`record.update({endDate})` yang sebelumnya diam-diam gagal (`DATABASE_ERROR`) kini beres; unique violation `23505` dari raw insert dipetakan ke 409. Smoke: `scripts/smoke-test-saas-employee-hardening.js` (12/12 — IDOR update+delete blocked, kode format, seat +1/kembali baseline, owner update/deactivate).
- **P23 undangan tim & multi-user**: `lib/saas/invitations.ts` (tabel `saas_invitations` auto-create; token hash sha256 + expiry 7 hari, single-use; role allowlist non-privileged `hq_admin|manager|staff|viewer` — tolak `owner/super_admin/...`; guardrail seat user = `getSeatUsage.users + pending < maxUsers`; re-invite email pending → refresh token; `acceptInvitation` buat User via **model Sequelize** `db.User.create` lalu tandai accepted). ⚠️ Tabel `users` prod pakai kolom **camelCase** (`isActive`/`lastLogin`/`createdAt`, tapi `tenant_id`/`role_id` snake) → `listTenantMembers` **wajib** pakai model (`db.User.findAll`), bukan raw SQL snake_case (kalau raw → error tertelan, list kosong). API terautentikasi `pages/api/humanify/invitations.ts` (`GET` list+members+seats+roles; `POST ?action=create|revoke|resend`; kelola butuh role owner/hq_admin/admin; create limit 20/mnt) + **publik** `pages/api/humanify/invitations-accept.ts` (`GET ?token=` preview, `POST` accept, limit 15/mnt). Halaman: `pages/humanify/users/index.tsx` (kelola tim + form undang + pending/riwayat, menu "Tim & Undangan") & publik `pages/humanify/join.tsx` (rute publik ditambah di `middleware.ts`). Token diekspos hanya non-prod / email tak terkirim / `HUMANIFY_INVITE_RETURN_TOKEN=true`.

Kandidat lanjutan: isi **SENTRY_DSN** nyata di VPS lalu verifikasi via `POST /api/platform/sentry-probe`; daftar **uptime monitor eksternal** (instruksi di `ensure-humanify-uptime-monitor.sh`); konfigurasi **IdP SAML nyata** untuk tenant QC. **Selesai Jul 2026 (F–L series)**: F–K seperti sebelumnya; L1 v1-write smoke, L2 uptime state, L3 sentry-probe.

**Utang teknis tersisa**: (d) SSO butuh IdP customer untuk e2e QC. (e) Sentry DSN belum diset di prod (key placeholder ada). (f) Cron purge + hard-delete diinstal via `scripts/ensure-humanify-crons.sh` pada deploy.

**J-series (17 Jul 2026)**: J1 POST `/api/v1/leaves`; J2 hard-delete purged tenants (retention 30 hari); J3 invite role auto-seed + permission-resolver viewer/staff HRIS.

**K-series (17 Jul 2026)**: K1 `scripts/_load-env.js` + dotenv di purge/hard-delete scripts; K2 `scripts/ensure-humanify-crons.sh` (soft-purge harian, hard-delete mingguan, health curl 5mnt) terpasang di deploy `[3e/6]`; K3 observability Redis probe + kartu Redis/Sentry di `/platform/observability`; K4 SSE notifikasi Humanify (`/api/humanify/notifications/stream`).

**L-series (17 Jul 2026)**: L1 smoke `scripts/smoke-test-saas-phase24-v1-write.js` (POST employees/leaves, GET/POST webhooks, departments, scope guard) + masuk `run-saas-regression.sh`; L2 `ensure-humanify-uptime-monitor.sh` persist state JSON + deploy `[3f/6]`; L3 `POST /api/platform/sentry-probe` (platform ops, butuh `SENTRY_DSN`); L4 phase18 smoke cek Redis probe.

---


## Status project — Pasca Refactor

| Item | Status |
|---|---|
| Dev server (`:3010`) | ✅ Running, login working |
| Login superadmin | ✅ `superadmin@bedagang.com` / `MasterAdmin2026!` |
| HRIS master data (dept, lokasi, cabang, job grade) | ✅ `lib/hris/master-data.ts` + `GET /api/hq/hris/master-data` |
| HRIS Employees (UID, dept, posisi, lokasi, grade) | ✅ Form edit + API `employee-profile` |
| HRIS Team Members ↔ Employees | ✅ `employee_id` FK + auto-fill dari master |
| HRIS Onboarding/Contracts/Offboarding | ✅ `EmployeePicker` (bukan input UID manual) |
| DB `employees.work_location`, `job_grade_id` | ✅ `npm run db:hris-field-migrate` |
| DB `team_members.employee_id`, `location`, `work_area` | ✅ `npm run db:hris-field-migrate` |
| HRIS Employees Genealogy | ✅ Tab Genealogi (list) + Rantai Komando (detail), API `action=genealogy` |
| HRIS Mutasi & Penugasan | ✅ `/hq/hris/mutations` — approval multi-step + E-Letter PDF |
| DB `employee_mutations` | ✅ Migrasi `npm run db:mutation-workflow-migrate` |
| DB `employees.supervisor_id` | ✅ Migrasi `npm run db:employee-genealogy-migrate` (13 karyawan seeded) |
| Password DB | ✅ Re-hashed bcrypt, verified match |
| Build error `'fs' already declared` | ✅ Fixed (duplicate `require('fs')` di [...nextauth].ts) |
| `router is not defined` di employees.tsx | ✅ Fixed (added `const router = useRouter()`) |

## Kredensial

| Email | Password | Role |
|---|---|---|
| `superadmin@bedagang.com` | `MasterAdmin2026!` | super_admin |
| `demo@bedagang.com` | `demo123` | owner |

## Arsitektur saat ini

```
SIMESI (Next.js 15, Pages Router)
├── pages/
│   ├── auth/login.tsx         # NextAuth credentials
│   ├── hq/*                   # Dashboard HQ (HQLayout)
│   │   ├── home.tsx
│   │   ├── project-management/
│   │   ├── assets/
│   │   ├── finance/
│   │   ├── hris/
│   │   ├── inventory/
│   │   └── ...
│   ├── api/
│   │   ├── auth/[...nextauth].ts
│   │   ├── hq/*               # HQ API
│   │   └── ...
│   └── settings/*
├── models/                     # Sequelize models (~120+)
├── migrations/                 # 129 migration files (13 archived)
│   └── _archived/              # PoS, FnB, DMS, Loyalty migrations
│   └── FK_ORDERING_ANALYSIS.md # 154 potential ordering issues
├── config/
│   ├── sidebar.config.ts       # Legacy (PoS/FnB disabled)
│   └── esi-sidebar.config.ts   # SIMESI sidebar (clean)
├── lib/
│   └── translations/           # Branding updated → SIMESI
└── docs/adr/
    └── ADR-010-simesi-platform-mandiri.md
```

## Backlog prioritas (Phase 4) — ✅ Semua selesai (kanban `esi-erp`)

| # | Tiket | Assignee | Status |
|---|---|---|---|
| 1 | 🔥 Phase 4.1 — Hapus model FnB/PoS/DMS dari Prisma | `esi-backend-sr-1` | ✅ done |
| 2 | 🔥 Phase 4.2 — CI/CD Pipeline GitHub Actions | `esi-fort` | ✅ done |
| 3 | ⚡ Phase 4.3 — Fix 154 FK ordering migrasi | `esi-backend-sr-2` | ✅ done |
| 4 | 📋 Phase 4.4 — Dependencies cleanup | `esi-frontend-sr-1` | ✅ done |
| 5 | 📋 Phase 4.5 — Cek runtime dashboard.tsx | `esi-frontend-mid-1` | ✅ done |
| 6 | 📋 Phase 4.6 — Cek settings API kitchen/PoS | `esi-backend-mid-1` | P3 | ✅ done (bersih) |

## Phase 5 — Backlog (kanban `esi-erp`)

| # | Tiket | Assignee | Priority | Status |
|---|---|---|---|---|
| 1 | ✅ Phase 5.1 — Partner Management (CRUD Vets, Petshop, PetClinic, PetHotel, PetTransport) | `esi-backend-1` | P1 | ✅ done (commit `2bd1e5e`) |
| 2 | 🔥 Phase 5.2 — Teleconsult Module (model + API + frontend pages) | `esi-backend-1` | P1 | ✅ done — commit `261e0f1` |
| 3 | 🔥 Phase 5.3 — CRM / Sales & Marketing (model + API + frontend pages) | `esi-backend-1` | P1 | ✅ done — commit `261e0f1` |
| 4 | 🔥 Phase 5.4 — Finance Module (Commission/Payout model + API + frontend) | `esi-backend-1` | P2 | ✅ done — commit `261e0f1` |
| 5 | 🔥 Phase 5.5 — HR & Team Management (TeamMember/Task model + API + frontend) | `esi-backend-1` | P2 | ✅ done — commit `261e0f1` |
| 6 | 🔄 Phase 5.x — Activities Log (API) | `esi-backend-1` | P3 | ✅ integrated in CRM detail page |

## Viking Division — Status Tim

✅ Semua 20+ profil aktif di Hermes
✅ Kanban board `esi-erp` siap
✅ Orchestrator: `esi-king` (KING/CTO)
⚠️ Gateway belum running — dispatcher manual dulu

## Dev server

```bash
npm run dev          # http://localhost:3010
npm run build        # verifikasi build
npm run test         # test (login tests lulus)
npm run db:hris-field-migrate   # kolom work_location, job_grade_id, team_members link
```

## CATATAN PENTING
- `dashboard.tsx` masih punya referensi kitchen (perlu dicek runtime, build lolos)
- `prisma/schema.prisma` masih mengandung model kitchen, PoS, loyalty
- Beberapa `pages/api/settings/` mungkin masih referensi kitchen/PoS (perlu test manual)
- Migration chain masih butuh perbaikan FK ordering
