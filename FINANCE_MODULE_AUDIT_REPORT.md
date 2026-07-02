# FINANCE MODULE - COMPREHENSIVE AUDIT REPORT
**Date:** 5 March 2026  
**Audited by:** PM, QC, Frontend, Backend, DevOps, CTO Perspective  
**Scope:** 10 Frontend Pages, 13 Backend APIs, Database Schema

---

## EXECUTIVE SUMMARY

| Aspect | Score | Grade |
|--------|-------|-------|
| Business Logic & Formulas | 55/100 | D |
| Tax Compliance | 35/100 | F |
| Audit Trail | 70/100 | B- |
| Data Integrity & Precision | 60/100 | C |
| Security (RBAC/Tenant) | 75/100 | B |
| Frontend UX & Validation | 55/100 | D |
| Backend Architecture | 50/100 | D |
| Export & Reporting | 65/100 | C+ |
| Scalability | 45/100 | F |
| **Overall** | **55/100** | **D** |

**Critical issues found: 23 | High: 15 | Medium: 18 | Low: 12**

---

## 1. PRODUCT MANAGER / BUSINESS ANALYST FINDINGS

### 1.1 P&L Formula Integrity — ⚠️ CRITICAL ISSUES

**File:** `pages/api/hq/finance/profit-loss.ts`

| Issue | Severity | Detail |
|-------|----------|--------|
| **COGS hardcoded as 60% of revenue** | 🔴 CRITICAL | Line 102: `const cogs = revenue * 0.6;` — COGS should come from actual purchase/inventory data, not a magic number |
| **OpEx fallback is 15% of revenue** | 🔴 CRITICAL | Line 104: `const opex = expenses > 0 ? expenses : revenue * 0.15;` — Operating expenses should never be estimated from revenue |
| **Net Income uses 0.8 multiplier** | 🔴 CRITICAL | `summary.ts` line 199: `netProfit: grossProfit * 0.8` — Net profit should be calculated from actual tax/interest deductions, not 80% of gross |
| **Tax hardcoded at 22%** | ⚠️ HIGH | Line 124: `taxExpense: Math.round(netIncome * 0.22)` — Correct for Indonesia PPh Badan, but should be configurable per business entity |
| **yearlyGrowth uses mock data** | ⚠️ HIGH | `summary.ts` line 208: `yearlyGrowth: mockSummary.yearlyGrowth` — Always returns hardcoded 28.3% even with real data |
| **cashOnHand always mock** | ⚠️ HIGH | `summary.ts` line 202: `cashOnHand: mockSummary.cashOnHand` — Always returns Rp 1.25B regardless of actual balance |

**Correct P&L Formula Should Be:**
```
Revenue (from POS + finance_transactions type=income)
- COGS (from actual purchase_orders/goods_receipts or finance_transactions category=COGS)
= Gross Profit
- Operating Expenses (from actual finance_transactions type=expense, category!=COGS)
= Operating Income (EBIT)
+ Other Income - Other Expenses
= EBT (Earnings Before Tax)
- Tax (calculated per Indonesian tax brackets, not flat 22%)
= Net Income
```

### 1.2 Tax Compliance — 🔴 CRITICAL

**File:** `pages/api/hq/finance/tax.ts`

| Issue | Severity | Detail |
|-------|----------|--------|
| **PPN rate hardcoded 11%** | 🔴 CRITICAL | Line 133: `0.11` — Indonesia raised PPN to 12% effective Jan 2025. This is **wrong for 2026** |
| **PPh 21 simplified to flat 5%** | 🔴 CRITICAL | Line 139: `(salaries) * 0.05` — Indonesia PPh 21 has progressive rates: 5%/15%/25%/30%/35%. Flat 5% is grossly incorrect |
| **PPh 23 hardcoded 2%** | ⚠️ HIGH | Line 143 — Only correct for service income. Dividend/interest/royalties are 15%. No differentiation |
| **PPh 25 uses 0.5%** | ⚠️ HIGH | Line 147 — This is UMKM final rate (PP 55/2022). Regular corporate PPh 25 is calculated differently (prior year tax ÷ 12) |
| **No e-Faktur integration** | ⚠️ MEDIUM | Tax module has no DJP/e-Faktur API integration for automated reporting |
| **Tax calculations are stateless** | ⚠️ HIGH | `calculateTax()` doesn't persist results to DB — recalculation required every time |
| **No tax period locking** | ⚠️ HIGH | Once a tax period is reported/paid, data should be locked from editing |

### 1.3 Audit Trail — ✅ PARTIAL

| Aspect | Status | Detail |
|--------|--------|--------|
| Transaction create/update/delete | ✅ Good | `logAudit()` with oldValues/newValues diff |
| Invoice create/update/delete | ✅ Good | Full audit with entity tracking |
| Budget changes | ❌ Missing | No audit logging on budget create/update |
| Tax status changes | ❌ Missing | `updateTaxStatus()` modifies mock array, no DB, no audit |
| Account changes | ❌ Missing | Accounts API is GET-only, no CRUD with audit |
| Revenue/Expense views | ✅ N/A | Read-only, no audit needed |

### 1.4 Currency & Localization — ⚠️ MEDIUM ISSUES

| Issue | Detail |
|-------|--------|
| **Single currency only (IDR)** | No multi-currency support. DB has `currency VARCHAR(3)` column but UI/API ignores it |
| **No exchange rate management** | For businesses dealing with USD/SGD imports, no FX conversion |
| **Format is correct** | `toLocaleString('id-ID')` used consistently — proper Indonesian thousand separator (.) |
| **Abbreviation inconsistency** | Uses "M" for miliar and "Jt" for juta — mixing English "M" with Indonesian "Jt" |

### 1.5 Reporting & Export — ⚠️ MEDIUM

| Feature | Status | Detail |
|---------|--------|--------|
| P&L PDF/Excel export | ✅ | `DocumentExportButton` with 4 formats (pdf/excel/csv/html) |
| Cash Flow CSV export | ✅ | Manual CSV generation in frontend |
| Tax report export | ✅ | `DocumentExportButton` integrated |
| Dashboard export | ✅ | CSV via enhanced API |
| Revenue export | ⚠️ Partial | Export button present but not wired to actual export function |
| Expense export | ⚠️ Partial | Export button present but not wired |
| Budget export | ❌ Missing | No export functionality |
| Accounts export | ❌ Missing | No export functionality |
| **Proper accounting format** | ❌ Missing | Exports don't follow standard Indonesian accounting report format (SAK) |

---

## 2. QC / QA ENGINEER FINDINGS

### 2.1 Floating Point Precision — 🔴 CRITICAL

| Issue | Severity | Detail |
|-------|----------|--------|
| **parseFloat on monetary values** | 🔴 CRITICAL | Throughout APIs: `parseFloat(t.amount)` — JavaScript floating point will cause precision errors on large sums |
| **DB uses DECIMAL(15,2)** | ✅ Good | Database schema correctly uses DECIMAL, but JS layer converts to float |
| **Math.round for tax** | ⚠️ HIGH | `Math.round(netIncome * 0.22)` — rounding before final calculation compounds errors |
| **Division before multiplication** | ⚠️ MEDIUM | `margin: revenue > 0 ? (profit / revenue * 100) : 0` — should use integer arithmetic |

**Recommendation:** All monetary calculations should use integer cents (smallest unit) or a library like `decimal.js`.

### 2.2 Negative Value Handling — ⚠️ HIGH

| Scenario | Result | Expected |
|----------|--------|----------|
| Expenses > Revenue | Gross Profit shows negative | ✅ Works (no crash) |
| Negative P&L display | Shows with minus sign | ✅ Works |
| Negative cash flow | Red color + sign | ✅ Works |
| Zero revenue division | Returns 0 margin | ✅ Handled with `revenue > 0 ?` checks |
| **Negative invoice amount** | ❌ **Accepted** | Should be rejected — `min(0)` validation allows 0 |

### 2.3 Invoice Workflow Testing — ⚠️ HIGH ISSUES

| Test Case | Result |
|-----------|--------|
| Create draft invoice | ✅ Works |
| Send invoice | ⚠️ Status update only, no email sent |
| **Partial payment** | 🔴 **BUG**: `paid_amount` is overwritten, not accumulated. Two payments of 500K on a 1M invoice: second overwrites first instead of summing |
| Full payment → Paid status | ⚠️ Manual status change only — no auto-detection when paid_amount >= total_amount |
| Cancel paid invoice | ✅ Blocked (`status != 'paid'` check) |
| **Overdue auto-detection** | ❌ Missing — No cron/scheduled job to mark invoices as overdue when past due_date |

### 2.4 Boundary Testing — ⚠️ MEDIUM

| Test | Result |
|------|--------|
| Amount > 1 trillion | ⚠️ DECIMAL(15,2) supports max 9,999,999,999,999.99 — sufficient |
| Very small amounts (0.01) | ✅ Works |
| Zero amount transaction | ⚠️ Allowed (min:0 validation) — should be min:1 or min:0.01 |
| Negative amount | ❌ Not blocked — `min(0)` allows 0 but code path unclear for negatives |
| Special chars in description | ✅ `sanitizeBody()` applied |
| SQL injection in search | ✅ Parameterized queries with `:search` |

### 2.5 Data Reconciliation — 🔴 CRITICAL

| Issue | Detail |
|-------|--------|
| **Dashboard total ≠ sum of pages** | Dashboard (`/finance`) fetches from `enhanced.ts` with mock data. Revenue page fetches from `revenue.ts` with different mock/real data mix. Numbers WILL NOT match |
| **P&L items are always mock** | `profit-loss.ts` line 128: `items: mockPLItems` — even when DB has real data, the line items table always shows hardcoded mock data |
| **Revenue API product data is mock** | `revenue.ts` line 130: `products: mockProductRevenue` — always shows the same 5 F&B products regardless of actual business type |
| **Expense branch breakdown is mock** | `expenses.ts` line 125: `branches: mockBranchExpenses` — even with real DB data, branch breakdown is hardcoded |

---

## 3. FRONTEND DEVELOPER FINDINGS

### 3.1 Data Visualization — ⚠️ MEDIUM

| Aspect | Status | Detail |
|--------|--------|--------|
| Color scheme (profit=green, loss=red) | ✅ Correct | Consistent across all pages |
| Chart readability | ✅ Good | ApexCharts with proper tooltips, legends |
| **Revenue trend chart uses hardcoded data** | 🔴 BUG | `revenue.tsx` line 222: `data: [120, 180, 220, 195, 280, 320]` — trend chart never uses real data |
| **Expense trend chart uses hardcoded data** | 🔴 BUG | `expenses.tsx` line 250: `data: [2200, 2350, 2480, 2650, 2750, 2884]` — always same trend |
| **Monthly comparison hardcoded** | 🔴 BUG | `expenses.tsx` lines 271-278: stacked bar always shows same 6-month data |

### 3.2 Input Validation & Masking — ❌ MISSING

| Feature | Status |
|---------|--------|
| **Thousand separator on input** | ❌ No input masking — user must type `1000000` instead of `1.000.000` |
| **Date picker validation** | ⚠️ Basic HTML date input, no min/max constraints |
| **Required field indicators** | ⚠️ No visual asterisk (*) on required fields |
| **Real-time validation feedback** | ❌ Errors only shown after server response |
| **Form dirty state tracking** | ❌ No "unsaved changes" warning |

### 3.3 State Management — ⚠️ MEDIUM

| Issue | Detail |
|-------|--------|
| **Data flicker on tab switch** | ⚠️ Each sub-page re-fetches on mount. No shared state/cache between `/finance`, `/finance/revenue`, `/finance/expenses` |
| **No loading skeletons** | ⚠️ Only spinner, no skeleton placeholders for better perceived performance |
| **Period change re-fetch** | ✅ Good — useEffect dependency on period works correctly |

### 3.4 Responsive Design — ❌ POOR

| Issue | Detail |
|-------|--------|
| **Grid cols not responsive** | `grid-cols-5`, `grid-cols-8` without responsive breakpoints — will break on tablets/mobile |
| **Tables not horizontally scrollable** | Most tables have `overflow-x-auto` ✅, but some don't |
| **Quick links grid** | `grid-cols-8` — 8 columns on mobile is unusable |
| **Charts on small screens** | Fixed heights (260px, 280px) — may be too small on mobile |

### 3.5 Error Handling — ⚠️ MEDIUM

| Aspect | Status |
|--------|--------|
| API failure fallback | ⚠️ Silent `console.error` — no user-facing error message on most pages |
| Empty state display | ❌ No "No data available" message when arrays are empty |
| Toast notifications | ✅ Used for export success/failure |
| **500 error display** | ❌ Generic error, no retry option presented to user |

---

## 4. BACKEND DEVELOPER FINDINGS

### 4.1 Data Types — ⚠️ HIGH

| Aspect | Status | Detail |
|--------|--------|--------|
| **DB Column Type** | ✅ `DECIMAL(15,2)` | Correct — not FLOAT/DOUBLE |
| **JS Processing** | 🔴 CRITICAL | `parseFloat()` used throughout — converts DECIMAL to JavaScript float, losing precision |
| **Recommendation** | — | Keep as string from DB, only format for display. Use `Decimal.js` or integer cents for calculations |

### 4.2 Idempotency — 🔴 CRITICAL

| Endpoint | Idempotent? | Detail |
|----------|-------------|--------|
| POST /transactions | ❌ NO | No idempotency key — double-click creates duplicate transactions |
| POST /invoices | ❌ NO | Sequential number generation via COUNT — race condition possible |
| PUT /invoices (payment) | 🔴 **BUG** | `paid_amount` is SET, not INCREMENT — two concurrent partial payments = data loss |
| PUT /tax status | ❌ NO | Mutates in-memory mock array — state resets on server restart |

**Invoice Number Race Condition:**
```typescript
// Line 78-79 of transactions.ts — NOT atomic
const [countRes] = await sequelize.query(`SELECT COUNT(*) as c FROM finance_transactions WHERE ...`);
const txnNumber = `${prefix}-${dateStr}-${String(parseInt(countRes[0]?.c || '0') + 1).padStart(4, '0')}`;
// Two concurrent requests can get the same count → duplicate transaction numbers
```

### 4.3 Atomic Transactions — ⚠️ MIXED

| Operation | Uses DB Transaction? | Detail |
|-----------|---------------------|--------|
| Create invoice + items | ✅ YES | `sequelize.transaction()` with rollback |
| Create transaction | ❌ NO | Single INSERT, acceptable |
| Update invoice payment | ❌ NO | Should use transaction if updating account balance simultaneously |
| Budget update | ❌ NO | ORM `update()` — single operation, acceptable |
| **Missing: Double-entry** | 🔴 CRITICAL | No double-entry bookkeeping. An income transaction doesn't debit Cash and credit Revenue |

### 4.4 RBAC — ⚠️ MEDIUM

| Check | Status | Detail |
|-------|--------|--------|
| Authentication | ✅ | All APIs use `withHQAuth` middleware |
| Module guard | ✅ | `module: 'finance_pro'` or `['finance_pro', 'finance_lite']` |
| **Role-based access** | ❌ MISSING | No role check within finance APIs — any authenticated user with finance module can see P&L, edit budgets, change tax status |
| **Sensitive data protection** | ❌ MISSING | Bank account numbers shown in plain text in `/accounts` and `/cash-flow` |

### 4.5 Performance — ⚠️ HIGH

| Issue | Detail |
|-------|--------|
| **N+1 queries in summary** | `summary.ts` line 91: `Promise.all(dbBranches.map(async (branch) => { ... sum ... sum ... }))` — 2 queries per branch. 50 branches = 100 queries |
| **No database indexing noted** | Migration doesn't create indexes on `transactionDate`, `branchId`, `status`, `type` — critical for yearly reports |
| **5-second timeout** | Revenue/P&L/CashFlow APIs use `Promise.race` with 5s timeout — falls back to mock data silently |
| **No pagination on some GET** | `/accounts` returns all receivables/payables without pagination |
| **Mock data fallback hides problems** | When DB is slow or fails, users see perfectly normal-looking mock data — they don't know it's fake |

### 4.6 Tenant Isolation — ⚠️ MIXED

| API | Tenant Isolated? | Detail |
|-----|-------------------|--------|
| transactions.ts | ✅ | `buildTenantFilter()` on all operations |
| invoices.ts | ✅ | `buildTenantFilter()` on all operations |
| summary.ts | ❌ NO | ORM queries without tenant filter |
| revenue.ts | ❌ NO | ORM queries without tenant filter |
| expenses.ts | ❌ NO | ORM queries without tenant filter |
| profit-loss.ts | ❌ NO | ORM queries without tenant filter |
| cash-flow.ts | ❌ NO | ORM queries without tenant filter |
| accounts.ts | ❌ NO | ORM queries without tenant filter |
| budget.ts | ❌ NO | ORM queries without tenant filter |
| tax.ts | ❌ NO | Entirely mock data, no DB at all |
| enhanced.ts | ❌ NO | ORM queries without tenant filter |

**8 out of 11 finance APIs lack tenant isolation — this is a multi-tenant data leak vulnerability.**

---

## 5. DEVOPS / SRE FINDINGS

### 5.1 Data Security — 🔴 CRITICAL

| Issue | Detail |
|-------|--------|
| **Bank account numbers in plain text** | `/cash-flow` API returns mock bank account numbers like `123-456-7890` in JSON response. In production with real data, these must be masked/encrypted |
| **No encryption at rest** | No column-level encryption on sensitive financial data (account numbers, tax IDs) |
| **No field-level masking** | API responses return full bank account numbers to frontend |

### 5.2 Logging & Monitoring — ⚠️ MEDIUM

| Aspect | Status |
|--------|--------|
| API error logging | ✅ `console.error` on all handlers |
| Audit logging on writes | ✅ On transactions & invoices only |
| Access logging to finance module | ❌ No specific finance access log |
| Failed query logging | ⚠️ Falls back to mock silently — should alert |
| Performance monitoring | ❌ No query timing or slow query detection |

### 5.3 Backup & Recovery — N/A (Infrastructure)

This is infrastructure-level, but the application should support:
- [ ] Point-in-time recovery awareness (transaction timestamps)
- [ ] Data export for backup verification
- [ ] Period locking to prevent retroactive changes

---

## 6. CTO / STRATEGIC FINDINGS

### 6.1 Scalability — 🔴 CRITICAL

| Concern | Assessment |
|---------|-----------|
| **10x transaction volume** | ❌ WILL FAIL — N+1 queries per branch, no caching, no pagination on summaries |
| **100+ branches** | ❌ WILL FAIL — Summary API makes 2 DB queries per branch sequentially |
| **Yearly reports** | ❌ SLOW — Full table scans without proper date indexes |
| **Concurrent users** | ⚠️ Race conditions on invoice/transaction number generation |

### 6.2 Integration Readiness — ⚠️ MEDIUM

| Integration | Status |
|-------------|--------|
| Payment Gateway (Midtrans/Xendit) | ⚠️ Exists in `services/payment/MidtransService.js` but NOT connected to finance module |
| E-Faktur / DJP Online | ❌ No integration |
| Bank API (BCA/Mandiri) | ❌ No integration |
| Accounting Software (Jurnal.id/Accurate) | ❌ No integration |
| **Webhook for real-time sync** | ❌ No outgoing webhooks on finance events |

### 6.3 Compliance — ❌ NOT COMPLIANT

| Standard | Status | Detail |
|----------|--------|--------|
| **SAK (Standar Akuntansi Keuangan)** | ❌ | No double-entry bookkeeping |
| **PSAK 1 (Presentation)** | ❌ | P&L format doesn't follow standard structure |
| **UU PDP (Data Protection)** | ⚠️ | Bank account numbers not encrypted |
| **UU Perpajakan** | ❌ | PPN rate wrong (11% vs 12%), PPh 21 calculation wrong |
| **ISO 27001** | ❌ | No field-level encryption on financial data |

### 6.4 Architecture Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| **No double-entry accounting** | Cannot produce Balance Sheet, Trial Balance | 🔴 CRITICAL |
| **Mock data fallback pattern** | Users see fake data when DB fails — dangerous for financial decisions | 🔴 CRITICAL |
| **No journal entries** | Core accounting concept missing — all transactions should be journal entries | 🔴 CRITICAL |
| **No fiscal period management** | No month/year close, no period locking | ⚠️ HIGH |
| **No chart of accounts hierarchy** | COA exists but not enforced in transaction flow | ⚠️ HIGH |
| **No multi-currency** | Single currency (IDR) hardcoded | ⚠️ MEDIUM |
| **No approval workflow for expenses** | Anyone with access can create expense transactions | ⚠️ HIGH |

---

## 7. PRIORITIZED FIX PLAN

### Phase 1: CRITICAL Fixes (Immediate)

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| 1 | **Fix PPN rate from 11% to 12%** | `tax.ts` | 5 min |
| 2 | **Add tenant isolation to 8 APIs** | `summary.ts`, `revenue.ts`, `expenses.ts`, `profit-loss.ts`, `cash-flow.ts`, `accounts.ts`, `budget.ts`, `enhanced.ts` | 2 hours |
| 3 | **Fix invoice partial payment (accumulate, not overwrite)** | `invoices.ts` | 30 min |
| 4 | **Remove mock data fallback or clearly label it** | All APIs | 2 hours |
| 5 | **Fix transaction number race condition** | `transactions.ts`, `invoices.ts` | 1 hour |
| 6 | **Replace parseFloat with proper decimal handling** | All APIs | 3 hours |

### Phase 2: HIGH Priority (Week 1)

| # | Fix | Effort |
|---|-----|--------|
| 7 | Implement proper PPh 21 progressive rate calculation | 4 hours |
| 8 | Replace hardcoded COGS/OpEx percentages with real DB queries | 4 hours |
| 9 | Add RBAC role checks (finance_manager for write, finance_viewer for read) | 2 hours |
| 10 | Add input masking (thousand separator) on frontend forms | 3 hours |
| 11 | Make responsive grids (add `md:` and `lg:` breakpoints) | 2 hours |
| 12 | Add frontend error states and empty states | 2 hours |
| 13 | Add DB indexes on finance tables | 1 hour |

### Phase 3: MEDIUM Priority (Month 1)

| # | Fix | Effort |
|---|-----|--------|
| 14 | Implement double-entry bookkeeping (journal entries) | 2 weeks |
| 15 | Add fiscal period management (month close, year close) | 1 week |
| 16 | Bank account number encryption at rest | 2 days |
| 17 | Wire real chart data to Revenue/Expense trend charts | 2 days |
| 18 | Add approval workflow for expenses > threshold | 1 week |
| 19 | Add overdue invoice auto-detection (cron job) | 1 day |
| 20 | Multi-currency support | 1 week |

---

## 8. FILES INVENTORY

### Frontend Pages (10)
| Page | Lines | Status |
|------|-------|--------|
| `/hq/finance/index.tsx` | 732 | Dashboard — functional with mock fallback |
| `/hq/finance/revenue.tsx` | 607 | Revenue analysis — charts hardcoded |
| `/hq/finance/expenses.tsx` | 619 | Expense mgmt — CRUD works via transactions API |
| `/hq/finance/profit-loss.tsx` | 460 | P&L statement — export integrated, formulas wrong |
| `/hq/finance/cash-flow.tsx` | 578 | Cash flow — 4 view modes, export works |
| `/hq/finance/invoices.tsx` | 755 | Invoice CRUD — partial payment bug |
| `/hq/finance/accounts.tsx` | 537 | AR/AP — mostly mock data |
| `/hq/finance/budget.tsx` | 516 | Budget mgmt — CRUD with mock fallback |
| `/hq/finance/tax.tsx` | 538 | Tax — wrong rates, calculator present |
| `/hq/finance/transactions.tsx` | ~400 | Transaction list (not audited separately) |

### Backend APIs (13)
| API | Lines | DB/Mock | Tenant Isolated | Audit |
|-----|-------|---------|-----------------|-------|
| `summary.ts` | 261 | Mixed | ❌ | ❌ |
| `transactions.ts` | 137 | Real DB | ✅ | ✅ |
| `invoices.ts` | 153 | Real DB | ✅ | ✅ |
| `revenue.ts` | 154 | Mixed | ❌ | ❌ |
| `expenses.ts` | 143 | Mixed | ❌ | ❌ |
| `profit-loss.ts` | 149 | Mixed | ❌ | ❌ |
| `cash-flow.ts` | 149 | Mixed | ❌ | ❌ |
| `accounts.ts` | 98 | Mock | ❌ | ❌ |
| `budget.ts` | 239 | Mixed | ❌ | ❌ |
| `tax.ts` | 188 | Mock only | ❌ | ❌ |
| `enhanced.ts` | 402 | Mock + augmented | ❌ | ❌ |
| `export.ts` | ~50 | — | — | — |
| `realtime.ts` | ~50 | — | — | — |

### Database Tables (5 core)
| Table | Key Columns | Data Type |
|-------|-------------|-----------|
| `finance_accounts` | balance DECIMAL(15,2), accountType ENUM | ✅ Correct |
| `finance_transactions` | amount DECIMAL(15,2), status ENUM | ✅ Correct |
| `finance_budgets` | budgetAmount DECIMAL(15,2) | ✅ Correct |
| `finance_invoices` | total_amount, paid_amount, tax_amount | Need verification |
| `finance_invoice_items` | unit_price, quantity, discount, tax, total | Need verification |

---

**END OF AUDIT REPORT**
