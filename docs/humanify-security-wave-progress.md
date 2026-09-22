# Humanify Security Defense — Wave Progress

> Sumber: [`humanify-security-defense-master-checklist.txt`](./humanify-security-defense-master-checklist.txt)  
> Diperbarui: 23 Sep 2026

| Wave | Fokus | Status |
|---|---|---|
| 0–10 | Core defense (IAM→abuse→gov docs) | Done |
| **11** | OTP abuse + Talent Bank search scrape limit | Done |
| **12** | SoD helper + impersonation audit + fraud score | Done |
| **13** | Log retention, SBOM, ISO readiness, awareness | Done |
| **14** | CSP report endpoint + security regression pack | Done |

## Wave 11–14

| Wave | ID | Deliverable |
|---|---|---|
| 11 | SEC-ABU-002/004 | `lib/saas/otp-abuse.ts` · MFA gate · talent search RL |
| 12 | SEC-ABU-020/021 · TEN-012 | `assertSeparationOfDuties` · impersonate audit · `fraud-anomaly.ts` |
| 13 | MON-017 · SDL-011 · GOV-010 · PHI-007 | log retention · SBOM script · ISO skeleton · awareness outline |
| 14 | APP-011/012 | `/api/humanify/csp-report` · `npm run smoke:security-regression` |

## Ops-only (manual)

Hardware MFA · registrar MFA · SPF/DKIM/DMARC apply di Cloudflare · pen-test · SIEM · MDM · simulated phishing program.
