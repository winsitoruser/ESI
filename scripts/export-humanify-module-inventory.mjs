/**
 * Export Humanify module inventory to Excel + PDF.
 * Source: docs/humanify-module-inventory.md
 *
 * Run: node scripts/export-humanify-module-inventory.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'docs', 'humanify-module-inventory.md');
const XLSX_OUT = path.join(ROOT, 'docs', 'humanify-module-inventory.xlsx');
const PDF_OUT = path.join(ROOT, 'docs', 'pdf', 'humanify-module-inventory.pdf');

const NAVY = 'FF0F3D3E';
const HEADER_FG = 'FFFFFFFF';
const ZEBRA = 'FFF4F7F6';
const ACCENT = 'FF0D7377';

function splitRow(line) {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner.split('|').map((c) => c.trim().replace(/\*\*/g, ''));
}

function isSep(line) {
  return /^\|?\s*:?-{3,}/.test(line.trim());
}

function parseMarkdown(md) {
  const lines = md.split(/\r?\n/);
  let h2 = '';
  let h3 = '';
  const tables = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      h2 = line.replace(/^##\s+/, '').trim();
      h3 = '';
      continue;
    }
    if (line.startsWith('### ')) {
      h3 = line.replace(/^###\s+/, '').trim();
      continue;
    }
    if (line.trim().startsWith('|') && i + 1 < lines.length && isSep(lines[i + 1])) {
      const headers = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && !isSep(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      i--;
      tables.push({ h2, h3, headers, rows });
    }
  }
  return tables;
}

function sheetName(name) {
  return name.replace(/[:\\/?*\[\]]/g, ' ').slice(0, 31);
}

function styleHeader(row) {
  row.font = { bold: true, color: { argb: HEADER_FG }, name: 'Calibri', size: 11 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  row.alignment = { vertical: 'middle', wrapText: true };
  row.height = 22;
}

function addTableSheet(wb, name, headers, rows, extraHeaders = [], extraValues = []) {
  const ws = wb.addWorksheet(sheetName(name), { views: [{ state: 'frozen', ySplit: 1 }] });
  const allHeaders = [...extraHeaders, ...headers];
  ws.columns = allHeaders.map((h, idx) => ({
    header: h,
    key: `c${idx}`,
    width: idx === 0 ? 28 : idx === allHeaders.length - 1 ? 48 : 32,
  }));
  styleHeader(ws.getRow(1));
  rows.forEach((row, rIdx) => {
    const values = [...extraValues.map((fn) => fn(row, rIdx)), ...row];
    const excelRow = ws.addRow(values);
    excelRow.alignment = { wrapText: true, vertical: 'top' };
    if (rIdx % 2 === 1) {
      excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
    }
    excelRow.height = 32;
  });
  if (rows.length) {
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1 + rows.length, column: allHeaders.length },
    };
  }
  ws.getRow(1).eachCell((cell) => {
    cell.border = {
      bottom: { style: 'thin', color: { argb: ACCENT } },
    };
  });
  return ws;
}

async function writeExcel(tables) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Naincode Dev';
  wb.created = new Date();
  wb.title = 'Humanify — Inventaris modul';
  wb.description = 'Halaman, modul, fungsi, API, komponen Humanify HRIS SaaS';

  const cover = wb.addWorksheet('00_Ringkasan');
  cover.columns = [{ width: 28 }, { width: 80 }];
  cover.addRow(['Humanify — Inventaris modul, halaman, fungsi, komponen']).font = {
    bold: true,
    size: 16,
    color: { argb: NAVY },
  };
  cover.addRow(['Sumber', 'docs/humanify-module-inventory.md']);
  cover.addRow(['Cutoff', '8 September 2026']);
  cover.addRow(['Diekspor', new Date().toISOString().slice(0, 10)]);
  cover.addRow([]);
  cover.addRow(['Cara baca']).font = { bold: true };
  cover.addRow([
    '',
    'GA = dijual & di sidebar. Growth+/Enterprise = paket. Lab = flag env. Hidden = ada di kode, IA disembunyikan. Bukan SIMESI.',
  ]).getCell(2).alignment = { wrapText: true };
  cover.addRow([]);
  cover.addRow(['Sheet', 'Isi']).font = { bold: true };

  const sheetIndex = [];
  tables.forEach((t, i) => {
    const label = t.h3 ? `${t.h2} — ${t.h3}` : t.h2;
    const name = `${String(i + 1).padStart(2, '0')}_${(t.h3 || t.h2).replace(/[^\w]+/g, '_').slice(0, 24)}`;
    sheetIndex.push({ t, label, name });
    cover.addRow([name, `${label} (${t.rows.length} baris)`]);
  });

  const combinedHeaders = ['Bagian', 'Subbagian', 'Kolom 1', 'Kolom 2', 'Kolom 3', 'Kolom 4', 'Kolom 5'];
  const combinedRows = [];
  for (const t of tables) {
    for (const row of t.rows) {
      combinedRows.push([t.h2, t.h3 || '—', ...row.slice(0, 5)]);
    }
  }
  addTableSheet(wb, '01_Semua_baris', combinedHeaders, combinedRows);

  sheetIndex.forEach(({ t, name }) => {
    addTableSheet(wb, name, t.headers, t.rows);
  });

  await wb.xlsx.writeFile(XLSX_OUT);
  return { sheets: wb.worksheets.length, rows: combinedRows.length };
}

function drawTable(doc, headers, rows, startY) {
  const margin = 36;
  const pageW = doc.page.width - margin * 2;
  const colCount = headers.length;
  const colW = pageW / colCount;
  const headerH = 18;
  const fontSize = colCount >= 5 ? 7 : 8;
  let y = startY;

  const ensureSpace = (h) => {
    if (y + h > doc.page.height - 42) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  const paintHeader = () => {
    doc.save();
    doc.rect(margin, y, pageW, headerH).fill('#0F3D3E');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(fontSize);
    headers.forEach((h, i) => {
      doc.text(String(h), margin + i * colW + 3, y + 5, { width: colW - 6, ellipsis: true });
    });
    doc.restore();
    y += headerH;
  };

  paintHeader();

  rows.forEach((row, rIdx) => {
    const texts = headers.map((_, i) => String(row[i] ?? ''));
    const heights = texts.map((t) =>
      doc.heightOfString(t, { width: colW - 6, fontSize })
    );
    const rowH = Math.max(16, ...heights) + 8;
    if (ensureSpace(rowH + 4)) paintHeader();
    if (rIdx % 2 === 1) {
      doc.save();
      doc.rect(margin, y, pageW, rowH).fill('#F4F7F6');
      doc.restore();
    }
    doc.fillColor('#1A1A1A').font('Helvetica').fontSize(fontSize);
    const y0 = y;
    texts.forEach((t, i) => {
      doc.text(t, margin + i * colW + 3, y0 + 4, {
        width: colW - 6,
        lineBreak: true,
      });
    });
    y = y0 + rowH;
    doc.x = margin;
    doc.y = y;
  });
  return y + 10;
}

async function writePdf(md, tables) {
  await fs.promises.mkdir(path.dirname(PDF_OUT), { recursive: true });
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    bufferPages: true,
    margins: { top: 36, bottom: 40, left: 36, right: 36 },
    info: {
      Title: 'Humanify — Inventaris modul',
      Author: 'Naincode Inti Teknologi',
      Subject: 'Halaman, modul, fungsi, API, komponen',
    },
  });
  const stream = fs.createWriteStream(PDF_OUT);
  doc.pipe(stream);

  doc.fillColor('#0F3D3E').font('Helvetica-Bold').fontSize(22);
  doc.text('Humanify — Inventaris modul, halaman, fungsi, dan komponen');
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(11).fillColor('#333333');
  doc.text('HRIS SaaS · humanify.id · Naincode Inti Teknologi');
  doc.text('Cutoff kode: 8 September 2026  ·  Diekspor: ' + new Date().toISOString().slice(0, 10));
  doc.moveDown(0.6);
  doc.fontSize(10).fillColor('#444444');
  doc.text(
    'Sumber: docs/humanify-module-inventory.md · sidebar config/humanify-sidebar.config.ts. Status mengikuti GA scope, bukan klaim penjualan. Bukan SIMESI / ESI ERP.',
    { width: doc.page.width - 72 }
  );
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0F3D3E').text('Daftar isi');
  doc.font('Helvetica').fontSize(9).fillColor('#333333');
  tables.forEach((t, i) => {
    const label = t.h3 ? `${t.h2} / ${t.h3}` : t.h2;
    doc.text(`${i + 1}. ${label}  (${t.rows.length} baris)`);
  });

  for (const t of tables) {
    doc.addPage();
    const title = t.h3 ? `${t.h2} — ${t.h3}` : t.h2;
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#0F3D3E').text(title);
    doc.moveDown(0.4);
    drawTable(doc, t.headers, t.rows, doc.y);
  }

  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(8).fillColor('#667');
    doc.text(
      `Humanify module inventory  ·  ${i + 1} / ${pages.count}  ·  Rahasia internal Naincode`,
      36,
      doc.page.height - 28,
      { width: doc.page.width - 72, align: 'left' }
    );
  }

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return { pages: pages.count };
}

async function main() {
  const md = fs.readFileSync(SRC, 'utf8');
  const tables = parseMarkdown(md);
  if (!tables.length) throw new Error('Tidak ada tabel di markdown inventaris');

  const excel = await writeExcel(tables);
  const pdf = await writePdf(md, tables);

  const xlsxStat = fs.statSync(XLSX_OUT);
  const pdfStat = fs.statSync(PDF_OUT);
  console.log(JSON.stringify({
    source: path.relative(ROOT, SRC),
    tables: tables.length,
    excel: { path: path.relative(ROOT, XLSX_OUT), sheets: excel.sheets, rows: excel.rows, bytes: xlsxStat.size },
    pdf: { path: path.relative(ROOT, PDF_OUT), pages: pdf.pages, bytes: pdfStat.size },
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
