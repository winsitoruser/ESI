# Security Defense Checklist — Closeout (Waves 0–18)

## Code / docs delivered

Defense-in-depth for Humanify SaaS through Wave **18**: IAM, tenant isolation helpers, abuse controls, monitoring hooks, SDLC (SAST/SCA/SBOM/gitleaks), privacy DSR, backup GPG option, ASVS/KPI/threat models, OTP/search limits, CSP reports, API key expiry/rotate/quota, tenant cache/job context, claim signed TTL, log redaction, DNS verify script, pen-test readiness.

Progress tracker: [`humanify-security-wave-progress.md`](./humanify-security-wave-progress.md)

## Explicitly ops / business (not auto-closed)

| Item | Owner |
|---|---|
| Named Security Owner person | CTO |
| Hardware MFA / registrar MFA | Ops |
| SPF/DKIM/DMARC live DNS | Ops (script verifies) |
| ISO/SOC2 certification | Leadership |
| Independent pen-test engagement | Security + vendor |
| SIEM product | Ops |
| MDM / OS patching fleet | IT |
| Simulated phishing program | People ops |

## Suggested next calendar

1. ~~DNS verify~~ — SPF/DMARC present
2. ~~Enable opt-in flags~~ — `scripts/ensure-humanify-security-flags.sh` (prod applied)
3. ~~CSP report-only~~ — `Content-Security-Policy-Report-Only`
4. Schedule pen-test — [`humanify-pentest-kickoff.md`](./humanify-pentest-kickoff.md)
5. Quarterly restore/risk — [`humanify-security-calendar.md`](./humanify-security-calendar.md)
