# Humanify — Prod FORCE strict RLS flip runbook

> Wave-68 · D-013 / D-028 · last updated 21 Jul 2026

## Status

| Env | `HUMANIFY_RLS_MODE` | DB policy | Empty-context chaos |
|---|---|---|---|
| Staging | `strict` | USING_STRICT + FORCE | **0 rows** (Wave-67) |
| Prod | `soft` | soft (empty → allow) | N/A — **do not flip casually** |

## Preconditions (all must be green)

1. Staging live chaos green (`EMPTY employees=0` under empty tenant).
2. `SMOKE_BASE_URL=https://staging.humanify.id npm run smoke:idor` — 0 fail.
3. Cron/job scripts bind tenant context (Wave-68):
   - `send-humanify-action-inbox-digest.js`
   - `send-humanify-doc-expiry-digest.js`
   - `run-humanify-doc-expiry-soft-deactivate.js`
   - `hard-delete-purged-tenants.js`
   - helper: `scripts/lib/tenant-db-context.js`
4. `npm run smoke:wave68` unit green.
5. Explicit CTO sign-off + maintenance window.

## Flip (prod) — gated

```bash
# On VPS, from /root/humanify — REQUIRES confirm env
CONFIRM_PROD_RLS_STRICT=YES bash scripts/flip-humanify-prod-rls-strict.sh
```

Script steps:
1. Preflight refuse if confirm missing / not prod APP_DIR.
2. Backup note + `pg_dump` hint.
3. `HUMANIFY_RLS_MODE=strict node scripts/migrate-humanify-rls.js`
4. Patch `.env` → `HUMANIFY_RLS_MODE=strict` (keep `HUMANIFY_RLS_REQUEST_BOUND=true`).
5. `pm2 restart humanify --update-env`
6. Empty-context probe must return 0; health + login smoke.

## Rollback

```bash
# Restore soft policies + env
HUMANIFY_RLS_MODE=soft node scripts/migrate-humanify-rls.js
# set HUMANIFY_RLS_MODE=soft in /root/humanify/.env
pm2 restart humanify --update-env
```

## Out of scope

- Sentry.io external (D-010b)
- Midtrans auto-payout (D-015)
