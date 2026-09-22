# Patch & Vulnerability SLA (SEC-VUL-002 / 003)

| Severity | Fix SLA | Example |
|---|---|---|
| Critical (exploitable, internet-facing) | ASAP / ≤ 7 hari | RCE, auth bypass, tenant breakout |
| High | ≤ 14 hari | IDOR Sensitive, privilege escalation |
| Medium | ≤ 45 hari / risk-based | Missing headers, info leak |
| Low | backlog | Hardening |

## Process

1. Finding masuk risk register (`docs/humanify-security-risk-register.md`)
2. Owner + due date
3. Fix → regression smoke (`smoke:product-readiness` + targeted)
4. Close with evidence (PR / deploy SHA)

## Sources

CI Trivy, Semgrep, gitleaks, npm audit, pen-test, VDP (`security@humanify.id`).
