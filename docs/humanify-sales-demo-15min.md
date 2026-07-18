# Humanify — Demo sales 15 menit

> Skrip demo untuk tenant `demo` (seed: `npm run seed:demo-tenant`).

## Persiapan (2 menit)

1. Login: `https://humanify.id/auth/login` (akun demo / superadmin).
2. Pastikan tenant seed: `DEMO_TENANT_SLUG=demo npm run seed:demo-tenant` (di VPS dengan `DATABASE_URL`).
3. Buka `/humanify` — tunjukkan **Action Inbox** (cuti / kontrak / dokumen / absensi).

## Alur demo (13 menit)

| Menit | Layar | Bicara |
|------:|-------|--------|
| 0–2 | `/humanify` | Dashboard live + Action Inbox sebagai “hari pertama HR”. |
| 2–4 | `/humanify/employees` | Tambah karyawan cepat; buka detail → tab dokumen (progress upload, status file). |
| 4–6 | `/humanify/attendance` | Absensi hari ini; tautkan ke perangkat/geofence bila relevan. |
| 6–8 | `/humanify/leave` | Ajukan cuti → muncul di Action Inbox. |
| 8–11 | `/humanify/payroll` | Proses gaji / slip; sebut PPh21 & BPJS (depth fiscal). |
| 11–13 | `/humanify/ess` atau portal | Self-service karyawan; tutup dengan ROI & trial. |
| 13–15 | Pricing / next step | Trial expiry, invite tim, jadwalkan POC IdP jika enterprise. |

## Bukti teknis (opsional live)

```bash
SMOKE_BASE_URL=https://humanify.id npm run smoke:ga-journey
SMOKE_BASE_URL=https://humanify.id npm run smoke:employee-docs
```

## Jangan demo dulu

- LMS lab / AI hub dalam (kecuali ditanya).
- Strict RLS / Sentry.io eksternal.
- SumoPod “Verify” di dashboard vendor (manual QC terpisah).
