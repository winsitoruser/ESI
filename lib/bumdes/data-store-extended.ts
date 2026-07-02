/**
 * BUM Desa - Extended Data Store
 *
 * Berisi data tambahan untuk sub-modul yang dikembangkan setelah inti:
 *   - RKAT / Anggaran (budget vs realisasi)
 *   - Aset Tetap (registry, depresiasi, mutasi)
 *   - Pajak (PPh 21, PPh Badan, PPN, SPT)
 *   - Audit Internal & Pengawasan (findings, follow-up)
 *   - Kontrak & Kerjasama (MoU, BUMDesma, vendor)
 *   - Klasifikasi & Sertifikasi (Permendesa 3/2021)
 *   - Simpan Pinjam: detail Simpanan & Angsuran
 *   - Kalender Kegiatan
 *   - Pengaturan Modul BUMDes
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BudgetItem {
  id: string;
  tahun: number;
  unitId?: string;
  kategori: 'pendapatan' | 'beban_operasional' | 'investasi' | 'lainnya';
  pos: string;
  rencana: number;
  realisasi: number;
  catatan?: string;
}

export interface AsetTetap {
  id: string;
  kode: string;
  nama: string;
  kategori: 'tanah' | 'bangunan' | 'kendaraan' | 'peralatan' | 'inventaris' | 'lainnya';
  unitId?: string;
  tglPerolehan: string;
  hargaPerolehan: number;
  masaManfaat: number; // tahun
  metodePenyusutan: 'garis_lurus' | 'saldo_menurun';
  nilaiResidu: number;
  akumulasiPenyusutan: number;
  nilaiBuku: number;
  lokasi: string;
  kondisi: 'baik' | 'rusak_ringan' | 'rusak_berat' | 'dihapus';
  bukti?: string;
}

export interface MutasiAset {
  id: string;
  asetId: string;
  jenis: 'pembelian' | 'transfer' | 'penjualan' | 'penghapusan' | 'penyusutan';
  tanggal: string;
  nilai: number;
  keterangan: string;
  fromLokasi?: string;
  toLokasi?: string;
}

export interface PajakRecord {
  id: string;
  jenis: 'pph_21' | 'pph_22' | 'pph_23' | 'pph_25' | 'pph_29' | 'pph_final' | 'ppn' | 'pbb';
  masa: string;        // YYYY-MM atau YYYY
  jumlahPajak: number;
  jumlahDpp?: number;
  tglJatuhTempo: string;
  tglBayar?: string;
  tglLapor?: string;
  nomorBuktiBayar?: string;
  nomorSpt?: string;
  status: 'belum_bayar' | 'sudah_bayar' | 'sudah_lapor' | 'terlambat';
  catatan?: string;
}

export interface AuditFinding {
  id: string;
  nomor: string;
  judul: string;
  tipe: 'internal' | 'eksternal';
  auditor: string;
  area: string; // unit atau fungsi
  tglTemuan: string;
  tingkat: 'rendah' | 'sedang' | 'tinggi' | 'kritis';
  temuan: string;
  rekomendasi: string;
  status: 'open' | 'in_progress' | 'closed' | 'overdue';
  pic: string;
  tglJatuhTempo: string;
  tglSelesai?: string;
  tindakLanjut?: string;
}

export interface Kontrak {
  id: string;
  nomor: string;
  judul: string;
  jenis: 'mou' | 'kerjasama_usaha' | 'sewa' | 'pengadaan' | 'penyertaan_modal' | 'kemitraan' | 'jasa' | 'lainnya';
  pihak: string;
  unitId?: string;
  tglMulai: string;
  tglBerakhir: string;
  nilaiKontrak: number;
  status: 'draft' | 'aktif' | 'berakhir' | 'dibatalkan' | 'perlu_perpanjangan';
  fileUrl?: string;
  catatan?: string;
}

export interface KlasifikasiAssessment {
  id: string;
  tahun: number;
  klasifikasiSekarang: 'dasar' | 'tumbuh' | 'berkembang' | 'maju' | 'mandiri';
  klasifikasiTarget: 'dasar' | 'tumbuh' | 'berkembang' | 'maju' | 'mandiri';
  skorTotal: number; // 0-100
  indikator: {
    kelembagaan: number;       // 0-100
    keuangan: number;
    sdm: number;
    inovasi: number;
    kontribusiDesa: number;
    pelaporan: number;
  };
  tglAssessment: string;
  assesor: string;
  rekomendasi: string;
}

export interface SimpananTrx {
  id: string;
  anggotaId: string;
  jenis: 'pokok' | 'wajib' | 'sukarela' | 'berjangka';
  tipe: 'setoran' | 'penarikan';
  nominal: number;
  tanggal: string;
  saldoSetelah: number;
  bukti?: string;
}

export interface AngsuranKredit {
  id: string;
  kreditId: string;
  angsuranKe: number;
  tglJatuhTempo: string;
  pokok: number;
  bunga: number;
  total: number;
  denda: number;
  status: 'belum_bayar' | 'dibayar' | 'terlambat';
  tglBayar?: string;
  buktiBayar?: string;
}

export interface KalenderEvent {
  id: string;
  judul: string;
  jenis: 'musdes' | 'rkat' | 'lpj' | 'audit' | 'pelatihan' | 'pelaporan_pajak' | 'pelaporan_kemendesa' | 'pemeliharaan' | 'event_unit' | 'lainnya';
  tanggal: string;
  jamMulai?: string;
  jamSelesai?: string;
  lokasi?: string;
  pic?: string;
  prioritas: 'rendah' | 'normal' | 'tinggi' | 'kritis';
  status: 'rencana' | 'berjalan' | 'selesai' | 'dibatalkan';
  reminder?: number; // hari sebelum
  deskripsi?: string;
}

export interface SettingsBumdes {
  tahunBuku: { mulai: string; akhir: string };
  mataUang: string;
  bahasaLaporan: string;
  metodePersediaan: 'fifo' | 'avg' | 'lifo';
  metodePenyusutan: 'garis_lurus' | 'saldo_menurun';
  masaManfaatDefault: { bangunan: number; peralatan: number; kendaraan: number; inventaris: number };
  ppnAktif: boolean;
  pphFinalRate: number;
  approvalLimits: { jurnal: number; pengeluaran: number };
  notifikasi: { lpjDeadline: boolean; musdesReminder: boolean; pajakReminder: boolean; kontrakBerakhir: boolean };
  integrasi: { kemendesaApi: boolean; siskeudes: boolean; eFaktur: boolean; bankApi: boolean };
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

export const BUDGET_2026: BudgetItem[] = [
  // Pendapatan per unit
  { id: 'b1', tahun: 2026, unitId: 'u1', kategori: 'pendapatan', pos: 'Penjualan Mart Desa', rencana: 800_000_000, realisasi: 685_000_000 },
  { id: 'b2', tahun: 2026, unitId: 'u2', kategori: 'pendapatan', pos: 'Bunga Kredit USP', rencana: 280_000_000, realisasi: 245_000_000 },
  { id: 'b3', tahun: 2026, unitId: 'u3', kategori: 'pendapatan', pos: 'Tiket Wisata Embung', rencana: 360_000_000, realisasi: 312_000_000 },
  { id: 'b4', tahun: 2026, unitId: 'u4', kategori: 'pendapatan', pos: 'Sewa Alat Pertanian', rencana: 195_000_000, realisasi: 168_000_000 },
  { id: 'b5', tahun: 2026, unitId: 'u5', kategori: 'pendapatan', pos: 'Iuran Air PamDes', rencana: 180_000_000, realisasi: 156_000_000 },
  { id: 'b6', tahun: 2026, unitId: 'u6', kategori: 'pendapatan', pos: 'Bank Sampah', rencana: 50_000_000, realisasi: 38_000_000 },
  { id: 'b7', tahun: 2026, unitId: 'u7', kategori: 'pendapatan', pos: 'Bagi Hasil BUMDesma', rencana: 220_000_000, realisasi: 198_000_000 },
  // Beban operasional
  { id: 'b8', tahun: 2026, kategori: 'beban_operasional', pos: 'Gaji & Honor Pengelola', rencana: 420_000_000, realisasi: 385_000_000 },
  { id: 'b9', tahun: 2026, kategori: 'beban_operasional', pos: 'Utilitas (Listrik & Air)', rencana: 60_000_000, realisasi: 52_400_000 },
  { id: 'b10', tahun: 2026, kategori: 'beban_operasional', pos: 'Sewa Tempat Operasional', rencana: 36_000_000, realisasi: 33_000_000 },
  { id: 'b11', tahun: 2026, kategori: 'beban_operasional', pos: 'Pemasaran & Promosi', rencana: 48_000_000, realisasi: 42_300_000 },
  { id: 'b12', tahun: 2026, kategori: 'beban_operasional', pos: 'Administrasi & ATK', rencana: 30_000_000, realisasi: 28_500_000 },
  { id: 'b13', tahun: 2026, kategori: 'beban_operasional', pos: 'Pemeliharaan Aset', rencana: 75_000_000, realisasi: 62_700_000 },
  // Investasi
  { id: 'b14', tahun: 2026, kategori: 'investasi', pos: 'Pengembangan Wisata Embung', rencana: 150_000_000, realisasi: 125_000_000 },
  { id: 'b15', tahun: 2026, kategori: 'investasi', pos: 'Pembelian Alat Pertanian Baru', rencana: 80_000_000, realisasi: 75_000_000 },
  { id: 'b16', tahun: 2026, kategori: 'investasi', pos: 'Sistem IT Mart Desa', rencana: 45_000_000, realisasi: 38_000_000 },
  // Lainnya
  { id: 'b17', tahun: 2026, kategori: 'lainnya', pos: 'Dana Pendidikan & Pelatihan', rencana: 25_000_000, realisasi: 18_500_000 },
  { id: 'b18', tahun: 2026, kategori: 'lainnya', pos: 'Dana Sosial CSR', rencana: 30_000_000, realisasi: 24_000_000 },
];

export const ASET: AsetTetap[] = [
  { id: 'a1', kode: 'AST-2018-001', nama: 'Tanah Mart Desa', kategori: 'tanah', unitId: 'u1', tglPerolehan: '2018-08-01', hargaPerolehan: 120_000_000, masaManfaat: 0, metodePenyusutan: 'garis_lurus', nilaiResidu: 0, akumulasiPenyusutan: 0, nilaiBuku: 120_000_000, lokasi: 'Pasar Desa', kondisi: 'baik', bukti: 'SHM-001/2018' },
  { id: 'a2', kode: 'AST-2018-002', nama: 'Bangunan Mart Desa', kategori: 'bangunan', unitId: 'u1', tglPerolehan: '2018-08-15', hargaPerolehan: 180_000_000, masaManfaat: 20, metodePenyusutan: 'garis_lurus', nilaiResidu: 0, akumulasiPenyusutan: 65_700_000, nilaiBuku: 114_300_000, lokasi: 'Pasar Desa', kondisi: 'baik' },
  { id: 'a3', kode: 'AST-2019-003', nama: 'Etalase & Rak Display', kategori: 'peralatan', unitId: 'u1', tglPerolehan: '2019-01-10', hargaPerolehan: 28_000_000, masaManfaat: 8, metodePenyusutan: 'garis_lurus', nilaiResidu: 0, akumulasiPenyusutan: 24_500_000, nilaiBuku: 3_500_000, lokasi: 'Pasar Desa', kondisi: 'baik' },
  { id: 'a4', kode: 'AST-2019-004', nama: 'Cash Register & POS', kategori: 'peralatan', unitId: 'u1', tglPerolehan: '2019-02-05', hargaPerolehan: 18_500_000, masaManfaat: 5, metodePenyusutan: 'garis_lurus', nilaiResidu: 0, akumulasiPenyusutan: 18_500_000, nilaiBuku: 0, lokasi: 'Pasar Desa', kondisi: 'baik' },
  { id: 'a5', kode: 'AST-2019-005', nama: 'Pickup Bak Operasional', kategori: 'kendaraan', tglPerolehan: '2019-04-20', hargaPerolehan: 95_000_000, masaManfaat: 8, metodePenyusutan: 'garis_lurus', nilaiResidu: 15_000_000, akumulasiPenyusutan: 65_000_000, nilaiBuku: 30_000_000, lokasi: 'Garasi BUMDes', kondisi: 'baik' },
  { id: 'a6', kode: 'AST-2020-006', nama: 'Tanah Wisata Embung', kategori: 'tanah', unitId: 'u3', tglPerolehan: '2020-06-01', hargaPerolehan: 130_000_000, masaManfaat: 0, metodePenyusutan: 'garis_lurus', nilaiResidu: 0, akumulasiPenyusutan: 0, nilaiBuku: 130_000_000, lokasi: 'Embung Desa', kondisi: 'baik' },
  { id: 'a7', kode: 'AST-2020-007', nama: 'Saung & Gazebo Wisata', kategori: 'bangunan', unitId: 'u3', tglPerolehan: '2020-06-10', hargaPerolehan: 85_000_000, masaManfaat: 15, metodePenyusutan: 'garis_lurus', nilaiResidu: 0, akumulasiPenyusutan: 32_500_000, nilaiBuku: 52_500_000, lokasi: 'Embung Desa', kondisi: 'baik' },
  { id: 'a8', kode: 'AST-2021-008', nama: 'Traktor Pertanian', kategori: 'kendaraan', unitId: 'u4', tglPerolehan: '2021-03-05', hargaPerolehan: 78_000_000, masaManfaat: 10, metodePenyusutan: 'garis_lurus', nilaiResidu: 8_000_000, akumulasiPenyusutan: 28_000_000, nilaiBuku: 50_000_000, lokasi: 'Gudang BUMDes', kondisi: 'baik' },
  { id: 'a9', kode: 'AST-2021-009', nama: 'Mesin Bajak Sawah', kategori: 'peralatan', unitId: 'u4', tglPerolehan: '2021-03-08', hargaPerolehan: 12_000_000, masaManfaat: 8, metodePenyusutan: 'garis_lurus', nilaiResidu: 0, akumulasiPenyusutan: 5_500_000, nilaiBuku: 6_500_000, lokasi: 'Gudang BUMDes', kondisi: 'baik' },
  { id: 'a10', kode: 'AST-2022-010', nama: 'Sumur Bor & Tower Air', kategori: 'bangunan', unitId: 'u5', tglPerolehan: '2022-01-15', hargaPerolehan: 145_000_000, masaManfaat: 20, metodePenyusutan: 'garis_lurus', nilaiResidu: 0, akumulasiPenyusutan: 32_000_000, nilaiBuku: 113_000_000, lokasi: 'Sumur Desa', kondisi: 'baik' },
  { id: 'a11', kode: 'AST-2022-011', nama: 'Pipa Distribusi Air', kategori: 'peralatan', unitId: 'u5', tglPerolehan: '2022-01-20', hargaPerolehan: 35_000_000, masaManfaat: 15, metodePenyusutan: 'garis_lurus', nilaiResidu: 0, akumulasiPenyusutan: 9_300_000, nilaiBuku: 25_700_000, lokasi: 'Sepanjang Desa', kondisi: 'baik' },
  { id: 'a12', kode: 'AST-2023-012', nama: 'Tempat Pemilahan Sampah', kategori: 'bangunan', unitId: 'u6', tglPerolehan: '2023-08-15', hargaPerolehan: 28_000_000, masaManfaat: 10, metodePenyusutan: 'garis_lurus', nilaiResidu: 0, akumulasiPenyusutan: 7_700_000, nilaiBuku: 20_300_000, lokasi: 'TPS Desa', kondisi: 'baik' },
  { id: 'a13', kode: 'AST-2024-013', nama: 'Komputer & Server Kantor', kategori: 'peralatan', tglPerolehan: '2024-04-10', hargaPerolehan: 32_000_000, masaManfaat: 5, metodePenyusutan: 'garis_lurus', nilaiResidu: 0, akumulasiPenyusutan: 13_500_000, nilaiBuku: 18_500_000, lokasi: 'Kantor BUMDes', kondisi: 'baik' },
  { id: 'a14', kode: 'AST-2024-014', nama: 'Genset 5 kVA', kategori: 'peralatan', tglPerolehan: '2024-09-01', hargaPerolehan: 22_000_000, masaManfaat: 10, metodePenyusutan: 'garis_lurus', nilaiResidu: 2_000_000, akumulasiPenyusutan: 3_300_000, nilaiBuku: 18_700_000, lokasi: 'Kantor BUMDes', kondisi: 'baik' },
  { id: 'a15', kode: 'AST-2025-015', nama: 'Furniture Kantor', kategori: 'inventaris', tglPerolehan: '2025-02-12', hargaPerolehan: 18_500_000, masaManfaat: 8, metodePenyusutan: 'garis_lurus', nilaiResidu: 0, akumulasiPenyusutan: 2_900_000, nilaiBuku: 15_600_000, lokasi: 'Kantor BUMDes', kondisi: 'baik' },
];

export const MUTASI_ASET: MutasiAset[] = [
  { id: 'm1', asetId: 'a13', jenis: 'pembelian', tanggal: '2024-04-10', nilai: 32_000_000, keterangan: 'Pembelian komputer & server untuk digitalisasi BUMDes' },
  { id: 'm2', asetId: 'a4', jenis: 'penghapusan', tanggal: '2025-12-31', nilai: 0, keterangan: 'Cash Register lama sudah depresiasi penuh, diganti dengan POS digital' },
  { id: 'm3', asetId: 'a8', jenis: 'transfer', tanggal: '2025-09-15', nilai: 0, keterangan: 'Transfer traktor untuk operasional musim tanam', fromLokasi: 'Gudang BUMDes', toLokasi: 'Lapangan Sawah Pak Hartono' },
  { id: 'm4', asetId: 'a14', jenis: 'pembelian', tanggal: '2024-09-01', nilai: 22_000_000, keterangan: 'Pembelian genset cadangan listrik kantor' },
  { id: 'm5', asetId: 'a15', jenis: 'pembelian', tanggal: '2025-02-12', nilai: 18_500_000, keterangan: 'Furniture meja & kursi kantor BUMDes' },
];

export const PAJAK: PajakRecord[] = [
  { id: 't1', jenis: 'pph_21', masa: '2026-01', jumlahPajak: 2_850_000, jumlahDpp: 35_000_000, tglJatuhTempo: '2026-02-10', tglBayar: '2026-02-08', tglLapor: '2026-02-09', nomorBuktiBayar: 'NTPN-202602001', nomorSpt: 'SPT-PPh21-2026-01', status: 'sudah_lapor' },
  { id: 't2', jenis: 'pph_21', masa: '2026-02', jumlahPajak: 2_950_000, jumlahDpp: 36_000_000, tglJatuhTempo: '2026-03-10', tglBayar: '2026-03-09', tglLapor: '2026-03-09', nomorBuktiBayar: 'NTPN-202603001', nomorSpt: 'SPT-PPh21-2026-02', status: 'sudah_lapor' },
  { id: 't3', jenis: 'pph_21', masa: '2026-03', jumlahPajak: 3_100_000, jumlahDpp: 37_500_000, tglJatuhTempo: '2026-04-10', tglBayar: '2026-04-08', nomorBuktiBayar: 'NTPN-202604001', status: 'sudah_bayar' },
  { id: 't4', jenis: 'pph_final', masa: '2026-01', jumlahPajak: 1_215_000, jumlahDpp: 121_500_000, tglJatuhTempo: '2026-02-15', tglBayar: '2026-02-13', tglLapor: '2026-02-14', nomorBuktiBayar: 'NTPN-202602002', nomorSpt: 'SPT-PPh-Final-2026-01', status: 'sudah_lapor', catatan: 'PPh Final UMKM 0.5% omset' },
  { id: 't5', jenis: 'pph_final', masa: '2026-02', jumlahPajak: 1_305_000, jumlahDpp: 130_500_000, tglJatuhTempo: '2026-03-15', tglBayar: '2026-03-12', tglLapor: '2026-03-14', nomorBuktiBayar: 'NTPN-202603002', nomorSpt: 'SPT-PPh-Final-2026-02', status: 'sudah_lapor', catatan: 'PPh Final UMKM 0.5% omset' },
  { id: 't6', jenis: 'pph_final', masa: '2026-03', jumlahPajak: 1_420_000, jumlahDpp: 142_000_000, tglJatuhTempo: '2026-04-15', status: 'belum_bayar', catatan: 'PPh Final UMKM 0.5% omset' },
  { id: 't7', jenis: 'pph_25', masa: '2026-Q1', jumlahPajak: 8_500_000, tglJatuhTempo: '2026-04-15', status: 'belum_bayar' },
  { id: 't8', jenis: 'pbb', masa: '2026', jumlahPajak: 4_800_000, tglJatuhTempo: '2026-09-30', status: 'belum_bayar', catatan: 'PBB Tanah & Bangunan BUMDes' },
];

export const AUDIT_FINDINGS: AuditFinding[] = [
  { id: 'af1', nomor: 'AUDIT-2026-001', judul: 'Selisih kas Mart Desa Februari', tipe: 'internal', auditor: 'Tim Pengawas BUMDes', area: 'Unit Mart Desa (u1)', tglTemuan: '2026-03-05', tingkat: 'sedang', temuan: 'Ditemukan selisih kas Rp 850.000 antara catatan POS dengan setoran bank.', rekomendasi: 'Lakukan rekonsiliasi harian dan instalasi CCTV di area kasir.', status: 'in_progress', pic: 'Budi Hartono (Manajer Unit)', tglJatuhTempo: '2026-04-30', tindakLanjut: 'CCTV sudah dipesan, rekonsiliasi harian mulai diterapkan.' },
  { id: 'af2', nomor: 'AUDIT-2026-002', judul: 'Dokumen pendukung pengeluaran tidak lengkap', tipe: 'internal', auditor: 'Tim Pengawas BUMDes', area: 'Bendahara', tglTemuan: '2026-03-10', tingkat: 'tinggi', temuan: '15% pengeluaran operasional Q1 tidak memiliki bukti lengkap (kuitansi/invoice).', rekomendasi: 'Wajibkan setiap pengeluaran > Rp 500rb melampirkan bukti asli sebelum diproses.', status: 'open', pic: 'Rini Setyawati (Bendahara)', tglJatuhTempo: '2026-04-15' },
  { id: 'af3', nomor: 'AUDIT-2026-003', judul: 'Piutang USP overdue belum diproses', tipe: 'internal', auditor: 'Tim Pengawas BUMDes', area: 'Unit Simpan Pinjam (u2)', tglTemuan: '2026-03-15', tingkat: 'tinggi', temuan: '3 debitur menunggak > 90 hari belum direklasifikasi ke kolektibilitas yang tepat.', rekomendasi: 'Update status kredit, lakukan penagihan intensif, dan bentuk penyisihan piutang.', status: 'closed', pic: 'Endang Susilowati (Manajer USP)', tglJatuhTempo: '2026-04-01', tglSelesai: '2026-03-28', tindakLanjut: 'Status diupdate, penagihan dilakukan, 1 debitur sudah lunas.' },
  { id: 'af4', nomor: 'AUDIT-2026-004', judul: 'Inventarisasi aset belum dilakukan', tipe: 'internal', auditor: 'Tim Pengawas BUMDes', area: 'Manajemen Aset', tglTemuan: '2026-02-20', tingkat: 'sedang', temuan: 'Belum ada stock opname aset tetap untuk tahun 2025.', rekomendasi: 'Lakukan inventarisasi fisik aset dan rekonsiliasi dengan daftar akuntansi.', status: 'overdue', pic: 'Lestari Wulandari (Sekretaris)', tglJatuhTempo: '2026-03-31' },
  { id: 'af5', nomor: 'AUDIT-2025-008', judul: 'Pemisahan kas operasional dan modal', tipe: 'eksternal', auditor: 'Inspektorat Kabupaten Tulungagung', area: 'Bendahara', tglTemuan: '2025-11-12', tingkat: 'kritis', temuan: 'Kas operasional dan dana modal penyertaan tercampur dalam 1 rekening.', rekomendasi: 'Buka rekening terpisah untuk modal penyertaan dan dana operasional.', status: 'closed', pic: 'Rini Setyawati (Bendahara)', tglJatuhTempo: '2025-12-31', tglSelesai: '2025-12-15', tindakLanjut: '3 rekening dipisah: operasional, modal, dan PADesa.' },
  { id: 'af6', nomor: 'AUDIT-2026-005', judul: 'Polis asuransi aset belum diperpanjang', tipe: 'internal', auditor: 'Tim Pengawas BUMDes', area: 'Manajemen Aset', tglTemuan: '2026-04-01', tingkat: 'sedang', temuan: 'Polis asuransi gedung & kendaraan akan habis 30 April 2026.', rekomendasi: 'Perpanjang polis sebelum jatuh tempo untuk mitigasi risiko.', status: 'open', pic: 'Andi Pranoto (Direktur)', tglJatuhTempo: '2026-04-25' },
];

export const KONTRAK: Kontrak[] = [
  { id: 'kk1', nomor: 'MOU-2024-001', judul: 'Kerjasama Pemasaran Produk dengan PT Indomaret Tulungagung', jenis: 'mou', pihak: 'PT Indomaret Tulungagung', unitId: 'u1', tglMulai: '2024-09-01', tglBerakhir: '2027-08-31', nilaiKontrak: 0, status: 'aktif' },
  { id: 'kk2', nomor: 'KS-2024-002', judul: 'Kerjasama Usaha Bersama BUMDesma Karangrejo Sejahtera', jenis: 'kerjasama_usaha', pihak: '5 BUMDes Kecamatan Karangrejo', unitId: 'u7', tglMulai: '2024-09-01', tglBerakhir: '2034-08-31', nilaiKontrak: 250_000_000, status: 'aktif' },
  { id: 'kk3', nomor: 'SW-2025-003', judul: 'Sewa Lokasi Mart Desa di Pasar Desa', jenis: 'sewa', pihak: 'Pemerintah Desa Sumber Makmur', unitId: 'u1', tglMulai: '2025-01-01', tglBerakhir: '2027-12-31', nilaiKontrak: 36_000_000, status: 'aktif' },
  { id: 'kk4', nomor: 'PG-2025-004', judul: 'Pengadaan Bahan Pokok dari Distributor PT Sumber Pangan', jenis: 'pengadaan', pihak: 'PT Sumber Pangan Sejahtera', unitId: 'u1', tglMulai: '2025-04-01', tglBerakhir: '2026-03-31', nilaiKontrak: 360_000_000, status: 'perlu_perpanjangan' },
  { id: 'kk5', nomor: 'KEM-2024-005', judul: 'Kemitraan Penyaluran Pupuk Subsidi', jenis: 'kemitraan', pihak: 'PT Pupuk Indonesia (Persero)', unitId: 'u4', tglMulai: '2024-06-01', tglBerakhir: '2026-05-31', nilaiKontrak: 0, status: 'aktif' },
  { id: 'kk6', nomor: 'MOU-2024-006', judul: 'MoU Pengembangan Wisata Edukasi dengan Sekolah Sekitar', jenis: 'mou', pihak: '12 Sekolah di Kecamatan Karangrejo', unitId: 'u3', tglMulai: '2024-07-01', tglBerakhir: '2027-06-30', nilaiKontrak: 0, status: 'aktif' },
  { id: 'kk7', nomor: 'JS-2025-007', judul: 'Jasa Pemeliharaan Sumur & Pipa PamDes', jenis: 'jasa', pihak: 'CV Tirta Sejahtera', unitId: 'u5', tglMulai: '2025-01-15', tglBerakhir: '2026-01-14', nilaiKontrak: 24_000_000, status: 'perlu_perpanjangan' },
  { id: 'kk8', nomor: 'KS-2023-008', judul: 'Kerjasama Pengelolaan Sampah dengan Bank Sampah Induk', jenis: 'kerjasama_usaha', pihak: 'Bank Sampah Induk Tulungagung', unitId: 'u6', tglMulai: '2023-08-20', tglBerakhir: '2025-08-19', nilaiKontrak: 0, status: 'berakhir' },
  { id: 'kk9', nomor: 'PM-2024-009', judul: 'Penyertaan Modal dari Pemkab Tulungagung', jenis: 'penyertaan_modal', pihak: 'Pemerintah Kabupaten Tulungagung', tglMulai: '2024-08-15', tglBerakhir: '2034-08-15', nilaiKontrak: 125_000_000, status: 'aktif' },
];

export const KLASIFIKASI_HISTORY: KlasifikasiAssessment[] = [
  { id: 'kl1', tahun: 2022, klasifikasiSekarang: 'tumbuh', klasifikasiTarget: 'berkembang', skorTotal: 58, indikator: { kelembagaan: 65, keuangan: 50, sdm: 55, inovasi: 50, kontribusiDesa: 60, pelaporan: 65 }, tglAssessment: '2023-01-15', assesor: 'DPMD Kab. Tulungagung', rekomendasi: 'Perkuat administrasi keuangan dan tambah unit usaha baru.' },
  { id: 'kl2', tahun: 2023, klasifikasiSekarang: 'berkembang', klasifikasiTarget: 'maju', skorTotal: 68, indikator: { kelembagaan: 72, keuangan: 60, sdm: 65, inovasi: 65, kontribusiDesa: 70, pelaporan: 75 }, tglAssessment: '2024-01-20', assesor: 'DPMD Kab. Tulungagung', rekomendasi: 'Tingkatkan kontribusi PADesa dan implementasikan sistem akuntansi yang sesuai standar.' },
  { id: 'kl3', tahun: 2024, klasifikasiSekarang: 'maju', klasifikasiTarget: 'maju', skorTotal: 78, indikator: { kelembagaan: 82, keuangan: 75, sdm: 70, inovasi: 78, kontribusiDesa: 80, pelaporan: 85 }, tglAssessment: '2025-01-25', assesor: 'DPMD Kab. Tulungagung', rekomendasi: 'Pertahankan kinerja, fokus pada inovasi digital dan ekspansi BUMDesma.' },
  { id: 'kl4', tahun: 2025, klasifikasiSekarang: 'maju', klasifikasiTarget: 'mandiri', skorTotal: 84, indikator: { kelembagaan: 88, keuangan: 82, sdm: 78, inovasi: 85, kontribusiDesa: 85, pelaporan: 88 }, tglAssessment: '2026-02-10', assesor: 'DPMD Kab. Tulungagung & Tim Verifikasi Provinsi', rekomendasi: 'Untuk naik ke MANDIRI: targetkan kontribusi PADesa minimal Rp 200jt/tahun, BUMDesma operasi 2 tahun, dan zero finding audit.' },
];

export const SIMPANAN_TRX: SimpananTrx[] = [
  { id: 's1', anggotaId: 'a1', jenis: 'pokok', tipe: 'setoran', nominal: 100_000, tanggal: '2024-01-15', saldoSetelah: 100_000, bukti: 'BPS-001' },
  { id: 's2', anggotaId: 'a1', jenis: 'wajib', tipe: 'setoran', nominal: 50_000, tanggal: '2024-02-15', saldoSetelah: 50_000, bukti: 'BPS-002' },
  { id: 's3', anggotaId: 'a1', jenis: 'sukarela', tipe: 'setoran', nominal: 500_000, tanggal: '2024-05-10', saldoSetelah: 500_000 },
  { id: 's4', anggotaId: 'a1', jenis: 'sukarela', tipe: 'setoran', nominal: 250_000, tanggal: '2024-08-12', saldoSetelah: 750_000 },
  { id: 's5', anggotaId: 'a2', jenis: 'pokok', tipe: 'setoran', nominal: 100_000, tanggal: '2024-01-22', saldoSetelah: 100_000 },
  { id: 's6', anggotaId: 'a2', jenis: 'wajib', tipe: 'setoran', nominal: 50_000, tanggal: '2024-02-22', saldoSetelah: 50_000 },
  { id: 's7', anggotaId: 'a2', jenis: 'berjangka', tipe: 'setoran', nominal: 5_000_000, tanggal: '2024-06-01', saldoSetelah: 5_000_000, bukti: 'BPS-007' },
  { id: 's8', anggotaId: 'a3', jenis: 'pokok', tipe: 'setoran', nominal: 100_000, tanggal: '2024-02-08', saldoSetelah: 100_000 },
  { id: 's9', anggotaId: 'a3', jenis: 'sukarela', tipe: 'setoran', nominal: 200_000, tanggal: '2024-09-15', saldoSetelah: 200_000 },
  { id: 's10', anggotaId: 'a3', jenis: 'sukarela', tipe: 'penarikan', nominal: 100_000, tanggal: '2025-03-10', saldoSetelah: 100_000 },
  { id: 's11', anggotaId: 'a4', jenis: 'pokok', tipe: 'setoran', nominal: 100_000, tanggal: '2025-03-12', saldoSetelah: 100_000 },
  { id: 's12', anggotaId: 'a4', jenis: 'wajib', tipe: 'setoran', nominal: 50_000, tanggal: '2025-04-12', saldoSetelah: 50_000 },
  { id: 's13', anggotaId: 'a4', jenis: 'berjangka', tipe: 'setoran', nominal: 10_000_000, tanggal: '2025-04-15', saldoSetelah: 10_000_000, bukti: 'BPS-013' },
  { id: 's14', anggotaId: 'a5', jenis: 'pokok', tipe: 'setoran', nominal: 100_000, tanggal: '2025-06-18', saldoSetelah: 100_000 },
  { id: 's15', anggotaId: 'a5', jenis: 'sukarela', tipe: 'setoran', nominal: 1_500_000, tanggal: '2025-09-20', saldoSetelah: 1_500_000 },
];

// Generate angsuran untuk tiap kredit aktif
export function generateAngsuran(kreditList: Array<{ id: string; plafon: number; tenor: number; sukuBunga: number; jenisBunga: string; tglPencairan: string; status: string }>): AngsuranKredit[] {
  const result: AngsuranKredit[] = [];
  const today = new Date();
  for (const k of kreditList) {
    if (k.status === 'lunas') continue;
    const start = new Date(k.tglPencairan);
    const pokokPerBulan = k.plafon / k.tenor;
    const bungaPerBulan = k.jenisBunga === 'flat'
      ? (k.plafon * k.sukuBunga / 100) / 12
      : (k.plafon * k.sukuBunga / 100) / 12; // simplified

    for (let i = 1; i <= k.tenor; i++) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i);
      const isPast = due < today;
      const isPastDue = due < today;
      result.push({
        id: `ang-${k.id}-${i}`,
        kreditId: k.id,
        angsuranKe: i,
        tglJatuhTempo: due.toISOString().slice(0, 10),
        pokok: Math.round(pokokPerBulan),
        bunga: Math.round(bungaPerBulan),
        total: Math.round(pokokPerBulan + bungaPerBulan),
        denda: 0,
        status: isPastDue ? 'dibayar' : 'belum_bayar',
        tglBayar: isPastDue ? due.toISOString().slice(0, 10) : undefined,
      });
    }
  }
  return result;
}

export const KALENDER: KalenderEvent[] = [
  { id: 'ka1', judul: 'Musdes Tahunan 2026 (LPJ 2025)', jenis: 'musdes', tanggal: '2026-02-15', jamMulai: '09:00', jamSelesai: '13:00', lokasi: 'Balai Desa Sumber Makmur', pic: 'Andi Pranoto', prioritas: 'kritis', status: 'selesai', deskripsi: 'Penyampaian LPJ Pelaksana Operasional Tahun 2025.' },
  { id: 'ka2', judul: 'Penyampaian RKAT 2026', jenis: 'rkat', tanggal: '2026-01-20', jamMulai: '09:00', jamSelesai: '12:00', lokasi: 'Balai Desa', pic: 'Andi Pranoto', prioritas: 'kritis', status: 'selesai' },
  { id: 'ka3', judul: 'Pelaporan PPh 21 Maret 2026', jenis: 'pelaporan_pajak', tanggal: '2026-04-10', pic: 'Rini Setyawati', prioritas: 'tinggi', status: 'selesai' },
  { id: 'ka4', judul: 'Pelaporan PPh Final UMKM Maret 2026', jenis: 'pelaporan_pajak', tanggal: '2026-04-15', pic: 'Rini Setyawati', prioritas: 'tinggi', status: 'rencana', reminder: 7 },
  { id: 'ka5', judul: 'Audit Internal Kuartal 2 2026', jenis: 'audit', tanggal: '2026-05-15', jamMulai: '08:00', lokasi: 'Kantor BUMDes', pic: 'Drs. Imam Wahyudi', prioritas: 'tinggi', status: 'rencana', reminder: 14 },
  { id: 'ka6', judul: 'Pelatihan Akuntansi BUMDes Pengurus', jenis: 'pelatihan', tanggal: '2026-05-22', jamMulai: '08:00', jamSelesai: '17:00', lokasi: 'Hotel Crown Tulungagung', pic: 'Lestari Wulandari', prioritas: 'normal', status: 'rencana' },
  { id: 'ka7', judul: 'Festival Wisata Embung 2026', jenis: 'event_unit', tanggal: '2026-07-17', jamMulai: '07:00', jamSelesai: '22:00', lokasi: 'Embung Desa', pic: 'Manajer Wisata', prioritas: 'tinggi', status: 'rencana' },
  { id: 'ka8', judul: 'Pelaporan ke Kemendesa PDTT Semester I', jenis: 'pelaporan_kemendesa', tanggal: '2026-07-31', pic: 'Andi Pranoto', prioritas: 'kritis', status: 'rencana', reminder: 14 },
  { id: 'ka9', judul: 'Pemeliharaan Sumur Bor & Pipa Air', jenis: 'pemeliharaan', tanggal: '2026-06-10', jamMulai: '08:00', lokasi: 'Sumur Desa', pic: 'CV Tirta Sejahtera', prioritas: 'normal', status: 'rencana' },
  { id: 'ka10', judul: 'Musdes Luar Biasa - Pembagian Hasil 2025', jenis: 'musdes', tanggal: '2026-03-05', jamMulai: '09:00', lokasi: 'Balai Desa', pic: 'Andi Pranoto', prioritas: 'kritis', status: 'selesai' },
  { id: 'ka11', judul: 'Perpanjangan Polis Asuransi Aset', jenis: 'lainnya', tanggal: '2026-04-25', pic: 'Andi Pranoto', prioritas: 'tinggi', status: 'rencana', reminder: 14 },
  { id: 'ka12', judul: 'Pengiriman LPJ Tahunan ke BPD & Kepala Desa', jenis: 'lpj', tanggal: '2026-02-25', pic: 'Andi Pranoto', prioritas: 'kritis', status: 'selesai' },
];

export const SETTINGS: SettingsBumdes = {
  tahunBuku: { mulai: '2026-01-01', akhir: '2026-12-31' },
  mataUang: 'IDR',
  bahasaLaporan: 'id',
  metodePersediaan: 'avg',
  metodePenyusutan: 'garis_lurus',
  masaManfaatDefault: { bangunan: 20, peralatan: 8, kendaraan: 8, inventaris: 5 },
  ppnAktif: false,
  pphFinalRate: 0.5,
  approvalLimits: { jurnal: 10_000_000, pengeluaran: 5_000_000 },
  notifikasi: { lpjDeadline: true, musdesReminder: true, pajakReminder: true, kontrakBerakhir: true },
  integrasi: { kemendesaApi: false, siskeudes: true, eFaktur: false, bankApi: true },
};

// ─── Public Bundle ──────────────────────────────────────────────────────────

export const bumdesExtData = {
  budget: BUDGET_2026,
  aset: ASET,
  mutasiAset: MUTASI_ASET,
  pajak: PAJAK,
  audit: AUDIT_FINDINGS,
  kontrak: KONTRAK,
  klasifikasi: KLASIFIKASI_HISTORY,
  simpananTrx: SIMPANAN_TRX,
  kalender: KALENDER,
  settings: SETTINGS,
};
