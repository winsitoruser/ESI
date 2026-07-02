/**
 * Ekspor dokumentasi modul ke Excel (.xlsx): naratif bisnis/produk/UX/CS,
 * workflow, use case, relasi, glosarium, plus inventori teknis (halaman, API, tabel).
 *
 * Run: node scripts/generate-module-documentation-xlsx.mjs
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import {
  ROOT,
  TABLES_BY_MODULE,
  collectDocumentationData,
  labelForSegment,
} from './lib/module-documentation-shared.mjs';
import {
  DOKUMEN_META,
  PANDUAN_PEMBACA,
  IHTISAR_BAGIAN,
  WORKFLOWS,
  USE_CASES,
  RELASI_ANTAR_MODUL,
  GLOSARIUM,
  getNarasiSegmen,
  NARASI_SEGMEN,
  NARASI_SUB_KOMPONEN,
} from './lib/module-documentation-narrative-id.mjs';

const OUT = path.join(ROOT, 'docs', 'Dokumentasi-Modul-Bedagang-PoS.xlsx');

function headerStyle(row) {
  row.font = { bold: true };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2EFDA' },
  };
  row.alignment = { vertical: 'middle', wrapText: true };
}

function addSheetKeyValue(ws, title, pairs) {
  ws.addRow([title]).font = { bold: true, size: 14 };
  ws.addRow([]);
  for (const [k, v] of pairs) {
    const r = ws.addRow([k, v]);
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  }
}

async function main() {
  const data = collectDocumentationData();
  const {
    pageFiles,
    apiFiles,
    compFiles,
    pagesBySeg,
    apiBySeg,
    compBySeg,
    orderedSegs,
  } = data;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Bedagang PoS';
  wb.created = new Date();
  wb.description = DOKUMEN_META.ringkasProduk;

  // ========== 00 Panduan ==========
  const wsPanduan = wb.addWorksheet('Panduan_Pembaca', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsPanduan.columns = [
    { width: 22 },
    { width: 42 },
    { width: 48 },
  ];
  const hp = wsPanduan.addRow(['Peran pembaca', 'Fokus baca', 'Sheet yang disarankan']);
  headerStyle(hp);
  for (const row of PANDUAN_PEMBACA) {
    const r = wsPanduan.addRow(row);
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    r.getCell(3).alignment = { wrapText: true, vertical: 'top' };
  }
  wsPanduan.addRow([]);
  const rMeta = wsPanduan.addRow([
    'Judul dokumen',
    DOKUMEN_META.judul,
    DOKUMEN_META.versiDokumen,
  ]);
  rMeta.getCell(2).alignment = { wrapText: true };
  wsPanduan.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1 + PANDUAN_PEMBACA.length, column: 3 },
  };

  // ========== 01 Ikhtisar ==========
  const wsIkhtisar = wb.addWorksheet('Ikhtisar_Produk', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsIkhtisar.columns = [{ width: 28 }, { width: 90 }];
  const hi = wsIkhtisar.addRow(['Bagian', 'Penjelasan']);
  headerStyle(hi);
  wsIkhtisar.addRow(['Ringkasan nilai produk', DOKUMEN_META.ringkasProduk]).getCell(2).alignment = {
    wrapText: true,
    vertical: 'top',
  };
  for (const bag of IHTISAR_BAGIAN) {
    const r = wsIkhtisar.addRow([bag.judul, bag.isi]);
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  }
  wsIkhtisar.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: wsIkhtisar.rowCount, column: 2 },
  };

  // ========== Modul naratif (per segmen aktif) ==========
  const wsNar = wb.addWorksheet('Modul_Naratif', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsNar.columns = [
    { width: 14 },
    { width: 28 },
    { width: 45 },
    { width: 40 },
    { width: 40 },
    { width: 38 },
    { width: 45 },
    { width: 50 },
  ];
  const hn = wsNar.addRow([
    'Segmen folder',
    'Judul modul',
    'Ringkasan bisnis',
    'Nilai bagi bisnis',
    'Persona & audiens',
    'Cakupan halaman khas',
    'Relasi ke modul lain (ringkas)',
    'Fitur utama (bullet)',
  ]);
  headerStyle(hn);
  for (const seg of orderedSegs) {
    const pages = pagesBySeg.get(seg) || [];
    const apis = apiBySeg.get(seg) || [];
    const comps = compBySeg.get(seg) || [];
    if (!pages.length && !apis.length && !comps.length) continue;
    const n = getNarasiSegmen(seg);
    const relStr = (n.relasiKeModulLain || [])
      .map((x) => `${x.ke} (${x.tipe}): ${x.catatan}`)
      .join('\n');
    const fiturStr = (n.fiturUtama || []).map((x, i) => `${i + 1}. ${x}`).join('\n');
    const r = wsNar.addRow([
      seg || '(root)',
      n.judul,
      n.ringkasan,
      n.nilaiBisnis,
      n.persona,
      n.halamanTypical,
      relStr,
      fiturStr,
    ]);
    for (let c = 1; c <= 8; c++) {
      r.getCell(c).alignment = { wrapText: true, vertical: 'top' };
    }
  }
  wsNar.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: wsNar.rowCount, column: 8 },
  };

  // ========== Fitur detail (flatten) ==========
  const wsFit = wb.addWorksheet('Fitur_Detail', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsFit.columns = [
    { width: 16 },
    { width: 30 },
    { width: 70 },
  ];
  const hf = wsFit.addRow(['Segmen modul', 'Judul area', 'Deskripsi fitur / kapabilitas']);
  headerStyle(hf);
  for (const [segKey, nar] of Object.entries(NARASI_SEGMEN)) {
    const segLabel = segKey === '' ? '(root)' : segKey;
    for (const line of nar.fiturUtama || []) {
      const rr = wsFit.addRow([segLabel, nar.judul, line]);
      rr.getCell(3).alignment = { wrapText: true, vertical: 'top' };
    }
  }
  for (const [segKey, nar] of Object.entries(NARASI_SUB_KOMPONEN)) {
    for (const line of nar.fiturUtama || []) {
      const rr = wsFit.addRow([`components/${segKey}`, nar.judul, line]);
      rr.getCell(3).alignment = { wrapText: true, vertical: 'top' };
    }
  }
  wsFit.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: wsFit.rowCount, column: 3 },
  };

  // ========== Workflow ==========
  const wsWf = wb.addWorksheet('Workflow', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsWf.columns = [
    { width: 10 },
    { width: 22 },
    { width: 36 },
    { width: 55 },
    { width: 28 },
    { width: 35 },
    { width: 35 },
  ];
  const hw = wsWf.addRow([
    'ID',
    'Modul terkait',
    'Nama workflow',
    'Langkah-langkah',
    'Aktor',
    'Prasyarat',
    'Hasil / outcome',
  ]);
  headerStyle(hw);
  for (const w of WORKFLOWS) {
    const r = wsWf.addRow([
      w.id,
      w.modul,
      w.nama,
      w.langkah.map((s, i) => `${i + 1}. ${s}`).join('\n'),
      w.aktor,
      w.prasyarat,
      w.hasil,
    ]);
    for (let c = 1; c <= 7; c++) r.getCell(c).alignment = { wrapText: true, vertical: 'top' };
  }
  wsWf.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: wsWf.rowCount, column: 7 },
  };

  // ========== Use case ==========
  const wsUc = wb.addWorksheet('Use_Case', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsUc.columns = [
    { width: 10 },
    { width: 18 },
    { width: 36 },
    { width: 22 },
    { width: 35 },
    { width: 45 },
    { width: 35 },
    { width: 40 },
  ];
  const hu = wsUc.addRow([
    'ID',
    'Modul',
    'Judul skenario',
    'Aktor',
    'Kondisi awal',
    'Alur utama',
    'Hasil yang diharapkan',
    'Catatan Customer Success',
  ]);
  headerStyle(hu);
  for (const u of USE_CASES) {
    const r = wsUc.addRow([
      u.id,
      u.modul,
      u.judul,
      u.aktor,
      u.kondisiAwal,
      u.alurUtama,
      u.hasil,
      u.catatanCS,
    ]);
    for (let c = 1; c <= 8; c++) r.getCell(c).alignment = { wrapText: true, vertical: 'top' };
  }
  wsUc.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: wsUc.rowCount, column: 8 },
  };

  // ========== Relasi antar modul ==========
  const wsRel = wb.addWorksheet('Relasi_Modul', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsRel.columns = [
    { width: 18 },
    { width: 18 },
    { width: 22 },
    { width: 45 },
    { width: 40 },
  ];
  const hrel = wsRel.addRow([
    'Modul / domain sumber',
    'Modul / domain target',
    'Jenis hubungan',
    'Penjelasan bisnis',
    'Data / artefak yang bergerak',
  ]);
  headerStyle(hrel);
  for (const x of RELASI_ANTAR_MODUL) {
    const r = wsRel.addRow([
      x.sumber,
      x.target,
      x.jenis,
      x.deskripsiBisnis,
      x.dataYangBergerak,
    ]);
    for (let c = 1; c <= 5; c++) r.getCell(c).alignment = { wrapText: true, vertical: 'top' };
  }
  wsRel.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: wsRel.rowCount, column: 5 },
  };

  // ========== Glosarium ==========
  const wsGl = wb.addWorksheet('Glosarium', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsGl.columns = [{ width: 22 }, { width: 80 }];
  const hg = wsGl.addRow(['Istilah', 'Definisi untuk audiensi bisnis & implementasi']);
  headerStyle(hg);
  for (const [istilah, def] of GLOSARIUM) {
    const r = wsGl.addRow([istilah, def]);
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  }
  wsGl.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: wsGl.rowCount, column: 2 },
  };

  // ========== Ringkasan teknis ==========
  const wsSum = wb.addWorksheet('Ringkasan_Teknis', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsSum.columns = [{ width: 36 }, { width: 72 }];
  const sumRow = wsSum.addRow(['Properti', 'Nilai']);
  headerStyle(sumRow);
  const today = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const rowsSum = [
    ['Tanggal generate', today],
    ['Versi dokumen naratif', DOKUMEN_META.versiDokumen],
    ['Total file halaman (pages/, tanpa api)', pageFiles.length],
    ['Total file route API (pages/api/)', apiFiles.length],
    ['Total file komponen (components/)', compFiles.length],
    [
      'Cakupan pemindaian kode',
      'Akar repositori: pages/, components/, pages/api/. Folder terpisah (admin-panel/, export/backend/) tidak dipetakan kecuali tercermin di path tersebut.',
    ],
  ];
  for (const [k, v] of rowsSum) {
    const r = wsSum.addRow([k, v]);
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  }

  // --- Per modul (agregat) ---
  const wsMod = wb.addWorksheet('Per_Modul_Angka', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsMod.columns = [
    { key: 'seg', width: 22 },
    { key: 'label', width: 36 },
    { key: 'nPage', width: 12 },
    { key: 'nComp', width: 12 },
    { key: 'nApi', width: 12 },
  ];
  const h1 = wsMod.addRow([
    'Segmen folder',
    'Nama modul (label UI)',
    'Jumlah halaman',
    'Jumlah komponen',
    'Jumlah endpoint API',
  ]);
  headerStyle(h1);

  for (const seg of orderedSegs) {
    const pages = pagesBySeg.get(seg) || [];
    const apis = apiBySeg.get(seg) || [];
    const comps = compBySeg.get(seg) || [];
    if (!pages.length && !apis.length && !comps.length) continue;
    wsMod.addRow([
      seg || '(root)',
      labelForSegment(seg),
      pages.length,
      comps.length,
      apis.length,
    ]);
  }
  wsMod.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: wsMod.rowCount, column: 5 },
  };

  // --- Halaman + konteks naratif ---
  const wsPg = wb.addWorksheet('Halaman', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsPg.columns = [
    { width: 16 },
    { width: 30 },
    { width: 52 },
    { width: 48 },
    { width: 42 },
    { width: 40 },
  ];
  const h2 = wsPg.addRow([
    'Segmen',
    'Judul modul (naratif)',
    'Path file (pages/)',
    'Ringkasan area modul',
    'Siapa yang memakai (persona)',
    'Hubungan dengan modul lain (ringkas)',
  ]);
  headerStyle(h2);
  const flatPages = [];
  for (const seg of orderedSegs) {
    const pages = pagesBySeg.get(seg) || [];
    for (const p of pages) {
      flatPages.push({ seg, p });
    }
  }
  flatPages.sort((a, b) =>
    a.seg === b.seg ? a.p.localeCompare(b.p) : String(a.seg).localeCompare(String(b.seg))
  );
  for (const { seg, p } of flatPages) {
    const n = getNarasiSegmen(seg);
    const relShort = (n.relasiKeModulLain || [])
      .slice(0, 4)
      .map((x) => x.ke)
      .join(', ');
    const r = wsPg.addRow([
      seg || '(root)',
      n.judul,
      p,
      n.ringkasan,
      n.persona,
      relShort || '—',
    ]);
    for (let c = 1; c <= 6; c++) r.getCell(c).alignment = { wrapText: true, vertical: 'top' };
  }
  wsPg.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, wsPg.rowCount), column: 6 },
  };

  // --- Komponen + konteks ---
  const wsCo = wb.addWorksheet('Komponen', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsCo.columns = [
    { width: 16 },
    { width: 30 },
    { width: 52 },
    { width: 45 },
    { width: 40 },
  ];
  const h3 = wsCo.addRow([
    'Segmen folder',
    'Judul modul (naratif)',
    'Path file (components/)',
    'Fungsi umum di UI (dari konteks modul)',
    'Catatan untuk UX / dev',
  ]);
  headerStyle(h3);
  const flatComp = [];
  for (const seg of [...compBySeg.keys()].sort((a, b) => String(a).localeCompare(String(b)))) {
    for (const p of compBySeg.get(seg) || []) {
      flatComp.push({ seg, p });
    }
  }
  for (const { seg, p } of flatComp) {
    const n = getNarasiSegmen(seg);
    const r = wsCo.addRow([
      seg || '(root)',
      n.judul,
      p,
      `Komponen UI mendukung: ${n.judul}. ${(n.fiturUtama && n.fiturUtama[0]) || ''}`,
      'Periksa izin peran saat reuse komponen antar konteks cabang/pusat.',
    ]);
    for (let c = 1; c <= 5; c++) r.getCell(c).alignment = { wrapText: true, vertical: 'top' };
  }
  wsCo.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, wsCo.rowCount), column: 5 },
  };

  // --- API ---
  const wsApi = wb.addWorksheet('API', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsApi.columns = [
    { width: 18 },
    { width: 32 },
    { width: 72 },
    { width: 40 },
    { width: 38 },
  ];
  const h4 = wsApi.addRow([
    'Segmen API',
    'Judul modul (naratif)',
    'Endpoint',
    'Peran tipikal API',
    'Catatan integrasi',
  ]);
  headerStyle(h4);
  const apiSegs = [...apiBySeg.keys()].sort((a, b) => String(a).localeCompare(String(b)));
  for (const seg of apiSegs) {
    const n = getNarasiSegmen(seg === '(root)' ? '' : seg);
    for (const ep of apiBySeg.get(seg) || []) {
      const r = wsApi.addRow([
        seg,
        n.judul,
        ep,
        'Mendukung operasi CRUD / laporan untuk modul terkait; autentikasi tenant/cabang.',
        'Gunakan kontrak request/response di kode sumber handler untuk detail field.',
      ]);
      for (let c = 1; c <= 5; c++) r.getCell(c).alignment = { wrapText: true, vertical: 'top' };
    }
  }
  wsApi.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, wsApi.rowCount), column: 5 },
  };

  // --- Tabel DB ---
  const wsDb = wb.addWorksheet('Tabel_DB', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsDb.columns = [
    { key: 'domain', width: 28 },
    { key: 'table', width: 40 },
    { key: 'note', width: 50 },
  ];
  const h5 = wsDb.addRow([
    'Domain / modul data',
    'Nama tabel (PostgreSQL / Sequelize)',
    'Catatan',
  ]);
  headerStyle(h5);
  for (const [domain, tables] of Object.entries(TABLES_BY_MODULE)) {
    for (const t of tables) {
      wsDb.addRow([
        domain,
        t,
        'Definisi kolom: lihat model Sequelize di backend/src/models.',
      ]).getCell(3).alignment = { wrapText: true, vertical: 'top' };
    }
  }
  wsDb.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, wsDb.rowCount), column: 3 },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await wb.xlsx.writeFile(OUT);
  console.log('Written:', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
