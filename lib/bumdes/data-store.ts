/**
 * BUM Desa data store (in-memory mock)
 *
 * Berbasis Kepmendesa No. 136 Tahun 2022 - Standar Akuntansi BUM Desa /
 * BUM Desa Bersama. Modul ini menyediakan struktur data lengkap (Profil,
 * Tata Kelola, Unit Usaha, Modal, CoA, Jurnal, Simpan Pinjam, Pembagian
 * Hasil) dan helper untuk menghitung Buku Besar, Neraca Saldo, dan
 * 5 Laporan Keuangan pokok (Neraca, L/R, Perubahan Ekuitas, Arus Kas,
 * CALK).
 *
 * Diisi dengan dataset mock realistis sehingga semua halaman BUM Desa
 * dan report generator dapat berjalan tanpa konfigurasi backend awal.
 * Pada implementasi produksi, store ini dapat diganti dengan adapter
 * Sequelize / Prisma tanpa mengubah signature fungsi publik.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type AkunKlasifikasi = 'aset' | 'liabilitas' | 'ekuitas' | 'pendapatan' | 'beban' | 'beban_lain';
export type SaldoNormal = 'debit' | 'kredit';

export interface AkunCoA {
  kode: string;
  nama: string;
  klasifikasi: AkunKlasifikasi;
  saldoNormal: SaldoNormal;
  parent?: string;
  isHeader?: boolean;
  saldoAwal?: number; // saldo awal periode (positif)
}

export interface JurnalLine {
  akun: string;        // kode akun
  debit: number;
  kredit: number;
  unitId?: string;
}

export interface JurnalEntry {
  id: string;
  nomor: string;
  tanggal: string;       // ISO date
  keterangan: string;
  dokumen?: string;
  unitId?: string;
  posted: boolean;
  lines: JurnalLine[];
}

export interface ProfilBumdes {
  nama: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kodePos: string;
  alamat: string;
  telepon: string;
  email: string;
  website: string;
  tahunPendirian: number;
  klasifikasi: 'dasar' | 'tumbuh' | 'berkembang' | 'maju' | 'mandiri';
  nib: string;
  npwp: string;
  skMenkumham: string;
  aktaNomor: string;
  aktaTanggal: string;
  notaris: string;
  perdesNomor: string;
  perdesTanggal: string;
  visi: string;
  misi: string[];
  tujuan: string[];
}

export interface MusdesRecord {
  id: string;
  jenis: 'pendirian' | 'tahunan' | 'luar_biasa' | 'rkat' | 'lpj' | 'pembagian_laba';
  tanggal: string;
  tempat: string;
  peserta: number;
  notulen: string;
  keputusan: string;
  beritaAcara?: string;
}

export interface PengurusRecord {
  id: string;
  jabatan: 'penasihat' | 'ketua_pengawas' | 'anggota_pengawas' | 'direktur' | 'sekretaris' | 'bendahara' | 'manajer_unit' | 'staf_admin';
  nama: string;
  nik: string;
  tempatLahir: string;
  tglLahir: string;
  pendidikan: string;
  skNomor: string;
  mulaiMenjabat: string;
  akhirMenjabat: string;
  unitId?: string;
}

export interface UnitUsaha {
  id: string;
  nama: string;
  jenis: 'serving' | 'banking' | 'renting' | 'brokering' | 'trading' | 'producing' | 'contracting' | 'holding';
  kategori: string;
  managerId?: string;
  modalAwal: number;
  tglOperasional: string;
  lokasi: string;
  karyawan: number;
  omsetYtd: number;
  labaYtd: number;
  kontribusiBumdes: number;
  status: 'perencanaan' | 'rintisan' | 'beroperasi' | 'ekspansi' | 'dihentikan';
  bumdesma: boolean;
}

export interface PenyertaanModal {
  id: string;
  sumber: 'dana_desa' | 'add' | 'padesa' | 'masyarakat' | 'hibah' | 'bansos' | 'bumdesma';
  nominal: number;
  tahun: number;
  perdesNomor?: string;
  bukti?: string;
  tanggal: string;
  penyertaName?: string; // untuk masyarakat
  nik?: string;
}

export interface AnggotaUSP {
  id: string;
  nomor: string;
  nik: string;
  nama: string;
  alamat: string;
  telepon: string;
  pekerjaan: string;
  tglDaftar: string;
  status: 'aktif' | 'nonaktif';
}

export interface SimpananRecord {
  id: string;
  anggotaId: string;
  jenis: 'pokok' | 'wajib' | 'sukarela' | 'berjangka';
  setoran: number;
  penarikan: number;
  saldo: number;
  tanggal: string;
}

export interface KreditRecord {
  id: string;
  nomor: string;
  anggotaId: string;
  plafon: number;
  tenor: number;        // bulan
  sukuBunga: number;    // % per tahun
  jenisBunga: 'flat' | 'efektif' | 'anuitas';
  tujuan: string;
  agunan: string;
  tglPencairan: string;
  status: 'permohonan' | 'analisa' | 'disetujui' | 'dicairkan' | 'lancar' | 'dpk' | 'kurang_lancar' | 'diragukan' | 'macet' | 'lunas';
  outstanding: number;
}

export interface PembagianHasilUsaha {
  tahun: number;
  labaBersih: number;
  alokasi: {
    padesa: number;          // %
    cadanganUmum: number;
    cadanganTujuan: number;
    bonusPengelola: number;
    bonusKaryawan: number;
    danaSosial: number;
    danaPendidikan: number;
    bagiHasilPenyerta: number;
  };
  approvedAt?: string;
  baNomor?: string;
  executedAt?: string;
}

export interface LaporanRecord {
  id: string;
  jenis:
    | 'lpj_pelaksana'
    | 'lpj_semester'
    | 'laporan_pengawas'
    | 'laporan_penasihat'
    | 'rkat'
    | 'laporan_kemendesa'
    | 'laporan_bpd'
    | 'laporan_kepala_desa'
    | 'laporan_provinsi'
    | 'laporan_kabupaten';
  judul: string;
  periode: string;
  tahun: number;
  tanggal: string;
  status: 'draft' | 'review' | 'finalisasi' | 'submitted' | 'diterima' | 'ditolak';
  diajukanOleh: string;
  diterimaOleh?: string;
  fileUrl?: string;
}

// ─── Mock Data Builder ──────────────────────────────────────────────────────

const PROFIL: ProfilBumdes = {
  nama: 'BUM Desa Sumber Makmur',
  desa: 'Sumber Makmur',
  kecamatan: 'Karangrejo',
  kabupaten: 'Tulungagung',
  provinsi: 'Jawa Timur',
  kodePos: '66253',
  alamat: 'Jl. Raya Sumber Makmur No. 12, Karangrejo, Tulungagung',
  telepon: '(0355) 555-0123',
  email: 'bumdes.sumbermakmur@desa.id',
  website: 'https://bumdes-sumbermakmur.desa.id',
  tahunPendirian: 2018,
  klasifikasi: 'maju',
  nib: '0123456789012',
  npwp: '01.234.567.8-901.000',
  skMenkumham: 'AHU-0012345.AH.01.01.TAHUN.2022',
  aktaNomor: '15',
  aktaTanggal: '2018-04-12',
  notaris: 'Drs. Budi Santoso, S.H., M.Kn.',
  perdesNomor: '03/PERDES/SM/2018',
  perdesTanggal: '2018-03-25',
  visi: 'Menjadi pilar ekonomi desa yang mandiri, inovatif, dan berkelanjutan untuk kesejahteraan masyarakat Desa Sumber Makmur.',
  misi: [
    'Mengelola potensi ekonomi desa secara profesional dan transparan.',
    'Menyediakan layanan keuangan mikro yang terjangkau bagi masyarakat.',
    'Mengembangkan unit usaha yang ramah lingkungan dan berdaya saing.',
    'Meningkatkan kontribusi terhadap Pendapatan Asli Desa (PADesa).',
  ],
  tujuan: [
    'Meningkatkan perekonomian dan kesejahteraan masyarakat desa.',
    'Mengoptimalkan aset desa agar bermanfaat untuk kesejahteraan desa.',
    'Mengembangkan rencana kerja sama usaha antardesa dan/atau dengan pihak ketiga.',
    'Membuka lapangan kerja dan memberikan pelayanan umum kepada masyarakat.',
  ],
};

const MUSDES: MusdesRecord[] = [
  { id: 'm1', jenis: 'pendirian', tanggal: '2018-03-20', tempat: 'Balai Desa Sumber Makmur', peserta: 87, notulen: 'Pendirian BUM Desa & pemilihan pengurus.', keputusan: 'Disetujui pendirian BUM Desa Sumber Makmur dengan modal awal Rp 250jt dari Dana Desa.' },
  { id: 'm2', jenis: 'tahunan', tanggal: '2026-02-15', tempat: 'Balai Desa', peserta: 120, notulen: 'Penyampaian LPJ Tahun 2025.', keputusan: 'LPJ Tahun 2025 diterima dengan catatan.' },
  { id: 'm3', jenis: 'rkat', tanggal: '2026-01-20', tempat: 'Balai Desa', peserta: 95, notulen: 'Pembahasan Rencana Kerja & Anggaran 2026.', keputusan: 'RKAT 2026 disetujui dengan target laba Rp 450jt.' },
  { id: 'm4', jenis: 'pembagian_laba', tanggal: '2026-03-05', tempat: 'Balai Desa', peserta: 110, notulen: 'Pembagian Hasil Usaha 2025.', keputusan: 'Pembagian hasil 2025: PADesa 30%, Cadangan 25%, Bonus 20%, Sosial 10%, Pendidikan 5%, Penyerta 10%.' },
];

const PENGURUS: PengurusRecord[] = [
  { id: 'p1', jabatan: 'penasihat', nama: 'H. Sutrisno, S.Pd.', nik: '3504121502700001', tempatLahir: 'Tulungagung', tglLahir: '1970-02-15', pendidikan: 'S1', skNomor: 'SK Kades No. 01/2024', mulaiMenjabat: '2024-04-01', akhirMenjabat: '2030-03-31' },
  { id: 'p2', jabatan: 'ketua_pengawas', nama: 'Drs. Imam Wahyudi', nik: '3504122003650002', tempatLahir: 'Kediri', tglLahir: '1965-03-20', pendidikan: 'S1', skNomor: 'SK Kades No. 02/2024', mulaiMenjabat: '2024-04-01', akhirMenjabat: '2027-03-31' },
  { id: 'p3', jabatan: 'anggota_pengawas', nama: 'Siti Aminah, S.E.', nik: '3504125707720003', tempatLahir: 'Tulungagung', tglLahir: '1972-07-17', pendidikan: 'S1 Akuntansi', skNomor: 'SK Kades No. 02/2024', mulaiMenjabat: '2024-04-01', akhirMenjabat: '2027-03-31' },
  { id: 'p4', jabatan: 'direktur', nama: 'Andi Pranoto, S.E., M.M.', nik: '3504121008820004', tempatLahir: 'Tulungagung', tglLahir: '1982-08-10', pendidikan: 'S2 Manajemen', skNomor: 'SK Kades No. 03/2024', mulaiMenjabat: '2024-04-01', akhirMenjabat: '2029-03-31' },
  { id: 'p5', jabatan: 'sekretaris', nama: 'Lestari Wulandari, S.Sos.', nik: '3504124306900005', tempatLahir: 'Tulungagung', tglLahir: '1990-06-03', pendidikan: 'S1 Sosial', skNomor: 'SK Direktur No. 04/2024', mulaiMenjabat: '2024-05-01', akhirMenjabat: '2029-04-30' },
  { id: 'p6', jabatan: 'bendahara', nama: 'Rini Setyawati, S.Ak.', nik: '3504122509880006', tempatLahir: 'Blitar', tglLahir: '1988-09-25', pendidikan: 'S1 Akuntansi', skNomor: 'SK Direktur No. 05/2024', mulaiMenjabat: '2024-05-01', akhirMenjabat: '2029-04-30' },
  { id: 'p7', jabatan: 'manajer_unit', nama: 'Budi Hartono', nik: '3504121204850007', tempatLahir: 'Tulungagung', tglLahir: '1985-04-12', pendidikan: 'D3', skNomor: 'SK Direktur No. 06/2024', mulaiMenjabat: '2024-05-01', akhirMenjabat: '2027-04-30', unitId: 'u1' },
  { id: 'p8', jabatan: 'manajer_unit', nama: 'Endang Susilowati', nik: '3504126011830008', tempatLahir: 'Tulungagung', tglLahir: '1983-11-20', pendidikan: 'S1', skNomor: 'SK Direktur No. 07/2024', mulaiMenjabat: '2024-05-01', akhirMenjabat: '2027-04-30', unitId: 'u2' },
];

const UNITS: UnitUsaha[] = [
  { id: 'u1', nama: 'Mart Desa Sumber Makmur', jenis: 'trading', kategori: 'Perdagangan & Retail', managerId: 'p7', modalAwal: 75_000_000, tglOperasional: '2018-08-01', lokasi: 'Pasar Desa', karyawan: 5, omsetYtd: 685_000_000, labaYtd: 102_000_000, kontribusiBumdes: 32_000_000, status: 'beroperasi', bumdesma: false },
  { id: 'u2', nama: 'Unit Simpan Pinjam Sumber Mulia', jenis: 'banking', kategori: 'Keuangan Mikro', managerId: 'p8', modalAwal: 100_000_000, tglOperasional: '2019-02-15', lokasi: 'Kantor BUM Desa', karyawan: 4, omsetYtd: 245_000_000, labaYtd: 78_000_000, kontribusiBumdes: 24_000_000, status: 'beroperasi', bumdesma: false },
  { id: 'u3', nama: 'Wisata Embung Sumber Makmur', jenis: 'serving', kategori: 'Pariwisata Desa', modalAwal: 120_000_000, tglOperasional: '2020-06-10', lokasi: 'Embung Desa', karyawan: 8, omsetYtd: 312_000_000, labaYtd: 95_000_000, kontribusiBumdes: 28_500_000, status: 'beroperasi', bumdesma: false },
  { id: 'u4', nama: 'Penyewaan Alat Pertanian', jenis: 'renting', kategori: 'Pertanian & Perikanan', modalAwal: 90_000_000, tglOperasional: '2021-03-01', lokasi: 'Gudang BUM Desa', karyawan: 3, omsetYtd: 168_000_000, labaYtd: 52_000_000, kontribusiBumdes: 15_500_000, status: 'beroperasi', bumdesma: false },
  { id: 'u5', nama: 'Pengelolaan Air Bersih PamDes', jenis: 'serving', kategori: 'Pengelolaan Air Bersih', modalAwal: 180_000_000, tglOperasional: '2022-01-15', lokasi: 'Sumur Bor Desa', karyawan: 4, omsetYtd: 156_000_000, labaYtd: 41_000_000, kontribusiBumdes: 12_000_000, status: 'beroperasi', bumdesma: false },
  { id: 'u6', nama: 'Bank Sampah Hijau Desa', jenis: 'producing', kategori: 'Pengelolaan Sampah', modalAwal: 45_000_000, tglOperasional: '2023-08-20', lokasi: 'TPS Desa', karyawan: 3, omsetYtd: 38_000_000, labaYtd: 8_500_000, kontribusiBumdes: 2_500_000, status: 'rintisan', bumdesma: false },
  { id: 'u7', nama: 'BUMDes Bersama Karangrejo Sejahtera', jenis: 'holding', kategori: 'Ekonomi Digital', modalAwal: 250_000_000, tglOperasional: '2024-09-01', lokasi: 'Kecamatan Karangrejo', karyawan: 6, omsetYtd: 198_000_000, labaYtd: 45_000_000, kontribusiBumdes: 13_500_000, status: 'ekspansi', bumdesma: true },
];

const PENYERTAAN: PenyertaanModal[] = [
  { id: 'pm1', sumber: 'dana_desa', nominal: 250_000_000, tahun: 2018, perdesNomor: '03/PERDES/SM/2018', tanggal: '2018-04-15', bukti: 'Transfer DD-2018-001' },
  { id: 'pm2', sumber: 'dana_desa', nominal: 150_000_000, tahun: 2019, perdesNomor: '05/PERDES/SM/2019', tanggal: '2019-03-20', bukti: 'Transfer DD-2019-007' },
  { id: 'pm3', sumber: 'dana_desa', nominal: 200_000_000, tahun: 2020, perdesNomor: '02/PERDES/SM/2020', tanggal: '2020-02-10', bukti: 'Transfer DD-2020-004' },
  { id: 'pm4', sumber: 'masyarakat', nominal: 5_000_000, tahun: 2021, tanggal: '2021-05-12', penyertaName: 'Pak Slamet', nik: '3504121205700020' },
  { id: 'pm5', sumber: 'masyarakat', nominal: 10_000_000, tahun: 2021, tanggal: '2021-06-18', penyertaName: 'Bu Yanti', nik: '3504126205720021' },
  { id: 'pm6', sumber: 'masyarakat', nominal: 7_500_000, tahun: 2022, tanggal: '2022-03-04', penyertaName: 'Pak Heri', nik: '3504121103780022' },
  { id: 'pm7', sumber: 'add', nominal: 100_000_000, tahun: 2022, perdesNomor: '08/PERDES/SM/2022', tanggal: '2022-04-25', bukti: 'Transfer ADD-2022-003' },
  { id: 'pm8', sumber: 'padesa', nominal: 75_000_000, tahun: 2023, tanggal: '2023-12-30', bukti: 'Setoran Laba 2022' },
  { id: 'pm9', sumber: 'hibah', nominal: 50_000_000, tahun: 2023, tanggal: '2023-09-10', bukti: 'Hibah CSR Bank Jatim' },
  { id: 'pm10', sumber: 'bumdesma', nominal: 125_000_000, tahun: 2024, tanggal: '2024-08-15', bukti: 'Penyertaan BUMDesma Karangrejo' },
];

// ─── Chart of Accounts (CoA) standar BUM Desa ───────────────────────────────
// Mengikuti Lampiran Kepmendesa No. 136 Tahun 2022
const COA: AkunCoA[] = [
  // ASET (1xxx)
  { kode: '1000', nama: 'ASET', klasifikasi: 'aset', saldoNormal: 'debit', isHeader: true },
  { kode: '1100', nama: 'Aset Lancar', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1000', isHeader: true },
  { kode: '1101', nama: 'Kas di Bendahara', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1100', saldoAwal: 25_000_000 },
  { kode: '1102', nama: 'Kas di Bank', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1100', saldoAwal: 175_000_000 },
  { kode: '1103', nama: 'Kas Kecil Unit Mart', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1100', saldoAwal: 5_000_000 },
  { kode: '1110', nama: 'Piutang Usaha', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1100', saldoAwal: 45_000_000 },
  { kode: '1115', nama: 'Piutang Anggota Simpan Pinjam', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1100', saldoAwal: 320_000_000 },
  { kode: '1120', nama: 'Persediaan Barang Dagang', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1100', saldoAwal: 85_000_000 },
  { kode: '1125', nama: 'Persediaan Bahan Baku', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1100', saldoAwal: 12_000_000 },
  { kode: '1130', nama: 'Biaya Dibayar di Muka', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1100', saldoAwal: 8_000_000 },
  { kode: '1200', nama: 'Aset Tetap', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1000', isHeader: true },
  { kode: '1210', nama: 'Tanah', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1200', saldoAwal: 250_000_000 },
  { kode: '1220', nama: 'Bangunan', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1200', saldoAwal: 380_000_000 },
  { kode: '1221', nama: 'Akumulasi Penyusutan Bangunan', klasifikasi: 'aset', saldoNormal: 'kredit', parent: '1200', saldoAwal: -76_000_000 },
  { kode: '1230', nama: 'Peralatan & Mesin', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1200', saldoAwal: 145_000_000 },
  { kode: '1231', nama: 'Akumulasi Penyusutan Peralatan', klasifikasi: 'aset', saldoNormal: 'kredit', parent: '1200', saldoAwal: -58_000_000 },
  { kode: '1240', nama: 'Kendaraan Operasional', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1200', saldoAwal: 95_000_000 },
  { kode: '1241', nama: 'Akumulasi Penyusutan Kendaraan', klasifikasi: 'aset', saldoNormal: 'kredit', parent: '1200', saldoAwal: -28_500_000 },
  { kode: '1300', nama: 'Aset Lainnya', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1000', isHeader: true },
  { kode: '1310', nama: 'Investasi pada BUMDes Bersama', klasifikasi: 'aset', saldoNormal: 'debit', parent: '1300', saldoAwal: 125_000_000 },

  // LIABILITAS (2xxx)
  { kode: '2000', nama: 'LIABILITAS', klasifikasi: 'liabilitas', saldoNormal: 'kredit', isHeader: true },
  { kode: '2100', nama: 'Liabilitas Jangka Pendek', klasifikasi: 'liabilitas', saldoNormal: 'kredit', parent: '2000', isHeader: true },
  { kode: '2101', nama: 'Utang Usaha', klasifikasi: 'liabilitas', saldoNormal: 'kredit', parent: '2100', saldoAwal: 35_000_000 },
  { kode: '2102', nama: 'Utang Pajak', klasifikasi: 'liabilitas', saldoNormal: 'kredit', parent: '2100', saldoAwal: 8_500_000 },
  { kode: '2103', nama: 'Beban Yang Masih Harus Dibayar', klasifikasi: 'liabilitas', saldoNormal: 'kredit', parent: '2100', saldoAwal: 12_000_000 },
  { kode: '2110', nama: 'Simpanan Sukarela Anggota', klasifikasi: 'liabilitas', saldoNormal: 'kredit', parent: '2100', saldoAwal: 95_000_000 },
  { kode: '2111', nama: 'Simpanan Berjangka', klasifikasi: 'liabilitas', saldoNormal: 'kredit', parent: '2100', saldoAwal: 145_000_000 },
  { kode: '2200', nama: 'Liabilitas Jangka Panjang', klasifikasi: 'liabilitas', saldoNormal: 'kredit', parent: '2000', isHeader: true },
  { kode: '2210', nama: 'Utang Bank Jangka Panjang', klasifikasi: 'liabilitas', saldoNormal: 'kredit', parent: '2200', saldoAwal: 150_000_000 },

  // EKUITAS (3xxx)
  { kode: '3000', nama: 'EKUITAS', klasifikasi: 'ekuitas', saldoNormal: 'kredit', isHeader: true },
  { kode: '3101', nama: 'Modal Penyertaan Desa', klasifikasi: 'ekuitas', saldoNormal: 'kredit', parent: '3000', saldoAwal: 700_000_000 },
  { kode: '3102', nama: 'Modal Penyertaan Masyarakat', klasifikasi: 'ekuitas', saldoNormal: 'kredit', parent: '3000', saldoAwal: 22_500_000 },
  { kode: '3103', nama: 'Modal Penyertaan BUMDes Bersama', klasifikasi: 'ekuitas', saldoNormal: 'kredit', parent: '3000', saldoAwal: 125_000_000 },
  { kode: '3104', nama: 'Modal Hibah', klasifikasi: 'ekuitas', saldoNormal: 'kredit', parent: '3000', saldoAwal: 50_000_000 },
  { kode: '3201', nama: 'Cadangan Umum', klasifikasi: 'ekuitas', saldoNormal: 'kredit', parent: '3000', saldoAwal: 85_000_000 },
  { kode: '3202', nama: 'Cadangan Tujuan', klasifikasi: 'ekuitas', saldoNormal: 'kredit', parent: '3000', saldoAwal: 45_000_000 },
  { kode: '3301', nama: 'Laba Ditahan', klasifikasi: 'ekuitas', saldoNormal: 'kredit', parent: '3000', saldoAwal: 92_000_000 },

  // PENDAPATAN (4xxx)
  { kode: '4000', nama: 'PENDAPATAN', klasifikasi: 'pendapatan', saldoNormal: 'kredit', isHeader: true },
  { kode: '4101', nama: 'Pendapatan Unit Mart Desa', klasifikasi: 'pendapatan', saldoNormal: 'kredit', parent: '4000' },
  { kode: '4102', nama: 'Pendapatan Bunga Simpan Pinjam', klasifikasi: 'pendapatan', saldoNormal: 'kredit', parent: '4000' },
  { kode: '4103', nama: 'Pendapatan Tiket Wisata', klasifikasi: 'pendapatan', saldoNormal: 'kredit', parent: '4000' },
  { kode: '4104', nama: 'Pendapatan Sewa Alat Pertanian', klasifikasi: 'pendapatan', saldoNormal: 'kredit', parent: '4000' },
  { kode: '4105', nama: 'Pendapatan Iuran Air PamDes', klasifikasi: 'pendapatan', saldoNormal: 'kredit', parent: '4000' },
  { kode: '4106', nama: 'Pendapatan Bank Sampah', klasifikasi: 'pendapatan', saldoNormal: 'kredit', parent: '4000' },
  { kode: '4107', nama: 'Pendapatan BUMDesma', klasifikasi: 'pendapatan', saldoNormal: 'kredit', parent: '4000' },
  { kode: '4901', nama: 'Pendapatan Lain-lain', klasifikasi: 'pendapatan', saldoNormal: 'kredit', parent: '4000' },

  // BEBAN (5xxx)
  { kode: '5000', nama: 'BEBAN OPERASIONAL', klasifikasi: 'beban', saldoNormal: 'debit', isHeader: true },
  { kode: '5101', nama: 'Harga Pokok Penjualan', klasifikasi: 'beban', saldoNormal: 'debit', parent: '5000' },
  { kode: '5201', nama: 'Beban Gaji & Honor', klasifikasi: 'beban', saldoNormal: 'debit', parent: '5000' },
  { kode: '5202', nama: 'Beban Listrik & Air', klasifikasi: 'beban', saldoNormal: 'debit', parent: '5000' },
  { kode: '5203', nama: 'Beban Telepon & Internet', klasifikasi: 'beban', saldoNormal: 'debit', parent: '5000' },
  { kode: '5204', nama: 'Beban Sewa', klasifikasi: 'beban', saldoNormal: 'debit', parent: '5000' },
  { kode: '5205', nama: 'Beban Penyusutan', klasifikasi: 'beban', saldoNormal: 'debit', parent: '5000' },
  { kode: '5206', nama: 'Beban Administrasi & Umum', klasifikasi: 'beban', saldoNormal: 'debit', parent: '5000' },
  { kode: '5207', nama: 'Beban Pemasaran & Promosi', klasifikasi: 'beban', saldoNormal: 'debit', parent: '5000' },
  { kode: '5208', nama: 'Beban Pemeliharaan Aset', klasifikasi: 'beban', saldoNormal: 'debit', parent: '5000' },
  { kode: '5209', nama: 'Beban Penyisihan Piutang', klasifikasi: 'beban', saldoNormal: 'debit', parent: '5000' },
  { kode: '5210', nama: 'Beban Bunga Simpanan Anggota', klasifikasi: 'beban', saldoNormal: 'debit', parent: '5000' },

  { kode: '6000', nama: 'BEBAN NON-OPERASIONAL', klasifikasi: 'beban_lain', saldoNormal: 'debit', isHeader: true },
  { kode: '6101', nama: 'Beban Bunga Bank', klasifikasi: 'beban_lain', saldoNormal: 'debit', parent: '6000' },
  { kode: '6201', nama: 'Beban Pajak Penghasilan', klasifikasi: 'beban_lain', saldoNormal: 'debit', parent: '6000' },
];

// ─── Mock journal entries (sampel transaksi tahun berjalan) ─────────────────
const buildJurnal = (): JurnalEntry[] => [
  {
    id: 'j1', nomor: 'JU-2026-001', tanggal: '2026-01-05', dokumen: 'BKK-001',
    keterangan: 'Pembelian persediaan Mart Desa', unitId: 'u1', posted: true,
    lines: [
      { akun: '1120', debit: 28_500_000, kredit: 0, unitId: 'u1' },
      { akun: '1102', debit: 0, kredit: 28_500_000, unitId: 'u1' },
    ],
  },
  {
    id: 'j2', nomor: 'JU-2026-002', tanggal: '2026-01-15', dokumen: 'BKM-001',
    keterangan: 'Penjualan Mart Desa Januari', unitId: 'u1', posted: true,
    lines: [
      { akun: '1101', debit: 65_000_000, kredit: 0, unitId: 'u1' },
      { akun: '4101', debit: 0, kredit: 65_000_000, unitId: 'u1' },
    ],
  },
  {
    id: 'j3', nomor: 'JU-2026-003', tanggal: '2026-01-20', dokumen: 'JU-PENYUSUTAN-01',
    keterangan: 'Pembebanan HPP Mart Desa Januari', unitId: 'u1', posted: true,
    lines: [
      { akun: '5101', debit: 48_000_000, kredit: 0, unitId: 'u1' },
      { akun: '1120', debit: 0, kredit: 48_000_000, unitId: 'u1' },
    ],
  },
  {
    id: 'j4', nomor: 'JU-2026-004', tanggal: '2026-01-25', dokumen: 'BKM-USP-001',
    keterangan: 'Penerimaan bunga kredit USP Januari', unitId: 'u2', posted: true,
    lines: [
      { akun: '1102', debit: 18_500_000, kredit: 0, unitId: 'u2' },
      { akun: '4102', debit: 0, kredit: 18_500_000, unitId: 'u2' },
    ],
  },
  {
    id: 'j5', nomor: 'JU-2026-005', tanggal: '2026-01-28', dokumen: 'BKK-WISATA-001',
    keterangan: 'Tiket masuk Wisata Embung', unitId: 'u3', posted: true,
    lines: [
      { akun: '1101', debit: 24_500_000, kredit: 0, unitId: 'u3' },
      { akun: '4103', debit: 0, kredit: 24_500_000, unitId: 'u3' },
    ],
  },
  {
    id: 'j6', nomor: 'JU-2026-006', tanggal: '2026-01-30', dokumen: 'BKK-GAJI-01',
    keterangan: 'Pembayaran gaji & honor Januari', posted: true,
    lines: [
      { akun: '5201', debit: 35_000_000, kredit: 0 },
      { akun: '1102', debit: 0, kredit: 35_000_000 },
    ],
  },
  {
    id: 'j7', nomor: 'JU-2026-007', tanggal: '2026-01-31', dokumen: 'JU-LISTRIK-01',
    keterangan: 'Pembayaran beban listrik & air', posted: true,
    lines: [
      { akun: '5202', debit: 4_200_000, kredit: 0 },
      { akun: '1102', debit: 0, kredit: 4_200_000 },
    ],
  },
  {
    id: 'j8', nomor: 'JU-2026-008', tanggal: '2026-02-05', dokumen: 'BKM-002',
    keterangan: 'Penjualan Mart Desa Februari', unitId: 'u1', posted: true,
    lines: [
      { akun: '1101', debit: 72_000_000, kredit: 0, unitId: 'u1' },
      { akun: '4101', debit: 0, kredit: 72_000_000, unitId: 'u1' },
    ],
  },
  {
    id: 'j9', nomor: 'JU-2026-009', tanggal: '2026-02-12', dokumen: 'BKM-PAMDES-001',
    keterangan: 'Iuran Air PamDes Februari', unitId: 'u5', posted: true,
    lines: [
      { akun: '1101', debit: 13_500_000, kredit: 0, unitId: 'u5' },
      { akun: '4105', debit: 0, kredit: 13_500_000, unitId: 'u5' },
    ],
  },
  {
    id: 'j10', nomor: 'JU-2026-010', tanggal: '2026-02-15', dokumen: 'BKK-SEWA-01',
    keterangan: 'Pendapatan sewa traktor & alat pertanian', unitId: 'u4', posted: true,
    lines: [
      { akun: '1101', debit: 18_500_000, kredit: 0, unitId: 'u4' },
      { akun: '4104', debit: 0, kredit: 18_500_000, unitId: 'u4' },
    ],
  },
  {
    id: 'j11', nomor: 'JU-2026-011', tanggal: '2026-02-28', dokumen: 'JU-PENYUSUTAN-02',
    keterangan: 'Penyusutan aset tetap bulanan', posted: true,
    lines: [
      { akun: '5205', debit: 8_500_000, kredit: 0 },
      { akun: '1221', debit: 0, kredit: 4_200_000 },
      { akun: '1231', debit: 0, kredit: 2_800_000 },
      { akun: '1241', debit: 0, kredit: 1_500_000 },
    ],
  },
  {
    id: 'j12', nomor: 'JU-2026-012', tanggal: '2026-03-02', dokumen: 'BKM-BUMDESMA-001',
    keterangan: 'Bagi hasil dari BUMDesma Karangrejo', unitId: 'u7', posted: true,
    lines: [
      { akun: '1102', debit: 22_000_000, kredit: 0, unitId: 'u7' },
      { akun: '4107', debit: 0, kredit: 22_000_000, unitId: 'u7' },
    ],
  },
  {
    id: 'j13', nomor: 'JU-2026-013', tanggal: '2026-03-10', dokumen: 'BKM-SAMPAH-01',
    keterangan: 'Pendapatan Bank Sampah Maret', unitId: 'u6', posted: true,
    lines: [
      { akun: '1101', debit: 4_800_000, kredit: 0, unitId: 'u6' },
      { akun: '4106', debit: 0, kredit: 4_800_000, unitId: 'u6' },
    ],
  },
  {
    id: 'j14', nomor: 'JU-2026-014', tanggal: '2026-03-15', dokumen: 'BKK-ADM-01',
    keterangan: 'Beban administrasi & ATK Q1', posted: true,
    lines: [
      { akun: '5206', debit: 6_500_000, kredit: 0 },
      { akun: '1102', debit: 0, kredit: 6_500_000 },
    ],
  },
  {
    id: 'j15', nomor: 'JU-2026-015', tanggal: '2026-03-20', dokumen: 'BKK-MAINT-01',
    keterangan: 'Pemeliharaan gedung & peralatan', posted: true,
    lines: [
      { akun: '5208', debit: 5_200_000, kredit: 0 },
      { akun: '1102', debit: 0, kredit: 5_200_000 },
    ],
  },
  {
    id: 'j16', nomor: 'JU-2026-016', tanggal: '2026-03-25', dokumen: 'BKK-BUNGA-01',
    keterangan: 'Pembayaran bunga bank Q1', posted: true,
    lines: [
      { akun: '6101', debit: 3_750_000, kredit: 0 },
      { akun: '1102', debit: 0, kredit: 3_750_000 },
    ],
  },
  {
    id: 'j17', nomor: 'JU-2026-017', tanggal: '2026-03-30', dokumen: 'BKK-PROMO-01',
    keterangan: 'Beban promosi & pemasaran Q1', posted: true,
    lines: [
      { akun: '5207', debit: 2_800_000, kredit: 0 },
      { akun: '1102', debit: 0, kredit: 2_800_000 },
    ],
  },
];

const ANGGOTA_USP: AnggotaUSP[] = [
  { id: 'a1', nomor: 'USP-2024-001', nik: '3504121205700020', nama: 'Slamet Riyadi', alamat: 'RT 01/RW 02 Sumber Makmur', telepon: '0812-3456-7801', pekerjaan: 'Petani', tglDaftar: '2024-01-15', status: 'aktif' },
  { id: 'a2', nomor: 'USP-2024-002', nik: '3504126205720021', nama: 'Yanti Susilawati', alamat: 'RT 02/RW 01 Sumber Makmur', telepon: '0812-3456-7802', pekerjaan: 'Pedagang Pasar', tglDaftar: '2024-01-22', status: 'aktif' },
  { id: 'a3', nomor: 'USP-2024-003', nik: '3504121103780022', nama: 'Heri Cahyono', alamat: 'RT 03/RW 02 Sumber Makmur', telepon: '0812-3456-7803', pekerjaan: 'Tukang Bangunan', tglDaftar: '2024-02-08', status: 'aktif' },
  { id: 'a4', nomor: 'USP-2025-014', nik: '3504121408850023', nama: 'Dwi Hartono', alamat: 'RT 01/RW 03 Sumber Makmur', telepon: '0812-3456-7804', pekerjaan: 'Wirausaha', tglDaftar: '2025-03-12', status: 'aktif' },
  { id: 'a5', nomor: 'USP-2025-027', nik: '3504126710900024', nama: 'Ira Permatasari', alamat: 'RT 04/RW 02 Sumber Makmur', telepon: '0812-3456-7805', pekerjaan: 'Guru', tglDaftar: '2025-06-18', status: 'aktif' },
];

const KREDIT: KreditRecord[] = [
  { id: 'k1', nomor: 'KR-2025-008', anggotaId: 'a1', plafon: 25_000_000, tenor: 24, sukuBunga: 12, jenisBunga: 'flat', tujuan: 'Modal usaha tani', agunan: 'BPKB Motor', tglPencairan: '2025-04-10', status: 'lancar', outstanding: 16_800_000 },
  { id: 'k2', nomor: 'KR-2025-014', anggotaId: 'a2', plafon: 15_000_000, tenor: 12, sukuBunga: 14, jenisBunga: 'efektif', tujuan: 'Tambah modal dagang', agunan: 'Sertifikat Tanah', tglPencairan: '2025-07-05', status: 'lancar', outstanding: 6_800_000 },
  { id: 'k3', nomor: 'KR-2025-022', anggotaId: 'a3', plafon: 10_000_000, tenor: 10, sukuBunga: 14, jenisBunga: 'flat', tujuan: 'Renovasi rumah', agunan: '-', tglPencairan: '2025-09-15', status: 'dpk', outstanding: 7_500_000 },
  { id: 'k4', nomor: 'KR-2026-002', anggotaId: 'a4', plafon: 50_000_000, tenor: 36, sukuBunga: 11, jenisBunga: 'anuitas', tujuan: 'Buka warung kopi', agunan: 'BPKB Mobil', tglPencairan: '2026-01-20', status: 'lancar', outstanding: 47_200_000 },
  { id: 'k5', nomor: 'KR-2026-007', anggotaId: 'a5', plafon: 8_000_000, tenor: 12, sukuBunga: 14, jenisBunga: 'flat', tujuan: 'Biaya pendidikan', agunan: '-', tglPencairan: '2026-02-14', status: 'lancar', outstanding: 7_400_000 },
];

const PEMBAGIAN: PembagianHasilUsaha[] = [
  {
    tahun: 2024,
    labaBersih: 285_000_000,
    alokasi: { padesa: 30, cadanganUmum: 25, cadanganTujuan: 10, bonusPengelola: 12, bonusKaryawan: 8, danaSosial: 7, danaPendidikan: 5, bagiHasilPenyerta: 3 },
    approvedAt: '2025-03-10', baNomor: 'BA-MUSDES-001/2025', executedAt: '2025-03-15',
  },
  {
    tahun: 2025,
    labaBersih: 365_000_000,
    alokasi: { padesa: 30, cadanganUmum: 25, cadanganTujuan: 10, bonusPengelola: 12, bonusKaryawan: 8, danaSosial: 7, danaPendidikan: 5, bagiHasilPenyerta: 3 },
    approvedAt: '2026-03-05', baNomor: 'BA-MUSDES-002/2026', executedAt: '2026-03-20',
  },
];

const LAPORAN: LaporanRecord[] = [
  { id: 'l1', jenis: 'lpj_pelaksana', judul: 'LPJ Pelaksana Operasional Tahun 2025', periode: 'Tahun 2025', tahun: 2025, tanggal: '2026-02-10', status: 'diterima', diajukanOleh: 'Andi Pranoto, S.E., M.M.', diterimaOleh: 'H. Sutrisno, S.Pd.' },
  { id: 'l2', jenis: 'laporan_pengawas', judul: 'Laporan Pengawas Tahun 2025', periode: 'Tahun 2025', tahun: 2025, tanggal: '2026-02-12', status: 'diterima', diajukanOleh: 'Drs. Imam Wahyudi', diterimaOleh: 'Musyawarah Desa' },
  { id: 'l3', jenis: 'rkat', judul: 'RKAT BUM Desa Sumber Makmur 2026', periode: 'Tahun 2026', tahun: 2026, tanggal: '2026-01-15', status: 'diterima', diajukanOleh: 'Andi Pranoto, S.E., M.M.', diterimaOleh: 'Musyawarah Desa' },
  { id: 'l4', jenis: 'laporan_kemendesa', judul: 'Laporan Tahunan ke Kemendesa PDTT 2025', periode: 'Tahun 2025', tahun: 2025, tanggal: '2026-03-25', status: 'submitted', diajukanOleh: 'Andi Pranoto, S.E., M.M.', diterimaOleh: 'Ditjen PDP Kemendesa' },
  { id: 'l5', jenis: 'lpj_semester', judul: 'LPJ Semester I 2026', periode: 'Semester I 2026', tahun: 2026, tanggal: '2026-04-15', status: 'draft', diajukanOleh: 'Andi Pranoto, S.E., M.M.' },
];

// ─── Public store ───────────────────────────────────────────────────────────

export const bumdesData = {
  profil: PROFIL,
  musdes: MUSDES,
  pengurus: PENGURUS,
  units: UNITS,
  penyertaan: PENYERTAAN,
  coa: COA,
  jurnal: buildJurnal(),
  anggotaUsp: ANGGOTA_USP,
  kredit: KREDIT,
  pembagian: PEMBAGIAN,
  laporan: LAPORAN,
};

// ─── Computation Helpers ────────────────────────────────────────────────────

export interface SaldoAkun {
  kode: string;
  nama: string;
  klasifikasi: AkunKlasifikasi;
  saldoNormal: SaldoNormal;
  saldoAwal: number;
  totalDebit: number;
  totalKredit: number;
  saldoAkhir: number; // positif sesuai saldo normal
}

/**
 * Hitung saldo seluruh akun berdasarkan Saldo Awal CoA + jurnal yang sudah
 * di-post. Tanggal mulai/akhir opsional untuk filter periode.
 */
export function computeAccountBalances(opts?: { dateFrom?: string; dateTo?: string }): SaldoAkun[] {
  const { jurnal, coa } = bumdesData;
  const map = new Map<string, SaldoAkun>();

  for (const a of coa) {
    map.set(a.kode, {
      kode: a.kode,
      nama: a.nama,
      klasifikasi: a.klasifikasi,
      saldoNormal: a.saldoNormal,
      saldoAwal: a.saldoAwal ?? 0,
      totalDebit: 0,
      totalKredit: 0,
      saldoAkhir: a.saldoAwal ?? 0,
    });
  }

  for (const e of jurnal) {
    if (!e.posted) continue;
    if (opts?.dateFrom && e.tanggal < opts.dateFrom) continue;
    if (opts?.dateTo && e.tanggal > opts.dateTo) continue;

    for (const ln of e.lines) {
      const acc = map.get(ln.akun);
      if (!acc) continue;
      acc.totalDebit += ln.debit;
      acc.totalKredit += ln.kredit;
    }
  }

  for (const acc of Array.from(map.values())) {
    const delta = acc.totalDebit - acc.totalKredit;
    acc.saldoAkhir =
      acc.saldoNormal === 'debit'
        ? acc.saldoAwal + delta
        : acc.saldoAwal - delta;
  }
  return Array.from(map.values());
}

/**
 * Susun Laporan Posisi Keuangan (Neraca) sesuai Lampiran Kepmendesa 136/2022.
 */
export function buildNeraca(opts?: { dateTo?: string }) {
  const balances = computeAccountBalances({ dateTo: opts?.dateTo });
  const aset = balances.filter(b => b.klasifikasi === 'aset');
  const liabilitas = balances.filter(b => b.klasifikasi === 'liabilitas');
  const ekuitas = balances.filter(b => b.klasifikasi === 'ekuitas');

  const lr = buildLabaRugi({ dateTo: opts?.dateTo });
  const labaTahunBerjalan = lr.labaBersih;

  const totalAset = aset.reduce((s, a) => s + a.saldoAkhir, 0);
  const totalLiab = liabilitas.reduce((s, a) => s + a.saldoAkhir, 0);
  const totalEkuitas = ekuitas.reduce((s, a) => s + a.saldoAkhir, 0) + labaTahunBerjalan;

  return {
    aset, liabilitas, ekuitas,
    totalAset,
    totalLiabilitas: totalLiab,
    totalEkuitas,
    labaTahunBerjalan,
    totalLiabilitasEkuitas: totalLiab + totalEkuitas,
    seimbang: Math.round(totalAset) === Math.round(totalLiab + totalEkuitas),
  };
}

/**
 * Susun Laporan Laba Rugi.
 */
export function buildLabaRugi(opts?: { dateFrom?: string; dateTo?: string }) {
  const balances = computeAccountBalances(opts);
  const pendapatan = balances.filter(b => b.klasifikasi === 'pendapatan');
  const beban = balances.filter(b => b.klasifikasi === 'beban');
  const bebanLain = balances.filter(b => b.klasifikasi === 'beban_lain' && b.kode !== '6201');
  const pajak = balances.find(b => b.kode === '6201');

  const totalPendapatan = pendapatan.reduce((s, a) => s + a.saldoAkhir, 0);
  const hpp = balances.find(b => b.kode === '5101')?.saldoAkhir ?? 0;
  const labaKotor = totalPendapatan - hpp;

  const bebanOps = beban.filter(b => b.kode !== '5101');
  const totalBebanOps = bebanOps.reduce((s, a) => s + a.saldoAkhir, 0);
  const labaUsaha = labaKotor - totalBebanOps;

  const totalBebanLain = bebanLain.reduce((s, a) => s + a.saldoAkhir, 0);
  const labaSebelumPajak = labaUsaha - totalBebanLain;

  const bebanPajak = pajak?.saldoAkhir ?? 0;
  const labaBersih = labaSebelumPajak - bebanPajak;

  return {
    pendapatan, hpp, labaKotor, bebanOps, totalBebanOps,
    labaUsaha, bebanLain, labaSebelumPajak, bebanPajak, labaBersih,
    totalPendapatan,
  };
}

/**
 * Susun Laporan Perubahan Ekuitas.
 */
export function buildPerubahanEkuitas(opts?: { dateFrom?: string; dateTo?: string }) {
  const balances = computeAccountBalances(opts);
  const ekuitasAkun = balances.filter(b => b.klasifikasi === 'ekuitas');
  const lr = buildLabaRugi(opts);

  const saldoAwal = ekuitasAkun.reduce((s, a) => s + a.saldoAwal, 0);
  const penambahanModal = ekuitasAkun.reduce((s, a) => s + (a.totalKredit), 0);
  const pengurangan = ekuitasAkun.reduce((s, a) => s + a.totalDebit, 0);
  const saldoAkhir = saldoAwal + penambahanModal - pengurangan + lr.labaBersih;

  return { saldoAwal, penambahanModal, pengurangan, labaPeriode: lr.labaBersih, saldoAkhir, ekuitasAkun };
}

/**
 * Susun Laporan Arus Kas (metode tidak langsung sederhana).
 */
export function buildArusKas(opts?: { dateFrom?: string; dateTo?: string }) {
  const lr = buildLabaRugi(opts);
  const balances = computeAccountBalances(opts);

  // Operasi: laba bersih + penyusutan + perubahan modal kerja
  const penyusutan = balances.find(b => b.kode === '5205')?.saldoAkhir ?? 0;
  const piutang = balances.filter(b => b.kode === '1110' || b.kode === '1115').reduce((s, a) => s + (a.totalDebit - a.totalKredit), 0);
  const persediaan = balances.filter(b => b.kode === '1120' || b.kode === '1125').reduce((s, a) => s + (a.totalDebit - a.totalKredit), 0);
  const utangUsaha = balances.find(b => b.kode === '2101');
  const dUtangUsaha = utangUsaha ? (utangUsaha.totalKredit - utangUsaha.totalDebit) : 0;

  const akOperasiNet = lr.labaBersih + penyusutan - piutang - persediaan + dUtangUsaha;

  // Investasi: pembelian/penjualan aset tetap
  const akAset = balances.filter(b => ['1210', '1220', '1230', '1240'].includes(b.kode));
  const akInvestasiNet = -akAset.reduce((s, a) => s + (a.totalDebit - a.totalKredit), 0);

  // Pendanaan: penyertaan modal & pinjaman bank & PADesa
  const modal = balances.filter(b => ['3101', '3102', '3103', '3104'].includes(b.kode));
  const akPendanaanModal = modal.reduce((s, a) => s + (a.totalKredit - a.totalDebit), 0);
  const utangBank = balances.find(b => b.kode === '2210');
  const akPendanaanUtang = utangBank ? (utangBank.totalKredit - utangBank.totalDebit) : 0;
  const akPendanaanNet = akPendanaanModal + akPendanaanUtang;

  const kenaikanKas = akOperasiNet + akInvestasiNet + akPendanaanNet;
  const kasAwal =
    (balances.find(b => b.kode === '1101')?.saldoAwal ?? 0) +
    (balances.find(b => b.kode === '1102')?.saldoAwal ?? 0) +
    (balances.find(b => b.kode === '1103')?.saldoAwal ?? 0);
  const kasAkhir = kasAwal + kenaikanKas;

  return {
    labaBersih: lr.labaBersih,
    penyusutan,
    piutang,
    persediaan,
    dUtangUsaha,
    akOperasiNet,
    akInvestasiNet,
    akPendanaanModal,
    akPendanaanUtang,
    akPendanaanNet,
    kenaikanKas,
    kasAwal,
    kasAkhir,
  };
}

/**
 * Aggregate KPI overview untuk dashboard.
 */
export function buildOverview() {
  const totalUnit = bumdesData.units.length;
  const activeUnit = bumdesData.units.filter(u => u.status === 'beroperasi' || u.status === 'ekspansi').length;
  const totalModal = bumdesData.penyertaan.reduce((s, p) => s + p.nominal, 0);
  const omsetBulan = bumdesData.units.reduce((s, u) => s + Math.round(u.omsetYtd / 12), 0);
  const lr = buildLabaRugi();
  const labaBersih = lr.labaBersih;
  const kontribusiPADesa = bumdesData.units.reduce((s, u) => s + u.kontribusiBumdes, 0);
  const anggotaSimpanPinjam = bumdesData.anggotaUsp.length;
  const outstandingKredit = bumdesData.kredit.reduce((s, k) => s + k.outstanding, 0);

  const compliance = {
    aktaPendirian: !!bumdesData.profil.aktaNomor,
    anggaranDasar: true,
    musdes: bumdesData.musdes.some(m => m.jenis === 'pendirian'),
    pengelola: bumdesData.pengurus.length >= 5,
    npwp: !!bumdesData.profil.npwp,
    kemendesa: !!bumdesData.profil.skMenkumham,
    rekening: true,
    coa: bumdesData.coa.length > 30,
  };

  return {
    totalUnit, activeUnit, totalModal, omsetBulan, labaBersih,
    kontribusiPADesa, anggotaSimpanPinjam, outstandingKredit,
    compliance,
    revenueByUnit: bumdesData.units.map(u => ({ id: u.id, nama: u.nama, omset: u.omsetYtd, laba: u.labaYtd })),
    capitalComposition: ['dana_desa', 'add', 'padesa', 'masyarakat', 'hibah', 'bansos', 'bumdesma'].map(s => ({
      sumber: s,
      nominal: bumdesData.penyertaan.filter(p => p.sumber === s).reduce((sum, p) => sum + p.nominal, 0),
    })).filter(x => x.nominal > 0),
  };
}
