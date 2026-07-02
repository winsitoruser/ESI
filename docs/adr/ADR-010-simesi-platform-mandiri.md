# ADR-010: SIMESI — Platform Mandiri (Refactor from Bedagang/NainERP)

## Status
Accepted (2026-07-02)

## Context
SIMESI (sebelumnya ESI ERP) adalah platform ERP untuk PT Ekosistem Satwa Indonesia — organisasi konservasi satwa liar. Codebase ini berasal dari fork NainERP/Bedagang (platform retail/FnB POS). Seiring waktu, SIMESI harus berdiri sendiri dengan:

1. **Identitas sendiri** — bukan "slim fork Bedagang"
2. **Domain bisnis sendiri** — konservasi satwa, bukan retail/FnB
3. **Arsitektur sendiri** — tidak bergantung pada struktur Bedagang

## Decision
Lakukan refactoring besar pada 2 Juli 2026 dengan cakupan:

### Phase 1 — Identity Cleanup ✅
- Semua `NainERP` → `SIMESI` (111 replacements di 4 file translations)
- Semua `Naincode` → `SIMESI`
- Semua `bedagang` references di kode → `simesi.esa`
- `package.json` name: `esi-erp` → `simesi`
- Menu PoS/FnB/BUMDes nonaktif di sidebar
- Deleted: `pages/dashboard-fnb.tsx`

### Phase 2 — Code Pruning ✅
- Deleted kitchen integration APIs (6 files)
- Deleted `services/kitchen/KitchenOrderService.ts`
- Deleted `lib/integration/FlowOrchestrator.ts`, `EventBus.ts`
- Deleted `lib/services/branchInitializationService.ts`
- Deleted `pages/api/kitchen/` (entire directory + routes)
- Deleted stale deploy scripts (quick-deploy.sh, setup-server.sh, etc.)
- Deleted `export/backend/` (904 files), `_backup_dupes/`, archive zips
- Replaced hardcoded IP `103.253.212.64` → `$SERVER_IP`

### Phase 3 — Migration Cleanup ✅
- Archived 13 migration files for excluded modules (PoS, FnB, Promo, Loyalty, DMS)
- FK ordering analysis documented at `migrations/FK_ORDERING_ANALYSIS.md`
- Build verified: ✅ passes

## Consequences
**Positive:**
- Codebase turun ~1.000+ file (deleted stale code + export/ dir)
- Build lebih cepat
- Branding konsisten SIMESI
- Security improved (hardcoded IP/passwords removed)

**Needed:**
- Migration chain masih perlu diperbaiki untuk FK ordering (129 migrations tersisa)
- `prisma/schema.prisma` masih perlu dibersihkan dari model FnB/PoS
- `pages/dashboard.tsx` masih punya referensi kitchen yang perlu dicek
- CI/CD pipeline perlu disetup
- Server deployment config perlu diperbarui
