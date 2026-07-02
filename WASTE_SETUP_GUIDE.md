# 🚀 Waste Management System - Setup Guide

## ⚠️ Error Fix: Request failed with status code 500

Jika Anda mendapatkan error **"Request failed with status code 500"** saat mengakses halaman production, itu karena table `wastes` belum dibuat di database.

## 📋 Cara Setup

### Option 1: Menggunakan SQL Script (Recommended)

1. **Buka terminal** dan jalankan command berikut:

```bash
psql -U postgres -d farmanesia_dev -f scripts/create-waste-table.sql
```

Atau jika menggunakan password:

```bash
PGPASSWORD=your_password psql -U postgres -d farmanesia_dev -f scripts/create-waste-table.sql
```

2. **Restart development server**:

```bash
# Stop server (Ctrl+C)
npm run dev
```

3. **Refresh browser** di `http://localhost:3000/inventory/production`

### Option 2: Menggunakan psql Interactive

1. **Connect ke database**:

```bash
psql -U postgres -d farmanesia_dev
```

2. **Copy-paste SQL berikut**:

```sql
CREATE TABLE IF NOT EXISTS wastes (
  id SERIAL PRIMARY KEY,
  waste_number VARCHAR(50) UNIQUE NOT NULL,
  product_id INTEGER,
  product_name VARCHAR(255),
  product_sku VARCHAR(100),
  waste_type VARCHAR(50) NOT NULL CHECK (waste_type IN ('finished_product', 'raw_material', 'packaging', 'production_defect')),
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  cost_value DECIMAL(15,2) NOT NULL,
  reason TEXT NOT NULL,
  disposal_method VARCHAR(50) NOT NULL CHECK (disposal_method IN ('disposal', 'donation', 'clearance_sale', 'recycling')),
  clearance_price DECIMAL(15,2),
  waste_date TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'disposed', 'processed')),
  notes TEXT,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wastes_waste_number ON wastes(waste_number);
CREATE INDEX IF NOT EXISTS idx_wastes_product_id ON wastes(product_id);
CREATE INDEX IF NOT EXISTS idx_wastes_waste_type ON wastes(waste_type);
CREATE INDEX IF NOT EXISTS idx_wastes_waste_date ON wastes(waste_date);
CREATE INDEX IF NOT EXISTS idx_wastes_status ON wastes(status);
```

3. **Exit psql**:

```sql
\q
```

### Option 3: Menggunakan Database GUI (pgAdmin, DBeaver, etc)

1. Connect ke database `farmanesia_dev`
2. Open SQL Query window
3. Copy-paste SQL dari file `scripts/create-waste-table.sql`
4. Execute query

## ✅ Verifikasi Setup

Setelah table dibuat, verifikasi dengan:

```bash
psql -U postgres -d farmanesia_dev -c "\d wastes"
```

Output yang diharapkan:
```
                                          Table "public.wastes"
     Column      |            Type             | Collation | Nullable |              Default              
-----------------+-----------------------------+-----------+----------+-----------------------------------
 id              | integer                     |           | not null | nextval('wastes_id_seq'::regclass)
 waste_number    | character varying(50)       |           | not null | 
 product_id      | integer                     |           |          | 
 ...
```

## 🎯 Testing

1. **Buka browser**: `http://localhost:3000/inventory/production`
2. **Klik tombol**: "Catat Limbah"
3. **Isi form** dengan data test:
   - Tipe Limbah: `finished_product`
   - Nama Produk: `Test Product`
   - Jumlah: `5`
   - Satuan: `pcs`
   - Nilai Kerugian: `50000`
   - Alasan: `Testing waste management`
   - Metode Penanganan: `disposal`
   - Tanggal: Today's date
4. **Submit** dan lihat data muncul di list

## 🔧 Troubleshooting

### Error: "relation 'wastes' does not exist"
**Solusi**: Table belum dibuat. Jalankan SQL script di atas.

### Error: "Database connection failed"
**Solusi**: 
1. Check PostgreSQL service running: `pg_ctl status`
2. Check database exists: `psql -U postgres -l | grep farmanesia_dev`
3. Check credentials di `.env.development`

### Error: "Permission denied"
**Solusi**: Pastikan user postgres memiliki permission untuk create table.

## 📊 Database Info

- **Database**: `farmanesia_dev`
- **Table**: `wastes`
- **User**: `postgres` (default)
- **Port**: `5432` (default)

## 🎉 Setelah Setup Berhasil

Sistem Waste Management sudah siap digunakan dengan fitur:
- ✅ Catat limbah produksi
- ✅ Track kerugian finansial
- ✅ Recovery dari clearance sale
- ✅ Statistik waste management
- ✅ History waste records
- ✅ Auto-generate waste number

## 📝 Notes

- Table akan dibuat dengan constraint dan indexes untuk performa optimal
- Foreign key ke table `products` akan dibuat otomatis jika table products ada
- Trigger untuk auto-update `updated_at` sudah included
- API sudah memiliki fallback jika table belum ada (return empty data)

## 🆘 Need Help?

Jika masih ada masalah, check:
1. PostgreSQL logs: `/var/log/postgresql/`
2. Next.js console untuk error details
3. Browser console untuk frontend errors
4. API response di Network tab browser DevTools
