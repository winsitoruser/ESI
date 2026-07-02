# Handoff — SIMESI (fka ESI ERP)

> Diperbarui: 2 Juli 2026 — **Refactoring Phase 1-3 selesai · Viking Division aktif · Phase 4 tiket terbuat**

## Status project — Pasca Refactor

| Item | Status |
|---|---|
| NainERP branding → SIMESI | ✅ 111 replacements |
| Bedagang references dihapus | ✅ |
| PoS/FnB/Kitchen code dihapus | ✅ (9 files + full kitchen API dir) |
| Stale deploy scripts + IP hardcoded | ✅ Dibersihkan |
| Stale export/ + _backup_dupes/ | ✅ Dihapus |
| Migrasi excluded module diarsipkan | ✅ 13 files ke `migrations/_archived/` |
| Build | ✅ `npm run build` sukses |
| Login page | ✅ Berfungsi di `localhost:3010` |

## Kredensial

| Email | Password | Role |
|---|---|---|
| `superadmin@bedagang.com` | `MasterAdmin2026!` | super_admin |
| `demo@bedagang.com` | `demo123` | owner |

## Arsitektur saat ini

```
SIMESI (Next.js 15, Pages Router)
├── pages/
│   ├── auth/login.tsx         # NextAuth credentials
│   ├── hq/*                   # Dashboard HQ (HQLayout)
│   │   ├── home.tsx
│   │   ├── project-management/
│   │   ├── assets/
│   │   ├── finance/
│   │   ├── hris/
│   │   ├── inventory/
│   │   └── ...
│   ├── api/
│   │   ├── auth/[...nextauth].ts
│   │   ├── hq/*               # HQ API
│   │   └── ...
│   └── settings/*
├── models/                     # Sequelize models (~120+)
├── migrations/                 # 129 migration files (13 archived)
│   └── _archived/              # PoS, FnB, DMS, Loyalty migrations
│   └── FK_ORDERING_ANALYSIS.md # 154 potential ordering issues
├── config/
│   ├── sidebar.config.ts       # Legacy (PoS/FnB disabled)
│   └── esi-sidebar.config.ts   # SIMESI sidebar (clean)
├── lib/
│   └── translations/           # Branding updated → SIMESI
└── docs/adr/
    └── ADR-010-simesi-platform-mandiri.md
```

## Backlog prioritas (Phase 4) — ✅ Tiket terbuat di kanban `esi-erp`

| # | Tiket | Assignee | Priority | Status |
|---|---|---|---|---|
| 1 | 🔥 Phase 4.1 — Hapus model FnB/PoS/DMS dari Prisma | `esi-backend-sr-1` | P1 | ✅ ready |
| 2 | 🔥 Phase 4.2 — CI/CD Pipeline GitHub Actions | `esi-fort` | P1 | ✅ ready |
| 3 | ⚡ Phase 4.3 — Fix 154 FK ordering migrasi | `esi-backend-sr-2` | P2 | ✅ ready |
| 4 | 📋 Phase 4.4 — Dependencies cleanup | `esi-frontend-sr-1` | P3 | ✅ ready |
| 5 | 📋 Phase 4.5 — Cek runtime dashboard.tsx | `esi-frontend-mid-1` | P2 | ✅ ready |
| 6 | 📋 Phase 4.6 — Cek settings API kitchen/PoS | `esi-backend-mid-1` | P3 | ✅ ready |

## Viking Division — Status Tim

✅ Semua 20+ profil aktif di Hermes
✅ Kanban board `esi-erp` siap
✅ Orchestrator: `esi-king` (KING/CTO)
⚠️ Gateway belum running — dispatcher manual dulu

## Dev server

```bash
npm run dev          # http://localhost:3010
npm run build        # verifikasi build
npm run test         # test (login tests lulus)
```

## CATATAN PENTING
- `dashboard.tsx` masih punya referensi kitchen (perlu dicek runtime, build lolos)
- `prisma/schema.prisma` masih mengandung model kitchen, PoS, loyalty
- Beberapa `pages/api/settings/` mungkin masih referensi kitchen/PoS (perlu test manual)
- Migration chain masih butuh perbaikan FK ordering
