# 🔧 Troubleshooting: Modul F&B Tidak Muncul

## ✅ Status Database
- **36 modul** tersimpan di database
- **7 modul F&B** dengan kategori 'fnb'
- **4 modul Optional** dengan kategori 'optional'
- **1 modul Add-on** dengan kategori 'addon'
- Semua modul aktif (`is_active = true`)

## 🔍 Kemungkinan Penyebab

### 1. Development Server Tidak Berjalan
**Solusi:**
```bash
# Stop server yang ada (jika ada)
pkill -f "next dev"

# Start development server
npm run dev

# Atau
yarn dev
```

### 2. Browser Cache
**Solusi:**
- **Chrome/Edge:** Tekan `Ctrl+Shift+R` (Windows) atau `Cmd+Shift+R` (Mac)
- **Firefox:** Tekan `Ctrl+F5` (Windows) atau `Cmd+Shift+R` (Mac)
- Atau buka DevTools (F12) → Network tab → Centang "Disable cache"

### 3. API Tidak Merespons
**Test API:**
```bash
# Cek apakah server berjalan di port 3000
lsof -ti:3000

# Test API endpoint
curl http://localhost:3000/api/hq/modules

# Atau buka di browser
http://localhost:3000/api/hq/modules
```

### 4. Session/Authentication Issue
**Solusi:**
- Logout dan login kembali
- Clear cookies untuk localhost:3000
- Pastikan user memiliki role: `super_admin`, `owner`, atau `hq_admin`

## 🚀 Langkah-Langkah Perbaikan

### Langkah 1: Restart Development Server
```bash
cd /Users/winnerharry/Bedagang\ ERP/bedagang---PoS

# Stop server
pkill -f "next dev"

# Start server
npm run dev
```

### Langkah 2: Clear Browser Cache
1. Buka browser DevTools (F12)
2. Klik kanan pada tombol refresh
3. Pilih "Empty Cache and Hard Reload"

### Langkah 3: Verifikasi API
Buka di browser (setelah login):
```
http://localhost:3000/api/hq/modules
```

Response yang benar:
```json
{
  "success": true,
  "data": {
    "modules": [...],
    "categories": {
      "core": [...],
      "fnb": [...],
      "optional": [...],
      "addon": [...]
    },
    "summary": {
      "total": 36,
      ...
    },
    "categoryLabels": {
      "core": "Core System",
      "fnb": "F&B (Food & Beverage)",
      "optional": "Modul Optional",
      "addon": "Add-on Premium",
      ...
    }
  }
}
```

### Langkah 4: Check Console Browser
1. Buka halaman `/hq/settings/modules`
2. Buka DevTools (F12)
3. Lihat tab Console untuk error
4. Lihat tab Network untuk request `/api/hq/modules`

## 📊 Verifikasi Database

Jalankan script verifikasi:
```bash
node scripts/verify-modules.js
```

Output yang benar:
```
✅ Modules found: 36

fnb (7 modules):
  - FNB_TABLE_MANAGEMENT: Manajemen Meja
  - TABLE_MANAGEMENT: Table Management
  - FNB_KITCHEN: Dapur
  - KITCHEN_DISPLAY: Kitchen Display System
  - RECIPE_MANAGEMENT: Recipe Management
  - FNB_RECIPES: Resep
  - FNB_MENU: Menu
```

## 🎯 Checklist Debugging

- [ ] Development server berjalan di port 3000
- [ ] Browser cache sudah di-clear
- [ ] User sudah login dengan role yang benar
- [ ] API `/api/hq/modules` merespons dengan data
- [ ] Console browser tidak ada error
- [ ] Network tab menunjukkan request berhasil (200 OK)
- [ ] Database memiliki 36 modul aktif

## 💡 Quick Fix

Jika masih tidak muncul, coba langkah ini:

```bash
# 1. Stop semua proses Node.js
pkill -f node

# 2. Clear Next.js cache
rm -rf .next

# 3. Restart development server
npm run dev

# 4. Buka browser dalam mode incognito
# Chrome: Ctrl+Shift+N
# Firefox: Ctrl+Shift+P

# 5. Login dan buka halaman modul
http://localhost:3000/hq/settings/modules
```

## 📝 Modul F&B yang Harus Muncul

Setelah perbaikan, Anda harus melihat:

**Filter "F&B (Food & Beverage)" - 7 modul:**
1. FNB_TABLE_MANAGEMENT: Manajemen Meja
2. TABLE_MANAGEMENT: Table Management
3. FNB_KITCHEN: Dapur
4. KITCHEN_DISPLAY: Kitchen Display System
5. RECIPE_MANAGEMENT: Recipe Management
6. FNB_RECIPES: Resep
7. FNB_MENU: Menu

**Filter "Modul Optional" - 4 modul:**
1. RESERVATION: Reservation System
2. ONLINE_ORDERING: Online Ordering
3. DELIVERY_MANAGEMENT: Delivery Management
4. LOYALTY_PROGRAM: Loyalty Program

**Filter "Add-on Premium" - 1 modul:**
1. WAITER_APP: Waiter App

## 🆘 Jika Masih Bermasalah

Kirim screenshot dari:
1. Browser console (F12 → Console tab)
2. Network tab untuk request `/api/hq/modules`
3. Halaman modul yang menunjukkan "Tidak ada modul yang cocok dengan filter"
