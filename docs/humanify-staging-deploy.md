# Humanify — Staging Deploy (`staging.humanify.id`)

> Wave-58 · last updated 20 Jul 2026

## Purpose

Dedicated **non-prod** slot for:

- IDOR security scorecard (not prod proxy)
- Hard payroll Playwright (`HUMANIFY_E2E_HARD=1`)
- Strict RLS lab (`HUMANIFY_RLS_MODE=strict`)

Production stays **soft RLS** (D-013b).

## DNS (Cloudflare)

| Type | Name | Value |
|------|------|-------|
| A or CNAME | `staging` | VPS IP `103.92.215.37` (proxy ON OK) |

SSL: Cloudflare edge (`CLOUDFLARE_SSL=true`) — no origin certbot required.

## Deploy

```bash
# Password (legacy)
VPS_PASS='…' bash scripts/deploy-humanify-staging-vps.sh

# Preferred — SSH key (no sshpass)
VPS_SSH_KEY=~/.ssh/id_ed25519 bash scripts/deploy-humanify-staging-vps.sh
```

Slot layout on VPS:

| Item | Production | Staging |
|------|------------|---------|
| App dir | `/root/humanify` | `/root/humanify-staging` |
| PM2 | `humanify` | `humanify-staging` |
| Port | 3020 | 3021 |
| Nginx | `humanify` | `humanify-staging` |
| DB | `humanify` | `humanify_staging` (cloned from prod on first deploy) |
| RLS | soft | **strict** |

## Verify

```bash
curl -sS https://staging.humanify.id/api/health?deep=1
SMOKE_BASE_URL=https://staging.humanify.id npm run security:scorecard
HUMANIFY_E2E_HARD=1 PLAYWRIGHT_BASE_URL=https://staging.humanify.id \
  HUMANIFY_E2E_EMAIL=… HUMANIFY_E2E_PASSWORD=… \
  npx playwright test e2e/humanify-payroll-hard.spec.ts
```

## Cron

When staging URL is set on prod VPS, weekly scorecard targets staging:

```bash
HUMANIFY_STAGING_URL=https://staging.humanify.id APP_DIR=/root/humanify \
  bash scripts/ensure-humanify-crons.sh
```

See also: [humanify-rls-strict-staging.md](./humanify-rls-strict-staging.md)
