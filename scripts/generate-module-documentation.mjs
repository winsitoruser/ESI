/**
 * Generates Bedagang PoS module documentation (pages, components, API routes, DB tables)
 * as a Word (.docx) file using the project's `docx` dependency.
 *
 * Run: node scripts/generate-module-documentation.mjs
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
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import {
  TABLES_BY_MODULE,
  collectDocumentationData,
  labelForSegment,
} from './lib/module-documentation-shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'Dokumentasi-Modul-Bedagang-PoS.docx');

function chunkLines(items, maxPerLine = 3) {
  const lines = [];
  for (let i = 0; i < items.length; i += maxPerLine) {
    lines.push(items.slice(i, i + maxPerLine).join(' · '));
  }
  return lines;
}

function cellParagraphs(text) {
  if (!text || !text.trim()) return [new Paragraph({ children: [new TextRun('—')] })];
  return text.split('\n').map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line, size: 20 })],
        spacing: { after: 60 },
      })
  );
}

async function main() {
  const { pageFiles, apiFiles, compFiles, pagesBySeg, apiBySeg, compBySeg, orderedSegs } =
    collectDocumentationData();

  const children = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({
          text: 'Dokumentasi Modul — Bedagang PoS / ERP',
          bold: true,
          size: 36,
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Di-generate otomatis: ${new Date().toISOString().slice(0, 10)}`,
          italics: true,
          size: 22,
        }),
      ],
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text:
            'Dokumen ini memetakan halaman Next.js (pages/), komponen React (components/), endpoint API (pages/api/), dan tabel database backend Sequelize (backend/src/models). Endpoint mengikuti konvensi Next.js: file di pages/api/ menjadi rute /api/.... Cakupan pemindaian: aplikasi utama di akar repositori; folder terpisah seperti admin-panel/ atau export/backend/ tidak disertakan kecuali tercermin di pages/ akar.',
          size: 22,
        }),
      ],
      spacing: { after: 300 },
    })
  );

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Ringkasan cakupan', bold: true, size: 28 })],
      spacing: { before: 200, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Halaman (tsx/ts, tanpa api): ${pageFiles.length} file | API route: ${apiFiles.length} file | Komponen: ${compFiles.length} file`,
          size: 22,
        }),
      ],
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Tabel database (Sequelize)', bold: true, size: 28 })],
      spacing: { before: 200, after: 200 },
    })
  );

  for (const [mod, tables] of Object.entries(TABLES_BY_MODULE)) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: mod, bold: true, size: 24 })],
        spacing: { before: 120, after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: tables.join(', '), size: 20 })],
        spacing: { after: 120 },
      })
    );
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Pemetaan per area (folder utama)', bold: true, size: 28 })],
      spacing: { before: 400, after: 200 },
    })
  );

  for (const seg of orderedSegs) {
    const label = labelForSegment(seg);
    const pages = pagesBySeg.get(seg) || [];
    const apis = apiBySeg.get(seg) || [];
    const comps = compBySeg.get(seg) || [];

    if (!pages.length && !apis.length && !comps.length) continue;

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: `${seg || '(root)'} — ${label}`,
            bold: true,
            size: 26,
          }),
        ],
        spacing: { before: 240, after: 120 },
      })
    );

    const tableRows = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 22, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            children: [new Paragraph({ children: [new TextRun({ text: "Halaman (pages/)", bold: true })] })],
          }),
          new TableCell({
            width: { size: 78, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            children: cellParagraphs(
              pages.length ? chunkLines(pages, 2).join('\n') : '— (tidak ada di folder ini)'
            ),
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Komponen (components/...)", bold: true })] })],
          }),
          new TableCell({
            children: cellParagraphs(
              comps.length ? chunkLines(comps, 2).join('\n') : '— (tidak ada prefiks folder ini)'
            ),
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "API (/api/...)", bold: true })] })],
          }),
          new TableCell({
            children: cellParagraphs(
              apis.length ? chunkLines(apis, 1).join('\n') : '— (tidak ada grup API ini)'
            ),
          }),
        ],
      }),
    ];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
      })
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 400 },
      children: [
        new TextRun({
          text:
            'Catatan: Komponen UI bersama (folder components/ui) dipetakan ke segmen nama folder yang sama dengan halaman API bila ada kecocokan; beberapa modul memakai banyak folder (mis. hq, inventory). Tabel tambahan dari migrasi SQL khusus dapat ada di prisma/migrations atau export/backend/migrations — tidak semua tercakup di model Sequelize di atas.',
          italics: true,
          size: 20,
        }),
      ],
    })
  );

  const doc = new Document({ sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, buf);
  console.log('Written:', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
