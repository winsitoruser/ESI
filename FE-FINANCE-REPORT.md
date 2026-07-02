# FE-FINANCE-REPORT.md
## Frontend Audit & Fix Report — Finance, Reports, Settings & POS Pages

**Date:** 2 Juli 2026  
**Audited by:** bedagang-frontend-3 (Hermes Agent)  
**Status:** Audit Complete — Issues Identified  

---

## EXECUTIVE SUMMARY

| Category | Status | Issues Found | Priority |
|----------|--------|--------------|----------|
| Mock Data Fallback | 🔴 CRITICAL | 25+ pages | P0 |
| Error Handling | ⚠️ HIGH | Silent console.error only | P1 |
| Responsive Design | ⚠️ HIGH | grid-cols-5/6/7/8 no breakpoints | P1 |
| Alert vs Toast | ⚠️ MEDIUM | alert() used instead of toast | P2 |
| Loading States | ✅ GOOD | Most pages have loading spinner | — |
| Export Functionality | ✅ PARTIAL | Exists but some not wired | P2 |

---

## 1. FINANCE PAGES AUDIT

### 1.1 Pages Inventory

| Page | Lines | Loading | Error Handling | Mock Data |
|------|-------|---------|----------------|-----------|
| `pages/finance/index.tsx` | 1107 | ✅ | ⚠️ console.error only | 🔴 MOCK_FIN fallback |
| `pages/finance/ledger.tsx` | 1313 | ✅ | ⚠️ console.error only | 🔴 mockLedgerEntries fallback |
| `pages/finance/billing/index.tsx` | 24 | ✅ Redirect | — | Redirects to /billing |
| `pages/finance/invoices.tsx` | ~500 | ✅ | ⚠️ | 🔴 MOCK fallback |
| `pages/finance/expenses/index.tsx` | ~400 | ✅ | ⚠️ | 🔴 MOCK fallback |
| `pages/finance/profit-loss/index.tsx` | ~350 | ✅ | ⚠️ | 🔴 MOCK fallback |
| `pages/hq/finance/index.tsx` | 791 | ✅ | ⚠️ console.error only | 🔴 MOCK_FIN_SUMMARY fallback |
| `pages/hq/finance/revenue.tsx` | ~600 | ✅ | ⚠️ | 🔴 Hardcoded chart data |
| `pages/hq/finance/expenses.tsx` | ~620 | ✅ | ⚠️ | 🔴 Hardcoded chart data |
| `pages/hq/finance/profit-loss.tsx` | ~460 | ✅ | ⚠️ | 🔴 mockPLItems |
| `pages/hq/finance/cash-flow.tsx` | ~580 | ✅ | ⚠️ | ⚠️ Mixed |
| `pages/hq/finance/invoices.tsx` | ~750 | ✅ | ⚠️ | 🔴 Partial payment bug |
| `pages/hq/finance/accounts.tsx` | ~540 | ✅ | ⚠️ | 🔴 Mostly mock |
| `pages/hq/finance/budget.tsx` | ~520 | ✅ | ⚠️ | 🔴 Mock fallback |
| `pages/hq/finance/tax.tsx` | ~540 | ✅ | ⚠️ | 🔴 Wrong PPN rate (11% vs 12%) |

### 1.2 Critical Issues Found

#### Issue F-001: Mock Data Fallback Pattern (CRITICAL)
**Pattern:**
```typescript
// pages/finance/index.tsx line 198
const MOCK_FIN: FinancialData = { totalIncome: 125000000, ... };

// In catch block (line 469-474)
} catch (err) {
  console.error("Error in fetchData:", err);
  setFinancialData(MOCK_FIN);  // 🔴 Falls back to mock SILENTLY
  setInvoiceDebtData(MOCK_DEBT);
  setRecentTransactions(MOCK_RECENT_TX);
  // ... user sees fake data without knowing
}
```

**Risk:** Users make financial decisions based on fake data when DB is slow or fails.

**Affected Files:**
- `pages/finance/index.tsx`
- `pages/finance/ledger.tsx`
- `pages/hq/finance/index.tsx`
- `pages/billing/index.tsx`, `pages/billing/plans.tsx`, `pages/billing/invoices.tsx`
- `pages/billing/analytics.tsx`, `pages/billing/payment-methods.tsx`
- `pages/promo-voucher.tsx`
- `pages/reports/index.tsx`
- `pages/settings/reports/analytics.tsx`
- `pages/settings/store/branches.tsx`
- `pages/employees/schedules.tsx`
- `pages/kitchen/staff.tsx`

**Recommendation:**
1. Show a **visible warning banner** when using fallback data
2. OR remove mock fallback entirely and show proper error state
3. Add `isFromMock` flag and display it clearly

---

#### Issue F-002: PPN Rate Hardcoded Wrong (CRITICAL)
**Location:** `pages/hq/settings/index.tsx` line 84

```typescript
// Current (WRONG — Indonesia PPN is 12% since Jan 2025)
ppn: { enabled: true, rate: 11, ... }

// Should be:
ppn: { enabled: true, rate: 12, ... }
```

**Also in Backend:** `pages/api/hq/finance/tax.ts` line 133 (per FINANCE_MODULE_AUDIT_REPORT.md)

---

#### Issue F-003: Silent Error Handling (HIGH)
**Pattern across ALL finance pages:**

```typescript
} catch (error) {
  console.error('Error fetching data:', error);  // ⚠️ Silent
  // No toast.error(), no setError() shown to user
  setData(MOCK_DATA);  // And then fake data!
}
```

**Recommendation:**
- Use `toast.error()` from `react-hot-toast`
- Set visible error state with retry button
- Example fix pattern:
```typescript
} catch (error) {
  console.error('Error:', error);
  toast.error('Gagal memuat data keuangan');
  setError('Failed to load data');
} finally {
  setLoading(false);
}
```

---

## 2. REPORTS PAGES AUDIT

### 2.1 Pages Inventory

| Page | Status | Export | Charts | Date Picker |
|------|--------|--------|--------|-------------|
| `pages/hq/reports/index.tsx` | ✅ Good | ✅ CSV | ✅ Recharts | ✅ Period selector |
| `pages/hq/reports/finance.tsx` | ✅ Good | ✅ | ✅ ApexCharts | ✅ |
| `pages/hq/reports/sales.tsx` | ✅ Good | ✅ | ✅ ApexCharts | ✅ |
| `pages/hq/reports/inventory.tsx` | ✅ Good | ✅ | ✅ | ✅ |
| `pages/hq/reports/procurement.tsx` | ✅ Good | ✅ | ✅ | ✅ |
| `pages/hq/reports/hris.tsx` | ✅ Good | ✅ | ✅ | ✅ |
| `pages/hq/reports/customers.tsx` | ✅ Good | ✅ | ✅ | ✅ |
| `pages/hq/reports/consolidated.tsx` | ✅ Good | ✅ | ✅ | ✅ |
| `pages/hq/reports/data-analysis.tsx` | ✅ Good | ✅ | ✅ | ✅ |
| `pages/pos/reports.tsx` | ✅ Good | ✅ PDF/Excel/CSV | ⚠️ Progress bars | ✅ Period selector |

### 2.2 Issues Found

#### Issue R-001: Non-Responsive Grid in Reports (HIGH)
**Location:** Multiple reports pages

```typescript
// pages/hq/reports/index.tsx line 281
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

// pages/hq/reports/consolidated.tsx line 326
<div className="grid grid-cols-6 gap-4">  // 🔴 No responsive breakpoints!

// pages/hq/reports/data-analysis.tsx line 161
<div className="mt-4 grid grid-cols-7 gap-2">  // 🔴 7 columns on mobile!
```

**Risk:** Reports unusable on mobile/tablet devices.

**Affected:**
- `pages/hq/reports/consolidated.tsx` (grid-cols-6, grid-cols-5)
- `pages/hq/reports/data-analysis.tsx` (grid-cols-7, grid-cols-5)
- `pages/hq/reports/procurement.tsx` (grid-cols-5)
- `pages/hq/reports/hris.tsx` (grid-cols-6)

---

#### Issue R-002: POS Reports Chart Using Progress Bars Instead of Recharts
**Location:** `pages/pos/reports.tsx` line 269

```typescript
// Currently using manual progress bars:
<div className="bg-gray-200 rounded-full h-8 overflow-hidden">
  <div style={{ width: `${(data.sales / 7000000) * 100}%` }}>...</div>
</div>

// Should use Recharts like other reports for consistency
```

---

## 3. SETTINGS PAGES AUDIT

### 3.1 Pages Inventory

| Page | Status | Form Validation | Saving State |
|------|--------|-----------------|--------------|
| `pages/hq/settings/index.tsx` | ✅ Good | ⚠️ Basic | ✅ hasChanges, saveStatus |
| `pages/hq/settings/taxes.tsx` | ✅ Good | ⚠️ Basic | ✅ |
| `pages/hq/settings/notifications.tsx` | ✅ Good | ⚠️ Basic | ✅ |
| `pages/hq/settings/modules.tsx` | ✅ Good | — | ✅ |
| `pages/hq/settings/integrations/index.tsx` | ✅ Good | ⚠️ Basic | ✅ |
| `pages/settings/index.tsx` | ✅ Good | ⚠️ Basic | ✅ |
| `pages/settings/store.tsx` | ✅ Good | ⚠️ Basic | ✅ |

### 3.2 Issues Found

#### Issue S-001: PPN Rate Default Wrong (CRITICAL)
**Location:** `pages/hq/settings/index.tsx` line 84

```typescript
// Current:
ppn: { enabled: true, rate: 11, ... }  // ❌ 11% is old rate

// Should be (Indonesia PPN = 12% since Jan 2025):
ppn: { enabled: true, rate: 12, ... }  // ✅
```

---

#### Issue S-002: Settings Not Persisted to DB for Some Fields
**Observation:** `pages/hq/settings/index.tsx` fetches from `/api/hq/settings` but the initial state is hardcoded:

```typescript
// Line 82-119: Hardcoded default state
business: {
  name: 'Bedagang Restaurant Group',  // 🔴 Not from DB
  legalName: 'PT Bedagang Indonesia',
  taxId: '01.234.567.8-901.000',
  // ...
}
```

**Recommendation:** Verify API returns and properly populates all fields.

---

## 4. POS & STORE PAGES AUDIT

### 4.1 Pages Inventory

| Page | Lines | Status | Key Features |
|------|-------|--------|--------------|
| `pages/pos/index.tsx` | 508 | ✅ Good | Dashboard, stats, charts (Recharts) |
| `pages/pos/cashier.tsx` | 1896 | ✅ Comprehensive | Cart, payment, members, vouchers, shifts, held transactions |
| `pages/pos/transactions.tsx` | ~400 | ✅ Good | Transaction history |
| `pages/pos/reports.tsx` | 339 | ✅ Good | Sales reports, export |
| `pages/pos/shifts.tsx` | ~400 | ✅ Good | Shift management |
| `pages/pos/shifts-complete.tsx` | ~300 | ✅ Good | Shift closing |
| `pages/pos/settings.tsx` | ~350 | ✅ Good | POS settings |

### 4.2 Transaction Flow Analysis (Cashier Page)

**pages/pos/cashier.tsx** — Complete flow implemented:

```
┌─────────────────────────────────────────────────────────────────┐
│                     POS CASHIER FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. PRODUCT ADDING                                                │
│     ┌──────────┐    ┌──────────────┐    ┌──────────────────┐   │
│     │ Search   │───▶│ Add to Cart  │───▶│ Update Quantity  │   │
│     │ Category │    │              │    │ Remove from Cart │   │
│     └──────────┘    └──────────────┘    └──────────────────┘   │
│                                                                   │
│  2. CUSTOMER / DISCOUNT                                           │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│     │ Walk-in (default)│    │ Member Type  │───▶│ Voucher App  │   │
│     │                  │    │ Name/Phone   │    │ Discount %   │   │
│     └──────────────────┘    └──────────────┘    └──────────────┘   │
│                                                                   │
│  3. PAYMENT PROCESS                                               │
│     ┌──────────────────────────────────────────────────────────┐  │
│     │  Payment Method:                                          │  │
│     │  ┌────────┐  ┌────────┐  ┌────────┐                     │  │
│     │  │  Cash  │  │  Card  │  │  QRIS  │                     │  │
│     │  │        │  │        │  │        │                     │  │
│     │  │ Cash   │  │ Manual │  │ Show   │                     │  │
│     │  │ Received│  │ Enter  │  │ QR Code│                     │  │
│     │  │ Change │  │ Ref    │  │        │                     │  │
│     │  └────────┘  └────────┘  └────────┘                     │  │
│     └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  4. SHIFT MANAGEMENT                                              │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│     │ Open Shift   │───▶│ Track During │───▶│ Close Shift  │   │
│     │ (Cash Float) │    │ Transactions │    │ (Count Cash) │   │
│     └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                   │
│  5. HELD TRANSACTIONS ("Parkir Transaksi")                       │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│     │ Hold Cart    │───▶│ List Held    │───▶│ Resume /     │   │
│     │ (Reason+Name)│    │              │    │ Cancel       │   │
│     └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Issues Found

#### Issue POS-001: Overuse of alert() Instead of toast (MEDIUM)
**Location:** `pages/pos/cashier.tsx` — ~15+ uses of `alert()`

```typescript
// Current pattern (line 129, 151, 197, 201, 216, 222, 311, etc.)
alert('Nama dan nomor telepon harus diisi!');
alert('Member baru berhasil ditambahkan!');
alert('Pembayaran berhasil!\nNo. Transaksi: ...');

// Should use:
import { toast } from 'react-hot-toast';
toast.error('Nama dan nomor telepon harus diisi!');
toast.success('Member baru berhasil ditambahkan!');
```

**Affected Files:**
- `pages/pos/cashier.tsx` (most affected)
- `pages/reservations/index.tsx`
- `pages/promo-voucher.tsx`

**Good Examples (use toast):**
- `pages/driver/index.tsx` uses `toast.success()` and `toast.error()` properly
- `pages/hq/finance/index.tsx` uses `toast.success()` for export

---

#### Issue POS-002: No Dirty State Warning (MEDIUM)
**Location:** `pages/pos/cashier.tsx`

When user has items in cart and navigates away, no warning is shown. Cart is lost.

**Recommendation:** Add `useEffect` with `beforeunload` event:
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (cart.length > 0) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [cart.length]);
```

---

## 5. LOADING STATES & ERROR HANDLING SUMMARY

### 5.1 Loading States — ✅ Good Pattern

Most pages implement loading correctly:

```typescript
// Good pattern (used across all pages)
const [loading, setLoading] = useState(true);

const fetchData = async () => {
  setLoading(true);
  try {
    // ... fetch
  } finally {
    setLoading(false);
  }
};

// In render:
{loading ? (
  <div className="flex items-center justify-center py-16">
    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
  </div>
) : (
  <Content />
)}
```

**Skeleton Loading:** Some pages have it, most don't. Could be improved for perceived performance.

---

### 5.2 Error Handling — ⚠️ Needs Improvement

**Current Bad Pattern (PERVAISIVE):**
```typescript
} catch (error) {
  console.error('Error fetching:', error);  // Silent
  setData(MOCK_DATA);  // User sees fake data!
  // No error visible to user
}
```

**Recommended Good Pattern:**
```typescript
} catch (error) {
  console.error('Error fetching:', error);
  toast.error('Gagal memuat data. Silakan coba lagi.');
  setError('Failed to load data');
  // Optional: Keep mock but SHOW WARNING
  setIsFromMock(true);  // Show "Data: Mock" badge
}
```

---

## 6. RESPONSIVE DESIGN ISSUES

### 6.1 Grid Columns Without Breakpoints

**Problematic patterns found:**

```typescript
// 🔴 No responsive breakpoints — will break on mobile
grid-cols-5
grid-cols-6
grid-cols-7
grid-cols-8

// ✅ Good pattern (has breakpoints)
grid-cols-2 md:grid-cols-3 lg:grid-cols-6
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
```

**Files with non-responsive grids:**

| File | Pattern | Risk |
|------|---------|------|
| `pages/hq/finance/index.tsx:433` | `grid-cols-8` | 8 columns on mobile! |
| `pages/hq/finance/index.tsx:449` | `grid-cols-5` | 5 columns on mobile! |
| `pages/hq/reports/consolidated.tsx:326` | `grid-cols-6` | 6 columns |
| `pages/hq/reports/consolidated.tsx:528` | `grid-cols-5` | 5 columns |
| `pages/hq/reports/data-analysis.tsx:161` | `grid-cols-7` | 7 columns! |
| `pages/hq/reports/procurement.tsx:143` | `grid-cols-5` | 5 columns |
| `pages/hq/suppliers/index.tsx:188` | `grid-cols-5` | 5 columns |
| `pages/hq/purchase-orders/index.tsx:247` | `grid-cols-5` | 5 columns |
| `pages/hq/products/categories.tsx:238` | `grid-cols-5` | 5 columns |
| `pages/employees/schedules.tsx:488` | `grid-cols-7` | Calendar 7 columns |

**Recommendation:** Add `md:` and `lg:` breakpoints:
```typescript
// Before:
grid-cols-8

// After:
grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8
```

---

## 7. PRIORITIZED FIX PLAN

### Phase 1: CRITICAL Fixes (Immediate — 1-2 days)

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| 1 | **Fix PPN rate from 11% to 12%** | `pages/hq/settings/index.tsx` | 5 min |
| 2 | **Add visible mock data indicator** | All finance/billing pages | 4 hours |
| 3 | **Add toast.error() instead of silent console.error** | All finance pages | 3 hours |
| 4 | **Fix responsive grids (add md:/lg: breakpoints)** | All pages with grid-cols-5+ | 2 hours |

### Phase 2: HIGH Priority (Week 1)

| # | Fix | Effort |
|---|-----|--------|
| 5 | Replace `alert()` with `toast.success()/toast.error()` in POS | 2 hours |
| 6 | Add dirty state warning in cashier page | 1 hour |
| 7 | Add skeleton loading states to key pages | 3 hours |
| 8 | Add retry button on error states | 2 hours |

### Phase 3: MEDIUM Priority (Month 1)

| # | Fix | Effort |
|---|-----|--------|
| 9 | Standardize Recharts across all reports pages | 4 hours |
| 10 | Add form validation (required indicators, real-time feedback) | 4 hours |
| 11 | Add input masking (thousand separator) on monetary fields | 3 hours |
| 12 | Add keyboard navigation accessibility | 4 hours |

---

## 8. FILES INVENTORY — DETAILED

### Finance Pages (25+)

**Store-level Finance:**
- `pages/finance/index.tsx` — Dashboard (1107 lines)
- `pages/finance/ledger.tsx` — General Ledger (1313 lines)
- `pages/finance/billing/index.tsx` — Redirect to /billing
- `pages/finance/invoices.tsx` — Invoices
- `pages/finance/expenses/index.tsx` — Expenses
- `pages/finance/expenses/new.tsx` — New expense
- `pages/finance/income.tsx` — Income
- `pages/finance/profit.tsx` — Profit
- `pages/finance/profit-loss/index.tsx` — P&L Statement
- `pages/finance/monthly-report/index.tsx` — Monthly report
- `pages/finance/reports.tsx` — Reports
- `pages/finance/transactions.tsx` — Transactions
- `pages/finance/transfers.tsx` — Transfers
- `pages/finance/hutang.tsx` — Accounts Payable
- `pages/finance/piutang.tsx` — Accounts Receivable
- `pages/finance/settings.tsx` — Finance settings
- `pages/finance/tax/index.tsx` — Tax dashboard
- `pages/finance/tax/ppn.tsx` — PPN (VAT)
- `pages/finance/tax/pph21.tsx` — PPh 21
- `pages/finance/tax/pphbadan.tsx` — PPh Badan
- `pages/finance/tax/invoices.tsx` — Tax invoices
- `pages/finance/tax/integration.tsx` — Tax integration

**HQ-level Finance:**
- `pages/hq/finance/index.tsx` — Dashboard (791 lines)
- `pages/hq/finance/revenue.tsx` — Revenue analysis
- `pages/hq/finance/expenses.tsx` — Expense management
- `pages/hq/finance/profit-loss.tsx` — P&L Statement
- `pages/hq/finance/cash-flow.tsx` — Cash Flow
- `pages/hq/finance/invoices.tsx` — Invoices (755 lines)
- `pages/hq/finance/accounts.tsx` — AR/AP
- `pages/hq/finance/budget.tsx` — Budget
- `pages/hq/finance/tax.tsx` — Tax
- `pages/hq/finance/transactions.tsx` — Transactions
- `pages/hq/finance/ai-guardian.tsx` — AI Guardian (new)

### Billing & Subscription Pages
- `pages/billing/index.tsx` — Subscription dashboard
- `pages/billing/plans.tsx` — Plans selection
- `pages/billing/invoices.tsx` — Billing invoices
- `pages/billing/analytics.tsx` — Usage analytics
- `pages/billing/payment-methods.tsx` — Payment methods

### Reports Pages
- `pages/hq/reports/index.tsx` — Reports hub (530 lines)
- `pages/hq/reports/finance.tsx` — Finance reports
- `pages/hq/reports/sales.tsx` — Sales reports
- `pages/hq/reports/inventory.tsx` — Inventory reports
- `pages/hq/reports/procurement.tsx` — Procurement reports
- `pages/hq/reports/hris.tsx` — HRIS reports
- `pages/hq/reports/customers.tsx` — Customer reports
- `pages/hq/reports/consolidated.tsx` — Consolidated reports
- `pages/hq/reports/data-analysis.tsx` — Data analysis

### POS Pages
- `pages/pos/index.tsx` — POS Dashboard (508 lines)
- `pages/pos/cashier.tsx` — Cashier / Transaction (1896 lines) **COMPREHENSIVE**
- `pages/pos/transactions.tsx` — Transaction history
- `pages/pos/transaksi.tsx` — Legacy transaction
- `pages/pos/reports.tsx` — POS Reports (339 lines)
- `pages/pos/shifts.tsx` — Shift management
- `pages/pos/shifts-complete.tsx` — Shift closing
- `pages/pos/settings.tsx` — POS settings
- `pages/pos/history.tsx` — History
- `pages/pos/receipts.tsx` — Receipts
- `pages/pos/discounts.tsx` — Discounts
- `pages/pos/tables.tsx` — Tables
- `pages/pos/inventory.tsx` — Inventory
- `pages/pos/new-order.tsx` — New order

### Settings Pages
- `pages/hq/settings/index.tsx` — Global Settings (856 lines)
- `pages/hq/settings/taxes.tsx` — Tax settings
- `pages/hq/settings/notifications.tsx` — Notification settings
- `pages/hq/settings/modules.tsx` — Module management
- `pages/hq/settings/integrations/index.tsx` — Integrations hub
- `pages/settings/index.tsx` — Store settings
- `pages/settings/store.tsx` — Store profile
- `pages/settings/store/branches.tsx` — Branch management
- `pages/settings/users.tsx` — User management
- `pages/settings/users/roles.tsx` — Roles & permissions
- `pages/settings/inventory.tsx` — Inventory settings
- `pages/settings/notifications.tsx` — Notifications
- `pages/settings/security.tsx` — Security settings
- `pages/settings/hardware.tsx` — Hardware settings
- `pages/settings/backup.tsx` — Backup settings
- `pages/settings/receipt-designer.tsx` — Receipt designer
- `pages/settings/recipes.tsx` — Recipes

---

## 9. QUICK WINS — 1-HOUR FIXES

These can be fixed immediately:

### Quick Win 1: Fix PPN Rate (5 min)
```typescript
// pages/hq/settings/index.tsx line 84
// Change: rate: 11 → rate: 12
ppn: { enabled: true, rate: 12, includeInPrice: false, applyToAllBranches: true }
```

### Quick Win 2: Add Mock Indicator Badge (30 min)
Add `isFromMock` state and display badge in all finance pages:

```typescript
const [isFromMock, setIsFromMock] = useState(false);

// In catch block:
} catch (err) {
  console.error('Error:', err);
  setIsFromMock(true);  // Set flag
  setData(MOCK_DATA);
  toast.error('Gagal memuat data — menggunakan data fallback');
}

// In render, near data:
{isFromMock && (
  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-600 rounded-full">
    <FaInfoCircle className="inline mr-1" />Data: Fallback
  </span>
)}
```

### Quick Win 3: Replace alert() with toast() in POS Cashier (1 hour)
Find and replace ~15 `alert(` calls with `toast.success()` or `toast.error()`.

---

## END OF REPORT

**Generated:** 2 Juli 2026  
**Next Steps:** Apply Quick Wins first, then proceed with Phase 1 fixes.  
**Output:** This document (`FE-FINANCE-REPORT.md`)
