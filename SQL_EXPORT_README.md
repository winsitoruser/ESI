# 📦 SQL Database Export - Bedagang Project

Complete SQL database export package untuk project Bedagang Inventory & POS Management System.

---

## 📁 Files Included

### **1. DATABASE_EXPORT_COMPLETE.sql** ⭐ (RECOMMENDED)
**Size:** ~1000+ lines  
**Description:** Complete database schema dengan semua tables, indexes, triggers, dan seed data  
**Use Case:** Setup database baru dari awal

**Contains:**
- ✅ 17+ tables (categories, products, inventory, transfers, RAC, waste, returns)
- ✅ 50+ indexes untuk performa optimal
- ✅ 10+ triggers untuk auto-update timestamps
- ✅ Seed data (categories, locations, suppliers, products)
- ✅ Foreign key constraints
- ✅ Check constraints untuk data validation
- ✅ Comments untuk dokumentasi

**How to Use:**
```bash
# Create database
createdb bedagang_db

# Import complete schema
psql -U postgres -d bedagang_db -f DATABASE_EXPORT_COMPLETE.sql

# Done!
```

---

### **2. Individual Migration Files**

#### **migrations/20260127000002-create-inventory-system.sql**
**Size:** ~300 lines  
**Description:** Core inventory system tables  
**Tables:** categories, suppliers, locations, products, inventory_stock, stock_movements, stock_adjustments

#### **migrations/20260126000005-create-inventory-transfers.sql**
**Size:** ~150 lines  
**Description:** Inventory transfer system  
**Tables:** inventory_transfers, inventory_transfer_items, inventory_transfer_history

#### **migrations/20260127000001-create-rac-system.sql**
**Size:** ~130 lines  
**Description:** RAC (Request, Adjust, Count) system  
**Tables:** rac_requests, rac_request_items, rac_request_history

#### **scripts/create-waste-table.sql**
**Size:** ~70 lines  
**Description:** Waste management system  
**Tables:** wastes

#### **migrations/manual-add-invoice-columns.sql**
**Size:** ~40 lines  
**Description:** Add invoice tracking to returns  
**Modifies:** returns table

#### **migrations/20260126000004-add-stock-opname-to-returns.sql**
**Size:** ~50 lines  
**Description:** Integrate stock opname with returns  
**Modifies:** returns, stock_opname_items tables

---

## 🎯 Quick Start Options

### **Option 1: Complete Setup (Recommended)**
Untuk setup database baru dari awal:

```bash
psql -U postgres -d bedagang_db -f DATABASE_EXPORT_COMPLETE.sql
```

**Pros:**
- ✅ One command setup
- ✅ All tables, indexes, triggers included
- ✅ Seed data included
- ✅ Verified and tested

**Cons:**
- ❌ Large file size

---

### **Option 2: Incremental Setup**
Untuk setup bertahap atau customization:

```bash
# 1. Core system
psql -U postgres -d bedagang_db -f migrations/20260127000002-create-inventory-system.sql

# 2. Transfers
psql -U postgres -d bedagang_db -f migrations/20260126000005-create-inventory-transfers.sql

# 3. RAC system
psql -U postgres -d bedagang_db -f migrations/20260127000001-create-rac-system.sql

# 4. Waste management
psql -U postgres -d bedagang_db -f scripts/create-waste-table.sql

# 5. Returns enhancements
psql -U postgres -d bedagang_db -f migrations/manual-add-invoice-columns.sql
psql -U postgres -d bedagang_db -f migrations/20260126000004-add-stock-opname-to-returns.sql
```

**Pros:**
- ✅ Flexible
- ✅ Can skip modules you don't need
- ✅ Easier to debug

**Cons:**
- ❌ Multiple commands
- ❌ Must run in correct order

---

## 📊 Database Schema Overview

### **Master Data Tables**
```
categories (6 records)
├── Obat Keras
├── Obat Bebas
├── Obat Bebas Terbatas
├── Vitamin & Suplemen
├── Obat Luar
└── Alat Kesehatan

suppliers (5 records)
├── PT Kimia Farma (SUP-001)
├── PT Dexa Medica (SUP-002)
├── PT Bayer Indonesia (SUP-003)
├── PT Eagle Indo Pharma (SUP-004)
└── PT Mahakam Beta Farma (SUP-005)

locations (6 records)
├── Gudang Pusat (WH-001)
├── Toko Cabang A (ST-001)
├── Toko Cabang B (ST-002)
├── Gudang Regional Jakarta (WH-002)
├── Toko Cabang C (ST-003)
└── Toko Cabang D (ST-004)

products (8 records)
├── Paracetamol 500mg (MED-PCT-500)
├── Amoxicillin 500mg (MED-AMX-500)
├── Vitamin C 1000mg (SUP-VTC-1000)
├── Antasida Tablet (MED-ANT-001)
├── Minyak Kayu Putih 60ml (OTC-MKP-60)
├── Cefixime 200mg (MED-CFX-200)
├── Betadine Solution 60ml (OTC-BET-60)
└── Ibuprofen 400mg (MED-IBU-400)
```

### **Inventory Tables**
- `inventory_stock` - Current stock per product per location
- `stock_movements` - All stock transactions history
- `stock_adjustments` - Stock adjustment headers
- `stock_adjustment_items` - Adjustment line items

### **Transfer System**
- `inventory_transfers` - Transfer requests between locations
- `inventory_transfer_items` - Transfer line items
- `inventory_transfer_history` - Audit trail

### **RAC System**
- `rac_requests` - Request, Adjust, Count requests
- `rac_request_items` - Request line items
- `rac_request_history` - Audit trail

### **Waste Management**
- `wastes` - Waste and defect tracking

### **Returns System**
- `returns` - Product returns with invoice tracking

---

## 🔍 Verification

After import, verify with these queries:

```sql
-- Check all tables created
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
-- Expected: 17+ tables

-- Check seed data
SELECT 
  (SELECT COUNT(*) FROM categories) as categories,
  (SELECT COUNT(*) FROM suppliers) as suppliers,
  (SELECT COUNT(*) FROM locations) as locations,
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM inventory_stock) as stock_records;
-- Expected: 6, 5, 6, 8, 8

-- Check indexes
SELECT COUNT(*) FROM pg_indexes 
WHERE schemaname = 'public';
-- Expected: 50+ indexes

-- Check triggers
SELECT COUNT(*) FROM information_schema.triggers 
WHERE trigger_schema = 'public';
-- Expected: 10+ triggers
```

---

## 📋 Table Relationships

```
products
├── FK → categories (category_id)
├── FK → suppliers (supplier_id)
├── ← inventory_stock (product_id)
├── ← stock_movements (product_id)
└── ← wastes (product_id)

inventory_stock
├── FK → products (product_id)
└── FK → locations (location_id)

stock_movements
├── FK → products (product_id)
└── FK → locations (location_id)

inventory_transfers
├── FK → locations (from_location_id)
├── FK → locations (to_location_id)
└── ← inventory_transfer_items (transfer_id)

rac_requests
├── FK → locations (from_location_id)
├── FK → locations (to_location_id)
└── ← rac_request_items (request_id)

returns
├── FK → stock_opname (stock_opname_id)
└── FK → stock_opname_items (stock_opname_item_id)
```

---

## 🔧 Customization

### Add Custom Categories

```sql
INSERT INTO categories (name, description) VALUES
  ('Your Category', 'Description here');
```

### Add Custom Locations

```sql
INSERT INTO locations (name, code, type, city) VALUES
  ('Your Store', 'ST-005', 'store', 'Your City');
```

### Add Custom Products

```sql
INSERT INTO products (name, sku, category_id, supplier_id, unit, buy_price, sell_price) VALUES
  ('Your Product', 'YOUR-SKU', 1, 1, 'pcs', 10000, 15000);
```

---

## 🚨 Important Notes

### **Before Import:**
1. ✅ Backup existing database (if any)
2. ✅ Check PostgreSQL version (12+ required)
3. ✅ Ensure sufficient disk space
4. ✅ Check user permissions

### **After Import:**
1. ✅ Run verification queries
2. ✅ Test application connection
3. ✅ Update `.env` with database credentials
4. ✅ Test CRUD operations

### **Production Deployment:**
1. ⚠️ Change default passwords
2. ⚠️ Enable SSL connections
3. ⚠️ Configure backup schedule
4. ⚠️ Set up monitoring
5. ⚠️ Restrict network access

---

## 📞 Support & Documentation

- **Setup Guide:** `DATABASE_SETUP_GUIDE.md`
- **API Documentation:** Check `/docs` folder
- **GitHub:** https://github.com/winsitoruser/bedagang
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

## 📝 Changelog

### Version 1.0.0 (2026-01-28)
- ✅ Initial complete database export
- ✅ 17+ tables with full relationships
- ✅ 50+ indexes for performance
- ✅ 10+ triggers for automation
- ✅ Seed data for quick start
- ✅ Complete documentation

---

## 🎉 Ready to Use!

Your database export package is complete and ready to deploy. Choose your setup method and follow the instructions above.

**Recommended:** Start with `DATABASE_EXPORT_COMPLETE.sql` for quickest setup!

---

**Export Date:** January 28, 2026  
**Database:** PostgreSQL 14+  
**Project:** Bedagang Inventory & POS System  
**Version:** 1.0.0
