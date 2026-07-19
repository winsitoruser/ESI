# Humanify — Strict RLS Staging Lab

> CTO-3 · last updated 19 Jul 2026

## Goal

Validate **FORCE RLS** + request-bound tenant context on a **non-prod** database before considering strict mode for production.

Production today: **soft RLS** + `HUMANIFY_RLS_REQUEST_BOUND` (D-011). Do **not** flip prod to strict without this lab green.

## Setup (staging)

1. Clone prod schema to `humanify_rls_lab` (or dedicated staging instance).
2. On lab DB:

```bash
HUMANIFY_RLS_MODE=strict DATABASE_URL=postgresql://…/humanify_rls_lab \
  node scripts/migrate-humanify-rls.js
```

3. App env (staging only):

```
HUMANIFY_RLS_REQUEST_BOUND=true
# Do NOT set on prod until lab passes
```

4. Seed two tenants (`qa-golden`, `demo`) via `npm run seed:qa-golden` / `seed:demo-tenant`.

## Chaos checks

| Test | Expected |
|---|---|
| Login tenant A, `GET /api/humanify/employees` | Only A rows |
| Replay tenant A session cookie against tenant B id | 403/404 / empty |
| IDOR batches 6/8/10 against staging URL | All blocked |
| Background job without `set_config` tenant | 0 rows or error (not leak) |

```bash
# Offline unit (CI / local — no DB flip)
npm run smoke:rls-lab

# Optional live against lab DB only
HUMANIFY_RLS_LAB=1 DATABASE_URL=postgresql://…/humanify_rls_lab npm run smoke:rls-lab

SMOKE_BASE_URL=https://staging.example npm run security:scorecard
SMOKE_BASE_URL=https://staging.example npm run smoke:ga-journey
```

## Exit criteria

- [x] Unit smoke `smoke:rls-lab` asserts FORCE RLS + deny-empty + soft prod enable
- [x] No cross-tenant row in IDOR scorecard — **prod proxy accepted** until dedicated staging URL exists: `npm run smoke:idor` + weekly `npm run security:scorecard` (cron). Set `SMOKE_BASE_URL` when staging lab is online.
- [x] Employee create + docs + payroll soft path green — Wave-47 soft auth-gate e2e (`npm run test:e2e:humanify:payroll:prod`); hard payroll suite still deferred
- [x] Backup/restore of lab DB documented — see **Lab backup/restore** below
- [x] Written decision in `.hermes/DECISIONS.md` before prod strict — **D-013**

## Lab backup/restore

```bash
# Backup lab DB (example)
pg_dump "$DATABASE_URL_LAB" -Fc -f /var/backups/humanify_rls_lab_$(date +%Y%m%d).dump

# Restore into isolated lab DB (never prod)
pg_restore -d "$DATABASE_URL_LAB" --clean --if-exists /var/backups/humanify_rls_lab_YYYYMMDD.dump

# Re-apply soft RLS policies after restore
HUMANIFY_RLS_MODE=soft node scripts/migrate-humanify-rls.js
```

Ops note: production backups remain via `scripts/ensure-humanify-crons.sh` db-backup cron; lab restore is manual and must target `humanify_rls_lab` only.

## Rollback

```bash
HUMANIFY_RLS_MODE=soft node scripts/migrate-humanify-rls.js
# or restore lab from dump
```
