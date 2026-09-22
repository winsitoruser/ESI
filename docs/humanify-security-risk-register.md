# Humanify Security Risk Register (skeleton)

| ID | Risk | Asset | Threat | Impact | Likelihood | Owner | Mitigation | Due | Residual |
|---|---|---|---|---|---|---|---|---|---|
| R-001 | Cross-tenant data leak | DB HRIS | IDOR / missing tenant filter | Critical | Low | Eng | soft RLS + smoke IDOR | Ongoing | Low |
| R-002 | Account takeover | Auth | Credential stuffing | High | Med | Eng | rate limit + lockout + MFA | Wave1 | Med |
| R-003 | Payroll fraud | Salary/bank | Insider / compromised HR | High | Med | Eng+HR | maker-checker + audit | Wave1 | Med |
| R-004 | Payment double-credit | Billing | Webhook race | High | Low | Eng | atomic pending→paid + ledger UNIQUE | Done | Low |
| R-005 | AI data exfiltration | AIMAN | Prompt leak secrets | Med | Med | Eng | redact before LLM | Wave1 | Low |
| R-006 | Secret in git | Repo | Accidental commit | High | Low | Eng | gitleaks CI | Wave1 | Low |
| R-007 | Ransomware / data loss | VPS DB | Malware / wipe | Critical | Low | Ops | backup + restore drill | Ongoing | Med |
| R-008 | Debug endpoint abuse | /api/debug | Info disclosure | Med | Low | Eng | prod 404 gate | Wave1 | Low |

Review quarterly (SEC-GOV-009). Update residual setelah mitigasi di-deploy.
