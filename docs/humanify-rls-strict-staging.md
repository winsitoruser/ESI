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
SMOKE_BASE_URL=https://staging.example npm run security:scorecard
SMOKE_BASE_URL=https://staging.example npm run smoke:ga-journey
```

## Exit criteria

- [ ] No cross-tenant row in IDOR scorecard
- [ ] Employee create + docs + payroll soft path green
- [ ] Backup/restore of lab DB documented
- [ ] Written decision in `.hermes/DECISIONS.md` before prod strict

## Rollback

```bash
HUMANIFY_RLS_MODE=soft node scripts/migrate-humanify-rls.js
# or restore lab from dump
```
