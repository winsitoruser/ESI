# Humanify — GA feature freeze (scope)

> PM-2 · updated 24 Jul 2026 (Wave-69)

## In scope for GA (operate)

| Modul | Catatan |
|---|---|
| Employees | CRUD, import, export, bulk edit + undo |
| Documents | Durable storage + upload UX |
| Attendance | Clock + management + devices (`/humanify/attendance/devices`) |
| Leave | Request + approval |
| Payroll | Run, fiscal sign-off, payslip audit · `smoke:payroll-golden` |
| Claims / Reimbursement | Private bukti + preview · `smoke:claim-proof` |
| Assets | Inventori + assign onboarding / return offboarding · `smoke:assets-lifecycle` |
| ESS / MSS | Portal + approvals |
| Users / Invite | Multi-role |
| SSO | ACS e2e gate (customer IdP QC terpisah) |
| Billing | Midtrans + webhook idempotency (payout partner = CSV/manual) |
| Go-live | `/humanify/go-live` checklist |

## Lab / hidden (jangan jual sebagai GA)

| Item | Status |
|---|---|
| E-Sign Privy | Sidebar + UI gated (`ESIGN_UI_ENABLED=false`) |
| AI Center | Sidebar hidden · URL `/humanify/ai` tetap |
| Engagement / Proyek HR | Sidebar hidden |
| LMS advanced | URL-only · lab gate `HUMANIFY_LMS_LAB` |

## Definition of done (hari pertama HR)

1. `/humanify/go-live` progress siap + minimal 1 karyawan  
2. Isi inventori aset jika pakai onboarding issue  
3. `npm run smoke:ga-journey` hijau di staging/prod  
4. Jangan menunggu: FORCE RLS prod · Sentry.io · Midtrans auto-payout · Privy unhide  

Dokumen: `docs/humanify-product-brd-prd.md`
