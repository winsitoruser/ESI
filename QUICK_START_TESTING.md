# Quick Start - Testing Store/Branch Management

## 🚀 5-Minute Quick Test

Panduan cepat untuk test fitur Store/Branch Management dalam 5 menit.

---

## ✅ Prerequisites

1. **Aplikasi berjalan di:** http://localhost:3001
2. **Login dengan:**
   - Email: `admin@bedagang.com`
   - Password: `admin123`

---

## 📝 Quick Test Steps

### Step 1: Test Store Settings (1 menit)

```
1. Buka: http://localhost:3001/settings/store
2. Isi "Nama Toko": Toko Test
3. Isi "Telepon": 021-1234567
4. Klik "Simpan Pengaturan"
5. ✅ Lihat toast sukses muncul
```

### Step 2: Test Branch Management (2 menit)

```
1. Klik tab "Cabang" atau buka: http://localhost:3001/settings/store/branches
2. Klik "Tambah Cabang"
3. Isi form:
   - Kode: BR-001
   - Nama: Cabang Jakarta
   - Tipe: branch
   - Kota: Jakarta
4. Klik "Simpan Cabang"
5. ✅ Lihat branch card muncul di list
```

### Step 3: Test POS Branch Filtering (1 menit)

```
1. Buka: http://localhost:3001/pos
2. ✅ Lihat BranchSelector muncul
3. Klik dropdown "Pilih Cabang"
4. Pilih "Cabang Jakarta"
5. ✅ Lihat stats refresh otomatis
```

### Step 4: Test Inventory Branch Filtering (1 menit)

```
1. Buka: http://localhost:3001/inventory
2. ✅ Lihat BranchSelector muncul
3. Klik dropdown "Pilih Cabang"
4. Pilih "Cabang Jakarta"
5. ✅ Lihat inventory refresh otomatis
```

---

## ✅ Success Checklist

Jika semua ini berhasil, implementasi sukses:

- [x] Store settings bisa disimpan
- [x] Branch bisa dibuat
- [x] Branch card muncul dengan benar
- [x] BranchSelector muncul di POS
- [x] BranchSelector muncul di Inventory
- [x] Data refresh saat ganti branch
- [x] Tidak ada error di console

---

## 🎯 What to Look For

### ✅ Good Signs
- Toast notification muncul saat save
- Data muncul setelah refresh page
- BranchSelector muncul di POS dan Inventory
- Stats berubah saat ganti branch
- Tidak ada error di console

### ❌ Red Flags
- Error 500 di console
- Data tidak tersimpan
- BranchSelector tidak muncul
- Stats tidak berubah saat ganti branch
- Console penuh error

---

## 🐛 Quick Troubleshooting

### BranchSelector tidak muncul?
```
Solusi: Pastikan sudah buat minimal 1 branch
```

### API Error 401?
```
Solusi: Login ulang dengan admin@bedagang.com
```

### Data tidak refresh?
```
Solusi: Hard refresh browser (Ctrl+Shift+R)
```

### Console error?
```
Solusi: Check error message, biasanya model belum ter-load
```

---

## 📊 Expected Results

### Store Settings Page
![Store Settings](Expected: Form dengan fields lengkap, button save)

### Branch Management Page
![Branches](Expected: List branches dalam grid, button tambah cabang)

### POS with BranchSelector
![POS](Expected: Dropdown branch selector di bawah header)

### Inventory with BranchSelector
![Inventory](Expected: Dropdown branch selector di bawah header)

---

## 🎉 Next Steps After Testing

### If All Tests Pass ✅
1. Lanjut integrate modul lain (Finance, Employee, Reports)
2. Deploy ke server production
3. Run database migrations di server

### If Tests Fail ❌
1. Check console untuk error messages
2. Verify API endpoints di Network tab
3. Check TESTING_GUIDE.md untuk detailed troubleshooting
4. Report issues dengan screenshot

---

## 📞 Need Help?

### Documentation
- **Detailed Testing:** TESTING_GUIDE.md
- **Integration Guide:** MODULE_INTEGRATION_GUIDE.md
- **Deployment:** DEPLOYMENT_GUIDE_STORE_SETTINGS.md

### Quick Commands
```bash
# Check if app running
lsof -ti:3001

# Restart app
npm run dev

# Check logs
# (Check terminal where npm run dev is running)
```

---

**Quick Test Time:** ~5 minutes  
**Full Test Time:** ~30 minutes (see TESTING_GUIDE.md)  
**Status:** Ready to Test
