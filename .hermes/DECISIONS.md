# SIMESI — Architectural Decisions (formerly ESI ERP)

## D-001: SIMESI Platform Mandiri (formerly Fork from Bedagang)
**2026-07-02** — SIMESI bukan lagi fork Bedagang/NainERP. Refactoring Phase 1-3 selesai:
- Semua branding NainERP/bedagang → SIMESI
- Semua kode FnB/PoS/Kitchen/DMS dihapus
- Build lulus
- ADR: `docs/adr/ADR-010-simesi-platform-mandiri.md`

## D-002: Organisasi tunggal (D-ESI-001)

ESI tidak memakai multi-cabang. API `GET /api/hq/branches` adalah **stub** satu entitas HQ.
Jangan implementasi modul cabang penuh.

## D-003: Modul dikecualikan (D-ESI-002)
Tidak ada: PoS, FnB, Cabang, Manufaktur, Keuangan Ringkas, DMS, Livestreaming, BUMDes.

## D-004: Multi-tenant via `tenant_id`
Query bisnis filter `tenant_id` dari session. Super admin boleh cross-tenant.

## D-005: Auth & routing
- NextAuth credentials
- `/` → login atau `/hq/home` jika session ada
- `/auth/register` dinonaktifkan

## D-006: UI
- Sidebar: `config/esi-sidebar.config.ts`
- Layout: `HQLayout` + `useTranslation()`
- Port dev: **3010**

## D-007: Hermes Agent (D-ESI-003)
AI developer: [Hermes Agent](https://github.com/NousResearch/hermes-agent) + SumoPod.
- Setup: `npm run hermes:setup`
- Tim: `npm run hermes:team`
- Skills: `/esi-develop`, `/esi-hq`, `/esi-cto`
- Kanban: `esi-erp`
- CTO profile: `esi-king` (legacy: `esi-cto`)

## D-008: Fokus domain pet ecosystem B2B

Prioritas fitur: partner management (Vets, Petshop, PetClinic, PetHotel, PetTransport), teleconsult, booking, online shop backoffice, CRM sales & marketing, HR, finance/payout. Bukan konservasi satwa.

## D-009: Viking Division (Hermes AI Team)
Hierarki agent AI mengikuti **Viking Division** untuk ERP Sobatpaws.
- Sumber: [Google Doc Roles & Hierarchy](https://docs.google.com/document/d/1yT5Vq56Z7VQZQ5Sve1LoepPcSK3n7B1ZvgQLYSxiwE4/edit?usp=sharing)
- SOUL: `.hermes/SOUL.md`
- Roster: `hermes/team.yaml`
- Orchestrator kanban: `esi-king` (legacy alias: `esi-cto`)
- Budaya: No Silos, Data-Driven, Automate Everything, Shield Wall Loyalty

## D-010: Internal monitoring only (no Sentry.io for now) — 18 Jul 2026
**CTO + DevOps:** Humanify memakai **monitoring internal** saja.
- Transport: ring buffer + Postgres `humanify_obs_events` + UI `/platform/observability`
- Env: `SENTRY_MODE=internal`, DSN placeholder `https://humanify@internal.humanify.local/1`
- Sentry.io **deferred** — opt-in nanti: `HUMANIFY_SENTRY_EXTERNAL=true` + `SENTRY_MODE=external` + DSN nyata
- Probe: `POST /api/platform/sentry-probe` → mode `internal`

## D-011: RLS soft + request-bound (prod standard) — 18 Jul 2026
**CTO + Infra:** Isolasi tenant primer tetap app-level (`scopedWhere` / fail-closed).
- **Prod:** soft RLS + `HUMANIFY_RLS_REQUEST_BOUND=true` (`set_config(..., is_local)` dalam transaksi `withHQAuth`)
- **Strict RLS:** staging/lab only — jangan enable di pool prod (cron/job tanpa tenant akan fail-closed)
- Apply policies: `npm run db:humanify-rls`

## D-012: SSO ACS e2e sebagai release gate — 18 Jul 2026
**PM + DevOps:** Path SAML ACS sudah product-ready untuk enterprise IdP.
- Smoke wajib di regression EXTRA: `scripts/smoke-test-saas-sso-acs-e2e.js` (`npm run smoke:sso-acs`)
- CI gate: file presence di `humanify-saas-gate.yml`
- Onboarding IdP nyata: konfigurasi per-tenant (Phase 13) + metadata `/api/humanify/sso/metadata`

## D-HF-TWO-SURFACE: Marketing vs Ops chrome — 19 Jul 2026
**UX:** Humanify memakai **dua permukaan** yang disengaja (bukan inkonsistensi):
1. **Marketing (dark)** — welcome / partners / ROI: `HumanifyMarketingShell` + aksen brand; footer `NaincodeFooter`.
2. **Ops / ESS (light tokens)** — `/humanify/*` app + `/employee` + `/platform/*`: `.humanify-theme` + `--hf-*` via `HumanifyLayout`.
3. **Public auth** — `PublicAuthShell` (light) atau dark wrap untuk login/signup.

Jangan memaksa marketing ke slate HQ, dan jangan mewarnai ops dengan gradient violet Tailwind ad-hoc.

## D-013: Strict RLS prod gate — 20 Jul 2026
**CTO + Security:** Prod tetap **soft RLS + request-bound** sampai exit criteria staging terpenuhi:
1. `npm run smoke:rls-lab` hijau
2. IDOR scorecard 100% blocked (`SMOKE_BASE_URL` staging **atau** prod proxy `npm run smoke:idor` + weekly scorecard)
3. Lab backup/restore runbook di `docs/humanify-rls-strict-staging.md`
4. Chaos job tenant context (SEC-S4-2) hijau sebelum flip `HUMANIFY_RLS_MODE=strict` di pool prod

Flip strict di prod **tanpa** staging IDOR + chaos = dilarang.

## D-014: Hard Playwright payroll — staging gate — 20 Jul 2026
**QA + PM:** Soft payroll e2e (`e2e/humanify-payroll-ui.spec.ts` auth-gate) tetap **prod-safe**.
- Hard suite skeleton: `e2e/humanify-payroll-hard.spec.ts` — **skipped** unless `HUMANIFY_E2E_HARD=1` + staging base URL.
- Prod regression: soft gate only (`npm run test:e2e:humanify:payroll:prod`).
- Golden calc smoke remains `npm run smoke:payroll-golden` (API/unit, bukan UI login).

## D-015: Partner payout ledger deferred — 20 Jul 2026
**PM + Finance:** Automated Midtrans/partner payout ledger **won't-do** for maturity 100%.
- Source of truth: manual CSV / ops export + `estimatePartnerCommission` preview in `lib/saas/partners.ts`.
- Revisit when partner GMV volume justifies ledger + disbursement automation.

## D-016: Employee SW online-first — 20 Jul 2026
**ESS:** Service worker `public/sw-employee.js` is **online-first** (network, then cache fallback for shell only).
- No offline mutation queue for leave/attendance/payslip.
- Cache name bump to `humanify-employee-v3` on policy change.
- Offline ESS mutations = future epic, not maturity blocker.

## D-017: `packages/humanify-core` monorepo extract won't-do — 20 Jul 2026
**CTO:** Extracting shared core into `packages/humanify-core` is **out of scope** for maturity 100%.
- App stays single Next.js repo; shared libs under `lib/`.
- Revisit only if a second deployable (mobile BFF / worker package) needs a published package.

## D-012 addendum (Wave-54): Customer IdP SAML QC — 20 Jul 2026
**Ops:** Synthetic ACS smoke (`npm run smoke:sso-acs`) = **release gate**. Real customer IdP onboarding = ops runbook per tenant (metadata + ACS URL), not a code maturity gap.

## D-012b (Wave-55): IdP QC proof — 20 Jul 2026
**Ops + Control:** Literal enterprise QC = synthetic ACS green in CI (`smoke:sso-acs`) + metadata endpoint live. Real Okta/Azure IdP round-trip remains **customer onboarding** (documented in `docs/humanify-sso-idp-runbook.md` if present, else ops ticket). Counts as Control enterprise honesty for literal 100.

## D-014 amend (Wave-55): Hard payroll staging continuous — 20 Jul 2026
**QA:** Soft payroll e2e tetap prod-safe. Hard suite (`e2e/humanify-payroll-hard.spec.ts`) covers login → main → slip → PPh21 (no 5xx).
- Local/staging: `HUMANIFY_E2E_HARD=1` + staging/lab `PLAYWRIGHT_BASE_URL`.
- CI: file presence + unit smokes always; hard Playwright runs only when `secrets.SMOKE_BASE_URL` looks like staging/lab **and** `HUMANIFY_E2E_HARD=1` secret set.
- Prod soft gate never removed.

## D-015b (Wave-55): Ops payout ledger (reopen narrow) — 20 Jul 2026
**PM + Finance:** Reopen D-015 **only** for ops ledger:
- Table `saas_partner_payouts` + platform mark-paid + CSV export + partner status portal.
- Midtrans / auto-disbursement tetap **won't-do**.
- Market + Control literal 100 via ops ledger (manual transfer outside app).

## D-010b (Wave-55): Internal monitoring = Obs 100 ceiling — 20 Jul 2026
**CTO:** Keep `SENTRY_MODE=internal` as production standard. External Sentry.io remains opt-in (`HUMANIFY_SENTRY_EXTERNAL=true`). For literal Obs 100, internal ring + Postgres + Discord deep-link (`?ref=`) is the accepted ceiling — not a gap.

## D-013b (Wave-55): Security literal 100 without prod FORCE strict — 20 Jul 2026
**CTO + Security:** Until dedicated `staging.humanify.id` RLS lab is provisioned and green:
1. Prod stays **soft RLS + request-bound** (D-011).
2. Unit `smoke:rls-lab` + `smoke:rls-job-chaos` hijau.
3. Weekly IDOR scorecard vs prod proxy (`SMOKE_BASE_URL=https://humanify.id`) + Discord notify when webhook set.
4. Prod `HUMANIFY_RLS_MODE=strict` flip = **deferred ops track** (still blocked by D-013 #4 live chaos on strict pool).

**Literal Security 100 definition for Humanify SaaS Path B close:** items 1–3 above. FORCE strict on prod pool is a separate infra milestone, not a code maturity blocker.

## D-018 (Wave-55): Fiscal sign-off env — 20 Jul 2026
**Finance:** Checklist `docs/humanify-payroll-fiscal-signoff.md` + deploy ensures `HUMANIFY_FISCAL_SIGNED_OFF=true` on VPS when finance has signed. Engine fixtures = acceptance tests, not DJP certification.

## D-019 (Wave-56): Security honesty — claim private + withHQAuth batch — 20 Jul 2026
**Security / Backend:** Post–Wave-55 multi-role audit:
1. Claim receipts leave `public/uploads` → `storage/claims/{tenant}/` + signed `/api/humanify/claim-file` (session or HMAC).
2. Priority mutate/payroll-adjacent APIs migrate to `withHQAuth` (RLS `set_config` path): overtime, leave, payroll*, disbursement, export, compliance-export, travel-expense, upload-claim.
3. CI `lint:humanify-hq-auth` + `smoke:wave56` gate the allowlist; remaining bare-session APIs = follow-up waves, not reopen Path B.
4. `performance-360` error → `dataSource: empty` (no `isMock:true`); JOIN tenants on feedback.
5. Staging hostname / FORCE strict RLS remain D-013b (ops track) — not unblocked by this wave.
