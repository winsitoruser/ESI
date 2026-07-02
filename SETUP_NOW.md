# 🚀 Setup PostgreSQL - Langkah Mudah

## ⚡ PILIHAN TERMUDAH: Gunakan Postgres.app (Tanpa Homebrew)

### **Step 1: Download & Install Postgres.app**

1. Download dari: **https://postgresapp.com/downloads.html**
2. Pilih "Postgres.app with PostgreSQL 15"
3. Drag file ke folder Applications
4. Buka Postgres.app
5. Klik "Initialize" untuk membuat server default

### **Step 2: Tambahkan ke PATH**

Buka Terminal dan jalankan:

```bash
echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### **Step 3: Verify PostgreSQL**

```bash
psql --version
```

Harus muncul: `psql (PostgreSQL) 15.x`

### **Step 4: Create Database**

```bash
createdb bedagang
```

### **Step 5: Buat File .env.local**

Saya sudah membuatkan template. Copy command ini:

```bash
cat > .env.local << 'EOF'
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
EOF
```

### **Step 6: Import Database Schema**

```bash
psql -d bedagang -f DATABASE_EXPORT_COMPLETE.sql
```

Tunggu sampai selesai (~30 detik). Anda akan melihat banyak output "CREATE TABLE", "INSERT", dll.

### **Step 7: Verify Data**

```bash
psql -d bedagang -c "SELECT COUNT(*) FROM payment_methods;"
```

Harus muncul: **7**

```bash
psql -d bedagang -c "SELECT COUNT(*) FROM bank_accounts;"
```

Harus muncul: **3**

### **Step 8: Restart Server**

Jika server masih running, stop dulu (Ctrl+C), lalu:

```bash
npm run dev
```

### **Step 9: Test di Browser**

```
http://localhost:3001/finance/settings
```

---

## ✅ CHECKLIST

- [ ] Postgres.app terinstall dan running
- [ ] PATH sudah ditambahkan
- [ ] Database 'bedagang' sudah dibuat
- [ ] File .env.local sudah dibuat
- [ ] Schema sudah di-import
- [ ] Data sudah ada (7 payment methods, 3 bank accounts, 15 categories)
- [ ] Server running di port 3001
- [ ] Finance Settings page berfungsi tanpa error

---

## 🎯 QUICK COMMANDS (Copy-Paste)

```bash
# 1. Create database
createdb bedagang

# 2. Create .env.local
cat > .env.local << 'EOF'
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bedagang
POSTGRES_USER=postgres
POSTGRES_PASSWORD=
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=bedagang-secret-key-2026
NODE_ENV=development
PORT=3001
EOF

# 3. Import schema
psql -d bedagang -f DATABASE_EXPORT_COMPLETE.sql

# 4. Verify
psql -d bedagang -c "SELECT COUNT(*) FROM payment_methods;"

# 5. Start server
npm run dev
```

---

## 🆘 TROUBLESHOOTING

### Error: "command not found: psql"
- Postgres.app belum running atau PATH belum ditambahkan
- Buka Postgres.app dan pastikan server hijau (running)
- Jalankan command PATH lagi

### Error: "database does not exist"
- Jalankan: `createdb bedagang`

### Error: "FATAL: role does not exist"
- Jalankan: `createuser -s postgres`

### Error masih muncul di browser
- Pastikan .env.local sudah dibuat
- Restart server (Ctrl+C lalu npm run dev)
- Clear browser cache

---

## 📱 ALTERNATIVE: Menggunakan pgAdmin

Jika Postgres.app tidak cocok:

1. Download pgAdmin: https://www.pgadmin.org/download/
2. Install dan buka pgAdmin
3. Create Server:
   - Name: Local
   - Host: localhost
   - Port: 5432
   - Username: postgres
4. Create Database: bedagang
5. Query Tool → Open → DATABASE_EXPORT_COMPLETE.sql
6. Execute (F5)

---

**Pilih salah satu metode di atas dan ikuti langkah-langkahnya!**
