# 🐘 PostgreSQL Setup Guide - Bedagang

## ⚠️ PENTING: Konfigurasi PostgreSQL

Error **"Unexpected token '<', "<!DOCTYPE "... is not valid JSON"** terjadi karena aplikasi tidak dapat terhubung ke database PostgreSQL.

---

## 🔧 **LANGKAH SETUP**

### **Step 1: Pastikan PostgreSQL Terinstall**

Cek apakah PostgreSQL sudah terinstall:
```bash
psql --version
```

Jika belum terinstall:
- **macOS:** `brew install postgresql@15`
- **Windows:** Download dari https://www.postgresql.org/download/
- **Linux:** `sudo apt-get install postgresql`

### **Step 2: Start PostgreSQL Service**

```bash
# macOS (Homebrew)
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Windows
# PostgreSQL service akan auto-start
```

### **Step 3: Create Database**

```bash
# Login ke PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE bedagang;

# Exit
\q
```

### **Step 4: Buat File `.env.local`**

Buat file `.env.local` di root project dengan isi:

```env
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bedagang
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-change-this

# Node Environment
NODE_ENV=development
```

**PENTING:** Sesuaikan `POSTGRES_PASSWORD` dengan password PostgreSQL Anda!

### **Step 5: Execute Database Schema**

Jalankan file SQL untuk membuat tabel:

#### **Option A: Via pgAdmin (Recommended)**
1. Buka pgAdmin
2. Connect ke server PostgreSQL
3. Klik kanan database "bedagang" → Query Tool
4. File → Open → Pilih `DATABASE_EXPORT_COMPLETE.sql`
5. Execute (F5)

#### **Option B: Via Command Line**
```bash
psql -U postgres -d bedagang -f DATABASE_EXPORT_COMPLETE.sql
```

#### **Option C: Via DBeaver**
1. Buka DBeaver
2. Connect ke database "bedagang"
3. SQL Editor → Open SQL Script
4. Pilih `DATABASE_EXPORT_COMPLETE.sql`
5. Execute SQL Script

### **Step 6: Verify Database**

Cek apakah tabel sudah dibuat:
```sql
-- Login ke database
psql -U postgres -d bedagang

-- List semua tabel
\dt

-- Cek jumlah data
SELECT COUNT(*) FROM payment_methods;
SELECT COUNT(*) FROM bank_accounts;
SELECT COUNT(*) FROM finance_categories;

-- Exit
\q
```

Expected output:
- `payment_methods`: 7 rows
- `bank_accounts`: 3 rows
- `finance_categories`: 15 rows

### **Step 7: Restart Development Server**

```bash
# Stop server (Ctrl+C)
# Start server
npm run dev
```

### **Step 8: Test Finance Settings**

Akses:
```
http://localhost:3001/finance/settings
```

Jika berhasil, Anda akan melihat:
- ✅ Data payment methods (7 items)
- ✅ Data bank accounts (3 items)
- ✅ Data categories (15 items)
- ✅ Statistics cards
- ✅ No error di console

---

## 🔍 **TROUBLESHOOTING**

### **Error: "Unexpected token '<', "<!DOCTYPE"**
**Penyebab:** Database belum di-execute atau koneksi gagal

**Solusi:**
1. Pastikan PostgreSQL berjalan
2. Pastikan database "bedagang" sudah dibuat
3. Pastikan file `.env.local` sudah dibuat dengan konfigurasi yang benar
4. Execute file `DATABASE_EXPORT_COMPLETE.sql`
5. Restart dev server

### **Error: "password authentication failed"**
**Penyebab:** Password PostgreSQL salah

**Solusi:**
1. Cek password PostgreSQL Anda
2. Update `POSTGRES_PASSWORD` di `.env.local`
3. Restart dev server

### **Error: "database does not exist"**
**Penyebab:** Database "bedagang" belum dibuat

**Solusi:**
```bash
psql -U postgres
CREATE DATABASE bedagang;
\q
```

### **Error: "relation does not exist"**
**Penyebab:** Tabel belum dibuat

**Solusi:**
Execute file `DATABASE_EXPORT_COMPLETE.sql` (lihat Step 5)

### **Error: "ECONNREFUSED"**
**Penyebab:** PostgreSQL service tidak berjalan

**Solusi:**
```bash
# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql
```

---

## ✅ **VERIFICATION CHECKLIST**

Sebelum mengakses Finance Settings, pastikan:

- [ ] PostgreSQL terinstall dan berjalan
- [ ] Database "bedagang" sudah dibuat
- [ ] File `.env.local` sudah dibuat dengan konfigurasi yang benar
- [ ] File `DATABASE_EXPORT_COMPLETE.sql` sudah di-execute
- [ ] Tabel Finance Settings sudah ada (6 tables)
- [ ] Default data sudah terinsert (79+ records)
- [ ] Dev server sudah restart

---

## 📊 **EXPECTED DATABASE STRUCTURE**

Setelah execute SQL, Anda harus memiliki:

### **Finance Settings Tables (6)**
1. `payment_methods` - 7 default records
2. `bank_accounts` - 3 default records
3. `finance_categories` - 15 default records
4. `chart_of_accounts` - 40+ default records
5. `company_assets` - 4 default records
6. `finance_settings` - 10 default records

### **Inventory Tables (16)**
- categories, suppliers, locations, products
- inventory_stock, stock_movements
- stock_adjustments, stock_adjustment_items
- inventory_transfers, inventory_transfer_items, inventory_transfer_history
- rac_requests, rac_request_items, rac_request_history
- wastes, returns

**Total: 22 tables**

---

## 🎯 **QUICK START COMMANDS**

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE bedagang;"

# 2. Execute schema
psql -U postgres -d bedagang -f DATABASE_EXPORT_COMPLETE.sql

# 3. Verify
psql -U postgres -d bedagang -c "SELECT COUNT(*) FROM payment_methods;"

# 4. Start server
npm run dev
```

---

## 📝 **SAMPLE .env.local**

```env
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bedagang
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=bedagang-secret-key-2026

# Application
NODE_ENV=development
PORT=3001
```

---

## 🆘 **NEED HELP?**

Jika masih error setelah mengikuti semua langkah:

1. **Check PostgreSQL Status:**
   ```bash
   psql -U postgres -c "SELECT version();"
   ```

2. **Check Database Exists:**
   ```bash
   psql -U postgres -c "\l" | grep bedagang
   ```

3. **Check Tables:**
   ```bash
   psql -U postgres -d bedagang -c "\dt"
   ```

4. **Check Connection:**
   ```bash
   psql -U postgres -d bedagang -c "SELECT NOW();"
   ```

5. **Check Server Logs:**
   Lihat terminal dimana `npm run dev` berjalan untuk error messages

---

## ✅ **SUCCESS INDICATORS**

Jika setup berhasil, Anda akan melihat:

1. **Terminal (npm run dev):**
   ```
   ✅ PostgreSQL connection successful!
   ready - started server on 0.0.0.0:3001
   ```

2. **Browser Console:**
   - No errors
   - Data loaded successfully

3. **Finance Settings Page:**
   - Statistics cards menampilkan angka
   - Tables menampilkan data
   - Modals berfungsi
   - CRUD operations work

---

**File ini dibuat untuk membantu setup PostgreSQL agar Finance Settings dapat berfungsi dengan baik.**

**Last Updated:** February 11, 2026
