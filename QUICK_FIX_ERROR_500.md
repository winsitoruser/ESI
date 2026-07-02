# ⚡ Quick Fix: Error 500 - Waste Management

## 🔴 Error yang Terjadi
```
Runtime AxiosError: Request failed with status code 500
at fetchWasteStats (pages/inventory/production.tsx:101:24)
```

## ✅ Solusi Cepat

Error ini terjadi karena **table `wastes` belum dibuat di database**. 

### Cara Termudah - Copy Paste SQL

1. **Buka aplikasi database Anda** (pgAdmin, DBeaver, TablePlus, atau psql)

2. **Connect ke database**: `farmanesia_dev`

3. **Copy-paste SQL berikut dan Execute**:

```sql
-- Create wastes table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wastes_waste_number ON wastes(waste_number);
CREATE INDEX IF NOT EXISTS idx_wastes_product_id ON wastes(product_id);
CREATE INDEX IF NOT EXISTS idx_wastes_waste_type ON wastes(waste_type);
CREATE INDEX IF NOT EXISTS idx_wastes_waste_date ON wastes(waste_date);
CREATE INDEX IF NOT EXISTS idx_wastes_status ON wastes(status);
```

4. **Refresh browser** di `http://localhost:3000/inventory/production`

5. **Done!** Error 500 akan hilang dan sistem Waste Management siap digunakan.

## 🎯 Verifikasi

Setelah execute SQL, cek apakah table berhasil dibuat:

```sql
SELECT * FROM wastes LIMIT 1;
```

Jika tidak ada error, berarti table sudah dibuat dengan benar.

## 🧪 Test Sistem

1. Buka: `http://localhost:3000/inventory/production`
2. Klik tombol: **"Catat Limbah"**
3. Isi form dan submit
4. Data akan tersimpan ke database dan muncul di list

## 📝 Catatan

- API sudah memiliki **fallback** jika table belum ada (return empty data)
- Setelah table dibuat, sistem akan berfungsi normal
- Data waste akan tersimpan permanent di PostgreSQL
- Auto-generate waste number: `WST-2026-0001`, `WST-2026-0002`, dst.

## 🔧 Jika Masih Error

Pastikan:
- ✅ PostgreSQL service running
- ✅ Database `farmanesia_dev` exists
- ✅ User postgres memiliki permission
- ✅ Connection string di `.env.development` benar

Check connection:
```bash
# Di terminal
psql -U postgres -d farmanesia_dev -c "SELECT version();"
```

## 🎉 Selesai!

Setelah table dibuat, sistem Waste Management sudah **fully integrated** dan siap production!
