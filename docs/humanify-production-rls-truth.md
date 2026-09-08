# Humanify — Production RLS truth (PR-023)

**Canonical claim for sales, security FAQ, and launch:**

Production tenant isolation is **application-scoped queries + request-bound RLS**.  
FORCE / strict RLS is a **staging lab** (`HUMANIFY_RLS_MODE=strict`) until post-launch evaluation (PR-046) is signed.

Do not sell “zero-leak FORCE RLS on production” unless a live probe for that SHA shows `HUMANIFY_RLS_MODE=strict` **and** empty-context chaos is green.

## Live modes

| Env | Expected | How to verify |
|---|---|---|
| Production | `HUMANIFY_RLS_MODE=soft` + `HUMANIFY_RLS_REQUEST_BOUND=true` | VPS `.env` + `npm run smoke:rls-lab` |
| Staging / RLS lab | `HUMANIFY_RLS_MODE=strict` | `docs/humanify-rls-strict-staging.md` |

Aug 2026 QC notes that recorded a FORCE flip are **ops history**, not the launch marketing claim. Re-verify live env before each release:

```bash
SMOKE_BASE_URL=https://humanify.id npm run smoke:rls-lab
SMOKE_BASE_URL=https://humanify.id npm run security:scorecard
```

Rollback: `HUMANIFY_RLS_MODE=soft node scripts/migrate-humanify-rls.js`

Linked: `docs/humanify-tenant-isolation-faq.md` · `.hermes/DECISIONS.md` D-013 / D-013b · PR-046.
