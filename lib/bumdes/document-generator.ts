/**
 * BUM Desa Document Generator
 *
 * Menghasilkan dokumen pelaporan dalam format HTML printable yang dapat
 * dicetak sebagai PDF (via window.print) atau diunduh sebagai file mandiri.
 * Menyediakan template untuk:
 *   1. Laporan Posisi Keuangan (Neraca)
 *   2. Laporan Laba Rugi
 *   3. Laporan Perubahan Ekuitas
 *   4. Laporan Arus Kas
 *   5. Catatan atas Laporan Keuangan (CALK)
 *   6. LPJ Pelaksana Operasional Tahunan
 *   7. RKAT (Rencana Kerja & Anggaran Tahunan)
 *
 * Format mengikuti Lampiran Kepmendesa No. 136 Tahun 2022.
 */

import {
  bumdesData,
  buildNeraca,
  buildLabaRugi,
  buildPerubahanEkuitas,
  buildArusKas,
  buildOverview,
} from './data-store';

const fmt = (n: number) =>
  (n < 0 ? `(${Math.abs(Math.round(n)).toLocaleString('id-ID')})` : Math.round(n).toLocaleString('id-ID'));

const today = () =>
  new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

const baseStyles = `
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Georgia, serif; color: #111; line-height: 1.5; font-size: 11pt; margin: 0; padding: 24px; }
  .doc-header { text-align: center; border-bottom: 3px double #111; padding-bottom: 12px; margin-bottom: 18px; }
  .doc-header .org { font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
  .doc-header .desc { font-size: 10pt; color: #444; }
  .doc-header .title { font-size: 16pt; font-weight: bold; margin-top: 14px; text-transform: uppercase; }
  .doc-header .subtitle { font-size: 11pt; color: #555; margin-top: 4px; }
  .doc-header .compliance { display: inline-block; margin-top: 10px; padding: 3px 10px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 12px; font-size: 9pt; color: #4b5563; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10.5pt; }
  th { background: #f3f4f6; text-align: left; padding: 6px 8px; border-bottom: 2px solid #4b5563; font-weight: 700; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
  .num { text-align: right; font-variant-numeric: tabular-nums; font-family: 'Courier New', monospace; }
  .total-row td { font-weight: bold; border-top: 2px solid #111; border-bottom: 3px double #111; background: #fafafa; }
  .header-row td { font-weight: bold; background: #eef2ff; text-transform: uppercase; font-size: 10pt; letter-spacing: 0.3px; }
  .indent-1 td:first-child { padding-left: 24px; }
  .indent-2 td:first-child { padding-left: 40px; }
  .section-title { font-weight: bold; font-size: 12pt; text-transform: uppercase; margin: 18px 0 6px; border-bottom: 1px solid #111; padding-bottom: 4px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 60px; text-align: center; font-size: 10pt; }
  .signatures .slot { min-height: 90px; }
  .signatures .nama { margin-top: 60px; font-weight: bold; text-decoration: underline; }
  .signatures .jabatan { font-style: italic; color: #555; }
  .meta { margin: 8px 0 16px; font-size: 10.5pt; }
  .meta div { margin: 2px 0; }
  .narrative p { text-align: justify; margin: 6px 0; }
  .calk-section { margin: 14px 0; }
  .calk-section h3 { font-size: 12pt; margin: 12px 0 4px; padding-bottom: 3px; border-bottom: 1px solid #888; }
  .footer-note { margin-top: 24px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 9pt; color: #666; text-align: center; font-style: italic; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
</style>`;

function header(title: string, subtitle?: string) {
  const p = bumdesData.profil;
  return `
  <div class="doc-header">
    <div class="org">${p.nama}</div>
    <div class="desc">Desa ${p.desa}, Kecamatan ${p.kecamatan}, Kab. ${p.kabupaten}, ${p.provinsi}</div>
    <div class="desc">${p.alamat} • Telp: ${p.telepon} • Email: ${p.email}</div>
    <div class="desc">NPWP: ${p.npwp} • NIB: ${p.nib}</div>
    <div class="title">${title}</div>
    ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
    <div class="compliance">Sesuai Kepmendesa No. 136 Tahun 2022 • SAK ETAP/EMKM • Berbasis Akrual</div>
  </div>`;
}

function signatures(extra?: { left?: { jabatan: string; nama: string }; mid?: { jabatan: string; nama: string }; right?: { jabatan: string; nama: string } }) {
  const direktur = bumdesData.pengurus.find(p => p.jabatan === 'direktur');
  const bendahara = bumdesData.pengurus.find(p => p.jabatan === 'bendahara');
  const penasihat = bumdesData.pengurus.find(p => p.jabatan === 'penasihat');

  const left = extra?.left ?? { jabatan: 'Bendahara BUM Desa', nama: bendahara?.nama ?? '_____________' };
  const mid = extra?.mid ?? { jabatan: 'Direktur BUM Desa', nama: direktur?.nama ?? '_____________' };
  const right = extra?.right ?? { jabatan: 'Penasihat / Kepala Desa', nama: penasihat?.nama ?? '_____________' };

  return `
  <div class="signatures">
    <div class="slot">
      <div>Disusun oleh,</div>
      <div class="jabatan">${left.jabatan}</div>
      <div class="nama">${left.nama}</div>
    </div>
    <div class="slot">
      <div>Disetujui oleh,</div>
      <div class="jabatan">${mid.jabatan}</div>
      <div class="nama">${mid.nama}</div>
    </div>
    <div class="slot">
      <div>Mengetahui,</div>
      <div class="jabatan">${right.jabatan}</div>
      <div class="nama">${right.nama}</div>
    </div>
  </div>`;
}

function footer() {
  return `<div class="footer-note">Dokumen ini dihasilkan otomatis oleh sistem Bedagang ERP — Modul BUM Desa, ${today()}.</div>`;
}

// ─── 1. Neraca / Laporan Posisi Keuangan ────────────────────────────────────
export function generateNeracaHTML(opts?: { dateTo?: string }) {
  const n = buildNeraca(opts);
  const tgl = opts?.dateTo || new Date().toISOString().slice(0, 10);
  const tglFmt = new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const renderAkun = (akun: typeof n.aset, klasifikasi: string) => {
    return akun
      .filter(a => a.saldoAkhir !== 0 || (a as any).kode.endsWith('00'))
      .map(a => {
        const isHeader = bumdesData.coa.find(c => c.kode === a.kode)?.isHeader;
        if (isHeader) {
          return `<tr class="header-row"><td colspan="2">${a.kode} - ${a.nama}</td></tr>`;
        }
        return `<tr class="indent-1"><td>${a.kode} - ${a.nama}</td><td class="num">${fmt(a.saldoAkhir)}</td></tr>`;
      })
      .join('');
  };

  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Laporan Posisi Keuangan - ${bumdesData.profil.nama}</title>${baseStyles}</head><body>
${header('LAPORAN POSISI KEUANGAN', `Per ${tglFmt}`)}
<div class="meta"><div><strong>Mata Uang:</strong> Rupiah (Rp)</div></div>

<div class="section-title">A. Aset</div>
<table>
  <thead><tr><th style="width:75%">Akun</th><th style="width:25%" class="num">Saldo (Rp)</th></tr></thead>
  <tbody>
    ${renderAkun(n.aset, 'aset')}
    <tr class="total-row"><td>TOTAL ASET</td><td class="num">${fmt(n.totalAset)}</td></tr>
  </tbody>
</table>

<div class="section-title">B. Liabilitas</div>
<table>
  <thead><tr><th style="width:75%">Akun</th><th style="width:25%" class="num">Saldo (Rp)</th></tr></thead>
  <tbody>
    ${renderAkun(n.liabilitas, 'liabilitas')}
    <tr class="total-row"><td>TOTAL LIABILITAS</td><td class="num">${fmt(n.totalLiabilitas)}</td></tr>
  </tbody>
</table>

<div class="section-title">C. Ekuitas</div>
<table>
  <thead><tr><th style="width:75%">Akun</th><th style="width:25%" class="num">Saldo (Rp)</th></tr></thead>
  <tbody>
    ${renderAkun(n.ekuitas, 'ekuitas')}
    <tr class="indent-1"><td>Laba/(Rugi) Tahun Berjalan</td><td class="num">${fmt(n.labaTahunBerjalan)}</td></tr>
    <tr class="total-row"><td>TOTAL EKUITAS</td><td class="num">${fmt(n.totalEkuitas)}</td></tr>
  </tbody>
</table>

<table style="margin-top:18px;">
  <tbody>
    <tr class="total-row"><td style="width:75%">TOTAL LIABILITAS DAN EKUITAS</td><td style="width:25%" class="num">${fmt(n.totalLiabilitasEkuitas)}</td></tr>
    <tr><td colspan="2" style="text-align:right;font-style:italic;color:${n.seimbang ? '#059669' : '#dc2626'}">${n.seimbang ? '✓ Neraca seimbang' : '✗ NERACA BELUM SEIMBANG'}</td></tr>
  </tbody>
</table>

${signatures()}
${footer()}
</body></html>`;
}

// ─── 2. Laba Rugi ───────────────────────────────────────────────────────────
export function generateLabaRugiHTML(opts?: { dateFrom?: string; dateTo?: string }) {
  const lr = buildLabaRugi(opts);
  const periodeText = opts?.dateFrom && opts?.dateTo
    ? `Untuk periode ${opts.dateFrom} s/d ${opts.dateTo}`
    : `Untuk tahun yang berakhir ${today()}`;

  const rows = (acc: typeof lr.pendapatan) =>
    acc.filter(a => a.saldoAkhir !== 0).map(a =>
      `<tr class="indent-1"><td>${a.kode} - ${a.nama}</td><td class="num">${fmt(a.saldoAkhir)}</td></tr>`,
    ).join('');

  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Laporan Laba Rugi - ${bumdesData.profil.nama}</title>${baseStyles}</head><body>
${header('LAPORAN LABA RUGI', periodeText)}

<table>
  <thead><tr><th style="width:75%">Pos</th><th style="width:25%" class="num">Jumlah (Rp)</th></tr></thead>
  <tbody>
    <tr class="header-row"><td colspan="2">PENDAPATAN USAHA</td></tr>
    ${rows(lr.pendapatan)}
    <tr class="total-row"><td>Total Pendapatan</td><td class="num">${fmt(lr.totalPendapatan)}</td></tr>

    <tr class="header-row"><td colspan="2">HARGA POKOK PENJUALAN</td></tr>
    <tr class="indent-1"><td>5101 - Harga Pokok Penjualan</td><td class="num">(${fmt(lr.hpp)})</td></tr>
    <tr class="total-row"><td>LABA KOTOR</td><td class="num">${fmt(lr.labaKotor)}</td></tr>

    <tr class="header-row"><td colspan="2">BEBAN OPERASIONAL</td></tr>
    ${rows(lr.bebanOps)}
    <tr class="total-row"><td>Total Beban Operasional</td><td class="num">(${fmt(lr.totalBebanOps)})</td></tr>

    <tr class="total-row"><td>LABA USAHA</td><td class="num">${fmt(lr.labaUsaha)}</td></tr>

    <tr class="header-row"><td colspan="2">PENDAPATAN (BEBAN) NON-OPERASIONAL</td></tr>
    ${rows(lr.bebanLain)}
    <tr class="total-row"><td>LABA SEBELUM PAJAK</td><td class="num">${fmt(lr.labaSebelumPajak)}</td></tr>

    <tr class="indent-1"><td>6201 - Beban Pajak Penghasilan</td><td class="num">(${fmt(lr.bebanPajak)})</td></tr>
    <tr class="total-row" style="background:#dcfce7"><td>LABA BERSIH PERIODE</td><td class="num">${fmt(lr.labaBersih)}</td></tr>
  </tbody>
</table>

${signatures()}
${footer()}
</body></html>`;
}

// ─── 3. Perubahan Ekuitas ───────────────────────────────────────────────────
export function generatePerubahanEkuitasHTML(opts?: { dateFrom?: string; dateTo?: string }) {
  const pe = buildPerubahanEkuitas(opts);

  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Laporan Perubahan Ekuitas</title>${baseStyles}</head><body>
${header('LAPORAN PERUBAHAN EKUITAS', `Untuk tahun yang berakhir ${today()}`)}

<table>
  <thead><tr><th style="width:75%">Uraian</th><th style="width:25%" class="num">Jumlah (Rp)</th></tr></thead>
  <tbody>
    <tr><td>Saldo Ekuitas Awal Periode</td><td class="num">${fmt(pe.saldoAwal)}</td></tr>
    <tr><td>(+) Penambahan Modal Penyertaan</td><td class="num">${fmt(pe.penambahanModal)}</td></tr>
    <tr><td>(-) Pengurangan Ekuitas</td><td class="num">(${fmt(pe.pengurangan)})</td></tr>
    <tr><td>(+) Laba Bersih Periode</td><td class="num">${fmt(pe.labaPeriode)}</td></tr>
    <tr class="total-row" style="background:#dbeafe"><td>SALDO EKUITAS AKHIR PERIODE</td><td class="num">${fmt(pe.saldoAkhir)}</td></tr>
  </tbody>
</table>

<div class="section-title">Rincian Komponen Ekuitas</div>
<table>
  <thead><tr><th>Komponen</th><th class="num">Saldo Awal</th><th class="num">Penambahan</th><th class="num">Pengurangan</th><th class="num">Saldo Akhir</th></tr></thead>
  <tbody>
    ${pe.ekuitasAkun.map(e => `<tr><td>${e.kode} - ${e.nama}</td><td class="num">${fmt(e.saldoAwal)}</td><td class="num">${fmt(e.totalKredit)}</td><td class="num">${fmt(e.totalDebit)}</td><td class="num">${fmt(e.saldoAkhir)}</td></tr>`).join('')}
  </tbody>
</table>

${signatures()}
${footer()}
</body></html>`;
}

// ─── 4. Arus Kas ────────────────────────────────────────────────────────────
export function generateArusKasHTML(opts?: { dateFrom?: string; dateTo?: string }) {
  const ak = buildArusKas(opts);

  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Laporan Arus Kas</title>${baseStyles}</head><body>
${header('LAPORAN ARUS KAS', `Metode Tidak Langsung • ${today()}`)}

<table>
  <thead><tr><th style="width:75%">Uraian</th><th style="width:25%" class="num">Jumlah (Rp)</th></tr></thead>
  <tbody>
    <tr class="header-row"><td colspan="2">A. ARUS KAS DARI AKTIVITAS OPERASI</td></tr>
    <tr class="indent-1"><td>Laba Bersih Periode</td><td class="num">${fmt(ak.labaBersih)}</td></tr>
    <tr class="indent-1"><td>(+) Beban Penyusutan (non-kas)</td><td class="num">${fmt(ak.penyusutan)}</td></tr>
    <tr class="indent-1"><td>(-) Kenaikan Piutang</td><td class="num">(${fmt(ak.piutang)})</td></tr>
    <tr class="indent-1"><td>(-) Kenaikan Persediaan</td><td class="num">(${fmt(ak.persediaan)})</td></tr>
    <tr class="indent-1"><td>(+) Kenaikan Utang Usaha</td><td class="num">${fmt(ak.dUtangUsaha)}</td></tr>
    <tr class="total-row"><td>Kas Bersih dari Aktivitas Operasi</td><td class="num">${fmt(ak.akOperasiNet)}</td></tr>

    <tr class="header-row"><td colspan="2">B. ARUS KAS DARI AKTIVITAS INVESTASI</td></tr>
    <tr class="indent-1"><td>Pembelian/(Penjualan) Aset Tetap</td><td class="num">${fmt(ak.akInvestasiNet)}</td></tr>
    <tr class="total-row"><td>Kas Bersih dari Aktivitas Investasi</td><td class="num">${fmt(ak.akInvestasiNet)}</td></tr>

    <tr class="header-row"><td colspan="2">C. ARUS KAS DARI AKTIVITAS PENDANAAN</td></tr>
    <tr class="indent-1"><td>Penerimaan Modal Penyertaan</td><td class="num">${fmt(ak.akPendanaanModal)}</td></tr>
    <tr class="indent-1"><td>Penerimaan/(Pembayaran) Utang Bank</td><td class="num">${fmt(ak.akPendanaanUtang)}</td></tr>
    <tr class="total-row"><td>Kas Bersih dari Aktivitas Pendanaan</td><td class="num">${fmt(ak.akPendanaanNet)}</td></tr>

    <tr class="total-row" style="background:#fef3c7"><td>KENAIKAN (PENURUNAN) BERSIH KAS</td><td class="num">${fmt(ak.kenaikanKas)}</td></tr>
    <tr><td>Kas dan Setara Kas Awal Periode</td><td class="num">${fmt(ak.kasAwal)}</td></tr>
    <tr class="total-row" style="background:#dcfce7"><td>KAS DAN SETARA KAS AKHIR PERIODE</td><td class="num">${fmt(ak.kasAkhir)}</td></tr>
  </tbody>
</table>

${signatures()}
${footer()}
</body></html>`;
}

// ─── 5. CALK ────────────────────────────────────────────────────────────────
export function generateCALKHTML() {
  const p = bumdesData.profil;
  const n = buildNeraca();
  const lr = buildLabaRugi();

  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>CALK</title>${baseStyles}</head><body>
${header('CATATAN ATAS LAPORAN KEUANGAN (CALK)', `Untuk Tahun yang Berakhir ${today()}`)}

<div class="calk-section narrative">
  <h3>1. Informasi Umum BUM Desa</h3>
  <p><strong>${p.nama}</strong> adalah Badan Usaha Milik Desa yang berkedudukan di Desa ${p.desa}, Kecamatan ${p.kecamatan}, Kabupaten ${p.kabupaten}, Provinsi ${p.provinsi}. Didirikan pada tahun ${p.tahunPendirian} berdasarkan Peraturan Desa Nomor ${p.perdesNomor} tanggal ${new Date(p.perdesTanggal).toLocaleDateString('id-ID')} dan Akta Pendirian Notaris ${p.notaris} Nomor ${p.aktaNomor} tanggal ${new Date(p.aktaTanggal).toLocaleDateString('id-ID')}. BUM Desa telah berbadan hukum sesuai SK Menkumham Nomor ${p.skMenkumham}.</p>
  <p><strong>Klasifikasi:</strong> ${p.klasifikasi.toUpperCase()} • <strong>NPWP:</strong> ${p.npwp} • <strong>NIB:</strong> ${p.nib}</p>
  <p><strong>Visi:</strong> ${p.visi}</p>
  <p><strong>Misi:</strong></p>
  <ul>${p.misi.map(m => `<li>${m}</li>`).join('')}</ul>
</div>

<div class="calk-section narrative">
  <h3>2. Kebijakan Akuntansi</h3>
  <p><strong>2.1. Dasar Penyusunan Laporan Keuangan.</strong> Laporan keuangan disusun berdasarkan Standar Akuntansi Keuangan Entitas Tanpa Akuntabilitas Publik (SAK ETAP) dan/atau SAK Entitas Mikro Kecil Menengah (SAK EMKM) sebagaimana diatur dalam Lampiran Keputusan Menteri Desa, Pembangunan Daerah Tertinggal, dan Transmigrasi Nomor 136 Tahun 2022 tentang Standar Akuntansi BUM Desa/BUM Desa Bersama.</p>
  <p><strong>2.2. Dasar Pengukuran.</strong> Laporan keuangan disusun berdasarkan dasar akrual (accrual basis) dengan menggunakan konsep biaya historis (historical cost) kecuali dinyatakan lain. Mata uang yang digunakan adalah Rupiah (Rp).</p>
  <p><strong>2.3. Periode Pelaporan.</strong> Tahun buku BUM Desa dimulai 1 Januari dan berakhir 31 Desember.</p>
  <p><strong>2.4. Kas dan Setara Kas.</strong> Kas dan setara kas terdiri dari kas di bendahara, kas di bank, dan kas kecil unit usaha.</p>
  <p><strong>2.5. Piutang.</strong> Piutang usaha dan piutang anggota simpan pinjam dicatat sebesar nilai realisasi yang diharapkan setelah dikurangi penyisihan kerugian piutang.</p>
  <p><strong>2.6. Persediaan.</strong> Persediaan barang dagang dan bahan baku diukur dengan metode rata-rata tertimbang (weighted average).</p>
  <p><strong>2.7. Aset Tetap.</strong> Aset tetap dicatat sebesar harga perolehan dikurangi akumulasi penyusutan. Penyusutan dihitung dengan metode garis lurus berdasarkan masa manfaat: Bangunan 20 tahun, Peralatan 8 tahun, Kendaraan 8 tahun.</p>
  <p><strong>2.8. Pengakuan Pendapatan.</strong> Pendapatan diakui pada saat barang/jasa diserahkan kepada pelanggan dan manfaat ekonomi telah/akan diterima oleh BUM Desa.</p>
  <p><strong>2.9. Modal Penyertaan.</strong> Modal Penyertaan Desa, Modal Penyertaan Masyarakat, dan Modal Penyertaan BUM Desa Bersama disajikan dalam komponen ekuitas.</p>
</div>

<div class="calk-section narrative">
  <h3>3. Rincian Pos Laporan Keuangan</h3>
  <p><strong>3.1. Total Aset.</strong> Per tanggal pelaporan, total aset BUM Desa adalah Rp ${fmt(n.totalAset)} terdiri dari aset lancar, aset tetap, dan aset lainnya.</p>
  <p><strong>3.2. Total Liabilitas.</strong> Total liabilitas sebesar Rp ${fmt(n.totalLiabilitas)} mencakup liabilitas jangka pendek dan jangka panjang.</p>
  <p><strong>3.3. Ekuitas.</strong> Total ekuitas sebesar Rp ${fmt(n.totalEkuitas)} terdiri dari modal penyertaan, cadangan umum & tujuan, laba ditahan, dan laba periode berjalan sebesar Rp ${fmt(n.labaTahunBerjalan)}.</p>
  <p><strong>3.4. Pendapatan.</strong> Total pendapatan periode berjalan adalah Rp ${fmt(lr.totalPendapatan)} yang dikontribusikan oleh ${bumdesData.units.length} unit usaha BUM Desa.</p>
  <p><strong>3.5. Beban.</strong> Total beban operasional periode adalah Rp ${fmt(lr.totalBebanOps)}, termasuk Harga Pokok Penjualan sebesar Rp ${fmt(lr.hpp)}.</p>
  <p><strong>3.6. Laba Bersih.</strong> Laba bersih periode berjalan adalah Rp ${fmt(lr.labaBersih)} yang akan dialokasikan sesuai keputusan Musyawarah Desa Tahunan.</p>
</div>

<div class="calk-section narrative">
  <h3>4. Komitmen dan Kontinjensi</h3>
  <p>Pada tanggal pelaporan, BUM Desa tidak memiliki komitmen material yang signifikan selain kewajiban yang telah diakui dalam laporan posisi keuangan. Tidak terdapat tuntutan hukum yang berdampak material terhadap kondisi keuangan.</p>
</div>

<div class="calk-section narrative">
  <h3>5. Peristiwa Setelah Periode Pelaporan</h3>
  <p>Tidak terdapat peristiwa material setelah tanggal pelaporan yang memerlukan penyesuaian atau pengungkapan tambahan dalam laporan keuangan ini.</p>
</div>

${signatures()}
${footer()}
</body></html>`;
}

// ─── 6. LPJ Pelaksana Operasional Tahunan ───────────────────────────────────
export function generateLPJTahunanHTML(opts?: { tahun?: number }) {
  const p = bumdesData.profil;
  const tahun = opts?.tahun ?? new Date().getFullYear();
  const ov = buildOverview();
  const n = buildNeraca();
  const lr = buildLabaRugi();
  const pembagian = bumdesData.pembagian.find(pb => pb.tahun === tahun);
  const direktur = bumdesData.pengurus.find(pg => pg.jabatan === 'direktur');
  const penasihat = bumdesData.pengurus.find(pg => pg.jabatan === 'penasihat');
  const ketuaPengawas = bumdesData.pengurus.find(pg => pg.jabatan === 'ketua_pengawas');

  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>LPJ Pelaksana Operasional ${tahun}</title>${baseStyles}</head><body>
${header(`LAPORAN PERTANGGUNGJAWABAN (LPJ)`, `Pelaksana Operasional BUM Desa - Tahun Buku ${tahun}`)}

<div class="calk-section narrative">
  <h3>I. Pendahuluan</h3>
  <p>Dengan mengucap puji syukur kepada Tuhan Yang Maha Esa, kami selaku Pelaksana Operasional ${p.nama} menyampaikan Laporan Pertanggungjawaban (LPJ) Tahun Buku ${tahun} kepada Penasihat (Kepala Desa ${p.desa}), Pengawas, dan seluruh peserta Musyawarah Desa.</p>
  <p>LPJ ini disusun sebagai bentuk akuntabilitas pengelolaan BUM Desa sesuai dengan Pasal 26 Peraturan Pemerintah Nomor 11 Tahun 2021 tentang Badan Usaha Milik Desa serta Keputusan Menteri Desa, PDTT Nomor 136 Tahun 2022 tentang Standar Akuntansi BUM Desa.</p>

  <h3>II. Profil BUM Desa</h3>
  <p><strong>Nama:</strong> ${p.nama}<br/>
     <strong>Alamat:</strong> ${p.alamat}<br/>
     <strong>NPWP:</strong> ${p.npwp} • <strong>NIB:</strong> ${p.nib}<br/>
     <strong>Klasifikasi:</strong> ${p.klasifikasi.toUpperCase()}<br/>
     <strong>Tahun Pendirian:</strong> ${p.tahunPendirian}</p>

  <h3>III. Tata Kelola</h3>
  <p>Susunan organ pengelola BUM Desa pada periode pelaporan adalah:</p>
  <table>
    <thead><tr><th>Jabatan</th><th>Nama</th><th>Masa Jabatan</th></tr></thead>
    <tbody>
      ${bumdesData.pengurus.map(pg => `<tr><td>${pg.jabatan.replace(/_/g, ' ').toUpperCase()}</td><td>${pg.nama}</td><td>${new Date(pg.mulaiMenjabat).getFullYear()} - ${new Date(pg.akhirMenjabat).getFullYear()}</td></tr>`).join('')}
    </tbody>
  </table>
  <p>Selama tahun ${tahun}, telah dilaksanakan ${bumdesData.musdes.filter(m => new Date(m.tanggal).getFullYear() <= tahun).length} kali Musyawarah Desa terkait BUM Desa.</p>

  <h3>IV. Realisasi Unit Usaha</h3>
  <p>BUM Desa mengelola ${ov.totalUnit} unit usaha dengan ${ov.activeUnit} unit beroperasi aktif. Berikut realisasi kinerja unit usaha:</p>
  <table>
    <thead><tr><th>Unit Usaha</th><th>Jenis</th><th class="num">Omset (Rp)</th><th class="num">Laba (Rp)</th><th class="num">Kontribusi BUMDes</th></tr></thead>
    <tbody>
      ${bumdesData.units.map(u => `<tr><td>${u.nama}</td><td>${u.jenis}</td><td class="num">${fmt(u.omsetYtd)}</td><td class="num">${fmt(u.labaYtd)}</td><td class="num">${fmt(u.kontribusiBumdes)}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="2">TOTAL</td><td class="num">${fmt(bumdesData.units.reduce((s, u) => s + u.omsetYtd, 0))}</td><td class="num">${fmt(bumdesData.units.reduce((s, u) => s + u.labaYtd, 0))}</td><td class="num">${fmt(ov.kontribusiPADesa)}</td></tr>
    </tbody>
  </table>

  <h3>V. Ringkasan Laporan Keuangan</h3>
  <p>Berdasarkan pembukuan yang sesuai dengan SAK ETAP/EMKM dan Kepmendesa 136/2022, ringkasan posisi keuangan BUM Desa adalah sebagai berikut:</p>
  <table>
    <tbody>
      <tr><td>Total Aset</td><td class="num">Rp ${fmt(n.totalAset)}</td></tr>
      <tr><td>Total Liabilitas</td><td class="num">Rp ${fmt(n.totalLiabilitas)}</td></tr>
      <tr><td>Total Ekuitas</td><td class="num">Rp ${fmt(n.totalEkuitas)}</td></tr>
      <tr><td>Total Pendapatan</td><td class="num">Rp ${fmt(lr.totalPendapatan)}</td></tr>
      <tr><td>Total Beban Operasional</td><td class="num">Rp ${fmt(lr.totalBebanOps)}</td></tr>
      <tr><td>Laba Sebelum Pajak</td><td class="num">Rp ${fmt(lr.labaSebelumPajak)}</td></tr>
      <tr class="total-row"><td>LABA BERSIH PERIODE</td><td class="num">Rp ${fmt(lr.labaBersih)}</td></tr>
    </tbody>
  </table>
  <p><em>Laporan keuangan lengkap (Neraca, Laba Rugi, Perubahan Ekuitas, Arus Kas, dan CALK) disajikan dalam Lampiran.</em></p>

  <h3>VI. Usulan Pembagian Hasil Usaha</h3>
  ${pembagian ? `
  <p>Berdasarkan laba bersih sebesar <strong>Rp ${fmt(pembagian.labaBersih)}</strong>, usulan alokasi pembagian hasil usaha adalah:</p>
  <table>
    <thead><tr><th>Komponen Alokasi</th><th class="num">Persentase</th><th class="num">Nominal (Rp)</th></tr></thead>
    <tbody>
      <tr><td>Pendapatan Asli Desa (PADesa)</td><td class="num">${pembagian.alokasi.padesa}%</td><td class="num">${fmt(pembagian.labaBersih * pembagian.alokasi.padesa / 100)}</td></tr>
      <tr><td>Cadangan Umum</td><td class="num">${pembagian.alokasi.cadanganUmum}%</td><td class="num">${fmt(pembagian.labaBersih * pembagian.alokasi.cadanganUmum / 100)}</td></tr>
      <tr><td>Cadangan Tujuan</td><td class="num">${pembagian.alokasi.cadanganTujuan}%</td><td class="num">${fmt(pembagian.labaBersih * pembagian.alokasi.cadanganTujuan / 100)}</td></tr>
      <tr><td>Bonus Pengelola</td><td class="num">${pembagian.alokasi.bonusPengelola}%</td><td class="num">${fmt(pembagian.labaBersih * pembagian.alokasi.bonusPengelola / 100)}</td></tr>
      <tr><td>Bonus Karyawan</td><td class="num">${pembagian.alokasi.bonusKaryawan}%</td><td class="num">${fmt(pembagian.labaBersih * pembagian.alokasi.bonusKaryawan / 100)}</td></tr>
      <tr><td>Dana Sosial</td><td class="num">${pembagian.alokasi.danaSosial}%</td><td class="num">${fmt(pembagian.labaBersih * pembagian.alokasi.danaSosial / 100)}</td></tr>
      <tr><td>Dana Pendidikan & Pelatihan</td><td class="num">${pembagian.alokasi.danaPendidikan}%</td><td class="num">${fmt(pembagian.labaBersih * pembagian.alokasi.danaPendidikan / 100)}</td></tr>
      <tr><td>Bagi Hasil Penyerta Masyarakat</td><td class="num">${pembagian.alokasi.bagiHasilPenyerta}%</td><td class="num">${fmt(pembagian.labaBersih * pembagian.alokasi.bagiHasilPenyerta / 100)}</td></tr>
      <tr class="total-row"><td>TOTAL</td><td class="num">100%</td><td class="num">${fmt(pembagian.labaBersih)}</td></tr>
    </tbody>
  </table>
  ${pembagian.baNomor ? `<p><em>Disetujui melalui Berita Acara Musyawarah Desa Nomor ${pembagian.baNomor}.</em></p>` : ''}
  ` : `<p>Usulan pembagian hasil usaha akan disampaikan dalam dokumen terpisah.</p>`}

  <h3>VII. Rencana Tahun ${tahun + 1}</h3>
  <ul>
    <li>Meningkatkan kontribusi PADesa minimal 15% dibanding tahun ${tahun}.</li>
    <li>Menambah 1 unit usaha baru sesuai potensi desa.</li>
    <li>Memperluas keanggotaan Unit Simpan Pinjam menjadi minimal 100 anggota.</li>
    <li>Menyelenggarakan program pelatihan SDM bagi pengelola dan karyawan.</li>
    <li>Memperkuat tata kelola dengan implementasi sistem informasi BUM Desa secara penuh.</li>
  </ul>

  <h3>VIII. Penutup</h3>
  <p>Demikian Laporan Pertanggungjawaban Pelaksana Operasional BUM Desa ${p.nama} Tahun Buku ${tahun} ini disusun untuk dapat dipertimbangkan dan diterima dalam Musyawarah Desa Tahunan. Atas perhatian dan kerja sama seluruh pihak, kami mengucapkan terima kasih.</p>
</div>

${signatures({
  left: { jabatan: 'Ketua Pengawas BUM Desa', nama: ketuaPengawas?.nama ?? '_____________' },
  mid: { jabatan: 'Direktur BUM Desa', nama: direktur?.nama ?? '_____________' },
  right: { jabatan: 'Penasihat / Kepala Desa', nama: penasihat?.nama ?? '_____________' },
})}
${footer()}
</body></html>`;
}

// ─── 7. RKAT (Rencana Kerja & Anggaran Tahunan) ─────────────────────────────
export function generateRKATHTML(opts?: { tahun?: number }) {
  const tahun = opts?.tahun ?? new Date().getFullYear() + 1;
  const lr = buildLabaRugi();

  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>RKAT ${tahun}</title>${baseStyles}</head><body>
${header(`RENCANA KERJA DAN ANGGARAN TAHUNAN (RKAT)`, `BUM Desa - Tahun ${tahun}`)}

<div class="calk-section narrative">
  <h3>I. Pengantar</h3>
  <p>Rencana Kerja dan Anggaran Tahunan (RKAT) ${tahun} ini disusun sebagai pedoman pelaksanaan kegiatan BUM Desa selama 1 tahun anggaran. RKAT akan menjadi dasar bagi Pelaksana Operasional dalam menjalankan unit usaha dan pengukuran kinerja.</p>

  <h3>II. Asumsi Dasar Penyusunan</h3>
  <ul>
    <li>Pertumbuhan ekonomi desa: 5-7%</li>
    <li>Inflasi: ±4%</li>
    <li>Tingkat suku bunga: 11-14% per tahun</li>
    <li>Stabilitas harga komoditas pertanian dan perdagangan</li>
  </ul>

  <h3>III. Target Pendapatan dan Laba per Unit Usaha</h3>
  <table>
    <thead><tr><th>Unit Usaha</th><th class="num">Target Omset</th><th class="num">Target Laba</th><th class="num">Kontribusi BUMDes</th></tr></thead>
    <tbody>
      ${bumdesData.units.map(u => {
        const target = Math.round(u.omsetYtd * 1.15);
        const laba = Math.round(u.labaYtd * 1.20);
        const kontribusi = Math.round(u.kontribusiBumdes * 1.20);
        return `<tr><td>${u.nama}</td><td class="num">${fmt(target)}</td><td class="num">${fmt(laba)}</td><td class="num">${fmt(kontribusi)}</td></tr>`;
      }).join('')}
      <tr class="total-row"><td>TOTAL</td><td class="num">${fmt(Math.round(bumdesData.units.reduce((s, u) => s + u.omsetYtd, 0) * 1.15))}</td><td class="num">${fmt(Math.round(bumdesData.units.reduce((s, u) => s + u.labaYtd, 0) * 1.20))}</td><td class="num">${fmt(Math.round(bumdesData.units.reduce((s, u) => s + u.kontribusiBumdes, 0) * 1.20))}</td></tr>
    </tbody>
  </table>

  <h3>IV. Anggaran Belanja</h3>
  <table>
    <thead><tr><th>Pos Anggaran</th><th class="num">Rencana (Rp)</th></tr></thead>
    <tbody>
      <tr><td>Beban Gaji & Honor</td><td class="num">${fmt(35_000_000 * 12)}</td></tr>
      <tr><td>Beban Operasional Unit</td><td class="num">${fmt(180_000_000)}</td></tr>
      <tr><td>Beban Pemasaran & Promosi</td><td class="num">${fmt(45_000_000)}</td></tr>
      <tr><td>Beban Pemeliharaan Aset</td><td class="num">${fmt(60_000_000)}</td></tr>
      <tr><td>Beban Pendidikan & Pelatihan</td><td class="num">${fmt(25_000_000)}</td></tr>
      <tr><td>Investasi Aset Tetap Baru</td><td class="num">${fmt(150_000_000)}</td></tr>
      <tr class="total-row"><td>TOTAL ANGGARAN BELANJA</td><td class="num">${fmt(880_000_000)}</td></tr>
    </tbody>
  </table>

  <h3>V. Program Strategis ${tahun}</h3>
  <ol>
    <li>Pengembangan platform digital BUM Desa untuk seluruh unit usaha.</li>
    <li>Pembukaan unit usaha baru di sektor agrowisata.</li>
    <li>Peningkatan plafon kredit Unit Simpan Pinjam.</li>
    <li>Sertifikasi & pelatihan profesional untuk pengelola.</li>
    <li>Implementasi sistem akuntansi terintegrasi sesuai Kepmendesa 136/2022.</li>
  </ol>
</div>

${signatures()}
${footer()}
</body></html>`;
}

// ─── Index helper for UI dropdown ───────────────────────────────────────────
export const REPORT_TYPES = [
  { key: 'neraca', label: 'Laporan Posisi Keuangan (Neraca)', generator: generateNeracaHTML },
  { key: 'laba-rugi', label: 'Laporan Laba Rugi', generator: generateLabaRugiHTML },
  { key: 'perubahan-ekuitas', label: 'Laporan Perubahan Ekuitas', generator: generatePerubahanEkuitasHTML },
  { key: 'arus-kas', label: 'Laporan Arus Kas', generator: generateArusKasHTML },
  { key: 'calk', label: 'Catatan atas Laporan Keuangan (CALK)', generator: generateCALKHTML },
  { key: 'lpj', label: 'LPJ Pelaksana Operasional Tahunan', generator: generateLPJTahunanHTML },
  { key: 'rkat', label: 'RKAT (Rencana Kerja & Anggaran Tahunan)', generator: generateRKATHTML },
] as const;

/**
 * Helper untuk download dokumen HTML sebagai file.
 */
export function downloadHtmlAsFile(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper untuk membuka dokumen di window baru dan menampilkan dialog cetak.
 */
export function printHtmlDocument(html: string) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => {
    w.focus();
    w.print();
  }, 400);
}
