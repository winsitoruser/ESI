/**
 * Payslip layout variants for Enterprise document templates.
 * Inspired by common Canva slip-gaji styles (modern blue, minimal, corporate sidebar, etc.)
 * @see https://www.canva.com/id_id/contoh/s/slip-gaji-karyawan/
 */

export type PayslipLayoutId =
  | 'classic-navy'
  | 'modern-blue'
  | 'minimal-mono'
  | 'corporate-sidebar'
  | 'emerald-clean'
  | 'bold-thp';

export interface PayslipLineItem {
  name: string;
  amount: number;
}

export interface PayslipRenderData {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  logoUrl?: string;
  employeeName: string;
  employeeCode: string;
  position: string;
  department: string;
  employmentStatus?: string;
  period: string;
  payDate?: string;
  earnings: PayslipLineItem[];
  deductions: PayslipLineItem[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  intro?: string;
  closing?: string;
  documentNumber?: string;
}

export interface PayslipLayoutVariant {
  id: PayslipLayoutId;
  name: string;
  description: string;
  /** Short tag for gallery chip */
  tag: string;
  /** Primary accent (hex) used in preview thumb + PDF */
  accent: string;
  accentDark: string;
  earnHead: string;
  deductHead: string;
  surface: string;
  ink: string;
  muted: string;
  /** Layout structure hint for renderers */
  structure: 'two-col' | 'stacked' | 'sidebar' | 'thp-first';
}

export const PAYSLIP_LAYOUT_VARIANTS: PayslipLayoutVariant[] = [
  {
    id: 'classic-navy',
    name: 'Klasik Navy',
    description: 'Dua kolom pendapatan/potongan dengan bilah ringkasan navy — gaya slip korporat tradisional.',
    tag: 'Klasik',
    accent: '#003366',
    accentDark: '#001a33',
    earnHead: '#228b22',
    deductHead: '#dc3545',
    surface: '#f5f5fa',
    ink: '#0f172a',
    muted: '#64748b',
    structure: 'two-col',
  },
  {
    id: 'modern-blue',
    name: 'Modern Biru',
    description: 'Header biru penuh + tabel bersih putih — mirip template Canva blue & white modern.',
    tag: 'Modern',
    accent: '#2563eb',
    accentDark: '#1e40af',
    earnHead: '#2563eb',
    deductHead: '#e11d48',
    surface: '#eff6ff',
    ink: '#0f172a',
    muted: '#64748b',
    structure: 'two-col',
  },
  {
    id: 'minimal-mono',
    name: 'Minimalis Mono',
    description: 'Hitam-putih, garis tipis, tanpa fill warna — rapi dan hemat tinta.',
    tag: 'Minimal',
    accent: '#111827',
    accentDark: '#000000',
    earnHead: '#111827',
    deductHead: '#111827',
    surface: '#ffffff',
    ink: '#111827',
    muted: '#6b7280',
    structure: 'stacked',
  },
  {
    id: 'corporate-sidebar',
    name: 'Korporat Sidebar',
    description: 'Strip warna di kiri untuk identitas perusahaan; konten slip di kanan.',
    tag: 'Korporat',
    accent: '#0f766e',
    accentDark: '#115e59',
    earnHead: '#0f766e',
    deductHead: '#b91c1c',
    surface: '#f0fdfa',
    ink: '#134e4a',
    muted: '#5eead4',
    structure: 'sidebar',
  },
  {
    id: 'emerald-clean',
    name: 'Emerald Bersih',
    description: 'Aksen hijau lembut, kartu info karyawan, dan total take-home menonjol.',
    tag: 'Emerald',
    accent: '#059669',
    accentDark: '#047857',
    earnHead: '#059669',
    deductHead: '#dc2626',
    surface: '#ecfdf5',
    ink: '#064e3b',
    muted: '#6b7280',
    structure: 'two-col',
  },
  {
    id: 'bold-thp',
    name: 'Bold Take-Home',
    description: 'Gaji bersih besar di atas (hero), lalu rincian pendapatan & potongan di bawah.',
    tag: 'Bold',
    accent: '#6d28d9',
    accentDark: '#4c1d95',
    earnHead: '#6d28d9',
    deductHead: '#e11d48',
    surface: '#f5f3ff',
    ink: '#1e1b4b',
    muted: '#6b7280',
    structure: 'thp-first',
  },
];

export const DEFAULT_PAYSLIP_LAYOUT: PayslipLayoutId = 'classic-navy';

export function getPayslipLayout(id?: string | null): PayslipLayoutVariant {
  const found = PAYSLIP_LAYOUT_VARIANTS.find((v) => v.id === id);
  return found || PAYSLIP_LAYOUT_VARIANTS[0];
}

export function isPayslipLayoutId(id: unknown): id is PayslipLayoutId {
  return typeof id === 'string' && PAYSLIP_LAYOUT_VARIANTS.some((v) => v.id === id);
}

export const SAMPLE_PAYSLIP_DATA: PayslipRenderData = {
  companyName: 'PT Contoh Sejahtera',
  companyAddress: 'Jl. Sudirman Kav. 52, Jakarta Selatan',
  companyPhone: '+62 21 5550 1234',
  companyEmail: 'hr@contohsejahtera.id',
  employeeName: 'Budi Santoso',
  employeeCode: 'EMP-00124',
  position: 'Staff HR',
  department: 'Human Resources',
  employmentStatus: 'Tetap',
  period: 'Agustus 2026',
  payDate: '31 Agustus 2026',
  earnings: [
    { name: 'Gaji Pokok', amount: 8_500_000 },
    { name: 'Tunj. Jabatan', amount: 1_000_000 },
    { name: 'Tunj. Makan', amount: 750_000 },
  ],
  deductions: [
    { name: 'BPJS Kesehatan', amount: 85_000 },
    { name: 'BPJS JHT', amount: 170_000 },
    { name: 'BPJS JP', amount: 85_000 },
    { name: 'PPh 21', amount: 425_000 },
  ],
  totalEarnings: 10_250_000,
  totalDeductions: 765_000,
  netPay: 9_485_000,
  intro: 'Slip gaji Budi Santoso (NIK EMP-00124) periode Agustus 2026. Bersifat rahasia.',
  closing: 'Simpan slip ini. Ajukan pertanyaan ke HR jika ada selisih.',
  documentNumber: 'PSL-2026-08-00124',
};

function fmtRp(n: number): string {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

function esc(s: string | undefined): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lineRows(items: PayslipLineItem[], negative = false): string {
  if (!items.length) return '<tr><td colspan="2">—</td></tr>';
  return items
    .map(
      (i) =>
        `<tr><td>${esc(i.name)}</td><td class="amt">${negative ? '−' : ''}${fmtRp(i.amount)}</td></tr>`,
    )
    .join('');
}

/**
 * Full HTML document for print / export preview.
 */
export function renderPayslipHtml(
  data: PayslipRenderData,
  layoutId?: string | null,
  opts?: { forPrint?: boolean },
): string {
  const layout = getPayslipLayout(layoutId);
  const a = layout.accent;
  const ad = layout.accentDark;
  const intro = data.intro ? `<p class="intro">${esc(data.intro)}</p>` : '';
  const closing = data.closing ? `<p class="closing">${esc(data.closing)}</p>` : '';
  const logo = data.logoUrl
    ? `<img class="logo" src="${esc(data.logoUrl)}" alt="" />`
    : `<div class="logo-fallback">${esc((data.companyName || 'H').slice(0, 2).toUpperCase())}</div>`;

  const metaGrid = `
    <div class="meta">
      <div><span class="lbl">Nama</span><strong>${esc(data.employeeName)}</strong></div>
      <div><span class="lbl">NIK / NIP</span><strong>${esc(data.employeeCode)}</strong></div>
      <div><span class="lbl">Jabatan</span><strong>${esc(data.position)}</strong></div>
      <div><span class="lbl">Departemen</span><strong>${esc(data.department)}</strong></div>
      <div><span class="lbl">Periode</span><strong>${esc(data.period)}</strong></div>
      <div><span class="lbl">Tgl bayar</span><strong>${esc(data.payDate || '—')}</strong></div>
    </div>`;

  const earnTable = `
    <table class="tbl earn">
      <thead><tr><th>Pendapatan</th><th class="amt">Jumlah</th></tr></thead>
      <tbody>${lineRows(data.earnings)}
        <tr class="sum"><td>Total</td><td class="amt">${fmtRp(data.totalEarnings)}</td></tr>
      </tbody>
    </table>`;

  const dedTable = `
    <table class="tbl ded">
      <thead><tr><th>Potongan</th><th class="amt">Jumlah</th></tr></thead>
      <tbody>${lineRows(data.deductions, true)}
        <tr class="sum"><td>Total</td><td class="amt">−${fmtRp(data.totalDeductions)}</td></tr>
      </tbody>
    </table>`;

  const thpBar = `
    <div class="thp">
      <span>Gaji bersih (Take Home Pay)</span>
      <strong>${fmtRp(data.netPay)}</strong>
    </div>`;

  let bodyInner = '';
  if (layout.structure === 'sidebar') {
    bodyInner = `
      <div class="sidebar-layout">
        <aside class="side">
          ${logo}
          <h1>${esc(data.companyName)}</h1>
          <p>${esc(data.companyAddress || '')}</p>
          <p>${esc([data.companyPhone, data.companyEmail].filter(Boolean).join(' · '))}</p>
          <p class="side-doc">${esc(data.documentNumber || 'SLIP GAJI')}</p>
        </aside>
        <main class="main">
          <h2>Slip Gaji Karyawan</h2>
          ${intro}${metaGrid}
          <div class="cols">${earnTable}${dedTable}</div>
          ${thpBar}${closing}
        </main>
      </div>`;
  } else if (layout.structure === 'thp-first') {
    bodyInner = `
      <header class="hdr band">
        <div class="hdr-left">${logo}<div><h1>${esc(data.companyName)}</h1><p>${esc(data.companyAddress || '')}</p></div></div>
        <div class="hdr-right"><span>Slip Gaji</span><small>${esc(data.documentNumber || '')}</small></div>
      </header>
      ${thpBar}
      ${intro}${metaGrid}
      <div class="cols">${earnTable}${dedTable}</div>
      ${closing}`;
  } else if (layout.structure === 'stacked') {
    bodyInner = `
      <header class="hdr mono">
        <div class="hdr-left">${logo}<div><h1>${esc(data.companyName)}</h1><p>${esc(data.companyAddress || '')}</p></div></div>
        <div class="hdr-right"><span>SLIP GAJI</span><small>${esc(data.period)}</small></div>
      </header>
      ${intro}${metaGrid}
      ${earnTable}${dedTable}
      ${thpBar}${closing}`;
  } else {
    // two-col (classic / modern / emerald)
    const bandClass = layout.id === 'modern-blue' ? 'band' : layout.id === 'emerald-clean' ? 'soft' : '';
    bodyInner = `
      <header class="hdr ${bandClass}">
        <div class="hdr-left">${logo}<div><h1>${esc(data.companyName)}</h1><p>${esc(data.companyAddress || '')}</p></div></div>
        <div class="hdr-right"><span>Slip Gaji</span><small>${esc(data.documentNumber || data.period)}</small></div>
      </header>
      ${intro}${metaGrid}
      <div class="cols">${earnTable}${dedTable}</div>
      ${thpBar}${closing}`;
  }

  const printScript = opts?.forPrint ? '<script>window.onload=function(){window.print()}</script>' : '';

  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"/>
<title>Slip Gaji — ${esc(data.employeeName)} — ${esc(data.period)}</title>
<style>
  :root {
    --accent: ${a}; --accent-dark: ${ad};
    --earn: ${layout.earnHead}; --deduct: ${layout.deductHead};
    --surface: ${layout.surface}; --ink: ${layout.ink}; --muted: ${layout.muted};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px; color: var(--ink);
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    font-size: 12px; background: #e2e8f0;
  }
  .sheet {
    max-width: 720px; margin: 0 auto; background: #fff;
    border-radius: 4px; overflow: hidden;
    box-shadow: 0 8px 24px rgba(15,23,42,.12);
  }
  .pad { padding: 20px 22px 24px; }
  .logo { width: 48px; height: 48px; object-fit: contain; border-radius: 6px; }
  .logo-fallback {
    width: 48px; height: 48px; border-radius: 8px; background: var(--accent);
    color: #fff; display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 14px;
  }
  .hdr { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 2px solid var(--accent); }
  .hdr.band { background: var(--accent); color: #fff; margin: -20px -22px 14px; padding: 18px 22px; border: none; }
  .hdr.band h1, .hdr.band p, .hdr.band span, .hdr.band small { color: #fff !important; }
  .hdr.band .logo-fallback { background: rgba(255,255,255,.2); }
  .hdr.soft { border-bottom-color: var(--accent); background: var(--surface); margin: -20px -22px 14px; padding: 16px 22px; }
  .hdr.mono { border-bottom: 1px solid #111; }
  .hdr-left { display: flex; gap: 12px; align-items: center; }
  .hdr h1 { margin: 0; font-size: 16px; color: var(--accent); }
  .hdr p { margin: 2px 0 0; font-size: 10px; color: var(--muted); }
  .hdr-right { text-align: right; }
  .hdr-right span { display: block; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
  .hdr-right small { color: var(--muted); font-size: 10px; }
  .intro, .closing { font-size: 11px; color: var(--muted); font-style: italic; margin: 0 0 12px; }
  .closing { margin-top: 14px; margin-bottom: 0; }
  .meta {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;
    background: var(--surface); padding: 12px 14px; border-radius: 8px; margin-bottom: 14px;
  }
  .meta .lbl { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
  .meta strong { font-size: 12px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .tbl { width: 100%; border-collapse: collapse; margin: 0 0 8px; }
  .tbl th, .tbl td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
  .tbl th { color: #fff; font-size: 11px; }
  .tbl.earn th { background: var(--earn); }
  .tbl.ded th { background: var(--deduct); }
  .tbl .amt { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .tbl .sum td { font-weight: 700; border-top: 2px solid #e2e8f0; }
  .thp {
    margin-top: 12px; display: flex; justify-content: space-between; align-items: center;
    background: var(--accent-dark); color: #fff; padding: 14px 16px; border-radius: 10px;
  }
  .thp strong { font-size: 18px; font-variant-numeric: tabular-nums; }
  .sidebar-layout { display: grid; grid-template-columns: 180px 1fr; min-height: 480px; }
  .side { background: var(--accent); color: #fff; padding: 20px 16px; }
  .side h1 { font-size: 14px; margin: 12px 0 6px; color: #fff; }
  .side p { font-size: 10px; opacity: .9; margin: 0 0 4px; line-height: 1.4; }
  .side-doc { margin-top: 24px !important; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; font-size: 10px !important; }
  .side .logo-fallback { background: rgba(255,255,255,.2); }
  .main { padding: 20px 22px; }
  .main h2 { margin: 0 0 12px; font-size: 15px; color: var(--accent); }
  .foot-note { margin-top: 16px; font-size: 9px; color: var(--muted); text-align: center; }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; max-width: none; }
  }
  ${layout.id === 'minimal-mono' ? `
    .meta { background: transparent; border: 1px solid #111; border-radius: 0; }
    .tbl th { background: #111 !important; }
    .thp { background: #111; border-radius: 0; }
    .hdr { border-radius: 0; }
  ` : ''}
  ${layout.structure === 'stacked' ? `.cols { display: block; }` : ''}
</style></head>
<body>
  <div class="sheet">${layout.structure === 'sidebar' ? bodyInner : `<div class="pad">${bodyInner}</div>`}
    <p class="foot-note" style="padding:0 22px 16px">Dokumen ini bersifat RAHASIA · Dicetak elektronik · Sah tanpa tanda tangan basah</p>
  </div>
  ${printScript}
</body></html>`;
}

/** Map variant accents for jsPDF payslip body */
export function payslipPdfTheme(layoutId?: string | null): {
  accent: [number, number, number];
  accentDark: [number, number, number];
  earnHead: [number, number, number];
  deductHead: [number, number, number];
  surface: [number, number, number];
  structure: PayslipLayoutVariant['structure'];
} {
  const v = getPayslipLayout(layoutId);
  return {
    accent: hexToRgb(v.accent),
    accentDark: hexToRgb(v.accentDark),
    earnHead: hexToRgb(v.earnHead),
    deductHead: hexToRgb(v.deductHead),
    surface: hexToRgb(v.surface),
    structure: v.structure,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
