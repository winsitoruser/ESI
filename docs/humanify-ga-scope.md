# Humanify — GA feature freeze (scope)

> PM-2 · last updated 19 Jul 2026

## In scope for GA

| Modul | Catatan |
|---|---|
| Employees | CRUD, import, export, bulk edit + undo |
| Documents | Durable storage + upload UX |
| Attendance | Clock + management |
| Leave | Request + approval |
| Payroll | Run, fiscal sign-off, payslip audit |
| ESS | Portal + policy acknowledgment |
| Users / Invite | Multi-role |
| SSO | ACS e2e gate (customer IdP QC terpisah) |
| Billing | Midtrans + webhook idempotency |

## Lab / freeze (jangan prioritas GA)

LMS lab, AI hub eksperimen, project management luas, livestreaming, PoS/FnB.

## Definition of done (hari pertama HR)

Checklist operasional: `npm run smoke:ga-journey` hijau di prod.
