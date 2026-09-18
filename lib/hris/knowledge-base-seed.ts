/**
 * Official Humanify Knowledge Center seed articles (detailed guides + flowcharts).
 * Content uses lightweight markdown + fenced ```flowchart blocks.
 */
export type KbSeedArticle = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  sort_order: number;
  tags: string[];
};

export const HUMANIFY_KB_SEED: KbSeedArticle[] = [
  {
    slug: 'panduan-lengkap-memulai-humanify',
    title: 'Panduan Lengkap Memulai Humanify',
    summary: 'Onboarding tenant dari zero: organisasi, karyawan, absensi, cuti, payroll, ESS, dan go-live — lengkap dengan mockup & contoh.',
    category: 'getting_started',
    sort_order: 1,
    tags: ['onboarding', 'setup', 'go-live', 'mockup', 'langkah', 'contoh', 'workflow'],
    content: `# Panduan Lengkap Memulai Humanify

Dokumen ini menjelaskan **cara menggunakan Humanify HRIS** dari akun baru hingga operasional harian. Ikuti urutan modul agar data induk (master) siap sebelum transaksi.

## 1. Apa itu Humanify?

Humanify adalah **HRIS multi-tenant SaaS** untuk mengelola:
- Data karyawan & struktur organisasi
- Kehadiran, shift, perangkat absensi
- Cuti & approval
- Payroll (gaji, THR, BPJS, PPh21, lembur, kasbon, pinjaman)
- Rekrutmen, LMS, kinerja (KPI/OKR)
- Portal karyawan (ESS) & manajer (MSS)

Setiap perusahaan (tenant) data-nya terisolasi. Login HR: \`/humanify/login\`. Portal karyawan: \`/employee\`.

## 2. Screenshot mockup — Beranda HR

Setelah login, Anda mendarat di Beranda. Gunakan kartu KPI untuk memantau kesehatan operasional harian.

\`\`\`mockup dashboard
Beranda menampilkan karyawan aktif, kehadiran, cuti pending, dan status payroll periode berjalan.
\`\`\`

## 3. Workflow setup awal (Go-live)

\`\`\`workflow
Login HR → Profil Organisasi → Struktur Organisasi → Tambah Karyawan → Atur Shift & Cuti → Isi Gaji Pokok → Uji Payroll Draft → Undang ESS + 2FA → Go-live ✓
\`\`\`

\`\`\`flowchart
[Daftar / Login HR]
        │
        ▼
[Lengkapi Profil Organisasi]
        │
        ▼
[Struktur Organisasi + Golongan]
        │
        ▼
[Tambah / Impor Karyawan]
        │
        ▼
[Atur Absensi (shift, geofence, device)]
        │
        ▼
[Atur Cuti & Approval]
        │
        ▼
[Isi Komponen Gaji Karyawan]
        │
        ▼
[Uji Payroll Run (draft → approve)]
        │
        ▼
[Undang User ESS / Aktifkan 2FA]
        │
        ▼
[Go-live Checklist ✓]
\`\`\`

## 4. Tata cara — hari pertama HR Admin

\`\`\`steps
1. Login ke Humanify Ops
   Buka \`/humanify/login\` dengan akun owner/HR. Pastikan tenant yang benar (bukan akun platform lain).
2. Lengkapi struktur organisasi
   Menu **Karyawan → Struktur Organisasi**. Buat unit HQ + departemen inti (Ops, HR, Sales).
3. Tambah karyawan pertama
   Menu **Database Karyawan → Tambah**. Isi nama, email kerja, departemen, join date.
4. Atur shift & uji clock-in
   Assign shift ke karyawan, lalu uji clock dari portal ESS atau perangkat.
5. Buat payroll run draft
   Jangan mark Paid dulu — pastikan komponen gaji dan PTKP sudah terisi.
\`\`\`

\`\`\`example
**Contoh tenant demo:** Perusahaan "Demo Humanify" punya 1 HQ, 3 departemen, 12 karyawan aktif.
HR Admin login → buat unit **Kantor Pusat** → impor CSV 12 karyawan → assign shift **Office 09–18** → buat run **Mar 2026** status Draft → review take-home → baru Approve.
\`\`\`

## 5. Checklist komponen yang harus siap

| Urutan | Modul | Halaman | Output yang diharapkan |
|--------|--------|---------|-------------------------|
| 1 | Organisasi | Struktur Organisasi | Unit, departemen, grade |
| 2 | Karyawan | Database / Impor | Master karyawan aktif |
| 3 | Absensi | Jadwal & Pengaturan | Shift + aturan jam kerja |
| 4 | Cuti | Manajemen Cuti | Jenis cuti + kuota |
| 5 | Payroll | Proses Gaji | Run pertama sukses |
| 6 | Akses | Tim & Undangan / Role | User HR + ESS |
| 7 | Keamanan | 2FA | MFA aktif untuk admin |

## 6. Peran pengguna

- **Owner / HR Admin** — konfigurasi penuh tenant, payroll, user.
- **HR Staff** — operasional karyawan, absensi, cuti.
- **Manager (MSS)** — approval tim, pantau kinerja.
- **Karyawan (ESS)** — absensi, cuti, slip, klaim.
- **Platform Superadmin** — lintas tenant (ops Naincode).

## 7. Tips sukses go-live

1. Jangan mulai payroll sebelum **master karyawan + gaji pokok** lengkap.
2. Uji absensi di **1 cabang/shift** dulu.
3. Gunakan **Go-live Checklist** di menu Platform.
4. Simpan runbook internal di **Knowledge Center** (artikel tenant).
5. Kendala produk → **Tiket Support**.

Lanjut baca: *Cara Pakai: Database Karyawan*, *Cara Pakai: Cuti & Approval*, *Cara Pakai: Payroll Run*.`,
  },
  {
    slug: 'cara-pakai-database-karyawan',
    title: 'Cara Pakai: Database Karyawan (contoh + mockup)',
    summary: 'Tata cara menambah, mencari, dan mengelola karyawan — dengan screenshot mockup halaman dan contoh nyata.',
    category: 'karyawan',
    sort_order: 14,
    tags: ['karyawan', 'mockup', 'langkah', 'contoh', 'workflow'],
    content: `# Cara Pakai: Database Karyawan

Halaman: \`/humanify/employees\`

Modul ini adalah **master data** seluruh HRIS. Hampir semua modul lain (absensi, cuti, payroll) bergantung pada data di sini.

## Screenshot mockup — daftar karyawan

\`\`\`mockup employees
Gunakan pencarian + filter departemen/status, lalu Tambah untuk karyawan baru atau Export CSV.
\`\`\`

## Workflow operasional

\`\`\`workflow
Buka Database Karyawan → Cari / Filter → Tambah atau Edit → Lengkapi tab (kontrak, gaji, dokumen) → Assign shift → Undang ESS
\`\`\`

## Tata cara menambah karyawan

\`\`\`steps
1. Buka menu Karyawan → Database Karyawan
   Pastikan Anda login sebagai HR Admin / HR Staff dengan izin tulis.
   @screenshot employees — Halaman Database Karyawan: pencarian, filter, tombol Tambah
2. Klik tombol **Tambah** (ungu, pojok kanan atas)
   Form master data terbuka.
   @screenshot employees-form — Form Tambah Karyawan
3. Isi field wajib
   Nama lengkap, email kerja (unik per tenant), departemen, tanggal bergabung.
   @screenshot employees-form — Contoh isi: Budi Santoso · budi@demo.co · Operations
4. Simpan karyawan
   Status default biasanya **ACTIVE**. Kode karyawan digenerate otomatis.
5. Lengkapi tab detail
   Kontrak, komponen gaji, dokumen KTP/NPWP, lalu assign shift di modul Absensi.
\`\`\`

\`\`\`example
**Contoh:** Karyawan baru sales "Rina Kartika"
1. Tambah → Nama: Rina Kartika · Email: rina@acme.id · Dept: Sales · Join: 1 Okt 2026
2. Tab Payroll → Gaji pokok Rp 8.500.000 · PTKP: TK/0
3. Tab Kontrak → PKWT 12 bulan
4. Absensi → assign shift **Field 08–17**
5. Tim & Undangan → undang portal ESS ke email Rina
Hasil: Rina bisa clock-in, ajukan cuti, dan muncul di payroll run berikutnya.
\`\`\`

## Tips

- Email harus unik per tenant.
- Soft-nonaktifkan karyawan keluar daripada hapus keras jika sudah ada history payroll.
- Impor massal: \`/humanify/employees-import\`.
`,
  },
  {
    slug: 'cara-pakai-cuti-dan-approval',
    title: 'Cara Pakai: Cuti, ESS & Approval MSS',
    summary: 'Dari pengajuan cuti karyawan hingga approval manajer — mockup ESS/MSS, langkah, dan workflow lengkap.',
    category: 'kehadiran',
    sort_order: 15,
    tags: ['cuti', 'ess', 'mss', 'mockup', 'langkah', 'contoh', 'workflow'],
    content: `# Cara Pakai: Cuti & Approval

## 1. Setup jenis cuti (HR)

Halaman: \`/humanify/leave\`

\`\`\`mockup leave
Kelola jenis cuti (annual/sick/unpaid), kuota, dan pantau antrian pending.
\`\`\`

\`\`\`steps
1. Buka Manajemen Cuti
   Menu **Kehadiran & Cuti → Manajemen Cuti**.
2. Tambah jenis cuti
   Mis. **Cuti tahunan** 12 hari/tahun, **Sakit** butuh lampiran.
3. Set approval
   Tentukan apakah butuh Manager (MSS) lalu HR, atau langsung HR.
4. Pastikan kuota terisi per karyawan
   Biasanya ikut policy tahunan / prorata join date.
\`\`\`

## 2. Karyawan mengajukan (ESS)

\`\`\`mockup ess-leave
Form ESS: pilih jenis, rentang tanggal, alasan, lalu Kirim pengajuan.
\`\`\`

\`\`\`workflow
Login ESS → Menu Cuti → Ajukan → Cek kuota → Submit Pending → Notifikasi Approver → Approve/Reject → Kalender & kuota update
\`\`\`

\`\`\`example
**Contoh:** Sari (HR Staff) ajukan cuti tahunan 20–22 Sep
- Sisa kuota sebelum: 8 hari
- Submit dari ESS → status **Pending**
- Manager Andi di MSS menekan **Setujui**
- Kuota jadi 5 hari; tanggal muncul di kalender tim
\`\`\`

## 3. Manajer approve (MSS)

\`\`\`mockup mss-approvals
Banner pending + tombol Setujui / Tolak per permintaan cuti atau klaim.
\`\`\`

\`\`\`steps
1. Buka MSS / antrian approval
   Manajer melihat banner jumlah pending.
2. Review detail
   Cek jenis cuti, tanggal, overlapping tim.
3. Setujui atau Tolak
   Tolak sebaiknya isi alasan agar karyawan paham.
\`\`\`

## Flowchart ringkas

\`\`\`flowchart
[Karyawan ajukan cuti ESS]
        │
        ▼
[Cek kuota & overlapping]
        │
   ┌────┴────┐
   │         │
 OK        Tolak otomatis
   │
   ▼
[Notifikasi approver MSS/HR]
   │
   ├── Approve → potong kuota
   └── Reject  → status ditolak
\`\`\`
`,
  },
  {
    slug: 'cara-pakai-payroll-run',
    title: 'Cara Pakai: Payroll Run (draft → paid)',
    summary: 'Step-by-step closing gaji bulanan: tiap langkah dilengkapi screenshot halaman Dasbor, Proses Gaji, modal buat run, review, transfer bank, dan slip.',
    category: 'payroll',
    sort_order: 16,
    tags: ['payroll', 'mockup', 'langkah', 'contoh', 'workflow', 'screenshot'],
    content: `# Cara Pakai: Payroll Run

Panduan ini menjelaskan **cara memakai modul Payroll** dari membuat run hingga gaji dibayar. Setiap langkah di bawah punya **screenshot mockup halaman** yang sesuai di Humanify.

## Prasyarat (sebelum buat run)

- Master karyawan aktif + **gaji pokok** + PTKP di tab Gaji
- Absensi / lembur / kasbon periode relatif final
- Komponen BPJS & PPh 21 sudah dikonfigurasi

## Workflow ringkas

\`\`\`workflow
Dasbor Payroll → Proses Gaji (tab Run) → Buat run → Hitung → Review THP → Setujui → Transfer bank → Tandai dibayar → Slip di ESS
\`\`\`

## Tata cara step-by-step + screenshot halaman

\`\`\`steps
1. Buka Dasbor Payroll
   Menu sidebar **Payroll → Dasbor Payroll** (\`/humanify/payroll\`).
   Di sini Anda melihat KPI karyawan/gaji dan tabel **Run penggajian** terakhir.
   @screenshot payroll-hub — Halaman Dasbor Payroll: KPI + daftar run + pintasan modul
2. Masuk ke Proses Gaji
   Klik **Buka proses gaji** / menu **Payroll → Proses Gaji** (\`/humanify/payroll/main\`).
   Pilih tab **Run** untuk mengelola siklus draft → dibayar.
   @screenshot payroll-main — Halaman Proses Gaji, tab Run: daftar run + tombol Buat run / Hitung / Setujui
3. Buat run baru untuk periode
   Klik **Buat run**. Isi nama (contoh: Gaji Maret 2026), periode mulai–akhir, tanggal bayar, tipe **Bulanan**.
   Simpan → status awal **Draf**.
   @screenshot payroll-create — Modal Buat run baru di Proses Gaji
4. Jalankan Hitung (Calculate)
   Pilih run draf → klik **Hitung**. Sistem menarik gaji pokok, tunjangan, potongan, BPJS, PPh21, lembur (jika ada).
   Status berubah jadi **Dihitung**.
   @screenshot payroll-review — Hasil hitung: Gross / Potongan / THP + preview slip draft
5. Review hasil sebelum Setujui
   Cek outlier: THP Rp 0, karyawan baru tanpa rekening, pajak aneh.
   Perbaiki master gaji jika perlu, lalu **Hitung ulang**.
   @screenshot payroll-review — Preview slip draft — perbaiki baris bermasalah sebelum Setujui
6. Setujui run
   Role berwenang klik **Setujui**. Status **Disetujui**. Setelah ini angka terkunci untuk disbursement.
   @screenshot payroll-main — Tab Run setelah status Disetujui
7. Export Transfer Bank (opsional tapi disarankan)
   Buka **Payroll → Transfer Bank** (\`/humanify/payroll/disbursement\`).
   Unduh file BCA / Mandiri / CSV, proses di bank, lalu kembali ke Proses Gaji.
   @screenshot payroll-disbursement — Halaman Transfer Bank: pilih format export
8. Tandai Dibayar + cek Slip
   Kembali ke Proses Gaji → **Tandai dibayar**.
   Slip tersedia di **Payroll → Slip Gaji** dan di portal ESS karyawan.
   @screenshot payroll-slip — Halaman Slip Gaji per karyawan untuk periode run
\`\`\`

\`\`\`example
**Contoh closing Maret 2026 (128 karyawan)**
1. Dasbor menampilkan run terakhir Feb status **Dibayar**
2. Proses Gaji → Buat run **PR-2603 / Gaji Mar 2026** (1–31 Mar, bayar 28 Mar)
3. Hitung → THP Rp 1,24 M — 1 karyawan THP 0 (belum ada gaji pokok) → perbaiki → hitung ulang
4. Owner **Setujui** → export Mandiri CSV → transfer
5. **Tandai dibayar** → karyawan unduh slip di ESS keesokan hari
\`\`\`

## Jangan

- Mark Paid / Tandai dibayar sebelum review
- Mengubah gaji pokok mid-run tanpa hitung ulang
- Memakai data mock di production

## Halaman terkait

| Langkah | Halaman | URL |
|---------|---------|-----|
| Dasbor | Dasbor Payroll | \`/humanify/payroll\` |
| Proses run | Proses Gaji | \`/humanify/payroll/main\` |
| Slip | Slip Gaji | \`/humanify/payroll/slip-gaji\` |
| Disbursement | Transfer Bank | \`/humanify/payroll/disbursement\` |
`,
  },
  {
    slug: 'peta-modul-dan-komponen',
    title: 'Peta Modul, Menu & Komponen Humanify',
    summary: 'Inventaris seluruh modul sidebar, halaman terkait, dan komponen UI/API utama.',
    category: 'getting_started',
    sort_order: 2,
    tags: ['arsitektur', 'modul', 'menu'],
    content: `# Peta Modul, Menu & Komponen

## 1. Arsitektur singkat

\`\`\`flowchart
[Browser HR / ESS]
        │
        ▼
[Next.js Pages /humanify/*  &  /employee]
        │
        ▼
[API /api/humanify/*  +  /api/employee/*]
        │
        ▼
[PostgreSQL (tenant_id scoped) + RLS soft/strict]
\`\`\`

Setiap request bisnis membawa **tenant_id** dari session. Data tenant A tidak bisa dibaca tenant B.

## 2. Grup menu sidebar (HR)

### Utama
- Beranda, Kalender HR, Pengumuman

### Karyawan
- Database Karyawan, Impor, Struktur Organisasi
- Onboarding, Offboarding, Kontrak & Reminder
- **Manajemen Aset** (inventori + assign onboarding / return offboarding)
- Pengaturan Organisasi, ESS/MSS config
- **E-Sign (Privy)** — sementara **disembunyikan** dari sidebar hingga GA PSrE; jangan dijual sebagai fitur aktif

### Kehadiran & Cuti
- Absensi, Jadwal & Shift, Rekap Harian
- Perangkat Absensi (\`/humanify/attendance/devices\` — alias \`/humanify/devices\` redirect)
- Pengaturan Absensi, Manajemen Cuti

### Kinerja
- OKR/KPI, KPI Karyawan, Pengaturan KPI, Penilaian Kinerja
- Keterlibatan & Budaya — lab/hidden

### Payroll
- Dasbor, Proses Gaji, Slip, THR, PPh21, BPJS
- Lembur, Bonus, Kasbon, Pinjaman, Laporan, Transfer Bank
- Reimbursement, Casual Workforce

### Rekrutmen & LMS
- Rekrutmen, Training/LMS core (courses, tests, competency, analytics)
- LMS lanjutan & **AI Center** — lab; sidebar AI disembunyikan (URL \`/humanify/ai\` tetap)

### Laporan & Analitik
- HR Analytics, Laporan HRIS, Workforce Analytics

### Platform
- Portal ESS, Billing, Go-live, Enterprise API, SSO, 2FA, Tim, Role

### Bantuan
- Tiket Support, Knowledge Center

## 3. Komponen teknis utama

| Lapisan | Contoh file / pola |
|---------|---------------------|
| Layout | \`HumanifyLayout\` → HQ sidebar Humanify |
| Auth API | \`withHQAuth(handler, { module: 'hris' })\` |
| Tenant scope | \`tenant_id\` di query + soft/strict RLS |
| Schema baru | \`CREATE TABLE IF NOT EXISTS\` di store lib |
| UI empty | \`HrisEmptyState\` + \`DataSourceBadge\` |

## 4. Flowchart navigasi pengguna baru

\`\`\`flowchart
[Login HR]
   │
   ├─► [Beranda] ringkasan KPI
   ├─► [Karyawan] master data
   ├─► [Kehadiran] operasional harian
   ├─► [Payroll] siklus bulanan
   ├─► [Kinerja] siklus periodik
   └─► [Bantuan] KB + Tiket
\`\`\`

Gunakan dokumen ini sebagai **peta** sebelum masuk detail tiap modul.`,
  },
  {
    slug: 'alur-karyawan-end-to-end',
    title: 'Alur Karyawan End-to-End (Hire → Exit)',
    summary: 'Flowchart lengkap dari rekrutmen, onboarding, mutasi, hingga offboarding.',
    category: 'karyawan',
    sort_order: 3,
    tags: ['karyawan', 'lifecycle', 'flowchart', 'mockup', 'workflow'],
    content: `# Alur Karyawan End-to-End

## Screenshot — Onboarding

\`\`\`mockup onboarding
Checklist onboarding: dokumen, kontrak, assign shift, undang ESS — progress bar per karyawan.
\`\`\`

\`\`\`mockup organization
Master struktur: unit, golongan, departemen sebagai fondasi penempatan karyawan.
\`\`\`

## 1. Flowchart siklus karyawan

\`\`\`flowchart
[Lowongan / Rekrutmen]
        │
        ▼
[Kandidat → Interview → Offer]
        │
        ▼
[Onboarding Checklist]
        │
        ▼
[Create Employee + Kontrak]
        │
        ▼
[Aktivasi ESS / Absensi / Payroll]
        │
        ├──► [Mutasi / Promosi / Grade]
        ├──► [Cuti / Klaim / Kinerja]
        └──► [Offboarding / Exit]
                 │
                 ▼
           [Nonaktif + Settlement]
\`\`\`

## 2. Komponen per tahap

### Rekrutmen
- Halaman: \`/humanify/recruitment\`
- Komponen: lowongan, pipeline kandidat, screening, webhook job board
- Output: kandidat siap di-onboard

### Onboarding
- Halaman: \`/humanify/onboarding\`
- Komponen: checklist tugas, status progress, assign PIC
- Pastikan dokumen KTP/NPWP/rekening terunggah

### Master Karyawan
- Halaman: \`/humanify/employees\`
- Tab detail: personal, keluarga, pendidikan, dokumen, kontrak, payroll, cuti, absensi, KPI, mutasi
- Impor massal: \`/humanify/employees-import\`

### Struktur & Grade
- \`/humanify/organization\` — unit organisasi + golongan jabatan
- Card summary: Unit, Golongan, Total Karyawan, Departemen

### Kontrak & Reminder
- \`/humanify/contracts\` — masa berlaku, reminder kedaluwarsa (e-sign UI sementara disembunyikan)

### Aset
- \`/humanify/assets\` — inventori tenant; assign ke karyawan; return
- Onboarding checklist **Serah terima aset** → pilih aset available lalu centang
- Offboarding checklist **Pengembalian aset** → return semua aset assigned

### Offboarding
- \`/humanify/offboarding\` — checklist exit, aset dikembalikan, akses dicabut

## 3. Aturan data penting

1. **Email unik** per tenant.
2. **Kode karyawan** digenerate otomatis (namespaced per tenant).
3. Departemen sebaiknya selaras dengan **Struktur Organisasi**.
4. Soft-delete / nonaktif lebih aman daripada hapus keras jika sudah ada payroll.

## 4. Checklist HR harian

- Karyawan baru: create → kontrak → ESS invite → assign shift
- Mutasi: update dept/posisi/grade → audit trail
- Exit: offboarding → return aset → stop payroll`,
  },
  {
    slug: 'absensi-cuti-flowchart-detail',
    title: 'Absensi & Cuti — Fitur, Komponen & Flowchart',
    summary: 'Detail shift, geofence, device, rekap, pengajuan cuti, dan approval.',
    category: 'kehadiran',
    sort_order: 4,
    tags: ['absensi', 'cuti', 'shift', 'approval', 'mockup', 'workflow'],
    content: `# Absensi & Cuti — Detail Lengkap

## 1. Modul terkait

| Halaman | Fungsi |
|---------|--------|
| Absensi | Ringkasan kehadiran / clock |
| Jadwal & Shift | Shift, pola kerja, assign karyawan |
| Rekap Harian | Status hadir/telat/alpha per hari |
| Perangkat Absensi | Mesin/fingerprint sync |
| Pengaturan Absensi | Toleransi, geofence, kebijakan |
| Manajemen Cuti | Jenis cuti, kuota, approval HR |

Portal karyawan: clock-in/out + ajukan cuti di ESS.

## Screenshot mockup — Absensi

\`\`\`mockup attendance
Rekap harian: kartu Hadir / Telat / Alpha dan daftar clock karyawan.
\`\`\`

## 2. Flowchart absensi harian

\`\`\`flowchart
[Karyawan Clock-in]
        │
        ▼
[Validasi lokasi / device / shift]
        │
   ┌────┴────┐
   │         │
 Valid     Invalid
   │         │
   ▼         ▼
[Simpan]  [Tolak / flag]
   │
   ▼
[Clock-out]
   │
   ▼
[Hitung jam kerja / lembur / telat]
   │
   ▼
[Rekap Harian → Payroll (opsional)]
\`\`\`

## 3. Flowchart pengajuan cuti

\`\`\`flowchart
[Karyawan ajukan cuti]
        │
        ▼
[Cek kuota & overlapping]
        │
   ┌────┴────┐
   │         │
 OK        Tolak otomatis
   │
   ▼
[Notifikasi approver]
   │
   ▼
[Manager / HR approve-reject]
   │
   ├── Approve → potong kuota + update kalender
   └── Reject  → status ditolak + alasan
\`\`\`

## 4. Komponen konfigurasi yang wajib

1. **Shift** — jam masuk/pulang, hari kerja.
2. **Geofence** — radius kantor (jika mobile).
3. **Toleransi keterlambatan** — menit grace.
4. **Jenis cuti** — annual, sick, unpaid, dll.
5. **Approval config** — berapa tahap, role mana.

## 5. Integrasi ke payroll

- Telat / absen dapat memengaruhi potongan (jika aturan aktif).
- Lembur dari absensi bisa di-bridge ke komponen OVERTIME (lihat Payroll Golden).
- Cuti tanpa bayar memengaruhi hari kerja dalam periode gaji.

## 6. Troubleshooting cepat

- Clock gagal: cek device, GPS, shift assignment.
- Cuti error: cek kolom attachment/schema, kuota, tanggal kerja.
- Rekap kosong: pastikan tenant_id & tanggal filter benar.`,
  },
  {
    slug: 'payroll-deep-dive-flowchart',
    title: 'Payroll Deep Dive — Komponen & Flowchart Siklus Gaji',
    summary: 'Penjelasan komponen gaji, alur run, THR/BPJS/PPh21, approve→paid, slip.',
    category: 'payroll',
    sort_order: 5,
    tags: ['payroll', 'thr', 'bpjs', 'pph21', 'flowchart'],
    content: `# Payroll Deep Dive

## 1. Submodul Payroll

| Menu | Fungsi |
|------|--------|
| Dasbor Payroll | Ringkasan run & status |
| Proses Gaji | Buat run, hitung, approve, paid |
| Slip Gaji | Lihat/unduh slip |
| THR | Perhitungan Tunjangan Hari Raya |
| PPh 21 | Pajak penghasilan karyawan |
| BPJS | Iuran kesehatan & ketenagakerjaan |
| Lembur | Komponen overtime |
| Bonus & Insentif | Tunjangan variabel |
| Kasbon | Cash advance |
| Pinjaman | Cicilan karyawan |
| Laporan | Rekap per periode/departemen |
| Transfer Bank | Disbursement / export bank |

## 2. Flowchart siklus gaji bulanan

\`\`\`flowchart
[Master gaji karyawan siap]
        │
        ▼
[Buat Payroll Run (periode)]
        │
        ▼
[Generate / Calculate]
        │
        ├── tarik absensi / lembur
        ├── hitung tunjangan & potongan
        ├── hitung BPJS & PPh21
        └── hasilkan payslip draft
        │
        ▼
[Review HR]
        │
   ┌────┴────┐
   │         │
 Revisi    Approve
   │         │
   └────►────┘
        │
        ▼
[Status: approved]
        │
        ▼
[Transfer bank / disbursement]
        │
        ▼
[Mark Paid + audit log]
        │
        ▼
[Slip tersedia di ESS]
\`\`\`

## 3. Komponen penghasilan (contoh)

- Gaji pokok
- Tunjangan tetap / tidak tetap
- Lembur
- Bonus / insentif
- THR (periode khusus)

## 4. Komponen potongan (contoh)

- BPJS karyawan
- PPh21
- Kasbon / cicilan pinjaman
- Potongan alpha / lain-lain

## 5. Prasyarat sebelum hitung

1. Karyawan aktif + join date valid.
2. Gaji pokok & PTKP terisi.
3. Absensi periode sudah final (jika dipakai).
4. Komponen BPJS/THR dikonfigurasi.

## 6. Audit & keamanan

- Event approve→paid tercatat di payroll-audit.
- Hanya role berwenang yang boleh approve/paid.
- Jangan pakai mock data di production.

## 7. Checklist closing bulanan

- Semua run periode status **paid**
- Slip terdistribusi
- Laporan PPh21/BPJS diunduh
- Backup export bank disimpan`,
  },
  {
    slug: 'kinerja-kpi-okr-detail',
    title: 'Kinerja: KPI, OKR & Penilaian — Detail + Flow',
    summary: 'Cara menyusun KPI/OKR, siklus penilaian, dan keterkaitan ke engagement.',
    category: 'kinerja',
    sort_order: 6,
    tags: ['kpi', 'okr', 'performance'],
    content: `# Kinerja: KPI, OKR & Penilaian

## 1. Modul

- **OKR / KPI** — cascading company → dept → individu
- **KPI Karyawan** — skor & periode
- **Pengaturan KPI** — template & bobot
- **Penilaian Kinerja** — review periodik / 360

## 2. Flowchart siklus kinerja

\`\`\`flowchart
[Tentukan periode & template KPI]
        │
        ▼
[Cascade OKR perusahaan]
        │
        ▼
[Assign KPI ke karyawan]
        │
        ▼
[Input progress / evidence]
        │
        ▼
[Review atasan]
        │
        ▼
[Kalibrasi HR (opsional)]
        │
        ▼
[Final score + feedback]
        │
        └──► [Insight engagement / 9-box]
\`\`\`

## 3. Komponen penilaian

1. Target kuantitatif (angka/persentase)
2. Bobot per indikator
3. Evidence / lampiran
4. Skor atasan & self-review
5. Komentar pengembangan

## 4. Praktik terbaik

- Satukan periode KPI dengan siklus bisnis (kuartal/tahun).
- Hindari terlalu banyak indikator (>7 per orang).
- Hubungkan hasil ke bonus hanya setelah kalibrasi.`,
  },
  {
    slug: 'rekrutmen-lms-detail',
    title: 'Rekrutmen & LMS — Pipeline, Kursus & Flowchart',
    summary: 'Dari lowongan hingga onboarding; academy LMS, enrollment, skor.',
    category: 'talent',
    sort_order: 7,
    tags: ['rekrutmen', 'lms', 'training'],
    content: `# Rekrutmen & LMS

## 1. Flowchart rekrutmen

\`\`\`flowchart
[Buat Job Opening]
        │
        ▼
[Publish / Integrasi job board]
        │
        ▼
[Kandidat masuk (manual/webhook)]
        │
        ▼
[Screening AI / HR]
        │
        ▼
[Interview stages]
        │
        ▼
[Offer → Accept]
        │
        ▼
[Create Employee + Onboarding]
\`\`\`

## 2. Komponen rekrutmen

- Job opening & deskripsi
- Pipeline stage
- Candidate profile
- Webhook signature (Dealls/LinkedIn/dll — butuh secret)
- AI screening (jika SumoPod aktif)

## 3. Flowchart LMS

\`\`\`flowchart
[Buat Course / Blueprint]
        │
        ▼
[Modul + materi + bank soal]
        │
        ▼
[Publish course]
        │
        ▼
[Enroll karyawan / batch]
        │
        ▼
[Belajar + ujian]
        │
        ▼
[Scoring / sertifikat]
        │
        ▼
[Analytics & competency gap]
\`\`\`

## 4. Tips

- Samakan job department dengan org structure.
- Webhook gagal signature → cek secret staging vs prod.
- LMS advanced URL tetap ada meski sidebar dipangkas.`,
  },
  {
    slug: 'ess-mss-portal-detail',
    title: 'Portal ESS & MSS — Fitur Karyawan dan Manajer',
    summary: 'Penjelasan portal mandiri karyawan dan layanan manajer.',
    category: 'ess',
    sort_order: 8,
    tags: ['ess', 'mss', 'portal', 'mockup', 'langkah', 'workflow'],
    content: `# Portal ESS & MSS

## 1. ESS (Employee Self Service)

URL: \`/employee\`

\`\`\`mockup ess-home
Beranda ESS: sapaan karyawan, Clock-in, Ajukan cuti, pintasan Slip / Klaim / Dokumen.
\`\`\`

Fitur tipikal:
- Profil & dokumen
- Absensi (clock)
- Pengajuan cuti
- Slip gaji
- Klaim reimbursement
- Notifikasi / kebijakan

### Workflow cuti dari ESS

\`\`\`workflow
Login Portal Karyawan → Menu Cuti → Ajukan → Isi jenis & tanggal → Submit Pending → Approver MSS/HR
\`\`\`

\`\`\`flowchart
[Login Portal Karyawan]
        │
        ▼
[Menu Cuti → Ajukan]
        │
        ▼
[Isi jenis, tanggal, alasan]
        │
        ▼
[Submit → status pending]
        │
        ▼
[Approver di MSS / HR]
\`\`\`

## 2. MSS (Manager Self Service)

Halaman konfigurasi/layanan: \`/humanify/mss\`

\`\`\`mockup mss-approvals
Antrian approval: Setujui atau Tolak cuti/klaim tim.
\`\`\`

Manajer biasanya:
- Approve cuti/klaim tim
- Lihat kehadiran anak buah
- Input/review KPI

## 3. Konfigurasi HR

- \`/humanify/ess\` — toggle fitur ESS
- Undang user dari **Tim & Undangan**
- Pastikan karyawan punya email valid

## 4. Keamanan

- Karyawan hanya melihat data sendiri (scoped).
- Jangan bagikan akun HR ke karyawan.`,
  },
  {
    slug: 'keamanan-billing-platform',
    title: 'Keamanan, Billing, SSO & Platform Ops',
    summary: '2FA, role, billing Midtrans, SSO SAML, enterprise API.',
    category: 'keamanan',
    sort_order: 9,
    tags: ['security', 'billing', 'sso'],
    content: `# Keamanan, Billing & Platform

## 1. Flowchart akses aman

\`\`\`flowchart
[User login]
        │
        ▼
[Credentials / SSO]
        │
        ▼
[MFA challenge (jika aktif)]
        │
        ▼
[Session + role + tenant]
        │
        ▼
[API withHQAuth + tenant scope]
\`\`\`

## 2. Komponen keamanan

- **2FA** — \`/humanify/security\`
- **Role & Akses** — permission matrix
- **SSO SAML** — \`/humanify/sso\` (enterprise)
- **RLS** — soft (prod) / strict (staging lab)

## 3. Billing

- Halaman: \`/humanify/billing\`
- Checkout Midtrans, aktivasi plan, seat metering
- Pantau kuota karyawan vs plan

## 4. Enterprise

- API key & brand
- Webhook outbound
- Integrasi eksternal

## 5. Rekomendasi produksi

1. Wajibkan 2FA untuk owner/HR admin.
2. Review role setiap quarter.
3. Jangan commit secret ke git.
4. Pantau \`/platform/observability\` (ops).`,
  },
  {
    slug: 'tiket-support-dan-sla',
    title: 'Tiket Support — Cara Pakai, Kategori & Flowchart SLA',
    summary: 'Detail pengaduan ke tim Humanify, prioritas, status, dan praktik penulisan tiket bagus.',
    category: 'support',
    sort_order: 10,
    tags: ['support', 'tiket', 'sla', 'mockup', 'langkah', 'contoh'],
    content: `# Tiket Support Humanify

## 1. Kapan buat tiket?

- Bug / error aplikasi
- Billing & invoice
- Masalah akses/login
- Pertanyaan payroll/absensi yang tidak terjawab di KB
- Permintaan fitur

Cek **Knowledge Center** dulu — banyak solusi sudah terdokumentasi.

\`\`\`mockup support
Ringkasan Open / Progress / Resolved dan tombol Buat tiket baru.
\`\`\`

## 2. Tata cara buat tiket

\`\`\`steps
1. Buka /humanify/support
   Login sebagai HR Admin tenant Anda.
2. Klik Buat tiket baru
   Isi subjek singkat dan deskripsi lengkap.
3. Pilih kategori & prioritas
   Urgent hanya untuk produksi down / payroll blocking.
4. Kirim dan pantau thread
   Balas jika status Waiting; tutup setelah Resolved.
\`\`\`

\`\`\`example
**Contoh subjek bagus:** "[Payroll] Take-home 0 untuk karyawan EMP-0042 run Mar 2026"
Sertakan: langkah reproduksi, hasil aktual vs diharapkan, waktu kejadian, screenshot.
\`\`\`

## 3. Flowchart siklus tiket

\`\`\`flowchart
[Buat tiket di /humanify/support]
        │
        ▼
[Status: Open]
        │
        ▼
[Tim Humanify review]
        │
        ▼
[In Progress]
        │
   ┌────┴────┐
   │         │
 Butuh info  Selesai
   │         │
   ▼         ▼
[Waiting]  [Resolved]
   │         │
   └── Anda balas
        │
        ▼
[Closed]
\`\`\`

## 3. Kategori & prioritas

| Kategori | Contoh |
|----------|--------|
| bug | Halaman error, transaksi gagal |
| billing | Invoice, upgrade plan |
| payroll | Hitungan gaji salah |
| attendance | Clock/device issue |
| access | Login/2FA/SSO |
| feature_request | Usulan fitur |
| other | Lainnya |

Prioritas **urgent** hanya untuk produksi down / payroll blocking.

## 4. Template deskripsi bagus

1. Ringkasan 1 kalimat
2. Langkah reproduksi
3. Hasil aktual vs diharapkan
4. User/tenant/waktu kejadian
5. Screenshot / nomor run payroll

## 5. Komponen UI tiket

- Summary cards (total/open/progress/resolved)
- Filter status & kategori
- Thread komentar
- Ubah status (open → resolved)

Halaman: \`/humanify/support\`.`,
  },
  {
    slug: 'glossary-istilah-humanify',
    title: 'Glosarium Istilah Humanify HRIS',
    summary: 'Kamus singkat istilah HRIS, payroll, absensi, dan platform SaaS.',
    category: 'umum',
    sort_order: 11,
    tags: ['glossary', 'istilah'],
    content: `# Glosarium Humanify

| Istilah | Arti |
|---------|------|
| Tenant | Organisasi/perusahaan pelanggan di SaaS |
| ESS | Employee Self Service — portal karyawan |
| MSS | Manager Self Service |
| RLS | Row Level Security di database |
| Payroll run | Batch perhitungan gaji satu periode |
| Payslip | Slip gaji per karyawan |
| PTKP | Penghasilan Tidak Kena Pajak |
| Geofence | Batas lokasi absensi |
| Shift | Pola jam kerja |
| OKR | Objectives & Key Results |
| KPI | Key Performance Indicator |
| Webhook | Callback HTTP antar sistem |
| Seat | Kuota user/karyawan pada plan billing |
| Go-live | Saat sistem mulai dipakai produksi |

Untuk istilah baru, minta tim Humanify menambahkan via Tiket Support.`,
  },
  {
    slug: 'aiman-agent-workflow',
    title: 'AIMAN Assisted Agent Workflow',
    summary: 'Cara memakai AIMAN sebagai agent: baca data otomatis, aksi write hanya setelah konfirmasi HR.',
    category: 'getting_started',
    sort_order: 12,
    tags: ['aiman', 'agent', 'otomasi', 'workflow'],
    content: `# AIMAN Assisted Agent Workflow

AIMAN sekarang bisa menjalankan **assisted agent** — multi-step workflow yang membaca data live, lalu meminta konfirmasi sebelum aksi write.

## Prinsip

1. **Read otomatis** — checklist, pratinjau, backlog
2. **Write dengan human-in-the-loop** — tombol Konfirmasi atau ketik \`konfirmasi\` / \`ya jalankan\`
3. **Audit** — konfirmasi aksi dicatat di admin audit (\`aiman.agent_confirm\`)

## Flowchart

\`\`\`flowchart
[User: "Persiapkan payroll"]
        │
        ▼
[AIMAN jalankan tool baca]
  • checklist gaji
  • backlog HR
        │
        ▼
[Ringkasan + blocker]
        │
        ▼
[Pending: Scan otomasi?]
   ┌────┴────┐
   │ Konfirm │ Tolak / abaikan
   └────┬────┘
        ▼
[Write tool dieksekusi + audit log]
\`\`\`

## Workflow siap pakai

| Perintah contoh | Workflow | Write (konfirmasi) |
|-----------------|----------|--------------------|
| Persiapkan payroll bulan ini | Persiapan Payroll | Scan otomasi |
| Screening kandidat | Screening | Advance kandidat lolos |
| Meja cuti / detail cuti pending | Meja Cuti | Alert backlog cuti (≥5) |
| Cek kontrak hampir habis | Pantau Kontrak | Alert kontrak |
| Cek onboarding | Onboarding | — (read only) |
| Backlog HR | Backlog | Scan otomasi |
| Jalankan scan otomasi | Scan | Scan otomasi |

## Komponen

- Halaman: \`/humanify/ai?tab=copilot\`
- API chat: \`POST /api/humanify/ai-hub?action=chat\` (+ \`pendingTools\`)
- API konfirmasi: \`POST /api/humanify/ai-hub?action=agent-confirm\`
- Lib: \`lib/hris/aiman-agent.ts\`, \`aiman-agent-tools.ts\`

## Batasan

- Bukan full autonomous agent (tidak auto-approve cuti / auto-transfer gaji)
- Fitur plan \`ai\` (Enterprise) diperlukan
- Selalu review ringkasan sebelum konfirmasi write`,
  },
  {
    slug: 'kampanye-reupload-bukti-klaim-legacy',
    title: 'Kampanye re-upload bukti klaim (format lama)',
    summary: 'Cara HR dan karyawan memperbaiki klaim yang hanya menyimpan nama file — agar preview PDF/JPG berfungsi.',
    category: 'ess',
    sort_order: 13,
    tags: ['klaim', 'reimbursement', 'legacy', 'ess', 'bukti'],
    content: `# Kampanye re-upload bukti klaim legacy

## Masalah

Klaim lama menyimpan \`receipt_url\` sebagai **nama file saja** (contoh: \`kwitansi.jpg\`). File fisik tidak ada di private storage, jadi gallery HR/MSS menampilkan "bukti format lama".

## Alur perbaikan (karyawan — ESS)

\`\`\`flowchart
[Login /employee → tab Klaim]
        │
        ▼
[Banner: N klaim pending bukti lama?]
        │
        ▼
[Tombol "Upload ulang bukti"]
        │
        ▼
[Pilih PDF/JPG/PNG → Simpan]
        │
        ▼
[HR/manajer bisa preview di Reimbursement / MSS]
\`\`\`

## Alur HR

1. Jalankan laporan: \`npm run report:legacy-claims\` (staging/prod).
2. Broadcast ke karyawan yang punya klaim pending legacy.
3. Verifikasi di \`/humanify/reimbursement\` → **Lihat bukti**.

## Batasan

- Upload ulang hanya untuk status **pending** (klaim ditolak tetap lewat **Ajukan Ulang**).
- Klaim **approved** historis tidak diubah otomatis — dokumentasikan di audit jika dibutuhkan.`,
  },
];
