# Humanify launch — antrian kerja (siap dikerjakan)

Setiap baris adalah 1 task. Jangan buka 749 HT sekaligus. Kerjakan **WQ-*** berurutan per wave; skip hanya jika `blocked_by` masih terbuka.

CSV filterable: [`artifacts/gsheet-live-readiness/launch-work-queue.csv`](../artifacts/gsheet-live-readiness/launch-work-queue.csv)  
Rencana lengkap: [`humanify-ready-to-launch-plan.md`](./humanify-ready-to-launch-plan.md)

**Keputusan sekarang:** HOLD. Pengunci sisa: Midtrans key VPS (WQ-010), ack SLO/RPO manusia (WQ-001/002), rollback drill, UAT SME, soak.

**Progress 9 Sep 2026:** WAVE-9 draft sertifikasi **HOLD** (`docs/humanify-wave9-release-certification.md`). WAVE-8 regresi prod **Pass** (`run-wave8-20260909T013500Z`). WAVE-0–7 seperti sebelumnya. Pengunci GO: WQ-010 Midtrans, WQ-032 rollback, soak k6, UAT SME, SLO health (WQ-087), named on-call (WQ-006).

Legenda `agent`: `yes` = bisa dikerjakan dari repo/staging; `ops` = butuh VPS/finance/manusia; `signoff` = keputusan, bukan kode.

---

## WAVE-0 — Freeze constraint (hari 1)

Tanpa ini, GATE-18/07/21 tidak bisa disertifikasi.

| ID | Pri | Agent | Lakukan | Done jika |
|---|---|---|---|---|
| WQ-001 | P0 | signoff | Product+Eng tandatangani SLO: health p95 &lt; 200ms **atau** naikkan SLO tertulis; login p95 &lt; 800ms; error load &lt; 1%. | Memo di `docs/humanify-ready-to-launch-plan.md` §3 di-ack |
| WQ-002 | P0 | signoff | Terima RPO ≤ 24h, RTO ≤ 2h dari runbook backup. | Owner Finance/Eng di HANDOFF |
| WQ-003 | P0 | yes | Audit semua surface harga vs `docs/humanify-price-book.md` (landing, ROI, checkout, `/platform/billing` Plans). | `npm run smoke:wave79-entitlements` + catatan crawl |
| WQ-004 | P0 | yes | Samakan `docs/humanify-ga-scope.md` dengan add-on LMS/AIMAN (hapus “LMS bundled Enterprise”). | Diff ga-scope = price-book |
| WQ-005 | P1 | signoff | Freeze browser: Chrome/Edge/Firefox/Safari + Pixel 5. | Tertulis di plan §3 |
| WQ-006 | P0 | signoff | Nama on-call + orang yang boleh HOLD/ROLLBACK. | GATE-24/26 |
| WQ-007 | P0 | signoff | Angka peak: tenant aktif, VU login pagi, spike absensi. Default kerja: 50 tenant, login 200 VU (PERF-003), clock 1000 req/min (PERF-007) sampai GTM kasih angka lain. | Input WAVE-5 |
| WQ-008 | P0 | yes | Kebijakan data uji: tenant sintetis saja di security/perf; jangan dump PII prod. | Checklist env WAVE-5/4 |

---

## WAVE-1 — Ops blocker (tanpa ini tidak ada live payment)

| ID | Pri | Agent | Lakukan | Done jika |
|---|---|---|---|---|
| WQ-010 | P0 | ops | Pasang `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION` di VPS. **Jangan charge dari agent.** | `GET` health/scorecard Midtrans configured; GATE-28 unblocked |
| WQ-011 | P1 | ops | Investigasi dump 1 Sep 3.1 MB vs 58–112 KB (609 COPY). Bukan gagal restore. | Catatan: expected kecil **atau** purge bug |
| WQ-012 | P1 | ops | Update Google Sheet tab 27–42: GATE Pass/Partial/Blocked sesuai `EXECUTION-REPORT.md`. | Sheet ≠ semua Not Started |
| WQ-013 | P2 | yes | Commit harness ESS mobile BUG-LR-009 jika belum. | `git` contains Pixel 5 assert “Kembali ke beranda” |
| WQ-014 | P0 | ops | HT-0001: bandingkan `.env` VPS vs manifest (URL callback, storage, SMTP, Midtrans, session secret). | Tidak ada sandbox URL di prod |
| WQ-015 | P0 | ops | HT-0007: kirim verify/reset/invite/billing test ke inbox nyata. | 4 jenis email sampai, link host produksi |

---

## WAVE-2 — Delta produk 9 Sep (agent, staging/prod-safe)

| ID | Pri | Agent | Perintah / langkah | Done jika |
|---|---|---|---|---|
| WQ-020 | P0 | yes | `npm run smoke:wave79-entitlements` + cek wizard kursi `lib/saas/seat-pricing.ts` (10k/9.5k/9k, LMS 1500, AIMAN 65k). | Quote = ringkasan = Snap amount (sandbox) |
| WQ-021 | P0 | yes | `npm run smoke:phase2-entitlement` `npm run smoke:deny-matrix` — LMS/AIMAN hanya jika add-on aktif, bukan plan Enterprise. | Starter tanpa payroll; Enterprise tanpa LMS kecuali add-on |
| WQ-022 | P0 | yes | `__tests__/company-membership.test.ts` + manual: Tambah perusahaan → tab `/humanify/setup?from=new-company&companyId=` selesai tanpa spinner NextAuth. | Setup load by membership, bukan JWT switch |
| WQ-023 | P0 | yes | User 2 perusahaan: switch A→B, buka employees/payroll; pastikan tidak ada data A. | GATE-01 membership |
| WQ-024 | P0 | yes | `__tests__/public-upload-serve.test.ts`; logo surat 200; `/uploads/employee-documents` tidak publik. | 404/deny docs karyawan |
| WQ-025 | P1 | yes | `__tests__/month-presence.test.ts`; dashboard pie setelah Day-1 complete. | Angka = absensi bulan berjalan tenant itu |
| WQ-026 | P1 | yes | `/humanify/billing` 3 kartu; KPI Midtrans Live tidak dirender. | Visual + jangan klaim Live di UI tenant |
| WQ-027 | P0 | yes | `npm run smoke:wave85` `npm run smoke:lms-lab-gate` | Lab/e-sign/AIMAN otonom tidak GA |

---

## WAVE-3 — Sisa P0 gate

| ID | Pri | Agent | Perintah / langkah | Gate |
|---|---|---|---|---|
| WQ-030 | P0 | yes | `npm run build` dari checkout bersih; simpan checksum `.next`. | 05 / HT-0002 |
| WQ-031 | P0 | ops | Restore dump → DB copy → `npm run db:migrate` → ukur lock → smoke baca/tulis. | 05 / HT-0003 |
| WQ-032 | P0 | ops | Deploy RC → tulis data → rollback artifact sebelumnya → login + CRUD. | 06 / HT-0004 |
| WQ-033 | P0 | yes | Direct URL e-sign, LMS lab, engagement, project, AIMAN otonom + API. | 22 / HT-0005 |
| WQ-034 | P0 | yes | `npm run smoke:ops-host` `npm run smoke:admin-host`; curl TLS/HSTS. | 16, 03 / HT-0006 |
| WQ-035 | P0 | yes | `npm run smoke:phase15-password-reset` + e2e forgot-password; token dipakai 2× harus gagal. | 03 / SEC-004 |
| WQ-036 | P0 | yes | `npm run smoke:phase19-mfa` — bypass API tanpa faktor kedua ditolak **atau** MFA tidak dijual GA. | 04 |
| WQ-037 | P0 | signoff | SSO: “tidak GA tanpa IdP QC” tertulis, **atau** `smoke:sso-acs` + checklist IdP. | 04 |
| WQ-038 | P0 | yes | Absensi 23:59/00:00 WIB vs TZ lain; duplikat clock. | 11 / HT-0014 |
| WQ-039 | P0 | yes | `npm run smoke:device-sync-idempotency` | 11 |
| WQ-040 | P0 | yes | Settings geofence/GPS/face: clock di luar radius ditolak; API sama dengan UI. | 11 |
| WQ-041 | P0 | yes | `npm run smoke:ess-leave` + dua approve paralel saldo. | 12 |
| WQ-042 | P0 | yes | `npm run smoke:payroll-golden` `smoke:payroll-fiscal` `smoke:payroll-depth` | 13 |
| WQ-043 | P0 | yes | `npm run smoke:payslip-gate` `smoke:payslip-idor` | 14, 15 |
| WQ-044 | P0 | yes | Desk CS/Finance/Sales: API refund/plan/suspend/publish. Superadmin penuh; desk terlarang. | 02, 16 |
| WQ-045 | P0 | ops | Picu alert health/error; pastikan penerima + runbook. | 17 / HT-0013 |
| WQ-046 | P0 | yes | Signup dengan `?utm_source&utm_medium&utm_campaign` → event + CRM lead. | 20 |
| WQ-047 | P0 | ops | Tenant demo 15 menit + 1 lead `/platform/crm` owner SLA. | 23 |
| WQ-048 | P0 | ops | Tiket P0 palsu sampai named owner &lt; SLA. | 24 |
| WQ-049 | P1 | ops | Semua CTA landing/blog/partner 200/307 sehat. | 27 |
| WQ-050 | P0 | signoff | Dokumen SEV1/2, kill switch billing, wewenang rollback. | 26 |

---

## WAVE-4 — Security sisa P0

Harness yang **tidak** diulang kecuali regresi: `smoke:idor`, `smoke:tenant-isolation`, `smoke:billing-idempotency`, `smoke:employee-docs`, `smoke:claim-proof`.

**Status 9 Sep:** WQ-061–067/069 Pass (`npx jest __tests__/launch-wave4-security.test.ts`). WQ-060 Pass\* (login ganti JWT; logout hapus cookie, token JWT tidak di-revoke server). WQ-068 Pass\* (unit lockout; jangan burst `smoke:phase14` di prod). WQ-070 Pass sebelumnya.

| ID | Pri | Agent | Fokus | Ref |
|---|---|---|---|---|
| WQ-060 | P0 | yes | Session fixation + logout lalu replay cookie/API | SEC-002, SEC-003 |
| WQ-061 | P0 | yes | Mass assignment `role` / `companyId` / `tenant_id` di PATCH employee/user | SEC-007 |
| WQ-062 | P0 | yes | Stored XSS nama/pengumuman/job post | SEC-012 |
| WQ-063 | P0 | yes | CSRF mutasi tanpa token/SameSite | SEC-014 |
| WQ-064 | P0 | yes | URL fetch internal (SSRF) di field webhook/integration | SEC-016 |
| WQ-065 | P0 | yes | Upload executable/polyglot vs employee-docs | SEC-017, HT-0008 |
| WQ-066 | P0 | yes | Desk rendah → API `/api/platform` finance/roles | SEC-028 |
| WQ-067 | P0 | yes | AIMAN prompt tenant lain / tool di luar izin; confirm-required | SEC-029/030 |
| WQ-068 | P0 | yes | `npm run smoke:phase14-ratelimit` `smoke:phase17-login-lockout` | SEC-001 |
| WQ-069 | P0 | yes | Export/search setelah switch tenant; cache/back | SEC-009/010 |
| WQ-070 | P0 | yes | Cookie `__Host-` / `__Secure-` di humanify.id, ops, admin | HT-0019 |

---

## WAVE-5 — Performance (jangan di prod destruktif)

Baseline Track A sudah: health p50 48ms / p97.5 **329ms** (di atas 200ms); login p50 150ms / p97.5 434ms.

**Status 9 Sep:** Skrip k6 + `docs/humanify-wave5-perf-runbook.md` siap. Peak freeze di `lib/saas/perf-targets.ts`. Login/clock **ditolak** pada humanify.id. WQ-080–086 tetap ops sampai SRE menjalankan di staging. WQ-087 draft: p95 health 400 ms atau nginx health — pending Eng Lead.

| ID | Pri | Agent | Model | Ref |
|---|---|---|---|---|
| WQ-080 | P0 | ops | k6 login 200 VU ramp | PERF-003 |
| WQ-081 | P0 | ops | k6 dashboard 200 VU / 20 tenant | PERF-004 |
| WQ-082 | P0 | ops | Spike clock-in 1000 req/min; 0 duplikat | PERF-007 |
| WQ-083 | P0 | ops | Payroll volume 1k karyawan (staging data sintetis) | PERF-010 |
| WQ-084 | P0 | ops | Webhook 500/min termasuk duplikat | PERF-014 |
| WQ-085 | P0 | ops | Soak mix 8 jam; memori/pool tidak naik progresif | PERF-016 |
| WQ-086 | P0 | ops | Stress sampai knee; recovery tanpa repair DB | PERF-019/020 |
| WQ-087 | P0 | signoff | Jika p95 health tetap &gt; 200ms: **turunkan SLO** atau **optimasi** sebelum GO | GATE-18 |

---

## WAVE-6 — UAT manusia + a11y jalur kritis

Smoke otomatis **bukan** pengganti tanda tangan SME.

**Status 9 Sep:** WQ-095 Pass\* — `htmlFor` login ESS + form cuti + skip-link; e2e `e2e/humanify-a11y-public.spec.ts`. WQ-090–094 tetap tanda tangan SME.

| ID | Pri | Agent | Skenario | Gate |
|---|---|---|---|---|
| WQ-090 | P0 | ops | HR: create → import → org → terminate | 10 |
| WQ-091 | P0 | ops | HR: clock, koreksi, cuti approve/reject/cancel | 11, 12 |
| WQ-092 | P0 | ops | Payroll SME: golden PPh21/BPJS/THR vs aturan 2026 | 13, 14 |
| WQ-093 | P0 | ops | Finance: order sandbox → reconcile (live setelah WQ-010) | 08, 28 |
| WQ-094 | P0 | ops | Karyawan+manajer: ESS home, cuti, payslip sendiri | 15 |
| WQ-095 | P1 | yes | Keyboard-only login + form cuti ESS; tanpa trap | 30 / HT-0687 |

---

## WAVE-7 — GTM + live payment

**Status 9 Sep:** WQ-103 Pass (`npm run smoke:price-crawl` 3/0 pada humanify.id). WQ-100 Pass\* (unit settlement/pending/deny/expire + signature). WQ-102 Pass\* sebelumnya. WQ-101 Blocked sampai WQ-010.

| ID | Pri | Agent | Lakukan | Gate |
|---|---|---|---|---|
| WQ-100 | P0 | yes | Midtrans **sandbox** settlement/pending/deny/expire + signature invalid | 08 |
| WQ-101 | P0 | ops | Setelah WQ-010: bayar Rp kecil prod → webhook → 1 entitlement → finance sign-off. Retry duplikat = no extra charge. | 28 |
| WQ-102 | P0 | yes | `npm run smoke:ga-journey` `smoke:phase1-signup` `smoke:trial` + verify email | 19 |
| WQ-103 | P0 | yes | Crawl klaim paket di `/`, pricing, demo script, checkout | 21 |

---

## WAVE-8 — Regresi pack (ulangi sebelum T0)

**Status 9 Sep:** Pass terhadap `https://humanify.id`. Log: `artifacts/gsheet-live-readiness/run-wave8-20260909T013500Z/`. Sidebar null-plan → `starter` (PR-003). WQ-115 = pack hijau ini, bukan T0 deploy baru.

Jalankan ke `SMOKE_BASE_URL=https://humanify.id` hanya yang production-safe.

```bash
npm run smoke:idor
npm run smoke:tenant-isolation
npm run smoke:payslip-idor
npm run smoke:functional-crud
npm run smoke:employees-uat-prod
npm run smoke:module-pages
npm run smoke:ga-journey
npm run smoke:payroll-golden && npm run smoke:payroll-fiscal && npm run smoke:payroll-depth
npm run smoke:payslip-gate
npm run smoke:billing-idempotency
npm run smoke:phase2-entitlement && npm run smoke:deny-matrix && npm run smoke:wave79-entitlements
npm run smoke:lms-lab-gate && npm run smoke:wave85
npm run smoke:ops-host && npm run smoke:admin-host
npm run smoke:product-readiness
npm run smoke:page-crawl
npm run smoke:ess-leave && npm run smoke:claim-proof && npm run smoke:employee-docs
npm run smoke:hr-wave-uat && npm run smoke:assets-lifecycle
```

| ID | Pri | Agent | Isi |
|---|---|---|---|
| WQ-110 | P0 | yes | Isolation pack |
| WQ-111 | P0 | yes | Functional/UAT otomatis + pages |
| WQ-112 | P0 | yes | Payroll pack |
| WQ-113 | P0 | yes | Billing/entitlement/lab |
| WQ-114 | P0 | yes | Host ops/admin + product-readiness |
| WQ-115 | P0 | yes | Checklist smoke GATE-25 100% setelah deploy |

---

## WAVE-9 — Sertifikasi

**Status 9 Sep:** WQ-120 Pass (CSV BUG-LR). WQ-121/122 Pass\* (draft known-issues + tab 42). WQ-123 **HOLD** tertulis. Tanda tangan basah Launch Manager / PO / Eng Lead masih kosong — keputusan tetap HOLD sampai GATE-28/06/18/UAT + on-call.

| ID | Pri | Agent | Lakukan |
|---|---|---|---|
| WQ-120 | P1 | yes | Isi defect log sheet dari BUG-LR-001…009 + temuan baru |
| WQ-121 | P1 | signoff | P1/P2 sisa: owner, workaround, tanggal, acceptance (GATE-30) |
| WQ-122 | P0 | signoff | Tab 42 Release Certification + tracker produk |
| WQ-123 | P0 | signoff | GO hanya jika GATE-28/06/18/UAT manusia PASS; else HOLD |

---

## WAVE-10 — Hypercare T+7

**Status 9 Sep:** WQ-130 Pass\* — `npm run smoke:hypercare`. WQ-132 Pass\* — template `docs/humanify-hypercare-retro-template.md`. Roster on-call masih WQ-006.

| ID | Pri | Agent | Lakukan |
|---|---|---|---|
| WQ-130 | P0 | ops | Synthetic harian: health deep + login + 1 clock/leave read |
| WQ-131 | P0 | signoff | Roster on-call 7 hari |
| WQ-132 | P1 | ops | Template retro funnel/support/error budget |

---

## Sudah ber-evidence — jangan dikerjakan ulang sebagai “Not Started”

Catat Pass\* di sheet, bukan eksekusi baru, kecuali WAVE-8 regresi.

| Bukti | Suite / log |
|---|---|
| Isolation + IDOR | `run-cycle2`, `run-prod-…/GATE01-*` |
| Billing webhook duplikat | `smoke:billing-idempotency` |
| Entitlement paket | wave79, deny-matrix, phase2 |
| Employee CRUD/docs | employees-uat 48/0, employee-docs 20/0 |
| Leave/claim | ess-leave, claim-proof |
| Payroll | golden, fiscal, depth |
| ESS mobile login | cycle 4 Pixel 5 |
| Ops/admin host | 8/8 |
| Restore scratch | cycle 4 GATE-07 |
| Lab gating | lms-lab-gate, wave85 |
| Blog/admin-login middleware | cycle 3 setelah deploy |
| Capacity Track A | GATE-18 Partial (bukan Pass) |
| Midtrans Snap live | Blocked — WQ-010 |

False fail yang **tidak** boleh dibuka sebagai bug: AIMAN 503 jika flag off; `/api/platform` 403 di host tenant; `smoke:multi-role` tanpa `HUMANIFY_INVITE_RETURN_TOKEN`; webhook 401 tanpa signature.
