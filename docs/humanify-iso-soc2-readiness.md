# ISO 27001 / SOC 2 Readiness Skeleton (SEC-GOV-010)

## Scope (proposed)

Humanify SaaS production: app, VPS, CI/CD, Midtrans, SMTP, Cloudflare.

## Control domains — gap vs Waves 1–10

| Domain | Status |
|---|---|
| Access control | Strong (code) — hardware MFA ops pending |
| Cryptography | TLS + optional backup GPG |
| Operations | Backup/restore runbook — need quarterly drill evidence |
| Communications | SPF/DKIM/DMARC ops checklist |
| Supplier | Midtrans/SumoPod vendor review annual |
| Incident | IR + breach notification docs |
| Privacy | DSR queue + retention |

## Next enterprise steps

1. Named Security Owner + quarterly risk review calendar
2. Independent pen-test before large enterprise launch
3. Formal SoA (Statement of Applicability) draft
4. Evidence folder (screenshots, tickets, restore logs)

This is **readiness**, not certification.
