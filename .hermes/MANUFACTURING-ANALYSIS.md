# 🏭 Analisis Modul MANUFACTURING

**Project:** Bedagang ERP — bedagang---PoS  
**Branch:** New-Backend-Nainerp  
**Tanggal Analisis:** 28 Juni 2026  
**Analyst:** Hermes Agent

---

## 1. Ringkasan Eksekutif

Modul Manufacturing adalah **modul terlengkap** di seluruh sistem Bedagang ERP. Mencakup 16+ business sub-modul (BOM, Work Orders, Routing, QC, OEE, Costing, Maintenance, PLM, COGM, Subcontracting, IoT, Barcode, Waste, Capacity Planning, Shift Production, Settings) dengan **4 API endpoint files** dan **1 frontend SPA halaman** (single-page application berbasis tab).

| Metrik | Nilai |
|--------|-------|
| Model files | 20 (`MfgBom.js` .. `MfgWorkOrder.js`) |
| API endpoint files | 4 (`index.ts`, `enhanced.ts`, `advanced.ts`, `integration.ts`) |
| Frontend pages | 1 (`pages/hq/manufacturing/index.tsx` — ~2225 baris) |
| Client library | 1 (`lib/manufacturing/mfg-client.ts`) |
| Auth middleware | `withHQAuth` (tanpa permission/module check opsional) |
| Database strategy | Raw SQL via `sequelize.query()` — **TIDAK** via Sequelize ORM models |

---

## 2. Struktur Module

### 2.1 Frontend Pages

| File | Ukuran | Deskripsi |
|------|--------|-----------|
| `pages/hq/manufacturing/index.tsx` | ~2225 baris, 133KB | Monolitik SPA dengan 16 tab — semua logic + render di 1 file |

**16 Tab:** dashboard, work-orders, bom, routings, work-centers, machines, quality, planning, waste, oee, costs, maintenance, plm, cogm, subcontracting, settings

### 2.2 API Endpoints

| File | Action Prefix | Deskripsi |
|------|---------------|-----------|
| `pages/api/hq/manufacturing/index.ts` | `?action=` | CRUD inti (WO, BOM, routing, WC, machine, QC, plans, waste, shift) |
| `pages/api/hq/manufacturing/enhanced.ts` | `?action=` | Analytics, OEE, cost analysis, quality analytics, machine utilization, waste analysis, capacity planning, KPI scorecard |
| `pages/api/hq/manufacturing/advanced.ts` | `?action=` | PLM, maintenance schedules, calibration, COGM, subcontracting, IoT, barcode |
| `pages/api/hq/manufacturing/integration.ts` | `?action=` | Cross-module: inventory (consume/receive), procurement (PR generation), HRIS (operator), finance (cost summary/COGS) |

Total actions yang didukung: **~80+ unique actions** (GET + POST + PUT + DELETE).

### 2.3 Model Files (20)

| Model | Table | Key Fields |
|-------|-------|------------|
| `MfgBom` | `mfg_bom` | bom_code, bom_name, product_id, base_quantity, routing_id, status |
| `MfgBomItem` | `mfg_bom_items` | bom_id, product_id, quantity, uom, waste/scrap %, cost_per_unit, sub_bom_id |
| `MfgRouting` | `mfg_routings` | routing_code, routing_name, product_id, total_time, total_cost |
| `MfgRoutingOperation` | `mfg_routing_operations` | routing_id, operation_number, work_center_id, setup/run_time, quality_check_required |
| `MfgWorkCenter` | `mfg_work_centers` | code, name, capacity_per_hour, shift_count, efficiency_target |
| `MfgWorkOrder` | `mfg_work_orders` | wo_number, product_id, bom_id, routing_id, planned_quantity, actual_quantity, status, priority, estimated_cost, actual_cost, yield_percentage |
| `MfgWoMaterial` | `mfg_wo_materials` | work_order_id, product_id, planned/issued/consumed qty, cost_per_unit, status |
| `MfgWoOperation` | `mfg_wo_operations` | work_order_id, operation_number, operation_name, work_center_id, operator_id, status, setup/run_time, output/reject qty |
| `MfgWoOutput` | `mfg_wo_outputs` | work_order_id, product_id, quantity, quality_status, warehouse_id, batch/lot_number |
| `MfgQcTemplate` | `mfg_qc_templates` | template_code, template_name, inspection_type, parameters (JSONB), sampling_method |
| `MfgQcInspection` | `mfg_qc_inspections` | inspection_number, work_order_id, template_id, inspector_id, status, overall_result, defect_rate |
| `MfgQcResult` | `mfg_qc_results` | inspection_id, parameter_name, expected/actual value, min/max, result, severity |
| `MfgMachine` | `mfg_machines` | machine_code, machine_name, work_center_id, status, operating_hours, maintenance_interval, health_score, mtbf/mttr |
| `MfgMaintenanceRecord` | `mfg_maintenance_records` | machine_id, maintenance_type, description, status, cost, parts_cost, downtime_hours |
| `MfgProductionPlan` | `mfg_production_plans` | plan_code, plan_name, plan_type, period_start/end, total_planned_qty, status |
| `MfgProductionPlanItem` | `mfg_production_plan_items` | plan_id, product_id, bom_id, planned_quantity, work_center_id, work_order_id |
| `MfgProductionCost` | `mfg_production_costs` | work_order_id, cost_type, planned_amount, actual_amount, variance |
| `MfgShiftProduction` | `mfg_shift_productions` | shift_date, shift_name, work_center_id, machine_id, operator_id, planned/actual/good output, oee_* fields |
| `MfgWasteRecord` | `mfg_waste_records` | work_order_id, waste_type, quantity, cost_impact, work_center_id |
| `MfgSetting` | `mfg_settings` | setting_key, setting_value (JSONB) |

**Catatan:** Semua model menggunakan UUID primary key, camelCase field names mapped to snake_case columns, dan mendukung `tenant_id` untuk multi-tenancy.

---

## 3. Business Flows

### 3.1 Bill of Materials (BOM)
- ✅ Create BOM dengan multi-level (sub-bom via `sub_bom_id`)
- ✅ BOM items: raw material, sub-assembly, packaging, consumable
- ✅ Waste/scrap percentage, critical flag, cost per unit
- ✅ Status workflow: draft → active → expired
- ✅ Approval flow: `created_by`, `approved_by`, `approved_at`
- ✅ BOM routing linkage

### 3.2 Work Orders
- ✅ WO number generation: `WO-YYMM-XXXX`
- ✅ Status workflow: draft → planned → released → in_progress → completed / cancelled / on_hold
- ✅ Auto-populate materials from BOM saat create
- ✅ Auto-populate operations from routing saat create
- ✅ Priority levels: low, normal, high, urgent, critical
- ✅ Batch/lot number tracking
- ✅ Yield percentage calculation on complete
- ✅ Source tracking: manual, mrp (production plan generated)

### 3.3 Routing
- ✅ Multi-operation workflows
- ✅ Work center linkage per operation
- ✅ Setup time, run time per unit
- ✅ Quality check required flag
- ✅ Tools required (JSONB), skill required
- ✅ Cost per unit

### 3.4 Quality Control (QC)
- ✅ QC Templates dengan parameter JSONB
- ✅ Auto-populate inspection results from template parameters
- ✅ Inspection types: incoming, in_process, final
- ✅ Results: numeric (with min/max), text
- ✅ Defect rate calculation
- ✅ Disposition: accept, hold, reject, rework, scrap
- ✅ Corrective action tracking

### 3.5 OEE (Overall Equipment Effectiveness)
- ✅ Availability, Performance, Quality components
- ✅ By work center, by shift, trend over time
- ✅ Shift production recording dengan OEE kalkulasi

### 3.6 Cost Analysis
- ✅ Cost types: material, labor, overhead, machine, energy, packaging
- ✅ Planned vs actual vs variance
- ✅ Unit cost calculation per product
- ✅ Cost trend over time
- ✅ Variance analysis

### 3.7 Waste Management
- ✅ Waste types: material, product, packaging, other
- ✅ Cost impact tracking
- ✅ Disposal method
- ✅ By work center, by product, trend

### 3.8 Maintenance
- ✅ Preventative & corrective maintenance
- ✅ Maintenance schedules with frequency (interval_days, calendar_weekly, calendar_monthly)
- ✅ Auto-generate maintenance records from schedules
- ✅ Calibration records
- ✅ Machine health score, MTBF, MTTR
- ✅ Parts cost, labor cost, downtime tracking

### 3.9 PLM (Product Lifecycle Management)
- ✅ Lifecycle stages: concept → design → prototyping → testing → production → end_of_life → archived
- ✅ Engineering Change Orders (ECO) with approval workflow
- ✅ Version management
- ✅ Document management
- ✅ Impact analysis on affected BOMs/routings

### 3.10 COGM (Cost of Goods Manufactured)
- ✅ Period-based calculation
- ✅ Material, labor, overhead cost aggregation
- ✅ Fixed overhead allocation
- ✅ Unit COGM, margin calculation
- ✅ Period locking

### 3.11 Subcontracting
- ✅ Vendor management
- ✅ Materials sent tracking
- ✅ Status: draft → sent → in_process → partial_received → received
- ✅ QC required

### 3.12 Production Planning
- ✅ Plan types: daily, weekly, monthly
- ✅ MRP generation: auto-create WOs from plan items
- ✅ Work order linkage

### 3.13 IoT & Barcode
- ✅ IoT device registration and readings
- ✅ Barcode/RFID scanning with auto-actions (material in/out)

### 3.14 Cross-module Integration
- ✅ Inventory: material availability check, consume materials (backflush), receive finished goods
- ✅ Procurement: generate purchase requisition from shortages
- ✅ HRIS: available operators, productivity analysis
- ✅ Finance: production cost summary, COGS calculation

---

## 4. User Journey

1. **Dashboard** — Overview cards: WO stats, machine stats, QC stats, maintenance alerts, recent WOs, production trend chart
2. **Work Orders** — Paginated list, filter by status/priority/search, detail modal with materials/operations/outputs/costs/waste, CRUD + status actions (start, complete, pause, resume, issue material, record output)
3. **BOM** — List with item count, total material cost, approve/delete actions, create modal
4. **Routings** — List with operation count, detail drill-down
5. **Work Centers** — List with machine count, active orders, capacity
6. **Machines** — List with last maintenance, pending maintenance count, status
7. **Quality** — QC inspections + templates tabs, create inspection, complete with results
8. **Planning** — Production plans list with MRP generation button
9. **OEE** — OEE dashboard: overall, by work center, by shift, trend
10. **Costs** — Cost analysis: by type, by product, trend, variance
11. **Maintenance** — Dashboard with overdue/upcoming, recent records, cost summary
12. **PLM** — Products + design changes, ECO creation and approval
13. **COGM** — Periods, items, cost trend
14. **Subcontracting** — Subcontracts list, send/receive
15. **Waste** — Analysis: by type, by product, by work center, trend
16. **Settings** — Key-value settings

---

## 5. Technical Findings

### ✅ Auth & Tenant Isolation
- All endpoints wrapped with `withHQAuth(handler)` — authentication + session injection
- All INSERT queries use `SELECT t.id, ... FROM tenants t LIMIT 1` pattern for `tenant_id`
- No explicit permission/module check passed to `withHQAuth` (uses defaults)
- ❌ **No tenant isolation on SELECT queries** — no `WHERE tenant_id = :tid` filters on read operations (misses tenant scoping on reads)

### ✅ Response Format
- Uses `successResponse(data, meta?, message?)` and `errorResponse(code, message, details?)` consistently
- Paginated endpoints return `{ data: [...], meta: { total, page, limit, totalPages } }`
- Non-paginated endpoints return `{ data: [...] }` arrays directly

### ❌ Mock Data Strategy
- Frontend initializes state with `MOCK_MFG_DASHBOARD` and `MOCK_WORK_ORDERS`
- Falls back to mock data on API failure (silent catch)
- **Risk:** Users may see stale/incorrect mock data if API is down
- **Risk:** Mock data is hardcoded with specific product names (Kopi Arabica, etc.) — not i18n-friendly

### ❌ Raw SQL Injection Concerns
- All queries use parameterized replacements (`:param` syntax) — **good**
- BUT: `config.fields.includes(key)` in PUT handler uses `key` directly in `SET ${key} = :${key}` — **potential SQL injection** if `key` comes from untrusted request body with unexpected values
- `tableMap[action]` on PUT handleter has hardcoded field whitelists, but the dynamic SET generation could still be exploited with prototype pollution

### ✅ Error Handling
- API: try/catch with `console.error(`[MFG API] Error: ${error.message}`)` + 500 response
- Frontend: `toast.error(e.message)` for user-facing errors
- ❌ No structured error logging (no correlation IDs, no error codes beyond generic `INTERNAL_ERROR`)

### ✅ Transaction Usage
- Complex operations (createBOM, createWorkOrder, completeWorkOrder, createProductionPlan, generateWOFromPlan, calculateCOGM, consumeMaterials, receiveFinishedGoods) use `sequelize.transaction()` with commit/rollback
- ❌ Some operations (autoIssueMaterials, backflushMaterials) don't use transactions despite multi-step writes

### ✅ Validation
- Basic field presence checks (`if (!code || !name) return 400`)
- ❌ No input sanitization or type coercion beyond basic `parseFloat()`
- ❌ No enum validation for status/type fields (accepts any string)

### ❌ Large Monolithic Files
- API `index.ts`: **1452 lines** — hard to maintain
- API `advanced.ts`: **895 lines**
- Frontend `index.tsx`: **2225 lines** — violates single responsibility principle
- All 16 tabs rendered in a single component

---

## 6. UX Findings

### ✅ Loading States
- `loading` state with `Loader2` spinner for initial load and tab switching
- `saving` state with button spinner for form submissions

### ✅ Error Handling
- `toast.error(e.message)` for all user-facing errors
- API errors caught and shown via toast

### ✅ Pagination
- Work orders have pagination (`page`, `limit`, `total`, `totalPages`)
- ❌ Other lists (bom, routings, machines, etc.) do NOT have pagination
- ❌ No infinite scroll or lazy loading for large datasets

### ✅ Form Validation
- Required field checks before submission
- ❌ No client-side validation beyond "required" (no email/URL patterns, no min/max length)
- ❌ No real-time validation feedback

### ❌ Empty States
- ❌ **No empty states** — when lists are empty, users see blank tables/areas without helpful messages

### ❌ Accessibility
- ❌ No `aria-*` attributes
- ❌ No keyboard navigation beyond defaults
- ❌ No focus management on modals

### ❌ Confirmation Dialogs
- Uses `confirm()` browser dialog for delete actions (not accessible, not customizable)
- ❌ No undo functionality

---

## 7. Prioritized Fix List

### P0 — Critical (Security / Data Loss)

| # | Issue | File(s) | Impact |
|---|-------|---------|--------|
| 1 | **Missing tenant isolation on SELECT queries** — reads from all tenants, leaking cross-tenant data | `index.ts` all `get*` handlers, `enhanced.ts`, `advanced.ts`, `integration.ts` | Cross-tenant data exposure |
| 2 | **Potential SQL injection in PUT handler** — dynamic SET clause with raw key names | `advanced.ts:858-864` (`handlePut`) | SQL injection vector |
| 3 | **No rate limiting** on any MFG endpoint | All 4 API files | Abuse / DoS |

### P1 — High (Functional / UX)

| # | Issue | File(s) | Impact |
|---|-------|---------|--------|
| 4 | **Monolithic frontend file** — 2225 lines, 16 tabs in 1 component | `index.tsx` | Maintainability nightmare, slow initial load |
| 5 | **Mock data fallback** silently hides API failures from users | `index.tsx:192-197, 250-251` | Users see fake data, not error states |
| 6 | **No pagination** on BOM, routings, machines, or any list other than WOs | `index.ts` | Will break with large datasets |
| 7 | **No empty states** — blank tables when data is empty | `index.tsx` all tab components | Poor UX |
| 8 | **`confirm()` dialog for delete** — not customizable/accessible | `index.tsx:306, 473` | Bad UX, no i18n for confirm text |
| 9 | **No input sanitization** — raw body fields used in SQL | `index.ts`, `advanced.ts` | Data integrity risk |

### P2 — Medium (Code Quality / Performance)

| # | Issue | File(s) | Impact |
|---|-------|---------|--------|
| 10 | **Split frontend into per-tab components** | `index.tsx` | Maintainability |
| 11 | **Hardcoded mock data with specific product names** — not locale-friendly | `index.tsx:76-104` | Translation issues |
| 12 | **Raw SQL instead of Sequelize ORM** across all endpoints (despite having Sequelize models defined) | All 4 API files | Bypasses model hooks, validations, associations |
| 13 | **Monolithic API files** — `index.ts` at 1452 lines | `index.ts` | Maintainability |
| 14 | **No error correlation IDs** in API error responses | All 4 API files | Debugging difficulty |
| 15 | **No field-level enum validation** — accepts any string for status/type | All 4 API files | Data integrity |

### P3 — Low (Nice to Have)

| # | Issue | File(s) | Impact |
|---|-------|---------|--------|
| 16 | No `aria-*` accessibility attributes | `index.tsx` | Accessibility |
| 17 | No keyboard navigation | `index.tsx` | Accessibility |
| 18 | No focus management on modals | `index.tsx` | Accessibility |
| 19 | No CSV export validation (assumes all data is serializable) | `index.tsx:494-504` | Potential export errors |
| 20 | Some multi-step writes lack transactions (auto-issue, backflush) | `index.ts` | Partial data writes on failure |

---

## 8. Kesimpulan

**Strengths:**
- Coverage sangat luas: 16+ sub-modul manufacturing dalam satu modul
- Business flows komprehensif (BOM multi-level, routing, QC dengan templates, OEE, COGM, PLM, IoT, barcode)
- Transaction usage pada critical paths
- Parameterized SQL (no classic SQL injection)
- Cross-module integration matang (Inventory, Procurement, HRIS, Finance)
- Consistent response format (`successResponse`/`errorResponse`)
- Authentication via `withHQAuth` + tenant injection pada INSERT

**Critical Weaknesses:**
1. **Missing tenant isolation on READ queries** — P0 security issue (cross-tenant data leak)
2. **Monolithic architecture** — single 2225-line frontend file, 1452-line API file
3. **Silent mock data fallback** — hides failures from users
4. **Raw SQL bypasses Sequelize ORM** entirely despite having well-defined models
5. **No pagination** on most lists (will break at scale)
6. **No enum validation** on status/type fields

**Estimated effort to fix P0-P1 issues:** ~3-5 days developer time  
**Estimated effort to fix all P0-P2 issues:** ~8-12 days developer time
