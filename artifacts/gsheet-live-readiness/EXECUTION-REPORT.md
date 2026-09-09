# Humanify live-readiness — execution against Google Sheet

**Sheet:** [humanify-comprehensive-testing-live-readiness](https://docs.google.com/spreadsheets/d/1GdoYZEoH9oYYDRBfaIa_PCJDlgCsTzzh/edit)  
**Salinan lokal:** `artifacts/gsheet-live-readiness/humanify-comprehensive-testing-live-readiness.xlsx`  
**Dieksekusi:** 8–9 September 2026 (WIB) · siklus 1–**4** · target `https://humanify.id` / `https://ops.humanify.id` / `https://admin.humanify.id`  
**Keputusan sheet 42:** tetap **HOLD** (live Midtrans key belum di VPS, soak/load penuh, UAT SME manusia, 749 HT-* belum selesai). Backup freshness + restore scratch **Pass**.

**WAVE-9 (9 Sep):** paket sertifikasi diisi di repo — `docs/humanify-wave9-release-certification.md`, `42_Release_Certification.csv`, `docs/humanify-launch-known-issues.md`. Tanda tangan basah kosong. Agent tidak membalik HOLD → GO.

**WAVE-8 (9 Sep):** regresi prod-safe `run-wave8-20260909T013500Z` — 0 fail tak terduga. Hypercare: `npm run smoke:hypercare` 7/0.

Log siklus 4: `artifacts/gsheet-live-readiness/run-cycle4-20260908T175156Z/` · siklus 3: `run-cycle3-20260908T172550Z/` · siklus 2: `run-cycle2-20260908T164053Z/`.

---

## Siklus 4 (8 Sep 2026, ~17:51–17:55 UTC) — DR / capacity / UAT

| ID sheet | Suite | Hasil | Bukti |
|---|---|---|---|
| GATE-07 | Freshness dump VPS | **Pass** | `latest.sql.gz` umur 15.4 jam, 0.11 MB; cron `db-backup` 02:30 |
| GATE-07 | Restore drill scratch | **Pass** | restore ke `humanify_restore_test_c4` → 206 tabel publik, lalu drop (bukan prod) |
| GATE-18 | autocannon health c=20 d=15 | **Partial** | 3k req; p50 48ms; p97.5 329ms (target p95 &lt; 200ms); max 2115ms |
| GATE-18 | autocannon login c=10 d=15 | **Pass** | 807 req; p50 150ms; p97.5 434ms (target p95 &lt; 800ms) |
| GATE-28 | Midtrans Snap live | **Blocked** | `MIDTRANS_SERVER_KEY` / `CLIENT_KEY` / `IS_PRODUCTION` **tidak ada** di `.env` VPS — tidak charge |
| GATE-08 | `smoke:billing-idempotency` | **Pass** | webhook 400 handled (tanpa Snap) |
| UAT karyawan | `smoke:employees-uat-prod` | **Pass** (48/0) | CRUD + family/edu/cert/kontrak |
| UAT modul | `smoke:module-pages` | **Pass** (67/0) | |
| PR static | `smoke:product-readiness` | **Pass** (37/0) | |
| GATE-15 mobile | Playwright Pixel 5 ESS login | **Pass** setelah harness | logo `href=/` hidden di mobile; assert pakai link “Kembali ke beranda” |
| E2E | payroll auth-gate, forgot-password, join | **Pass** | |

Catatan dump: 1 Sep 3.1 MB → 2–8 Sep ~58–112 KB (609 baris COPY). Selaras DB hidup yang kecil (≈50 tenant). Bukan restore gagal; kalau volume bisnis mestinya lebih besar, investigasi purge.

### Defect siklus 4

| ID | Severity | Area | Masalah | Perbaikan |
|---|---|---|---|---|
| BUG-LR-009 | P2 harness | e2e ESS | `a[href="/"]`.first() kena logo `hidden` di Pixel 5 | assert `getByRole('link', { name: /Kembali ke beranda/i })` |
| OPS-LR-001 | P0 GO Midtrans | VPS `.env` | Key Snap tidak terpasang | isi key + `MIDTRANS_IS_PRODUCTION` oleh finance/ops; jangan charge dari agent |

---

---

## Siklus 3 (8 Sep 2026, ~17:06–17:31 UTC) — post-deploy

Deploy VPS (skip bootstrap/migrate, Cloudflare SSL) selesai; healthcheck lokal 200. BUG-LR-001–004 hidup di production.

| ID sheet | Suite | Hasil | Bukti |
|---|---|---|---|
| QA-041 / BUG-LR-001 | `GET /humanify/blog` | **Pass** | HTTP 200, body Blog/Artikel, sitemap memuat `/humanify/blog` |
| QA-034 / BUG-LR-002 | `GET /humanify/admin-login` | **Pass** | 307 → `https://admin.humanify.id/login` (bukan login HQ) |
| BUG-LR-004 | `GET /api/humanify/attendance/device-sync` | **Pass** | 405 + `Allow: POST` (bukan 500) |
| GATE-17 | deep health + e2e health | **Pass** | `db=true`, latency 21ms, uptime ~809s |
| GATE-19 | `smoke:ga-journey` + Playwright welcome | **Pass** | |
| GATE-25 | `smoke:page-crawl` | **Pass** | |
| GATE-01 | `smoke:tenant-isolation` | **Pass** | |
| GATE-16 | ops + admin host | **Pass** | re-check setelah deploy |
| SEO | Playwright `seo-public` | **Pass** | blog di sitemap |
| GATE-22 pack | `smoke:prod-readiness` | **1 fail expected** | 213 pass; `multi-role` butuh `HUMANIFY_INVITE_RETURN_TOKEN=true` — **bukan** bug undangan prod |

Tidak ada P0 produk baru. Token invite sengaja tidak diaktifkan di production (jangan expose invite URL di JSON).

---

---

## Siklus 2 (8 Sep 2026, ~16:40–16:53 UTC)

Fokus: GATE-16 ops/admin, ESS/CRUD/IDOR/claims/capacity, e2e welcome/ESS, perbaikan harness.

| ID sheet | Suite | Hasil | Bukti |
|---|---|---|---|
| GATE-16 | `smoke:ops-host` ke `ops.humanify.id` | **Pass** (8/8) | apex `/platform` 308 ke ops; `/api/platform` 403; login + overview 200; cookie host-only |
| GATE-16 | `smoke:admin-host` ke `admin.humanify.id` | **Pass** (8/8) | login control-plane; `/humanify` diblokir ke platform; overview 200 |
| GATE-01 | `smoke:idor` (8 batch) | **Pass** | 94 assert: hr-modules + batch5–11, 0 failed |
| GATE-10 | `smoke:functional-crud` | **Pass** (55/0) | LMS/billing/employee CRUD; leave create blocked by tenant data (expected) |
| GATE-10 | `smoke:employee-docs` | **Pass** (20/0) | upload/verify/delete + stress 20/20 |
| GATE-10 | `smoke:assets-lifecycle` | **Pass** setelah harness | 13/0; label sidebar sekarang `AIMAN · Confirm` |
| GATE-12 | `smoke:ess-leave` | **Pass** (6/0) | signup tenant baru → create leave |
| GATE-12 | `smoke:claim-proof` | **Pass** (28/0) | upload bukti, signed preview, approve; traversal ditolak (HTTP 520 CF) |
| GATE-13 | `smoke:payroll-depth` | **Pass** (7/0) | THR/BPJS/PPh21 + disbursement 401 unauth |
| GATE-14 | `smoke:payslip-gate` | **Pass** (10/0) | mint/verify/mask |
| GATE-15 | `smoke:hr-wave-uat` | **Pass** (12/0) | contracts/leave/KPI/employees |
| GATE-18 | `smoke:capacity` autocannon c=10 d=8 | **Partial** | 621 req / 8s; p50 51ms; p99 455ms; max 1727ms — bukan load/soak penuh |
| GATE-07 | `check:backup-freshness` lokal | **Partial** | runbook ada; dump VPS `/var/backups/humanify` tidak dicek dari laptop |
| GATE-19 / SMK | Playwright welcome + login | **Pass** (4) | setelah `npx playwright install` |
| GATE-15 ESS UI | Playwright `/employee/login` | **Pass** (1) | |
| GATE-02 auth-gate | Playwright ops UI + curl | **Pass** | 12 e2e; HQ 307 login; ESS dashboard 307 `/employee/login` |
| GATE-17 | Playwright health (request) | **Pass** (8) | deep health + CSRF + PWA publik |
| QA-041 blog | curl `/humanify/blog` | **Fail di prod** | masih 307 login — BUG-LR-001 belum deploy |

**Playwright gagal pertama kali** karena Chromium belum terunduh di environment agent (bukan bug produk). Retry setelah install: Pass.

### Defect siklus 2

| ID | Severity | Area | Masalah | Perbaikan |
|---|---|---|---|---|
| BUG-LR-008 | P2 harness | assets-lifecycle | Expect label `AIMAN · AI Guide`; produk `AIMAN · Confirm` | smoke menerima `name: 'AIMAN · ` |

Tidak ada P0 produk baru di siklus 2. Header produksi: HSTS, `X-Frame-Options: deny`, `X-Content-Type-Options: nosniff`, cookie `__Host-` / `__Secure-`.

---

Spreadsheet berisi 44 tab: inventaris modul (00–26) + tracker uji (27–42). Semua status di sheet semula **Not Started / 0% / HOLD** (update sheet masih manual).

Spreadsheet berisi 44 tab: inventaris modul (00–26) + tracker uji (27–42). Semua status di sheet semula **Not Started / 0% / HOLD**.

## Apa yang dikerjakan

1. Membaca seluruh tab 27–42 (Launch, Product Test 225 baris, GTM, 30 gate, 749 master case, UAT, performance, security, smoke 45, a11y, DR, cycles, dashboard, defect log kosong, sertifikasi HOLD).
2. Memetakan gate P0 ke smoke repo yang sudah ada.
3. Menjalankan smoke di production + static GA gates.
4. Memperbaiki defect produk dan false-fail harness.

Tidak mungkin menyelesaikan 749 HT-* + 225 QA-* dalam satu siklus. Aturan sheet: **tidak GO** jika ada P0 Failed/Blocked, leak tenant, mismatch payroll/billing, backup/rollback belum terbukti, atau smoke prod gagal. Keputusan akhir tetap HOLD sampai gate yang belum diuji (DR, live payment, UAT SME, load) selesai.

## Hasil smoke yang dijalankan (8 Sep 2026)

| ID sheet | Suite | Hasil | Bukti |
|---|---|---|---|
| GATE-17 / SMK-032 | `GET /api/health?deep=1` | **Pass** | `status=ok`, `db=true`, latency 23ms |
| GATE-01 / SEC-006 | `smoke:payslip-idor` | **Pass** | `run-prod-20260908T162901Z` |
| GATE-01 / SEC-031 | `smoke:tenant-isolation` | **Pass** (setelah harness) | 403 `/api/platform` di host tenant = least privilege, bukan leak |
| GATE-08 / SEC-025 | `smoke:billing-idempotency` | **Pass** | webhook duplikat |
| GATE-09 / QA-013 | `smoke:phase2-entitlement` + `wave79` + `deny-matrix` | **Pass** | plan enterprise 10 fitur; starter tanpa payroll di matriks |
| GATE-13 | `smoke:payroll-golden` + `payroll-fiscal` | **Pass** | |
| GATE-19 / SMK-001–003 | `smoke:ga-journey` | **Pass** | |
| GATE-22 / HT-0005 | `smoke:lms-lab-gate` + `wave85` | **Pass** | E-sign/engagement/proyek/LMS lab tetap gated |
| GATE-25 / SMK pages | `smoke:page-crawl` | **Pass** | sidebar HQ 200/307 |
| SMK-001 publik | curl landing/login/signup/reset/join/partners/careers/ESS login | **Pass** | welcome canonical `/` (307 dari `/humanify/welcome`) |
| QA-041 blog | curl `/humanify/blog` | **Fail di prod** | 307 ke login — diperbaiki di kode, **belum deploy** |
| QA-034 admin-login | curl `/humanify/admin-login` | **Fail di prod** | middleware blokir GSSP — diperbaiki di kode, **belum deploy** |
| GATE-04/22 AIMAN | `ai-hub` 503 `AI_DISABLED` | **Bukan outage** | sesuai flag; harness prod-readiness tidak boleh gagal P0 |

Log: `artifacts/gsheet-live-readiness/run-prod-20260908T162901Z/` dan `run-20260908T162316Z/`.

## Defect yang diperbaiki di repo

| ID | Severity | Area | Masalah | Perbaikan |
|---|---|---|---|---|
| BUG-LR-001 | P0 GTM/publik | Middleware | `/humanify/blog` dan `/blog/[slug]` tidak di `isHumanifyPublic` → login wall | `middleware.ts` allowlist blog |
| BUG-LR-002 | P0 ops | Middleware | `/humanify/admin-login` kena auth sebelum GSSP redirect ke admin host | allowlist `admin-login` |
| BUG-LR-003 | P1 SEO | Sitemap | Blog tidak di sitemap publik | `lib/humanify/seo.ts` + e2e SEO |
| BUG-LR-004 | P1 API | Device sync | GET `/api/humanify/attendance/device-sync` 500 di probe (auth sebelum 405) | `postOnly(...)` di luar `withHQAuth` |
| BUG-LR-005 | P2 harness | Prod-readiness | 503 `AI_DISABLED` dihitung failed | skip/expected jika AIMAN off |
| BUG-LR-006 | P2 harness | Isolation/entitlement | 403 platform API di `humanify.id` dihitung fail | 403 = least privilege |
| BUG-LR-007 | P2 harness | Wave-85 | Payroll/MSS chrome bukan `EnterprisePageHeader` | terima `PayrollShell` / `PlatformAccessShell` |
| BUG-LR-008 | P2 harness | assets-lifecycle | Label AIMAN expect `AI Guide`; produk `AIMAN · Confirm` | smoke menerima prefix `AIMAN ·` |

**Perlu deploy production** agar BUG-LR-001–004 hidup di `humanify.id`. **Deploy 8 Sep 17:12 UTC — terverifikasi siklus 3.**

## Gate yang belum bisa GO (masih HOLD)

| Gate | Alasan |
|---|---|
| GATE-05/06 | Build/rollback rehearsal tidak dijalankan (deploy 8 Sep hanya bukti build) |
| GATE-07 | **Pass siklus 4** — freshness + restore scratch; dump kecil vs 1 Sep |
| GATE-18 / PERF | Baseline Track A dijalankan; health p97.5 329ms di atas target 200ms; soak belum |
| GATE-28 | **Blocked** — key Midtrans tidak ada di VPS; live payment tidak dijalankan |
| GATE-03 reset token / GATE-11 device clock | Perlu tenant smoke khusus + perangkat |
| GATE-15 ESS mobile | **Pass siklus 4** Pixel 5 login UI |
| GATE-29/30 | Blog Pass; HOLD karena Midtrans/soak/UAT manusia + 749 HT |
| Master 749 / UAT manusia / A11y 81 | Belum eksekusi penuh |

## False fail historis (7 Sep) yang tidak diubah produk

- `llms.txt` welcome URL: **sudah benar di prod** hari ini.
- Webhook rekrutmen 401 tanpa signature: **kontrol benar** (SEC-026), smoke lama yang expect 200 salah.
- AIMAN 503: flag off, jangan jual otonom (GATE-22).
- `smoke:multi-role` butuh `HUMANIFY_INVITE_RETURN_TOKEN=true` di server smoke, bukan bug undangan produksi.

## Langkah berikutnya

1. Ops/finance pasang Midtrans key di VPS (GATE-28) sebelum uji Snap live.
2. Isi Google Sheet: GATE-07 Pass, GATE-18 Partial, GATE-28 Blocked, UAT employees 48/0.
3. Commit harness ESS mobile (BUG-LR-009) jika diminta.
4. Soak/load di luar jam sibuk jika p95 health harus &lt; 200ms.
