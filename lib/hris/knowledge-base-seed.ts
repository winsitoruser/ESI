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
    summary: 'Onboarding tenant dari zero: organisasi, karyawan, absensi, cuti, payroll, ESS, dan go-live.',
    category: 'getting_started',
    sort_order: 1,
    tags: ['onboarding', 'setup', 'go-live'],
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

## 2. Flowchart setup awal (Go-live)

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

## 3. Checklist komponen yang harus siap

| Urutan | Modul | Halaman | Output yang diharapkan |
|--------|--------|---------|-------------------------|
| 1 | Organisasi | Struktur Organisasi | Unit, departemen, grade |
| 2 | Karyawan | Database / Impor | Master karyawan aktif |
| 3 | Absensi | Jadwal & Pengaturan | Shift + aturan jam kerja |
| 4 | Cuti | Manajemen Cuti | Jenis cuti + kuota |
| 5 | Payroll | Proses Gaji | Run pertama sukses |
| 6 | Akses | Tim & Undangan / Role | User HR + ESS |
| 7 | Keamanan | 2FA | MFA aktif untuk admin |

## 4. Peran pengguna

- **Owner / HR Admin** — konfigurasi penuh tenant, payroll, user.
- **HR Staff** — operasional karyawan, absensi, cuti.
- **Manager (MSS)** — approval tim, pantau kinerja.
- **Karyawan (ESS)** — absensi, cuti, slip, klaim.
- **Platform Superadmin** — lintas tenant (ops Naincode).

## 5. Tips sukses go-live

1. Jangan mulai payroll sebelum **master karyawan + gaji pokok** lengkap.
2. Uji absensi di **1 cabang/shift** dulu.
3. Gunakan **Go-live Checklist** di menu Platform.
4. Simpan runbook internal di **Knowledge Center** (artikel tenant).
5. Kendala produk → **Tiket Support**.

Lanjut baca: *Peta Modul & Komponen Humanify*, *Alur Karyawan End-to-End*, *Payroll Deep Dive*.`,
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
- Aset, E-Sign, Pengaturan Organisasi, ESS/MSS config

### Kehadiran & Cuti
- Absensi, Jadwal & Shift, Rekap Harian
- Perangkat Absensi, Pengaturan Absensi, Manajemen Cuti

### Kinerja
- OKR/KPI, KPI Karyawan, Pengaturan KPI, Penilaian Kinerja

### Payroll
- Dasbor, Proses Gaji, Slip, THR, PPh21, BPJS
- Lembur, Bonus, Kasbon, Pinjaman, Laporan, Transfer Bank
- Reimbursement, Casual Workforce

### Rekrutmen & LMS
- Rekrutmen, Training/LMS (academy, courses, analytics)

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
    tags: ['karyawan', 'lifecycle', 'flowchart'],
    content: `# Alur Karyawan End-to-End

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
- \`/humanify/contracts\` — masa berlaku, e-sign, reminder kedaluwarsa

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
    tags: ['absensi', 'cuti', 'shift', 'approval'],
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
    tags: ['ess', 'mss', 'portal'],
    content: `# Portal ESS & MSS

## 1. ESS (Employee Self Service)

URL: \`/employee\`

Fitur tipikal:
- Profil & dokumen
- Absensi (clock)
- Pengajuan cuti
- Slip gaji
- Klaim reimbursement
- Notifikasi / kebijakan

### Flowchart cuti dari ESS

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
    tags: ['support', 'tiket', 'sla'],
    content: `# Tiket Support Humanify

## 1. Kapan buat tiket?

- Bug / error aplikasi
- Billing & invoice
- Masalah akses/login
- Pertanyaan payroll/absensi yang tidak terjawab di KB
- Permintaan fitur

Cek **Knowledge Center** dulu — banyak solusi sudah terdokumentasi.

## 2. Flowchart siklus tiket

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
];
