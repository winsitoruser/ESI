# Sidebar Menu Fix - Logout & Login Required

## ✅ PERBAIKAN SUDAH DITERAPKAN!

API sudah diupdate untuk memberikan akses penuh ke role **owner**.

---

## 🔄 LANGKAH PENTING: LOGOUT & LOGIN ULANG

Karena ada perubahan pada API session, Anda **HARUS** logout dan login ulang!

---

## 📝 STEP-BY-STEP INSTRUCTIONS

### **Step 1: Logout**

**Option A - Via UI:**
1. Klik tombol "Keluar" di sidebar bawah
2. Atau navigate ke: `http://localhost:3001/api/auth/signout`

**Option B - Manual:**
1. Buka browser
2. Navigate ke: `http://localhost:3001/api/auth/signout`
3. Klik "Sign out"

**Option C - Clear Session:**
1. Buka Developer Tools (F12)
2. Application tab → Storage → Clear site data
3. Atau hapus cookies untuk localhost:3001

---

### **Step 2: Clear Browser Cache (Recommended)**

**Chrome/Edge:**
- Press `Ctrl + Shift + Delete`
- Select "Cached images and files"
- Click "Clear data"

**Or Hard Refresh:**
- Press `Ctrl + Shift + R` (Windows)
- Press `Cmd + Shift + R` (Mac)

---

### **Step 3: Login Ulang**

1. Navigate ke: `http://localhost:3001/auth/login`

2. Masukkan credentials:
   ```
   Email: fullaccess@bedagang.com
   Password: fullaccess123
   ```

3. Klik "Login"

---

### **Step 4: Verify Sidebar**

Setelah login, cek sidebar di sebelah kiri. Anda seharusnya melihat **SEMUA 12 menu**:

✅ **1. Dasbor** (Dashboard)
✅ **2. Kasir** (POS)
✅ **3. Inventori** (Inventory)
✅ **4. Manajemen Meja** (Tables)
✅ **5. Reservasi** (Reservations)
✅ **6. Keuangan** (Finance)
✅ **7. Pelanggan** (Customers)
✅ **8. Jadwal & Shift** (Employees)
✅ **9. Promo & Voucher**
✅ **10. Program Loyalitas** (Loyalty)
✅ **11. Laporan** (Reports)
✅ **12. Pengaturan** (Settings)

---

## 🔧 APA YANG SUDAH DIPERBAIKI

### **Backend API Update:**

**File:** `pages/api/business/config.ts`

**Before:**
```typescript
if (user.role === 'super_admin') {
  // Only super_admin gets all modules
}
```

**After:**
```typescript
if (user.role === 'super_admin' || user.role === 'owner') {
  // Both super_admin and owner get all modules
  return all modules with isEnabled: true
}
```

### **What This Means:**

- ✅ Role `owner` sekarang diperlakukan sama dengan `super_admin`
- ✅ Semua modules dikembalikan dengan `isEnabled: true`
- ✅ `isSuperAdmin` flag set to `true` untuk owner
- ✅ Tidak ada module filtering untuk owner role

---

## 🐛 TROUBLESHOOTING

### **Problem: Masih tidak semua menu muncul**

**Solution 1: Force Logout**
```
1. Navigate to: http://localhost:3001/api/auth/signout
2. Wait for confirmation
3. Close ALL browser tabs
4. Open new tab and login again
```

**Solution 2: Clear All Data**
```
1. Open DevTools (F12)
2. Application → Storage → Clear site data
3. Close browser completely
4. Reopen and login
```

**Solution 3: Different Browser**
```
1. Try logging in with different browser
2. Use incognito/private mode
3. This ensures clean session
```

---

### **Problem: Error saat login**

**Solution:**
```
1. Check server is running: npm run dev:admin
2. Check database connection
3. Verify user exists in database
4. Try recreating user: npm run create-full-access
```

---

### **Problem: Hanya beberapa menu yang muncul**

**Check:**
1. ✅ Sudah logout dan login ulang?
2. ✅ Browser cache sudah di-clear?
3. ✅ Menggunakan email yang benar: `fullaccess@bedagang.com`?
4. ✅ Server sudah restart setelah perubahan?

**Debug:**
```javascript
// Open browser console (F12)
// Check API response:
fetch('/api/business/config')
  .then(r => r.json())
  .then(d => console.log(d));

// Should show:
// - isSuperAdmin: true
// - modules: array with 12+ items
// - all modules have isEnabled: true
```

---

## 📊 EXPECTED API RESPONSE

After login, `/api/business/config` should return:

```json
{
  "success": true,
  "isSuperAdmin": true,
  "businessType": "owner",
  "businessTypeName": "Owner - Full Access",
  "modules": [
    {
      "id": "...",
      "code": "dashboard",
      "name": "Dashboard",
      "isEnabled": true
    },
    {
      "id": "...",
      "code": "pos",
      "name": "Point of Sale",
      "isEnabled": true
    },
    // ... all 12 modules with isEnabled: true
  ],
  "tenant": null,
  "needsOnboarding": false
}
```

---

## ✅ VERIFICATION CHECKLIST

Setelah logout & login ulang:

- [ ] Logout berhasil
- [ ] Browser cache di-clear
- [ ] Login dengan `fullaccess@bedagang.com`
- [ ] Password: `fullaccess123`
- [ ] Dashboard terbuka
- [ ] Sidebar terlihat di kiri
- [ ] **12 menu items** terlihat semua
- [ ] Semua menu bisa diklik
- [ ] Tidak ada error di console

---

## 🎯 QUICK FIX SUMMARY

**Problem:** Sidebar tidak menampilkan semua menu untuk user `fullaccess@bedagang.com`

**Root Cause:** API `/api/business/config` hanya memberikan semua module ke role `super_admin`, tidak ke role `owner`

**Solution:** Update API untuk treat role `owner` sama dengan `super_admin`

**Action Required:** **LOGOUT & LOGIN ULANG** untuk mendapatkan session baru

---

## 🚀 FINAL STEPS

**1. Logout sekarang:**
```
http://localhost:3001/api/auth/signout
```

**2. Clear cache:**
```
Ctrl + Shift + Delete (Chrome/Edge)
Cmd + Shift + Delete (Mac)
```

**3. Login ulang:**
```
http://localhost:3001/auth/login
Email: fullaccess@bedagang.com
Password: fullaccess123
```

**4. Verify:**
- Check sidebar
- Count menu items (should be 12)
- Test navigation

---

## 📞 STILL HAVING ISSUES?

If after following all steps above, sidebar still doesn't show all menus:

**1. Check server logs:**
```bash
# Look for errors in terminal where server is running
```

**2. Check browser console:**
```javascript
// F12 → Console tab
// Look for errors
```

**3. Verify user role:**
```sql
-- In database
SELECT email, role FROM users WHERE email = 'fullaccess@bedagang.com';
-- Should show: role = 'owner'
```

**4. Test API directly:**
```bash
# In browser console after login
fetch('/api/business/config').then(r => r.json()).then(console.log)
```

---

**🎉 Setelah logout & login ulang, semua 12 menu akan muncul!**
