# Humanify — Tenant Isolation FAQ (sales / security questionnaire)

> Wave-61 / DO-7 · Soft RLS honesty (D-011 · D-013b) · updated Wave-81 (1 Aug 2026)

## Short answer

Canonical production claim: **soft / request-bound**. See `docs/humanify-production-rls-truth.md`.

**Track A Security 100 (honest):** Soft RLS + app filters + ESS request-bound GUC + fail-closed webhooks/entitlements = accepted GA ceiling. Production FORCE strict RLS remains **Track B** (ADR D-013b) — not sold as shipped.

## What we guarantee in production today

| Control | Status |
|---------|--------|
| App-layer `tenant_id` filters on HR APIs | Yes — `withHQAuth` + scoped helpers |
| ESS APIs tenant GUC / request-bound | Yes — `withEmployeeAuth` (Wave-81) |
| Request-bound DB tenant context (`set_config`) | Yes when `HUMANIFY_RLS_REQUEST_BOUND=true` |
| Mock / demo HR data in production | **Off** — `allowHrMockFallback()` hard-off |
| Private claim receipts | Signed GET / session — tenant-matched (owner not cross-tenant) |
| MFA enrollment lock on APIs | Yes while `mfaSetupRequired` |
| Plan entitlement fail-closed (prod) | Yes — Wave-81 |
| Weekly IDOR security scorecard | Cron (targets staging URL when set) |

## Soft vs strict RLS

| Mode | Where | Meaning |
|------|-------|---------|
| **Soft** (prod default) | `humanify.id` | App filters + optional request-bound context. Safe for GA; chaos tests green. |
| **Strict** (lab) | `staging.humanify.id` slot | `HUMANIFY_RLS_MODE=strict` — DB policies enforced for lab/IDOR. |

We do **not** flip production to FORCE strict RLS until staging scorecard + hard e2e stay green (D-013b).

## Answers for common questionnaire prompts

**Q: Are tenants isolated at the database?**  
A: Yes at the application layer with `tenant_id` on Humanify HR APIs (`withHQAuth`) and ESS (`withEmployeeAuth`). Soft RLS adds request-bound session variables. Strict RLS is available on the staging lab DB.

**Q: Can one tenant’s employee see another tenant’s payroll?**  
A: Production APIs reject cross-tenant access; weekly IDOR batches exercise this. Report any finding to ops@humanify.id.

**Q: Is encryption at rest / in transit?**  
A: TLS at the edge (Cloudflare). Database credentials and NextAuth secrets are env-scoped on the VPS; claim files use HMAC-signed URLs (no weak `dev-claim-sign` fallback in production).

**Q: Do you use shared demo data in production?**  
A: No. Demo/mock HR fallbacks are disabled when `NODE_ENV=production`.

**Q: Do you run FORCE ROW LEVEL SECURITY in production?**  
A: Not yet — intentional ADR ceiling. Soft RLS + app scoping is the Track A guarantee. See sales sheet: `docs/humanify-sales-feature-status.md`.

## Related

- `docs/humanify-rls-strict-staging.md`
- `docs/humanify-rls-prod-flip.md`
- `docs/humanify-sales-feature-status.md`
- `.hermes/DECISIONS.md` (D-011 · D-013b)
