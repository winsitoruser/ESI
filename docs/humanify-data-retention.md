# Humanify — Data Retention & Secure Deletion (SEC-DAT-008 / SEC-DAT-009)

## Retention (default)

| Data class | Retention | Notes |
|---|---|---|
| Payroll / payslip | 10 years | UU Ketenagakerjaan / tax |
| Attendance | 2 years | Configurable per tenant |
| Claims / reimbursement | 7 years | Finance |
| Recruitment / CV | 1 year after reject / hire | Talent Bank |
| Audit / security logs | 1 year online, 2 years archive | Immutable preferred |
| AI token ledger | 3 years | Billing disputes |
| Backups | 7 days rolling + monthly encrypted offsite | See backup encryption |

## Secure deletion

- Soft-delete first (`deleted_at`) for employee/HR records.
- Hard purge after retention via scheduled job (tenant offboarding uses export + wipe).
- Media: unlink storage keys; do not leave public uploads after tenant close.
- DB: `VACUUM` / partition drop for cold tables — ops runbook.

## Operator

- Document any customer-specific retention in the tenant contract.
- Offboarding: `pages/api/humanify/account.ts` export → grace → wipe.
