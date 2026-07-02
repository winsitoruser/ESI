# 🚚 Fleet Module Analysis

**Date:** 2026-06-28
**Branch:** New-Backend-Nainerp
**Project Path:** `/Users/winnerharry/Bedagang ERP/bedagang---PoS/`

---

## 1. Module Structure

```
pages/hq/fleet/                     ← 13 frontend pages
pages/api/hq/fleet/                 ← 18 API endpoints
models/Fleet*.js                    ← 10 Sequelize models
components/hq/fleet/                ← 8 React components
lib/mockData/fleet*.ts              ← 3 mock data files
lib/fleet/commandCenter.ts          ← 1 shared service layer
lib/translations/hq-fleet-hub.ts   ← i18n translations

Related modules:
pages/hq/tms/        + pages/api/hq/tms/      ← TMS (Transport Mgmt System)
pages/hq/fms/        + pages/api/hq/fms/      ← FMS (Fleet Mgmt System)
```

### 1.1 Frontend Pages (pages/hq/fleet/)

| Page | Route | Type | Purpose |
|------|-------|------|---------|
| `index.tsx` | `/hq/fleet` | Dashboard | Unified Fleet Command Center hub |
| `live.tsx` | `/hq/fleet/live` | Dashboard | Real-time live fleet tracking |
| `kpi.tsx` | `/hq/fleet/kpi` | Analytics | Fleet KPI dashboard with charts |
| `tracking.tsx` | `/hq/fleet/tracking` | Map | GPS tracking + alerts + geofences |
| `leaderboard.tsx` | `/hq/fleet/leaderboard` | Analytics | Driver ranking leaderboard |
| `vehicles/[id].tsx` | `/hq/fleet/vehicles/:id` | Detail | Single vehicle detail view |
| `drivers/[id].tsx` | `/hq/fleet/drivers/:id` | Detail | Single driver detail view |
| `routes.tsx` | `/hq/fleet/routes` | CRUD | Route & assignment management |
| `maintenance.tsx` | `/hq/fleet/maintenance` | CRUD | Maintenance schedule & records |
| `fuel.tsx` | `/hq/fleet/fuel` | CRUD | Fuel transaction management |
| `costs.tsx` | `/hq/fleet/costs` | Reports | Fleet cost reporting |
| `expenses.tsx` | `/hq/fleet/expenses` | Approval | Driver expense approval dashboard |
| [no vehicles list page] | — | — | ❌ No dedicated vehicles list page; relies on FleetCommandCenter or direct detail links |

### 1.2 API Endpoints (pages/api/hq/fleet/)

| File | Methods | Purpose | DB |
|------|---------|---------|----|
| `vehicles.ts` | GET, POST, PUT, DELETE | Vehicle CRUD | ❌ Mock only |
| `drivers.ts` | GET, POST, PUT, DELETE | Driver CRUD | ❌ Mock only |
| `routes.ts` | GET, POST, PUT, DELETE | Route CRUD | ❌ Inline mock |
| `maintenance.ts` | GET, POST, PUT, DELETE | Maintenance CRUD | ❌ Inline mock |
| `fuel.ts` | GET, POST, PUT, DELETE | Fuel transactions | ❌ Mock (fleetAdvanced) |
| `costs.ts` | GET, POST, PUT, DELETE | Fleet costs | ❌ Inline mock |
| `tracking.ts` | GET, POST | GPS tracking data | ❌ Inline mock |
| `live.ts` | GET | Live fleet monitoring (real-time) | ✅ Raw SQL (real) + mock fallback |
| `command-center.ts` | GET | KPI, alerts, integrations, trends | ✅ Raw SQL (real) + mock fallback |
| `driver-route.ts` | GET | Per-driver route overlay (planned + actual) | ✅ Raw SQL (real) + mock fallback |
| `leaderboard.ts` | GET | Driver leaderboard rankings | ✅ Raw SQL (real) + mock fallback |
| `expenses/index.ts` | GET, POST | Driver expenses list + bulk approve/reject | ✅ Raw SQL (real) + mock fallback |
| `expenses/[id].ts` | ? | Individual expense record | — Not fully read |
| `integrations/finance.ts` | GET, POST | Finance integration (journal entries, payables) | ✅ Raw SQL (real) |
| `integrations/driver-app.ts` | GET | Driver app integration | ✅ Raw SQL (real) |
| `integrations/hris.ts` | GET | HRIS integration | ✅ Raw SQL (real) |
| `integrations/inventory.ts` | GET | Inventory integration | ✅ Raw SQL (real) |
| `integrations/manufacturing.ts` | GET | Manufacturing integration | ✅ Raw SQL (real) |

### 1.3 Models (models/)

| Model | Table | Key Fields | Assoc. |
|-------|-------|------------|--------|
| `FleetVehicle` | fleet_vehicles | vehicleNumber, licensePlate, vehicleType, status, assignedDriverId, assignedBranchId, ownershipType, gpsDeviceId | → Tenant, Branch, Driver; ← GpsLocations, MaintenanceSchedules, RouteAssignments |
| `FleetDriver` | fleet_drivers | driverNumber, fullName, licenseNumber, licenseType, status, availabilityStatus, safetyScore, customerRating | → Tenant, User, Branch; ← Vehicles, RouteAssignments, GpsLocations |
| `FleetRoute` | fleet_routes | routeNumber, routeName, routeType, startLocation, endLocation, stops (JSONB), totalDistanceKm | → Tenant; ← RouteAssignments |
| `FleetRouteAssignment` | fleet_route_assignments | routeId, vehicleId, driverId, shipmentId, scheduledDate, status | → Route, Vehicle, Driver |
| `FleetMaintenanceSchedule` | fleet_maintenance_schedules | vehicleId, maintenanceType, intervalType, nextServiceDate, status | → Vehicle |
| `FleetFuelTransaction` | fleet_fuel_transactions | vehicleId, driverId, fuelType, quantityLiters, totalCost, transactionDate | → Vehicle, Driver |
| `FleetGpsLocation` | fleet_gps_locations | vehicleId, driverId, latitude, longitude, speedKmh, heading, isMoving, isIdle | → Vehicle, Driver |
| `FleetDriverExpense` | fleet_driver_expenses | driverId, vehicleId, assignmentId, category, amount, status (submitted/approved/rejected/paid) | → Driver, Vehicle, RouteAssignment |
| `FleetDeliveryProof` | fleet_delivery_proofs | assignmentId, driverId, recipientName, signatureData (TEXT), photos (JSONB), status | → Driver, Vehicle, RouteAssignment |
| `FleetVehicleInspection` | fleet_vehicle_inspections | vehicleId, driverId, assignmentId, inspectionType, checklist (JSONB), overallStatus | → Driver, Vehicle, RouteAssignment |

All 10 models are registered in `models/index.js` at lines 158-168.

### 1.4 React Components (components/hq/fleet/)

| Component | Purpose |
|-----------|---------|
| `FleetCommandCenter.tsx` | Main unified hub dashboard (index page) |
| `LiveFleetMap.tsx` | Real-time map with driver markers (live page) |
| `FleetMap.tsx` | GPS tracking map (tracking page) |
| `FuelTransactionModal.tsx` | Add/edit fuel transaction modal |
| `VehicleFormModal.tsx` | Add/edit vehicle form modal |
| `DriverFormModal.tsx` | Add/edit driver form modal |
| `VehicleSelector.tsx` | Vehicle dropdown selector component |
| `DriverSelector.tsx` | Driver dropdown selector component |

---

## 2. Data Model Relationships (ERD)

```
Tenant ──┬── FleetVehicle(tenantId)
         ├── FleetDriver(tenantId) ──→ User(userId)
         ├── FleetRoute(tenantId)
         └── FleetDriverExpense(tenantId)

FleetVehicle ──┬── FleetGpsLocation(vehicleId)
               ├── FleetMaintenanceSchedule(vehicleId)
               ├── FleetRouteAssignment(vehicleId)
               ├── FleetFuelTransaction(vehicleId)
               ├── FleetDriverExpense(vehicleId)
               ├── FleetDeliveryProof(vehicleId)
               ├── FleetVehicleInspection(vehicleId)
               └──→ FleetDriver(assignedDriverId)

FleetDriver ──┬── FleetVehicle(assignedDriverId)
              ├── FleetRouteAssignment(driverId)
              ├── FleetGpsLocation(driverId)
              ├── FleetFuelTransaction(driverId)
              ├── FleetDriverExpense(driverId)
              ├── FleetDeliveryProof(driverId)
              └── FleetVehicleInspection(driverId)

FleetRoute ──→ FleetRouteAssignment(routeId)
```

---

## 3. Business Flows

### 3.1 Vehicle Lifecycle

```
Registration → Active → (Maintenance) → Active / Retired / Sold
                    ↕
             Driver Assignment
                    ↕
              Route Assignment
```

**Vehicle statuses:** `active`, `maintenance`, `retired`, `sold`
**Ownership types:** `owned`, `leased`, `rental`

### 3.2 Driver Lifecycle

```
Hire → Active → On Duty / Available / Off Duty → Suspended / Terminated
         ↕                          ↕
   License Renewal          Route Assignment
         ↕                          ↕
   Performance Tracking      Expense Submission
```

**Driver statuses:** `active`, `on_leave`, `suspended`, `terminated`
**Availability:** `available`, `on_duty`, `off_duty`
**Performance tracking:** safetyScore, customerRating, totalDeliveries, onTimeDeliveries, totalDistanceKm

### 3.3 Route Assignment Flow

```
Route Definition (FleetRoute)
    ↓
RouteAssignment → Vehicle + Driver + Scheduled Date
    ↓
scheduled → in_progress → completed / cancelled
    ↓
GPS tracking (FleetGpsLocation) records actual path
    ↓
Delivery Proof (FleetDeliveryProof) at stops
    ↓
Expenses (FleetDriverExpense) submitted per trip
```

### 3.4 Maintenance Flow

```
MaintenanceSchedule (per vehicle)
    ↓
Scheduled → Due alert → Service Visit → Completed
    ↓                      ↓
  FleetVehicle         FleetFuelTransaction
  .status=maintenance   (if fuel-related)
```

**Interval types:** `kilometers`, `months`, `both`

### 3.5 Fuel / Cost Tracking

```
FuelTransaction (vehicle, driver, station, liters, cost)
    ↓
Cost Record (vehicle, type, amount, category)
    ↓
FleetCost summary: byType (fuel, maintenance, insurance, toll, parking, other)
                    byCategory (operational, maintenance, fixed)
```

### 3.6 GPS Tracking Flow

```
GPS Device (gpsDeviceId/imei)
    ↓
FleetGpsLocation (lat, lng, speed, heading, isMoving, isIdle)
    ↓                        ↓
Driver App polling        Live map display
(10s interval)            (live.tsx)
    ↓
Driver Route actual path
(driver-route.ts API)
```

---

## 4. User Journey

### Driver
1. **Login** via Driver App (external integration)
2. **View assigned route** for the day
3. **Start trip** → status changes to `in_progress`
4. **GPS pings** sent during trip (FleetGpsLocation)
5. **Submit delivery proof** at each stop (FleetDeliveryProof + signature + photos)
6. **Submit expenses** (toll, parking, meal) → status `submitted`
7. **Complete trip** → status changes to `completed`

### Fleet Manager / Dispatcher
1. **Live Fleet** page: Real-time map + driver list
2. **Select driver** → route overlay (planned stops + actual GPS path)
3. **Routes** page: Create/assign routes to vehicles + drivers
4. **Maintenance** page: Schedule maintenance, view records
5. **Fuel** page: View/add fuel transactions
6. **Leaderboard** page: View driver rankings
7. **Tracking** page: GPS map, alerts, geofence management

### Admin / Finance
1. **Expenses** page: Approve/reject driver expense submissions
2. **Costs** page: Fleet cost reporting by category
3. **KPI Dashboard**: Key metrics, charts, trends
4. **Command Center** (index): Unified view across Fleet + TMS + FMS + integrations

---

## 5. Technical Findings

### ✅ Strengths
1. **Comprehensive model coverage** — 10 models covering vehicles, drivers, routes, assignments, maintenance, fuel, GPS, expenses, delivery proofs, and inspections
2. **Dual-mode API pattern** — Several APIs (`live.ts`, `command-center.ts`, `driver-route.ts`, `leaderboard.ts`, `expenses/index.ts`, integration endpoints) attempt real DB queries with mock fallback — pragmatic for dev
3. **Integration-first design** — 5 integration endpoints (Driver App, HRIS, Finance, Inventory, Manufacturing) connecting Fleet to other modules
4. **Rich UI** — Live map with Leaflet, Recharts for KPI charts, polished gradient design system
5. **Standardized infrastructure** — Rate limiting, audit logging, validation, tenant isolation middleware used consistently
6. **GPS model is solid** — Includes: lat, lng, altitude, speed, heading, accuracy, isMoving, isIdle, idleDurationMinutes — covers all real-world tracking needs
7. **Bulk operations** in expenses API (approve, reject, mark-paid) — good for workflow efficiency

### ❌ Critical Issues

1. **🔴 ALL CORE CRUD APIs use mock data only** — `vehicles.ts`, `drivers.ts`, `routes.ts`, `maintenance.ts`, `fuel.ts`, `costs.ts`, `tracking.ts` all operate on in-memory JavaScript arrays. There are explicit `// TODO: When database is ready, replace with:` comments. This means vehicle/driver/route/maintenance/fuel/tracking modules are **non-functional in production**.

2. **🔴 Fleet models NOT in db object after registration** — The models are re-registered at `models/index.js` line 158-168 via `require()` but they define themselves via `sequelize.define()` at import time, meaning they register on the same sequelize instance. However, `db.FleetX = require(...)` overwrites the DB singleton's registered models. The `associate()` calls happen inside each model file, but no explicit `associate(db)` loop is called in the index. **Associations may not fire correctly** since there's no `Object.keys(db).forEach(...)` loop to call associations.

3. **🟡 Multiple mock data sources** — `lib/mockData/fleet.ts`, `lib/mockData/fleetAdvanced.ts`, `lib/mockData/fleetPhase2.ts`, plus inline mocks in several API files (routes, maintenance, costs, tracking). Data is fragmented and inconsistent.

4. **🟡 Vehicle Number uniqueness conflict** — `FleetVehicle` model defines BOTH `vehicleNumber` and `licensePlate` as `unique: true`. This is unusual — typically only license plate is unique. May cause issues with leased/rental vehicles that don't have their own registration.

5. **🟡 Missing dedicated vehicles/drivers list pages** — There's no `pages/hq/fleet/vehicles/index.tsx` or `pages/hq/fleet/drivers/index.tsx`. The list views are embedded in the FleetCommandCenter hub component. The only dedicated pages are `vehicles/[id].tsx` and `drivers/[id].tsx` (detail pages).

6. **🟡 API route structure inconsistent** — Some pages hit `/api/hq/fleet/*` (correct path) while others hit `/api/fleet/*` (wrong path, no middleware). For example:
   - `fuel.tsx` fetches from `/api/fleet/fuel` (WRONG — should be `/api/hq/fleet/fuel`)
   - `costs.tsx` fetches from `/api/fleet/costs` (WRONG)
   - `routes.tsx` fetches from `/api/fleet/routes` (WRONG)
   - `kpi.tsx` fetches from `/api/fleet/vehicles` (WRONG)
   - `maintenance.tsx` fetches from both `/api/fleet/maintenance/schedules` and `/api/hq/fleet/maintenance` (mixed!)

7. **🟢 GPS model has no index on (driver_id, timestamp)** — The query in `driver-route.ts` does `WHERE driver_id = :did AND timestamp >= :since ORDER BY timestamp ASC` — no composite index defined. With many pings, this will be slow.

8. **🟢 `FleetVehicleInspection` model missing `createdAt`/`updatedAt`** — Unlike other models, this model has `timestamps: true` set but the actual columns are not explicitly defined. Sequelize will add them automatically, but consistency is broken.

9. **🟢 `FleetDriverExpense` model missing `updatedAt` column** — Missing `updatedAt` field definition (only `createdAt` would be auto-managed); `updatedAt` will exist via timestamps:true but no explicit column definition.

### Database Indexes
| Model | Indexes |
|-------|---------|
| FleetFuelTransaction | vehicle_id, driver_id, transaction_date, tenant_id (✅ well-indexed) |
| FleetGpsLocation | ❌ NONE — missing composite index on (driver_id, timestamp) |
| All others | ❌ No explicit indexes defined beyond default PK |

---

## 6. UX Findings

### ✅ Strengths
1. **Live fleet page is excellent** — Real-time polling (10s), Google Maps link, route overlay toggle, driver detail panel, search/filter, auto-refresh toggle
2. **Leaderboard page polished** — Podium display, multiple metric views, medal/rank styling
3. **Consistent design language** — Gradient headers, Lucide icons, shadow cards, responsive grid
4. **Expense approval UX good** — Bulk select, approve/reject, individual detail view, receipt photos, category breakdown
5. **KPI page feature-rich** — 4 KPI sections (fleet summary, operational, efficiency/cost, maintenance/safety), 3 chart types (area, bar, pie), time range selector

### ❌ UX Issues
1. **No skeleton loading states** — Most pages show nothing until mounted (`if (!mounted) return null`) then flash content
2. **No dedicated vehicles list/drivers list pages** — Users must use the command center hub or direct links
3. **Missing empty/error states on several pages** — fuel.tsx, maintenance.tsx assume data will be there
4. **Inconsistent Indonesian/English UI** — Some pages use `t('fleet.xxx')` i18n, others hardcode English labels
5. **No pagination on records** — All list views load all records at once
6. **GPS tracking page uses static mock data by default** — Falls back to `mockGPSLocations` without indicating it's mock
7. **KPI page hardcodes chart data** — `monthlyPerformanceData`, `costBreakdownData` etc. are static arrays, not from API

---

## 7. Relationship to TMS & FMS Modules

### TMS (Transport Management System)
- **Page:** `pages/hq/tms/index.tsx` (1097 lines, very large)
- **API:** `pages/api/hq/tms/index.ts`, `pages/api/hq/tms/enhanced.ts`
- **Focus:** Shipments, trips, carriers, billing, zones, rate cards, warehouses, customer-facing logistics
- **Fleet overlap:** Fleet has basic routes + route assignments; TMS has full shipment lifecycle, carrier management, billing
- **Shared tables:** `tms_shipments`, `tms_trips`, `tms_freight_bills` are queried by Fleet's `command-center.ts`

### FMS (Fleet Management System — new)
- **Page:** `pages/hq/fms/index.tsx` (1722 lines, very large — single-page app style)
- **API:** `pages/api/hq/fms/index.ts`, `enhanced.ts`, `analytics.ts`
- **Focus:** Vehicles, drivers, maintenance, fuel, rentals, inspections, incidents, documents, GPS, tires, analytics, geofences, violations, reminders — essentially **superset of Fleet module**
- **Fleet overlap:** FMS has its own `fms_vehicles`, `fms_drivers`, `fms_maintenance_records`, `fms_fuel_records` tables
- **Dual system problem:** Fleet (legacy) and FMS (new) coexist with duplicated tables. The command center has fallback logic: "try fms_* tables first, then fleet_*"

### Key Insight: Migration in Progress
The presence of both `fleet_*` (old) and `fms_*` (new) tables, plus the `fms/index.tsx` being a massive single-page app, strongly suggests **the Fleet module is being replaced/migrated to FMS**. The command center API acts as an abstraction layer over both.

---

## 8. Prioritized Fix List

### 🔴 P0 — Production-Blocking (Must Fix)

| # | Issue | Component | Effort | Impact |
|---|-------|-----------|--------|--------|
| 1 | **Core CRUD APIs use mock data only** | vehicles, drivers, routes, maintenance, fuel, costs, tracking APIs | Large | All CRUD operations are ephemeral |
| 2 | **Wrong API paths in frontend pages** | fuel.tsx, costs.tsx, routes.tsx, kpi.tsx, maintenance.tsx | Medium | Network 404s in production |
| 3 | **Model associations may not initialize** | models/index.js | Small | Broken JOIN queries |

### 🟡 P1 — Important

| # | Issue | Component | Effort | Impact |
|---|-------|-----------|--------|--------|
| 4 | **FMS vs Fleet dual system cleanup** | All fleet + fms files | Large | Confusion, duplicated tables, wasted effort |
| 5 | **Missing composite index on GPS (driver_id, timestamp)** | FleetGpsLocation model | Small | Slow real-time queries |
| 6 | **Inconsistent Indonesian/English localization** | All page files | Medium | Poor UX |
| 7 | **No pagination on lists** | routes, maintenance, fuel, costs, expenses pages | Medium | UI freeze with many records |
| 8 | **KPI page uses hardcoded chart data** | kpi.tsx | Medium | Charts show fake data |

### 🟢 P2 — Nice to Have

| # | Issue | Component | Effort | Impact |
|---|-------|-----------|--------|--------|
| 9 | No skeleton loading states | Live, tracking, kpi pages | Small | Better perceived performance |
| 10 | Missing vehicles/drivers list pages | fleet/vehicles, fleet/drivers | Medium | Navigation gap |
| 11 | Missing empty/error states | fuel, maintenance, costs pages | Small | UX polish |
| 12 | GPS model missing indexes | FleetGpsLocation model | Small | Query performance |

---

## 9. Summary

The Fleet module is **structurally comprehensive** with 10 models, 13 pages, 18 API endpoints, and 8 UI components covering every major fleet functionality: vehicles, drivers, routes, maintenance, fuel, costs, GPS tracking, expenses, inspections, and delivery proofs. The module also includes a unified Command Center hub that aggregates Fleet + TMS + FMS data with cross-module integrations.

**The critical finding is that most core APIs run on in-memory mock data** and have not been connected to the database. While the `live.ts`, `command-center.ts`, `leaderboard.ts`, and `expenses/` APIs have real SQL queries, the core CRUD operations (create/update/delete vehicles, drivers, routes, maintenance, fuel) are non-persistent.

Additionally, there is a **dual-system migration pattern** where the legacy `Fleet` module and the new `FMS` module coexist with mirrored table structures. The Fleet module serves as the legacy front while FMS represents the future direction, with the Command Center acting as a unified abstraction layer.

**Total file count:** ~55 meaningful source files (13 pages + 18 APIs + 10 models + 8 components + 3 mock files + 1 service + 1 translation + 1 TMS + 1 FMS)
