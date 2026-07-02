# 📦 Asset Management Module — Analysis Report

**Date:** 2026-06-28  
**Project:** Bedagang ERP — bedagang---PoS  
**Branch:** New-Backend-Nainerp  
**Module Code:** `asset_management`

---

## 1. Module Structure

### 1.1 Frontend Pages

| File | Type | Description |
|------|------|-------------|
| `pages/hq/assets/index.tsx` | Main page | Single-page app with 10-tab layout (2,171 lines) — Dashboard, Registry, Categories, Movements, Depreciation, Maintenance, Licenses, Tenancy, Alerts, Settings |
| `pages/hq/bumdes/assets.tsx` | BUMDes page | Simplified asset registry for BUM Desa with depreciation per Kepmendesa 136/2022 (362 lines) |

### 1.2 API Endpoints

| File | Route | Description |
|------|-------|-------------|
| `pages/api/hq/assets/index.ts` | `/api/hq/assets` | **Main CRUD**: dashboard, list, detail, create, update, dispose, delete, categories, movements, custody, lifecycle, alerts, settings, EAV attributes (851 lines) |
| `pages/api/hq/assets/depreciation.ts` | `/api/hq/assets/depreciation` | **Depreciation**: schedule, summary, unposted periods, generate, calculate-all, post, simulate (424 lines) |
| `pages/api/hq/assets/integration.ts` | `/api/hq/assets/integration` | **Integration**: finance (journal preview, create depr/disposal journals), HR (employee assets, offboarding check, assign/unassign), inventory (spare parts, requisitions) (658 lines) |
| `pages/api/hq/assets/extensions.ts` | `/api/hq/assets/extensions` | **Extensions**: manufacturing (maintenance schedules, work orders, OEE, spare parts), property (tenancies, utility readings, facility bookings), IT (licenses, discoveries, handover checklists) (788 lines) |

### 1.3 Database Models (Sequelize — `models/`)

| Model | Table | Purpose | Fields |
|-------|-------|---------|--------|
| `Asset.js` | `assets` | Core asset registry | 47 fields including asset_code, name, status, condition, acquisition, purchase_price, depreciation fields, warranty, serial/barcode/QR/RFID, location (branch/department/floor/room/GPS), custodian, brand/model/manufacturer, disposal info, photos, tags, custom_fields |
| `AssetCategory.js` | `asset_categories` | Hierarchical categories | code, name, parent_id, depreciation_method, default_useful_life, default_salvage_pct, industry_pack, icon |
| `AssetMovement.js` | `asset_movements` | Asset movement/transfer records | asset_id, movement_type, from/to branch/department/location/custodian, status (pending→approved→received), approval chain |
| `AssetMaintenanceSchedule.js` | `asset_maintenance_schedules` | Recurring maintenance | asset_id, schedule_type (calendar/hour_meter), frequency, interval_value, next_due_date, hour_meter tracking, assigned_to, priority, checklist |
| `AssetLicense.js` | `asset_licenses` | Software licenses | asset_id, license_name/key/type, vendor, purchase/activation/expiry/renewal dates, seats, costs, billing_cycle, auto_renew, assigned_users |
| `AssetTenancy.js` | `asset_tenancies` | Property tenancy/lease | asset_id, tenant info, lease_start/end, monthly_rent, deposit, billing_cycle, unit_size_sqm, occupancy/vacate dates, contract_url |
| `AssetWorkOrder.js` | `asset_work_orders` | Maintenance work orders | asset_id, schedule_id, wo_number, wo_type (preventive/corrective), status, priority, planned/actual dates, assigned_to, labor/parts/total costs, root_cause, resolution, downtime, parts_used, checklist_results |

### 1.4 Additional Tables (from migration script)

The migration script `scripts/create-asset-management.js` defines ~25 tables:

- **Core:** `assets`, `asset_categories`, `asset_lifecycle_events`, `asset_depreciation_schedule`, `asset_movements`, `asset_custody_logs`, `asset_handover_checklists`
- **EAV:** `asset_attributes`, `asset_attribute_values`
- **Manufacturing:** `asset_maintenance_schedules`, `asset_work_orders`, `asset_oee_records`, `asset_spare_parts`
- **Property:** `asset_tenancies`, `asset_utility_readings`, `asset_facility_bookings`
- **IT:** `asset_licenses`, `asset_it_discoveries`
- **Integration:** `asset_alerts`, `asset_settings`

### 1.5 Backend (Express — `backend/`)

| File | Description |
|------|-------------|
| `backend/src/routes/asset.routes.ts` | Express CRUD for Asset, AssetCategory, AssetMovement, AssetMaintenanceSchedule via CrudController (64 lines) |
| `backend/src/models/asset.models.ts` | TypeScript model definitions for Asset, AssetCategory, AssetMovement, AssetMaintenanceSchedule (68 lines) |

---

## 2. Business Flows

### 2.1 Asset Lifecycle

```
Draft → Active/In_Use → Maintenance → Disposed/Deleted
         ↕ (transfer/assign)
```

**Detailed lifecycle:**

1. **Procurement → Registration:** Asset is purchased (tracks supplier_id, po_number, invoice_number, warranty_expiry) and registered with auto-generated asset code (`AST-XXXXX`)
2. **Activation:** Status moves from `draft` → `active`, current_book_value = purchase_price
3. **Custody Assignment:** Asset assigned to employee/custodian via `custodian_id`, tracked in `asset_custody_logs`
4. **Depreciation Runs:** Monthly straight-line (default), double-declining, sum-of-years, or units-of-production — recorded in `asset_depreciation_schedule`
5. **Transfers:** Asset moved between branches/departments via `asset_movements` with approval workflow (pending → approved → received)
6. **Maintenance:** Preventive/corrective work orders via `asset_work_orders`, scheduled via `asset_maintenance_schedules`
7. **Disposal:** Asset is disposed (sold/scrapped/donated) — status → `disposed`, records disposal_method, disposal_price, disposal_reason, gain/loss
8. **Deletion:** Only allowed if status is NOT `active` (must dispose first)

All lifecycle transitions logged in `asset_lifecycle_events` with performed_by tracking.

### 2.2 Depreciation Flow

**Methods supported:**
- `straight_line` (default): `(cost - salvage) / useful_life_months`
- `double_declining`: `book_value * (2 / useful_life_months)`, floored at salvage
- `sum_of_years`: SYD formula, annualized per month
- `units_of_production`: `((cost - salvage) / total_units) * units_this_period`
- `none`: Non-depreciable assets

**Batch flow:**
1. Admin clicks "Calculate All Depreciation" → iterates all active assets
2. For each asset, checks if current month schedule entry exists
3. Calculates monthly depreciation amount
4. Inserts into `asset_depreciation_schedule`
5. Updates `assets.accumulated_depreciation` and `assets.current_book_value`
6. Admin reviews and "Posts" depreciation → marks entries as posted, optionally creates finance journal entry
7. Integration: Creates journal entry (`Beban Penyusutan` debit, `Akumulasi Penyusutan` credit) in `journal_entries` table

**Simulation (what-if):** Calculates full depreciation schedule for hypothetical values with yearly summaries.

### 2.3 Maintenance Flow

1. **Schedule Creation:** Recurring (calendar or hour-meter based) or one-time
2. **Work Order Generation:** Manual or linked from schedule
3. **Assignment:** Work order assigned to technician
4. **Execution:** WO goes `open` → `in_progress` → `completed`
5. **Completion:** Records labor/parts cost, downtime, resolution, parts_used; auto-updates schedule's next_due_date
6. **OEE Tracking:** Availability × Performance × Quality metrics for manufacturing assets

### 2.4 Property Tenancy Flow

1. Asset registered as property/building
2. Tenancy created linking tenant to asset with lease terms
3. Monthly rent tracking, payment_due_day, billing_cycle
4. Utility readings recorded (electricity, water, gas) with usage calculation
5. Facility bookings for shared spaces

### 2.5 IT License Management

1. License registered for software assets (or standalone)
2. Seat tracking (total_seats vs used_seats)
3. Expiry/renewal alerts (configurable alert_days_before)
4. Assigned users tracked in JSONB
5. Auto-renew and billing cycle management

---

## 3. User Journey

### Tab Overview (10 tabs)

| Tab | Purpose | Key Actions |
|-----|---------|-------------|
| **Dashboard** | KPIs, financial overview, status/category/department breakdowns, depreciation health, maintenance summary, alerts | Quick overview only |
| **Registry** | Asset list with search/filter/pagination | View detail, edit, create, dispose, delete |
| **Categories** | Manage asset categories with metadata | Add/edit/delete categories, set default depreciation |
| **Movements** | Asset transfer log | Create movement, approve, receive |
| **Depreciation** | Depreciation summary + scheduling | Calculate all, post, simulate what-if |
| **Maintenance** | Schedules & work orders | Add/edit schedules, create/complete WOs |
| **Licenses** | Software license management | Add/edit licenses, track seats/expiry |
| **Tenancy** | Property lease management | Add/edit tenancies, utility readings |
| **Alerts** | System notifications | Acknowledge/resolve alerts |
| **Settings** | Module configuration | Key-value settings store |

### Modal Flows
- **Create/Edit Asset Modal:** Full form with all asset fields, category selection, depreciation config
- **Asset Detail Modal:** Complete asset view with lifecycle events, movements, custody logs, depreciation schedule, attribute values
- **Dispose Modal:** Disposal method, date, price, reason

### Mock Data Strategy
The frontend heavily relies on mock data (`MOCK_ASSETS`, `MOCK_DASHBOARD`, etc.) with a **fail-open pattern**: if the API returns an error or no data, it silently falls back to mock data. This masks connectivity issues and makes it hard to distinguish real vs. fake data.

---

## 4. Technical Findings

### 🟢 Strengths

1. **Comprehensive model design** — 47 fields on Asset model covering every conceivable attribute (tracking, finance, location, custodian, depreciation, disposal)
2. **Multi-industry support** via industry_pack on categories — Manufacturing (OEE, spare parts), Property (tenancy, utilities), IT (licenses, discovery)
3. **EAV (Entity-Attribute-Value) system** for dynamic custom fields — `asset_attributes` + `asset_attribute_values` table
4. **Full lifecycle audit trail** — Every state change logged in `asset_lifecycle_events`
5. **Tenant isolation** — `buildTenantFilter()` applied consistently across all queries
6. **Module guard** — All endpoints wrapped in `withModuleGuard('asset_management', handler)`
7. **Depreciation simulation** — What-if calculator for testing different methods
8. **Finance integration** — Journal entries for depreciation posting and disposal gain/loss
9. **HR integration** — Employee asset assignment, offboarding check, custody logs
10. **Inventory integration** — Spare parts management with auto-reorder detection

### 🔴 Critical Issues

| # | Issue | Severity | Location | Description |
|---|-------|----------|----------|-------------|
| C1 | **Sequelize models have NO associations** | HIGH | `models/Asset.js` et al. | Asset, AssetCategory, AssetMovement, etc. are defined with `sequelize.define()` but never call `.associate()`. The models/index.js checks for `db[modelName].associate` but none exists. The backend Express code *does* use `include: [AssetCategory, AssetMovement, AssetMaintenanceSchedule]` but the Next.js API layer uses raw SQL queries instead |
| C2 | **Massive frontend file** | HIGH | `pages/hq/assets/index.tsx` (2,171 lines) | Single file contains all 10 tab components (DashboardTab, RegistryTab, CategoriesTab, MovementsTab, DepreciationTab, MaintenanceTab, LicensesTab, TenancyTab, AlertsTab, SettingsTab) plus modals (AssetDetailModal, AssetFormModal, DisposeModal) — violates SRP, extremely hard to maintain |
| C3 | **Mock data fallback hides failures** | HIGH | `pages/hq/assets/index.tsx` | Every fetch function silently falls back to mock data on any error. User sees apparently "working" UI with fake data, making debugging impossible. No toast/error UI when backend fails |
| C4 | **No input validation** | HIGH | All 4 API files | Raw SQL queries with user-supplied values use named replacements (good), but no schema validation (zod/yup/joi) for request bodies. Missing required fields silently become NULL |
| C5 | **Missing model imports in models/index.js** | HIGH | `models/index.js` | Asset, AssetCategory, AssetMovement, AssetMaintenanceSchedule, AssetLicense, AssetTenancy, AssetWorkOrder are **NOT imported** in models/index.js. They exist as standalone files but are not registered in the central `db` object |

### 🟡 Moderate Issues

| # | Issue | Severity | Location | Description |
|---|-------|----------|----------|-------------|
| M1 | **Duplicate model definitions** | MEDIUM | `models/` vs `backend/src/models/` | Two sets of asset model definitions: Sequelize in `models/*.js` and TypeScript/Express in `backend/src/models/asset.models.ts` — they have different columns (e.g. backend uses INTEGER PK, models uses UUID) |
| M2 | **Inconsistent field naming** | MEDIUM | Across models | Backend uses `acquision_cost` / `current_value`; frontend model uses `purchase_price` / `current_book_value`. Backend types: `ENUM('active','maintenance','disposed','transferred','lost')`; frontend: `STRING(30)` open-ended |
| M3 | **No pagination on dashboard queries** | MEDIUM | `integration.ts`, `extensions.ts` | Several GET endpoints lack pagination (limit hardcoded at 50 or 100) |
| M4 | **Soft-delete not implemented** | MEDIUM | `Asset.js` | Asset model has `DELETE` endpoint but no `paranoid: true` — data is permanently deleted |
| M5 | **No transaction wrapping** | MEDIUM | All API files | Multi-step operations (create asset + lifecycle event + audit log) not wrapped in DB transactions — partial failures can leave orphan records |

### 🔵 Minor Issues

| # | Issue | Severity | Location | Description |
|---|-------|----------|----------|-------------|
| m1 | **Hardcoded Indonesian strings** | LOW | Frontend | All UI labels, tooltips, modal messages, alertConfirm texts are hardcoded in Indonesian despite having `useTranslation()` |
| m2 | **No TypeScript types for API responses** | LOW | All API files | API responses return `any` types, no shared type definitions between frontend and backend |
| m3 | **`deleteById` has no tenant filter** | LOW | `extensions.ts:80-84` | Delete operations use raw `DELETE FROM table WHERE id = :id` without tenant isolation — cross-tenant deletion possible |
| m4 | **Hardcoded `branch_id`, `floor`, `room`** | LOW | `Asset.js` | Physical location fields are simple strings — no relation to a location/building hierarchy table |
| m5 | **Depreciation schedule generation re-inserts on each call** | LOW | `depreciation.ts:191` | Deletes all unposted schedules then re-inserts — if interrupted, data loss |
| m6 | **No health check for sequelize** | LOW | All API files | Uses `if (!sequelize) return empty` pattern — silently returns empty data when DB is down |

---

## 5. UX Findings

### 🟢 Strengths

1. **Rich dashboard** — 5-row layout with KPI cards, financial overview, depreciation health donut chart, maintenance summary, condition breakdown, status/category/department distributions, top-value assets
2. **10-tab navigation** — Well-organized separation of concerns
3. **Responsive design** — Grid layouts adapt from 2 cols (mobile) to 4 cols (desktop)
4. **Loading states** — Skeleton/pulse animation placeholders while data loads
5. **Icon-rich UI** — Lucide icons used throughout for visual cues
6. **Color-coded status** — Consistent green/yellow/red color scheme for asset status and condition

### 🔴 Issues

| # | Issue | Severity | Description |
|---|-------|----------|-------------|
| UX1 | **Mock data always shown** | HIGH | Even when API fails, users see fake data with no indication it's not real |
| UX2 | **No empty states** | MEDIUM | Tabs like "Licenses" or "Tenancy" show no "no data" guidance for first-time setup |
| UX3 | **No error feedback** | MEDIUM | API errors are silently caught (`console.error` only) — user never sees error toasts |
| UX4 | **Form validation missing** | MEDIUM | Asset create/edit form has no client-side field validation |
| UX5 | **No confirmation for dispose** | LOW | Uses browser `confirm()` instead of a styled modal (though DisposeModal exists for the actual disposal) |

---

## 6. Prioritized Fix List

### P0 — Critical (Do These First)

| ID | Fix | Effort | Impact |
|----|-----|--------|--------|
| F1 | **Register asset models in models/index.js** | 1h | Enables Sequelize associations, model methods |
| F2 | **Add Sequelize associations between asset models** | 2h | Enables eager loading, cascading, proper ORM usage |
| F3 | **Remove mock data fallback; add proper error handling** | 3h | Users see real API failures instead of fake data |

### P1 — High

| ID | Fix | Effort | Impact |
|----|-----|--------|--------|
| F4 | **Split frontend into separate component files** | 4h | Maintainable code, tree-shakeable imports |
| F5 | **Add input validation (zod) to all API endpoints** | 3h | Data integrity, security |
| F6 | **Add DB transaction wrapping to multi-step operations** | 2h | Prevents partial failures/orphan data |

### P2 — Medium

| ID | Fix | Effort | Impact |
|----|-----|--------|--------|
| F7 | **Reconcile backend vs frontend model definitions** | 3h | Single source of truth |
| F8 | **Add `paranoid: true` for soft-delete on Asset model** | 1h | Data recovery option |
| F9 | **Add tenant isolation to `deleteById` in extensions** | 0.5h | Security fix |
| F10 | **Add pagination to all list endpoints** | 1h | Performance at scale |

### P3 — Low

| ID | Fix | Effort | Impact |
|----|-----|--------|--------|
| F11 | **Add empty state UI for all tabs** | 2h | First-time user clarity |
| F12 | **Extract i18n translations properly** | 1h | Internationalization |
| F13 | **Create shared TypeScript types** | 2h | Type safety |
| F14 | **Add depreciation schedule generation with idempotent UPSERT** | 1h | Safe re-generation |

---

## 7. Summary

The Asset Management module is **architecturally ambitious and feature-rich**, covering:

- **Core asset lifecycle** from acquisition through disposal
- **4 depreciation methods** with batch calculation and finance integration
- **Manufacturing maintenance** with OEE tracking
- **Property management** with tenancy, utilities, and facility booking
- **IT asset management** with license/subscription tracking
- **HR integration** for employee asset assignment and offboarding
- **EAV dynamic fields** for industry-specific attributes

However, it has **significant structural issues**: the Sequelize models lack associations and are not registered in the central index, the frontend is a monolithic 2,171-line file, and the mock-data-fallback pattern silently hides all API failures from users. The code shows signs of rapid development without refactoring — the core data model and business logic are solid, but the implementation needs hardening around error handling, validation, transactions, and code organization.

**Estimated effort for critical fixes:** ~6 hours  
**Estimated effort for full hardening:** ~25 hours
