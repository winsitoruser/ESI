# Handoff — SIMESI (fka ESI ERP)

> Diperbarui: 15 Juli 2026 — **Humanify SaaS multi-tenant Phase 0–23 GA (P0 hardening + P1/P2 produktivitas + multi-user) + regression QA hijau**

## Humanify SaaS (multi-tenant HRIS) — Phase 0–23 ✅ GA

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

**Regression QA prod (15 Jul 2026)** — `SMOKE_BASE_URL=https://humanify.id`, 25 script, **198 passed / 0 failed**:

```
tenant-isolation 8/0 · phase1-signup 2/0 · phase2-entitlement 12/0 · phase3-metrics 7/0
phase4-billing 9/0 · phase5-enterprise 13/0 · phase5b-support 8/0 · phase6-seats 6/0
phase7-golive 6/0 · phase8-partners 5/0 · phase9-alerts 8/0 · phase10-plan-change 9/0
phase11-offboarding 7/0 · phase12-digest 6/0 · phase13-sso 6/0 · phase15-password-reset 11/0
phase16-health 4/0 · phase20-employee-import 9/0 · phase21-notifications 10/0 · phase22-search 8/0
phase23-invitations 21/0 · phase18-observability 5/0 · phase19-mfa 11/0 · phase17-login-lockout 3/0 · phase14-ratelimit 4/0
```

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
- **P21 notification center**: `lib/saas/notifications.ts` (tabel `saas_notifications` auto-create; `syncAccountAlertNotifications` rekonsiliasi alert P9 via `source_key='alert:<id>'` — upsert aktif, hapus yang sudah resolved, tak meng-un-read yang sudah dibaca; `createNotification` untuk event kustom, dedupe by sourceKey; `listNotifications`/`markNotificationsRead`). API `pages/api/humanify/notifications.ts` (`?action=list|mark-read`; platform ops = stream kosong). `HQLayout` (Humanify) kini fetch endpoint ini (initial + poll 60s), mark-read jalan, klik notif ber-`actionHref` → navigasi. Non-Humanify (SIMESI) tetap pakai jalur SFA lama.
- **P22 global search**: `pages/api/humanify/search.ts` (`?q=` min 2 char, **selalu tenant-scoped**, ILIKE nama/email/kode/jabatan/dept, limit ≤15) → dropdown di search box header `HQLayout` (Humanify): grup "Halaman" (dari sidebar terfilter, client-side) + "Karyawan" (API, debounce 250ms), Enter/klik → `/humanify/employees?search=`. Halaman employees kini seed `search` dari `router.query.search`.
- **P23 undangan tim & multi-user**: `lib/saas/invitations.ts` (tabel `saas_invitations` auto-create; token hash sha256 + expiry 7 hari, single-use; role allowlist non-privileged `hq_admin|manager|staff|viewer` — tolak `owner/super_admin/...`; guardrail seat user = `getSeatUsage.users + pending < maxUsers`; re-invite email pending → refresh token; `acceptInvitation` buat User via **model Sequelize** `db.User.create` lalu tandai accepted). ⚠️ Tabel `users` prod pakai kolom **camelCase** (`isActive`/`lastLogin`/`createdAt`, tapi `tenant_id`/`role_id` snake) → `listTenantMembers` **wajib** pakai model (`db.User.findAll`), bukan raw SQL snake_case (kalau raw → error tertelan, list kosong). API terautentikasi `pages/api/humanify/invitations.ts` (`GET` list+members+seats+roles; `POST ?action=create|revoke|resend`; kelola butuh role owner/hq_admin/admin; create limit 20/mnt) + **publik** `pages/api/humanify/invitations-accept.ts` (`GET ?token=` preview, `POST` accept, limit 15/mnt). Halaman: `pages/humanify/users/index.tsx` (kelola tim + form undang + pending/riwayat, menu "Tim & Undangan") & publik `pages/humanify/join.tsx` (rute publik ditambah di `middleware.ts`). Token diekspos hanya non-prod / email tak terkirim / `HUMANIFY_INVITE_RETURN_TOKEN=true`.

Kandidat lanjutan: Sentry aktif (set `SENTRY_DSN` + `npm i @sentry/node`) + uptime monitor (UptimeRobot/BetterStack) → `/api/health?deep=1`; MFA recovery codes + enforce 2FA per-kebijakan tenant; QR code lokal utk enrol MFA (hindari kirim secret ke pihak ketiga); wiring SAML ACS→session (samlify, maintenance window); notifikasi in-app real-time (WebSocket — polling 60s sudah live P21); proration downgrade; hard-delete offboarding otomatis via cron; rate-limit & login-guard store → Redis bila scale multi-instance. **Follow-up P23**: manajemen anggota (nonaktifkan/hapus user, ubah role dari halaman Tim), assign `role_id` RBAC lanjutan saat/ setelah accept (kini hanya legacy `role`), audit trail undangan. **Utang teknis**: `createEmployee` single (`pages/api/humanify/employees.ts`) masih generate `employee_code` `EMP001` per-tenant → berpotensi bentrok UNIQUE global antar-tenant (impor massal sudah pakai skema `EMP-<tenant6>-<seq>`); sebaiknya selaraskan.

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
