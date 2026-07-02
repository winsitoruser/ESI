# 📊 Database Tables Summary - Bedagang

## Tabel-tabel yang Sudah Ada di Database

Berdasarkan file `DATABASE_EXPORT_COMPLETE.sql`, berikut adalah **semua tabel** yang sudah dibuat:

---

## 🗄️ **INVENTORY SYSTEM (8 Tables)**

### 1. **categories**
- Product categories and subcategories
- Support hierarchical (parent-child)
- Fields: id, name, description, parent_id, is_active

### 2. **suppliers**
- Supplier master data
- Fields: id, name, code, contact_person, phone, email, address, city, country, tax_number, payment_terms

### 3. **locations**
- Warehouse and store locations
- Fields: id, name, code, type, address, city, phone, manager

### 4. **products**
- Product master data
- Fields: id, name, sku, barcode, category_id, supplier_id, description, unit, buy_price, sell_price, minimum_stock, maximum_stock, reorder_point

### 5. **inventory_stock**
- Current stock levels per product per location
- Fields: id, product_id, location_id, quantity, reserved_quantity, available_quantity

### 6. **stock_movements**
- Stock movement history for all transactions
- Fields: id, product_id, location_id, movement_type, quantity, reference_type, reference_id, notes

### 7. **stock_adjustments**
- Stock adjustment headers
- Fields: id, adjustment_number, location_id, adjustment_date, reason, status, approved_by, notes

### 8. **stock_adjustment_items**
- Stock adjustment line items
- Fields: id, adjustment_id, product_id, current_stock, adjusted_quantity, new_stock, reason

---

## 📦 **INVENTORY TRANSFERS (3 Tables)**

### 9. **inventory_transfers**
- Transfer stock antar cabang/lokasi
- Fields: id, transfer_number, from_location_id, to_location_id, request_date, priority, reason, status, approved_by, shipment_date, tracking_number, courier, received_date

### 10. **inventory_transfer_items**
- Item detail untuk setiap transfer
- Fields: id, transfer_id, product_id, quantity_requested, quantity_approved, quantity_shipped, quantity_received, notes

### 11. **inventory_transfer_history**
- History perubahan status transfer
- Fields: id, transfer_id, status_from, status_to, changed_by, changed_at, notes

---

## 🔄 **RAC SYSTEM (3 Tables)**

### 12. **rac_requests**
- RAC (Request, Adjust, Count) main requests table
- Fields: id, request_number, request_type, from_location_id, to_location_id, priority, reason, status, requested_by, approved_by

### 13. **rac_request_items**
- Line items for each RAC request
- Fields: id, request_id, product_id, quantity_requested, quantity_approved, current_stock, notes

### 14. **rac_request_history**
- Audit trail for RAC request status changes
- Fields: id, request_id, status_from, status_to, changed_by, changed_at, notes

---

## 🗑️ **WASTE MANAGEMENT (2 Tables)**

### 15. **wastes**
- Waste/disposal records
- Fields: id, waste_number, product_id, location_id, quantity, reason, waste_date, approved_by, status

### 16. **waste_items** (if exists)
- Waste line items

---

## 💰 **FINANCE SETTINGS (6 Tables) - BARU**

### 17. **payment_methods** ✨ NEW
- Metode pembayaran
- Fields: id, code, name, description, fees, processing_time, icon, is_active, sort_order
- **Default:** 7 methods (Cash, Bank Transfer, Credit Card, QRIS, E-Wallet, COD)

### 18. **bank_accounts** ✨ NEW
- Rekening bank perusahaan
- Fields: id, bank_name, bank_code, account_number, account_name, branch, swift_code, is_primary, is_active
- **Default:** 3 accounts (BCA, Mandiri, BNI)

### 19. **finance_categories** ✨ NEW
- Kategori pendapatan & pengeluaran
- Fields: id, code, name, type, description, parent_id, icon, color, is_active, sort_order
- **Default:** 15 categories (10 expense, 5 income)

### 20. **chart_of_accounts** ✨ NEW
- Bagan akun (Chart of Accounts)
- Fields: id, code, name, category, sub_category, normal_balance, parent_id, level, is_active, is_system
- **Default:** 40+ accounts (Indonesian standard COA)

### 21. **company_assets** ✨ NEW
- Aset perusahaan
- Fields: id, code, name, category, purchase_date, purchase_value, current_value, depreciation_rate, depreciation_method, useful_life, location, condition
- **Default:** 4 assets

### 22. **finance_settings** ✨ NEW
- Pengaturan sistem keuangan
- Fields: id, setting_key, setting_value, setting_type, description, is_system
- **Default:** 10 settings (company info, tax rates, fiscal year, etc)

---

## 📊 **TOTAL TABLES**

| Category | Tables | Status |
|----------|--------|--------|
| Inventory System | 8 | ✅ Existing |
| Inventory Transfers | 3 | ✅ Existing |
| RAC System | 3 | ✅ Existing |
| Waste Management | 2 | ✅ Existing |
| **Finance Settings** | **6** | **🆕 NEW (Belum di-migrate)** |
| **TOTAL** | **22** | - |

---

## ⚠️ **STATUS FINANCE SETTINGS TABLES**

### Tabel Finance Settings **BELUM ADA** di database!

Tabel-tabel berikut perlu di-migrate:
- ❌ payment_methods
- ❌ bank_accounts
- ❌ finance_categories
- ❌ chart_of_accounts
- ❌ company_assets
- ❌ finance_settings

### Cara Migrate:

**Option 1: Using psql**
```bash
psql -U postgres -d bedagang -f prisma/migrations/create_finance_settings_tables.sql
```

**Option 2: Using pgAdmin**
1. Buka pgAdmin
2. Connect ke database 'bedagang'
3. Open Query Tool
4. Copy paste isi file: `prisma/migrations/create_finance_settings_tables.sql`
5. Execute (F5)

**Option 3: Using DBeaver/DataGrip**
1. Connect ke database 'bedagang'
2. Open SQL Editor
3. Copy paste isi file migration
4. Execute

---

## 🔍 **Verify Migration**

Setelah migrate, jalankan query ini untuk verify:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'payment_methods',
  'bank_accounts', 
  'finance_categories',
  'chart_of_accounts',
  'company_assets',
  'finance_settings'
);

-- Should return 6 rows
```

```sql
-- Check record counts
SELECT 
  (SELECT COUNT(*) FROM payment_methods) as payment_methods,
  (SELECT COUNT(*) FROM bank_accounts) as bank_accounts,
  (SELECT COUNT(*) FROM finance_categories) as finance_categories,
  (SELECT COUNT(*) FROM chart_of_accounts) as chart_of_accounts,
  (SELECT COUNT(*) FROM company_assets) as company_assets,
  (SELECT COUNT(*) FROM finance_settings) as finance_settings;

-- Expected:
-- payment_methods: 7
-- bank_accounts: 3
-- finance_categories: 15
-- chart_of_accounts: 40+
-- company_assets: 4
-- finance_settings: 10
```

---

## 📝 **Next Steps**

1. **Migrate Finance Settings Tables** ⚡
   - Run SQL migration file
   - Verify tables created
   - Check default data inserted

2. **Test Finance Settings Page** 🧪
   - Access: `http://localhost:3001/finance/settings-new`
   - Verify data loading
   - Test all tabs

3. **Complete Implementation** 🚀
   - Add CRUD modals
   - Integrate with page
   - Test all features

---

**File Migration:** `prisma/migrations/create_finance_settings_tables.sql`  
**Documentation:** `FINANCE_SETTINGS_REVAMP.md`  
**Setup Guide:** `FINANCE_SETTINGS_SETUP_GUIDE.md`
