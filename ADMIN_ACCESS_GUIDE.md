# 🔐 Admin Panel Access Guide

Panduan lengkap untuk mengakses Admin Panel Bedagang.

---

## ⚠️ Masalah Umum: "Klik Dashboard Malah ke Landing Page"

### **Penyebab:**
User belum memiliki role `ADMIN` atau `SUPER_ADMIN` di database.

### **Solusi:**

#### **1. Set User Role ke ADMIN**

Gunakan script yang sudah disediakan:

```bash
node scripts/set-admin-role.js your-email@example.com
```

**Contoh:**
```bash
node scripts/set-admin-role.js admin@bedagang.com
node scripts/set-admin-role.js owner@example.com SUPER_ADMIN
```

#### **2. Manual Update via SQL**

Jika script tidak bisa dijalankan, update langsung di database:

```sql
-- Check current role
SELECT id, name, email, role FROM users WHERE email = 'your-email@example.com';

-- Update to ADMIN
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';

-- Or update to SUPER_ADMIN
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'your-email@example.com';
```

---

## 🚀 Cara Akses Admin Panel

### **Metode 1: Via Burger Menu (Recommended)**

1. **Login** dengan user yang memiliki role ADMIN/SUPER_ADMIN
2. Klik **burger menu** (ikon 3 garis di pojok kanan atas)
3. Klik tombol **"Admin Panel"** (hanya muncul untuk admin)
4. Anda akan diarahkan ke `/admin`

### **Metode 2: Direct URL**

Setelah login, akses langsung:

**Port 3001 (Main App):**
```
http://localhost:3001/admin
```

**Port 3002 (Admin Only):**
```
http://localhost:3002/admin
```

---

## 🔍 Troubleshooting

### **Problem 1: Tidak Ada Tombol "Admin Panel" di Menu**

**Penyebab:** User tidak memiliki role ADMIN/SUPER_ADMIN

**Solusi:**
```bash
# Set role ke ADMIN
node scripts/set-admin-role.js your-email@example.com

# Atau set ke SUPER_ADMIN
node scripts/set-admin-role.js your-email@example.com SUPER_ADMIN
```

Setelah update role:
1. Logout dari aplikasi
2. Login kembali
3. Tombol "Admin Panel" akan muncul di burger menu

---

### **Problem 2: Redirect ke Landing Page**

**Penyebab:** Session belum ter-update setelah role diubah

**Solusi:**
1. Logout dari aplikasi
2. Login kembali
3. Coba akses admin panel lagi

---

### **Problem 3: "Unauthorized" atau "Access Denied"**

**Penyebab:** Role tidak valid atau session expired

**Solusi:**
```bash
# Verify user role
node scripts/set-admin-role.js your-email@example.com

# Check di database
psql -U postgres -d bedagang_dev
SELECT id, name, email, role FROM users WHERE email = 'your-email@example.com';
```

---

## 👥 Role Hierarchy

### **SUPER_ADMIN**
- Full access ke semua fitur admin panel
- Dapat manage semua partners
- Dapat approve/reject activations
- Dapat view semua transactions

### **ADMIN**
- Access ke admin panel
- Dapat manage partners
- Dapat approve/reject activations
- Dapat view transactions

### **Other Roles** (owner, manager, cashier, staff)
- Tidak dapat akses admin panel
- Hanya dapat akses dashboard utama

---

## 📊 Admin Panel Features

Setelah berhasil login sebagai ADMIN/SUPER_ADMIN:

### **1. Dashboard** (`/admin`)
- Statistics overview
- Partner growth chart
- Package distribution
- Quick actions

### **2. Partners Management** (`/admin/partners`)
- List all partners
- Create new partner
- Edit partner details
- Change partner status
- Delete partner

### **3. Activation Requests** (`/admin/activations`)
- Review pending requests
- Approve with subscription
- Reject with reason
- View request history

### **4. Outlets Management** (`/admin/outlets`)
- View all outlets
- Monitor sync status
- Check transaction counts
- Device tracking

### **5. Transaction Overview** (`/admin/transactions`)
- Overall statistics
- Top performers
- Revenue analytics
- Group by partner/outlet

---

## 🔧 Setup Checklist

Pastikan semua langkah ini sudah dilakukan:

- [ ] Database migrated: `npm run db:migrate`
- [ ] Sample data seeded: `node scripts/seed-admin-sample-data.js`
- [ ] User created (via registration atau script)
- [ ] User role set to ADMIN: `node scripts/set-admin-role.js email@example.com`
- [ ] Logout and login again
- [ ] Check burger menu for "Admin Panel" button
- [ ] Access admin panel successfully

---

## 🎯 Quick Commands

### **Set Admin Role:**
```bash
node scripts/set-admin-role.js user@example.com
```

### **Check User Role:**
```sql
SELECT id, name, email, role FROM users WHERE email = 'user@example.com';
```

### **List All Admins:**
```sql
SELECT id, name, email, role FROM users WHERE role IN ('ADMIN', 'SUPER_ADMIN');
```

### **Start Admin Panel:**
```bash
# Port 3001 (with main app)
npm run dev

# Port 3002 (admin only)
npm run dev:admin
```

---

## 📝 Example Workflow

### **Scenario: First Time Setup**

```bash
# 1. Run migrations
npm run db:migrate

# 2. Seed sample data
node scripts/seed-admin-sample-data.js

# 3. Create or update admin user
node scripts/set-admin-role.js admin@bedagang.com

# 4. Start server
npm run dev:admin

# 5. Open browser
# http://localhost:3002

# 6. Login with admin@bedagang.com

# 7. Click burger menu → Admin Panel

# 8. You're in! 🎉
```

---

## 🌐 URLs Reference

### **Landing Page:**
- http://localhost:3001 (main app port)
- http://localhost:3002 (admin port)

### **Login:**
- http://localhost:3001/auth/login
- http://localhost:3002/auth/login

### **Admin Panel:**
- http://localhost:3001/admin (main app)
- http://localhost:3002/admin (admin dedicated)

### **Admin Pages:**
- `/admin` - Dashboard
- `/admin/partners` - Partners Management
- `/admin/activations` - Activation Requests
- `/admin/outlets` - Outlets Management
- `/admin/transactions` - Transaction Overview

---

## ✅ Success Indicators

Anda berhasil akses admin panel jika:

1. ✅ Tombol "Admin Panel" muncul di burger menu
2. ✅ Dapat akses `/admin` tanpa redirect
3. ✅ Dashboard admin menampilkan statistics
4. ✅ Semua menu admin dapat diakses
5. ✅ API endpoints return data (bukan 401/403)

---

## 🆘 Need Help?

Jika masih mengalami masalah:

1. **Check logs** di terminal untuk error messages
2. **Verify database** connection
3. **Clear browser cache** dan cookies
4. **Restart server** setelah update role
5. **Check documentation** di `ADMIN_PANEL_COMPLETE.md`

---

**Last Updated:** February 7, 2026, 2:00 AM (UTC+07:00)
