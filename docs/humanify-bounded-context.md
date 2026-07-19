# Humanify — Bounded Context (CTO-2)

Inventaris pemisahan Humanify dari monolit Bedagang/legacy. Bukan refactor besar — peta kontrak agar regresi terkendali.

## Batas konteks (GA)

| Konteks | Path utama | Catatan |
|---|---|---|
| **Auth / tenant** | `pages/api/auth`, `lib/saas/tenant-*`, NextAuth | Satu login credentials; SSO SAML di `lib/saas/sso-*` |
| **Billing / entitlement** | `lib/saas/plan-entitlements`, `humanify-billing`, `/humanify/billing` | Fitur gate via `assertHumanifyFeature` |
| **Employees / docs** | `pages/api/humanify/employees*`, `lib/hris/employee-*`, `document-storage` | Storage lokal di luar `public/` + opsional S3 |
| **Attendance** | `pages/api/humanify/attendance*`, device-sync | Idempotency-Key + bulk correct |
| **Leave / MSS** | `leave*`, `workflow`, Action Inbox | Digest + snooze |
| **Payroll / fiscal** | `payroll*`, `payroll-audit`, fiscal sign-off | Golden smoke + audit events |
| **ESS** | `/employee`, policies ack, payslip gate | Portal karyawan terpisah layout |
| **E-sign** | `esign`, Privy webhook | Sandbox/live via env |
| **Platform ops** | `/platform/observability`, obs alerts, scorecard | Internal only |

## Yang **bukan** Humanify (jangan perluas)

PoS retail, FnB dapur, manufaktur, DMS brankas generik, livestream — lihat `AGENTS.md`.

## ORM dual-stack

- **Sequelize** — jalur HRIS/Humanify aktif (`models/`, `lib/sequelize`)
- **Prisma** — sisa Bedagang; jangan tambah model Humanify baru di Prisma kecuali migrasi terencana

## Kontrak API v1 (arah)

Stabilkan prefix `/api/humanify/*` + `/api/v1/*` (jika ada) dengan:

1. `tenantId` dari session (bukan body)  
2. `assertHumanifyFeature` untuk modul berbayar  
3. Error `{ success, error, code, requestId }` + `formatApiErrorToast`  
4. `safeQueryWithSavepoint` untuk SELECT di dalam TX RLS-bound  

## Langkah berikutnya (bukan Wave-15)

- Package `packages/humanify-core` untuk domain murni (tanpa Next pages)  
- Deprecate route HQ Bedagang yang masih ter-link di sidebar ESI  
- Strict RLS lab: `docs/humanify-rls-strict-staging.md`  

## Verifikasi cepat

```bash
npm run smoke:mock-audit
npm run smoke:wave14
test -f docs/humanify-bounded-context.md
```
