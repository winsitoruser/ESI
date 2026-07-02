# ESI ERP — Hermes Agent Instructions

Anda adalah **AI developer** untuk **ESI ERP** — platform operasional **PT Ekosistem Satwa Indonesia** (konservasi satwa liar).

Gunakan skill:
- `/esi-develop` — workflow pengembangan umum
- `/esi-hq` — modul HQ & konservasi
- `/esi-cto` — orkestrasi tim (CTO)

## Konteks bisnis

Organisasi konservasi satwa — **bukan** ritel/F&B. Fokus: proyek lapangan, aset kandang, inventori pakan/obat, grant & keuangan, SDM ranger, mitra/donor.

## Modul yang **TIDAK ADA** (jangan buat link/API baru)

PoS, FnB (dapur/meja/reservasi), Cabang multi-branch, Manufaktur, Keuangan Ringkas, DMS/Brankas Digital, Livestreaming, BUMDes.

## Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS |
| Backend API | Next.js API routes (`pages/api/`) |
| ORM | Sequelize + Prisma (coexist) |
| Database | PostgreSQL |
| Auth | NextAuth (credentials) |

## Struktur penting

```
config/esi-sidebar.config.ts   # Menu sidebar ESI
pages/hq/                      # Dashboard HQ
pages/api/hq/                  # API HQ
pages/api/hq/branches/         # Stub organisasi tunggal (bukan multi-cabang)
components/hq/                 # Komponen HQ (HQLayout)
models/                        # Sequelize models
lib/hq/mock-data.ts            # Mock data ESI
.hermes/                       # Keputusan & handoff Hermes
hermes/skills/                 # Skills Hermes khusus ESI
```

## Perintah dev

```bash
npm run dev          # http://localhost:3010
npm run build        # verifikasi build
npm run db:migrate   # migrasi DB
```

## Kredensial dev

| Email | Password | Role |
|---|---|---|
| superadmin@bedagang.com | superadmin123 | super_admin |

Login: `http://localhost:3010/auth/login`  
Root `/` → redirect login (tanpa landing marketing). Register dinonaktifkan.

## Konvensi coding

1. **Minimize scope** — diff kecil, fokus task.
2. **Ikuti pola existing** — baca file sekitar dulu.
3. **HQ pages** — `HQLayout` + `useTranslation()` dari `@/lib/i18n`.
4. **Sidebar** — pakai `config/esi-sidebar.config.ts`, bukan menu Bedagang penuh.
5. **Organisasi tunggal** — filter "cabang" pakai stub `/api/hq/branches` (satu HQ).
6. **Jangan commit** secrets; jangan commit kecuali user minta.

## Model AI (SumoPod via Hermes)

Provider: `custom:sumopod` → `https://ai.sumopod.com/v1`

| Model | Use case |
|---|---|
| `deepseek-v4-flash` | Coding cepat (default) |
| `claude-sonnet-4-6` | Refactor & arsitektur |
| `seed-2-0-code` | Fitur multi-file |

Ganti: `/model sumopod:<model-id>` di Hermes CLI.

## Workflow agent

1. Baca `.hermes/DECISIONS.md`
2. Cek `.hermes/HANDOFF.md` untuk konteks terakhir
3. Implementasi → `npm run build` → update HANDOFF jika selesai

## Hermes Team

| Profile | Peran |
|---|---|
| `esi-cto` | CTO orchestrator + kanban |
| `esi-pm` | Backlog & prioritas |
| `esi-architect-1` | Schema & API design |
| `esi-backend-1`, `esi-backend-2` | API & DB |
| `esi-frontend-1`, `esi-frontend-2` | UI HQ |
| `esi-qa-1` | Test & smoke |

Setup: `npm run hermes:setup` lalu `npm run hermes:team`  
Board: `esi-erp`  
Mulai: `hermes --profile esi-cto` → `/esi-cto`
