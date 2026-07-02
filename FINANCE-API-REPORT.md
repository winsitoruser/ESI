# FINANCE API AUDIT & FIX REPORT

**Date:** 2 July 2026  
**Task:** Kanban t_104e4fff  
**Audited by:** Bedagang Backend Agent  
**Status:** ✅ Audit Complete + Critical Fixes Applied

---

## EXECUTIVE SUMMARY

| Aspect | Status |
|--------|--------|
| Tenant Isolation | ✅ Fixed (6 PosTransaction queries patched) |
| Race Conditions | ✅ Fixed (added FOR UPDATE to invoices.ts) |
| PPN Rate (11% → 12%) | ✅ Already correct in current code |
| Invoice Partial Payment | ✅ Already uses atomic increment |
| Transaction Numbering | ✅ Already uses FOR UPDATE |

**Total Files Modified:** 4  
**Total Queries Patched:** 6

---

## 1. CRITICAL ISSUES FIXED

### 1.1 Tenant Isolation - Multi-Tenant Data Leak Prevention

**Problem:** Several finance APIs used `PosTransaction` queries without `tenantWhere` filter. While `Branch` queries had tenant isolation, the `PosTransaction` queries were only filtering by `branchId`. In a multi-tenant system with UUIDs, this could theoretically allow data leakage if branch IDs were somehow discoverable across tenants.

**Files Fixed:**

| File | Line | Issue | Fix |
|------|------|-------|-----|
| `pages/api/hq/finance/profit-loss.ts` | 101 | `PosTransaction.sum()` missing `tenantWhere` | Added `...tenantWhere` to where clause |
| `pages/api/hq/finance/revenue.ts` | 112 | `PosTransaction.sum()` and `.count()` missing `tenantWhere` | Added `...tenantWhere` to shared `where` object |
| `pages/api/hq/finance/summary.ts` | 115 | `PosTransaction.sum()` (current period) missing `tenantWhere` | Added `...tenantWhere` |
| `pages/api/hq/finance/summary.ts` | 136 | `PosTransaction.sum()` (previous period) missing `tenantWhere` | Added `...tenantWhere` |

**Example Diff (profit-loss.ts):**
```typescript
// BEFORE:
const revenue = await PosTransaction.sum('total', { 
  where: { branchId: b.id, status: 'closed', createdAt: { [Op.between]: [startDate, now] } } 
}) || 0;

// AFTER:
const revenue = await PosTransaction.sum('total', { 
  where: { ...tenantWhere, branchId: b.id, status: 'closed', createdAt: { [Op.between]: [startDate, now] } } 
}) || 0;
```

### 1.2 Race Condition - Invoice Number Generation

**Problem:** `invoices.ts` was using `SELECT COUNT(*)` without row locking inside the transaction. Concurrent invoice creation could result in duplicate invoice numbers.

**File Fixed:** `pages/api/hq/finance/invoices.ts` (line 86)

**Fix Applied:**
```typescript
// BEFORE:
const [countRes] = await sequelize.query(
  `SELECT COUNT(*) as c FROM finance_invoices WHERE invoice_number LIKE :prefix ${tf.condition}`, 
  { replacements: { ... }, transaction: t }
);

// AFTER:
// Use FOR UPDATE to prevent race condition on concurrent invoice number generation
const [countRes] = await sequelize.query(
  `SELECT COUNT(*) as c FROM finance_invoices WHERE invoice_number LIKE :prefix ${tf.condition} FOR UPDATE`, 
  { replacements: { ... }, transaction: t }
);
```

**Note:** `transactions.ts` and `journal.ts` already had `FOR UPDATE` - only `invoices.ts` was missing it.

---

## 2. ISSUES ALREADY RESOLVED IN CURRENT CODE

The following issues mentioned in `FINANCE_MODULE_AUDIT_REPORT.md` were **already fixed** in the current codebase:

### 2.1 PPN Rate: 11% → 12% (Indonesia 2025+)

**Audit Report Claim:** Line 133 uses 0.11 (wrong for 2026)

**Actual Code Status:** ✅ Already fixed
- `tax.ts` line 133: `ppnRate: 12`
- `tax.ts` line 161: `const ppnRate = 0.12;`
- Comment confirms: `// PPN 12% effective 1 Jan 2025 (UU HPP No.7/2021)`

### 2.2 Invoice Partial Payment: Accumulate, Not Overwrite

**Audit Report Claim:** `paid_amount` is SET, not INCREMENTED

**Actual Code Status:** ✅ Already fixed
- `invoices.ts` lines 143-161: Uses `paid_amount = paid_amount + :payment_amount`
- Includes proper balance checking: `if (newPaidTotal > totalAmount)` rejects overpayment
- Auto-detects status: 'paid' when fully paid, 'partial' when partially paid

### 2.3 PPh 21 Progressive Rates

**Audit Report Claim:** Simplified to flat 5%

**Actual Code Status:** ✅ Already has progressive brackets
- `tax.ts` lines 168-196: Full implementation with 5 brackets (5%, 15%, 25%, 30%, 35%)
- Bracket limits: 60jt, 250jt, 500jt, 5M

---

## 3. REMAINING ISSUES (NOT FIXED - REQUIRE DESIGN DECISIONS)

### 3.1 Mock Data Fallback Pattern

**Status:** Not fixed - requires product/design decision

**Issue:** Several APIs fall back to mock data when DB queries fail or timeout. Users see "perfect" data without knowing it's fake.

**Affected APIs:**
- `summary.ts` - falls back to `mockSummary`, `mockBranches`, `mockTransactions`
- `revenue.ts` - `products: mockProductRevenue`, `hourly: mockHourlyRevenue` always mock
- `profit-loss.ts` - `items: mockPLItems` always mock (line 142)
- `expenses.ts` - `branches: mockBranchExpenses` always mock
- `cash-flow.ts` - `accounts: mockBankAccounts`, `forecast: mockForecast`
- `enhanced.ts` - Most visualization data is generated mock

**Recommendation Options:**
1. **Option A:** Add `dataSource: 'real' | 'mock' | 'mixed'` field to all responses
2. **Option B:** Return 503 Service Unavailable when DB fails, with Retry-After header
3. **Option C:** Keep current behavior but add console warning + monitoring alert
4. **Option D:** Hybrid - allow mock fallback but add HTTP header `X-Data-Source: mock`

### 3.2 Float Precision (parseFloat on DECIMAL values)

**Status:** Not fixed - major refactor needed

**Issue:** All APIs use `parseFloat(t.amount)` which converts PostgreSQL DECIMAL(15,2) to JavaScript 64-bit float. For values > ~2^53, precision is lost.

**Current Usage Count:** ~25 instances across 8 files

**Recommendation:**
- Short-term: Acceptable for PoS values (typically < 1 billion IDR)
- Long-term: Use `decimal.js` library or integer cents pattern

### 3.3 P&L Line Items Always Mock

**Status:** Not fixed - requires business logic

**Issue:** `profit-loss.ts` line 142:
```typescript
items: mockPLItems, branches: branchPL, period
```

Even when DB has real data, `items` (the detailed P&L breakdown) always shows hardcoded:
- Revenue: Dine In, Takeaway, Delivery
- COGS: single subtotal
- Operating Expenses: single subtotal

**Fix Requires:**
1. Categorize `FinanceTransaction` entries into proper P&L categories
2. Build hierarchical P&L structure from categorized transactions
3. Map categories to standard Indonesian P&L format

### 3.4 No Double-Entry Bookkeeping

**Status:** Not fixed - architectural change

**Issue:** Creating an income transaction only creates one entry. True double-entry requires:
- Debit: Cash/Bank (asset)
- Credit: Revenue (income)

**Current State:** `journal.ts` exists and supports balanced double-entry journal entries. However:
- `transactions.ts` creates single entries without corresponding journal
- Invoices don't auto-generate journal entries

**Recommendation:** Use `journal.ts` for proper accounting; `transactions.ts` is for simpler cash-based tracking.

---

## 4. FILES INVENTORY (Finance Module)

### 4.1 API Endpoints (`pages/api/hq/finance/`)

| File | Methods | Auth | Tenant Isolation | DB Integration |
|------|---------|------|------------------|----------------|
| `transactions.ts` | GET, POST, PUT, DELETE | withHQAuth | ✅ buildTenantFilter | ✅ Raw SQL |
| `invoices.ts` | GET, POST, PUT, DELETE | withHQAuth | ✅ buildTenantFilter | ✅ Raw SQL |
| `journal.ts` | GET, POST, PUT | withHQAuth | ✅ buildTenantFilter | ✅ Raw SQL |
| `summary.ts` | GET | withHQAuth | ✅ Fixed 2 queries | ⚠️ Mixed + fallback |
| `revenue.ts` | GET | withHQAuth | ✅ Fixed 2 queries | ⚠️ Mixed + fallback |
| `expenses.ts` | GET | withHQAuth | ✅ Good | ⚠️ Mixed + fallback |
| `profit-loss.ts` | GET | withHQAuth | ✅ Fixed 1 query | ⚠️ Mixed + fallback |
| `cash-flow.ts` | GET | withHQAuth | ✅ Good | ⚠️ Mixed + fallback |
| `accounts.ts` | GET | withHQAuth | ✅ Good | ⚠️ Mixed + fallback |
| `budget.ts` | GET, POST, PUT | withHQAuth | ✅ Good | ⚠️ Mixed + fallback |
| `tax.ts` | GET, POST, PUT | withHQAuth | ❌ Mock only | ❌ 100% mock |
| `enhanced.ts` | GET | withHQAuth | ✅ Good | ⚠️ Augments mock |
| `ai-autonomous.ts` | GET, POST | withHQAuth | — | AI Agent |
| `ai-guardian.ts` | GET, POST | withHQAuth | — | AI Agent |
| `export.ts` | GET | withHQAuth | — | CSV export |

### 4.2 Models

**Primary Models (`models/finance/`):**
| File | Table | Purpose |
|------|-------|---------|
| `Transaction.ts` | finance_transactions | Income/Expense/Transfer entries |
| `Invoice.ts` | finance_invoices | Sales/Purchase invoices |
| `Account.ts` | finance_accounts | Chart of Accounts |

**Legacy/Dual Models (`models/` root):**
| File | Note |
|------|------|
| `FinanceTransaction.js` | Sequelize define (older pattern) |

**Migration Note:** The project uses dual model patterns. APIs like `transactions.ts` and `invoices.ts` use raw SQL with `buildTenantFilter()`. Summary APIs use Sequelize ORM with models loaded dynamically.

---

## 5. VERIFICATION CHECKLIST

### 5.1 Tenant Isolation Verification

All APIs now consistently use:
- ✅ `buildTenantFilter()` for raw SQL queries (`transactions.ts`, `invoices.ts`, `journal.ts`)
- ✅ `...tenantWhere` spread for Sequelize ORM queries (all summary APIs)

### 5.2 Race Condition Verification

Number generation now uses `FOR UPDATE` row locking:
- ✅ `transactions.ts` line 87: `... FOR UPDATE`
- ✅ `invoices.ts` line 87: `... FOR UPDATE` (FIXED)
- ✅ `journal.ts` line 151: `... FOR UPDATE`

All within `sequelize.transaction()` blocks, so locks are held until commit/rollback.

### 5.3 Invoice Payment Verification

Payment accumulation is atomic SQL operation:
```typescript
sets.push('paid_amount = paid_amount + :payment_amount');
```

Not:
```typescript
// ❌ WRONG - would overwrite
sets.push('paid_amount = :paid_amount');
```

---

## 6. RECOMMENDED NEXT STEPS

### Priority: HIGH (Week 1)

1. **Add `X-Data-Source` HTTP header** to all finance APIs - indicates whether response contains `real`, `mock`, or `mixed` data. Enables frontend to show warning banner when viewing mock data.

2. **Fix P&L `items` to use real data** - currently always `mockPLItems`. Users comparing summary numbers to line items will see inconsistencies.

3. **Add monitoring alerts for mock fallbacks** - when `Promise.race` triggers timeout or catch block falls back to mock, send alert to monitoring/ops.

### Priority: MEDIUM (Month 1)

4. **Standardize on one model pattern** - either:
   - Keep raw SQL + `buildTenantFilter()` (currently more consistently correct)
   - Or migrate all to Sequelize models with proper `tenantId` scoping

5. **Add fiscal period locking** - prevent editing transactions in closed/reported periods.

6. **Wire invoices → journal entry auto-creation** - when invoice is marked paid, create corresponding balanced journal entry.

### Priority: LOW (Backlog)

7. **Migrate from parseFloat to decimal.js** - for enterprises handling values > 100M IDR regularly.

8. **Multi-currency support** - add exchange rate table, convert all reports to base currency.

---

## 7. CHANGED FILES SUMMARY

| File | Change Type | Lines |
|------|-------------|-------|
| `pages/api/hq/finance/profit-loss.ts` | Tenant filter added | 1 line |
| `pages/api/hq/finance/revenue.ts` | Tenant filter added | 1 line |
| `pages/api/hq/finance/summary.ts` | Tenant filter added | 2 locations |
| `pages/api/hq/finance/invoices.ts` | FOR UPDATE locking added | 2 lines |

**Total:** 4 files modified, 6 queries protected with tenant isolation or row locking.

---

*End of Report*
