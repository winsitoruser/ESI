# Humanify Security Defense — Wave Progress

> Sumber checklist: [`docs/humanify-security-defense-master-checklist.txt`](./humanify-security-defense-master-checklist.txt)  
> Diperbarui: 23 Sep 2026

## Scope

Checklist lengkap (~136 P0 + ratusan P1–P3). Implementasi bertahap **defense in depth**.

| Wave | Fokus | Status |
|---|---|---|
| **Wave 0** | Audit gap vs codebase | Done |
| **Wave 1** | P0 code gaps: session, MFA platform, debug gate, AI redact, maker-checker salary, CI secrets, governance docs | Done |
| **Wave 2** | Upload unify, step-up re-auth, export audit all, backup encrypt | Done |
| **Wave 3** | Privacy/DSR, SAST continuous, risk-based auth | Done |
| **Wave 4** | Login notify, bank-change alert, break-glass, asset/API inventory, sessions view | Done |

## Wave 4 deliverables

| ID | Item | Status |
|---|---|---|
| SEC-IAM-013 | Login / new-device notification | `lib/saas/login-notify.ts` |
| SEC-IAM-014 | Session view (current device) | `/api/humanify/sessions` |
| SEC-IAM-017 | Break-glass procedure | `docs/humanify-break-glass.md` |
| SEC-ABU-018 | Bank change alert pre-payroll | `lib/saas/bank-change-alert.ts` |
| SEC-GOV-001/003 | Owner contact + asset inventory | policy + `docs/humanify-asset-inventory.md` |
| SEC-API-007 | API inventory | `docs/humanify-api-inventory.md` · `scripts/inventory-humanify-apis.js` |
| SEC-VUL-008 | security.txt contact | `public/.well-known/security.txt` |

## Waves 1–3

See previous tables in git history / sections below still apply (MFA, step-up, export audit, DSR, Semgrep, risk-based auth, …).

## Already strong (pre-wave)

Tenant isolation + soft RLS · login rate limit/lockout · bcrypt · Midtrans signature · security headers · AIMAN write-confirm · backup RPO/RTO · IDOR smokes · SSRF helper.

## Ops-only (not coded — tracked in risk register)

Named human Security Owner · hardware MFA · registrar MFA · ISO/SOC2 · OS patching · MDM · primary pen-test · SIEM · SPF/DKIM/DMARC DNS ops.
