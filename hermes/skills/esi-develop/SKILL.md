---
name: esi-develop
description: Workflow pengembangan ESI ERP — konservasi satwa, Next.js, PostgreSQL, organisasi tunggal, port 3010.
---

# ESI ERP — Development Workflow

## Prinsip
> Eksekusi otonom. Minimize scope. Ikuti konvensi existing.
> Jangan tambah modul yang dikecualikan (PoS, cabang, DMS, manufaktur, BUMDes, livestreaming).

## Sebelum coding
1. Baca `AGENTS.md` dan `.hermes/DECISIONS.md`
2. Cek `.hermes/HANDOFF.md`
3. Sidebar: `config/esi-sidebar.config.ts` — jangan pakai menu Bedagang penuh
4. Cek API existing di `pages/api/hq/` sebelum buat endpoint baru

## Setup lokal
```bash
cd "/Users/winnerharry/Bedagang ERP/esi-erp"
npm install
npm run dev                    # http://localhost:3010
npm run build                  # verifikasi sebelum selesai
```

Login: `superadmin@bedagang.com` / `superadmin123`

## Modul ESI (fokus)

| Modul | Path UI | Catatan |
|---|---|---|
| Beranda | `pages/hq/home.tsx` | MODULE_REGISTRY konservasi |
| Proyek | `pages/hq/project-management/` | Program lapangan |
| Aset | `pages/hq/assets/` | Kandang, peralatan |
| Basis Pengetahuan | `pages/hq/knowledge-base/` | SOP satwa |
| Inventori | `pages/hq/inventory/` | Pakan, obat |
| Keuangan | `pages/hq/finance/` | finance_pro |
| HRIS | `pages/hq/hris/` | Ranger, peneliti |
| CRM/Mitra | `pages/hq/sfa/` | Donor, sponsor |
| Armada | `pages/hq/fms/` | Patroli lapangan |

## Organisasi tunggal (bukan multi-cabang)
- `GET /api/hq/branches` → stub satu HQ (`Kantor Pusat ESI`)
- Jangan buat halaman `/hq/branches/*`
- Filter cabang di finance/inventory pakai stub ini

## Pola HQ page
```tsx
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';

export default function MyPage() {
  const { t } = useTranslation();
  return (
    <HQLayout title="..." subtitle="...">
      {/* content */}
    </HQLayout>
  );
}
```

## Pola API route
```typescript
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  // ...
}
```

## Verifikasi
1. `node --check` untuk file `.js` yang diubah
2. `npm run build` jika node_modules lengkap
3. Manual: buka `http://localhost:3010/hq/home`

## Selesai task
- Update `.hermes/HANDOFF.md` dengan perubahan + cara verifikasi
- Jangan commit kecuali user minta
