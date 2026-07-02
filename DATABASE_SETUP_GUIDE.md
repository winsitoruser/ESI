# 📊 Database Setup Guide - Bedagang Project

Complete guide untuk setup database PostgreSQL untuk project Bedagang.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Setup](#quick-setup)
3. [Manual Setup](#manual-setup)
4. [Database Structure](#database-structure)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required Software:
- **PostgreSQL** 12+ (Recommended: 14+)
- **psql** command-line tool
- **pgAdmin** (Optional, for GUI)

### Installation:

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
- Download from: https://www.postgresql.org/download/windows/
- Run installer and follow wizard

---

## ⚡ Quick Setup

### Option 1: Complete Database Export (Recommended)

```bash
# 1. Create database
createdb bedagang_db

# 2. Run complete export
psql -U postgres -d bedagang_db -f DATABASE_EXPORT_COMPLETE.sql

# Done! Database is ready to use
```

### Option 2: Using Docker

```bash
# 1. Create docker-compose.yml (see below)
docker-compose up -d

# 2. Import database
docker exec -i bedagang_postgres psql -U postgres -d bedagang_db < DATABASE_EXPORT_COMPLETE.sql
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14
    container_name: bedagang_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: bedagang_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 🔨 Manual Setup

### Step 1: Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE bedagang_db;

# Connect to database
\c bedagang_db

# Exit
\q
```

### Step 2: Run Migrations in Order

```bash
# 1. Core inventory system
psql -U postgres -d bedagang_db -f migrations/20260127000002-create-inventory-system.sql

# 2. Inventory transfers
psql -U postgres -d bedagang_db -f migrations/20260126000005-create-inventory-transfers.sql

# 3. RAC system
psql -U postgres -d bedagang_db -f migrations/20260127000001-create-rac-system.sql

# 4. Waste management
psql -U postgres -d bedagang_db -f scripts/create-waste-table.sql

# 5. Returns enhancements
psql -U postgres -d bedagang_db -f migrations/manual-add-invoice-columns.sql
psql -U postgres -d bedagang_db -f migrations/20260126000004-add-stock-opname-to-returns.sql
```

---

## 📊 Database Structure

### Core Tables (17+ tables)

#### **Master Data:**
- `categories` - Product categories
- `suppliers` - Supplier information
- `locations` - Warehouses and stores
- `products` - Product master data

#### **Inventory Management:**
- `inventory_stock` - Current stock levels
- `stock_movements` - Stock transaction history
- `stock_adjustments` - Stock adjustments
- `stock_adjustment_items` - Adjustment details

#### **Transfer System:**
- `inventory_transfers` - Transfer requests
- `inventory_transfer_items` - Transfer line items
- `inventory_transfer_history` - Transfer audit trail

#### **RAC System:**
- `rac_requests` - RAC requests
- `rac_request_items` - Request line items
- `rac_request_history` - Request audit trail

#### **Waste Management:**
- `wastes` - Waste and defect tracking

#### **Returns:**
- `returns` - Product returns (enhanced with invoice tracking)

---

## ✅ Verification

### Check Tables Created

```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Count tables
SELECT COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Check Seed Data

```sql
-- Check categories
SELECT COUNT(*) FROM categories;
-- Expected: 6 categories

-- Check locations
SELECT COUNT(*) FROM locations;
-- Expected: 6 locations

-- Check suppliers
SELECT COUNT(*) FROM suppliers;
-- Expected: 5 suppliers

-- Check products
SELECT COUNT(*) FROM products;
-- Expected: 8 products

-- Check initial stock
SELECT COUNT(*) FROM inventory_stock;
-- Expected: 8 stock records
```

### Check Indexes

```sql
-- List all indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Check Triggers

```sql
-- List all triggers
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

---

## 🔍 Sample Queries

### Get Products with Stock

```sql
SELECT 
    p.name,
    p.sku,
    l.name as location,
    s.quantity,
    s.available_quantity
FROM products p
JOIN inventory_stock s ON p.id = s.product_id
JOIN locations l ON s.location_id = l.id
ORDER BY p.name;
```

### Get Low Stock Products

```sql
SELECT 
    p.name,
    p.sku,
    p.minimum_stock,
    SUM(s.quantity) as total_stock
FROM products p
LEFT JOIN inventory_stock s ON p.id = s.product_id
GROUP BY p.id, p.name, p.sku, p.minimum_stock
HAVING SUM(COALESCE(s.quantity, 0)) < p.minimum_stock
ORDER BY total_stock;
```

### Get Stock Movements (Last 7 days)

```sql
SELECT 
    p.name as product,
    l.name as location,
    sm.movement_type,
    sm.quantity,
    sm.reference_type,
    sm.created_at
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
LEFT JOIN locations l ON sm.location_id = l.id
WHERE sm.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY sm.created_at DESC
LIMIT 50;
```

---

## 🐛 Troubleshooting

### Issue: "database does not exist"

```bash
# Create the database first
createdb bedagang_db
```

### Issue: "permission denied"

```bash
# Grant permissions
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE bedagang_db TO your_user;"
```

### Issue: "relation already exists"

```sql
-- Drop and recreate (WARNING: This deletes all data!)
DROP DATABASE bedagang_db;
CREATE DATABASE bedagang_db;
```

### Issue: "function already exists"

```sql
-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_rac_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_wastes_updated_at() CASCADE;

-- Then run the migration again
```

### Issue: Seed data not inserting

```sql
-- Check for conflicts
SELECT * FROM categories WHERE name = 'Obat Keras';

-- If exists, seed data was already inserted
-- Use ON CONFLICT DO NOTHING to avoid duplicates
```

---

## 🔐 Security Recommendations

### 1. Create Application User

```sql
-- Create user for application
CREATE USER bedagang_app WITH PASSWORD 'secure_password_here';

-- Grant permissions
GRANT CONNECT ON DATABASE bedagang_db TO bedagang_app;
GRANT USAGE ON SCHEMA public TO bedagang_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bedagang_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bedagang_app;
```

### 2. Enable SSL (Production)

```bash
# Edit postgresql.conf
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
```

### 3. Restrict Access

```bash
# Edit pg_hba.conf
# Only allow local connections
host    bedagang_db    bedagang_app    127.0.0.1/32    md5
```

---

## 📦 Backup & Restore

### Backup Database

```bash
# Full backup
pg_dump -U postgres bedagang_db > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -U postgres bedagang_db | gzip > backup_$(date +%Y%m%d).sql.gz

# Schema only
pg_dump -U postgres --schema-only bedagang_db > schema_backup.sql

# Data only
pg_dump -U postgres --data-only bedagang_db > data_backup.sql
```

### Restore Database

```bash
# From SQL file
psql -U postgres bedagang_db < backup_20260128.sql

# From compressed file
gunzip -c backup_20260128.sql.gz | psql -U postgres bedagang_db
```

---

## 🚀 Next Steps

After database setup:

1. **Configure Application**
   - Update `.env` file with database credentials
   - Test database connection

2. **Run Application Migrations**
   - If using Sequelize: `npm run migrate`
   - If using TypeORM: `npm run typeorm migration:run`

3. **Seed Additional Data** (Optional)
   - Import customer data
   - Import historical transactions
   - Import user accounts

4. **Test API Endpoints**
   - Test product CRUD operations
   - Test inventory movements
   - Test stock transfers

---

## 📞 Support

For issues or questions:
- Check logs: `/var/log/postgresql/`
- PostgreSQL docs: https://www.postgresql.org/docs/
- Project repository: https://github.com/winsitoruser/bedagang

---

**Last Updated:** January 28, 2026  
**Database Version:** PostgreSQL 14+  
**Schema Version:** 1.0.0
