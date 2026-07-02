# 🇮🇩 REFERENSI BAHASA INDONESIA - ADMIN PANEL

**Status:** Implementasi Bahasa Indonesia untuk Admin Panel  
**Tanggal:** 25 Februari 2026

---

## ✅ HALAMAN YANG SUDAH DIUPDATE

### 1. AdminLayout Component
**File:** `/components/admin/AdminLayout.tsx`

**Menu Sidebar:**
- Dashboard → **Dasbor**
- Tenants → **Tenant**
- Branches → **Cabang**
- Modules → **Modul**
- Analytics → **Analitik**
- Business Types → **Jenis Bisnis**
- Partners → **Mitra**
- Outlets → **Outlet**
- Activations → **Aktivasi**
- Transactions → **Transaksi**

**UI Elements:**
- Admin Panel → **Panel Admin**
- Logout → **Keluar**
- Expand sidebar → **Buka sidebar**
- Collapse sidebar → **Tutup sidebar**

---

### 2. Halaman Branches (/admin/branches)
**File:** `/pages/admin/branches/index.tsx`

**Header & Title:**
- Branches Management → **Manajemen Cabang**
- Manage all branches across tenants → **Kelola semua cabang di seluruh tenant**
- Refresh → **Muat Ulang**

**Stats Cards:**
- Total Branches → **Total Cabang**
- Active → **Aktif**
- HQ Branches → **Cabang Pusat**
- Synced → **Tersinkron**

**Filters:**
- Search → **Cari**
- Search by name, code, city... → **Cari berdasarkan nama, kode, kota...**
- Type → **Tipe**
- All Types → **Semua Tipe**
- HQ → **Pusat**
- Branch → **Cabang**
- Warehouse → **Gudang**
- Status → **Status**
- All Status → **Semua Status**
- Active → **Aktif**
- Inactive → **Tidak Aktif**
- Region → **Wilayah**
- Filter by region → **Filter berdasarkan wilayah**
- Apply Filters → **Terapkan Filter**

**Table Headers:**
- Branch → **Cabang**
- Tenant → **Tenant**
- Manager → **Manajer**
- Location → **Lokasi**
- Type → **Tipe**
- Status → **Status**
- Sync Status → **Status Sinkronisasi**
- Actions → **Aksi**

**Table Content:**
- No manager → **Tidak ada manajer**
- View Details → **Lihat Detail**

**Pagination:**
- Showing X of Y branches → **Menampilkan X dari Y cabang**
- Previous → **Sebelumnya**
- Next → **Berikutnya**
- Showing page X of Y → **Halaman X dari Y**

**Messages:**
- Loading branches... → **Memuat cabang...**
- Error: → **Kesalahan:**

---

### 3. Halaman Branch Detail (/admin/branches/[id])
**File:** `/pages/admin/branches/[id].tsx`

**Header:**
- Refresh → **Muat Ulang**
- Back to Branches → **Kembali ke Cabang**

**Sections:**
- Branch Information → **Informasi Cabang**
- Contact Information → **Informasi Kontak**
- Assigned Users → **Pengguna Terdaftar**
- Recent Sync Logs → **Log Sinkronisasi Terbaru**
- Sync Status → **Status Sinkronisasi**
- Metadata → **Metadata**

**Labels:**
- Branch Code → **Kode Cabang**
- Branch Type → **Tipe Cabang**
- Region → **Wilayah**
- Current Status → **Status Saat Ini**
- Last Sync → **Sinkronisasi Terakhir**
- Created → **Dibuat**
- Last Updated → **Terakhir Diperbarui**

**Table Headers (Sync Logs):**
- Type → **Tipe**
- Direction → **Arah**
- Status → **Status**
- Progress → **Progres**
- Date → **Tanggal**

**Messages:**
- Loading branch details... → **Memuat detail cabang...**
- Branch not found → **Cabang tidak ditemukan**
- No users assigned to this branch → **Tidak ada pengguna terdaftar di cabang ini**
- No sync logs available → **Tidak ada log sinkronisasi**

---

## 📋 KAMUS ISTILAH STANDAR

### Umum
- Dashboard → **Dasbor**
- Admin Panel → **Panel Admin**
- Loading... → **Memuat...**
- Error → **Kesalahan**
- Success → **Berhasil**
- Failed → **Gagal**
- Save → **Simpan**
- Cancel → **Batal**
- Delete → **Hapus**
- Edit → **Ubah**
- Add → **Tambah**
- Create → **Buat**
- Update → **Perbarui**
- Search → **Cari**
- Filter → **Filter**
- Export → **Ekspor**
- Import → **Impor**
- Download → **Unduh**
- Upload → **Unggah**
- Refresh → **Muat Ulang**
- View → **Lihat**
- Details → **Detail**
- Back → **Kembali**
- Next → **Berikutnya**
- Previous → **Sebelumnya**
- Page → **Halaman**
- of → **dari**
- Showing → **Menampilkan**

### Status
- Active → **Aktif**
- Inactive → **Tidak Aktif**
- Pending → **Menunggu**
- Approved → **Disetujui**
- Rejected → **Ditolak**
- Suspended → **Ditangguhkan**
- Completed → **Selesai**
- In Progress → **Sedang Berlangsung**
- Failed → **Gagal**
- Success → **Berhasil**

### Entitas Bisnis
- Tenant → **Tenant**
- Branch → **Cabang**
- HQ → **Pusat**
- Warehouse → **Gudang**
- Outlet → **Outlet**
- Store → **Toko**
- Partner → **Mitra**
- User → **Pengguna**
- Manager → **Manajer**
- Staff → **Staf**
- Customer → **Pelanggan**
- Supplier → **Pemasok**

### Data & Informasi
- Information → **Informasi**
- Contact → **Kontak**
- Address → **Alamat**
- City → **Kota**
- Province → **Provinsi**
- Region → **Wilayah**
- Postal Code → **Kode Pos**
- Phone → **Telepon**
- Email → **Email**
- Code → **Kode**
- Name → **Nama**
- Type → **Tipe**
- Category → **Kategori**
- Description → **Deskripsi**

### Modul & Fitur
- Module → **Modul**
- Analytics → **Analitik**
- Business Type → **Jenis Bisnis**
- Transaction → **Transaksi**
- Activation → **Aktivasi**
- Subscription → **Langganan**
- Package → **Paket**
- Plan → **Paket**
- Settings → **Pengaturan**
- Report → **Laporan**

### Sinkronisasi
- Sync → **Sinkronisasi**
- Synced → **Tersinkron**
- Syncing → **Sedang Sinkronisasi**
- Last Sync → **Sinkronisasi Terakhir**
- Sync Status → **Status Sinkronisasi**
- Sync Logs → **Log Sinkronisasi**

### Waktu
- Date → **Tanggal**
- Time → **Waktu**
- Created → **Dibuat**
- Updated → **Diperbarui**
- Last Updated → **Terakhir Diperbarui**
- Created At → **Dibuat Pada**
- Updated At → **Diperbarui Pada**
- Today → **Hari Ini**
- Yesterday → **Kemarin**
- This Week → **Minggu Ini**
- This Month → **Bulan Ini**
- This Year → **Tahun Ini**

### Statistik
- Total → **Total**
- Count → **Jumlah**
- Revenue → **Pendapatan**
- Growth → **Pertumbuhan**
- Distribution → **Distribusi**
- Summary → **Ringkasan**
- Overview → **Ringkasan**
- Progress → **Progres**
- Percentage → **Persentase**

### Tindakan
- Manage → **Kelola**
- Management → **Manajemen**
- View Details → **Lihat Detail**
- Apply Filters → **Terapkan Filter**
- Clear Filters → **Hapus Filter**
- Reset → **Atur Ulang**
- Logout → **Keluar**
- Login → **Masuk**
- Sign In → **Masuk**
- Sign Out → **Keluar**

### Pesan
- Loading... → **Memuat...**
- No data available → **Tidak ada data tersedia**
- No results found → **Tidak ada hasil ditemukan**
- Not found → **Tidak ditemukan**
- Something went wrong → **Terjadi kesalahan**
- Please try again → **Silakan coba lagi**
- Are you sure? → **Apakah Anda yakin?**
- Confirm → **Konfirmasi**

---

## 🔄 HALAMAN YANG PERLU DIUPDATE

### Prioritas Tinggi
- [ ] `/admin/dashboard` - Dashboard utama
- [ ] `/admin/tenants` - Manajemen tenant
- [ ] `/admin/analytics` - Halaman analitik
- [ ] `/admin/login` - Halaman login

### Prioritas Sedang
- [ ] `/admin/modules` - Manajemen modul
- [ ] `/admin/business-types` - Jenis bisnis
- [ ] `/admin/partners` - Manajemen mitra
- [ ] `/admin/outlets` - Manajemen outlet
- [ ] `/admin/activations` - Aktivasi
- [ ] `/admin/transactions` - Transaksi
- [ ] `/admin/subscriptions` - Langganan
- [ ] `/admin/settings` - Pengaturan

---

## 📝 PANDUAN IMPLEMENTASI

### 1. Konsistensi Terminologi
- Gunakan istilah yang sama untuk konsep yang sama di seluruh aplikasi
- Referensikan kamus istilah di atas
- Hindari mixing bahasa Inggris dan Indonesia dalam satu kalimat

### 2. Format Tanggal & Waktu
```javascript
// Gunakan locale 'id-ID' untuk format Indonesia
new Date().toLocaleDateString('id-ID')
new Date().toLocaleString('id-ID')
```

### 3. Format Angka & Mata Uang
```javascript
// Format angka
new Intl.NumberFormat('id-ID').format(number)

// Format mata uang
new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0
}).format(amount)
```

### 4. Pesan Error & Validasi
- Gunakan bahasa yang jelas dan mudah dipahami
- Berikan instruksi yang actionable
- Contoh: "Gagal memuat data. Silakan muat ulang halaman."

### 5. Button & Action Labels
- Gunakan kata kerja aktif
- Singkat dan jelas
- Contoh: "Simpan", "Hapus", "Muat Ulang"

---

## ✅ CHECKLIST IMPLEMENTASI

Untuk setiap halaman yang diupdate:

- [ ] Header & title
- [ ] Button labels
- [ ] Form labels & placeholders
- [ ] Table headers
- [ ] Status badges
- [ ] Error messages
- [ ] Success messages
- [ ] Loading states
- [ ] Empty states
- [ ] Pagination text
- [ ] Filter labels
- [ ] Modal titles & content
- [ ] Tooltip text
- [ ] Breadcrumb labels

---

## 🎯 PROGRESS TRACKING

**Total Halaman Admin:** ~15 halaman  
**Sudah Diupdate:** 3 halaman (20%)  
**Dalam Progress:** 1 halaman  
**Belum Diupdate:** ~11 halaman

**Status:** 🟡 Dalam Progress

---

**Catatan:** Dokumen ini akan terus diupdate seiring dengan progress implementasi bahasa Indonesia di seluruh admin panel.

