# Humanify — Sales Feature Status (GA vs Partial vs Hidden)

**Version:** 1.1 · 9 Sep 2026 (add-on LMS/AIMAN)  
**Audience:** Sales, partners, CS, demo  
**Rule:** Jangan jual item Hidden/Deferred sebagai “sudah GA.”

---

## GA — boleh dijual & dioperasikan

| Area | Catatan singkat |
|---|---|
| Employees + org | CRUD, import/export, bulk |
| Attendance + leave | Clock, devices, leave request/approval |
| Payroll + PPh21 | Run → approve → paid → payslip (paket Growth+) |
| Claims / reimbursement | Bukti + approval (paket Growth+) |
| Travel expense | Perjalanan dinas (paket Growth+) |
| Overtime | Lembur HQ/ESS/MSS (paket Growth+) |
| Assets + onboarding/offboarding | Inventori + assign/return |
| ESS / MSS | Portal karyawan + manajer |
| Recruitment (inti) | Job opening + kandidat |
| LMS core | **Add-on** (bukan paket Enterprise). Training hub GA setelah add-on / selama trial; advanced = lab |
| Users / invite | Multi-role (Finance invite: roadmap W80) |
| Billing Midtrans | Checkout + webhook (lihat catatan administrasi) |
| Go-live checklist | `/humanify/go-live` |
| SSO | Enterprise; customer IdP QC terpisah |

## Partial — hati-hati di demo

| Area | Status jual |
|---|---|
| AIMAN / AI Guide | **Add-on** + terlihat jika dibeli/trial; **confirm-required**, bukan AI otonom penuh |
| Recruitment connectors | Provider webhook butuh `*_WEBHOOK_SECRET` di production |
| Partner channel | Portal ada; **payout = manual / CSV** (bukan auto Midtrans) |
| Soft RLS production | Isolasi aplikasi + request-bound; FORCE strict = staging lab (`docs/humanify-production-rls-truth.md`) |
| Internal observability | Discord/health ring; Sentry.io = deferred |

## Hidden / Deferred — jangan dijual sebagai GA

| Item | Alasan |
|---|---|
| E-Sign Privy UI | `ESIGN_UI_ENABLED=false` — API ada, UI hidden |
| LMS advanced | Lab gate `HUMANIFY_LMS_LAB` |
| Engagement / Proyek HR | Sidebar hidden |
| Midtrans partner auto-payout | ADR D-015 — manual mark-paid |
| Production FORCE strict RLS | ADR D-013b |
| Sentry.io external | ADR D-010b |
| Offline ESS mutations | Belum GA |

## Harga resmi (per karyawan / bulan)

Sumber: `lib/saas/seat-pricing.ts` · paket di `lib/saas/plan-entitlements.ts` membedakan modul, bukan harga satuan.

| Komponen | Harga |
|---|---:|
| HRIS inti 1–250 karyawan | Rp 10.000 / orang |
| Volume 251–1.000 | Rp 9.500 / orang (semua kursi) |
| Volume 1.001+ | Rp 9.000 / orang (semua kursi) |
| Add-on LMS | +Rp 1.500 / orang |
| Add-on AIMAN Copilot | +Rp 65.000 / bulan (flat) |

Paket: Trial (14 hari full access) · Starter (core, absensi, rekrutmen) · Growth (+ payroll, analytics) · Enterprise (+ API, white-label, SSO). LMS dan AIMAN tidak termasuk paket — ditambah di Billing.

## Midtrans (administrasi)

Integrasi Midtrans **masih dalam proses administrasi** untuk sebagian hardening (mis. verifikasi signature ketat).  
Jangan janjikan SLA settlement/payout otomatis ke partner sebelum ops + legal sign-off.

## Isolation honesty (satu kalimat)

Tenant isolation di production memakai **aplikasi scoped + soft RLS**; staging punya jalur lab stricter. Jangan klaim “zero leak FORCE RLS production” sebelum ADR dibuka.

## Referensi

- `docs/humanify-ga-scope.md`
- `docs/humanify-multi-role-system-audit.md`
- `docs/humanify-roles-to-100-tasklist.md`
- `.hermes/DECISIONS.md` (D-010b, D-013b, D-015)
