# Mega-API Refactor Plan: Architecture Decomposition

**Date:** 28 June 2026
**Branch:** `New-Backend-Nainerp`
**Repo:** `/Users/winnerharry/Bedagang ERP/bedagang---PoS`

## Target Files

| File | Lines | Current State | Audit Findings |
|------|-------|---------------|----------------|
| `pages/api/hq/bumdes.ts` | 640 | Monolithic, in-memory, **no auth** | 🔴 BLOCKER (no auth), MEDIUM (in-memory) |
| `pages/api/hq/dms.ts` | 517 | Monolithic, `require()` models, mixed concerns | ⚠️ (mixed patterns, missing index.js registration) |
| `pages/api/hq/billing-info.ts` | 597 | Monolithic-extracted (has `handle*` functions) | Not audited, but same pattern issues |

**Reference Pattern:** `pages/api/hq/finance/transactions.ts` (153 lines)
- Uses `withHQAuth` middleware with module guards
- Uses `getTenantContext` + `buildTenantFilter` for tenant isolation
- Uses `validateBody`/`sanitizeBody` for input validation
- Uses `successResponse`/`errorResponse` from `lib/api/response`
- Uses `logAudit` from `lib/audit/auditLogger`
- Uses `checkLimit` (rate limiter)
- Clean separation: handler → routed by HTTP method → dedicated functions
- Transaction-safe writes with rollback

---

## Phase 1: Standardize Auth Patterns (No-lift, Immediate)

**Goal:** Every endpoint behind `withHQAuth` before any other refactoring.

### 1.1 `bumdes.ts` — Add `withHQAuth`

**Current:** Direct `getServerSession(req, res, authOptions)` with manual 401.
**Target:** Wrap with `withHQAuth(handler, { module: 'bumdes' })`.

**Changes:**
```typescript
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { getTenantContext } from '@/lib/middleware/tenantIsolation';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const ctx = getTenantContext(req);
    // ...existing logic with ctx.tenantId...
  } catch (err) { ... }
}

export default withHQAuth(handler, { module: ['bumdes'] });
```

**Status:** `withHQAuth` already handles `getServerSession` internally and injects `(req as any).session`. The existing code that calls `getServerSession` becomes redundant — `getTenantContext` replaces it.

### 1.2 `dms.ts` — Wrap with `withHQAuth`

**Current:** Has `getServerSession` + manual `getTenantId`.
**Target:** Use `withHQAuth` + `getTenantContext`.

```typescript
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { getTenantContext } from '@/lib/middleware/tenantIsolation';

function handler(req, res) {
  const ctx = getTenantContext(req);
  // replace all `tenantId` references with `ctx.tenantId`
  // replace `(session.user as any)?.id` with `ctx.userId`
}

export default withHQAuth(handler, { module: ['dms'] });
```

### 1.3 `billing-info.ts` — Wrap with `withHQAuth`

**Current:** Manual `getServerSession` + manual `tenantId` extraction + demo mode fallback.
**Target:** Use `withHQAuth` (with `allowGuest: true` for demo mode) + `getTenantContext`.

```typescript
export default withHQAuth(handler, { module: ['billing'] });
// Keep the demo-mode empty payload fallback in the handler logic
```

### 1.4 Key File: `lib/middleware/withHQAuth.ts`

Already handles: session check, role guard, module guard, permission guard, permission context injection. No changes needed.

---

## Phase 2: Standardize Error Handling & Response Patterns

**Goal:** All three APIs use `successResponse`/`errorResponse` from `lib/api/response`.

### Changes Per File

| Current Pattern | Target Pattern |
|----------------|---------------|
| `res.json({ success: true, data: ... })` | `res.status(200).json(successResponse(data))` |
| `res.status(401).json({ success: false, message: '...' })` | `res.status(401).json(errorResponse('UNAUTHORIZED', '...'))` |
| `res.status(500).json({ success: false, message: err.message })` | `res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', err.message))` |
| `errorResponse()` helper in `dms.ts` | Remove local helper, use `@/lib/api/response` |

### Standardize HTTP Status Codes

| Condition | Status |
|-----------|--------|
| Success (data) | 200 |
| Created | 201 |
| No results / empty query | 200 (no error) |
| Validation failure | 400 |
| Auth missing | 401 |
| Auth insufficient | 403 |
| Not found | 404 |
| Method not allowed | 405 (with Allow header) |
| Server error | 500 |

### Centralize try/catch

**Current (bumdes.ts):**
```typescript
export default async function handler(req, res) {
  const session = ...;
  try { /* entire 600 lines */ } catch (err) { ... }
}
```

**Target:** Each sub-handler wraps its own try/catch, with the main handler providing a final error boundary:
```typescript
async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET': return await handleGet(req, res);
      case 'POST': return await handlePost(req, res);
      default: return res.status(405).json(...);
    }
  } catch (error) {
    console.error('[Module] Error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
}
```

---

## Phase 3: Split Mega-APIs into Modular Directory Structure

### 3.1 `pages/api/hq/bumdes/` — Directory Structure

The 640-line `bumdes.ts` handles **26 GET actions** and **18 POST actions**. Each domain gets its own file.

```
pages/api/hq/bumdes/
├── index.ts                  ← Main router: imports all, wraps withHQAuth
├── handlers/
│   ├── overview.ts           ← GET overview
│   ├── profil.ts             ← GET/POST profil
│   ├── governance.ts         ← GET governance, POST musdes/pengurus
│   ├── units.ts              ← GET units, POST unit, GET unit-detail
│   ├── capital.ts            ← GET capital, POST penyertaan
│   ├── accounting.ts         ← GET coa, jurnal, buku-besar, neraca-saldo
│   │                         ← POST akun, jurnal, jurnal-post
│   ├── financial-reports.ts  ← GET financial-reports
│   ├── microfinance.ts       ← GET microfinance, savings, angsuran
│   │                         ← POST anggota-usp, kredit, simpanan, angsuran-bayar
│   ├── profit-sharing.ts     ← GET/POST profit-sharing
│   ├── reports.ts            ← GET/POST reports
│   ├── budget.ts             ← GET/POST budget
│   ├── assets.ts             ← GET/POST assets, asset-mutasi
│   ├── tax.ts                ← GET/POST tax, tax-bayar
│   ├── audit.ts              ← GET/POST audit, audit-followup
│   ├── contracts.ts          ← GET/POST contracts
│   ├── classification.ts     ← GET/POST classification
│   ├── calendar.ts           ← GET/POST calendar-event
│   ├── settings.ts           ← GET/POST settings
│   └── integrations.ts       ← GET integrations (static data)
├── lib/
│   ├── data-store.ts         ← In-memory store (interim, replaced in Phase 4)
│   ├── response-helpers.ts   ← BUMDes-specific response builders (optional)
│   └── audit-log.ts          ← BUMDes-specific audit logging (optional)
└── __tests__/
    ├── bumdes-overview.test.ts
    ├── bumdes-accounting.test.ts
    └── bumdes-mutation.test.ts
```

**`index.ts` Pattern:**
```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { handleGetOverview } from './handlers/overview';
// ... all handler imports ...

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;
  try {
    switch (req.method) {
      case 'GET':
        switch (action) {
          case 'overview': return await handleGetOverview(req, res);
          // ...
          default: return res.status(200).json(successResponse({ message: 'Available actions: ...' }));
        }
      case 'POST':
        switch (action) {
          case 'profil': return await handlePostProfil(req, res);
          // ...
          default: return res.status(400).json(errorResponse(...));
        }
      default:
        return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', ...));
    }
  } catch (error) {
    console.error('[BUMDes API]', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
}

export default withHQAuth(handler, { module: ['bumdes'] });
```

**Handler File Pattern:**
```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { getTenantContext } from '@/lib/middleware/tenantIsolation';
import { successResponse, errorResponse } from '@/lib/api/response';
import { bumdesData, buildOverview } from './lib/data-store';

export async function handleGetOverview(req: NextApiRequest, res: NextApiResponse) {
  const ctx = getTenantContext(req);
  // Context: ctx.tenantId, ctx.userId, ctx.userName, ctx.userRole
  const data = buildOverview(); // Phase 4: replace with DB query
  return res.status(200).json(successResponse(data));
}
```

### 3.2 `pages/api/hq/dms/` — Directory Structure

The 517-line `dms.ts` handles **18 GET actions**, **14 POST actions**, **1 DELETE action**. DMS already uses Sequelize models — no migration to DB needed, primarily structural.

```
pages/api/hq/dms/
├── index.ts                  ← Main router: imports all, wraps withHQAuth
├── handlers/
│   ├── overview.ts           ← GET overview (buildOverview)
│   ├── files.ts              ← GET files, POST upload, DELETE destroy
│   ├── folders.ts            ← GET folders
│   ├── shares.ts             ← GET shares, mata-elang (list)
│   ├── mata-elang.ts         ← POST mata-elang, mata-elang/open, detonate
│   ├── audit.ts              ← GET audit (access logs)
│   ├── storage.ts            ← GET storage (tier analytics)
│   ├── analytics.ts          ← GET analytics (counts)
│   ├── policies.ts           ← GET/POST policies (retention)
│   ├── records.ts            ← GET records-classification, records-stats
│   │                         ← POST classify-record
│   ├── letters.ts            ← GET letters, POST letter
│   ├── dispositions.ts       ← GET dispositions, POST disposition
│   ├── signatures.ts         ← GET signatures, POST sign-request, sign-execute
│   ├── ppid.ts               ← GET ppid-requests, ppid-public-info
│   │                         ← POST ppid-respond
│   ├── knowledge-graph.ts    ← GET knowledge-graph, ediscovery-search
│   ├── hierarchy.ts          ← GET hierarchy
│   ├── disposal.ts           ← GET disposal-batches, POST disposal-batch
│   ├── open-data.ts          ← GET open-datasets, POST open-dataset
│   ├── scan.ts               ← GET scan-studio, POST scan-ingest
│   ├── blockchain.ts         ← GET blockchain-status, POST blockchain-mine
│   └── move-tier.ts          ← POST move-tier
├── lib/
│   ├── models.ts             ← Centralized model imports (resolves missing index.js issue)
│   └── helpers.ts            ← generateShareCode, safeFindAll, etc.
└── __tests__/
    ├── dms-files.test.ts
    ├── dms-shares.test.ts
    └── dms-blockchain.test.ts
```

**Key Fix:** The `models/index.js` missing registration problem. Create a centralized model loader:
```typescript
// pages/api/hq/dms/lib/models.ts
import sequelize from '@/lib/sequelize';

const DmsFile = require('@/models/DmsFile');
const DmsFolder = require('@/models/DmsFolder');
// ... all DMS models ...
const TransactionBlock = require('@/models/TransactionBlock');
// ... blockchain models ...

export {
  DmsFile, DmsFolder, DmsMataElangShare, DmsLetter, DmsSignature,
  DmsPpidRequest, DmsDisposalBatch, DmsDisposition, DmsAccessLog,
  DmsHierarchyNode, DmsKnowledgeEdge, DmsOpenDataset,
  DmsRecordsClassification, DmsRetentionPolicy,
  TransactionBlock, AuditReceipt, ChainVerificationLog,
};
```

**Reason:** Or better, fix `models/index.js` to include all DMS models with proper associations. But as an interim, the centralized loader prevents the direct `require()` antipattern and makes the dependency chain explicit.

### 3.3 `pages/api/hq/billing-info/` — Directory Structure

The 597-line `billing-info.ts` already has extracted `handle*` functions but they're all in one file. Move to dedicated handlers.

```
pages/api/hq/billing-info/
├── index.ts                  ← Main router: wraps withHQAuth
├── handlers/
│   ├── overview.ts           ← GET overview (handleOverview + sweepOverdueInvoices + buildBillingAlerts)
│   ├── subscription.ts       ← GET subscription
│   ├── usage.ts              ← GET usage (handleUsage)
│   ├── invoices.ts           ← GET invoices (handleInvoices)
│   └── modules.ts            ← GET modules (handleModules)
├── lib/
│   ├── helpers.ts            ← buildEmptyBillingPayload, getServiceUsageCounts
│   └── alerts.ts             ← sweepOverdueInvoices, buildBillingAlerts
└── __tests__/
    ├── billing-overview.test.ts
    └── billing-usage.test.ts
```

---

## Phase 4: Migrate BUMDes from In-Memory to DB Persistence

**Current State:** All data lives in `bumdesData` (from `@/lib/bumdes/data-store.ts`) and `bumdesExtData` (from `@/lib/bumdes/data-store-extended.ts`) — module-level variables that reset on every server restart.

**Target:** Sequelize models with proper `tenantId` isolation.

### 4.1 New Models Required

Create these BUMDes-specific Sequelize models:

| Model | Table | Key Fields |
|-------|-------|------------|
| `BumdesProfile` | `bumdes_profiles` | tenantId, nama, desa, kecamatan, kabupaten, provinsi, ... |
| `BumdesGovernance` | `bumdes_governance` | tenantId, type (musdes/pengurus), data (JSONB) |
| `BumdesUnit` | `bumdes_units` | tenantId, nama, jenis, managerId, omsetYtd, ... |
| `BumdesCapital` | `bumdes_capital` | tenantId, sumber, nominal, tanggal, keterangan |
| `BumdesCoA` | `bumdes_coa` | tenantId, kode, nama, klasifikasi, saldoNormal, parent, isHeader, saldoAwal |
| `BumdesJournal` | `bumdes_journals` | tenantId, nomor, tanggal, keterangan, posted, lines (JSONB) |
| `BumdesAnggotaUsp` | `bumdes_anggota_usp` | tenantId, nama, nik, alamat, status, ... |
| `BumdesKredit` | `bumdes_kredits` | tenantId, anggotaId, plafon, outstanding, status, ... |
| `BumdesProfitSharing` | `bumdes_profit_sharing` | tenantId, periode, labaBersih, alokasi (JSONB) |
| `BumdesReport` | `bumdes_reports` | tenantId, jenis, status, data (JSONB) |
| `BumdesBudget` | `bumdes_budgets` | tenantId, unitId, tahun, kategori, rencana, realisasi |
| `BumdesAsset` | `bumdes_assets` | tenantId, unitId, kategori, nama, hargaPerolehan, akumulasiPenyusutan, nilaiBuku |
| `BumdesAssetMutation` | `bumdes_asset_mutations` | tenantId, assetId, jenis, tanggal, nilai, keterangan |
| `BumdesTax` | `bumdes_taxes` | tenantId, jenis, masa, jumlahPajak, status, tglBayar |
| `BumdesAudit` | `bumdes_audits` | tenantId, nomor, tingkat, status, temuan, tindakLanjut |
| `BumdesContract` | `bumdes_contracts` | tenantId, nomor, jenis, unitId, nilaiKontrak, status |
| `BumdesClassification` | `bumdes_classifications` | tenantId, tanggal, klasifikasiSekarang, skor, keterangan |
| `BumdesSavingsTransaction` | `bumdes_savings_transactions` | tenantId, anggotaId, jenis, tipe, nominal, saldoSetelah, tanggal |
| `BumdesCalendarEvent` | `bumdes_calendar_events` | tenantId, tanggal, kegiatan, status, prioritas |
| `BumdesSettings` | `bumdes_settings` | tenantId, settings (JSONB) |

**Note:** ~20 models is large. Consider using **JSONB columns** for sub-entities where query patterns don't need relational lookups (e.g., governance as `type + data JSONB`).

### 4.2 Migration Strategy

**Step 1 — Adapter Pattern (Interim):**
Replace `data-store.ts` with an adapter that has the same public API:
```typescript
// lib/bumdes/data-store.ts → rewrite to:
import { BumdesProfile, BumdesCoA, /* ... */ } from '@/models';
import { getTenantContext } from '@/lib/middleware/tenantIsolation';

export async function buildOverview(tenantId: string) {
  const profile = await BumdesProfile.findOne({ where: { tenantId } });
  const units = await BumdesUnit.findAll({ where: { tenantId } });
  const totalCapital = await BumdesCapital.sum('nominal', { where: { tenantId } });
  // ...
  return { profile, units, totalCapital, /* ... */ };
}
```

**Step 2 — Replace Inline Data in Handlers:**
Every `bumdesData.X` and `bumdesExtData.Y` call gets replaced with:
```typescript
const data = await BumdesModel.findAll({ where: { tenantId } });
```

**Step 3 — Remove `data-store.ts` and `data-store-extended.ts`:**
Once all handlers are migrated, delete the in-memory stores.

### 4.3 Priority Order for Model Migration

| Priority | Domain | Reason |
|----------|--------|--------|
| P0 | Profil, Units, Capital, CoA | Core entity data |
| P1 | Journal, Anggota, Kredit, ProfitSharing | Transactional data |
| P2 | Budget, Assets, Tax, Audit, Contracts | Supporting data |
| P3 | Savings, Calendar, Classification, Settings | Config/data listing |
| P4 | Financial Reports (Neraca, L/R, etc.) | Computed from Journal |

---

## Phase 5: Add Input Validation & Rate Limiting

### 5.1 Validation with `validateBody` / `sanitizeBody`

**Current (`bumdes.ts` POST actions):**
```typescript
case 'jurnal': {
  const totalDebit = (req.body?.lines || []).reduce(/* ... */);
  if (Math.round(totalDebit) !== Math.round(totalKredit)) {
    return res.status(400).json({ ... });
  }
  // ...
}
```

**Target:**
```typescript
import { validateBody, V, sanitizeBody } from '@/lib/middleware/withValidation';

case 'jurnal': {
  sanitizeBody(req);
  const errors = validateBody(req, {
    lines: V.required().array(),
    keterangan: V.required().string().maxLength(500),
  });
  if (errors) return res.status(400).json(errors);
  // ... proceed
}
```

### 5.2 Rate Limiting

**Current:** No rate limiting on any of the three targets.

**Target:** Use `checkLimit(req, res, RateLimitTier)` on write operations (POST, PUT, DELETE).

```typescript
import { checkLimit, RateLimitTier } from '@/lib/middleware/rateLimit';

async function handlePostJournal(req, res) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  // ... actual logic
}
```

---

## Phase 6: Standardize Audit Logging

### SQL-based Audit (for DMS & Billing which use DB)

**Current (dms.ts):** Ad-hoc `DmsAccessLog.create(...)` calls scattered throughout.
**Target:** Use `logAudit` from `@/lib/audit/auditLogger` (same pattern as finance transactions).

```typescript
import { logAudit } from '@/lib/audit/auditLogger';

await logAudit({
  tenantId: ctx.tenantId,
  userId: ctx.userId,
  userName: ctx.userName,
  action: 'bumdes.jurnal.create',
  entityType: 'bumdes_journal',
  entityId: journalId,
  newValues: { nomor, tanggal, total: req.body.lines.length },
  req,
});
```

### In-Memory Audit (for BUMDes before DB migration)

Use a simple in-memory audit log array that gets flushed when DB is available:
```typescript
const auditBuffer: AuditEntry[] = [];
export function logAuditEntry(entry: AuditEntry) {
  auditBuffer.push({ ...entry, timestamp: new Date().toISOString() });
}
// Phase 4: Replace with DB-backed logAudit
```

---

## Migration Phasing Summary

| Phase | Scope | Timeline | Risk | Dependencies |
|-------|-------|----------|------|--------------|
| **P1** | Auth wrapper + `getTenantContext` migration | Day 1 | Low | None |
| **P2** | Error standardization + `successResponse`/`errorResponse` | Day 1-2 | Low | P1 |
| **P3** | Directory split → modular handler files | Day 2-5 | Medium | P1, P2 |
| **P4** | BUMDes DB model creation + data adapter | Day 3-10 | High | P3 (BUMDes handlers) |
| **P5** | Validation + rate limiting | Day 5-7 | Low | P3 |
| **P6** | Audit logging standardization | Day 5-8 | Low | P3 |

### Rollback Strategy

1. **Phase 1 (Auth):** Keep the original file. Deploy updated file. If auth breaks, revert.
   - Use the existing file as a fallback route (`pages/api/hq/bumdes-legacy.ts`).
2. **Phase 3 (Split):** Keep the original monolithic file alongside the new directory.
   - Add a `_redirect` or comment at the top of the old file pointing to new structure.
   - Remove old file only after all consumers have been updated.
3. **Phase 4 (DB):** Keep in-memory data as a "seed" that populates the DB on first run.
   - Implement a `BumdesSeedService` that on first-ever request for a tenant, copies in-memory data to DB.

### Testing Strategy

| Phase | Tests |
|-------|-------|
| P1 | Auth bypass attempts (no session → 401, wrong module → 403) |
| P2 | Response format contract tests |
| P3 | Import path correctness, handler isolation tests |
| P4 | CRUD operations on all new models, data integrity tests |
| P5 | Validation error scenarios, rate limit trigger tests |
| P6 | Audit log entries created on mutating operations |

### Key Metrics for Success

- `bumdes.ts`: 640 → ~0 lines (deleted, superseded by `pages/api/hq/bumdes/`)
- `dms.ts`: 517 → ~0 lines (deleted, superseded by `pages/api/hq/dms/`)
- `billing-info.ts`: 597 → ~0 lines (deleted, superseded by `pages/api/hq/billing-info/`)
- Each handler file: ≤ 100 lines
- 100% of endpoints wrapped with `withHQAuth`
- 100% of endpoints using `successResponse`/`errorResponse`
- BUMDes: 0 references to in-memory data stores after Phase 4
- Test coverage: ≥ 80% on all new handler files

---

## Appendix: Current File Analysis

### A.1 `bumdes.ts` — Action Inventory (640 lines)

**GET Actions (26):** overview, profil, governance, units, unit-detail, capital, coa, jurnal, buku-besar, neraca-saldo, financial-reports, microfinance, profit-sharing, reports, integrations, budget, assets, tax, audit, contracts, classification, savings, angsuran, calendar, settings

**POST Actions (18):** profil, musdes, pengurus, unit, penyertaan, akun, jurnal, jurnal-post, anggota-usp, kredit, pembagian-hasil, laporan, sync-modul, budget, asset, asset-mutasi, tax, tax-bayar, audit-finding, audit-followup, contract, classification-assessment, simpanan, angsuran-bayar, calendar-event, settings

**Concerns:** NO auth, all in-memory, huge switch statements, mixed response formats (`{ success: true, data: ... }` vs inconsistent).

### A.2 `dms.ts` — Action Inventory (517 lines)

**GET Actions (18):** overview, files, folders, shares, mata-elang, audit, storage, analytics, policies, records-classification, records-stats, letters, dispositions, signatures, ppid-requests, ppid-public-info, knowledge-graph, ediscovery-search, hierarchy, disposal-batches, open-datasets, scan-studio, blockchain-status

**POST Actions (14):** upload, mata-elang, mata-elang/open, detonate, move-tier, policy, letter, disposition, sign-request, sign-execute, ppid-respond, disposal-batch, open-dataset, scan-ingest, classify-record, blockchain-mine

**DELETE Actions (1):** destroy

**Concerns:** Uses `require()` for models, has local `errorResponse` helper (duplicate), no `withHQAuth`, models not registered in `models/index.js`.

### A.3 `billing-info.ts` — Action Inventory (597 lines)

**GET Actions (5):** overview, subscription, usage, invoices, modules

**Structure:** Already extracted `handle*` functions at bottom of file. Uses `getDb()` dynamic require. Has `buildEmptyBillingPayload`, `sweepOverdueInvoices`, `buildBillingAlerts`, `getServiceUsageCounts` helpers all in the same file.

**Concerns:** Single file despite extracted functions, no `withHQAuth`, raw SQL queries for usage counts, inconsistent error handling (`{ success: false, error: ... }` not using `errorResponse`).

### A.4 Reference: `finance/transactions.ts` — The Gold Standard (153 lines)

```
pages/api/hq/finance/
├── accounts.ts
├── ai-autonomous.ts
├── ai-guardian.ts
├── budget.ts
├── cash-flow.ts
├── enhanced.ts
├── expenses.ts
├── export.ts
├── invoices.ts
├── journal.ts
├── profit-loss.ts
├── realtime.ts
├── revenue.ts
├── summary.ts
├── tax.ts
└── transactions.ts       ← Gold standard (153 lines)
```

**`transactions.ts` pattern:**
```
withHQAuth(handler, { module: [...] })
  → handler()
    → switch(req.method)
      → getTransactions()    ← tenant-scoped, paginated, searchable
      → createTransaction()  ← validated, rate-limited, transaction-safe, audit-logged
      → updateTransaction()  ← validated, audit-logged (old vs new diff)
      → deleteTransaction()  ← soft-delete, audit-logged
```

**Key characteristics:**
1. `withHQAuth` wrapper with module guard
2. `getTenantContext` + `buildTenantFilter` for tenant isolation
3. `validateBody(V.required().oneOf(...))` for input validation
4. `checkLimit(req, res, RateLimitTier.SENSITIVE)` for rate limiting
5. `successResponse` / `errorResponse` for uniform output
6. `logAudit` on all mutations
7. `sequelize.transaction()` with try/catch/rollback for writes
8. Clean function-per-operation separation
9. 153 lines only — focused, testable, maintainable
