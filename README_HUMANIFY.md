# Humanify HRIS

**Humanify** adalah platform **HRIS** (Human Resource Information System) dari **[Naincode Inti Teknologi](https://naincode.com)** — solusi terpadu untuk mengelola seluruh siklus SDM: rekrutmen, onboarding, kehadiran, payroll, kinerja, hubungan industrial, hingga offboarding.

| | |
|---|---|
| **Produk** | Humanify HRIS |
| **Perusahaan** | Naincode Inti Teknologi |
| **Kategori** | People & Workforce Management |
| **Portal karyawan** | `/employee` (Employee Self-Service) |
| **Produksi** | [humanify.id](https://humanify.id) |

---

## Fitur utama

| Modul | Deskripsi |
|-------|-----------|
| **Rekrutmen & Onboarding** | Pipeline kandidat, integrasi job board, e-sign, checklist onboarding |
| **Database Karyawan** | Master data, org chart, mutasi, genealogy, dokumen karyawan |
| **Kehadiran & Cuti** | Absensi GPS/geofence, shift, lembur, manajemen cuti |
| **Payroll & Compliance** | Perhitungan gaji, THR, BPJS, pajak, slip gaji, kasbon & pinjaman |
| **OKR / KPI** | Cascading alignment, monitoring, check-in, reminder |
| **Performance & 360°** | Appraisal, feedback 360°, nine-box matrix |
| **Training & Development** | Program pelatihan, sertifikasi, scoring |
| **Industrial Relations** | Surat peringatan, PHK, governance IR terintegrasi disciplinary |
| **Project Management** | Proyek lapangan, timesheet, payroll proyek, dokumen |
| **Portal Karyawan** | ESS mobile — absensi, cuti, slip gaji, klaim |

---

## Stack teknologi

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (`pages/api/humanify/`) |
| Database | PostgreSQL |
| ORM | Sequelize |
| Auth | NextAuth (credentials, role-based access) |

---

## Menjalankan secara lokal

### Prasyarat

- Node.js 18+
- PostgreSQL 14+

### Setup

```bash
cp .env.example .env
```

Variabel lingkungan minimal:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/humanify
NEXTAUTH_SECRET=your-secret-min-32-chars
NEXTAUTH_URL=http://localhost:3010
```

### Migrasi & seed

```bash
npm install
npm run db:hris-migrate
npm run db:hris-extended-migrate
npm run db:attendance-migrate
npm run db:payroll-migrate
npm run db:disciplinary-migrate
npm run db:humanify-superadmin
```

### Development server

```bash
npm run dev
```

| Halaman | URL |
|---------|-----|
| Landing | http://localhost:3010/humanify/welcome |
| Login HRIS | http://localhost:3010/humanify/login |
| Dashboard | http://localhost:3010/humanify |
| Portal karyawan | http://localhost:3010/employee |

**Kredensial dev:** `superadmin@bedagang.com` / `superadmin123`

---

## Struktur proyek

```
pages/humanify/              # Antarmuka HRIS (dashboard, modul SDM)
pages/api/humanify/          # REST API modul Humanify
pages/employee/              # Portal karyawan (ESS)
components/humanify/         # Komponen UI (layout, modul, disciplinary)
lib/humanify/                # Branding, paths, session helpers
lib/hris/                    # Logic bisnis HRIS
models/                      # Data model Sequelize
migrations/                  # Skema database
scripts/                     # Deploy, migrasi, smoke test
```

---

## Testing

```bash
# Smoke test HRIS lengkap
SMOKE_BASE_URL=http://localhost:3010 npm run smoke:humanify

# Modul spesifik
npm run smoke:payroll
npm run smoke:recruitment-training
npm run smoke:employee-mgmt
npm run smoke:attendance

# Integrasi IR ↔ Disciplinary ↔ Employee
SMOKE_BASE_URL=http://localhost:3010 node scripts/smoke-test-ir-disciplinary-integration.js
```

---

## Deploy ke produksi

### Deploy VPS (IP atau domain)

```bash
VPS_HOST=your.vps.ip VPS_USER=root VPS_PASS='...' \
  bash scripts/deploy-humanify-vps.sh
```

### Deploy dengan domain + SSL (Certbot)

```bash
VPS_HOST=your.vps.ip VPS_USER=root VPS_PASS='...' \
  DOMAIN=humanify.id CERTBOT_EMAIL=admin@humanify.id \
  bash scripts/deploy-humanify-vps.sh
```

### Deploy dengan Cloudflare SSL (edge)

```bash
VPS_HOST=your.vps.ip VPS_USER=root VPS_PASS='...' \
  DOMAIN=humanify.id CLOUDFLARE_SSL=true \
  bash scripts/deploy-humanify-vps.sh
```

Atau setup Cloudflare saja pada VPS yang sudah berjalan:

```bash
VPS_HOST=your.vps.ip VPS_USER=root VPS_PASS='...' \
  DOMAIN=humanify.id bash scripts/setup-humanify-cloudflare.sh
```

**Checklist DNS sebelum deploy domain:**

1. A record `@` → IP VPS
2. A record `www` → IP VPS
3. (Cloudflare) Nameserver domain → Cloudflare
4. (Cloudflare) SSL/TLS mode: Flexible atau Full

---

## Pengembangan

Proyek ini dikembangkan dengan workflow AI-assisted menggunakan [Hermes Agent](https://github.com/NousResearch/hermes-agent).

```bash
npm run hermes:setup
npm run hermes:team
hermes --profile esi-cto
```

---

## Lisensi

Proprietary — **Naincode Inti Teknologi**. All rights reserved.

Dikembangkan oleh **Naincode Dev** · [naincode.com](https://naincode.com)
