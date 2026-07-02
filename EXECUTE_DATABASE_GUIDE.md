# 🚀 Panduan Execute Database - Bedagang

## File SQL yang Akan Dijalankan
**File:** `DATABASE_EXPORT_COMPLETE.sql`  
**Total Tables:** 22 (16 Inventory + 6 Finance Settings)  
**Default Records:** 79+

---

## ✅ **METODE 1: Menggunakan pgAdmin (RECOMMENDED)**

### Langkah-langkah:

1. **Buka pgAdmin**
   - Launch aplikasi pgAdmin di komputer Anda

2. **Connect ke Server**
   - Expand server PostgreSQL Anda
   - Masukkan password jika diminta

3. **Pilih Database**
   - Expand "Databases"
   - Klik kanan pada database **"bedagang"**
   - Pilih **"Query Tool"** atau tekan `Alt+Shift+Q`

4. **Load SQL File**
   - Di Query Tool, klik icon **"Open File"** (folder icon)
   - Atau: File → Open
   - Navigate ke: `/Users/winnerharry/Documents/bedagang/`
   - Pilih file: `DATABASE_EXPORT_COMPLETE.sql`

5. **Execute SQL**
   - Klik tombol **"Execute/Run"** (▶️ icon)
   - Atau tekan: `F5`
   - Tunggu proses selesai (sekitar 10-30 detik)

6. **Verify Success**
   - Lihat output di bagian bawah
   - Anda akan melihat pesan:
   ```
   ✅ DATABASE EXPORT COMPLETED SUCCESSFULLY!
   Tables created: 22 (16 Inventory + 6 Finance)
   Total Default Records: 79+
   ```

---

## ✅ **METODE 2: Menggunakan DBeaver**

### Langkah-langkah:

1. **Buka DBeaver**
   - Launch aplikasi DBeaver

2. **Connect ke Database**
   - Klik connection "bedagang"
   - Expand database

3. **Open SQL Editor**
   - Klik menu **SQL Editor** → **New SQL Script**
   - Atau tekan: `Ctrl+]` (Windows) / `Cmd+]` (Mac)

4. **Load SQL File**
   - Klik menu **File** → **Open**
   - Atau drag & drop file `DATABASE_EXPORT_COMPLETE.sql` ke editor

5. **Execute SQL**
   - Klik tombol **"Execute SQL Script"** (▶️ icon)
   - Atau tekan: `Ctrl+Alt+X` (Windows) / `Cmd+Alt+X` (Mac)

6. **Check Results**
   - Lihat di panel "Execution Log"
   - Verify success message muncul

---

## ✅ **METODE 3: Menggunakan DataGrip (JetBrains)**

### Langkah-langkah:

1. **Buka DataGrip**
   - Launch aplikasi DataGrip

2. **Connect ke Database**
   - Pilih connection "bedagang"

3. **Open SQL File**
   - File → Open
   - Pilih `DATABASE_EXPORT_COMPLETE.sql`

4. **Execute**
   - Klik icon **"Execute"** (▶️)
   - Atau tekan: `Ctrl+Enter`

---

## ✅ **METODE 4: Menggunakan Terminal (Jika psql tersedia)**

```bash
# Navigate ke folder project
cd /Users/winnerharry/Documents/bedagang

# Execute SQL file
psql -U postgres -d bedagang -f DATABASE_EXPORT_COMPLETE.sql

# Atau dengan password prompt
PGPASSWORD=your_password psql -U postgres -d bedagang -f DATABASE_EXPORT_COMPLETE.sql
```

---

## ✅ **METODE 5: Copy-Paste Manual**

Jika semua metode di atas tidak bisa:

1. **Buka file SQL**
   - Buka `DATABASE_EXPORT_COMPLETE.sql` di text editor

2. **Copy All Content**
   - Select all (`Cmd+A`)
   - Copy (`Cmd+C`)

3. **Paste ke Query Tool**
   - Buka pgAdmin/DBeaver Query Tool
   - Paste (`Cmd+V`)

4. **Execute**
   - Run query

---

## 🔍 **VERIFICATION SETELAH EXECUTE**

### 1. Cek Jumlah Tabel

```sql
SELECT COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public';
-- Expected: 22 atau lebih
```

### 2. Cek Tabel Finance Settings

```sql
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
)
ORDER BY table_name;
-- Expected: 6 rows
```

### 3. Cek Default Data

```sql
-- Payment Methods
SELECT COUNT(*) FROM payment_methods; -- Expected: 7

-- Bank Accounts
SELECT COUNT(*) FROM bank_accounts; -- Expected: 3

-- Finance Categories
SELECT COUNT(*) FROM finance_categories; -- Expected: 15

-- Chart of Accounts
SELECT COUNT(*) FROM chart_of_accounts; -- Expected: 40+

-- Company Assets
SELECT COUNT(*) FROM company_assets; -- Expected: 4

-- Finance Settings
SELECT COUNT(*) FROM finance_settings; -- Expected: 10
```

### 4. Cek Sample Data

```sql
-- Lihat payment methods
SELECT code, name, fees, processing_time 
FROM payment_methods 
ORDER BY sort_order;

-- Lihat bank accounts
SELECT bank_name, account_number, is_primary 
FROM bank_accounts;

-- Lihat finance categories
SELECT code, name, type 
FROM finance_categories 
ORDER BY type, sort_order;

-- Lihat chart of accounts (top level)
SELECT code, name, category 
FROM chart_of_accounts 
WHERE level = 1 
ORDER BY code;
```

---

## ⚠️ **TROUBLESHOOTING**

### Error: "relation already exists"
**Solusi:** Tabel sudah ada. Anda bisa:
- Skip error (karena ada `IF NOT EXISTS`)
- Atau drop tabel dulu jika ingin recreate

### Error: "database does not exist"
**Solusi:** Create database dulu:
```sql
CREATE DATABASE bedagang;
```

### Error: "permission denied"
**Solusi:** Pastikan user memiliki permission:
```sql
GRANT ALL PRIVILEGES ON DATABASE bedagang TO your_user;
```

### Error: "syntax error"
**Solusi:** 
- Pastikan PostgreSQL version minimal 12+
- Check encoding file (harus UTF-8)

---

## 🎯 **SETELAH BERHASIL**

### 1. Test API Endpoints

```bash
# Start development server
npm run dev

# Test summary endpoint
curl http://localhost:3001/api/finance/settings/summary

# Test payment methods
curl http://localhost:3001/api/finance/settings/payment-methods
```

### 2. Test Frontend

```
URL: http://localhost:3001/finance/settings-new

Verify:
- Overview tab menampilkan statistics
- Payment methods tab menampilkan 7 methods
- Bank accounts tab menampilkan 3 accounts
- Categories tab menampilkan 15 categories
- Chart of Accounts tab menampilkan 40+ accounts
- Assets tab menampilkan 4 assets
```

### 3. Test CRUD Operations

- Click "Tambah" button di setiap tab
- Verify modal muncul (jika sudah diintegrasikan)
- Test edit dan delete

---

## 📊 **EXPECTED RESULTS**

Setelah execute berhasil, Anda akan memiliki:

✅ **22 Tables Total**
- 8 Inventory tables
- 3 Transfer tables
- 3 RAC tables
- 2 Waste tables
- 6 Finance Settings tables

✅ **79+ Default Records**
- 7 Payment methods
- 3 Bank accounts
- 15 Finance categories
- 40+ Chart of accounts
- 4 Company assets
- 10 Finance settings
- Plus inventory seed data

✅ **60+ Indexes** untuk performance

✅ **16+ Triggers** untuk auto-update timestamps

---

## 🎉 **SUCCESS!**

Jika semua verification query berhasil, database Anda sudah siap digunakan!

**Next Steps:**
1. ✅ Database ready
2. ⏳ Test Finance Settings page
3. ⏳ Add CRUD modals
4. ⏳ Complete integration

---

**File Location:** `/Users/winnerharry/Documents/bedagang/DATABASE_EXPORT_COMPLETE.sql`  
**Documentation:** `FINANCE_SETTINGS_REVAMP.md`  
**Setup Guide:** `FINANCE_SETTINGS_SETUP_GUIDE.md`
