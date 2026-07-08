/**
 * Draft-based disciplinary letter rendering — mirrors LetterPreviewPaper / editor WYSIWYG
 */

import fs from 'fs';
import path from 'path';
import {
  VIOLATION_TYPE_LABELS,
  getLetterFontCss,
  getLetterPadding,
  parseDraftContent,
  parseLetterhead,
  parseLetterStyle,
  type DraftContent,
  type LetterFontFamily,
  type LetterheadConfig,
  type LetterStyleConfig,
  type ViolationType,
} from './disciplinary-workflow';

export const DRAFT_LETTER_TYPES = ['warning-letter', 'reprehend-letter', 'termination-letter'] as const;

export interface DisciplinaryLetterRenderData {
  employeeName?: string;
  employeeId?: string;
  position?: string;
  department?: string;
  violationType?: string;
  violationDescription?: string;
  incidentDate?: string;
  expiryDate?: string;
  salutation?: string;
  subject?: string;
  place?: string;
  body?: string;
  closing?: string;
  letterhead?: Partial<LetterheadConfig>;
  style?: Partial<LetterStyleConfig>;
  warningType?: string;
  terminationType?: string;
  effectiveDate?: string;
  reason?: string;
  severanceAmount?: number;
}

export interface DisciplinaryLetterMeta {
  documentNumber: string;
  documentDate: string;
}

export function isDraftBasedLetter(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as DisciplinaryLetterRenderData;
  return Boolean(d.letterhead?.companyName || d.letterhead?.address || d.style?.fontFamily);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtLong(d?: string): string {
  if (!d) return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function violationLabel(raw?: string): string {
  if (!raw) return '-';
  return VIOLATION_TYPE_LABELS[raw as ViolationType] || raw;
}

function resolveLogoDataUrl(logoUrl?: string): string | null {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('data:')) return logoUrl;
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) return logoUrl;
  if (logoUrl.startsWith('/')) {
    const filePath = path.join(process.cwd(), 'public', logoUrl);
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = ext === 'jpg' ? 'jpeg' : ext === 'svg' ? 'svg+xml' : ext;
    return `data:image/${mime};base64,${buf.toString('base64')}`;
  }
  return null;
}

function buildDraftContent(data: DisciplinaryLetterRenderData): DraftContent {
  return parseDraftContent({
    salutation: data.salutation,
    subject: data.subject,
    body: data.body || '',
    closing: data.closing || '',
    place: data.place,
    letterhead: data.letterhead,
    style: data.style,
  });
}

function letterheadHTML(lh: LetterheadConfig, headerColor: string): string {
  const contact = [lh.phone && `Telp: ${lh.phone}`, lh.email, lh.website].filter(Boolean).join(' · ');
  const border = lh.showBorder
    ? `border-bottom:2px solid ${lh.borderColor || '#1e293b'};padding-bottom:1rem;margin-bottom:1.5rem;`
    : 'margin-bottom:1.5rem;';

  const logoImg = lh.logoUrl
    ? `<img src="${escapeHtml(lh.logoUrl)}" alt="Logo" style="width:56px;height:56px;object-fit:contain;flex-shrink:0;" />`
    : lh.logoText
      ? `<div style="width:56px;height:56px;border-radius:8px;background:${lh.borderColor || '#1e293b'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px;flex-shrink:0;">${escapeHtml(lh.logoText.slice(0, 3))}</div>`
      : '';

  const info = `
    <p style="font-size:13pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;margin:0;">${escapeHtml(lh.companyName)}</p>
    ${lh.tagline ? `<p style="font-size:9pt;opacity:0.7;margin:2px 0 0;">${escapeHtml(lh.tagline)}</p>` : ''}
    <p style="font-size:9pt;opacity:0.8;margin:4px 0 0;">${escapeHtml(lh.address)}</p>
    ${contact ? `<p style="font-size:8.5pt;opacity:0.7;margin:2px 0 0;">${escapeHtml(contact)}</p>` : ''}
    ${lh.npwp ? `<p style="font-size:8pt;opacity:0.6;margin:2px 0 0;">NPWP: ${escapeHtml(lh.npwp)}</p>` : ''}
  `;

  if (lh.layout === 'split') {
    return `<div style="${border}"><div style="display:flex;align-items:flex-start;gap:16px;color:${headerColor};">${logoImg}<div style="flex:1;">${info}</div></div></div>`;
  }
  if (lh.layout === 'left') {
    const badge = !lh.logoUrl && lh.logoText
      ? `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${lh.borderColor || '#1e293b'};color:#fff;font-size:10px;font-weight:bold;margin-right:8px;">${escapeHtml(lh.logoText)}</span>`
      : lh.logoUrl ? `<img src="${escapeHtml(lh.logoUrl)}" alt="Logo" style="height:32px;object-fit:contain;margin-right:8px;vertical-align:middle;" />` : '';
    return `<div style="${border}text-align:left;color:${headerColor};">${badge}${info}</div>`;
  }

  const centerLogo = lh.logoUrl
    ? `<img src="${escapeHtml(lh.logoUrl)}" alt="Logo" style="width:40px;height:40px;object-fit:contain;margin:0 auto 8px;display:block;" />`
    : lh.logoText
      ? `<div style="width:40px;height:40px;border-radius:50%;background:${lh.borderColor || '#1e293b'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;margin:0 auto 8px;">${escapeHtml(lh.logoText.slice(0, 2))}</div>`
      : '';
  return `<div style="${border}text-align:center;color:${headerColor};">${centerLogo}${info}</div>`;
}

function formatBodyHtml(body: string, bodyAlign: string): string {
  const blocks = (body || '').replace(/\r\n/g, '\n').split(/\n\n+/);
  return blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    const lines = trimmed.split('\n');
    const nonEmpty = lines.map((l) => l.replace(/\t+/g, ' ').trim()).filter(Boolean);
    const kvLines = nonEmpty.map((l) => parseKeyValueLine(l));
    if (nonEmpty.length >= 2 && kvLines.every(Boolean)) {
      const rows = kvLines.map((kv) =>
        `<div class="kv-row"><span>${escapeHtml(kv!.label)}</span><span>:</span><span>${escapeHtml(kv!.value)}</span></div>`
      ).join('');
      return `<div class="kv">${rows}</div>`;
    }
    return `<p style="text-align:${bodyAlign}">${escapeHtml(trimmed)}</p>`;
  }).join('');
}

/** HTML document matching editor preview — used for print preview API */
export function buildDisciplinaryLetterHTML(data: DisciplinaryLetterRenderData, meta: DisciplinaryLetterMeta): string {
  const dc = buildDraftContent(data);
  const lh = dc.letterhead!;
  const st = dc.style!;
  const fontFamily = getLetterFontCss(st.fontFamily);
  const padding = getLetterPadding(st.density);
  const docDate = fmtLong(meta.documentDate);
  const subject = dc.subject || meta.documentNumber;

  const violationBox = st.showViolationBox && data.violationType
    ? `<div style="margin:16px 0;padding:12px;border-radius:6px;background:${st.accentColor}08;border:1px solid ${st.accentColor}33;font-family:system-ui,sans-serif;font-size:10pt;">
        <p style="font-weight:600;color:${st.accentColor};margin:0 0 4px;">Rincian Pelanggaran</p>
        <p style="margin:2px 0;">Jenis: ${escapeHtml(violationLabel(data.violationType))}</p>
        ${data.incidentDate ? `<p style="margin:2px 0;">Tanggal kejadian: ${escapeHtml(fmtLong(data.incidentDate))}</p>` : ''}
      </div>`
    : '';

  const sigBlock = st.signatureLayout === 'dual'
    ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:32px;font-family:system-ui,sans-serif;font-size:10pt;">
        <div><p style="white-space:pre-line;margin:0 0 64px;">${escapeHtml(st.signerLeftLabel)}</p><p style="border-top:1px solid #9ca3af;padding-top:4px;display:inline-block;min-width:160px;">&nbsp;</p></div>
        <div><p style="white-space:pre-line;margin:0 0 64px;">${escapeHtml(st.signerRightLabel)}</p><p style="border-top:1px solid #9ca3af;padding-top:4px;">${escapeHtml(data.employeeName || '')}</p><p style="color:#6b7280;font-size:9pt;">${escapeHtml(data.employeeId || '')}</p></div>
      </div>`
    : `<div style="display:flex;justify-content:flex-end;margin-top:32px;font-family:system-ui,sans-serif;font-size:10pt;">
        <div style="text-align:right;"><p style="white-space:pre-line;margin:0 0 64px;">${escapeHtml(st.signerRightLabel)}</p><p style="border-top:1px solid #9ca3af;padding-top:4px;display:inline-block;min-width:180px;">${escapeHtml(data.employeeName || '')}</p><p style="color:#6b7280;font-size:9pt;">${escapeHtml(data.employeeId || '')}</p></div>
      </div>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(subject)} - ${escapeHtml(meta.documentNumber)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f3f4f6; padding: 16px; }
    .paper {
      background: #fff; max-width: 210mm; min-height: 297mm; margin: 0 auto;
      font-family: ${fontFamily}; font-size: ${st.fontSize}; line-height: ${st.lineHeight}; color: #111827;
      padding: ${padding}; box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .meta { display: flex; justify-content: space-between; font-size: 10pt; margin-bottom: 24px; font-family: system-ui, sans-serif; }
    .meta .accent { color: ${st.accentColor}; font-weight: 600; }
    .salutation { white-space: pre-line; margin-bottom: 24px; font-size: 10.5pt; }
    .body { margin-bottom: 16px; text-align: ${st.bodyAlign}; }
    .body p { margin: 0 0 12px; text-indent: 2em; white-space: pre-line; }
    .body .kv { margin: 12px 0 12px 1.5em; text-indent: 0; }
    .body .kv-row { display: grid; grid-template-columns: 7.5em 0.75em 1fr; gap: 0 0.4em; margin: 2px 0; text-indent: 0; }
    .closing { white-space: pre-line; margin-bottom: 32px; text-align: ${st.bodyAlign}; }
    @media print {
      body { background: #fff; padding: 0; }
      .paper { box-shadow: none; max-width: none; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="paper">
    ${letterheadHTML(lh, st.headerTextColor)}
    <div class="meta">
      <div>
        <p>Nomor&nbsp;&nbsp;: <span class="accent">${escapeHtml(meta.documentNumber)}</span></p>
        <p>Lampiran: —</p>
        <p>Perihal&nbsp;: ${escapeHtml(subject)}</p>
      </div>
      <p>${escapeHtml(dc.place || 'Jakarta')}, ${escapeHtml(docDate)}</p>
    </div>
    <div class="salutation">${escapeHtml(dc.salutation || `Kepada Yth.\n${data.employeeName || ''}`)}</div>
    <p style="margin-bottom:16px;">Dengan hormat,</p>
    <div class="body">${formatBodyHtml(dc.body, st.bodyAlign)}</div>
    ${violationBox}
    <div class="closing">${escapeHtml(dc.closing)}</div>
    <p style="margin-bottom:64px;">Demikian surat ini disampaikan untuk dapat diperhatikan dan dijadikan pedoman.</p>
    ${sigBlock}
  </div>
  <div class="no-print" style="margin-top:20px;text-align:center;">
    <button onclick="window.print()" style="padding:10px 30px;background:#1e40af;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;">Cetak Surat</button>
  </div>
</body>
</html>`;
}

// ── PDF helpers ──

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || '#000000').replace('#', '');
  if (h.length < 6) return [0, 0, 0];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function pdfFont(family: LetterFontFamily): string {
  return family === 'sans' ? 'helvetica' : 'times';
}

function pdfMargin(density?: string): number {
  if (density === 'compact') return 15;
  if (density === 'relaxed') return 25;
  return 20;
}

function ptSize(fontSize?: string): number {
  const n = parseInt(fontSize || '11', 10);
  return Number.isFinite(n) ? n : 11;
}

function lineSpacing(style: LetterStyleConfig): number {
  return ptSize(style.fontSize) * 0.35 * (style.lineHeight || 1.65);
}

function ensureSpace(doc: any, y: number, needed: number, margin: number, pageHeight: number): number {
  if (y + needed > pageHeight - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

/** Detect "Label : value" / "Label\t: value" rows used in surat body */
function parseKeyValueLine(line: string): { label: string; value: string } | null {
  const cleaned = line.replace(/\t+/g, ' ').trim();
  if (!cleaned) return null;
  const m = cleaned.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s/]{0,24}?)\s*:\s*(.+)$/);
  if (!m) return null;
  const label = m[1].trim();
  if (label.split(/\s+/).length > 4) return null; // too long → prose, not a field
  return { label, value: m[2].trim() };
}

function isKeyValueBlock(lines: string[]): boolean {
  const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);
  if (nonEmpty.length < 2) return false;
  const kvCount = nonEmpty.filter((l) => parseKeyValueLine(l)).length;
  return kvCount >= 2 && kvCount === nonEmpty.length;
}

function writeKeyValueBlock(
  doc: any,
  lines: string[],
  x: number,
  y: number,
  maxWidth: number,
  style: LetterStyleConfig,
  pageHeight: number,
  margin: number,
): number {
  const font = pdfFont(style.fontFamily);
  const size = ptSize(style.fontSize);
  const lh = lineSpacing(style);
  const blockIndent = 8;
  const labelColW = 32; // mm — fixed column so colons align
  const left = x + blockIndent;

  doc.setFont(font, 'normal');
  doc.setFontSize(size);
  doc.setTextColor(17, 24, 39);

  for (const raw of lines) {
    if (!raw.trim()) continue;
    const kv = parseKeyValueLine(raw);
    y = ensureSpace(doc, y, lh + 2, margin, pageHeight);
    if (kv) {
      doc.text(kv.label, left, y);
      doc.text(':', left + labelColW, y);
      const valueLines = doc.splitTextToSize(kv.value, maxWidth - blockIndent - labelColW - 4);
      for (let i = 0; i < valueLines.length; i++) {
        if (i > 0) {
          y += lh;
          y = ensureSpace(doc, y, lh + 2, margin, pageHeight);
        }
        doc.text(valueLines[i], left + labelColW + 4, y);
      }
    } else {
      const wrapped = doc.splitTextToSize(raw.trim(), maxWidth - blockIndent);
      for (const wl of wrapped) {
        doc.text(wl, left, y);
        y += lh;
        y = ensureSpace(doc, y, lh + 2, margin, pageHeight);
      }
      y -= lh;
    }
    y += lh;
  }
  return y + 2;
}

function writeProseParagraph(
  doc: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  style: LetterStyleConfig,
  pageHeight: number,
  margin: number,
  firstLineIndent: boolean,
): number {
  const font = pdfFont(style.fontFamily);
  const size = ptSize(style.fontSize);
  const lh = lineSpacing(style);
  const indentMm = firstLineIndent ? 10 : 0;
  const hangMm = 8; // uraian / continuation lines after soft newline
  doc.setFont(font, 'normal');
  doc.setFontSize(size);
  doc.setTextColor(17, 24, 39);

  const hardLines = text.replace(/\t+/g, ' ').split('\n');
  let isFirstHardLine = true;

  for (const hard of hardLines) {
    if (!hard.trim()) {
      y += lh * 0.35;
      continue;
    }

    if (isFirstHardLine && firstLineIndent) {
      const wrapWidth = maxWidth - indentMm;
      const wrapped = doc.splitTextToSize(hard.trim(), wrapWidth);
      y = ensureSpace(doc, y, wrapped.length * lh + 2, margin, pageHeight);
      for (let i = 0; i < wrapped.length; i++) {
        doc.text(wrapped[i], i === 0 ? x + indentMm : x, y);
        y += lh;
      }
    } else if (!isFirstHardLine) {
      // Soft newline (uraian, quotes, etc.) — slight hang indent, not at margin
      const wrapWidth = maxWidth - hangMm;
      const wrapped = doc.splitTextToSize(hard.trim(), wrapWidth);
      y = ensureSpace(doc, y, wrapped.length * lh + 2, margin, pageHeight);
      for (const wl of wrapped) {
        doc.text(wl, x + hangMm, y);
        y += lh;
      }
    } else {
      const wrapped = doc.splitTextToSize(hard.trim(), maxWidth);
      y = ensureSpace(doc, y, wrapped.length * lh + 2, margin, pageHeight);
      for (const wl of wrapped) {
        doc.text(wl, x, y);
        y += lh;
      }
    }
    isFirstHardLine = false;
  }
  return y + 3;
}

/**
 * Render surat body: prose paragraphs + aligned Nama/Jabatan/Departemen blocks.
 * Fixes jsPDF tab/\n mishandling that made fields and uraian look messy.
 */
function writeParagraphs(
  doc: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  style: LetterStyleConfig,
  pageHeight: number,
  margin: number,
  indent = false,
): number {
  if (!text?.trim()) return y;

  const blocks = text.replace(/\r\n/g, '\n').split(/\n\n+/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const lines = trimmed.split('\n');
    if (isKeyValueBlock(lines)) {
      y = writeKeyValueBlock(doc, lines, x, y, maxWidth, style, pageHeight, margin);
    } else {
      y = writeProseParagraph(doc, trimmed, x, y, maxWidth, style, pageHeight, margin, indent);
    }
  }
  return y;
}

async function renderLetterheadPDF(
  doc: any,
  lh: LetterheadConfig,
  headerColor: string,
  y: number,
  pw: number,
  m: number,
): Promise<number> {
  const rgb = hexToRgb(headerColor);
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const logoData = resolveLogoDataUrl(lh.logoUrl);
  const borderRgb = hexToRgb(lh.borderColor || '#1e293b');
  let startY = y;

  if (lh.layout === 'split') {
    let textX = m;
    if (logoData) {
      try {
        doc.addImage(logoData, 'AUTO', m, y - 2, 18, 18);
        textX = m + 22;
      } catch { /* skip broken logo */ }
    } else if (lh.logoText) {
      doc.setFillColor(borderRgb[0], borderRgb[1], borderRgb[2]);
      doc.roundedRect(m, y - 4, 18, 18, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(lh.logoText.slice(0, 3), m + 9, y + 7, { align: 'center' });
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      textX = m + 22;
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.text(lh.companyName.toUpperCase(), textX, y + 4);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (lh.tagline) { doc.text(lh.tagline, textX, y); y += 3.5; }
    doc.text(lh.address, textX, y, { maxWidth: pw - textX - m }); y += 4;
    const contact = [lh.phone && `Telp: ${lh.phone}`, lh.email, lh.website].filter(Boolean).join(' · ');
    if (contact) { doc.text(contact, textX, y); y += 3.5; }
    if (lh.npwp) { doc.text(`NPWP: ${lh.npwp}`, textX, y); y += 3.5; }
  } else if (lh.layout === 'left') {
    if (logoData) {
      try { doc.addImage(logoData, 'AUTO', m, y - 3, 14, 14); } catch { /* skip */ }
      y += 12;
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.text(lh.companyName.toUpperCase(), m, y + 4);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (lh.tagline) { doc.text(lh.tagline, m, y); y += 3.5; }
    doc.text(lh.address, m, y, { maxWidth: pw - 2 * m }); y += 4;
    const contact = [lh.phone && `Telp: ${lh.phone}`, lh.email, lh.website].filter(Boolean).join(' · ');
    if (contact) { doc.text(contact, m, y); y += 3.5; }
    if (lh.npwp) { doc.text(`NPWP: ${lh.npwp}`, m, y); y += 3.5; }
  } else {
    if (logoData) {
      try { doc.addImage(logoData, 'AUTO', pw / 2 - 7, y - 2, 14, 14); y += 14; } catch { /* skip */ }
    } else if (lh.logoText) {
      doc.setFillColor(borderRgb[0], borderRgb[1], borderRgb[2]);
      doc.circle(pw / 2, y + 4, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(lh.logoText.slice(0, 2), pw / 2, y + 5.5, { align: 'center' });
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      y += 12;
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.text(lh.companyName.toUpperCase(), pw / 2, y + 4, { align: 'center' });
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (lh.tagline) { doc.text(lh.tagline, pw / 2, y, { align: 'center' }); y += 3.5; }
    doc.text(lh.address, pw / 2, y, { align: 'center', maxWidth: pw - 2 * m }); y += 4;
    const contact = [lh.phone && `Telp: ${lh.phone}`, lh.email, lh.website].filter(Boolean).join(' · ');
    if (contact) { doc.text(contact, pw / 2, y, { align: 'center' }); y += 3.5; }
    if (lh.npwp) { doc.text(`NPWP: ${lh.npwp}`, pw / 2, y, { align: 'center' }); y += 3.5; }
  }

  y += 4;
  if (lh.showBorder) {
    doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
    doc.setLineWidth(0.6);
    doc.line(m, y, pw - m, y);
    y += 6;
  } else {
    y += 4;
  }

  doc.setTextColor(0, 0, 0);
  return Math.max(y, startY + 20);
}

function renderSignaturesPDF(
  doc: any,
  data: DisciplinaryLetterRenderData,
  st: LetterStyleConfig,
  y: number,
  pw: number,
  m: number,
  ph: number,
): number {
  y = ensureSpace(doc, y, 55, m, ph);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (st.signatureLayout === 'dual') {
    const half = (pw - 2 * m) / 2;
    const leftLines = st.signerLeftLabel.split('\n');
    const rightLines = st.signerRightLabel.split('\n');
    let ly = y;
    for (const line of leftLines) { doc.text(line, m, ly); ly += 4; }
    let ry = y;
    for (const line of rightLines) { doc.text(line, m + half, ry); ry += 4; }
    const sigY = y + 40;
    doc.line(m, sigY, m + 50, sigY);
    doc.line(m + half, sigY, m + half + 50, sigY);
    doc.text(data.employeeName || '', m + half, sigY + 5);
    if (data.employeeId) {
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(data.employeeId, m + half, sigY + 9);
      doc.setTextColor(0, 0, 0);
    }
    return sigY + 14;
  }

  const rightLines = st.signerRightLabel.split('\n');
  const rightX = pw - m - 55;
  let ry = y;
  for (const line of rightLines) { doc.text(line, rightX, ry); ry += 4; }
  const sigY = y + 40;
  doc.line(rightX, sigY, rightX + 55, sigY);
  doc.text(data.employeeName || '', rightX, sigY + 5);
  if (data.employeeId) {
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(data.employeeId, rightX, sigY + 9);
  }
  return sigY + 14;
}

/** Generate PDF blob from draft editor content — WYSIWYG with editor preview */
export async function generateDraftLetterPDF(
  data: DisciplinaryLetterRenderData,
  meta: DisciplinaryLetterMeta,
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const dc = buildDraftContent(data);
  const lh = parseLetterhead(dc.letterhead);
  const st = parseLetterStyle(dc.style);
  const m = pdfMargin(st.density);
  const pw = 210;
  const ph = 297;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = m;

  y = await renderLetterheadPDF(doc, lh, st.headerTextColor, y, pw, m);

  // Meta block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const docDate = fmtLong(meta.documentDate);
  const subject = dc.subject || meta.documentNumber;
  const accent = hexToRgb(st.accentColor);

  doc.text('Nomor   :', m, y);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(meta.documentNumber, m + 18, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  y += 4;
  doc.text('Lampiran: —', m, y); y += 4;
  doc.text(`Perihal : ${subject}`, m, y);
  doc.text(`${dc.place || 'Jakarta'}, ${docDate}`, pw - m, y - 8, { align: 'right' });
  y += 10;

  // Salutation
  const salutation = dc.salutation || `Kepada Yth.\n${data.employeeName || ''}`;
  const salLines = salutation.split('\n');
  doc.setFontSize(10);
  for (const line of salLines) {
    y = ensureSpace(doc, y, 5, m, ph);
    doc.text(line, m, y);
    y += 4.5;
  }
  y += 4;

  doc.text('Dengan hormat,', m, y);
  y += 8;

  // Body
  y = writeParagraphs(doc, dc.body, m, y, pw - 2 * m, st, ph, m, true);

  // Violation box
  if (st.showViolationBox && data.violationType) {
    y = ensureSpace(doc, y, 20, m, ph);
    const boxH = data.incidentDate ? 18 : 14;
    doc.setFillColor(Math.min(accent[0] + 200, 255), Math.min(accent[1] + 200, 255), Math.min(accent[2] + 200, 255));
    doc.roundedRect(m, y, pw - 2 * m, boxH, 2, 2, 'F');
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.2);
    doc.roundedRect(m, y, pw - 2 * m, boxH, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text('Rincian Pelanggaran', m + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Jenis: ${violationLabel(data.violationType)}`, m + 3, y + 10);
    if (data.incidentDate) {
      doc.text(`Tanggal kejadian: ${fmtLong(data.incidentDate)}`, m + 3, y + 14);
    }
    y += boxH + 4;
  }

  // Closing
  y = writeParagraphs(doc, dc.closing, m, y, pw - 2 * m, st, ph, m);

  y = ensureSpace(doc, y, 10, m, ph);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(ptSize(st.fontSize));
  doc.text('Demikian surat ini disampaikan untuk dapat diperhatikan dan dijadikan pedoman.', m, y, { maxWidth: pw - 2 * m });
  y += 12;

  renderSignaturesPDF(doc, data, st, y, pw, m, ph);

  return doc.output('blob');
}
