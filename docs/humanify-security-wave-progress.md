# Humanify Security Defense — Wave Progress

> Sumber: [`humanify-security-defense-master-checklist.txt`](./humanify-security-defense-master-checklist.txt)  
> Diperbarui: 23 Sep 2026 · **Closeout:** [`humanify-security-closeout.md`](./humanify-security-closeout.md)

| Wave | Fokus | Status |
|---|---|---|
| 0–14 | Core → OTP/CSP/SBOM | Done |
| **15** | Tenant cache keys + job tenant ALS | Done |
| **16** | API key expiry/rotate + per-tenant quota | Done |
| **17** | Claim signed TTL + geofence flag + log redaction | Done |
| **18** | DNS verify · pen-test readiness · closeout · PII mask | Done |

## Wave 15–18

| Wave | ID | Deliverable |
|---|---|---|
| 15 | TEN-009/011 | `tenant-cache.ts` · `job-tenant-context.ts` |
| 16 | API-010/014 | `expires_at` · `rotateApiKey` · tenant API quota |
| 17 | APP-016 · ABU-010 · MON-009 | claim TTL clamp · geofence in punch risk · `redact-secrets-log.ts` |
| 18 | PHI/VUL/DAT | `verify-humanify-dns-email.sh` · pentest readiness · closeout · `mask-test-pii.js` |

## Ops remaining

Hardware MFA · registrar MFA · apply SPF/DKIM/DMARC · pen-test vendor · SIEM · MDM · ISO cert.
