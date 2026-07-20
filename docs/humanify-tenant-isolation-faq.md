# Humanify — Tenant Isolation FAQ (sales / security questionnaire)

> Wave-61 / DO-7 · Soft RLS honesty (D-011 · D-013b) · 20 Jul 2026

## Short answer

Humanify is a **multi-tenant HRIS**. Every tenant’s data is scoped by `tenant_id` in application queries and (where enabled) PostgreSQL Row Level Security. Production currently runs **soft RLS** — defense-in-depth with request-bound `set_config`, not a hard DB FORCE policy on every connection pool path.

## What we guarantee in production today

| Control | Status |
|---------|--------|
| App-layer `tenant_id` filters on HR APIs | Yes — `withHQAuth` + scoped helpers |
| Request-bound DB tenant context (`set_config`) | Yes when `HUMANIFY_RLS_REQUEST_BOUND=true` |
| Mock / demo HR data in production | **Off** — `allowHrMockFallback()` hard-off |
| Private claim receipts | Signed GET / session — not world-readable `public/` |
| Weekly IDOR security scorecard | Cron (targets staging URL when set) |

## Soft vs strict RLS

| Mode | Where | Meaning |
|------|-------|---------|
| **Soft** (prod default) | `humanify.id` | App filters + optional request-bound context. Safe for GA; chaos tests green. |
| **Strict** (lab) | `staging.humanify.id` slot | `HUMANIFY_RLS_MODE=strict` — DB policies enforced for lab/IDOR. |

We do **not** flip production to FORCE strict RLS until staging scorecard + hard e2e stay green (D-013b).

## Answers for common questionnaire prompts

**Q: Are tenants isolated at the database?**  
A: Yes at the application layer with `tenant_id` on all Humanify HR APIs behind `withHQAuth`. Soft RLS adds request-bound session variables. Strict RLS is available on the staging lab DB.

**Q: Can one tenant’s employee see another tenant’s payroll?**  
A: Production APIs reject cross-tenant access; weekly IDOR batches exercise this. Report any finding to ops@humanify.id.

**Q: Is encryption at rest / in transit?**  
A: TLS at the edge (Cloudflare). Database credentials and NextAuth secrets are env-scoped on the VPS; claim files use HMAC-signed URLs.

**Q: Do you use shared demo data in production?**  
A: No. Demo/mock HR fallbacks are disabled when `NODE_ENV=production`.

**Q: When will strict RLS be default in prod?**  
A: After staging.humanify.id runs continuous hard payroll + IDOR scorecard green (see `docs/humanify-rls-strict-staging.md`).

## Related docs

- [humanify-rls-strict-staging.md](./humanify-rls-strict-staging.md)
- [humanify-staging-deploy.md](./humanify-staging-deploy.md)
- ADR D-011 · D-013b · D-019 · D-021 · D-023 in `.hermes/DECISIONS.md`
