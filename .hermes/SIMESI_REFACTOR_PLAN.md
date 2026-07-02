# SIMESI — Platform Konservasi Mandiri
## Strategic Refactoring & Development Plan
**Versi:** 1.0 | **Date:** 2 Juli 2026 | **Author:** ESI CTO / ESI KING

---

## 1. Visi

SIMESI adalah platform ERP untuk **PT Ekosistem Satwa Indonesia** — organisasi konservasi satwa liar.
**BUKAN** turunan/fork Bedagang. **BUKAN** NainERP.

> "SIMESI berdiri sendiri dengan identitas, arsitektur, dan domain bisnisnya sendiri."

---

## 2. Hasil Audit Codebase (2 Juli 2026)

| Metrik | Nilai |
|---|---|
| Total file proyek | ~2,500+ |
| Migration files | 142 |
| **NainERP references** | **200+** (translations ID/EN/JA/ZH) |
| **Bedagang references** | **100+** |
| **Kitchen/PoS pages** | **10+** aktif (dashboard-fnb, kitchen API) |
| **Stale deploy scripts** | 5+ dengan IP produksi hardcoded |
| **Export direktori** | 904 file stale (`export/backend/`, `_backup_dupes/`) |
| **Test files** | 19 (2+ broken assertions) |
| **Build status** | ✅ PASSES (tapi masih compile FnB code) |
| **Excluded module migrations** | ~13 (9%) — PoS, FnB, DMS, Loyalty, Reservasi |

**Kesimpulan:** Build lolos, tapi SIMESI masih membawa **200+ referensi Bedagang/NainERP**, **10+ halaman FnB/PoS aktif**, dan **konfigurasi deployment untuk server produksi lama**.

---

## 3. Arsitektur Target — SIMESI Standalone

```
┌──────────────────────────────────────────────────┐
│                  SIMESI Platform                   │
├──────────────────────────────────────────────────┤
│   Frontend (Next.js 15)                          │
│   ├── /hq/*         → Dashboard Konservasi      │
│   ├── /auth/*       → Login (NextAuth)          │
│   ├── /settings/*   → Konfigurasi               │
│   ├── /finance/*    → Finance/ Grant             │
│   ├── /projects/*   → Manajemen Proyek Lapangan  │
│   ├── /assets/*     → Aset Kandang & Peralatan   │
│   ├── /inventory/*  → Inventori Pakan/Obat       │
│   ├── /hr/*         → SDM Ranger                │
│   ├── /crm/*        → Mitra & Donor             │
│   └── /knowledge/*  → Basis Pengetahuan SOP      │
├──────────────────────────────────────────────────┤
│   API (Next.js API Routes / FastAPI)             │
│   ├── /api/hq/*     → HQ operations             │
│   ├── /api/auth/*   → NextAuth                  │
│   ├── /api/settings/*                            │
│   └── /api/*        → Modul-specific            │
├──────────────────────────────────────────────────┤
│   Database (PostgreSQL)                          │
│   ├── Sequelize ORM (existing)                   │
│   └── Prisma ORM (migration)                     │
├──────────────────────────────────────────────────┤
│   DevOps                                         │
│   ├── Docker + VPS (existing)                    │
│   ├── CI/CD via GitHub Actions                   │
│   └── Monitoring                                 │
└──────────────────────────────────────────────────┘
```

---

## 4. Refactoring Roadmap — 5 Phase

### 🟢 Phase 1: Identity & Branding Cleanup (Week 1)
| ID | Task | PIC | Priority |
|---|---|---|---|
| P1-01 | Ganti semua `NainERP` → `SIMESI` di `lib/translations/` (app.ts + hq.ts) | Frontend | 🔴 HIGH |
| P1-02 | Ganti semua `bedagang` references di kode (email, store name, logo) | Frontend | 🔴 HIGH |
| P1-03 | Update `config/sidebar.config.ts` → nonaktifkan menu PoS/FnB/BUMDes | Frontend | 🔴 HIGH |
| P1-04 | Hapus `pages/dashboard-fnb.tsx` | Frontend | HIGH |
| P1-05 | Update `package.json` name & description | Backend | HIGH |
| P1-06 | Update `config/esi-sidebar.config.ts` branding | Frontend | HIGH |
| P1-07 | Fix broken test assertions (NainERP → SIMESI) | QA | HIGH |

### 🟡 Phase 2: Code Pruning — Strip Stale Modules (Week 2)
| ID | Task | PIC | Priority |
|---|---|---|---|
| P2-01 | Hapus kitchen integration APIs (6 files: `pages/api/integration/*`) | Backend | 🔴 HIGH |
| P2-02 | Hapus `services/kitchen/KitchenOrderService.ts` | Backend | 🔴 HIGH |
| P2-03 | Hapus `lib/integration/FlowOrchestrator.ts` & `EventBus.ts` | Backend | HIGH |
| P2-04 | Hapus `lib/services/branchInitializationService.ts` (FnB defaults) | Backend | HIGH |
| P2-05 | Hapus `bedagang-docker-compose.yml` | DevOps | MEDIUM |
| P2-06 | Hapus stale deploy scripts (`quick-deploy.sh`, `setup-server.sh`, dll) | DevOps | MEDIUM |
| P2-07 | Hapus `export/backend/` (904 file) + `_backup_dupes/` | DevOps | LOW |
| P2-08 | Hapus archive files (`export/bedagangerp.rar`, `bedagang-backend-export.zip`) | DevOps | LOW |

### 🟠 Phase 3: Database & Migration Cleanup (Week 2-3)
| ID | Task | PIC | Priority |
|---|---|---|---|
| P3-01 | Drop migration files for excluded modules (PoS, FnB, DMS) | Architect | 🔴 HIGH |
| P3-02 | Fix FK ordering in remaining migrations | Architect | 🔴 HIGH |
| P3-03 | Remove duplicate migrations (2024 vs 2026 era) | Architect | HIGH |
| P3-04 | Clean Prisma schema — remove pos_transactions, kitchen_*, loyalty_* | Backend | HIGH |
| P3-05 | Create SIMESI base migration (clean starting point) | Architect | HIGH |
| P3-06 | Create fresh seeding scripts (conservation data only) | Backend | MEDIUM |
| P3-07 | Test full migration chain from zero | QA | HIGH |

### 🔵 Phase 4: Architecture Hardening (Week 3-4)
| ID | Task | PIC | Priority |
|---|---|---|---|
| P4-01 | Create SIMESI ADR (docs/adr/) documenting all architecture decisions | Architect | 🔴 HIGH |
| P4-02 | Define API contract for each conservation module (OpenAPI) | Architect | HIGH |
| P4-03 | Remove unused dependencies (react-router-dom, react-bootstrap, slick, workbox, swagger, netlify) | Backend | MEDIUM |
| P4-04 | Replace hardcoded IPs (`103.253.212.64`) with env vars in deploy scripts | DevOps | 🔴 HIGH |
| P4-05 | Remove hardcoded passwords from deploy scripts | DevOps | 🔴 HIGH |
| P4-06 | Set up proper CI/CD pipeline (GitHub Actions → VPS) | DevOps | HIGH |
| P4-07 | Add monitoring (health endpoint + uptime check) | DevOps | MEDIUM |

### 🟣 Phase 5: Feature Development — Conservation Modules (Week 4+)
| ID | Task | PIC | Priority |
|---|---|---|---|
| P5-01 | **Manajemen Proyek Lapangan** — API + UI (existing PJM) | Backend/Frontend | HIGH |
| P5-02 | **Manajemen Aset** — Kandang, Peralatan, Kendaraan | Backend/Frontend | HIGH |
| P5-03 | **Basis Pengetahuan** — SOP Satwa, Protokol Medis | Backend/Frontend | HIGH |
| P5-04 | **Inventori Konservasi** — Pakan, Obat, Suplemen | Backend/Frontend | HIGH |
| P5-05 | **Grant & Laporan Keuangan** — Template Donor | Backend/Frontend | HIGH |
| P5-06 | **SDM Ranger** — Jadwal, Sertifikasi, Pelatihan | Backend/Frontend | MEDIUM |
| P5-07 | **Mitra & Donor CRM** — Database kontak, Histori Grant | Backend/Frontend | MEDIUM |
| P5-08 | **Dashboard Direksi** — KPI Konservasi, Grant Pipeline | Frontend | MEDIUM |

---

## 5. Team Structure & Task Division

### Viking Division — SIMESI Squad

| Peran | Viking | Person | Fokus |
|---|---|---|---|
| **CTO / KING** | KING | Hermes Agent | Orchestrator, arsitektur tinggi, gatekeeper |
| **VP Engineering** | QUEEN | Hermes Agent | Code governance, routing task |
| **PM** | Skalds | Hermes Agent | Timeline, backlog, ritual Agile |
| **Backend Senior** (×2) | Engine Room | Hermes Agent | API, DB, integrasi |
| **Backend Mid** (×2) | Engine Room | Hermes Agent | Fitur core, optimasi |
| **Backend Junior** (×1) | Engine Room | Hermes Agent | Bug fix, test |
| **Frontend Senior** (×2) | Shield Wall | Hermes Agent | State management, UI arsitektur |
| **Frontend Mid** (×2) | Shield Wall | Hermes Agent | UI/UX, integrasi API |
| **Frontend Junior** (×1) | Shield Wall | Hermes Agent | Slicing UI |
| **QA Lead** (×1) | Valkyries | Hermes Agent | Strategi testing |
| **QA Engineer** (×1) | Valkyries | Hermes Agent | Uji fungsional modul |
| **QA Automation** (×1) | Valkyries | Hermes Agent | Regression automation |
| **DevOps** (×1) | Fort Builders | Hermes Agent | CI/CD, server, security |
| **Architect** (×1) | Royal Advisor | Hermes Agent | Schema DB, API contracts |
| **AI & Data** (×1) | Oracle | Hermes Agent | Insight, dashboard |

### Task Assignment Matrix

```
Phase 1 (Identity Cleanup)
├── P1-01 → Frontend Mid-1
├── P1-02 → Frontend Mid-1 + Mid-2
├── P1-03 → Frontend Senior-1
├── P1-04 → Frontend Junior-1
├── P1-05 → Backend Mid-1
├── P1-06 → Frontend Mid-2
└── P1-07 → QA Engineer

Phase 2 (Code Pruning)
├── P2-01 → Backend Mid-2
├── P2-02 → Backend Senior-1
├── P2-03 → Backend Senior-1
├── P2-04 → Backend Senior-2
├── P2-05 → DevOps
├── P2-06 → DevOps
├── P2-07 → DevOps
└── P2-08 → DevOps

Phase 3 (Database Cleanup)
├── P3-01 → Architect + Backend Senior-1
├── P3-02 → Architect
├── P3-03 → Architect
├── P3-04 → Backend Senior-2
├── P3-05 → Architect
├── P3-06 → Backend Mid-1 + Mid-2
└── P3-07 → QA Lead + QA Engineer

Phase 4 (Architecture Hardening)
├── P4-01 → Architect + CTO
├── P4-02 → Architect + Backend Senior teams
├── P4-03 → Backend Junior
├── P4-04 → DevOps + Backend Senior-1
├── P4-05 → DevOps
├── P4-06 → DevOps + QA Automation
└── P4-07 → DevOps

Phase 5 (Feature Development)
├── P5-01 → Frontend/BE squad
├── P5-02 → Frontend/BE squad
└── ...
```

---

## 6. Timeline & Milestones

```
Week 1    Week 2    Week 3    Week 4    Week 5+
│         │         │         │         │
Phase 1   Phase 2   Phase 3   Phase 4   Phase 5
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
│         │         │         │         │
├ Milestone 1        │         │         │
│ "SIMESI Identity"  │         │         │
│ ✅ All branding →  │         │         │
│    SIMESI          │         │         │
│ ✅ No FnB in menu  │         │         │
│ ✅ Tests pass      │         │         │
└────────────────────┤         │         │
          ├ Milestone 2         │         │
          │ "Clean Slate"      │         │
          │ ✅ No stale code   │         │
          │ ✅ No FnB APIs     │         │
          │ ✅ No FnB services │         │
          └────────────────────┤         │
                    ├ Milestone 3         │
                    │ "DB Integrity"     │
                    │ ✅ Clean migrations│
                    │ ✅ No FK ordering  │
                    │ ✅ Fresh seed data │
                    └────────────────────┤
                              ├ Milestone 4
                              │ "Hardened"
                              │ ✅ CI/CD live
                              │ ✅ ADR docs
                              │ ✅ Security fix
                              └────────────────

```

---

## 7. Risk Register

| Risiko | Probabilitas | Dampak | Mitigasi |
|---|---|---|---|
| Build break setelah hapus kode FnB | Medium | Tinggi | Test `npm run build` tiap commit |
| Migration broken setelah hapus file | Medium | Tinggi | Backup migrations/ sebelum delete |
| Kehilangan data konservasi existing | Rendah | Critical | Backup DB sebelum migrasi baru |
| Dependencies conflict setelah pruning | Rendah | Medium | `npm install` clean setelah hapus |
| Production server config mismatch | Rendah | Tinggi | Gunakan env vars, test di staging |
| Tim overcapacity (14 roles) | Medium | Rendah | Prioritaskan Phase 1-3, 5 paralel |

---

## 8. Perintah Eksekusi

**CTO / KING:**
```bash
# Mulai orchestration
hermes --profile esi-king

# Kickoff Phase 1
/esi-cto -> kanban task create --board esi-erp --title "P1-01: Ganti NainERP → SIMESI di translations"
/esi-cto -> kanban task create --board esi-erp --title "P1-02: Ganti bedagang references"
# ... assign ke tiap role
```

**PM (Skalds):**
```bash
hermes --profile esi-skalds
# Setup sprint untuk tiap phase
# Monitoring progress harian
```

**QA:**
```bash
# Regression test setelah tiap phase
npm run test
npm run build
```

---

## 9. Approval & Next Steps

1. ✅ **ESI CTO telah memverifikasi** audit codebase
2. ⏳ **Diskusi** dengan ESI KING untuk approval roadmap
3. ⏳ **PM** siapkan Sprint Backlog untuk Phase 1
4. ⏳ **Architect** mulai ADR untuk arsitektur baru

---

*Dokumen ini disusun oleh ESI CTO dengan input dari ESI Audit (Hermes Agent). Untuk digunakan oleh seluruh Viking Division SIMESI.*
