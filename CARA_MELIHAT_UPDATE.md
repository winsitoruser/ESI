# Cara Melihat Update Inventory Master Page

## 🎯 Quick Steps

### 1. Buka Browser
Akses URL berikut:
```
http://localhost:3001/inventory/master
```

### 2. Jika Halaman Tidak Muncul

#### A. Hard Refresh Browser
- **Chrome/Edge (Windows):** Tekan `Ctrl + Shift + R`
- **Chrome/Edge (Mac):** Tekan `Cmd + Shift + R`
- **Firefox:** Tekan `Ctrl + F5` atau `Cmd + Shift + R`
- **Safari:** Tekan `Cmd + Option + R`

#### B. Clear Cache & Reload
1. Buka DevTools (F12)
2. Klik kanan pada tombol refresh
3. Pilih "Empty Cache and Hard Reload"

#### C. Restart Development Server
Di terminal tempat `npm run dev` berjalan:
```bash
# Tekan Ctrl+C untuk stop server
# Kemudian jalankan lagi:
npm run dev
```

#### D. Clear Next.js Cache (Jika masih tidak muncul)
```bash
# Stop server dulu (Ctrl+C)
rm -rf .next
npm run dev
```

## 📸 Yang Harus Terlihat

### Header
- Background gradient hijau
- Judul: "Master Data Inventory"
- Icon folder di sebelah kiri

### Section "Aksi Cepat"
**Di baris yang sama dengan judul "Aksi Cepat", sebelah kanan:**
- Button pipih biru: "Tambah Produk"
- Button pipih ungu: "Penerimaan Produk"  
- Button pipih indigo: "Stock Opname"

**Button ini lebih kecil dan pipih dibanding card di bawahnya**

### 8 Card Master Data
Grid 4 kolom dengan card:
1. Kategori Produk (biru)
2. Supplier (hijau)
3. Satuan (ungu)
4. Brand/Merek (orange)
5. Gudang (indigo)
6. Lokasi Rak (cyan)
7. Manufacturer (pink)
8. Tags (kuning)

### Recent Activity
List aktivitas terbaru di bagian bawah

## 🔍 Verifikasi File

Cek apakah file ada:
```bash
ls -la pages/inventory/master.tsx
```

Output yang benar:
```
-rw-r--r--  1 user  staff  14705 Feb 11 01:36 pages/inventory/master.tsx
```

## 🚀 Alternative Access

Jika URL langsung tidak work, coba:

### Via Inventory Dashboard
1. Buka: `http://localhost:3001/inventory`
2. Scroll ke bagian "Aksi Cepat"
3. Cari link/button ke Master Data (jika sudah ditambahkan)

### Via Browser Console
1. Buka browser DevTools (F12)
2. Ke tab Console
3. Ketik: `window.location.href = '/inventory/master'`
4. Tekan Enter

## 🔧 Troubleshooting

### Error: 404 Not Found
**Penyebab:** File belum ter-load atau server belum restart
**Solusi:**
1. Stop server (Ctrl+C)
2. Hapus cache: `rm -rf .next`
3. Start lagi: `npm run dev`
4. Tunggu sampai "compiled successfully"
5. Refresh browser

### Error: Module not found
**Penyebab:** Import error atau dependency kurang
**Solusi:**
1. Cek console untuk error detail
2. Install dependencies: `npm install`
3. Restart server

### Halaman Blank/White Screen
**Penyebab:** JavaScript error
**Solusi:**
1. Buka DevTools Console (F12)
2. Lihat error message
3. Biasanya karena import atau syntax error

### Button Tidak Sejajar
**Penyebab:** CSS belum ter-load
**Solusi:**
1. Hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Restart server

## 📱 Test di Different Browsers

Coba buka di:
- Chrome/Edge
- Firefox
- Safari (jika Mac)

## ✅ Expected Result

Setelah mengikuti langkah di atas, Anda harus melihat:

```
┌────────────────────────────────────────────────┐
│ [Header Hijau dengan Icon]                    │
│ Master Data Inventory                          │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ Aksi Cepat    [Button1] [Button2] [Button3]   │ ← 3 button pipih
├────────────────────────────────────────────────┤
│ [Card1] [Card2] [Card3] [Card4]               │ ← Card lebih besar
│ [Card5] [Card6] [Card7] [Card8]               │
└────────────────────────────────────────────────┘
```

**Button harus:**
- ✅ Sejajar horizontal dengan "Aksi Cepat"
- ✅ Lebih kecil dari card (height: 32px vs card: 96px)
- ✅ Pipih dan panjang
- ✅ Ada icon + text
- ✅ Gradient background

## 📞 Need Help?

Jika masih tidak terlihat setelah semua langkah:

1. **Cek Terminal Output**
   - Lihat apakah ada error saat compile
   - Pastikan "compiled successfully" muncul

2. **Cek Browser Console**
   - Buka DevTools (F12)
   - Tab Console
   - Lihat error messages

3. **Verify Git Status**
   ```bash
   git log -1
   # Harus show commit: 9090e70
   ```

4. **Re-pull dari Git**
   ```bash
   git pull origin main
   npm install
   npm run dev
   ```

## 🎯 Final Check

Jalankan command ini untuk memastikan semuanya OK:
```bash
# Check file exists
ls pages/inventory/master.tsx

# Check git status
git log --oneline -1

# Check if server running
lsof -ti:3001

# If server not running, start it
npm run dev
```

Setelah server running dan menunjukkan "compiled successfully", buka:
```
http://localhost:3001/inventory/master
```

**Hard refresh browser (Ctrl+Shift+R) untuk memastikan tidak ada cache!**
