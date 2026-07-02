# Handoff — ESI ERP

> Diperbarui: 24 Mei 2026 — **Hermes AI Developer setup**

## Status project

| Item | Status |
|---|---|
| Fork slim dari Bedagang/NainERP | ✅ |
| Modul dikecualikan dihapus | ✅ |
| Integrasi sidebar, API stub, dead links | ✅ |
| `npm run build` | ✅ |
| Hermes skills & team ESI | ✅ |
| Demo data proyek konservasi (PJM) | ✅ |

## Hermes AI Developer

**Setup selesai** — board `esi-erp`, 8 profil agent.

```bash
hermes --profile esi-cto
/esi-cto
hermes kanban --board esi-erp list
```

## Manajemen Proyek Konservasi

- UI: `/hq/project-management`
- Demo: Elang Jawa, Orangutan, Badak Jawa, Edukasi, Grant KLHK
- File: `lib/projectManagement/esi-demo-data.ts`

## Dev server

- URL: http://localhost:3010
- Login: `superadmin@bedagang.com` / `superadmin123`

## Backlog prioritas (untuk Hermes tim)

1. **Manajemen Proyek** — API + UI program konservasi
2. **Manajemen Aset** — kandang, peralatan, lokasi
3. **Basis Pengetahuan** — SOP & protokol satwa
4. **Inventori konservasi** — kategori pakan/obat khusus ESI
5. **Laporan grant** — template laporan donor di finance_pro

## Verifikasi cepat

```bash
npm run dev          # port 3010
npm run build
curl -s http://localhost:3010/api/system/integration-check | head
```

## Catatan integrasi

- `GET /api/hq/branches` → stub `Kantor Pusat ESI`
- `PUT /api/hq/modules/config` → simpan config modul settings
- Sidebar: `config/esi-sidebar.config.ts`
