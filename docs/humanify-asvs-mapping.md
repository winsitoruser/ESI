# Humanify — OWASP ASVS Mapping (SEC-APP-001)

| ASVS area | Humanify control |
|---|---|
| V2 Authentication | bcrypt, MFA TOTP, login rate-limit, risk-based, step-up |
| V3 Session | HttpOnly/SameSite, password_changed_at JWT invalidate |
| V4 Access control | withHQAuth, tenant scope, RBAC, default-deny |
| V5 Validation | parameterized SQL, safe-upload, body-size |
| V6 Crypto | TLS (Cloudflare/nginx), backup GPG optional |
| V7 Error | production error sanitization |
| V8 Data protection | classification, retention, DSR, AI redact |
| V9 Communication | CSRF origin check, secure cookies |
| V10 Malicious code | CI Semgrep + gitleaks + Trivy |
| V11 Business logic | maker-checker, export audit, claim dup, attendance anti-cheat |
| V12 Files | safe-upload, tenant storage paths, signed claim URLs |
| V13 API | authz per route, rate limit, inventory |
| V14 Config | debug off in prod, security headers |

Review ASVS L1 gaps each major release.
