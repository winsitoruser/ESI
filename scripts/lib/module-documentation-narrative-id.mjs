/**
 * Konten naratif komprehensif untuk dokumentasi produk (ID):
 * bisnis, produk, UX, CS, klien/prospek — dipakai Excel & Word.
 * Bisa dikembangkan tanpa mengubah logika generator.
 */

export const DOKUMEN_META = {
  judul: 'Bedagang PoS / ERP — Dokumentasi Modul & Pengalaman Produk',
  versiDokumen: '2.0 (naratif komprehensif)',
  ringkasProduk:
    'Bedagang adalah platform operasional ritel dan F&B berbasis cloud yang menggabungkan Point of Sale, manajemen stok & pembelian, keuangan, SDM/HRIS, pusat komando cabang (HQ), integrasi channel (marketplace, pengiriman, pembayaran), dan laporan analitik. Satu sumber data mendukung keputusan dari lantai toko hingga direksi.',
};

/** Baris untuk sheet Panduan: Peran | Fokus baca | Rekomendasi sheet */
export const PANDUAN_PEMBACA = [
  [
    'Tim Produk & PM',
    'Visi fitur, prioritas, gap, dependensi antar modul, acceptance naratif.',
    'Ikhtisar_Produk, Modul_Naratif, Fitur_Detail, Workflow, Use_Case, Relasi_Modul.',
  ],
  [
    'Tim Bisnis & Sales',
    'Nilai jual, proses bisnis yang tertutup, demo skenario, jawaban RFP ringkas.',
    'Ikhtisar_Produk, Modul_Naratif, Use_Case, Workflow, Glosarium.',
  ],
  [
    'UX / UI',
    'Alur tugas pengguna, konteks layar, edge case, konsistensi peran.',
    'Modul_Naratif, Workflow, Halaman (kolom deskripsi), Use_Case.',
  ],
  [
    'Customer Success & Support',
    'Onboarding, SOP, eskalasi, apa yang “normal” vs bug, titik integrasi.',
    'Use_Case, Workflow, Panduan_Pembaca, Modul_Naratif, API (referensi teknis).',
  ],
  [
    'IT & Engineering',
    'Inventori route, kontrak data, tabel, dependensi deploy.',
    'Halaman, Komponen, API, Tabel_DB, Relasi_Modul.',
  ],
  [
    'Klien / Prospek',
    'Gambaran kemampuan sistem tanpa jargon berlebihan, studi kasus operasional.',
    'Ikhtisar_Produk, Modul_Naratif, Use_Case, Workflow.',
  ],
];

export const IHTISAR_BAGIAN = [
  {
    judul: 'Ruang lingkup produk',
    isi:
      'Platform ini mendukung multi-cabang dan multi-peran: kasir, gudang, keuangan, HR, manajer cabang, hingga pusat kontrol perusahaan. Data transaksi POS dapat mengalir ke persediaan dan pembukuan; kebijakan HR dan payroll dapat terhubung ke akun keuangan; laporan konsolidasi membantu pemilik bisnis melihat performa lintas lokasi.',
  },
  {
    judul: 'Prinsip integrasi',
    isi:
      'Modul tidak berdiri sendiri: penjualan mempengaruhi stok; pembelian menambah stok dan hutang; shift kasir menjembatani uang tunai dan non-tunai; integrasi pihak ketiga (pembayaran, marketplace, kurir) mengikuti konfigurasi per tenant/cabang. Konfigurasi disentralisasi di pengaturan dengan otorisasi per peran.',
  },
  {
    judul: 'Cara membaca segmen folder',
    isi:
      'Folder tingkat pertama di `pages/` (mis. `hq`, `pos`, `inventory`) dipakai sebagai “segmen modul UI” untuk pemetaan dokumen. Satu segmen bisa mencakup banyak sub-fitur (contoh: `hq` mencakup HRIS, fleet, laporan pusat). Deskripsi di sheet Modul_Naratif menjelaskan cakupan bisnisnya.',
  },
];

/**
 * Narasi per segmen folder (kunci = string segmen, '' = akar).
 * Digabung dengan fallback untuk segmen yang tidak terdaftar.
 */
export const NARASI_SEGMEN = {
  '': {
    judul: 'Beranda, dashboard & entry umum',
    ringkasan:
      'Titik masuk pengguna setelah login: ringkasan KPI, pintasan ke modul, dan pengalaman sesuai peran (kasir vs manajer). Mendukung beberapa varian dashboard industri (mis. F&B).',
    nilaiBisnis:
      'Mengurangi waktu orientasi pengguna dan menonjolkan prioritas harian (penjualan, stok kritis, tugas HR).',
    persona:
      'Manajer toko: melihat performa harian. Staff: akses cepat ke tugas. Produk/UX: konsistensi navigasi global.',
    fiturUtama: [
      'Dashboard ringkas dengan metrik penjualan, stok, atau operasional (tergantung konfigurasi).',
      'Navigasi ke submodule tanpa deep-link manual.',
    ],
    halamanTypical:
      'File di akar `pages/` seperti `dashboard.tsx`, `index.tsx` — layar agregat bukan transaksi detail.',
    relasiKeModulLain: [
      { ke: 'Semua modul', tipe: 'navigasi', catatan: 'Dashboard memuat widget yang membaca data modul lain (read-only).' },
    ],
  },
  auth: {
    judul: 'Autentikasi & sesi',
    ringkasan:
      'Login, registrasi (bila diaktifkan), pemilihan cabang, dan pergantian konteks tenant/cabang untuk pengguna multi-lokasi.',
    nilaiBisnis:
      'Keamanan akses sesuai peran dan isolasi data antar tenant pada model SaaS.',
    persona:
      'IT: kebijakan password & sesi. CS: bantuan login & switch cabang. Klien: kepercayaan data terpisah antar entitas.',
    fiturUtama: [
      'Autentikasi pengguna dan penyimpanan konteks cabang aktif.',
      'Switch cabang untuk pengguna yang memiliki akses multi-outlet.',
    ],
    halamanTypical: '`auth/login`, `auth/register` — gate sebelum aplikasi utama.',
    relasiKeModulLain: [
      { ke: 'Core / User', tipe: 'data', catatan: 'Profil & hak akses menentukan menu yang tampil.' },
    ],
  },
  admin: {
    judul: 'Admin SaaS (super admin / operator platform)',
    ringkasan:
      'Pengelolaan tenant, paket langganan, modul yang diaktifkan, partner, KYB, transaksi platform, dan konfigurasi global — di luar operasional harian satu merchant.',
    nilaiBisnis:
      'Skalabilitas bisnis software: onboarding tenant, monetisasi, compliance.',
    persona:
      'Produk: lifecycle tenant. Sales: paket & fitur. Support tier-2: investigasi tenant.',
    fiturUtama: [
      'Manajemen tenant, cabang, dan modul.',
      'Alur review KYB dan aktivasi.',
      'Monitoring transaksi/usage level platform (bila tersedia).',
    ],
    halamanTypical: '`admin/tenants`, `admin/modules`, `admin/partners`, `admin/kyb-review` — konsol internal.',
    relasiKeModulLain: [
      { ke: 'Billing SaaS', tipe: 'bisnis', catatan: 'Langganan tenant terhubung ke paket dan faktur platform.' },
    ],
  },
  pos: {
    judul: 'Point of Sale (Kasir)',
    ringkasan:
      'Pencatatan penjualan harian: keranjang, diskon, pajak, pembayaran campuran, cetak struk, shift kasir, hold bill, dan koneksi ke dapur/meja bila F&B.',
    nilaiBisnis:
      'Kecepatan transaksi, akurasi kas, audit shift, dan dasar laporan penjualan real-time.',
    persona:
      'Kasir: kecepatan & error minim. Manajer: rekonsiliasi shift. CS: training SOP kasir. UX: alur minimal tap.',
    fiturUtama: [
      'Transaksi POS dengan item line, modifikasi, dan promo.',
      'Shift buka/tutup kas dengan laporan selisih.',
      'Hold / recall transaksi (antrian pesanan).',
      'Riwayat transaksi & struk (digital/cetak).',
    ],
    halamanTypical:
      '`pos/cashier`, `pos/new-order`, `pos/tables`, `pos/shifts`, `pos/history` — inti operasional front-of-house.',
    relasiKeModulLain: [
      { ke: 'Inventori', tipe: 'data', catatan: 'Penjualan dapat mengurangi stok per gudang/cabang sesuai aturan.' },
      { ke: 'Produk', tipe: 'master', catatan: 'Harga & SKU mengacu master produk.' },
      { ke: 'Keuangan', tipe: 'akuntansi', catatan: 'Settlement pembayaran dapat memicu jurnal/pemasukan (sesuai konfigurasi).' },
      { ke: 'Kitchen', tipe: 'operasional', catatan: 'Pesanan F&B dapat diteruskan ke layar dapur.' },
      { ke: 'Pelanggan & Loyalty', tipe: 'data', catatan: 'Identifikasi pelanggan untuk poin atau harga khusus.' },
    ],
  },
  inventory: {
    judul: 'Inventori & gudang',
    ringkasan:
      'Master stok multi-lokasi, transfer antar gudang, penerimaan barang, penyesuaian, stock opname, PO, retur, dan BOM/resep untuk manufaktur ringan.',
    nilaiBisnis:
      'Mencegah overselling, mengurangi shrinkage, dan mendukung keputusan pembelian berbasis data.',
    persona:
      'Gudang: akurasi fisik. Pembelian: lead time. Finance: nilai persediaan. UX: form berat → wizard ringkas.',
    fiturUtama: [
      'Kartu stok per produk/varian dan per gudang.',
      'Transfer, adjustment, opname.',
      'Alur PO → penerimaan → penambahan stok.',
      'Resep/BOM mengurangi komponen saat produksi atau penjualan olahan.',
    ],
    halamanTypical:
      '`inventory/master`, `inventory/transfers`, `inventory/stock-opname`, `inventory/purchase-orders`, `inventory/recipes` — operasional back-of-house.',
    relasiKeModulLain: [
      { ke: 'POS', tipe: 'data', catatan: 'Keluar stok karena penjualan.' },
      { ke: 'Pembelian', tipe: 'aliran', catatan: 'PO dan goods receipt menambah stok.' },
      { ke: 'Supplier', tipe: 'master', catatan: 'Referensi pemasok di PO/GRN.' },
    ],
  },
  finance: {
    judul: 'Keuangan & pembukuan',
    ringkasan:
      'Akun, jurnal, invoice/pembelian, pengeluaran, pajak, laba rugi sederhana, rekonsiliasi, dan laporan arus kas — level outlet atau konsolidasi (tergantung setup).',
    nilaiBisnis:
      'Visibilitas profitabilitas, kepatuhan pajak, dan kontrol piutang/hutang.',
    persona:
      'Finance: akurasi jurnal. Bisnis: margin per kategori. Klien: transparansi biaya berlangganan vs operasional.',
    fiturUtama: [
      'Chart of accounts dan entri jurnal.',
      'Invoice, pembayaran, dan kategori pengeluaran.',
      'Laporan P&L, neraca ringkas, pajak (PPN/PPH sesuai wilayah).',
    ],
    halamanTypical:
      '`finance/invoices`, `finance/expenses`, `finance/ledger`, `finance/tax/*`, `finance/reports` — back office keuangan.',
    relasiKeModulLain: [
      { ke: 'POS', tipe: 'sumber transaksi', catatan: 'Penjualan sebagai basis pendapatan.' },
      { ke: 'HRIS', tipe: 'biaya', catatan: 'Payroll sebagai beban (jika terintegrasi).' },
    ],
  },
  hq: {
    judul: 'Headquarters (Pusat komando)',
    ringkasan:
      'Pusat pengelolaan lintas cabang: produk & harga, HRIS lengkap, fleet, proyek, pembelian strategis, laporan konsolidasi, audit, integrasi channel, WhatsApp, website builder, marketplace, dan pengaturan modul tenant.',
    nilaiBisnis:
      'Standardisasi kebijakan, visibilitas grup, dan efisiensi fungsi yang tidak perlu dilakukan di setiap outlet.',
    persona:
      'Owner: big picture. HR pusat: kebijakan SDM. Product: feature flags & rollout. CS: konfigurasi onboarding korporat.',
    fiturUtama: [
      'Manajemen karyawan, payroll, KPI, pelatihan, cuti — modul HRIS terpusat.',
      'Fleet: kendaraan, driver, bahan bakar, pelacakan operasional.',
      'Laporan konsolidasi penjualan, keuangan, inventori, HR.',
      'Integrasi: payment gateway, food delivery, marketplace, messaging.',
    ],
    halamanTypical:
      'Subfolder `hq/hris/*`, `hq/finance/*`, `hq/fleet/*`, `hq/reports/*`, `hq/settings/*` — banyak peran korporat.',
    relasiKeModulLain: [
      { ke: 'Cabang (branches)', tipe: 'hierarki', catatan: 'Kebijakan HQ diturunkan ke cabang.' },
      { ke: 'POS / Inventori per cabang', tipe: 'sinkron', catatan: 'Master data dan target dapat diatur pusat.' },
    ],
  },
  kitchen: {
    judul: 'Dapur & Kitchen Display',
    ringkasan:
      'Antrian pesanan untuk produksi masak: prioritas, status item, staf dapur, resep, dan laporan dapur.',
    nilaiBisnis:
      'Mengurangi waktu tunggu dan kesalahan komunikasi antara kasir-pelayan-dapur.',
    persona:
      'Chef: prioritas order. UX: readability layar dapur. CS: alur status yang dipahami konsumen akhir.',
    fiturUtama: [
      'Tampilan order real-time dari POS.',
      'Status item (siap, sedang dimasak).',
      'Manajemen resep & bahan dapur.',
    ],
    halamanTypical: '`kitchen/display`, `kitchen/orders`, `kitchen/staff` — operasional F&B.',
    relasiKeModulLain: [
      { ke: 'POS', tipe: 'aliran pesanan', catatan: 'Sumber order dari transaksi/meja.' },
      { ke: 'Inventori', tipe: 'BOM', catatan: 'Pengurangan bahan baku sesuai resep.' },
    ],
  },
  settings: {
    judul: 'Pengaturan toko & sistem',
    ringkasan:
      'Konfigurasi cabang, perangkat keras, notifikasi, desain struk, resep outlet, pengguna & peran, keamanan, backup, dan integrasi webhook.',
    nilaiBisnis:
      'Fleksibilitas operasional tanpa mengubah kode; mendukung white-label perilaku per outlet.',
    persona:
      'IT: webhook & keamanan. CS: panduan setting. UX: konsistensi label & permission.',
    fiturUtama: [
      'Pengaturan cabang dan preferensi toko.',
      'Manajemen pengguna, peran, dan izin.',
      'Backup, audit, integrasi.',
    ],
    halamanTypical: '`settings/store`, `settings/users`, `settings/hardware`, `settings/backup` — administrasi outlet.',
    relasiKeModulLain: [
      { ke: 'Semua modul', tipe: 'konfigurasi', catatan: 'Parameter global mempengaruhi perilaku transaksi dan laporan.' },
    ],
  },
  customers: {
    judul: 'Pelanggan & CRM dasar',
    ringkasan:
      'Database pelanggan, tier loyalitas, statistik pembelian, dan dasar hubungan pelanggan untuk kampanye atau layanan.',
    nilaiBisnis:
      'Meningkatkan repeat purchase dan personalisasi penawaran.',
    persona:
      'Marketing: segmentasi. CS: riwayat komplain. Sales B2B: akun korporat.',
    fiturUtama: [
      'Profil pelanggan dan riwayat transaksi.',
      'Statistik dan laporan pelanggan.',
    ],
    halamanTypical: '`customers/list`, `customers/reports`, `customers/loyalty` — hubungan pelanggan.',
    relasiKeModulLain: [
      { ke: 'POS', tipe: 'transaksi', catatan: 'Identitas pelanggan di struk.' },
      { ke: 'Loyalty', tipe: 'poin', catatan: 'Akumulasi & penukaran poin.' },
    ],
  },
  billing: {
    judul: 'Billing langganan aplikasi (merchant → platform)',
    ringkasan:
      'Paket fitur, faktur langganan Bedagang, metode pembayaran, dan analitik penggunaan untuk tenant — berbeda dari invoice penjualan ke pelanggan ritel.',
    nilaiBisnis:
      'Monetisasi produk software dan transparansi biaya untuk merchant.',
    persona:
      'Finance klien: budget IT. Sales: upsell paket. Produk: batas fitur per paket.',
    fiturUtama: ['Paket & invoice langganan SaaS.', 'Metode pembayaran recurring.'],
    halamanTypical: '`billing/plans`, `billing/invoices`, `billing/payment-methods` — administrasi biaya software.',
    relasiKeModulLain: [
      { ke: 'Admin', tipe: 'platform', catatan: 'Operator platform mengatur paket & tenant.' },
    ],
  },
  procurement: {
    judul: 'E-Procurement (tender, RFQ, vendor)',
    ringkasan:
      'Pengadaan strategis: permintaan penawaran, tender, evaluasi vendor — melengkapi PO operasional harian.',
    nilaiBisnis:
      'Transparansi pengadaan dan harga kompetitif untuk pembelian besar.',
    persona:
      'Procurement: compliance. Bisnis: penghematan. Product: alur approval.',
    fiturUtama: ['RFQ, tender, dashboard procurement.', 'Registrasi & login portal vendor (bila dipakai).'],
    halamanTypical: '`procurement/rfqs`, `procurement/tenders`, `procurement/dashboard` — sisi pengadaan.',
    relasiKeModulLain: [
      { ke: 'Inventori / PO', tipe: 'alur', catatan: 'Hasil tender dapat menjadi PO.' },
    ],
  },
  onboarding: {
    judul: 'Onboarding & KYB merchant',
    ringkasan:
      'Alur aktivasi tenant baru: paket, data bisnis, verifikasi (KYB), dan setup awal agar siap transaksi.',
    nilaiBisnis:
      'Time-to-value singkat dan data legal yang cukup untuk compliance.',
    persona:
      'CS: panduan langkah. Sales: proof of value. Klien: kemudahan mulai.',
    fiturUtama: ['Welcome, setup wizard, pemilihan paket/KYB.', 'Integrasi ke admin review.'],
    halamanTypical: '`onboarding/welcome`, `onboarding/setup`, `onboarding/kyb` — perjalanan pertama merchant.',
    relasiKeModulLain: [
      { ke: 'Admin / KYB', tipe: 'gate', catatan: 'Aktivasi penuh setelah persetujuan.' },
    ],
  },
  reports: {
    judul: 'Laporan (outlet & agregat)',
    ringkasan:
      'Laporan penjualan dan operasional di level yang dapat diakses pengguna — pelengkap dashboard.',
    nilaiBisnis:
      'Keputusan berbasis tren musiman, SKU, dan kanal.',
    persona: 'Manajer: export laporan. Produk: metrik adoption fitur.',
    fiturUtama: ['Laporan penjualan dan performa.', 'Drill-down sesama modul sumber data.'],
    halamanTypical: '`reports/index`, `reports/sales` — analitik standar.',
    relasiKeModulLain: [{ ke: 'POS', tipe: 'sumber', catatan: 'Agregasi dari transaksi.' }],
  },
  reservations: {
    judul: 'Reservasi',
    ringkasan:
      'Booking meja/waktu untuk F&B atau layanan janji temu — mengurangi konflik kapasitas.',
    nilaiBisnis: 'Optimasi okupansi dan pengalaman pelanggan.',
    persona: 'Host: jadwal meja. UX: kalender jelas.',
    fiturUtama: ['Manajemen reservasi dan penugasan meja.'],
    halamanTypical: '`reservations/index` — jadwal reservasi.',
    relasiKeModulLain: [
      { ke: 'Meja / POS', tipe: 'operasional', catatan: 'Menjembatani booking dengan meja aktif.' },
    ],
  },
  tables: {
    judul: 'Layout meja (F&B)',
    ringkasan: 'Denah ruangan, meja, dan sesi untuk mendukung layanan dine-in.',
    nilaiBisnis: 'Visualisasi okupansi lantai untuk manajemen kapasitas.',
    persona: 'F&B manager: layout. Kasir: attach order ke meja.',
    fiturUtama: ['Pengaturan denah dan status meja.'],
    halamanTypical: '`tables/index`, `tables/settings` — tata letak restoran.',
    relasiKeModulLain: [{ ke: 'POS', tipe: 'transaksi', catatan: 'Order terikat meja/sesi.' }],
  },
  orders: {
    judul: 'Antrian pesanan',
    ringkasan: 'Monitor dan pengaturan antrian order (mis. display atau prioritas produksi).',
    nilaiBisnis: 'Throughput dapur/layanan terukur.',
    persona: 'Operasional: SLA order.',
    fiturUtama: ['Tampilan antrian pesanan.'],
    halamanTypical: '`orders/queue` — kontrol alur pesanan.',
    relasiKeModulLain: [{ ke: 'Kitchen / POS', tipe: 'aliran', catatan: 'Status antrian terkait sumber order.' }],
  },
  loyalty: {
    judul: 'Program loyalitas (halaman khusus)',
    ringkasan: 'Konfigurasi atau pengalaman loyalty end-user di luar flow POS standar.',
    nilaiBisnis: 'Retensi pelanggan.',
    persona: 'Marketing: aturan poin. CS: pertanyaan membership.',
    fiturUtama: ['Program poin dan reward (terhubung master loyalty).'],
    halamanTypical: '`loyalty-program.tsx` — entry poin program.',
    relasiKeModulLain: [{ ke: 'customers', tipe: 'data', catatan: 'Profil pelanggan & poin.' }],
  },
  driver: {
    judul: 'Aplikasi / portal driver',
    ringkasan: 'Peran pengemudi untuk pengiriman atau fleet last-mile (sesuifitur aktif).',
    nilaiBisnis: 'Pelacakan pengiriman dan produktivitas armada.',
    persona: 'Logistik: proof of delivery.',
    fiturUtama: ['Task atau order assignment driver.'],
    halamanTypical: '`driver/index` — pengemudi.',
    relasiKeModulLain: [{ ke: 'Fleet / TMS', tipe: 'operasional', catatan: 'Armada dan rute.' }],
  },
  candidate: {
    judul: 'Portal kandidat (rekrutmen)',
    ringkasan: 'Ujian atau dashboard kandidat untuk proses rekrutmen terintegrasi HR.',
    nilaiBisnis: 'Mengurangi friction rekrutmen massal.',
    persona: 'HR: pipeline. Kandidat: UX jelas.',
    fiturUtama: ['Login kandidat, ujian, status lamaran.'],
    halamanTypical: '`candidate/login`, `candidate/exam` — sisi pelamar.',
    relasiKeModulLain: [{ ke: 'hq/hris', tipe: 'HR', catatan: 'Data masuk ke rekrutmen.' }],
  },
  employee: {
    judul: 'Portal karyawan (ESS ringan)',
    ringkasan: 'Akses terbatas untuk karyawan non-kasir: jadwal, pengumuman, atau ESS.',
    nilaiBisnis: 'Self-service mengurangi beban HR.',
    persona: 'Karyawan: kejelasan jadwal. HR: konsistensi data.',
    fiturUtama: ['Dashboard atau informasi karyawan.'],
    halamanTypical: '`employee/index` — portal karyawan.',
    relasiKeModulLain: [{ ke: 'HRIS', tipe: 'data', catatan: 'Profil dari master employee.' }],
  },
  employees: {
    judul: 'Jadwal & rotasi staf',
    ringkasan: 'Penjadwalan shift staf di outlet.',
    nilaiBisnis: 'Kecukupan orang di jam sibuk.',
    persona: 'Supervisor shift: coverage.',
    fiturUtama: ['Jadwal karyawan toko.'],
    halamanTypical: '`employees/schedules` — roster.',
    relasiKeModulLain: [{ ke: 'HRIS', tipe: 'jadwal', catatan: 'Sinkron dengan kehadiran jika ada.' }],
  },
  purchasing: {
    judul: 'Purchasing & integrasi keuangan',
    ringkasan: 'Dashboard pembelian terintegrasi dengan laporan keuangan untuk fungsi procurement outlet.',
    nilaiBisnis: 'Visibilitas spend vs budget.',
    persona: 'Finance & procurement outlet.',
    fiturUtama: ['Integrated dashboard pembelian.'],
    halamanTypical: '`purchasing/integrated-dashboard`, `purchasing/finance-integration` — sisi pembelian terintegrasi.',
    relasiKeModulLain: [
      { ke: 'finance', tipe: 'laporan', catatan: 'Alokasi biaya.' },
      { ke: 'inventory', tipe: 'stok', catatan: 'Dasar kebutuhan beli.' },
    ],
  },
  products: {
    judul: 'Analisis HPP produk',
    ringkasan: 'Analisis harga pokok penjualan untuk keputusan harga dan margin.',
    nilaiBisnis: 'Pricing yang sehat secara margin.',
    persona: 'Finance & category manager.',
    fiturUtama: ['Analisis komponen biaya & HPP.'],
    halamanTypical: '`products/hpp-analysis` — margin produk.',
    relasiKeModulLain: [
      { ke: 'inventory/recipes', tipe: 'biaya', catatan: 'BOM mempengaruhi HPP.' },
      { ke: 'pos', tipe: 'harga jual', catatan: 'Bandrol vs cost.' },
    ],
  },
  dashboard: {
    judul: 'Varian dashboard',
    ringkasan: 'Implementasi alternatif dashboard (legacy atau eksperimen).',
    nilaiBisnis: 'Eksperimen UX atau industri tanpa mengganggu dashboard utama.',
    persona: 'Produk: A/B. User: hindari duplikasi kebingungan.',
    fiturUtama: ['Tampilan metrik alternatif.'],
    halamanTypical: '`dashboard-old`, `dashboard-fnb` — varian.',
    relasiKeModulLain: [{ ke: 'Core data', tipe: 'read', catatan: 'Sumber data sama dengan dashboard utama.' }],
  },
  'promo-voucher': {
    judul: 'Promo & voucher (kampanye)',
    ringkasan: 'Halaman khusus kampanye promo/voucher.',
    nilaiBisnis: 'Mendorong transaksi dengan insentif terukur.',
    persona: 'Marketing: aturan promo. CS: kode tidak jalan.',
    fiturUtama: ['Definisi promo terhubung POS.'],
    halamanTypical: '`promo-voucher.tsx` — kampanye.',
    relasiKeModulLain: [{ ke: 'pos', tipe: 'diskon', catatan: 'Penerapan di checkout.' }],
  },
};

export const DEFAULT_NARASI = {
  judul: 'Modul umum',
  ringkasan:
    'Area ini mendukung fungsi pendukung atau spesifik implementasi. Detail perilaku mengikuti konfigurasi tenant dan peran pengguna.',
  nilaiBisnis: 'Melengkapi ekosistem operasional sesuai kebutuhan segmentasi pelanggan.',
  persona: 'Lihat kolom teknis (halaman/API) untuk scope pasti; hubungi tim produk untuk roadmap.',
  fiturUtama: ['Fitur mengikuti file halaman dan API terdaftar di sheet inventori teknis.'],
  halamanTypical: 'Rujuk sheet Halaman & API untuk daftar lengkap.',
  relasiKeModulLain: [{ ke: 'Lihat Relasi_Modul', tipe: 'referensi', catatan: 'Integrasi umum antar domain.' }],
};

/** Workflow representatif (ID, modul, nama, langkah, aktor, prasyarat, hasil) */
export const WORKFLOWS = [
  {
    id: 'WF-001',
    modul: 'POS + Inventori',
    nama: 'Penjualan ritel dengan pengurangan stok',
    langkah: [
      'Kasir membuka shift (jika wajib di outlet).',
      'Menambah item ke keranjang; sistem cek ketersediaan stok per gudang default cabang.',
      'Menerapkan diskon/promo (jika ada) dan menentukan pelanggan opsional.',
      'Menyelesaikan pembayaran; sistem mencatat transaksi POS.',
      'Stok berkurang sesuai konfigurasi; jurnal pendapatan dapat terbentuk (jika integrasi keuangan aktif).',
      'Struk dicetak/dikirim; shift mencatat saldo kas jika tunai.',
    ],
    aktor: 'Kasir, Supervisor (override), Sistem',
    prasyarat: 'Master produk aktif, stok ≥ 0, shift terbuka (bila policy).',
    hasil: 'Transaksi tercatat, stok terbarui, bukti bayar tersedia.',
  },
  {
    id: 'WF-002',
    modul: 'Pembelian + Inventori',
    nama: 'Dari kebutuhan stok hingga penerimaan barang',
    langkah: [
      'User pembelian membuat PO ke supplier dengan SKU dan kuantitas.',
      'Supplier mengirim; gudang menerima melalui goods receipt.',
      'Stok naik; hutang/us payable tercatat sesuai setup keuangan.',
      'Invoice pembelian direkonsiliasi dengan pembayaran.',
    ],
    aktor: 'Staff gudang, Pembelian, Finance',
    prasyarat: 'Master supplier, produk, dan gudang tujuan.',
    hasil: 'Persediaan akurat dan hutang terlacak.',
  },
  {
    id: 'WF-003',
    modul: 'F&B (Meja + POS + Kitchen)',
    nama: 'Dine-in dari reservasi ke dapur',
    langkah: [
      'Host mencatat reservasi atau walk-in menempati meja.',
      'Kasir membuka order terikat meja/sesi.',
      'Pesanan muncul di kitchen display dengan prioritas.',
      'Dapur mengubah status item; kasir menutup bill.',
    ],
    aktor: 'Host, Kasir, Dapur, Pelanggan',
    prasyarat: 'Layout meja aktif, menu terhubung resep bila perlu.',
    hasil: 'Pengalaman dine-in terkoordinasi, waktu tunggu terukur.',
  },
  {
    id: 'WF-004',
    modul: 'HRIS + Keuangan',
    nama: 'Payroll ke beban periode',
    langkah: [
      'HR menjalankan siklus payroll (absensi, lembur, tunjangan).',
      'Sistem menghitung gaji bersih dan komponen pajak statutory.',
      'Jurnal penggajian dibentuk ke akun beban dan hutang gaji.',
      'Pembayaran gaji menutup hutang tersebut.',
    ],
    aktor: 'HR, Finance',
    prasyarat: 'Data karyawan, skema pajak, periode terbuka.',
    hasil: 'Gaji terbayar, pembukuan konsisten.',
  },
  {
    id: 'WF-005',
    modul: 'Onboarding + Admin',
    nama: 'Aktivasi tenant baru',
    langkah: [
      'Prospek memilih paket dan mengisi data bisnis (onboarding).',
      'Dokumen KYB diunggah untuk verifikasi.',
      'Operator admin menyetujui; modul diaktifkan sesuai paket.',
      'User admin tenant mengisi cabang, pengguna, dan pengaturan toko.',
    ],
    aktor: 'Prospek, Admin platform, Admin tenant',
    prasyarat: 'Paket dan kuota jelas.',
    hasil: 'Tenant siap transaksi dengan fitur sesuai langganan.',
  },
  {
    id: 'WF-006',
    modul: 'Inventori + Keuangan',
    nama: 'Retur pembelian / retur ke supplier',
    langkah: [
      'Identifikasi barang cacat atau kelebihan kirim dari GRN.',
      'Buat dokumen retur dengan referensi batch/PO.',
      'Kurangi stok atau tahan kuantitas sesuai jenis retur.',
      'Jurnal hutang atau nota kredit disesuaikan dengan kebijakan.',
      'Tutup kasus saat barang keluar dari gudang atau kredit memo diterima.',
    ],
    aktor: 'Gudang, Pembelian, Finance',
    prasyarat: 'Policy retur aktif; link ke supplier dan batch.',
    hasil: 'Stok dan hutang selaras dengan kenyataan fisik & komersial.',
  },
];

/** Use case untuk audiens bisnis / CS */
export const USE_CASES = [
  {
    id: 'UC-001',
    modul: 'POS',
    judul: 'Shift kasir harian dengan rekonsiliasi',
    aktor: 'Kasir, Manajer',
    kondisiAwal: 'Outlet beroperasi; perangkat siap; kasir memiliki hak shift.',
    alurUtama:
      'Buka shift → transaksi sepanjang hari → tutup shift → bandingkan saldo harapan vs aktual → tindak lanjut selisih.',
    hasil: 'Audit kas harian dan akuntabilitas per kasir.',
    catatanCS:
      'Jelaskan ke klien: selisih adalah indikator prosedur, bukan selalu bug software.',
  },
  {
    id: 'UC-002',
    modul: 'Inventori',
    judul: 'Stock opname bulanan',
    aktor: 'Supervisor gudang',
    kondisiAwal: 'Daftar SKU disiapkan; akses opname; jadwal ditetapkan.',
    alurUtama:
      'Hitung fisik → masukkan di sistem → bandingkan dengan sistem → posting penyesuaian → investigasi selisih besar.',
    hasil: 'Nilai persediaan akurat untuk laporan keuangan.',
    catatanCS: 'Rekomendasikan SOP freeze transaksi saat opname untuk SKU kritis.',
  },
  {
    id: 'UC-003',
    modul: 'HQ / Laporan',
    judul: 'Review performa multi-cabang mingguan',
    aktor: 'Owner, Regional manager',
    kondisiAwal: 'Data cabang sudah sinkron; periode laporan dipilih.',
    alurUtama:
      'Buka laporan konsolidasi → bandingkan cabang → identifikasi anomali penjualan/stok → tindak lanjut ke manajer cabang.',
    hasil: 'Keputusan taktis berbasis data terpusat.',
    catatanCS: 'Tekankan bahwa definisi “cabang aktif” mengikuti konfigurasi tenant.',
  },
  {
    id: 'UC-004',
    modul: 'Integrasi channel',
    judul: 'Pesanan marketplace masuk ke operasional',
    aktor: 'Staff ops, Kasir',
    kondisiAwal: 'Integrasi marketplace aktif; mapping SKU benar.',
    alurUtama:
      'Pesanan online masuk → konfirmasi/kitchen → pengurangan stok → fulfillment → update status ke pelanggan.',
    hasil: 'Omnichannel tanpa double entry manual.',
    catatanCS: 'Pastikan klien memahami delay sync vs real-time tergantung channel.',
  },
  {
    id: 'UC-005',
    modul: 'Keuangan',
    judul: 'Rekonsiliasi pembayaran harian non-tunai',
    aktor: 'Finance',
    kondisiAwal: 'Laporan gateway/pembayaran tersedia; transaksi POS terekam.',
    alurUtama:
      'Export mutasi → cocokkan dengan settlement harian → selesaikan selisih kecil di jurnal penyesuaian.',
    hasil: 'Kas bank selaras dengan aktivitas penjualan.',
    catatanCS: 'Dokumentasikan cutoff waktu settlement per penyedia pembayaran.',
  },
  {
    id: 'UC-006',
    modul: 'Pelanggan & Loyalty',
    judul: 'Upgrade tier loyalitas setelah pembelian besar',
    aktor: 'Pelanggan, Kasir, Marketing',
    kondisiAwal: 'Program tier aktif; transaksi tercatat dengan identitas pelanggan.',
    alurUtama:
      'Transaksi mencapai ambang poin atau nilai → sistem menaikkan tier → notifikasi ke pelanggan → benefit baru berlaku di transaksi berikutnya.',
    hasil: 'Retensi meningkat; perilaku belanja terukur.',
    catatanCS:
      'Jelaskan ke merchant: aturan tier harus mudah dipahami konsumen akhir untuk menghindari komplain.',
  },
];

/** Relasi antar domain (untuk sheet matrix) */
export const RELASI_ANTAR_MODUL = [
  {
    sumber: 'POS',
    target: 'Inventori',
    jenis: 'Transaksi → stok',
    deskripsiBisnis: 'Setiap penjualan dapat mengurangi stok per lokasi sesuai kebijakan.',
    dataYangBergerak: 'SKU, qty, gudang, cabang, waktu transaksi',
  },
  {
    sumber: 'POS',
    target: 'Keuangan',
    jenis: 'Pendapatan & kas',
    deskripsiBisnis: 'Total transaksi menjadi dasar pencatatan pendapatan dan kas/bank.',
    dataYangBergerak: 'Nilai bruto/neto, metode bayar, pajak, biaya layanan',
  },
  {
    sumber: 'Pembelian / PO',
    target: 'Inventori',
    jenis: 'Masuk barang',
    deskripsiBisnis: 'Penerimaan barang menambah stok dan dapat mencatat hutang.',
    dataYangBergerak: 'PO line, qty diterima, batch (jika ada)',
  },
  {
    sumber: 'HRIS',
    target: 'Keuangan',
    jenis: 'Payroll',
    deskripsiBisnis: 'Penggajian menjadi beban dan hutang gaji hingga dibayar.',
    dataYangBergerak: 'Komponen gaji, pajak pegawai, transfer bank',
  },
  {
    sumber: 'Produk master',
    target: 'POS & Marketplace',
    jenis: 'Katalog',
    deskripsiBisnis: 'Satu master SKU menjaga konsistensi harga dan stok di semua saluran.',
    dataYangBergerak: 'SKU, harga, pajak, status aktif',
  },
  {
    sumber: 'Kitchen',
    target: 'Inventori (BOM)',
    jenis: 'Konsumsi bahan',
    deskripsiBisnis: 'Resep menghubungkan penjualan menu dengan pengurangan bahan baku.',
    dataYangBergerak: 'Resep, yield, waste',
  },
  {
    sumber: 'Fleet / Driver',
    target: 'TMS / Pengiriman',
    jenis: 'Fulfillment',
    deskripsiBisnis: 'Armada mendukung pengiriman barang dari gudang ke pelanggan.',
    dataYangBergerak: 'Order pengiriman, proof of delivery, biaya bahan bakar',
  },
  {
    sumber: 'Billing SaaS',
    target: 'Admin platform',
    jenis: 'Langganan',
    deskripsiBisnis: 'Merchant membayar paket Bedagang; fitur dibuka sesuai entitlement.',
    dataYangBergerak: 'Paket, kuota, status invoice SaaS',
  },
];

export const GLOSARIUM = [
  ['Tenant', 'Pelanggan software (perusahaan merchant) yang memiliki data terisolasi.'],
  ['Cabang / Branch', 'Outlet atau entitas operasional di bawah satu tenant.'],
  ['SKU', 'Unit jual terkecil yang di-track (bisa varian produk).'],
  ['Shift kasir', 'Periode kerja kasir dengan saldo awal/akhir untuk audit.'],
  ['Goods Receipt (GRN)', 'Pencatatan penerimaan fisik barang dari pembelian.'],
  ['BOM', 'Bill of Materials — resep komposisi bahan untuk produk jadi.'],
  ['KYB', 'Know Your Business — verifikasi legalitas bisnis untuk aktivasi.'],
  ['Entitlement', 'Hak fitur yang diizinkan oleh paket langganan.'],
  ['Omnichannel', 'Penjualan melalui banyak kanal dengan inventori terpadu.'],
];

/** Folder komponen yang bersifat infrastruktur UI, bukan “modul bisnis” tersendiri */
const SEGMEN_KOMPONEN_TEKNIS = new Set([
  'ui',
  'common',
  'layouts',
  'providers',
  'guards',
  'errorBoundary',
  'shared',
  'landing',
  'sidebar',
  'documents',
  'dashboards',
  'debug',
  'permissions',
  'packages',
  'notifications',
  'system',
  'tenant',
  'upload',
  'websocket',
  'health',
  'frontend',
  'cart',
  'business',
  'seed',
  'integration',
  'integrations',
  'modules',
]);

/** Narasi untuk sub-folder komponen yang memetakan ke domain produk (bukan halaman top-level) */
export const NARASI_SUB_KOMPONEN = {
  fleet: {
    judul: 'Komponen Fleet & armada',
    ringkasan:
      'Antarmuka untuk pelacakan kendaraan, driver, bahan bakar, dan KPI logistik — biasanya dipakai bersama modul HQ Fleet.',
    nilaiBisnis: 'Visibilitas operasional lapangan dan biaya angkut.',
    persona: 'Manajer logistik, CS (pertanyaan pengiriman), UX (peta & status).',
    fiturUtama: ['Peta/tracking, form driver, konsumsi BBM.'],
    halamanTypical: 'Terhubung ke halaman di `hq/fleet/*` untuk pengalaman utuh.',
    relasiKeModulLain: [
      { ke: 'HQ Fleet', tipe: 'domain', catatan: 'Data master kendaraan di backend.' },
      { ke: 'TMS', tipe: 'ops', catatan: 'Pengiriman dan proof of delivery.' },
    ],
  },
  sfa: {
    judul: 'Komponen Sales Force Automation',
    ringkasan: 'Kunjungan lapangan, pipeline penjualan, kuota — mendukung tim sales.',
    nilaiBisnis: 'Produktivitas sales dan akuntabilitas kunjungan.',
    persona: 'Sales manager, tim CS (komisi), UX mobile-first.',
    fiturUtama: ['Jadwal kunjungan, order lapangan, target.'],
    halamanTypical: 'Berkelindan dengan `hq/sfa/*`.',
    relasiKeModulLain: [
      { ke: 'CRM / Pelanggan', tipe: 'data', catatan: 'Prospek dan pelanggan.' },
    ],
  },
  hr: {
    judul: 'Komponen SDM / HR',
    ringkasan: 'Form dan tabel untuk data karyawan, cuti, absensi — menyatu dengan HRIS HQ.',
    nilaiBisnis: 'Satu pengalaman data SDM konsisten.',
    persona: 'HR, manajer, auditor internal.',
    fiturUtama: ['Widget kehadiran, formulir cuti, direktori karyawan.'],
    halamanTypical: 'Halaman utama di `hq/hris/*`.',
    relasiKeModulLain: [{ ke: 'HRIS', tipe: 'master', catatan: 'Employee & payroll.' }],
  },
  website: {
    judul: 'Komponen website builder',
    ringkasan: 'Editor blok dan pratinjau situs toko online tenant.',
    nilaiBisnis: 'Channel digital tanpa tim dev terpisah.',
    persona: 'Marketing, UX konten, CS onboarding.',
    fiturUtama: ['Section builder, tema, publikasi.'],
    halamanTypical: '`hq/website-builder/*`.',
    relasiKeModulLain: [{ ke: 'Produk', tipe: 'katalog', catatan: 'Menampilkan SKU dari master.' }],
  },
  warehouses: {
    judul: 'Komponen gudang',
    ringkasan: 'Selector gudang, kartu stok, indikator kapasitas.',
    nilaiBisnis: 'Operasional gudang yang jelas per lokasi.',
    persona: 'Staff gudang, inventory controller.',
    fiturUtama: ['Visualisasi lokasi & stok.'],
    halamanTypical: 'Inventori & HQ inventory.',
    relasiKeModulLain: [{ ke: 'Inventori', tipe: 'data', catatan: 'Warehouse & stock tables.' }],
  },
  recipes: {
    judul: 'Komponen resep / BOM',
    ringkasan: 'Editor resep untuk F&B atau manufaktur ringan.',
    nilaiBisnis: 'HPP akurat dan konsistensi resep.',
    persona: 'Chef, cost controller, UX form kompleks.',
    fiturUtama: ['Bahan baku, yield, substitusi.'],
    halamanTypical: '`inventory/recipes`, `kitchen/recipes`.',
    relasiKeModulLain: [{ ke: 'POS / Kitchen', tipe: 'aliran', catatan: 'Konsumsi bahan saat penjualan.' }],
  },
  production: {
    judul: 'Komponen produksi',
    ringkasan: 'Alur work order, waste, history produksi.',
    nilaiBisnis: 'Efisiensi shop floor dan waste tracking.',
    persona: 'Produksi, QA, finance (HPP).',
    fiturUtama: ['Order produksi, pencatatan waste.'],
    halamanTypical: '`inventory/production/*`.',
    relasiKeModulLain: [{ ke: 'Manufaktur / Inventori', tipe: 'stok', catatan: 'Bahan & barang jadi.' }],
  },
  promos: {
    judul: 'Komponen promosi',
    ringkasan: 'Kartu promo, aturan diskon, banner kampanye.',
    nilaiBisnis: 'Kampanye terukur di kasir dan channel.',
    persona: 'Marketing, kasir (validasi), CS (komplain promo).',
    fiturUtama: ['Rule engine UI untuk promo.'],
    halamanTypical: 'Terhubung definisi promo & POS.',
    relasiKeModulLain: [{ ke: 'POS', tipe: 'harga', catatan: 'Diskon di checkout.' }],
  },
  purchase: {
    judul: 'Komponen pembelian',
    ringkasan: 'Form PO, approval, status pengiriman.',
    nilaiBisnis: 'Kontrol pengeluaran dan lead time.',
    persona: 'Procurement, gudang, AP finance.',
    fiturUtama: ['Line item PO, lampiran, status.'],
    halamanTypical: 'Inventori & procurement.',
    relasiKeModulLain: [{ ke: 'Supplier & GRN', tipe: 'aliran', catatan: 'Masuk stok.' }],
  },
  suppliers: {
    judul: 'Komponen pemasok',
    ringkasan: 'Profil vendor, rating, kontak pembelian.',
    nilaiBisnis: 'Hubungan pemasok terpusat.',
    persona: 'Procurement, QA incoming.',
    fiturUtama: ['Master supplier, dokumen kontrak.'],
    halamanTypical: '`hq/suppliers`, pembelian.',
    relasiKeModulLain: [{ ke: 'PO', tipe: 'referensi', catatan: 'Setiap PO mengacu supplier.' }],
  },
  incidents: {
    judul: 'Komponen insiden / tiket operasional',
    ringkasan: 'Pelacakan gangguan atau eskalasi internal.',
    nilaiBisnis: 'Resolusi cepat isu operasional.',
    persona: 'CS, IT support, manajemen outlet.',
    fiturUtama: ['Status insiden, assignment.'],
    halamanTypical: 'API incidents bila ada.',
    relasiKeModulLain: [{ ke: 'Audit & notifikasi', tipe: 'sistem', catatan: 'Dapat memicu alert.' }],
  },
  shipments: {
    judul: 'Komponen pengiriman',
    ringkasan: 'Status kirim, label, tracking number.',
    nilaiBisnis: 'Transparansi fulfillment ke pelanggan akhir.',
    persona: 'Logistik, CS pelanggan.',
    fiturUtama: ['Integrasi kurir, status paket.'],
    halamanTypical: 'TMS / marketplace orders.',
    relasiKeModulLain: [{ ke: 'TMS', tipe: 'tracking', catatan: 'Event pengiriman.' }],
  },
  webhooks: {
    judul: 'Komponen & konfigurasi webhook',
    ringkasan: 'Endpoint outbound untuk integrasi sistem eksternal.',
    nilaiBisnis: 'Otomasi tanpa UI manual.',
    persona: 'IT integrator, developer mitra.',
    fiturUtama: ['Registrasi URL, retry, secret.'],
    halamanTypical: 'Settings integrasi.',
    relasiKeModulLain: [{ ke: 'Semua domain', tipe: 'event', catatan: 'Event bisnis ke sistem lain.' }],
  },
  waste: {
    judul: 'Komponen pencatatan waste',
    ringkasan: 'Buang / rusak / expired untuk kurangi selisih stok tak jelas.',
    nilaiBisnis: 'Margin dan sustainability insight.',
    persona: 'Gudang, sustainability lead.',
    fiturUtama: ['Alasan waste, kuantitas, foto opsional.'],
    halamanTypical: 'Produksi / inventory.',
    relasiKeModulLain: [{ ke: 'Inventori', tipe: 'keluar', catatan: 'Penyesuaian stok.' }],
  },
  branches: {
    judul: 'Komponen cabang',
    ringkasan: 'Pemilih cabang, kartu outlet, perbandingan performa.',
    nilaiBisnis: 'Multi-outlet governance.',
    persona: 'Owner, regional manager, UX konsistensi switch cabang.',
    fiturUtama: ['Konteks cabang aktif di seluruh app.'],
    halamanTypical: 'Header global & admin.',
    relasiKeModulLain: [{ ke: 'Core branch', tipe: 'data', catatan: 'Isolasi data per cabang.' }],
  },
  projectManagement: {
    judul: 'Komponen manajemen proyek',
    ringkasan: 'Gantt ringan, tugas, milestone untuk inisiatif internal.',
    nilaiBisnis: 'Proyek rollout toko / IT terjadwal.',
    persona: 'PMO, IT project, konsultan implementasi.',
    fiturUtama: ['Task, dependency, status.'],
    halamanTypical: '`hq/project-management/*`.',
    relasiKeModulLain: [{ ke: 'HRIS', tipe: 'sumber daya', catatan: 'Assignee dari master karyawan.' }],
  },
  requisitions: {
    judul: 'Komponen permintaan internal',
    ringkasan: 'Permintaan barang antar departemen sebelum PO.',
    nilaiBisnis: 'Kontrol pembelian tidak langsung.',
    persona: 'Store requester, approver, procurement.',
    fiturUtama: ['Alur approve permintaan.'],
    halamanTypical: '`hq/requisitions`.',
    relasiKeModulLain: [{ ke: 'Procurement', tipe: 'aliran', catatan: 'Menjadi PO.' }],
  },
};

const NARASI_KOMPONEN_BERSAMA = {
  judul: 'Pustaka komponen & infrastruktur UI',
  ringkasan:
    'Tombol, layout, provider konteks, guard rute, dan utilitas desain sistem. Bukan “fitur bisnis” yang dijual terpisah melainkan fondasi agar modul POS, HRIS, dll. konsisten dan dapat diakses (a11y).',
  nilaiBisnis:
    'Mempercepat pengembangan fitur baru, menjaga merek & usability, dan mengurangi bug tampilan lintas modul.',
  persona:
    'UX/UI: design system & pola interaksi. Engineering: reusability. CS: perilaku konsisten di seluruh app.',
  fiturUtama: [
    'Komponen dasar (input, modal, tabel) dan pola navigasi.',
    'Provider i18n, tema, dan sesi pengguna.',
    'Guard dan error boundary untuk pengalaman aman saat gagal API.',
  ],
  halamanTypical: 'Tidak ada halaman sendiri; dipakai oleh seluruh `pages/`.',
  relasiKeModulLain: [
    { ke: 'Semua modul UI', tipe: 'foundation', catatan: 'Setiap layar mengkomposisi komponen ini.' },
  ],
};

/**
 * @param {string} seg
 * @returns {typeof DEFAULT_NARASI & { id: string }}
 */
export function getNarasiSegmen(seg) {
  const key = seg === '(root)' ? '' : seg;
  const explicit = NARASI_SEGMEN[key];
  if (explicit) return { id: key || 'root', ...explicit };

  if (SEGMEN_KOMPONEN_TEKNIS.has(key)) {
    return { id: key || 'root', ...NARASI_KOMPONEN_BERSAMA, judul: `${NARASI_KOMPONEN_BERSAMA.judul} (${key})` };
  }

  const subAliases = { 'website-builder': 'website', 'purchase-order': 'purchase' };
  const subKey = subAliases[key] || key;
  const sub = NARASI_SUB_KOMPONEN[subKey];
  if (sub) return { id: key || 'root', ...sub };

  return { id: key || 'root', ...DEFAULT_NARASI, judul: `${DEFAULT_NARASI.judul} (${key || 'root'})` };
}
