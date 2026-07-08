#!/usr/bin/env node
/**
 * Smoke + stress test: disciplinary letter draft → PDF/HTML render
 * Run: node scripts/test-disciplinary-letter-pdf.js
 */

const path = require('path');

const SAMPLE_DRAFT = {
  salutation: 'Kepada Yth.\nBudi Santoso\nStaff IT\nDepartemen Teknologi',
  subject: 'SURAT PERINGATAN PERTAMA (SP-I)',
  body: `Berdasarkan hasil pemeriksaan internal, dengan ini PT Naincode Inti Teknologi menerbitkan Surat Peringatan Pertama kepada karyawan yang bersangkutan.

Pada tanggal 15 Juni 2026, Saudara/i terbukti melakukan pelanggaran kedisiplinan berupa keterlambatan berulang tanpa pemberitahuan yang sah.

Pelanggaran ini melanggar Peraturan Perusahaan Pasal 12 ayat (3) dan mengganggu ketertiban kerja.`,
  closing: 'Surat Peringatan ini berlaku selama 6 (enam) bulan. Apabila pelanggaran terulang, perusahaan akan menerbitkan SP-II atau tindakan lebih lanjut.',
  place: 'Jakarta',
  letterhead: {
    companyName: 'PT Naincode Inti Teknologi',
    tagline: 'People & Workforce Platform',
    address: 'Jl. Sudirman Kav. 52, Jakarta Selatan 12190',
    phone: '(021) 1234-5678',
    email: 'hr@naincode.com',
    website: 'www.naincode.com',
    npwp: '01.234.567.8-901.000',
    logoText: 'NI',
    layout: 'split',
    showBorder: true,
    borderColor: '#1e293b',
  },
  style: {
    fontFamily: 'serif',
    fontSize: '11pt',
    lineHeight: 1.65,
    bodyAlign: 'justify',
    accentColor: '#1e40af',
    headerTextColor: '#0f172a',
    showViolationBox: true,
    density: 'normal',
    signatureLayout: 'dual',
    signerLeftLabel: 'Mengetahui,\nManajer HRD',
    signerRightLabel: 'Yang Bersangkutan,\nKaryawan',
  },
};

const LETTER_DATA = {
  employeeName: 'Budi Santoso',
  employeeId: 'EMP-001',
  position: 'Staff IT',
  department: 'Teknologi',
  violationType: 'attendance',
  incidentDate: '2026-06-15',
  ...SAMPLE_DRAFT,
};

const META = {
  documentNumber: 'SP1/0001/HR/2026',
  documentDate: '2026-07-08',
};

let passed = 0;
let failed = 0;

function ok(msg) { passed++; console.log(`  ✓ ${msg}`); }
function fail(msg, detail) { failed++; console.log(`  ✗ ${msg}${detail ? ` — ${detail}` : ''}`); }

async function main() {
  console.log('\n=== Disciplinary Letter PDF — Smoke & Stress Test ===\n');

  const render = require(path.join(__dirname, '../lib/hris/disciplinary-letter-render.ts'));
  // ts-node may not work — use dynamic import via compiled path or tsx
  let mod;
  try {
    mod = await import('../lib/hris/disciplinary-letter-render');
  } catch {
    try {
      require('tsx/cjs');
      mod = require('../lib/hris/disciplinary-letter-render.ts');
    } catch (e) {
      fail('module load', e.message);
      process.exit(1);
    }
  }

  const {
    isDraftBasedLetter,
    buildDisciplinaryLetterHTML,
    generateDraftLetterPDF,
  } = mod;

  // Smoke: detection
  if (isDraftBasedLetter(LETTER_DATA)) ok('isDraftBasedLetter detects draft data');
  else fail('isDraftBasedLetter detects draft data');
  if (!isDraftBasedLetter({ employeeName: 'x' })) ok('isDraftBasedLetter rejects plain data');
  else fail('isDraftBasedLetter rejects plain data');

  // Smoke: HTML
  const html = buildDisciplinaryLetterHTML(LETTER_DATA, META);
  if (html.includes('PT Naincode Inti Teknologi')) ok('HTML contains company name from letterhead');
  else fail('HTML contains company name from letterhead');
  if (html.includes('SURAT PERINGATAN PERTAMA')) ok('HTML contains subject/perihal');
  else fail('HTML contains subject/perihal');
  if (html.includes('Budi Santoso')) ok('HTML contains employee name');
  else fail('HTML contains employee name');
  if (html.includes('Rincian Pelanggaran')) ok('HTML contains violation box');
  else fail('HTML contains violation box');
  if (html.includes('Demikian surat ini disampaikan')) ok('HTML contains closing paragraph');
  else fail('HTML contains closing paragraph');
  if (!html.includes('INVOICE')) ok('HTML does not use generic invoice template');
  else fail('HTML does not use generic invoice template');

  // Smoke: PDF
  try {
    const blob = await generateDraftLetterPDF(LETTER_DATA, META);
    if (blob && blob.size > 2000) ok(`PDF generated (${blob.size} bytes)`);
    else fail('PDF generated', `size=${blob?.size}`);
  } catch (e) {
    fail('PDF generated', e.message);
  }

  // Stress: multiple PDF generations
  const STRESS_COUNT = 20;
  const t0 = Date.now();
  let stressOk = 0;
  for (let i = 0; i < STRESS_COUNT; i++) {
    try {
      const data = {
        ...LETTER_DATA,
        body: LETTER_DATA.body + `\n\nParagraf stress test #${i + 1} dengan teks tambahan untuk menguji page break dan rendering berulang.`,
      };
      const blob = await generateDraftLetterPDF(data, { ...META, documentNumber: `SP1/${String(i + 1).padStart(4, '0')}/HR/2026` });
      if (blob.size > 1000) stressOk++;
    } catch { /* count as fail */ }
  }
  const elapsed = Date.now() - t0;
  if (stressOk === STRESS_COUNT) ok(`Stress: ${STRESS_COUNT} PDFs in ${elapsed}ms (${(elapsed / STRESS_COUNT).toFixed(0)}ms avg)`);
  else fail(`Stress: ${stressOk}/${STRESS_COUNT} PDFs in ${elapsed}ms`);

  // Layout variants
  for (const layout of ['centered', 'left', 'split']) {
    try {
      const blob = await generateDraftLetterPDF(
        { ...LETTER_DATA, letterhead: { ...LETTER_DATA.letterhead, layout } },
        META,
      );
      if (blob.size > 1000) ok(`PDF layout "${layout}"`);
      else fail(`PDF layout "${layout}"`, 'too small');
    } catch (e) {
      fail(`PDF layout "${layout}"`, e.message);
    }
  }

  console.log(`\n--- Result: ${passed} passed, ${failed} failed ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
