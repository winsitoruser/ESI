# FK Ordering Analysis Report
## Generated: $(date)
## Scope: Remaining migrations after archiving excluded modules

---

## DUPLICATE MIGRATIONS CHECK

### Products Table: 20260115 vs 20260116
- **20260115-create-products-table.js** (170 lines): Creates `products` table + bulk inserts 6 sample product records. NO guard clause.
- **20260116-create-products-table.js** (95 lines): Creates `products` table only. HAS guard clause (`if table exists, skip`). No sample data.

**Verdict: NOT duplicates.** The 01-16 version is a safety replacement with a guard clause. The 01-15 has seed data. Recommend keeping both since they serve different purposes, OR keeping 01-16 (safe) and moving 01-15 seed data to a seeder file.

Also note: **20260127000002-create-inventory-system.js** also creates `products` (line 169) — a THIRD products table definition with FK to `categories` and `suppliers`. No guard clause.

---

## ARCHIVED FILES
13 migration files moved to `migrations/_archived/`:
- PoS: 20240219-create-pos-transactions.js
- FnB: 20240220-create-kitchen-orders.js, 20240221-create-kitchen-inventory.js, 20260217000000-create-kitchen-tables.js, 20260213-create-tables-reservations.js, 20260222-master-recipe-sync.js, 20260227-add-fnb-columns-to-modules.js
- Promo/Voucher: 20260204-create-promo-advanced-tables.js, 20260204-create-promo-voucher-tables.js
- Loyalty: 20260204-create-loyalty-tables.js
- DMS: 20260502-create-dms-brankas-digital-tables.js, 20260503-create-dms-national-archive-tables.js, 20260702000001-add-dms-mata-elang-file-fk.js

---

## FK ORDERING ISSUES SUMMARY

### Total: 154 potential FK ordering issues across remaining migrations.

### CRITICAL ISSUES (will break if running migrations from scratch):

#### 1. TENANTS TABLE (most impactful)
- Created in: `20260224-create-tenants-table.js` (has IF NOT EXISTS guard)
- Referenced by 40+ earlier migrations that would fail on FK constraint
- **Key files referencing tenants before it exists:**
  - 20260213-create-modular-system.js
  - 20260217-create-billing-tables.js
  - 20260222-* (dozens of files)
  - 20260223-create-kyb-system.js
  - 20260223-create-missing-tables-part*.js
  - 20260223-enhance-kyb-provisioning.js
  - 20260224-create-stores-*.js
  - 20260224-create-sync-logs-table.js
  - 20260224-add-tenant-to-branches.js

#### 2. BRANCHES TABLE
- First created in: `20260223-enhance-kyb-provisioning.js` (has IF NOT EXISTS guard)
- Also created in: `20260224-create-branches-table.js`, `20260228000002-create-branches-table.js`
- Referenced by 20+ earlier migrations (20260118-create-inventory-tables.js, many 20260222-* files)

#### 3. EMPLOYEES TABLE
- Created in: `20260223-create-missing-tables-part1.js` (has IF NOT EXISTS guard)
- Referenced by earlier migrations: 20260117, 20260118, 20260213, 20260222, etc.

#### 4. CUSTOMERS TABLE
- Created in: `20260223-create-missing-tables-part1.js`, `20260204-update-customers-table.js`
- Referenced by earlier migrations: 20260118-create-inventory-tables.js

### MINOR FK ORDERING ISSUES (within same day):

#### 5. SAME-DAY REORDERING NEEDED:
| File | References Table | Created In |
|------|-----------------|------------|
| 20260117-create-loyalty-tables.js | employees | 20260223-create-missing-tables-part1.js |
| 20260118-create-inventory-tables.js | branches | 20260223-enhance-kyb-provisioning.js |
| 20260118-create-inventory-tables.js | suppliers | 20260125-create-suppliers-table.js |
| 20260118-create-inventory-tables.js | customers | 20260204-update-customers-table.js |
| 20260124-create-stock-opname-tables.js | warehouses, locations | 20260124-create-warehouse-location-tables.js |
| 20260125-create-recipe-history.js | recipes | 20260125-create-recipes-table.js |
| 20260204-create-finance-extended-tables.js | customers | 20260204-update-customers-table.js |
| 20260221-create-integration-enhancements.js | partner_integrations | 20260221-create-integrations.js |
| 20260226-create-fleet-fuel-transactions.js | fleet_vehicles, fleet_drivers | 20260226-create-fleet-management.js |

### TABLES REFERENCED BUT NOT FOUND (7):
| Table | Referenced By | Note |
|-------|--------------|------|
| pos_transactions | 20260117-create-loyalty-tables.js | PoS module (archived) |
| employee_attendances | 20260222-add-gps-attendance.js | Not created in any remaining migration |
| inventory_warehouses | 20260226-create-inventory-tables.js | Not created in any remaining migration |
| sfa_leads, sfa_visits, sfa_opportunities | 20260301-add-crm-sfa-integration-columns.js | SFA module - may be in seeders |
| vendors | 20260222-create-purchase-requisitions.js | Not created in any remaining migration |

---

## RECOMMENDATIONS

### Critical: Fix before running fresh migration
1. **Move `20260224-create-tenants-table.js`** to run FIRST in the migration chain (rename to 20260101-*)
2. **Move `20260223-create-missing-tables-part1.js`** (creates employees, customers) to run early (rename to 20260110-*)
3. **Move `20260223-enhance-kyb-provisioning.js`** (creates branches) to run after employees but before other migrations that reference it

### Moderate: Reorder within same day
4. Rename `20260124-create-warehouse-location-tables.js` to run before `20260124-create-stock-opname-tables.js`
5. Rename `20260125-create-suppliers-table.js` to run before `20260118-create-inventory-tables.js`? No — can't change date order. Need to add IF NOT EXISTS guards.
6. Swap `20260221-create-integrations.js` and `20260221-create-integration-enhancements.js` order
7. Swap `20260226-create-fleet-management.js` and `20260226-create-fleet-fuel-transactions.js` order

### Recommended approach: Add IF NOT EXISTS guards
Rather than renaming files (which causes git history chaos), add `queryInterface.showAllTables()` guards to the early migration files so they skip execution if the referenced/dependent tables don't exist yet. The later migration files already have these guards.

---

## REMAINING MIGRATION COUNT
- **Total active files:** 129
- **Files archived:** 13
- **Total originally:** 142
