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
