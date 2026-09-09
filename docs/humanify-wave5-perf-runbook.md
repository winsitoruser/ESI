# Humanify WAVE-5 — performance runbook

**Jangan** jalankan login/clock/webhook 200 VU ke `https://humanify.id`. Tenant sintetis + staging. Peak freeze: `lib/saas/perf-targets.ts` (50 tenant, 200 VU login, 1000 clock/min).

Health ringan di prod **boleh** (sudah dilakukan siklus 4: autocannon c=20 d=15). Load login/dashboard/clock hanya staging.

## Prasyarat

- Binary [k6](https://k6.io/) di mesin SRE
- `SMOKE_BASE_URL` staging, bukan dump PII prod (WQ-008)
- Kredit sintetis; jangan akun pelanggan

## Perintah

```bash
# WQ-080 health (prod-safe, kecil)
k6 run -e BASE_URL=https://humanify.id -e VUS=20 -e DURATION=15s scripts/k6/humanify-health.js

# WQ-080 login 200 VU — staging only
k6 run -e BASE_URL=https://staging.humanify.id \
  -e SMOKE_EMAIL=... -e SMOKE_PASSWORD=... \
  scripts/k6/humanify-login.js

# WQ-081 dashboard
k6 run -e BASE_URL=https://staging.humanify.id -e K6_COOKIE='...' scripts/k6/humanify-dashboard.js

# WQ-082 clock spike (menulis absensi)
PERF_ALLOW_WRITE=1 k6 run -e BASE_URL=https://staging.humanify.id \
  -e K6_COOKIE='...' scripts/k6/humanify-clock-spike.js
```

Light baseline tanpa k6: `npm run smoke:capacity` (autocannon 10c 8s pada `/api/health`).

## WQ-083 … WQ-086

| ID | Cara |
|---|---|
| WQ-083 | Seed 1k karyawan sintetis di staging; `smoke:payroll-golden` + time wall clock |
| WQ-084 | POST webhook Midtrans **sandbox** 500/min + duplikat; cek 1 entitlement |
| WQ-085 | Campuran health+login+dashboard 8 jam; amati RSS / DB pool |
| WQ-086 | Naikkan VU sampai error &gt; 1% atau p95 lutut; turunkan; pastikan CRUD tanpa repair DB |

## WQ-087 — SLO health

Siklus 4: health p50 48 ms, **p97.5 329 ms** vs target freeze p95 &lt; 200 ms. Handler `/api/health` (tanpa `?deep=1`) tidak query DB — sisa latensi = TLS/VPS/Node.

Pilihan Eng Lead (belum ditandatangani):

1. **Tetap 200 ms** → GATE-18 Partial sampai nginx/CDN health atau VM lebih besar; atau
2. **Naikkan SLO tertulis ke p95 &lt; 400 ms** (meng-cover 329 ms) lalu recertify.

Login p95 target 800 ms: ukur siklus 4 p97.5 434 ms — **masuk** envelope.

Simpan artefak di `artifacts/wave5-<date>/`.
