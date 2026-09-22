# Humanify Security Defense — Wave Progress

> Sumber: [`humanify-security-defense-master-checklist.txt`](./humanify-security-defense-master-checklist.txt)  
> Diperbarui: 23 Sep 2026

| Wave | Fokus | Status |
|---|---|---|
| 0 | Gap audit | Done |
| 1 | Session/MFA/debug/AI redact/maker-checker/CI | Done |
| 2 | Step-up / export audit / upload / backup GPG | Done |
| 3 | DSR / SAST / risk-based auth | Done |
| 4 | Login notify / bank alert / inventories | Done |
| **5** | Attendance anti-cheat (server time, nonce, impossible travel) | Done |
| **6** | Claim duplicate detection | Done |
| **7** | Security monitor + abnormal export | Done |
| **8** | Breach workflow + secure deletion script | Done |
| **9** | Body-size gate + feature-flag permission | Done |
| **10** | ASVS / KPI / threat-model / patch SLA / DNS ops checklist | Done |

## Wave 5–10 deliverables

| Wave | ID | Deliverable |
|---|---|---|
| 5 | SEC-ABU-009…015 | `lib/hris/attendance-anti-cheat.ts` · `/api/humanify/attendance-challenge` · wired attendance POST |
| 6 | SEC-ABU-019 | `lib/hris/claim-duplicate.ts` · employee claim create |
| 7 | SEC-MON-012 | `lib/saas/security-monitor.ts` · export velocity |
| 8 | SEC-IR-009 / DAT-009 | `docs/humanify-breach-notification.md` · `scripts/humanify-secure-deletion.js` |
| 9 | SEC-API-006 / APP-013 | `lib/security/body-size.ts` · `lib/saas/feature-flag-gate.ts` |
| 10 | GOV/VUL/PHI | ASVS, KPI, threat-model payroll, patch SLA, email-DNS ops checklist |

## Opt-in flags

`HUMANIFY_ATTENDANCE_NONCE=true` · `HUMANIFY_CLAIM_DUP_BLOCK` · `HUMANIFY_SALARY_MAKER_CHECKER` · `HUMANIFY_STEP_UP_REQUIRED` · `BACKUP_GPG_PASSPHRASE`

## Ops-only remaining

Hardware MFA · registrar MFA · ISO/SOC2 · pen-test engagement · SPF/DKIM/DMARC DNS apply · SIEM · MDM.
