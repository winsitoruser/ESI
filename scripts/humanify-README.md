# Humanify — Panduan Deploy & Scripts

Dokumentasi produk lengkap: **[README_HUMANIFY.md](../README_HUMANIFY.md)** di root proyek.

## Scripts di folder ini

| Script | Fungsi |
|--------|--------|
| `deploy-humanify-vps.sh` | Deploy full-stack ke VPS (rsync, build, PM2, Nginx, SSL opsional) |
| `setup-humanify-cloudflare.sh` | Konfigurasi Nginx + real IP Cloudflare untuk origin di belakang edge SSL |
| `smoke-test-ir-disciplinary-integration.js` | Smoke test integrasi IR ↔ Disciplinary ↔ Employee |
| `smoke-test-hris-full.js` | Smoke test HRIS end-to-end |
| `ensure-humanify-superadmin.js` | Seed/ensure akun superadmin Humanify |

## Deploy cepat

```bash
# IP langsung
VPS_HOST=103.92.215.37 VPS_USER=root VPS_PASS='...' bash scripts/deploy-humanify-vps.sh

# Domain + Cloudflare
VPS_HOST=103.92.215.37 VPS_USER=root VPS_PASS='...' \
  DOMAIN=humanify.id CLOUDFLARE_SSL=true bash scripts/deploy-humanify-vps.sh
```

## Lisensi

Proprietary — Naincode Inti Teknologi · Dikembangkan oleh Naincode Dev
