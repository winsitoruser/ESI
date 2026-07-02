# 🛒 E-Procurement Module Analysis

**Date:** 2026-06-28  
**Branch:** New-Backend-Nainerp  
**Analyst:** Hermes Agent  

---

## 1. Module Structure

### 1.1 Frontend Pages (pages/hq/e-procurement/)

| File | Size | Description |
|------|------|-------------|
| `pages/hq/e-procurement/index.tsx` | 748 lines / 62 KB | **Single monolithic page** — all tabs rendered in one file |

### 1.2 API Endpoints (pages/api/hq/e-procurement/)

**⚠️ CRITICAL: No API handler exists.**

The frontend calls `fetch('/api/hq/e-procurement?action=...')` via `eprFetch()` in `shared.tsx` (line 114), but there is **no corresponding file** at:
- `pages/api/hq/e-procurement.ts`
- `pages/api/hq/e-procurement/index.ts`
- `pages/api/hq/e-procurement/*.ts`

All data operations fall back to hardcoded mock data. **The entire module is display-only with no backend.**

### 1.3 Procurement Components

| File | Size | Description |
|------|------|-------------|
| `components/procurement/shared.tsx` | 584 lines / 28 KB | Shared UI kit: types, formatters, Status Colors (`SC`), `Badge`, `StarRating`, `ScoreBar`, `GradientStatCard`, `MiniStatCard`, `ProgressBar`, `Toolbar`, `DataTable`, `DetailDrawer`, `CreateModal`, `FormInput`, `FormTextarea`, `FormSelect`, `ApprovalTimeline`, `AuditTrailList`, `SectionHeader`, `InfoRow`, `EmptyState`, `eprFetch()` |
| `components/procurement/PortalLayout.tsx` | 181 lines / 8.7 KB | **Vendor-facing portal layout** (separate from HQ) — login/register nav, mobile menu, user menu |

### 1.4 Models (10 files)

| Model | Table | Key Fields | Associations |
|-------|-------|------------|-------------|
| `EprVendor.js` | `epr_vendors` | vendor_code, name, legal_name, vendor_type, category, status, npwp, nib, bank info, rating, total_orders, total_spend, certifications (JSONB), documents (JSONB), tags (JSONB) | hasMany: RfqResponse, TenderBid, Contract, Evaluation |
| `EprRfq.js` | `epr_rfqs` | rfq_number, title, status (draft→published→closed→awarded→cancelled), category, publish_date, closing_date, estimated_budget, currency, invited_vendors (JSONB), attachments (JSONB) | hasMany: RfqItem, RfqResponse |
| `EprRfqItem.js` | `epr_rfq_items` | rfq_id, product_id, item_name, specification, quantity, uom, estimated_price | belongsTo: Rfq |
| `EprRfqResponse.js` | `epr_rfq_responses` | rfq_id, vendor_id, status (submitted→under_review→shortlisted→awarded→rejected), total_price, delivery_days, technical_score, price_score, total_score, item_prices (JSONB), attachments (JSONB) | belongsTo: Rfq, Vendor |
| `EprTender.js` | `epr_tenders` | tender_number, title, tender_type (open/selective/direct), status (draft→announcement→registration→submission→evaluation→negotiation→awarded→completed→cancelled), estimated_value, evaluation_criteria (JSONB), committee_members (JSONB), requirements (JSONB), documents (JSONB), winner_id, winner_name | hasMany: TenderBid |
| `EprTenderBid.js` | `epr_tender_bids` | tender_id, vendor_id, bid_number, status (submitted→qualified→disqualified→shortlisted→winner→runner_up), bid_amount, technical_score, price_score, total_score, documents (JSONB), evaluation_notes | belongsTo: Tender, Vendor |
| `EprProcurementRequest.js` | `epr_procurement_requests` | request_number, title, status (draft→submitted→approved→rejected→in_process→fulfilled→cancelled), priority, department, needed_date, estimated_budget, items (JSONB), attachments (JSONB), approval_flow (JSONB) | — |
| `EprContract.js` | `epr_contracts` | contract_number, title, vendor_id, contract_type (purchase/service/framework/blanket), status (draft→active→expired→terminated→renewed), start_date, end_date, total_value, used_value, auto_renew, penalty_clause, documents (JSONB) | belongsTo: Vendor |
| `EprEvaluation.js` | `epr_evaluations` | vendor_id, evaluation_period, quality_score, delivery_score, price_score, service_score, compliance_score, overall_score, grade (A–F), action_items (JSONB) | belongsTo: Vendor |
| `EprSetting.js` | `epr_settings` | tenant_id, setting_key, setting_value (JSONB), description | — |

### 1.5 Database Migration

`migrations/20260220-create-e-procurement-tables.js` creates all 10 tables with proper foreign key references (CASCADE deletes where appropriate). Some column names differ slightly from the model definitions (e.g., migration has `winner_vendor_id` vs model has `winnerId`).

### 1.6 Mock Data

`lib/hq/mock-data.ts` (lines 68–159) contains 15 `MOCK_EPR_*` exports:

| Export | Type | Purpose |
|--------|------|---------|
| `MOCK_EPR_DASHBOARD` | Object | Dashboard stats + top vendors |
| `MOCK_EPR_VENDORS` | Array (3) | Vendor listings |
| `MOCK_EPR_RFQS` | Array (2) | RFQ listings |
| `MOCK_EPR_TENDERS` | Array (2) | Tender listings |
| `MOCK_EPR_PROC_REQUESTS` | Array (2) | Procurement requests |
| `MOCK_EPR_CONTRACTS` | Array (2) | Contract listings |
| `MOCK_EPR_EVALUATIONS` | Array (2) | Vendor evaluations |
| `MOCK_EPR_PURCHASE_ORDERS` | Array (2) | Purchase orders |
| `MOCK_EPR_GOODS_RECEIPTS` | Array (2) | Goods receipt notes |
| `MOCK_EPR_INVOICES` | Array (2) | Invoices |
| `MOCK_EPR_APPROVALS` | Array (2) | Approval queue |
| `MOCK_EPR_BUDGETS` | Array (2) | Budget allocations |
| `MOCK_EPR_AUDIT` | Array (2) | Audit trail |
| `MOCK_EPR_ANALYTICS` | Object | Analytics data |
| `MOCK_EPR_SETTINGS` | Array (2) | Module settings |

### 1.7 Sidebar Configuration (`config/sidebar.config.ts`)

Module registered at line 445 with 8 sub-navigation items:
1. **Dasbor** → `/hq/e-procurement` (tab=dashboard)
2. **Vendor** → `/hq/e-procurement?tab=vendors`
3. **Permintaan** → `/hq/e-procurement?tab=procurement-requests`
4. **RFQ** → `/hq/e-procurement?tab=rfqs`
5. **Tender** → `/hq/e-procurement?tab=tenders`
6. **Kontrak** → `/hq/e-procurement?tab=contracts`
7. **Evaluasi Vendor** → `/hq/e-procurement?tab=evaluations`
8. **Analitik** → `/hq/e-procurement?tab=analytics`

Missing sidebar items (tabs that exist in the page but have no sidebar entry): Purchase Orders, Goods Receipts, Invoices, Approvals, Budget, Audit Trail, Settings.

### 1.8 Permissions (`lib/permissions/permissions-catalog.ts`)

Module code: `e_procurement`  
Operations: `crud('e_procurement')` + `approve` + `bid`  
Route: `/hq/e-procurement`  
Assigned to roles via sidebar config: `super_admin`, `owner`, `hq_admin`, `admin`, `manager`

---

## 2. Business Flows

### 2.1 Vendor Management
- **Flow:** Register → Approve → Active (or Blacklist)
- **Model:** `EprVendor` with status lifecycle: `pending_approval` → `active` | `inactive` | `blacklisted`
- **Frontend:** Vendor tab with full CRUD, star rating, spend tracking
- **Portal:** Separate vendor-facing registration/login at `/procurement/register` and `/procurement/login`

### 2.2 Procurement Request (PR)
- **Flow:** Draft → Submitted → Approved/Rejected → In Process → Fulfilled → Cancelled
- **Model:** `EprProcurementRequest` with approval_flow (JSONB), items (JSONB)
- **Frontend:** PR tab with Create modal (title, description, department, priority, estimated budget, needed date)

### 2.3 RFQ
- **Flow:** Draft → Published → Closed → Awarded → Cancelled
- **Model:** `EprRfq` + `EprRfqItem` + `EprRfqResponse` — supports invited vendors, evaluation criteria, scoring
- **Frontend:** RFQ tab with create modal; responses tracked with technical/price scoring

### 2.4 Tenders
- **Flow:** Draft → Announcement → Registration → Submission → Evaluation → Negotiation → Awarded → Completed → Cancelled
- **Model:** `EprTender` + `EprTenderBid` — supports open/selective/direct tenders, evaluation criteria, committee members
- **Frontend:** Tender tab with create modal; winning vendor tracking

### 2.5 Purchase Orders
- **Flow:** Draft → Approved → Sent → Partial Received → Completed → Cancelled
- **No dedicated model** — appears only in mock data and UI
- **Frontend:** PO tab with detail drawer showing items, approval flow, audit trail

### 2.6 Goods Receipts (GRN)
- **Flow:** Draft → Confirmed/Rejected
- **No dedicated model** — appears only in mock data and UI
- **Frontend:** GRN tab linking to PO, with item-level receive/reject tracking

### 2.7 Invoices
- **Flow:** Draft → Submitted → Approved → Paid → Overdue
- **No dedicated model** — appears only in mock data and UI
- **Frontend:** Invoice tab with 3-way matching display (PO ↔ GRN ↔ Invoice)

### 2.8 Contracts
- **Flow:** Draft → Active → Expired/Terminated/Renewed
- **Model:** `EprContract` with auto-renew, penalty clause, used_value tracking, renewal notice
- **Frontend:** Contracts tab with detail drawer

### 2.9 Vendor Evaluations
- **Flow:** Create evaluation → Score (quality/delivery/price/service/compliance) → Grade (A–F)
- **Model:** `EprEvaluation` with per-period scoring and action items
- **Frontend:** Evaluations tab with score bars and letter grades

### 2.10 Approval Framework
- **Hardcoded workflow definitions** (settings tab):
  - PO: Dept Manager → Finance Manager → Director (if > Rp 50Jt)
  - PR: Dept Head → Procurement Manager
  - Invoice: AP Clerk → Finance Manager → CFO (if > Rp 100Jt)
- **No real approval engine** — workflows are display-only text

---

## 3. User Journey

### Role Flow

```
Staff/Requestor                      Procurement Manager                    Director
    │                                       │                                  │
    ├─ Create PR (draft) ──────────────────┤                                  │
    │  Submit PR                            │                                  │
    │                                       ├─ Review PR ─────────────────────┤
    │                                       │  Approve/Reject                 │  Approve (high value)
    │                                       │                                  │
    │                                       ├─ Create RFQ/Tender              │
    │                                       │  Publish                        │
    │                                       │  Evaluate responses/bids        │
    │                                       │  Award                          │
    │                                       │                                  │
    │                                       ├─ Create PO                      │
    │                                       │  Send to vendor                 │
    │                                       │                                  │
    ├─ Receive goods ──────────────────────┤                                  │
    │  Create GRN                           │                                  │
    │                                       ├─ Match Invoice (3-way)          │
    │                                       │  Approve payment                │
    │                                       │                                  │
    │                                       ├─ Evaluate vendor                │
    │                                       │  Manage contracts               │
    │                                       │  Monitor budget                 │
```

### Current UX
- **HQ users:** Access via sidebar → all tabs in one monolithic page within `HQLayout`
- **Vendors:** Separate portal at `/procurement/*` with `PortalLayout` — register, login, view tenders/RFQs, submit bids
- No deep-linking to specific entities (all data loads on page mount)

---

## 4. Technical Findings

### 🔴 CRITICAL: Missing API Handler
- **`eprFetch()`** in `shared.tsx` calls `/api/hq/e-procurement?action=...&page=...&limit=...`
- **No file exists** under `pages/api/hq/e-procurement*`
- All data currently comes from mock data (`MOCK_EPR_*`)
- Error handling catches failures silently (console.error only) and falls back to mock data

### 🟡 Monolithic Page Architecture
- `pages/hq/e-procurement/index.tsx` = 748 lines, 62 KB
- All 15 tabs rendered in a single switch/case block
- State management uses individual `useState` hooks per entity (22+ state variables)
- No lazy loading — all states initialized with mock data upfront
- Create modal renders all 8 entity forms inline via `activeTab` switch

### 🟡 Field Name Inconsistencies
- Mock data uses `estimated_value` and `budget` for RFQ/Tenders, but DataTable columns reference `estimated_budget` and `estimated_value`
- Mock data property names don't always follow camelCase/snake_case consistently (e.g., `due_date` vs `closing_date` vs `submission_deadline`)
- The `detail drawer` for generic entities (vendors/contracts/rfqs/tenders) dumps raw object keys as labels — fragile and unstyled for nested data

### 🟡 Missing Sequelize Models
The UI renders tabs for **Purchase Orders**, **Goods Receipts**, **Invoices**, **Approvals**, **Budget** — but there are **no Sequelize models** for these entities:
- No `EprPurchaseOrder`
- No `EprGoodsReceipt`
- No `EprInvoice`
- No `EprApproval`
- No `EprBudget`

These appear only as mock data and DataTable definitions.

### 🟢 Strong Model Design
- All 10 models use UUID primary keys, JSONB for flexible data, proper snake_case mappings
- Associated models have bidirectional relationships (belongsTo/hasMany)
- Migration creates proper foreign key constraints with CASCADE deletes

### 🟢 Rich Status System
The `SC` (Status Colors) map in `shared.tsx` covers 30+ status values with consistent color theming — indicates careful UX design thinking.

### 🟢 Localization Support
Module uses `useTranslation()` with translations found in 4 languages (Indonesian, English, Japanese, Chinese) in `lib/translations/hq.ts`.

---

## 5. UX Findings

### ✅ Strong Points
- Gradient stat cards with hover effects and trend indicators
- Consistent badge/status color system
- Responsive table with pagination
- Slide-in detail drawer with structured layouts for PO/Invoice/GRN
- 3-way matching visualization for invoices
- Vendor portal is separate and well-structured
- Empty states and loading spinners throughout

### ❌ Issues
1. **No real data** — everything is mock; users see fictional data
2. **No save confirmation** on create/delete besides toast — no optimistic UI
3. **Generic detail drawer** for vendors/contracts/rfqs/tenders shows raw key-value pairs instead of structured layouts
4. **No search/filter on API** — search and status filter only work on the frontend with mock data
5. **No file upload UI** for attachments/documents (models support JSONB arrays)
6. **Create forms require raw UUIDs** — Vendor ID and PO ID fields ask users to type UUIDs instead of providing pickers
7. **No real-time updates** — user must click refresh to see changes
8. **No export/print** functionality despite icons in imports

---

## 6. Prioritized Fix List

### 🔴 P0 — Must Fix Before Launch

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | **Create API handler** at `pages/api/hq/e-procurement.ts` — single handler dispatching by `action` param, with Sequelize CRUD for all 10 models | Module is non-functional (demo only) | Large |
| 2 | **Add Sequelize models** for Purchase Orders, Goods Receipts, Invoices, Approvals, Budget (+ corresponding migrations) | Users can't create/read these core entities | Medium |
| 3 | **Create API endpoint** for dashboard aggregation (counts, totals, top vendors) | Dashboard shows static mock data | Medium |

### 🟡 P1 — High Priority

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 4 | **Implement real approval workflow engine** (model + API + integration with entity status transitions) | PR/PO/Invoice approval is mock-only | Large |
| 5 | **Refactor monolithic page** — split into tab-specific components (`ProcurementDashboard.tsx`, `VendorList.tsx`, `RfqList.tsx`, etc.) | Maintainability suffers at 62KB | Medium |
| 6 | **Add file upload API** for attachments/documents (Vendor docs, RFQ attachments, Contract documents) | Users can't upload supporting files | Medium |
| 7 | **Fix create modal** — replace raw UUID inputs with lookup/autocomplete pickers for Vendor, PO, etc. | Terrible UX for real use | Small |

### 🟢 P2 — Medium Priority

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 8 | **Add API-level search & pagination** — current `search` and `statusFilter` only filter mock data client-side | No real search capability | Medium |
| 9 | **Add export** (CSV/Excel) for all data tables | Missing business requirement | Small |
| 10 | **Implement proper detail drawers** for vendors, contracts, RFQs, tenders (structured layouts, not raw key-value dump) | Professional presentation | Small |
| 11 | **Add sidebar links** for remaining tabs: Purchase Orders, Goods Receipts, Invoices, Approvals, Budget, Audit Trail, Settings | Users can't navigate directly | Small |
| 12 | **Add 3-way match engine** — actual logic comparing PO ↔ GRN ↔ Invoice quantities/prices | Core procurement feature | Medium |

### 🔵 P3 — Nice to Have

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 13 | **Add notification system** — email/notif when RFQ awarded, contract expiring, approval needed | User engagement | Medium |
| 14 | **Audit trail integration** — auto-log all create/update/delete operations to audit table | Compliance | Medium |
| 15 | **Add performance analytics** with real charts (recharts is already in vendor chunks) | Data-driven decisions | Medium |
| 16 | **Budget monitoring** — alert when spending approaches allocation threshold | Cost control | Small |
| 17 | **Add real-time updates** via polling or WebSocket | Freshness | Medium |
| 18 | **i18n completeness review** — verify all UI strings have translation entries | Internationalization | Small |

---

## 7. Summary

**The E-Procurement module has a solid foundation:**
- Well-designed Sequelize models covering vendor management, RFQ, tenders, procurement requests, contracts, and evaluations
- Comprehensive migration with proper foreign keys
- Rich frontend UI with 15 functional tabs
- Separate vendor portal for external supplier interaction
- Permission system integration

**However, the module is fundamentally incomplete:**
- **No API backend** — zero backend code exists; everything is mock-driven
- **5 core entities** (PO, GRN, Invoice, Approval, Budget) have no database models
- **No real approval workflow** — workflows are text-only descriptions
- **No file upload** — attachments are in the schema but not implementable
- **Monolithic 62KB page** needs componentization

**Estimated effort to production-ready: 3-4 weeks** (1 week for API + missing models, 1 week for approval engine, 1 week for UX polish + file upload, 1 week for testing + fixes).

---

## 8. Files Examined

| # | File | Lines |
|---|------|-------|
| 1 | `pages/hq/e-procurement/index.tsx` | 748 |
| 2 | `components/procurement/shared.tsx` | 584 |
| 3 | `components/procurement/PortalLayout.tsx` | 181 |
| 4 | `models/EprVendor.js` | 51 |
| 5 | `models/EprRfq.js` | 38 |
| 6 | `models/EprRfqItem.js` | 23 |
| 7 | `models/EprRfqResponse.js` | 32 |
| 8 | `models/EprTender.js` | 39 |
| 9 | `models/EprTenderBid.js` | 31 |
| 10 | `models/EprProcurementRequest.js` | 32 |
| 11 | `models/EprContract.js` | 36 |
| 12 | `models/EprEvaluation.js` | 32 |
| 13 | `models/EprSetting.js` | 14 |
| 14 | `migrations/20260220-create-e-procurement-tables.js` | 271 |
| 15 | `lib/hq/mock-data.ts` (EPR section) | ~92 |
| 16 | `config/sidebar.config.ts` (EPR section) | ~25 |
| 17 | `lib/permissions/permissions-catalog.ts` (EPR section) | ~15 |
