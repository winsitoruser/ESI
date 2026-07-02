# CTO Technical Audit

**Repo:** `/Users/winnerharry/Bedagang ERP/bedagang---PoS`
**Branch:** `New-Backend-Nainerp`
**Date:** 28 June 2026
**Auditor:** Hermes Agent (CTO Technical Auditor)

---

## Auth & Security

### 1.1 NextAuth Configuration (`pages/api/auth/[...nextauth].ts`) — ⚠️ Temuan

| # | Temuan | Severity | Detail |
|---|--------|----------|--------|
| 1 | **`any` type abuse parah** | HIGH | Semua callback (`jwt`, `session`, `redirect`) menggunakan `any` untuk parameter. Tidak ada tipe `JWT` / `Session` yang ketat. `export const authOptions: NextAuthOptions` sudah typed, namun callback overridenya tidak. |
| 2 | **`any` pada `require('../../../models')`** | MEDIUM | `const getDb = () => require('../../../models')` — Dynamic require tanpa type safety. Modul tidak punya Type Definition. |
| 3 | **Role validation hanya string-based** | MEDIUM | Role dicek via string comparison di `middleware.ts` (`['admin', 'super_admin', 'superadmin']`). Tidak ada refer ke Role model atau permission system. |
| 4 | **Sliding session bagus** | OK | Mekanisme `REFRESH_THRESHOLD` (15 menit) dan `ACCESS_TOKEN_EXPIRY` (1 jam) berfungsi dengan baik untuk auto-refresh JWT. |
| 5 | **Password hashing** | OK | `bcrypt.compare()` digunakan untuk verifikasi password. |
| 6 | **Tidak ada rate limiting pada login** | LOW | CredentialsProvider tidak dilindungi rate limiter — brute force attack mungkin dilakukan. |

### 1.2 Middleware (`middleware.ts`) — ✅ Relatively solid

| # | Temuan | Severity | Detail |
|---|--------|----------|--------|
| 1 | **API routes skip middleware auth** | MEDIUM | `pathname.startsWith('/api/')` dilewatkan tanpa auth check — sepenuhnya diserahkan ke masing-masing endpoint. Jika satu endpoint lupa auth check (lihat temuan BUMDes), maka terbuka. |
| 2 | **Onboarding check via JWT token** | OK | `token.setupCompleted` dicek. Tidak ada fetch internal yang bisa circular. |
| 3 | **Role-based routing untuk Driver/Admin** | OK | Driver dicegah akses `/hq/`. Admin bypass driver check. |

### 1.3 Security Middleware (`lib/security/middleware.ts`) — ✅ Comprehensive

| # | Temuan | Severity | Detail |
|---|--------|----------|--------|
| 1 | **Rate limit in-memory** | MEDIUM | `Map` in-memory — tidak akan scale di multi-instance (perlu Redis). |
| 2 | **Role hierarchy well-defined** | OK | `ROLE_HIERARCHY` dengan level numerik — `hasMinRole()` berfungsi baik. |
| 3 | **Security headers** | OK | `X-Content-Type-Options`, `X-Frame-Options`, CORS, dll. |
| 4 | **Audit log hanya console** | LOW | Comment `// await db.AuditLog.create(...)` — audit log tidak disimpan ke DB. |

### 1.4 Tenant Isolation (`lib/middleware/tenantIsolation.ts`) — ✅ Good pattern

| # | Temuan | Severity | Detail |
|---|--------|----------|--------|
| 1 | **`buildTenantFilter()` return empty jika tenantId null** | HIGH | `if (!tenantId) { return { condition: '', replacements: {} } }` — jika user super_admin tanpa tenant, filter kosong, bisa mengakses SEMUA data. |
| 2 | **`requireTenantAccess()` sudah handle super_admin bypass** | OK | Super admin diizinkan tanpa tenantId. |
| 3 | **`tenantQuery()` — auto-inject tenant filter** | OK | Pattern clean untuk raw SQL. |

### 1.5 withHQAuth (`lib/middleware/withHQAuth.ts`) — ✅ Good

| # | Temuan | Severity | Detail |
|---|--------|----------|--------|
| 1 | **Granular permission support** | OK | `permission`, `anyPermission`, `allPermissions`, `roles`, `module` — flexibel. |
| 2 | **`isSuperBypass` includes 'superhero'** | INFO | `'superhero'` role hardcoded sebagai bypass — obscure role name. |
| 3 | **Error handling catch-all** | OK | 500 error untuk auth service failure. |

---

## API Endpoints

### 2.1 `pages/api/hq/dms.ts` (514 lines) — ⚠️ Mixed

| # | Temuan | Severity | Detail |
|---|--------|----------|--------|
| 1 | **Auth: session check langsung (bukan withHQAuth)** | MEDIUM | `getServerSession` manual. Tidak pakai `withHQAuth` jadi tidak ada module/permission check. |
| 2 | **Tenant filter: `tenantId ? { tenantId } : {}`** | HIGH | Jika user tanpa tenantId, `where` adalah `{}` — mengembalikan **semua data semua tenant**. |
| 3 | **`safeFindAll` tanpa try-catch + silent swallow** | MEDIUM | `catch { return [] }` — error DB tidak dikomunikasikan, API return array kosong seolah sukses. |
| 4 | **`buildOverview` catch return null** | MEDIUM | Error di-`catch` tanpa response — API return `{ stats: null, ... }`. |
| 5 | **`any` type di session** | MEDIUM | `(session.user as any)` dipakai bertubi-tubi. |
| 6 | **Blockchain mining: `valid = !prevHash || blockHash.startsWith('00') || true`** | 🔴 BLOCKER | `|| true` membuat chain **selalu valid**. Ini penghapusan sengaja validasi blockchain — seluruh rantai tidak terverifikasi. |
| 7 | **Random batch numbers** | LOW | `AgendaNumber` dan `batchNumber` pakai `Math.random()` — collision risk. |

### 2.2 `pages/api/hq/bumdes.ts` (633 lines) — 🔴 CRITICAL

| # | Temuan | Severity | Detail |
|---|--------|----------|--------|
| 1 | **TIDAK ADA AUTHENTICATION SAMA SEKALI** | 🔴 BLOCKER | Tidak ada `getServerSession`, tidak ada `withHQAuth`, tidak ada session check. **Siapa pun bisa mengakses seluruh data BUMDes tanpa login.** |
| 2 | **In-memory data store** | MEDIUM | Semua data disimpan di `bumdesData` dan `bumdesExtData` (in-memory module-level variable). Data **hilang setiap server restart**. Tidak ada persistensi ke DB. |
| 3 | **SQL injection mungkin via req.body spread** | MEDIUM | `{ id, ...req.body }` di semua POST handler — body user langsung spread. Tidak ada sanitasi/validasi body. |
| 4 | **Tidak ada tenant isolation** | MEDIUM | Data global per instance, tidak di-scope ke tenant manapun. |
| 5 | **Struktur kode rapi** | OK | Modular dengan `data-store.ts` dan `data-store-extended.ts`. Banyak action handler. |

### 2.3 `pages/api/hq/sfa/index.ts` (766 lines) — ✅ Solid but heavy

| # | Temuan | Severity | Detail |
|---|--------|----------|--------|
| 1 | **Auth + Role check** | OK | `getServerSession` + role-based DELETE restriction (`!isManager`). |
| 2 | **Raw SQL tanpa ORM — rawan** | MEDIUM | Semua query pakai `sequelize.query()` dengan raw SQL. Parameter binding digunakan (`:tid`), jadi SQL injection minimal. Tapi ada `TENANT_ID` hardcoded di mana-mana. |
| 3 | **Fire-and-forget audit** | OK | `logAudit().catch(() => {})` — tidak blocking. |
| 4 | **`withModuleGuard` imported tapi tidak dipakai** | INFO | `withModuleGuard` dari import tidak digunakan di handler utama. |
| 5 | **Complete CRUD** | OK | Leads, Opportunities, Activities, Visits, Quotations, Targets, Territories, Route Plans — comprehensive. |

### 2.4 `pages/api/hq/finance/transactions.ts` (153 lines) — ✅ Best-in-class

| # | Temuan | Severity | Detail |
|---|--------|----------|--------|
| 1 | **Proper auth** | OK | `withHQAuth(handler, { module: ['finance_pro', 'finance_lite'] })` — auth + module check. |
| 2 | **Tenant isolation** | OK | `getTenantContext` + `buildTenantFilter` — query-level tenant scope. |
| 3 | **Input validation** | OK | `validateBody` + `sanitizeBody` + `checkLimit` (rate limiting). |
| 4 | **Transaction-safe** | OK | `sequelize.transaction()` + `FOR UPDATE` untuk race condition pada nomor transaksi. |
| 5 | **Audit log lengkap** | OK | `oldValues` + `newValues` di `logAudit`. |
| 6 | **Soft delete** | OK | `status = 'cancelled'` — tidak hard delete. |
| 7 | **Query injection safe** | OK | Parameter binding di semua filter (search, type, status, date range). |

### 2.5 Integrations (`pages/api/hq/integrations/providers.ts`) — ⚠️ Mock data

| # | Temuan | Severity | Detail |
|---|--------|----------|--------|
| 1 | **Auth via withHQAuth** | OK | `withHQAuth(handler, { module: 'integrations' })`. |
| 2 | **Mock data** | MEDIUM | `mockProviders` — tidak ada koneksi real ke provider eksternal. Data hardcoded. |
| 3 | **Filter + search well-implemented** | OK | Category, search, requiresApproval filter semua bekerja. |

### 2.6 Sync (`pages/api/hq/sync/trigger.ts`) — ⚠️ Mixed

| # | Temuan | Severity | Detail |
|---|--------|----------|--------|
| 1 | **Auth via withHQAuth** | OK | `withHQAuth(handler)`. |
| 2 | **Manual middleware chain** | MEDIUM | `tenantContext` dan `requireTenant` dipanggil manual via `new Promise` — redundant karena `withHQAuth` sudah inject session. Ini bisa conflict. |
| 3 | **BranchSyncService pattern** | OK | Modular: `syncFromBranch`, `syncToHQ`, `syncAllBranches`. |
| 4 | **Error handling per branch** | OK | Loop with try-catch per branch — partial success. |

---

## Database Models

### 3.1 `models/DmsFile.js` — ✅ Well-structured

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | ✅ Primary key, auto-generate |
| tenantId | UUID | ✅ Tenant-aware |
| checksumSha256 | STRING(64) | ✅ Fitur verifikasi integritas |
| encryptionEnvelope | JSONB | ✅ Enkripsi field-level |
| versionLabel + isCurrentVersion + previousVersionId | — | ✅ Versioning support |
| retentionUntil + legalHold | — | ✅ Compliance-ready |
| **Tidak ada `tenant_id` index di define?** | — | ⚠️ Ada di `indexes: [{ fields: ['tenant_id'] }]` ✅ |

### 3.2 `models/DmsFolder.js` — ✅ Adequate

| Field | Type | Notes |
|-------|------|-------|
| permissions | JSONB | `{ read: [], write: [], admin: [] }` — ACL support |
| filesCount + totalSizeBytes | — | ✅ Denormalized counters |
| **Tidak ada `updatedBy`** | — | INFO — hanya `createdBy` |

### 3.3 `models/DmsMataElangShare.js` — ✅ Feature-rich

| Field | Type | Notes |
|-------|------|-------|
| shareCode | STRING(40) UNIQUE | ✅ Unique code |
| destructMode | STRING(20) | cipher_burn / glitch / vapor / honeypot |
| wrappedDek | TEXT | ✅ Cryptographic key destruction |
| geofence + ipAllowlist + requireMfa | — | ✅ Advanced security features |
| bindDeviceFingerprint | — | ✅ Device binding |

### 3.4 `models/FinanceTransaction.js` — ✅ Good

| # | Temuan | Severity | Detail |
|---|--------|----------|--------|
| 1 | **Relasi ke FinanceAccount** | OK | `belongsTo(models.FinanceAccount)` dan `belongsTo(models.Branch)`. |
| 2 | **Field lengkap** | OK | `transactionNumber` (unique), `transactionDate`, `transactionType` (enum income/expense/transfer), `amount`, `paymentMethod`, `attachments`, `isRecurring`. |
| 3 | **Missing: tenantId** | 🔴 BLOCKER | Model `FinanceTransaction` **tidak memiliki field `tenantId`** atau `tenant_id` apapun. Padahal endpoint transaction.ts menggunakan `buildTenantFilter` di query level. Tanpa kolom tenant di table, filter tenant di query akan **silent fail** (SQL jadi `WHERE 1=1 AND tenant_id = :_tenantId` pada table tanpa kolom tenant_id). Ini serius. |

### 3.5 `models/index.js` — ⚠️ Inconsistency

| # | Temuan | Severity | Detail |
|---|--------|----------|--------|
| 1 | **Dua pola inisialisasi** | MEDIUM | Sebagian model dipanggil dgn `(sequelize, DataTypes)` (factory), sebagian tanpa. |
| 2 | **Associations loaded via `associate()`** | OK | Loop `Object.keys(db)` + try-catch. |
| 3 | **Missing DMS models in index.js** | 🔴 BLOCKER | Models `DmsFile`, `DmsFolder`, `DmsMataElangShare`, `DmsLetter`, `DmsSignature`, dll. **TIDAK ADA di `models/index.js`**. Mereka di-import langsung via `require('@/models/DmsFile')` di dms.ts. Ini berarti associations antar DMS model tidak pernah di-load. |
| 4 | **Missing: FinanceTransaction** | 🔴 BLOCKER | `FinanceTransaction` tidak ada di models/index.js!!! Padahal ada `db.FinanceTransaction = require('./FinanceTransaction');` — WAIT, line 287 sudah ada. ✅ OK |

### 3.6 `models/User.js` — ✅ Standard

| Field | Type | Notes |
|-------|------|-------|
| role | ENUM(super_admin, owner, admin, ...) | ✅ Comprehensive list |
| roleId | UUID (FK ke roles) | ✅ Can reference custom Role model |
| dataScope | STRING(20) | `own_branch` / `all_branches` |
| isActive | BOOLEAN | ✅ Active check |
| tenantId | UUID (FK) | ✅ Tenant-scoped |

---

## Integrations

### 4.1 Integration Endpoints (`pages/api/hq/integrations/`)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `providers.ts` | ✅ Works | Auth + filtering via mock data |
| `providers/[code].ts` | ✅ Works | Single provider lookup |
| `configs.ts` | ⚠️ Not audited | CRUD integration configs |
| `configs/[id].ts` | ⚠️ Not audited | Per-config operations |
| `configs/[id]/test.ts` | ⚠️ Not audited | Connection test |
| `requests.ts` | ⚠️ Not audited | Integration requests |
| `requests/[id].ts` | ⚠️ Not audited | Request detail |
| `fms-tms.ts` | ⚠️ Not audited | Fleet management integration |
| `crm-sfa.ts` | ⚠️ Not audited | CRM-SFA integration |
| `sfa-marketing.ts` | ⚠️ Not audited | Marketing integration |

**Critical Finding:** Semua integration endpoint menggunakan `mockProviders` dari `lib/integrations/mockProviders`. **Tidak ada koneksi live ke provider eksternal.** Ini berarti seluruh modul integrasi masih dalam fase prototype/mock.

### 4.2 Sync (`pages/api/hq/sync/`)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `trigger.ts` | ✅ Works | BranchSyncService pattern — trigger sync per branch or all |
| `status/[branchId].ts` | ⚠️ Not audited | Sync status per branch |
| `index.ts` | ⚠️ Not audited | Sync overview |

---

## Kesimpulan & Rekomendasi

### 🔴 BLOCKER (Harus diperbaiki segera)

| # | Blocker | File | Dampak |
|---|---------|------|--------|
| 1 | **BUMDes API tanpa auth** | `pages/api/hq/bumdes.ts:38` | Siapa pun bisa akses/manipulasi data BUMDes tanpa login |
| 2 | **FinanceTransaction model tidak punya tenantId** | `models/FinanceTransaction.js` | Tenant isolation di query level tidak berfungsi — SQL `WHERE tenant_id = :tid` pada table tanpa kolom tenant_id akan error atau silent ignore |
| 3 | **Blockchain validation disabled (`|| true`)** | `pages/api/hq/dms.ts:477` | Seluruh chain verification selalu return valid — chain integrity nol |
| 4 | **DMS models tidak di-register di models/index.js** | `models/index.js` | Associations antar DMS model tidak pernah di-load |

### ⚠️ HIGH PRIORITY

| # | Issue | File | Rekomendasi |
|---|-------|------|-------------|
| 1 | Tenant filter bypass jika tenantId null | `lib/middleware/tenantIsolation.ts:98-99` | Return `1=0` (no data) instead of empty string |
| 2 | BUMDes data in-memory | `pages/api/hq/bumdes.ts` | Migrasi ke database persistensi |
| 3 | `any` type abuse di auth | `pages/api/auth/[...nextauth].ts` | Gunakan tipe `JWT` dan `Session` dari next-auth |
| 4 | DMS tidak pakai withHQAuth | `pages/api/hq/dms.ts` | Wrapper dengan module guard |
| 5 | Integration mock-only | `lib/integrations/mockProviders.ts` | Implementasi koneksi live ke provider |

### ✅ SUDAH BAIK (Pertahankan)

| # | Praktik Baik | File |
|---|--------------|------|
| 1 | Input validation + sanitasi | `pages/api/hq/finance/transactions.ts` |
| 2 | Database transaction + FOR UPDATE | `pages/api/hq/finance/transactions.ts:80-98` |
| 3 | Rate limiting + security headers | `lib/security/middleware.ts` |
| 4 | Tenant isolation utilities | `lib/middleware/tenantIsolation.ts` |
| 5 | Granular permission system | `lib/middleware/withHQAuth.ts` |
| 6 | Sliding session auto-refresh | `pages/api/auth/[...nextauth].ts:280-305` |
| 7 | SFA role-based delete restriction | `pages/api/hq/sfa/index.ts:92-94` |
| 8 | Audit logging pattern | `lib/middleware/withHQAuth.ts + pages/api/hq/finance/transactions.ts` |

### 📊 Score Summary

| Area | Score | Notes |
|------|-------|-------|
| Auth & Security | **6/10** | Good middleware stack, tapi BUMDes tanpa auth + any type abuse |
| API Endpoints | **5/10** | Finance endpoint excellent, SFA solid, BUMDes critical, DMS rawan |
| Database Models | **6/10** | Well-designed models, tapi missing tenantId di FinanceTransaction + DMS models not registered |
| Integrations | **3/10** | Mock-only, belum ada koneksi live |
| **Overall** | **5/10** | Struktur modular bagus, tapi ada 4 blocker serius yang perlu ditangani segera |

---
*Audit generated by Hermes Agent — CTO Technical Audit mode*
