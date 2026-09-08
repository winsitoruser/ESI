# Humanify Admin Total — `admin.humanify.id`

Portal **superadmin platform** (seluruh tenant, billing, partner, observability). Bukan portal HR satu perusahaan.

| Surface | URL | Siapa |
|---|---|---|
| **Admin Total** | https://admin.humanify.id/login | `super_admin` / `platform_admin` |
| Alias ops | https://ops.humanify.id/login | Sama (control plane lama) |
| HR tenant | https://humanify.id/humanify/login | Owner / HR / manager satu perusahaan |
| ESS | https://humanify.id/employee | Karyawan |

`admin.humanify.id` memakai control plane yang sama dengan `ops.humanify.id` (`/platform`). HRIS tenant (`/humanify/*`) **ditolak** di host ini.

## Setup

```bash
VPS_PASS='…' CLOUDFLARE_API_TOKEN='…' bash scripts/setup-humanify-admin-subdomain.sh

DOMAIN=humanify.id CLOUDFLARE_SSL=true DEPLOY_SKIP_BOOTSTRAP=true DEPLOY_SKIP_MIGRATE=true \
  VPS_PASS='…' bash scripts/deploy-humanify-vps.sh

SMOKE_BASE_URL=https://humanify.id SMOKE_ADMIN_URL=https://admin.humanify.id npm run smoke:admin-host
```

Cloudflare: **A** `admin` → VPS IP, Proxied ON.

Env:

```
HUMANIFY_ADMIN_HOST=admin.humanify.id
NEXT_PUBLIC_HUMANIFY_ADMIN_HOST=admin.humanify.id
NEXT_PUBLIC_HUMANIFY_ADMIN_URL=https://admin.humanify.id
```
