# Humanify Platform Ops — `ops.humanify.id`

Control plane (tenant list, partners, observability) is isolated on a dedicated subdomain for a smaller blast radius.

| Surface | URL |
|---|---|
| Ops login | https://ops.humanify.id/login |
| Control plane | https://ops.humanify.id/platform |
| Legacy apex | https://humanify.id/platform → **308** to ops |

## Allowed routes (ops host)

| Path | Role |
|---|---|
| `/login` | Public ops login |
| `/platform` | Command center — KPI, pie/line/area charts, antrean, pulse |
| `/platform/clients` | Tenant lifecycle |
| `/platform/billing` | Pembayaran, unpaid, voucher, harga & modul paket |
| `/platform/partners` | Referral & payout |
| `/platform/observability` | Health & alerts |
| `/platform/audit` | Jejak operator |
| `/platform/support` | Antrean trial / unpaid / risiko / email |
| `/platform/users` | Operator platform & akun tenant |
| `/platform/system` | Scorecard infra (tanpa secret) |
| `/platform/demo-checklist` | Sales walkthrough (link ke apex) |

Supporting: `/platform/tenants/:id`, `/platform/email-preview`.

Nav primer: Ringkasan · Klien · Billing · Partner · Support · Observability · Audit.
Lainnya: Pengguna · Sistem · Demo · Email.

## Setup

```bash
# 1) DNS + nginx server_name + .env keys
VPS_PASS='…' CLOUDFLARE_API_TOKEN='…' bash scripts/setup-humanify-ops-subdomain.sh

# 2) Deploy app
DOMAIN=humanify.id CLOUDFLARE_SSL=true DEPLOY_SKIP_BOOTSTRAP=true DEPLOY_SKIP_MIGRATE=true \
  VPS_PASS='…' bash scripts/deploy-humanify-vps.sh

# 3) Smoke
SMOKE_BASE_URL=https://humanify.id SMOKE_OPS_URL=https://ops.humanify.id npm run smoke:ops-host
```

Env (VPS `.env`):

```
HUMANIFY_OPS_HOST=ops.humanify.id
NEXT_PUBLIC_HUMANIFY_OPS_HOST=ops.humanify.id
NEXT_PUBLIC_HUMANIFY_OPS_URL=https://ops.humanify.id
HUMANIFY_OPS_ENFORCE=true
```

## Local

Add `127.0.0.1 ops.localhost` to `/etc/hosts`, then open `http://ops.localhost:3010/login`.
Set `HUMANIFY_OPS_HOST=ops.localhost` and `HUMANIFY_OPS_ENFORCE=false` in `.env.local` if needed.
