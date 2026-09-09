# Humanify — GA feature freeze (scope)

> PM-2 · updated 9 Sep 2026 (launch WAVE-0 / WQ-004)

Paket membedakan **modul**. Harga satuan sama untuk semua paket berbayar (`docs/humanify-price-book.md`). LMS dan AIMAN **bukan** bundled Enterprise.

## In scope for GA (operate)

| Modul | Paket / syarat | Catatan |
|---|---|---|
| Employees | Semua | CRUD, import, export, bulk edit + undo |
| Documents | Semua | Durable storage + upload UX |
| Attendance | Semua | Clock + management + devices (`/humanify/attendance/devices`) |
| Leave | Semua | Request + approval |
| Recruitment (inti) | Semua | Job opening + kandidat + `/careers` |
| Payroll | Growth+ | Run, fiscal sign-off, payslip · `smoke:payroll-golden` |
| Claims / Reimbursement | Growth+ | Private bukti + preview · `smoke:claim-proof` |
| Travel / overtime | Growth+ | Perjalanan dinas, lembur |
| Analytics / KPI / OKR | Growth+ | Laporan HR, workforce analytics |
| Assets + onboarding/offboarding | Semua | Inventori + assign/return · `smoke:assets-lifecycle` |
| ESS / MSS | Semua | Portal + approvals |
| Users / Invite | Semua | Multi-role |
| SSO + Enterprise API + white-label | Enterprise | ACS e2e; **SSO tidak GA** tanpa customer IdP QC (WQ-037) |
| LMS core | **Add-on LMS** (atau trial) | Hub, kursus, tes, competency, training bridge, certificates. Bukan fitur paket Enterprise. |
| AIMAN Copilot | **Add-on AIMAN** (atau trial) | Confirm-required; bukan payroll otonom |
| Billing | Semua | Midtrans + webhook idempotency (payout partner = CSV/manual) |
| Go-live | Semua | `/humanify/go-live` checklist |

## Lab / hidden (jangan jual sebagai GA)

| Item | Status |
|---|---|
| E-Sign Privy | Sidebar + UI opt-in (`NEXT_PUBLIC_ESIGN_UI_ENABLED=true`) |
| LMS advanced | Lab gate `HUMANIFY_LMS_LAB` — proctoring, psikometrik, academy |
| AIMAN otonom | Dilarang; hanya copilot + konfirmasi manusia |
| Engagement / Proyek HR | Sidebar hidden |
| Midtrans partner auto-payout | Off (`HUMANIFY_PARTNER_AUTO_PAYOUT`) |
| FORCE strict RLS production | Staging lab only |

## Harga (sumber: price-book 9 Sep)

Rp 10.000 / karyawan / bulan (1–250); 251+ Rp 9.500; 1.001+ Rp 9.000 (all-units). LMS +Rp 1.500/orang. AIMAN +Rp 65.000/bulan flat. Trial 14 hari full access.

## Definition of done (hari pertama HR)

1. `/humanify/go-live` progress siap + minimal 1 karyawan  
2. Isi inventori aset jika pakai onboarding issue  
3. `npm run smoke:ga-journey` hijau di staging/prod  
4. Jangan menunggu: FORCE RLS prod · Sentry.io · Midtrans auto-payout · Privy unhide  

Dokumen: `docs/humanify-product-brd-prd.md` · `docs/humanify-price-book.md` · sales: `docs/humanify-sales-feature-status.md`
