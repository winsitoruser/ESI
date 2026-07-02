# 🔧 Setup POS Reports dengan Data Real

**Masalah:** POS Reports di `http://localhost:3001/pos/reports` masih menampilkan data dummy/mock.

**Solusi:** Koneksi database PostgreSQL dan pastikan ada data transaksi.

---

## 📋 **LANGKAH SETUP**

### **Step 1: Install PostgreSQL (jika belum)**

```bash
# Install PostgreSQL via Homebrew
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Verify installation
psql --version
```

### **Step 2: Create Database**

```bash
# Create database
createdb bedagang

# Verify database created
psql -l | grep bedagang
```

### **Step 3: Create .env.local File**

Buat file `.env.local` di root project dengan isi:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bedagang

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bedagang
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-super-secret-key-min-32-characters-change-this

# Application
NODE_ENV=development
PORT=3001
```

**PENTING:** Sesuaikan `POSTGRES_USER` dan `POSTGRES_PASSWORD` dengan kredensial PostgreSQL Anda.

### **Step 4: Import Database Schema**

Jika Anda punya file SQL dump:

```bash
# Import schema
psql -d bedagang -f DATABASE_EXPORT_COMPLETE.sql

# Atau jika ada file lain
psql -d bedagang -f your_database_dump.sql
```

### **Step 5: Verify Database Tables**

```bash
# Check tables
psql -d bedagang -c "\dt"

# Check pos_transactions table
psql -d bedagang -c "SELECT COUNT(*) FROM pos_transactions;"

# Check if there's data
psql -d bedagang -c "SELECT COUNT(*) FROM pos_transactions WHERE status = 'completed';"
```

### **Step 6: Insert Sample Data (jika belum ada)**

Jika tabel kosong, insert sample data:

```sql
-- Connect to database
psql -d bedagang

-- Insert sample POS transactions
INSERT INTO pos_transactions (
  transaction_number, transaction_date, total_amount, 
  payment_method_id, status, created_at
) VALUES 
  ('TRX-001', NOW(), 150000, 1, 'completed', NOW()),
  ('TRX-002', NOW(), 250000, 1, 'completed', NOW()),
  ('TRX-003', NOW(), 180000, 2, 'completed', NOW()),
  ('TRX-004', NOW(), 320000, 1, 'completed', NOW()),
  ('TRX-005', NOW(), 420000, 3, 'completed', NOW());

-- Insert sample transaction items
INSERT INTO pos_transaction_items (
  transaction_id, product_id, quantity, unit_price, 
  subtotal, created_at
) VALUES 
  (1, 1, 2, 75000, 150000, NOW()),
  (2, 2, 5, 50000, 250000, NOW()),
  (3, 3, 3, 60000, 180000, NOW()),
  (4, 1, 4, 80000, 320000, NOW()),
  (5, 4, 6, 70000, 420000, NOW());

-- Verify data
SELECT COUNT(*) FROM pos_transactions;
SELECT COUNT(*) FROM pos_transaction_items;
```

### **Step 7: Restart Development Server**

```bash
# Stop current server (Ctrl+C)

# Start server
npm run dev

# Server should start on http://localhost:3001
```

### **Step 8: Test API Endpoint**

```bash
# Test POS Reports API
curl "http://localhost:3001/api/pos/reports?reportType=sales-summary&period=today"

# Expected response with real data:
# {
#   "success": true,
#   "data": { ... },
#   "isFromMock": false,  <-- Should be false
#   "reportType": "sales-summary"
# }
```

### **Step 9: Access Frontend**

1. Buka browser: `http://localhost:3001/pos/reports`
2. Login jika belum
3. Pilih periode (Hari Ini, Minggu Ini, dll)
4. Data real seharusnya muncul
5. Badge "Mock" TIDAK akan muncul jika data dari database

---

## 🔍 **TROUBLESHOOTING**

### **Problem 1: Badge "Mock" masih muncul**

**Penyebab:** Database tidak terkoneksi atau query gagal.

**Solusi:**
1. Check console browser (F12) untuk error
2. Check server logs untuk database error
3. Pastikan `.env.local` sudah benar
4. Restart development server

### **Problem 2: Error "connect ECONNREFUSED"**

**Penyebab:** PostgreSQL tidak running.

**Solusi:**
```bash
# Start PostgreSQL
brew services start postgresql@14

# Check status
brew services list | grep postgresql
```

### **Problem 3: Error "password authentication failed"**

**Penyebab:** Username/password salah di `.env.local`.

**Solusi:**
1. Check PostgreSQL user:
```bash
psql -U postgres -c "\du"
```

2. Update `.env.local` dengan kredensial yang benar

### **Problem 4: Table tidak ada**

**Penyebab:** Database schema belum di-import.

**Solusi:**
```bash
# Import schema
psql -d bedagang -f DATABASE_EXPORT_COMPLETE.sql
```

### **Problem 5: Data kosong**

**Penyebab:** Belum ada transaksi di database.

**Solusi:**
- Insert sample data (lihat Step 6)
- Atau buat transaksi baru via POS

---

## ✅ **VERIFICATION CHECKLIST**

Pastikan semua ini sudah dilakukan:

- [ ] PostgreSQL installed dan running
- [ ] Database `bedagang` created
- [ ] File `.env.local` created dengan konfigurasi benar
- [ ] Database schema imported
- [ ] Ada data di table `pos_transactions`
- [ ] Development server running
- [ ] API endpoint return `isFromMock: false`
- [ ] Frontend tidak menampilkan badge "Mock"
- [ ] Data real muncul di dashboard

---

## 📊 **EXPECTED RESULT**

Setelah setup berhasil:

1. **API Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTransactions": 5,
      "totalSales": 1320000,
      "averageTransaction": 264000,
      ...
    }
  },
  "isFromMock": false,  ✅ FALSE = DATA REAL
  "reportType": "sales-summary"
}
```

2. **Frontend:**
- Tidak ada badge "Mock"
- Data sesuai dengan database
- Metrics update saat ganti periode
- Export button berfungsi

---

## 🎯 **QUICK START (All-in-One)**

Jika ingin setup cepat, jalankan command ini:

```bash
# 1. Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# 2. Create database
createdb bedagang

# 3. Create .env.local (edit sesuai kebutuhan)
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bedagang
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bedagang
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-super-secret-key-min-32-characters
NODE_ENV=development
PORT=3001
EOF

# 4. Import schema (jika ada file SQL)
# psql -d bedagang -f DATABASE_EXPORT_COMPLETE.sql

# 5. Start development server
npm run dev
```

---

## 📞 **SUPPORT**

Jika masih ada masalah:

1. Check server logs di terminal
2. Check browser console (F12)
3. Verify database connection:
```bash
psql -d bedagang -c "SELECT NOW();"
```

4. Test API manually:
```bash
curl "http://localhost:3001/api/pos/reports?reportType=sales-summary&period=today"
```

---

**Status:** Frontend sudah siap, tinggal setup database! 🚀
