# 🐛 Bugs Found During Testing - 25 Jan 2026

## Bug #1: Column "deletedAt" does not exist ✅ FIXED

**API:** `/api/inventory/stats`  
**Error:** `column Product.deletedAt does not exist`

**Root Cause:**
Sequelize query mencoba mengakses kolom `deletedAt` dengan paranoid mode, tapi kolom menggunakan snake_case di database.

**Fix Applied:**
- Changed `isActive` → `is_active`
- Changed `createdAt` → `created_at`
- Added `paranoid: false` to all queries
- Fixed cost calculation to use `purchase_price` fallback

**Status:** ✅ FIXED - API returns data successfully

---

## Bug #2: Supplier association not defined ✅ FIXED

**API:** `/api/products`  
**Error:** `Supplier is not associated to Product!`

**Root Cause:**
Model associations belum di-setup di Product model, dan API mencoba include Supplier.

**Fix Applied:**
- Added Supplier association to Product model
- Made include `required: false` in API query
- Added ProductPrice and ProductVariant associations

**Status:** ✅ FIXED - API returns products successfully

---

## Bug #3: Column "updatedAt" does not exist ✅ FIXED

**API:** `/api/inventory/activities`  
**Error:** `column "updatedAt" does not exist`

**Root Cause:**
Query menggunakan camelCase tapi database menggunakan snake_case.

**Fix Applied:**
- Changed `updatedAt` → `updated_at`
- Changed `createdAt` → `created_at`
- Changed `isActive` → `is_active`
- Added `paranoid: false` to query

**Status:** ✅ FIXED - API returns activities successfully
