# Humanify — Staging Deploy (`staging.humanify.id`)

> Wave-58 · updated Wave-62 (20 Jul 2026)

## Purpose

Dedicated **non-prod** slot for:

- IDOR security scorecard (not prod proxy)
- Hard payroll Playwright (`HUMANIFY_E2E_HARD=1`)
- Strict RLS lab (`HUMANIFY_RLS_MODE=strict`)

Production stays **soft RLS** (D-013b).

## DNS (Cloudflare) — required for public URL

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| **A** | `staging` | `103.92.215.37` | ON (orange) OK |

**NXDOMAIN** = record belum dibuat. **1016 Origin DNS** = record ada tapi origin salah.

```bash
# Otomatis (butuh Zone:DNS:Edit token)
CF_API_TOKEN=xxx bash scripts/setup-humanify-staging-dns.sh

# Atau manual: Cloudflare → humanify.id → DNS → Add record
#   Type A · Name staging · IPv4 103.92.215.37 · Proxy ON
```

SSL: Cloudflare edge (`CLOUDFLARE_SSL=true`) — SSL/TLS mode **Full**. No origin certbot required.

### Local / VPS verify (works without public DNS)

```bash
# On VPS
curl -sS -H 'Host: staging.humanify.id' http://127.0.0.1/api/health
curl -sS http://127.0.0.1:3021/api/health?deep=1
pm2 list | grep humanify-staging
```

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

## Verify (after DNS A record fixed)

**E2E host rule (Wave-62 / D-025):** always use `https://staging.humanify.id` for Playwright.
Do **not** use `http://127.0.0.1:3021` — `NEXTAUTH_URL` is the public host, so cookies mismatch and login sticks on `/auth/login`. Loopback only with `HUMANIFY_E2E_ALLOW_LOOPBACK=1` when local `NEXTAUTH_URL` matches.

```bash
curl -sS https://staging.humanify.id/api/health?deep=1

# One-shot chain: scorecard → (optional) hard payroll
HUMANIFY_E2E_HARD=1 HUMANIFY_E2E_EMAIL=… HUMANIFY_E2E_PASSWORD=… \
  npm run verify:humanify:staging

# Or step-by-step
SMOKE_BASE_URL=https://staging.humanify.id npm run security:scorecard
HUMANIFY_E2E_HARD=1 PLAYWRIGHT_BASE_URL=https://staging.humanify.id \
  HUMANIFY_E2E_EMAIL=… HUMANIFY_E2E_PASSWORD=… \
  npm run test:e2e:humanify:payroll:hard

# RBAC personas (Wave-60)
HUMANIFY_E2E_HR_EMAIL=… HUMANIFY_E2E_HR_PASSWORD=… \
HUMANIFY_E2E_EMPLOYEE_EMAIL=… HUMANIFY_E2E_EMPLOYEE_PASSWORD=… \
  npx playwright test e2e/humanify-rbac-personas.spec.ts
```

**DB clone note:** `pg_dump --no-acl` strips grants — `ensure-humanify-staging-db.sh` always re-GRANTs role `humanify` after clone (login fails with `permission denied for table users` otherwise).

## Cron

When staging URL is set on prod VPS, weekly scorecard targets staging:

```bash
HUMANIFY_STAGING_URL=https://staging.humanify.id APP_DIR=/root/humanify \
  bash scripts/ensure-humanify-crons.sh
```

See also: [humanify-rls-strict-staging.md](./humanify-rls-strict-staging.md)
