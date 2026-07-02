# ESI ERP

Platform ERP untuk **PT Ekosistem Satwa Indonesia (ESI)** — manajemen operasional konservasi satwa liar, tanpa modul ritel.

## Modul yang Tersedia

| Kategori | Modul |
|----------|-------|
| **Utama** | Beranda, Dasbor Operasional |
| **Konservasi** | Manajemen Proyek, Manajemen Aset, Basis Pengetahuan |
| **Operasional** | Inventori, E-Pengadaan, Permintaan Barang, Armada/FMS/TMS, Ekspor-Impor |
| **SDM** | HRIS, Pengguna & Akses |
| **Stakeholder** | CRM & Mitra, Help Desk, Pemasaran, WhatsApp, Website Builder |
| **Keuangan** | Keuangan Lengkap (finance_pro) |
| **Sistem** | Laporan, Audit Log, Pengaturan |

## Modul yang Dikecualikan

- PoS & Kasir
- FnB (Dapur, Meja, Reservasi)
- Cabang / Multi-branch
- Manufaktur
- Keuangan Ringkas
- Brankas Digital (DMS)
- Livestreaming Business
- BUMDes

## Akses

- **/** → redirect otomatis ke `/auth/login` (tanpa landing page marketing)
- **/auth/register** → dinonaktifkan, redirect ke login

```bash
cd esi-erp
cp .env.example .env   # sesuaikan DATABASE_URL, NEXTAUTH_SECRET
npm install
npm run dev              # http://localhost:3010
```

Login default (dari seed proyek induk): `superadmin@bedagang.com` / `superadmin123`

## Integrasi & Arsitektur

### Routing
| Path | Perilaku |
|------|----------|
| `/` | Redirect ke `/hq/home` (jika login) atau `/auth/login` |
| `/auth/register` | Dinonaktifkan → redirect login |
| `/hq/settings/modules` | Manajemen modul (sidebar: Manajemen Modul) |
| `/hq/finance/profit-loss` | Laporan laba rugi |

### API Stub (organisasi tunggal)
ESI tidak memakai multi-cabang. Endpoint berikut disediakan agar modul keuangan & inventori tetap berfungsi:

- `GET /api/hq/branches` — mengembalikan satu entitas `Kantor Pusat ESI`
- `PUT /api/hq/modules/config` — simpan konfigurasi modul dari halaman settings

### Pemeriksaan integrasi
- `GET /api/system/integration-check` — memverifikasi DB & modul ESI (tanpa POS/Kitchen/Cabang)

### Navigasi yang disesuaikan
- Widget dasbor: aksi cepat → proyek konservasi (bukan tambah cabang)
- Helpdesk integrasi: link ke proyek konservasi (bukan POS)
- Fleet supply chain: link ke inventori (bukan manufaktur)
- Halaman modul `[code]`: modul yang dikecualikan di-redirect ke `/hq/home`

## Struktur

- `config/esi-sidebar.config.ts` — menu sidebar khusus ESI
- `pages/hq/` — halaman HQ (tanpa branches, dms, manufacturing, bumdes, livestreaming)
- `pages/api/hq/` — API backend per modul

## Catatan

Proyek ini merupakan fork slim dari platform NainERP/Bedagang, dikonfigurasi khusus untuk organisasi konservasi satwa.

## Hermes AI Developer

Project ini dikembangkan dengan **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** + SumoPod AI.

```bash
# 1. Install Hermes (sekali)
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash

# 2. API key di ~/.hermes/.env (lihat hermes/env.example)

# 3. Setup project ESI
npm run hermes:setup
npm run hermes:team

# 4. Mulai develop
hermes
/esi-develop

# Atau sebagai CTO (orkestrasi tim AI)
hermes --profile esi-cto
/esi-cto
```

Dokumentasi lengkap: [`hermes/README.md`](hermes/README.md)
