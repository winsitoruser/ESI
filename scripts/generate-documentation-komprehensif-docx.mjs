/**
 * Dokumentasi Word komprehensif (produk, bisnis, UX, CS, klien):
 * ikhtisar, modul naratif, workflow, use case, relasi, glosarium.
 *
 * Run: node scripts/generate-documentation-komprehensif-docx.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import { collectDocumentationData, labelForSegment } from './lib/module-documentation-shared.mjs';
import {
  DOKUMEN_META,
  PANDUAN_PEMBACA,
  IHTISAR_BAGIAN,
  WORKFLOWS,
  USE_CASES,
  RELASI_ANTAR_MODUL,
  GLOSARIUM,
  getNarasiSegmen,
} from './lib/module-documentation-narrative-id.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'docs', 'Dokumentasi-Komprehensif-Bedagang-PoS.docx');

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 160 },
    children: [new TextRun({ text, size: opts.size ?? 22 })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32 })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 140 },
    children: [new TextRun({ text, bold: true, size: 28 })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24 })],
  });
}

async function main() {
  const { orderedSegs, pagesBySeg, apiBySeg, compBySeg } = collectDocumentationData();
  const children = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
      children: [new TextRun({ text: DOKUMEN_META.judul, bold: true, size: 36 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: `${DOKUMEN_META.versiDokumen} — ${new Date().toISOString().slice(0, 10)}`,
          italics: true,
          size: 22,
        }),
      ],
    }),
    p(DOKUMEN_META.ringkasProduk, { after: 300 })
  );

  children.push(h1('1. Untuk siapa dokumen ini'));
  for (const [peran, fokus, sheet] of PANDUAN_PEMBACA) {
    children.push(h3(peran));
    children.push(p(`Fokus: ${fokus}`));
    children.push(p(`Baca juga: ${sheet}`));
  }

  children.push(h1('2. Ikhtisar produk'));
  for (const bag of IHTISAR_BAGIAN) {
    children.push(h3(bag.judul));
    children.push(p(bag.isi));
  }

  children.push(h1('3. Deskripsi modul (berdasarkan area aplikasi)'));
  children.push(
    p(
      'Setiap bagian berikut menjelaskan nilai bisnis, pengguna utama, fitur kunci, dan relasi antar modul. Segmen mengikuti struktur folder halaman (`pages/`).',
      { after: 200 }
    )
  );

  for (const seg of orderedSegs) {
    const pages = pagesBySeg.get(seg) || [];
    const apis = apiBySeg.get(seg) || [];
    const comps = compBySeg.get(seg) || [];
    if (!pages.length && !apis.length && !comps.length) continue;

    const n = getNarasiSegmen(seg);
    children.push(
      h2(`${seg || '(root)'} — ${n.judul} (${labelForSegment(seg)})`)
    );
    children.push(p(`Ringkasan: ${n.ringkasan}`));
    children.push(p(`Nilai bagi bisnis: ${n.nilaiBisnis}`));
    children.push(p(`Persona & audiens: ${n.persona}`));
    children.push(p(`Cakupan halaman khas: ${n.halamanTypical}`));
    children.push(h3('Fitur utama'));
    for (const line of n.fiturUtama || []) {
      children.push(p(`• ${line}`));
    }
    children.push(h3('Relasi ke modul lain'));
    for (const r of n.relasiKeModulLain || []) {
      children.push(p(`• ${r.ke} — ${r.tipe}: ${r.catatan}`));
    }
    children.push(
      p(
        `Cakupan teknis: ${pages.length} halaman, ${comps.length} komponen bersegmen, ${apis.length} grup endpoint API.`,
        { after: 200 }
      )
    );
  }

  children.push(h1('4. Workflow operasional (representatif)'));
  children.push(
    p(
      'Workflow berikut menggambarkan alur lintas modul yang sering ditanyakan klien dan tim internal. Bukan daftar eksklusif semua kemungkinan konfigurasi.',
      { after: 200 }
    )
  );
  for (const w of WORKFLOWS) {
    children.push(h2(`${w.id} — ${w.nama}`));
    children.push(p(`Modul terkait: ${w.modul}`));
    children.push(p(`Aktor: ${w.aktor}`));
    children.push(p(`Prasyarat: ${w.prasyarat}`));
    children.push(h3('Langkah'));
    for (let i = 0; i < w.langkah.length; i++) {
      children.push(p(`${i + 1}. ${w.langkah[i]}`));
    }
    children.push(p(`Hasil: ${w.hasil}`, { after: 240 }));
  }

  children.push(h1('5. Use case (bisnis & Customer Success)'));
  for (const u of USE_CASES) {
    children.push(h2(`${u.id} — ${u.judul}`));
    children.push(p(`Modul: ${u.modul}`));
    children.push(p(`Aktor: ${u.aktor}`));
    children.push(p(`Kondisi awal: ${u.kondisiAwal}`));
    children.push(p(`Alur utama: ${u.alurUtama}`));
    children.push(p(`Hasil: ${u.hasil}`));
    children.push(p(`Catatan CS: ${u.catatanCS}`, { after: 240 }));
  }

  children.push(h1('6. Relasi antar domain data & proses'));
  for (const x of RELASI_ANTAR_MODUL) {
    children.push(h3(`${x.sumber} → ${x.target}`));
    children.push(p(`Jenis: ${x.jenis}`));
    children.push(p(x.deskripsiBisnis));
    children.push(p(`Data yang bergerak: ${x.dataYangBergerak}`, { after: 200 }));
  }

  children.push(h1('7. Glosarium'));
  for (const [istilah, def] of GLOSARIUM) {
    children.push(h3(istilah));
    children.push(p(def));
  }

  children.push(
    h1('8. Lampiran'),
    p(
      'Untuk daftar lengkap setiap file halaman, komponen, endpoint API, dan nama tabel database, buka berkas Excel `Dokumentasi-Modul-Bedagang-PoS.xlsx` (sheet Halaman, Komponen, API, Tabel_DB) yang dihasilkan dari skrip dokumentasi.',
      { after: 200 }
    )
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });
  const buf = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, buf);
  console.log('Written:', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
