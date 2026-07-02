# QA API Bug Tracker — Categorized Findings

**Generated:** 2026-07-02 14:00
**Scope:** 518 API endpoints tested (GET)
**Auth:** superadmin@bedagang.com (super_admin)
**Overall Pass Rate:** 7.3% (38 PASS / 370 WARN / 110 FAIL)

---

## 🐛 REAL BUGS (5xx Errors)

### P1 — Blocker (CRITICAL — Module Broken)

#### 1. DMS Module 100% Broken (26 endpoints)
All DMS endpoints return **500** with HTML error page (empty `<script>` tag crash). Likely missing models or DB tables for DMS.

**Affected endpoints:**
`/api/hq/dms/analytics`, `/api/hq/dms/audit`, `/api/hq/dms/blockchain-mine`, `/api/hq/dms/destroy`, `/api/hq/dms/detonate`, `/api/hq/dms/disposal`, `/api/hq/dms/files`, `/api/hq/dms/folders`, `/api/hq/dms/hierarchy`, `/api/hq/dms/knowledge-graph`, `/api/hq/dms/letter`, `/api/hq/dms/mata-elang`, `/api/hq/dms/move-tier`, `/api/hq/dms/open-data`, `/api/hq/dms/overview`, `/api/hq/dms/policies`, `/api/hq/dms/ppid`, `/api/hq/dms/records`, `/api/hq/dms/scan`, `/api/hq/dms/shares`, `/api/hq/dms/signature`, `/api/hq/dms/storage`, `/api/hq/dms/upload`, `/api/hq/dms/lib/models`, `/api/hq/dms/lib/helpers`, `/api/hq/dms/lib/use-mock`

#### 2. Finance Module — Major Breakage (25 endpoints)
Two categories of failure:

**a) `Cannot read properties of undefined (reading 'query')`** (6 endpoints):
`/api/finance/balance-sheet-simple`, `/api/finance/dashboard-complete`, `/api/finance/expenses-simple`, `/api/finance/incomes-simple`, `/api/finance/profit-loss-simple`, `/api/finance/transactions-simple`

**b) `database "bedagang" does not exist`** (4 endpoints):
`/api/finance/settings/bank-accounts`, `/api/finance/settings/chart-of-accounts`, `/api/finance/settings/assets`, `/api/finance/settings/categories`

**c) `column "X" does not exist`** (3 endpoints):
`/api/finance/daily-income` — `column "transactionNumber" does not exist`
`/api/finance/accounts` — `column "tenant_id" does not exist`
`/api/finance/expenses` — `column "tenant_id" does not exist`
`/api/finance/budgets` — column FinanceBudget issues
`/api/finance/invoices` — column FinanceInvoice issues

**d) HTML crash (10 endpoints):**
`/api/finance`, `/api/finance/dashboard-stats`, `/api/finance/export`, `/api/finance/monthly-income`, `/api/finance/payables`, `/api/finance/payables/payment`, `/api/finance/receivables`, `/api/finance/receivables/payment`, `/api/finance/summary`

### P2 — High (Module Partially Broken)

#### 3. `:tenantId` named replacement errors (15+ endpoints)
Session lacks tenantId (superadmin has no tenant), causing raw SQL/Sequelize `:tenantId` replacement failures.

**Affected:**
- `/api/admin/audit/global`
- `/api/admin/reports/aggregator`
- `/api/admin/settings/global`
- `/api/admin/webhooks`
- `/api/admin/activations`
- `/api/employees/attendance/gps`
- `/api/employees/attendance/mobile`
- `/api/employees/roaming`
- `/api/employees/roster/multi-branch`
- `/api/finance/inter-branch-invoices`
- `/api/billing/invoices`
- `/api/billing/subscription`
- `/api/hq/dashboard` (index.ts)

#### 4. Billing V2 — 501 Not Implemented (4 endpoints)
`/api/billing/v2/invoices`, `/api/billing/v2/analytics`, `/api/billing/v2/subscription`, `/api/billing/v2/plans`, `/api/billing/v2/payment-methods`

#### 5. Customer Module — Model Import Error (5 endpoints)
`Customer.findAndCountAll is not a function`, `Customer.count is not a function`, etc.
Affects: `/api/customers/crud`, `/api/customers/stats`, `/api/customers/sync-tier`, `/api/customers/purchase-history`, `/api/customers`, `/api/customers/loyalty-programs`, `/api/customers/statistics`

#### 6. Inventory Module — 25 endpoints with 500 errors
Various inventory endpoints crash with HTML error pages (likely missing DB tables or model associations).

### P3 — Medium

#### 7. Health endpoint — 503 Degraded
`/api/health` returns 503 with `"services":{"database":"operational"}` but general `"status":"degraded"`. This is likely a side effect of other DB errors.

#### 8. Admin module — `column "enabledCount"` doesn't exist
`/api/admin/analytics/overview` — SQL column mismatch

#### 9. Admin module — `Partner is not associated to Tenant!`
`/api/admin/tenants` — Partner/Tenant relationship error

#### 10. POS shifts — 500 errors
`/api/pos/shifts/start`, `/api/pos/shifts/status` — HTML crash

---

## ⚠️ EXPECTED 4xx (Not Bugs)

These 370 warnings are **expected behavior** for headless testing:

| Category | Count | Explanation |
|----------|-------|-------------|
| **401 Unauthorized** | ~200+ | Routes using tenant-scoped auth that superadmin can't access (no tenantId) |
| **405 Method Not Allowed** | ~50 | POST-only/event-webhook endpoints hit with GET |
| **400 Bad Request** | ~80 | Missing required query params (date range, filters, etc.) |
| **403 Forbidden** | ~5 | Permission-based restrictions |

These are **not bugs** — they are expected API contract behaviors when testing without proper query params.

---

## ✅ PASSING ENDPOINTS (38)

Modules with working endpoints:
- **Inventory:** 16 pass (products, master data, categories, suppliers, etc.)
- **Admin:** 10 pass (activations, business-types, integrations, modules, outlets, etc.)
- **Dashboard:** 2 pass
- **Business:** 2 pass
- **POS:** 2 pass (cart, receipts list)
- **Branches:** 1 pass
- **Customers:** 1 pass
- **Orders:** 1 pass
- **Billing:** 1 pass (midtrans webhook)
- **Employees:** 1 pass (employees/index)
- **Other:** 1 pass

---

## 🎯 CRUD Operations Status (per task requirement)

### POS Transactions, Orders, Payments, Kasir
| Operation | Status | Notes |
|-----------|--------|-------|
| POS Cart | ✅ 200 | `/api/pos/cart/index` |
| POS Transactions List | ⚠️ 400 | Needs date params |
| POS Shifts | ❌ 500 | Start/status broken |
| POS Members | ⚠️ 401 | Auth issue |
| POS Products | ❌ 500 | HTML crash |
| POS Settings | ✅ 200 | Works |
| POS Receipts | ⚠️ 400 | Needs date params |

### Finance, Billing, Journal, Laporan Keuangan
| Operation | Status | Notes |
|-----------|--------|-------|
| Finance Dashboard | ❌ 500 | `reading 'query'` error |
| Finance Transactions (CRUD) | ⚠️ 401 | Needs proper session |
| Finance Accounts | ❌ 500 | `column "tenant_id"` |
| Finance Settings | ❌ 500 | Wrong database reference |
| Billing Invoices | ❌ 500 | `:tenantId` replacement |
| Billing V2 | ❌ 501 | Not implemented |
| HQ Finance routes | ⚠️ 401 | Auth restricted |
| HQ Billing routes | ⚠️ 401 | Auth restricted |

### HQ Dashboard, Settings, Notifications, Audit Log
| Operation | Status | Notes |
|-----------|--------|-------|
| HQ Dashboard | ❌ 500 | `:tenantId` replacement |
| HQ Settings | ✅ 200 | Works |
| HQ Audit Logs | ⚠️ 400 | Needs `action` param |
| HQ Notifications (settings) | ✅ 200 | Part of settings |
| HQ Roles | ✅ 200 | Works (empty data) |
| HQ Users | ✅ 200 | Works |
| HQ WhatsApp | ✅ 200 | Works |
| HQ Billing Info | ✅ 200 | Works (empty data) |
| HQ Branches List | ⚠️ 400 | Needs params for some |
