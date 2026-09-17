# Humanify — Demo sales 15 menit

> Skrip demo untuk tenant `demo` (seed: `npm run seed:demo-account`).

## Akun demo (sudah berdata)

| Field | Nilai |
|---|---|
| URL | `https://humanify.id/humanify/login` |
| Email | `demo@humanify.id` |
| Password | `DemoHumanify1!` |
| Perusahaan | PT Nusantara Karya Demo |
| Role | owner (plan Growth) |

Seed di VPS: `npm run seed:demo-account` (idempotent; tenant slug `demo` saja — tidak menempel ke superadmin).

## Persiapan (2 menit)

1. Login: `https://humanify.id/humanify/login` dengan akun demo di atas.
2. Refresh data: `npm run seed:demo-account` (di VPS dengan `DATABASE_URL`).
3. Pastikan partner DEMO: `npm run ensure:demo-partner` (upsert kode `DEMO` 10%; attach ke slug `demo`).
4. Signup referral: `/humanify/signup?ref=DEMO` atau `?partner=DEMO` — preview: tombol **Preview DEMO · Rp1jt** di `/platform`.
5. Cek chip **DEMO walkthrough: present** di `/platform` (Partner / referral codes).
6. Buka `/humanify` — tunjukkan **Action Inbox** (cuti / kontrak / dokumen / absensi).

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
PLAYWRIGHT_BASE_URL=https://humanify.id npm run test:e2e:humanify:signup-ref:prod
```

## Jangan demo dulu

- LMS lab / AI hub dalam (kecuali ditanya).
- Strict RLS / Sentry.io eksternal.
- SumoPod “Verify” di dashboard vendor (manual QC terpisah).
