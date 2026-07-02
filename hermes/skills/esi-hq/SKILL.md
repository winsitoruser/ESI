---
name: esi-hq
description: Modul HQ ESI ERP — konservasi, proyek, aset, inventori, keuangan grant, HRIS ranger.
---

# ESI HQ Module Workflow

## Lokasi kode
```
config/esi-sidebar.config.ts   # Menu navigasi ESI
pages/hq/                       # UI
pages/api/hq/                   # API
components/hq/                  # HQLayout, widgets
lib/hq/mock-data.ts             # Mock fallback ESI
```

## Modul HQ ESI

| Modul | Path UI | API |
|---|---|---|
| Beranda | `home.tsx` | `/api/hq/modules`, `/api/hq/dashboard` |
| Dasbor | `dashboard/` | `/api/hq/dashboard` |
| Proyek Konservasi | `project-management/` | buat/perluas sesuai kebutuhan |
| Manajemen Aset | `assets/` | buat/perluas |
| Basis Pengetahuan | `knowledge-base/` | buat/perluas |
| Inventori | `inventory/` | `/api/hq/inventory/` |
| Keuangan Lengkap | `finance/` | `/api/hq/finance/` |
| HRIS | `hris/` | `/api/hq/hris/` |
| CRM & Mitra | `sfa/` | `/api/hq/sfa/` |
| Helpdesk | `helpdesk/` | `/api/hq/helpdesk` |
| Armada | `fms/` | `/api/hq/fms/` |
| Pengaturan | `settings/` | `/api/hq/modules`, `/api/hq/modules/config` |

## Yang TIDAK ADA — jangan referensikan
- `pages/hq/dms/`, `bumdes/`, `branches/`, `manufacturing/`, `livestreaming/`
- `pages/pos/`, `pages/kitchen/`, `pages/tables/`
- Keuangan Ringkas (`finance/transactions`, `finance/daily`)

## Sidebar
Import di `HQLayout.tsx`:
```typescript
import { esiHqSidebarConfig } from '@/config/esi-sidebar.config';
```

Perbaiki href sebelum menambah item baru. Contoh valid:
- `/hq/finance/profit-loss` (bukan `/hq/finance/pnl`)
- `/hq/settings/modules` (bukan `/hq/modules`)

## Mock data
`MOCK_HQ_MODULE_STATUSES` dan `MOCK_HQ_BRANCHES` di `lib/hq/mock-data.ts` sudah disesuaikan ESI.
Gunakan `rowsOr(apiData, MOCK_*)` untuk fallback UI.

## Integrasi check
```bash
curl http://localhost:3010/api/system/integration-check
```
Harus mencakup modul konservasi, tanpa POS/Kitchen.

## Widget & link mati
Saat menambah quick action / integrasi card, hindari:
- `/pos`, `/hq/branches/*`, `/hq/manufacturing`
Ganti dengan modul ESI: proyek, inventori, CRM, knowledge-base.
