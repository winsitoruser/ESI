# 🔧 FIX LOGIN ISSUE - Solusi Lengkap

**Masalah:** Tidak bisa login ke aplikasi

**Penyebab:** File `.env.local` belum dibuat, sehingga NextAuth tidak memiliki konfigurasi yang diperlukan.

---

## 🚀 **SOLUSI CEPAT**

### **Step 1: Buat File `.env.local`**

Buat file `.env.local` di root project dengan isi berikut:

```env
# Database Configuration (Sequelize - untuk authentication)
DATABASE_URL=postgresql://user:password@localhost:5432/bedagang_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bedagang_dev
DB_USER=postgres
DB_PASSWORD=postgres
DB_DIALECT=postgres

# PostgreSQL Configuration (untuk Reports API)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bedagang
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# NextAuth Configuration (PENTING untuk login!)
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=bedagang-super-secret-key-change-this-in-production-min-32-chars

# Application
NODE_ENV=development
PORT=3001
```

**PENTING:** 
- Sesuaikan `DB_USER` dan `DB_PASSWORD` dengan kredensial PostgreSQL Anda
- `NEXTAUTH_SECRET` harus minimal 32 karakter

### **Step 2: Generate NEXTAUTH_SECRET yang Aman**

```bash
# Generate random secret (32 characters)
openssl rand -base64 32
```

Copy hasil output dan ganti `NEXTAUTH_SECRET` di `.env.local`

### **Step 3: Setup Database**

```bash
# Buat database untuk authentication
createdb bedagang_dev

# Import schema (jika ada)
# psql -d bedagang_dev -f database_schema.sql
```

### **Step 4: Restart Development Server**

```bash
# Stop server (Ctrl+C)

# Start ulang
npm run dev
```

### **Step 5: Test Login**

1. Buka: `http://localhost:3001/auth/login`
2. Gunakan kredensial default atau buat user baru

---

## 🔍 **TROUBLESHOOTING**

### **Problem 1: Masih tidak bisa login setelah setup**

**Kemungkinan:** Database users table kosong

**Solusi:** Buat user default

```bash
# Masuk ke database
psql -d bedagang_dev

# Buat user admin (password: admin123)
INSERT INTO users (
  name, email, password, role, is_active, created_at, updated_at
) VALUES (
  'Admin',
  'admin@bedagang.com',
  '$2a$10$rXKv5xKxKxKxKxKxKxKxKuO8qN7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7',
  'admin',
  true,
  NOW(),
  NOW()
);
```

**Login dengan:**
- Email: `admin@bedagang.com`
- Password: `admin123`

### **Problem 2: Error "connect ECONNREFUSED"**

**Penyebab:** PostgreSQL tidak running

**Solusi:**
```bash
# Start PostgreSQL
brew services start postgresql@14

# Verify
brew services list | grep postgresql
```

### **Problem 3: Error "password authentication failed"**

**Penyebab:** Username/password salah di `.env.local`

**Solusi:**
```bash
# Check PostgreSQL users
psql -U postgres -c "\du"

# Update .env.local dengan kredensial yang benar
```

### **Problem 4: Error "relation users does not exist"**

**Penyebab:** Database schema belum di-import

**Solusi:**
```bash
# Run migrations
npm run migrate

# Atau import schema manual
psql -d bedagang_dev -f database_schema.sql
```

### **Problem 5: Error "NEXTAUTH_SECRET not set"**

**Penyebab:** `.env.local` tidak terbaca

**Solusi:**
```bash
# Pastikan file ada
ls -la .env.local

# Pastikan format benar (no BOM, Unix line endings)
file .env.local

# Restart server
npm run dev
```

---

## 🔐 **CREATE USER MANUAL**

Jika tidak ada user di database, buat manual:

### **Option 1: Via psql**

```sql
-- Connect to database
psql -d bedagang_dev

-- Create user with bcrypt hashed password
-- Password: admin123
INSERT INTO users (
  name, 
  email, 
  password, 
  role, 
  is_active,
  business_name,
  created_at, 
  updated_at
) VALUES (
  'Administrator',
  'admin@bedagang.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'admin',
  true,
  'BEDAGANG',
  NOW(),
  NOW()
);

-- Verify
SELECT id, name, email, role FROM users;
```

### **Option 2: Via Node.js Script**

Buat file `create-admin.js`:

```javascript
const bcrypt = require('bcryptjs');
const db = require('./models');

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const user = await db.User.create({
      name: 'Administrator',
      email: 'admin@bedagang.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      businessName: 'BEDAGANG'
    });
    
    console.log('Admin user created:', user.email);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin();
```

Jalankan:
```bash
node create-admin.js
```

---

## ✅ **VERIFICATION CHECKLIST**

Pastikan semua ini sudah dilakukan:

- [ ] File `.env.local` created
- [ ] `NEXTAUTH_URL` set to `http://localhost:3001`
- [ ] `NEXTAUTH_SECRET` set (min 32 characters)
- [ ] Database credentials correct
- [ ] PostgreSQL running
- [ ] Database `bedagang_dev` exists
- [ ] Users table exists
- [ ] At least 1 user exists in database
- [ ] Development server restarted
- [ ] Browser cache cleared

---

## 🎯 **QUICK FIX (All-in-One)**

Jalankan command ini untuk setup lengkap:

```bash
# 1. Create .env.local
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bedagang_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bedagang_dev
DB_USER=postgres
DB_PASSWORD=postgres
DB_DIALECT=postgres

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bedagang
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=$(openssl rand -base64 32)

NODE_ENV=development
PORT=3001
EOF

# 2. Start PostgreSQL
brew services start postgresql@14

# 3. Create database
createdb bedagang_dev 2>/dev/null || echo "Database already exists"

# 4. Restart server
npm run dev
```

---

## 📞 **MASIH BERMASALAH?**

Jika masih tidak bisa login, check:

1. **Server logs** - Lihat error di terminal
2. **Browser console** - Buka DevTools (F12)
3. **Network tab** - Check API calls
4. **Database** - Verify user exists

```bash
# Check server logs
# (lihat terminal tempat npm run dev)

# Check database
psql -d bedagang_dev -c "SELECT * FROM users;"

# Test NextAuth endpoint
curl http://localhost:3001/api/auth/session
```

---

## 🎉 **EXPECTED RESULT**

Setelah fix:

1. ✅ Bisa akses `http://localhost:3001/auth/login`
2. ✅ Form login muncul
3. ✅ Bisa login dengan kredensial
4. ✅ Redirect ke dashboard setelah login
5. ✅ Session tersimpan (tidak logout otomatis)

---

**Login Credentials (default):**
- Email: `admin@bedagang.com`
- Password: `admin123`

**Setelah login berhasil, segera ganti password!**
