# Humanify Security Defense — Wave Progress

> Sumber checklist: [`docs/humanify-security-defense-master-checklist.txt`](./humanify-security-defense-master-checklist.txt)  
> Diperbarui: 23 Sep 2026

## Scope

Checklist lengkap (~136 P0 + ratusan P1–P3). Implementasi bertahap **defense in depth**.

| Wave | Fokus | Status |
|---|---|---|
| **Wave 0** | Audit gap vs codebase | Done |
| **Wave 1** | P0 code gaps: session, MFA platform, debug gate, AI redact, maker-checker salary, CI secrets, governance docs | Done |
| **Wave 2** | Upload unify, step-up re-auth, export audit all, backup encrypt | Done |
| **Wave 3** | Privacy/DSR, SAST continuous, risk-based auth | Done |

## Wave 1 deliverables

| ID | Item | Status |
|---|---|---|
| SEC-GOV-002 | Security Policy | `docs/humanify-security-policy.md` |
| SEC-GOV-004 | Data classification | `docs/humanify-data-classification.md` |
| SEC-GOV-005 | Risk register skeleton | `docs/humanify-security-risk-register.md` |
| SEC-IAM-001 | MFA wajib platform ops (enroll gate) | NextAuth + middleware |
| SEC-IAM-006 | Invalidate session after password reset | `password_changed_at` + JWT check |
| SEC-API-008 | Disable debug APIs in production | `/api/debug/*` → 404 |
| SEC-AI-001 | Redact secrets/PII before LLM | `lib/hris/ai-prompt-redact.ts` |
| SEC-ABU-016/017 | Maker-checker + before/after for salary/bank | `lib/saas/maker-checker.ts` · `HUMANIFY_SALARY_MAKER_CHECKER=true` |
| SEC-SEC-005 | Secret scan CI | gitleaks in `security.yml` |
| SEC-APP-009 | Shared upload harden helper | `lib/security/safe-upload.ts` |

## Wave 2 deliverables

| ID | Item | Status |
|---|---|---|
| SEC-IAM-008 | Step-up re-auth | `lib/saas/step-up-auth.ts` · `HUMANIFY_STEP_UP_REQUIRED=true` |
| SEC-ABU-005 | Export audit | `lib/saas/export-audit.ts` |
| SEC-APP-009 | Upload unify | claim + letter-logo |
| SEC-DAT-005 | Backup encrypt | `BACKUP_GPG_PASSPHRASE` |

## Wave 3 deliverables

| ID | Item | Status |
|---|---|---|
| SEC-APP-015 | Open redirect guard | `lib/security/safe-redirect.ts` |
| SEC-DAT-008 | Data retention policy | `docs/humanify-data-retention.md` |
| Privacy DSR | Subject request queue | `/api/humanify/privacy-dsr` |
| SEC-IAM-018 | Risk-based auth | `lib/saas/risk-based-auth.ts` · NextAuth |
| SEC-SDL-003 | SAST in CI | Semgrep job in `security.yml` |
| SEC-SDL-004 | SCA | npm audit + Trivy jobs |
| SEC-VUL-008 | Vulnerability disclosure | `docs/humanify-vulnerability-disclosure.md` |
| Privacy runbook | DSR operator guide | `docs/humanify-privacy-dsr.md` |

## Already strong (pre-wave)

Tenant isolation + soft RLS · login rate limit/lockout · bcrypt · Midtrans signature · security headers · AIMAN write-confirm · backup RPO/RTO · IDOR smokes.

## Ops-only (not coded — tracked in risk register)

Named Security Owner · hardware MFA · registrar MFA · ISO/SOC2 · OS patching · MDM · primary pen-test engagement · SIEM correlation.
