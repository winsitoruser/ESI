# Handoff — SIMESI (fka ESI ERP)

> Diperbarui: 7 Juli 2026 — **HRIS field integration: UID, lokasi, departemen, job grade, team_members link**

## Status project — Pasca Refactor

| Item | Status |
|---|---|
| Dev server (`:3010`) | ✅ Running, login working |
| Login superadmin | ✅ `superadmin@bedagang.com` / `MasterAdmin2026!` |
| HRIS master data (dept, lokasi, cabang, job grade) | ✅ `lib/hris/master-data.ts` + `GET /api/hq/hris/master-data` |
| HRIS Employees (UID, dept, posisi, lokasi, grade) | ✅ Form edit + API `employee-profile` |
| HRIS Team Members ↔ Employees | ✅ `employee_id` FK + auto-fill dari master |
| HRIS Onboarding/Contracts/Offboarding | ✅ `EmployeePicker` (bukan input UID manual) |
| DB `employees.work_location`, `job_grade_id` | ✅ `npm run db:hris-field-migrate` |
| DB `team_members.employee_id`, `location`, `work_area` | ✅ `npm run db:hris-field-migrate` |
| HRIS Employees Genealogy | ✅ Tab Genealogi (list) + Rantai Komando (detail), API `action=genealogy` |
| HRIS Mutasi & Penugasan | ✅ `/hq/hris/mutations` — approval multi-step + E-Letter PDF |
| DB `employee_mutations` | ✅ Migrasi `npm run db:mutation-workflow-migrate` |
| DB `employees.supervisor_id` | ✅ Migrasi `npm run db:employee-genealogy-migrate` (13 karyawan seeded) |
| Password DB | ✅ Re-hashed bcrypt, verified match |
| Build error `'fs' already declared` | ✅ Fixed (duplicate `require('fs')` di [...nextauth].ts) |
| `router is not defined` di employees.tsx | ✅ Fixed (added `const router = useRouter()`) |

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

## Backlog prioritas (Phase 4) — ✅ Semua selesai (kanban `esi-erp`)

| # | Tiket | Assignee | Status |
|---|---|---|---|
| 1 | 🔥 Phase 4.1 — Hapus model FnB/PoS/DMS dari Prisma | `esi-backend-sr-1` | ✅ done |
| 2 | 🔥 Phase 4.2 — CI/CD Pipeline GitHub Actions | `esi-fort` | ✅ done |
| 3 | ⚡ Phase 4.3 — Fix 154 FK ordering migrasi | `esi-backend-sr-2` | ✅ done |
| 4 | 📋 Phase 4.4 — Dependencies cleanup | `esi-frontend-sr-1` | ✅ done |
| 5 | 📋 Phase 4.5 — Cek runtime dashboard.tsx | `esi-frontend-mid-1` | ✅ done |
| 6 | 📋 Phase 4.6 — Cek settings API kitchen/PoS | `esi-backend-mid-1` | P3 | ✅ done (bersih) |

## Phase 5 — Backlog (kanban `esi-erp`)

| # | Tiket | Assignee | Priority | Status |
|---|---|---|---|---|
| 1 | ✅ Phase 5.1 — Partner Management (CRUD Vets, Petshop, PetClinic, PetHotel, PetTransport) | `esi-backend-1` | P1 | ✅ done (commit `2bd1e5e`) |
| 2 | 🔥 Phase 5.2 — Teleconsult Module (model + API + frontend pages) | `esi-backend-1` | P1 | ✅ done — commit `261e0f1` |
| 3 | 🔥 Phase 5.3 — CRM / Sales & Marketing (model + API + frontend pages) | `esi-backend-1` | P1 | ✅ done — commit `261e0f1` |
| 4 | 🔥 Phase 5.4 — Finance Module (Commission/Payout model + API + frontend) | `esi-backend-1` | P2 | ✅ done — commit `261e0f1` |
| 5 | 🔥 Phase 5.5 — HR & Team Management (TeamMember/Task model + API + frontend) | `esi-backend-1` | P2 | ✅ done — commit `261e0f1` |
| 6 | 🔄 Phase 5.x — Activities Log (API) | `esi-backend-1` | P3 | ✅ integrated in CRM detail page |

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
npm run db:hris-field-migrate   # kolom work_location, job_grade_id, team_members link
```

## CATATAN PENTING
- `dashboard.tsx` masih punya referensi kitchen (perlu dicek runtime, build lolos)
- `prisma/schema.prisma` masih mengandung model kitchen, PoS, loyalty
- Beberapa `pages/api/settings/` mungkin masih referensi kitchen/PoS (perlu test manual)
- Migration chain masih butuh perbaikan FK ordering
