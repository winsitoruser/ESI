# Threat Model — Payroll & Bank Change (SEC-GOV-006)

## Assets

Employee salary, bank account, payroll runs, Midtrans billing, payslips.

## Actors

HR admin, Finance, Owner, malicious insider, external attacker with stolen session.

## Entry points

`/api/humanify/payroll`, maker-checker, export CSV, Midtrans webhook, AI hub (token).

## Threats & controls

| Threat | Control |
|---|---|
| Unauthorized salary edit | RBAC + maker-checker + audit before/after |
| Bank swap before run | bank-change-alert + step-up |
| IDOR payslip | tenant scope + payslip gate |
| Webhook replay / forge | Midtrans signature + claim-before-activate |
| Mass export | export audit + velocity alert |
| LLM leak of NIK/rekening | AI prompt redaction |

## Residual risk

Ops MFA hardware, SIEM correlation, independent pen-test — tracked in risk register.
