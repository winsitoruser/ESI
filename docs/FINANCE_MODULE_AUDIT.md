# Finance Module Audit & Development
Generated: 2026-02-23

## 📊 Overview

Complete audit and enhancement of the HQ Finance module including revenue tracking, expense management, profit & loss statements, cash flow monitoring, invoices, accounts, budget management, and tax reporting.

---

## 🗂️ Pages Analyzed

### 1. Finance Dashboard (`/hq/finance`)
**File**: `pages/hq/finance/index.tsx` (27,379 bytes)

#### Features
- [x] Financial summary (revenue, expenses, profit, margins)
- [x] Branch financial performance comparison
- [x] Recent transactions list
- [x] Period selector (day, week, month, quarter, year)
- [x] Branch filter
- [x] Charts (revenue trend, expense breakdown)
- [x] Quick links to sub-modules

---

### 2. Revenue (`/hq/finance/revenue`)
**File**: `pages/hq/finance/revenue.tsx` (26,979 bytes)

#### Features
- [x] Revenue by channel (Dine-in, Takeaway, Delivery)
- [x] Revenue by branch
- [x] Daily/weekly/monthly trends
- [x] Top products by revenue
- [x] Growth analysis

---

### 3. Expenses (`/hq/finance/expenses`)
**File**: `pages/hq/finance/expenses.tsx` (32,792 bytes)

#### Features
- [x] Expense categories (COGS, Payroll, Utilities, etc.)
- [x] Expense by branch
- [x] Vendor payments
- [x] Expense approval workflow
- [x] Budget vs actual comparison

---

### 4. Profit & Loss (`/hq/finance/profit-loss`)
**File**: `pages/hq/finance/profit-loss.tsx` (22,213 bytes)

#### Features
- [x] Income statement format
- [x] Period comparison (MoM, YoY)
- [x] Branch P&L breakdown
- [x] Expandable line items
- [x] Multiple view modes (statement, branch, trend)

---

### 5. Cash Flow (`/hq/finance/cash-flow`)
**File**: `pages/hq/finance/cash-flow.tsx` (27,899 bytes)

#### Features
- [x] Operating/Investing/Financing activities
- [x] Bank account balances
- [x] Cash flow items list
- [x] Cash forecast
- [x] Free cash flow calculation

---

### 6. Invoices (`/hq/finance/invoices`)
**File**: `pages/hq/finance/invoices.tsx` (32,776 bytes)

#### Features
- [x] Invoice list with filters
- [x] Invoice creation
- [x] Payment tracking
- [x] Aging analysis
- [x] Overdue alerts

---

### 7. Accounts (`/hq/finance/accounts`)
**File**: `pages/hq/finance/accounts.tsx` (30,515 bytes)

#### Features
- [x] Chart of accounts
- [x] Account balances
- [x] Journal entries
- [x] Account reconciliation

---

### 8. Budget (`/hq/finance/budget`)
**File**: `pages/hq/finance/budget.tsx` (24,188 bytes)

#### Features
- [x] Budget planning
- [x] Budget vs actual
- [x] Variance analysis
- [x] Department/branch budgets

---

### 9. Tax (`/hq/finance/tax`)
**File**: `pages/hq/finance/tax.tsx` (25,037 bytes)

#### Features
- [x] Tax summary (PPh, PPN)
- [x] Tax calculations
- [x] Tax payment schedule
- [x] Tax reports

---

## 🔧 API Endpoints

### Existing Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hq/finance/summary` | GET | Dashboard summary |
| `/api/hq/finance/revenue` | GET | Revenue data |
| `/api/hq/finance/expenses` | GET | Expense data |
| `/api/hq/finance/profit-loss` | GET | P&L statement |
| `/api/hq/finance/cash-flow` | GET | Cash flow data |
| `/api/hq/finance/invoices` | GET/POST | Invoice management |
| `/api/hq/finance/accounts` | GET | Chart of accounts |
| `/api/hq/finance/budget` | GET/POST | Budget management |
| `/api/hq/finance/tax` | GET | Tax calculations |

### New Endpoints Created

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hq/finance/realtime` | GET | Real-time financial data |
| `/api/hq/finance/realtime` | POST | Broadcast finance updates |
| `/api/hq/finance/export` | GET | Export financial data |

### Export Types

| Type | Endpoint | Data |
|------|----------|------|
| Profit & Loss | `?type=profit-loss` | P&L statement |
| Cash Flow | `?type=cash-flow` | Cash flow statement |
| Revenue | `?type=revenue` | Revenue breakdown |
| Expenses | `?type=expenses` | Expense details |
| Invoices | `?type=invoices` | Invoice list |
| Budget | `?type=budget` | Budget vs actual |
| Tax | `?type=tax` | Tax summary |
| Branches | `?type=branches` | Branch performance |

---

## 📐 Financial Formulas & Calculations

### Profit & Loss Calculations
```typescript
// Gross Profit
Gross Profit = Revenue - COGS
Gross Margin = (Gross Profit / Revenue) × 100

// Operating Income
Operating Income = Gross Profit - Operating Expenses
Operating Margin = (Operating Income / Revenue) × 100

// EBITDA
EBITDA = Operating Income + Depreciation + Amortization

// Net Income
Income Before Tax = Operating Income + Other Income - Other Expenses - Interest
Tax Expense = Income Before Tax × Tax Rate (25%)
Net Income = Income Before Tax - Tax Expense
Net Margin = (Net Income / Revenue) × 100
```

### Cash Flow Calculations
```typescript
// Operating Cash Flow
Operating Cash Flow = Operating Inflows - Operating Outflows

// Free Cash Flow
Free Cash Flow = Operating Cash Flow - Capital Expenditures

// Net Cash Flow
Net Cash Flow = Operating + Investing + Financing Cash Flows

// Closing Balance
Closing Balance = Opening Balance + Net Cash Flow

// Cash Burn Rate
Cash Burn Rate = |Negative Monthly Cash Flow|

// Runway
Runway (months) = Cash Balance / Cash Burn Rate
```

### Financial Ratios
```typescript
// Profitability
ROA = (Net Income / Total Assets) × 100
ROE = (Net Income / Total Equity) × 100

// Liquidity
Current Ratio = Current Assets / Current Liabilities
Quick Ratio = (Current Assets - Inventory) / Current Liabilities

// Efficiency
Days Inventory = Inventory / (COGS / 365)
Days Receivables = Receivables / (Revenue / 365)
Days Payables = Payables / (COGS / 365)
Cash Conversion Cycle = Days Inventory + Days Receivables - Days Payables

// Leverage
Debt Ratio = Total Liabilities / Total Assets
Debt to Equity = Total Liabilities / Total Equity
Interest Coverage = EBIT / Interest Expense
```

### Growth Calculations
```typescript
// Period Growth
Growth % = ((Current - Previous) / Previous) × 100

// CAGR (Compound Annual Growth Rate)
CAGR = (End Value / Start Value)^(1/years) - 1
```

### Budget Variance
```typescript
// Variance
Variance = Budgeted - Actual
Variance % = (Variance / Budgeted) × 100

// Status
if Variance % > 5: Under Budget (Good for expenses)
if Variance % < -5: Over Budget (Bad for expenses)
else: On Track
```

### Tax Calculations
```typescript
// PPh Badan (Corporate Income Tax)
Taxable Income = Gross Revenue - Deductible Expenses
Tax Payable = Taxable Income × 22%

// PPN (VAT)
PPN = Sales × 11%

// PPh 21 (Employee Income Tax)
// Based on progressive rates

// PPh 23 (Withholding Tax)
PPh 23 = Service Fee × 2%
```

---

## 📈 Database Tables

### Finance Transactions
```sql
finance_transactions
├── id (UUID, PK)
├── tenant_id (UUID, FK)
├── branch_id (UUID, FK)
├── transaction_date (DATE)
├── type (ENUM: income, expense, transfer)
├── category (VARCHAR)
├── description (TEXT)
├── amount (DECIMAL)
├── reference_number (VARCHAR)
├── status (ENUM: completed, pending, cancelled)
├── payment_method (VARCHAR)
├── account_id (UUID, FK)
├── created_by (UUID, FK)
└── created_at, updated_at
```

### Invoices
```sql
invoices
├── id (UUID, PK)
├── tenant_id (UUID, FK)
├── invoice_number (VARCHAR)
├── invoice_date (DATE)
├── due_date (DATE)
├── customer_id (UUID, FK)
├── subtotal (DECIMAL)
├── tax_amount (DECIMAL)
├── total_amount (DECIMAL)
├── status (ENUM: draft, sent, paid, overdue, cancelled)
├── payment_date (DATE)
├── notes (TEXT)
└── created_at, updated_at
```

### Accounts (Chart of Accounts)
```sql
accounts
├── id (UUID, PK)
├── tenant_id (UUID, FK)
├── account_code (VARCHAR)
├── account_name (VARCHAR)
├── account_type (ENUM: asset, liability, equity, revenue, expense)
├── parent_id (UUID, FK → accounts)
├── balance (DECIMAL)
├── is_active (BOOLEAN)
└── created_at, updated_at
```

### Budgets
```sql
budgets
├── id (UUID, PK)
├── tenant_id (UUID, FK)
├── branch_id (UUID, FK)
├── category (VARCHAR)
├── period (DATE)
├── budgeted_amount (DECIMAL)
├── actual_amount (DECIMAL)
├── variance (DECIMAL)
├── notes (TEXT)
└── created_at, updated_at
```

---

## 🔌 WebSocket Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `finance:revenue:update` | Revenue changed | POS transaction |
| `finance:expense:update` | Expense recorded | Payment posted |
| `finance:cashflow:update` | Cash position changed | Transaction completed |
| `finance:invoice:update` | Invoice status changed | Payment received |
| `finance:alert` | Financial alert | Threshold breached |

### Integration Flow
```
[POS Transaction Complete]
       │
       └─→ finance:revenue:update ─→ [Finance Dashboard]
                                            │
                                    ┌───────┴───────┐
                                    ▼               ▼
                             [Update P&L]   [Update Cash Flow]
                                    │
                                    ▼
                            [Branch Performance]

[Expense Posted]
       │
       └─→ finance:expense:update ─→ [Budget Check]
                                            │
                                    ┌───────┴───────┐
                                    ▼               ▼
                            [Update P&L]   [Budget Alert]
```

---

## 🔄 Branch Integration

### Data Aggregation
```
[Branch 1] ─┐
[Branch 2] ─┼─→ [HQ Finance] ─→ Consolidated Reports
[Branch 3] ─┤
[Branch N] ─┘
```

### Revenue Sources
| Source | Integration |
|--------|-------------|
| POS Sales | Direct from pos_transactions |
| Online Orders | GoFood, GrabFood, ShopeeFood |
| Catering | Custom orders |
| B2B Sales | Invoices |

### Expense Categories
| Category | Examples |
|----------|----------|
| COGS | Raw materials, packaging, direct labor |
| Payroll | Salaries, bonuses, benefits |
| Rent | Store rent, warehouse rent |
| Utilities | Electricity, water, gas, internet |
| Marketing | Ads, promotions, events |
| Operations | Supplies, maintenance, insurance |

---

## ✅ Audit Checklist

### Frontend Pages
- [x] Finance Dashboard
- [x] Revenue Analysis
- [x] Expense Management
- [x] Profit & Loss Statement
- [x] Cash Flow Statement
- [x] Invoice Management
- [x] Chart of Accounts
- [x] Budget Management
- [x] Tax Reporting

### Backend APIs
- [x] Summary API
- [x] Revenue API
- [x] Expenses API
- [x] Profit-Loss API
- [x] Cash Flow API
- [x] Invoices API
- [x] Accounts API
- [x] Budget API
- [x] Tax API
- [x] Real-time API (NEW)
- [x] Export API (NEW)

### Calculations
- [x] Gross Profit / Margin
- [x] Operating Income / Margin
- [x] EBITDA
- [x] Net Income / Margin
- [x] Cash Flow (Operating/Investing/Financing)
- [x] Free Cash Flow
- [x] Financial Ratios
- [x] Budget Variance
- [x] Tax Calculations
- [x] Growth Rates

### Integration
- [x] POS data aggregation
- [x] Branch consolidation
- [x] WebSocket events
- [x] Export functionality

---

## 📝 Finance Calculator Library

**File**: `lib/hq/finance-calculator.ts`

### Exported Functions
- `calculateProfitLoss(input)` - P&L calculation
- `calculateCashFlow(input)` - Cash flow calculation
- `calculateFinancialRatios(input)` - All financial ratios
- `calculateBudgetVariance(budgeted, actual)` - Budget analysis
- `calculateTax(revenue, expenses, rate)` - Tax calculation
- `calculateGrowth(current, previous)` - Period growth
- `calculateCAGR(start, end, years)` - Compound growth
- `calculateBranchPerformance(...)` - Branch metrics
- `calculateInvoiceAging(invoices)` - AR aging

---

## 🚀 Summary

| Component | Status |
|-----------|--------|
| Finance Dashboard | ✅ Complete |
| Revenue Page | ✅ Complete |
| Expenses Page | ✅ Complete |
| Profit & Loss | ✅ Complete |
| Cash Flow | ✅ Complete |
| Invoices | ✅ Complete |
| Accounts | ✅ Complete |
| Budget | ✅ Complete |
| Tax | ✅ Complete |
| Finance Calculator | ✅ NEW - Created |
| Real-time API | ✅ NEW - Created |
| Export API | ✅ NEW - Created |
| WebSocket Events | ✅ Complete |
| Branch Integration | ✅ Complete |

**FINANCE MODULE: ✅ AUDIT COMPLETE**
