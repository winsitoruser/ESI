# 🔧 F&B USER SETUP & TROUBLESHOOTING GUIDE

## ✅ MASALAH TERIDENTIFIKASI & DIPERBAIKI

User `winsitoruser@gmail.com` tidak ter-redirect ke dashboard F&B karena:
1. ❌ User belum memiliki tenant dengan business type F&B
2. ❌ Auto-redirect logic belum menunggu business type loading selesai

---

## 🛠️ SOLUSI YANG SUDAH DITERAPKAN

### **1. ✅ Perbaikan Auto-Redirect Logic**
**File:** `pages/dashboard.tsx`

**Perubahan:**
```typescript
// SEBELUM (tidak bekerja)
if (status === "authenticated" && isFnB) {
  router.push("/dashboard-fnb");
}

// SESUDAH (bekerja dengan baik)
if (status === "authenticated" && !isLoadingBusinessType) {
  if (isFnB) {
    console.log('Redirecting to F&B dashboard, businessType:', businessType);
    router.push("/dashboard-fnb");
  }
}
```

**Penjelasan:**
- Menambahkan check `!isLoadingBusinessType` untuk memastikan business type sudah selesai di-load
- Menambahkan console.log untuk debugging
- Menambahkan early return untuk prevent multiple redirects

---

### **2. ✅ Setup User F&B**
**File:** `seeders/20260217000001-fnb-user-setup.js`

**Yang Dilakukan:**
1. ✅ Membuat/update business type F&B
2. ✅ Membuat tenant untuk user `winsitoruser@gmail.com`
3. ✅ Set business type tenant ke F&B
4. ✅ Enable semua modules untuk tenant F&B
5. ✅ Set setup_completed = true

**Hasil Seeder:**
```
✅ Created F&B business type
✅ Created tenant for user: Winsitor Restaurant
✅ Updated user with F&B tenant
✅ Enabled all modules for F&B tenant
```

---

## 🔐 KREDENSIAL LOGIN F&B

### **User F&B yang Sudah Di-setup:**

**Email:** `winsitoruser@gmail.com`  
**Password:** `winsitor123`  
**Business Type:** F&B (Food & Beverage)  
**Tenant:** Winsitor Restaurant  
**Role:** Owner (Full Access)

---

## 🚀 CARA MENGGUNAKAN

### **Step 1: Logout (jika sudah login)**
```
1. Klik profile/logout
2. Atau clear browser cache
```

### **Step 2: Login dengan Kredensial F&B**
```
Email: winsitoruser@gmail.com
Password: winsitor123
```

### **Step 3: Verifikasi Redirect**
Setelah login, Anda akan:
1. ✅ Otomatis redirect ke `/dashboard-fnb`
2. ✅ Melihat dashboard dengan Restaurant Theme (Orange-Red)
3. ✅ Melihat Kitchen Operations, Table Status, Reservations

---

## 🔍 TROUBLESHOOTING

### **Masalah 1: Masih Tidak Redirect ke Dashboard F&B**

**Solusi:**
1. **Clear Browser Cache & Cookies**
   ```
   - Chrome: Ctrl+Shift+Delete
   - Pilih "Cookies and other site data"
   - Pilih "Cached images and files"
   - Clear data
   ```

2. **Hard Refresh**
   ```
   - Windows: Ctrl+F5
   - Mac: Cmd+Shift+R
   ```

3. **Check Console Log**
   ```
   - Buka Developer Tools (F12)
   - Tab Console
   - Cari log: "Redirecting to F&B dashboard, businessType: fnb"
   ```

4. **Manual Navigate**
   ```
   Langsung akses: http://localhost:3001/dashboard-fnb
   ```

---

### **Masalah 2: Dashboard F&B Tidak Muncul**

**Check:**
1. Pastikan file `pages/dashboard-fnb.tsx` ada
2. Restart development server:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev:admin
   ```

---

### **Masalah 3: Business Type Tidak Terdeteksi**

**Verifikasi di Database:**
```sql
-- Check user tenant
SELECT u.email, u.role, t.business_name, bt.code, bt.name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN business_types bt ON t.business_type_id = bt.id
WHERE u.email = 'winsitoruser@gmail.com';

-- Should return:
-- email: winsitoruser@gmail.com
-- role: owner
-- business_name: Winsitor Restaurant
-- code: fnb
-- name: Food & Beverage
```

**Jika NULL, Run Seeder Lagi:**
```bash
npx sequelize-cli db:seed --seed 20260217000001-fnb-user-setup.js
```

---

### **Masalah 4: Error 404 pada /dashboard-fnb**

**Solusi:**
1. Pastikan file ada di `pages/dashboard-fnb.tsx`
2. Restart Next.js server
3. Check build errors di terminal

---

## 🧪 TESTING CHECKLIST

### **Test 1: Login & Auto-Redirect**
- [ ] Login dengan `winsitoruser@gmail.com`
- [ ] Password: `winsitor123`
- [ ] Otomatis redirect ke `/dashboard-fnb`
- [ ] URL berubah menjadi `http://localhost:3001/dashboard-fnb`

### **Test 2: Dashboard F&B Appearance**
- [ ] Header berwarna Orange-Red (bukan Blue)
- [ ] Title: "Dashboard Restoran"
- [ ] Icon: Chef Hat (🍳)
- [ ] Quick Stats: Pesanan Aktif, Meja Terisi, Reservasi, Avg Time

### **Test 3: F&B Sections**
- [ ] Kitchen Operations section visible
- [ ] Table Status grid visible (3x2)
- [ ] Reservations Today section visible
- [ ] Quick Actions: KDS, Orders, Tables, Reservations

### **Test 4: Navigation**
- [ ] Klik "Buka KDS" → `/kitchen/display`
- [ ] Klik "Daftar Pesanan" → `/kitchen/orders`
- [ ] Klik "Manajemen Meja" → `/tables`
- [ ] Klik "Reservasi" → `/reservations`

---

## 📊 VERIFIKASI API

### **Check Business Config API**
```bash
# Setelah login, check API response
GET http://localhost:3001/api/business/config

# Expected Response:
{
  "success": true,
  "businessType": "fnb",
  "businessTypeName": "Food & Beverage",
  "modules": [...],
  "tenant": {
    "id": "...",
    "name": "Winsitor Restaurant",
    "setupCompleted": true
  }
}
```

### **Check Kitchen Orders API**
```bash
GET http://localhost:3001/api/kitchen/orders?status=new&limit=10

# Should return kitchen orders (or empty array if no orders)
```

---

## 🔄 RESET & RE-SETUP

### **Jika Perlu Reset Semuanya:**

**1. Delete User & Tenant**
```sql
DELETE FROM tenant_modules WHERE tenant_id IN (
  SELECT id FROM tenants WHERE business_email = 'winsitoruser@gmail.com'
);
DELETE FROM users WHERE email = 'winsitoruser@gmail.com';
DELETE FROM tenants WHERE business_email = 'winsitoruser@gmail.com';
```

**2. Run Seeder Lagi**
```bash
npx sequelize-cli db:seed --seed 20260217000001-fnb-user-setup.js
```

**3. Restart Server**
```bash
npm run dev:admin
```

**4. Clear Browser & Login**

---

## 📝 CATATAN PENTING

### **Business Type Detection Logic:**
```typescript
// Di BusinessTypeContext
const isFnB = businessType === 'fnb' || hasModule('kitchen');

// businessType berasal dari tenant.businessType.code
// Harus = 'fnb' untuk F&B users
```

### **Auto-Redirect Flow:**
```
1. User login
2. Session created
3. BusinessTypeContext fetch config
4. API returns businessType: 'fnb'
5. Dashboard.tsx detects isFnB = true
6. Auto-redirect to /dashboard-fnb
```

### **Jika Tidak Auto-Redirect:**
- Check: businessType di API response
- Check: isLoadingBusinessType status
- Check: console.log di dashboard.tsx
- Manual navigate ke /dashboard-fnb

---

## 🎯 SUMMARY

**Status:** ✅ **FIXED & READY**

**Changes Made:**
1. ✅ Fixed auto-redirect logic in dashboard.tsx
2. ✅ Created F&B user seeder
3. ✅ Setup winsitoruser@gmail.com with F&B business type
4. ✅ Enabled all modules for F&B tenant

**Next Steps:**
1. Logout dari session saat ini
2. Login dengan: `winsitoruser@gmail.com` / `winsitor123`
3. Otomatis redirect ke dashboard F&B
4. Enjoy F&B dashboard! 🍽️

---

**Jika masih ada masalah, check console log dan API response untuk debugging lebih lanjut.**
