# 🚀 Quick Setup - Finance Settings

## ⚡ CARA TERCEPAT (Automated)

Jalankan script otomatis:

```bash
./setup-postgres.sh
```

Script ini akan:
- ✅ Install PostgreSQL (jika belum ada)
- ✅ Create database 'bedagang'
- ✅ Create file .env.local
- ✅ Import database schema
- ✅ Verify setup

**Setelah selesai, langsung jalankan:**
```bash
npm run dev
```

Akses: `http://localhost:3001/finance/settings`

---

## 📋 CARA MANUAL (Step by Step)

### **1. Install Homebrew (jika belum ada)**

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### **2. Install PostgreSQL**

```bash
brew install postgresql@15
brew services start postgresql@15
```

### **3. Create Database**

```bash
createdb bedagang
```

### **4. Create File `.env.local`**

Buat file `.env.local` di root project:

```env
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bedagang
POSTGRES_USER=postgres
POSTGRES_PASSWORD=

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=bedagang-secret-key-2026

# Application
NODE_ENV=development
PORT=3001
```

### **5. Import Database Schema**

```bash
psql -d bedagang -f DATABASE_EXPORT_COMPLETE.sql
```

### **6. Verify**

```bash
psql -d bedagang -c "SELECT COUNT(*) FROM payment_methods;"
```

Expected: 7 rows

### **7. Start Server**

```bash
npm run dev
```

### **8. Test**

Buka: `http://localhost:3001/finance/settings`

---

## 🎯 ALTERNATIF: Menggunakan Postgres.app (macOS)

### **1. Download Postgres.app**
- Download dari: https://postgresapp.com/
- Drag ke Applications folder
- Open Postgres.app

### **2. Create Database**
- Click "Initialize" untuk default server
- Click "+" untuk create database
- Name: `bedagang`

### **3. Configure PATH**
```bash
echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### **4. Lanjutkan dari Step 4 di atas**

---

## 🐘 ALTERNATIF: Menggunakan pgAdmin

### **1. Download pgAdmin**
- Download dari: https://www.pgadmin.org/download/
- Install aplikasi

### **2. Create Server**
- Open pgAdmin
- Right-click "Servers" → Create → Server
- Name: `Local PostgreSQL`
- Host: `localhost`
- Port: `5432`
- Username: `postgres`
- Password: (kosongkan atau sesuai instalasi)

### **3. Create Database**
- Right-click "Databases" → Create → Database
- Name: `bedagang`
- Owner: `postgres`

### **4. Import Schema**
- Right-click database "bedagang" → Query Tool
- File → Open → Pilih `DATABASE_EXPORT_COMPLETE.sql`
- Execute (F5)

### **5. Lanjutkan dari Step 4 (Create .env.local)**

---

## ✅ VERIFICATION

Setelah setup, verify dengan:

```bash
# Check PostgreSQL running
brew services list | grep postgresql

# Check database exists
psql -l | grep bedagang

# Check tables
psql -d bedagang -c "\dt"

# Check data
psql -d bedagang -c "SELECT COUNT(*) FROM payment_methods;"
psql -d bedagang -c "SELECT COUNT(*) FROM bank_accounts;"
psql -d bedagang -c "SELECT COUNT(*) FROM finance_categories;"
```

Expected output:
- payment_methods: 7
- bank_accounts: 3
- finance_categories: 15

---

## 🔧 TROUBLESHOOTING

### **Error: "command not found: psql"**

**Solusi 1:** Add PostgreSQL to PATH
```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Solusi 2:** Use full path
```bash
/opt/homebrew/opt/postgresql@15/bin/psql --version
```

### **Error: "database does not exist"**

```bash
createdb bedagang
```

### **Error: "FATAL: role does not exist"**

```bash
# Create postgres user
createuser -s postgres
```

### **Error: "connection refused"**

```bash
# Start PostgreSQL
brew services start postgresql@15

# Check status
brew services list
```

### **Error: "Unexpected token <!DOCTYPE"**

Ini berarti:
1. Database belum dibuat, ATAU
2. File .env.local belum dibuat, ATAU
3. Schema belum di-import

Ulangi semua langkah dari awal.

---

## 🎉 SUCCESS INDICATORS

Jika setup berhasil:

1. **Terminal:**
   ```
   ✅ PostgreSQL connection successful!
   ready - started server on 0.0.0.0:3001
   ```

2. **Browser (http://localhost:3001/finance/settings):**
   - ✅ Statistics cards menampilkan angka
   - ✅ Payment methods table menampilkan 7 items
   - ✅ Bank accounts table menampilkan 3 items
   - ✅ Categories cards menampilkan 15 items
   - ✅ No error di console

3. **Database:**
   ```bash
   psql -d bedagang -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
   ```
   Expected: 22 (atau lebih)

---

## 📞 NEED HELP?

Jika masih ada masalah:

1. Baca `POSTGRESQL_SETUP.md` untuk panduan lengkap
2. Check logs di terminal
3. Check browser console untuk error messages
4. Verify semua langkah sudah dijalankan dengan benar

---

**File ini dibuat untuk memudahkan setup Finance Settings dengan PostgreSQL.**

**Last Updated:** February 11, 2026
