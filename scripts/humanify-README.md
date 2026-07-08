# Humanify

**Humanify** adalah sistem **HRIS** (Human Resource Information System) dari **[Naincode](https://naincode.com)** — bagian dari portofolio inti teknologi **Naincode Inti Teknologi**.

Kelola seluruh siklus SDM: karyawan, kehadiran, cuti, payroll, KPI, rekrutmen, training, dan portal karyawan — dalam satu platform yang modern dan terintegrasi.

## Tentang produk

| | |
|---|---|
| **Produk** | Humanify HRIS |
| **Perusahaan** | Naincode Inti Teknologi |
| **Kategori** | People & Workforce / HRIS |
| **Portal karyawan** | `/employee` (ESS mobile) |

## Stack teknologi

- Next.js 15 · React 18 · TypeScript
- PostgreSQL · Sequelize ORM
- NextAuth (autentikasi enterprise)

## Menjalankan secara lokal

```bash
cp .env.example .env
```

Set variabel minimal:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/humanify
NEXTAUTH_SECRET=your-secret-min-32-chars
NEXTAUTH_URL=http://localhost:3020
```

```bash
npm install
npm run db:hris-migrate
npm run db:hris-extended-migrate
npm run db:attendance-migrate
npm run db:payroll-migrate
npm run dev
```

| Halaman | URL |
|---------|-----|
| Landing | http://localhost:3020/humanify/welcome |
| Login | http://localhost:3020/humanify/login |
| Dashboard HRIS | http://localhost:3020/humanify |
| Portal karyawan | http://localhost:3020/employee |

## Smoke test

```bash
npm run dev
SMOKE_BASE_URL=http://localhost:3020 npm run smoke
```

## Struktur proyek

```
pages/humanify/         # Antarmuka HRIS
pages/api/humanify/     # REST API modul SDM
pages/employee/         # Portal karyawan (ESS)
components/humanify/    # Komponen UI
lib/humanify/           # Branding & konfigurasi platform
lib/hris/               # Logic bisnis HRIS
models/                 # Data model Sequelize
migrations/             # Skema database
```

## Lisensi

Proprietary — Naincode Inti Teknologi. All rights reserved.
