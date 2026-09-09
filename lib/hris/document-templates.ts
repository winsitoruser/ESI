/**
 * HR document template catalog + persistence in tenant settings JSON.
 * Used by Enterprise settings, PDF/HTML generation, and disciplinary letters.
 */
import type { LetterheadConfig, LetterStyleConfig, DraftContent } from '@/lib/hris/disciplinary-workflow';
import {
  DEFAULT_LETTERHEAD,
  DEFAULT_LETTER_STYLE,
  parseLetterhead,
  parseLetterStyle,
} from '@/lib/hris/disciplinary-workflow';
import { applyMergeFields, buildMergeContext, mergeLetterTexts, type LetterMergeContext } from '@/lib/hris/letter-merge-fields';
import type { TenantBranding } from '@/lib/saas/humanify-branding';
import { getTenantBranding } from '@/lib/saas/humanify-branding';
import { parseTenantSettings, getTenantColumns } from '@/lib/saas/tenant-schema';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type HrDocumentKind = 'letter' | 'contract' | 'report' | 'payslip';

export interface HrTemplateCatalogItem {
  type: string;
  name: string;
  description: string;
  kind: HrDocumentKind;
  category: 'kontrak' | 'surat' | 'disiplin' | 'laporan' | 'payroll';
  documentType?: string;
}

export interface HrDocumentTemplate {
  type: string;
  name: string;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
  place: string;
  useGlobalLetterhead: boolean;
  letterhead?: Partial<LetterheadConfig>;
  style?: Partial<LetterStyleConfig>;
  updatedAt?: string;
}

export const HR_TEMPLATE_CATALOG: HrTemplateCatalogItem[] = [
  { type: 'employment-contract', name: 'Kontrak kerja PKWT', description: 'Perjanjian kerja waktu tertentu', kind: 'contract', category: 'kontrak', documentType: 'employment-contract' },
  { type: 'employment-contract-pkwtt', name: 'Kontrak kerja PKWTT', description: 'Perjanjian kerja waktu tidak tertentu (tetap)', kind: 'contract', category: 'kontrak', documentType: 'employment-contract' },
  { type: 'employment-contract-magang', name: 'Perjanjian magang', description: 'Perjanjian pemagangan', kind: 'contract', category: 'kontrak', documentType: 'employment-contract' },
  { type: 'offer-letter', name: 'Offer letter', description: 'Surat penawaran kerja', kind: 'letter', category: 'kontrak' },
  { type: 'nda', name: 'NDA / kerahasiaan', description: 'Perjanjian kerahasiaan karyawan', kind: 'contract', category: 'kontrak' },
  { type: 'paklaring', name: 'Paklaring', description: 'Surat pengalaman kerja', kind: 'letter', category: 'surat', documentType: 'reference-letter' },
  { type: 'reference-letter', name: 'Surat keterangan kerja', description: 'Surat referensi / keterangan pernah bekerja', kind: 'letter', category: 'surat', documentType: 'reference-letter' },
  { type: 'employee-certificate', name: 'Surat keterangan karyawan', description: 'Keterangan masih bekerja', kind: 'letter', category: 'surat', documentType: 'employee-certificate' },
  { type: 'mutation-letter', name: 'Surat mutasi', description: 'SK mutasi / rotasi / promosi', kind: 'letter', category: 'surat', documentType: 'mutation-letter' },
  { type: 'warning-letter', name: 'Surat peringatan (SP)', description: 'SP1 / SP2 / SP3', kind: 'letter', category: 'disiplin', documentType: 'warning-letter' },
  { type: 'reprehend-letter', name: 'Surat teguran', description: 'Teguran tertulis sebelum SP', kind: 'letter', category: 'disiplin', documentType: 'reprehend-letter' },
  { type: 'termination-letter', name: 'Surat PHK', description: 'Pemutusan hubungan kerja', kind: 'letter', category: 'disiplin', documentType: 'termination-letter' },
  { type: 'kpi-report', name: 'Laporan KPI', description: 'Kop & pengantar laporan KPI', kind: 'report', category: 'laporan', documentType: 'kpi-report' },
  { type: 'attendance-report', name: 'Laporan kehadiran', description: 'Pengantar rekap absensi', kind: 'report', category: 'laporan', documentType: 'attendance-report' },
  { type: 'leave-report', name: 'Laporan cuti', description: 'Pengantar rekap cuti', kind: 'report', category: 'laporan', documentType: 'leave-report' },
  { type: 'payroll-summary', name: 'Rekap payroll', description: 'Pengantar rekap penggajian', kind: 'report', category: 'payroll', documentType: 'payroll-summary' },
  { type: 'payslip', name: 'Slip gaji', description: 'Catatan kaki / pengantar slip', kind: 'payslip', category: 'payroll', documentType: 'payslip' },
  { type: 'travel-expense-claim', name: 'Klaim perjalanan dinas', description: 'Formulir klaim biaya dinas', kind: 'report', category: 'laporan', documentType: 'travel-expense-claim' },
];

const DEFAULT_BODIES: Record<string, Pick<HrDocumentTemplate, 'subject' | 'salutation' | 'body' | 'closing' | 'place'>> = {
  'employment-contract': {
    subject: 'PERJANJIAN KERJA WAKTU TERTENTU (PKWT)',
    salutation: 'Yang bertanda tangan di bawah ini:',
    place: 'Jakarta',
    body: `PIHAK PERTAMA:
Nama perusahaan : {{company_name}}
Alamat          : {{company_address}}

PIHAK KEDUA:
Nama            : {{employee_name}}
NIK / NIP       : {{employee_code}}
Jabatan         : {{position}}
Departemen      : {{department}}
Alamat          : {{employee_address}}

Kedua belah pihak sepakat mengikatkan diri dalam Perjanjian Kerja Waktu Tertentu dengan ketentuan:

Pasal 1 — Jenis dan jangka waktu
Jenis perjanjian adalah {{contract_type}}. Perjanjian berlaku mulai {{join_date}} sampai dengan {{end_date}}.

Pasal 2 — Posisi dan tugas
PIHAK KEDUA diangkat pada jabatan {{position}} di departemen {{department}} dan wajib melaksanakan tugas sesuai uraian pekerjaan serta peraturan perusahaan.

Pasal 3 — Pengupahan
PIHAK PERTAMA membayar upah pokok sebesar {{salary}} per bulan, ditambah tunjangan sesuai kebijakan perusahaan yang berlaku, dipotong pajak dan iuran sesuai ketentuan.

Pasal 4 — Kewajiban
PIHAK KEDUA wajib mematuhi Peraturan Perusahaan, menjaga kerahasiaan, dan tidak melakukan perbuatan yang merugikan perusahaan.

Pasal 5 — Berakhirnya perjanjian
Perjanjian berakhir pada tanggal {{end_date}}, atau lebih awal sesuai UU Ketenagakerjaan dan Peraturan Perusahaan.`,
    closing: 'Demikian perjanjian ini dibuat dalam rangkap 2 (dua) yang mempunyai kekuatan hukum yang sama, ditandatangani para pihak dengan penuh kesadaran.',
  },
  'employment-contract-pkwtt': {
    subject: 'PERJANJIAN KERJA WAKTU TIDAK TERTENTU (PKWTT)',
    salutation: 'Yang bertanda tangan di bawah ini:',
    place: 'Jakarta',
    body: `PIHAK PERTAMA: {{company_name}}
PIHAK KEDUA   : {{employee_name}} (NIK {{employee_code}}), jabatan {{position}}, departemen {{department}}.

Para pihak sepakat mengikatkan diri dalam Perjanjian Kerja Waktu Tidak Tertentu (karyawan tetap) terhitung {{join_date}}, dengan upah pokok {{salary}} per bulan.

PIHAK KEDUA wajib mematuhi Peraturan Perusahaan. Hubungan kerja dapat berakhir sesuai Undang-Undang Ketenagakerjaan.`,
    closing: 'Demikian perjanjian ini dibuat untuk dilaksanakan dengan itikad baik oleh kedua belah pihak.',
  },
  'employment-contract-magang': {
    subject: 'PERJANJIAN PEMAGANGAN',
    salutation: 'Yang bertanda tangan di bawah ini:',
    place: 'Jakarta',
    body: `{{company_name}} menerima {{employee_name}} (NIK {{employee_code}}) sebagai peserta magang pada departemen {{department}} jabatan {{position}}, terhitung {{join_date}} sampai {{end_date}}.

Peserta magang wajib mengikuti aturan perusahaan. Uang saku / fasilitas diatur terpisah sesuai kebijakan intern.`,
    closing: 'Demikian perjanjian pemagangan ini dibuat untuk diketahui dan dilaksanakan.',
  },
  'offer-letter': {
    subject: 'SURAT PENAWARAN KERJA',
    salutation: 'Kepada Yth.\n{{employee_name}}',
    place: 'Jakarta',
    body: `Dengan hormat,

{{company_name}} dengan ini menawarkan posisi {{position}} di departemen {{department}} kepada Saudara/i {{employee_name}}.

Tanggal mulai kerja: {{join_date}}
Jenis perjanjian    : {{contract_type}}
Upah pokok          : {{salary}}

Mohon konfirmasi penerimaan penawaran ini secara tertulis. Setelah diterima, HR akan menyiapkan perjanjian kerja resmi.`,
    closing: 'Kami berharap dapat bekerja sama. Terima kasih.',
  },
  nda: {
    subject: 'PERJANJIAN KERAHASIAAN (NDA)',
    salutation: 'Yang bertanda tangan di bawah ini:',
    place: 'Jakarta',
    body: `{{employee_name}} (NIK {{employee_code}}) selaku karyawan {{company_name}} berjanji menjaga kerahasiaan data, dokumen, rahasia dagang, dan informasi internal perusahaan, baik selama maupun setelah hubungan kerja berakhir, kecuali diwajibkan oleh peraturan perundang-undangan.`,
    closing: 'Pelanggaran atas perjanjian ini dapat dikenai sanksi sesuai Peraturan Perusahaan dan ketentuan hukum yang berlaku.',
  },
  paklaring: {
    subject: 'SURAT PENGALAMAN KERJA (PAKLARING)',
    salutation: 'Yang bertanda tangan di bawah ini, mewakili {{company_name}}, menerangkan bahwa:',
    place: 'Jakarta',
    body: `Nama            : {{employee_name}}
NIK / NIP       : {{employee_code}}
Jabatan terakhir: {{position}}
Departemen      : {{department}}

adalah benar pernah bekerja di {{company_name}} terhitung {{join_date}} sampai dengan {{end_date}}.

Selama masa kerja, yang bersangkutan menjalankan tugas dengan baik. Surat ini diberikan untuk keperluan yang bersangkutan.`,
    closing: 'Demikian surat pengalaman kerja ini dibuat dengan sebenar-benarnya.',
  },
  'reference-letter': {
    subject: 'SURAT KETERANGAN KERJA',
    salutation: 'Yang bertanda tangan di bawah ini menerangkan bahwa:',
    place: 'Jakarta',
    body: `Nama       : {{employee_name}}
NIK        : {{employee_code}}
Jabatan    : {{position}}
Departemen : {{department}}
Bergabung  : {{join_date}}

adalah benar karyawan {{company_name}}. Surat keterangan ini dibuat untuk keperluan yang bersangkutan.`,
    closing: 'Demikian surat ini dibuat untuk dipergunakan sebagaimana mestinya.',
  },
  'employee-certificate': {
    subject: 'SURAT KETERANGAN KARYAWAN',
    salutation: 'Yang bertanda tangan di bawah ini menerangkan bahwa:',
    place: 'Jakarta',
    body: `Nama       : {{employee_name}}
NIK        : {{employee_code}}
Jabatan    : {{position}}
Departemen : {{department}}

adalah benar karyawan aktif {{company_name}} hingga tanggal surat ini ({{letter_date}}).`,
    closing: 'Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.',
  },
  'mutation-letter': {
    subject: 'SURAT KEPUTUSAN MUTASI',
    salutation: 'Kepada Yth.\n{{employee_name}}\n{{position}} — {{department}}',
    place: 'Jakarta',
    body: `Berdasarkan kebutuhan organisasi, dengan ini {{company_name}} menetapkan mutasi/penugasan atas:

Nama : {{employee_name}}
NIK  : {{employee_code}}

Efektif tanggal {{effective_date}}. Yang bersangkutan wajib melakukan serah terima tugas dengan tertib.`,
    closing: 'Demikian surat keputusan ini disampaikan untuk dilaksanakan.',
  },
  'warning-letter': {
    subject: 'SURAT PERINGATAN {{warning_type}}',
    salutation: 'Kepada Yth.\n{{employee_name}}\n{{position}}\n{{department}}',
    place: 'Jakarta',
    body: `Berdasarkan hasil pemeriksaan, dengan ini {{company_name}} menerbitkan Surat Peringatan {{warning_type}} kepada:

Nama       : {{employee_name}}
NIK        : {{employee_code}}
Jabatan    : {{position}}
Departemen : {{department}}

Karena telah melakukan pelanggaran {{violation_type}} pada tanggal {{incident_date}}, dengan uraian:
{{violation_description}}

Pelanggaran ini bertentangan dengan Peraturan Perusahaan. Surat berlaku sampai {{expiry_date}}.`,
    closing: 'Apabila pelanggaran terulang, perusahaan berhak mengambil tindakan lebih tegas sesuai prosedur HR dan peraturan perundang-undangan.',
  },
  'reprehend-letter': {
    subject: 'SURAT TEGURAN',
    salutation: 'Kepada Yth.\n{{employee_name}}\n{{position}}',
    place: 'Jakarta',
    body: `Menindaklanjuti temuan disiplin, dengan ini kami sampaikan Surat Teguran kepada Saudara/i {{employee_name}} terkait {{violation_type}}.

Pada tanggal {{incident_date}}, Saudara/i terbukti melakukan:
{{violation_description}}

Teguran ini menjadi peringatan awal agar tidak terulang.`,
    closing: 'Kami harapkan perbaikan sikap. Pelanggaran berulang dapat mengakibatkan Surat Peringatan (SP) sesuai prosedur HR.',
  },
  'termination-letter': {
    subject: 'SURAT PEMUTUSAN HUBUNGAN KERJA',
    salutation: 'Kepada Yth.\n{{employee_name}}\n{{position}} — {{department}}',
    place: 'Jakarta',
    body: `Dengan ini {{company_name}} memberitahukan bahwa hubungan kerja dengan Saudara/i {{employee_name}} (NIK {{employee_code}}) dinyatakan berakhir efektif {{effective_date}}.

Hal ini didasarkan pada:
{{violation_description}}

Hak-hak karyawan akan diselesaikan sesuai ketentuan yang berlaku.`,
    closing: 'Demikian surat ini disampaikan untuk dapat diperhatikan.',
  },
  'kpi-report': {
    subject: 'LAPORAN PENCAPAIAN KPI',
    salutation: '',
    place: 'Jakarta',
    body: `Laporan KPI periode {{kpi_period}} untuk {{employee_name}} ({{position}}, {{department}}). Skor: {{kpi_score}}.

Rincian indikator terlampir pada tabel berikut. Gunakan kop dan logo perusahaan yang sama pada setiap halaman.`,
    closing: 'Laporan ini dicetak dari Humanify dan menjadi bagian evaluasi kinerja.',
  },
  'attendance-report': {
    subject: 'LAPORAN KEHADIRAN KARYAWAN',
    salutation: '',
    place: 'Jakarta',
    body: `Rekap kehadiran {{company_name}} periode {{kpi_period}}. Data di bawah merangkum kehadiran, keterlambatan, dan ketidakhadiran sesuai modul absensi.`,
    closing: 'Laporan ini sah digunakan untuk keperluan operasional HR.',
  },
  'leave-report': {
    subject: 'LAPORAN CUTI KARYAWAN',
    salutation: '',
    place: 'Jakarta',
    body: `Rekap pengambilan cuti {{company_name}} periode {{kpi_period}}.`,
    closing: 'Laporan ini sah digunakan untuk keperluan operasional HR.',
  },
  'payroll-summary': {
    subject: 'REKAP PENGGAJIAN',
    salutation: '',
    place: 'Jakarta',
    body: `Rekap penggajian {{company_name}} periode {{kpi_period}}. Dokumen ini bersifat rahasia.`,
    closing: 'Dicetak dari Humanify. Jangan bagikan kepada pihak yang tidak berwenang.',
  },
  payslip: {
    subject: 'SLIP GAJI KARYAWAN',
    salutation: '',
    place: 'Jakarta',
    body: `Slip gaji {{employee_name}} (NIK {{employee_code}}) periode {{kpi_period}}. Bersifat rahasia.`,
    closing: 'Simpan slip ini. Ajukan pertanyaan ke HR jika ada selisih.',
  },
  'travel-expense-claim': {
    subject: 'FORMULIR KLAIM PERJALANAN DINAS',
    salutation: 'Kepada Yth. Bagian Keuangan / HR',
    place: 'Jakarta',
    body: `Dengan ini {{employee_name}} (NIK {{employee_code}}, {{position}}) mengajukan klaim biaya perjalanan dinas sesuai rincian terlampir.`,
    closing: 'Mohon diproses sesuai kebijakan reimbursement perusahaan.',
  },
};

export const SAMPLE_MERGE_CONTEXT: LetterMergeContext = {
  employee_name: 'Budi Santoso',
  employee_code: 'EMP-00124',
  position: 'Staff HR',
  department: 'Human Resources',
  company_name: 'PT Contoh Sejahtera',
  company_address: 'Jl. Sudirman Kav. 52, Jakarta Selatan',
  letter_number: 'HR/SP/2026/014',
  letter_date: '9 September 2026',
  incident_date: '1 September 2026',
  expiry_date: '9 Maret 2027',
  violation_type: 'Kedisiplinan',
  violation_description: 'Terlambat masuk kerja sebanyak 5 kali dalam satu bulan tanpa keterangan sah.',
  effective_date: '15 September 2026',
  join_date: '1 Januari 2024',
  end_date: '31 Desember 2026',
  contract_type: 'PKWT',
  salary: 'Rp 8.500.000',
  employee_address: 'Jl. Melati No. 10, Jakarta',
  kpi_period: 'Agustus 2026',
  kpi_score: '86 / 100',
  warning_type: 'SP1',
};

export function getCatalogItem(type: string): HrTemplateCatalogItem | undefined {
  return HR_TEMPLATE_CATALOG.find((c) => c.type === type);
}

export function defaultTemplateFor(type: string): HrDocumentTemplate {
  const cat = getCatalogItem(type);
  const body = DEFAULT_BODIES[type] || DEFAULT_BODIES['reference-letter'];
  return {
    type,
    name: cat?.name || type,
    subject: body.subject,
    salutation: body.salutation,
    body: body.body,
    closing: body.closing,
    place: body.place,
    useGlobalLetterhead: true,
  };
}

export function sanitizeHrTemplate(raw: unknown, fallbackType: string): HrDocumentTemplate {
  const base = defaultTemplateFor(fallbackType);
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  return {
    type: String(o.type || fallbackType).slice(0, 80),
    name: String(o.name || base.name).trim().slice(0, 160) || base.name,
    subject: String(o.subject ?? base.subject).slice(0, 240),
    salutation: String(o.salutation ?? base.salutation).slice(0, 800),
    body: String(o.body ?? base.body).slice(0, 40_000),
    closing: String(o.closing ?? base.closing).slice(0, 4_000),
    place: String(o.place ?? base.place).slice(0, 80),
    useGlobalLetterhead: o.useGlobalLetterhead !== false,
    letterhead: o.letterhead && typeof o.letterhead === 'object' ? (o.letterhead as Partial<LetterheadConfig>) : undefined,
    style: o.style && typeof o.style === 'object' ? (o.style as Partial<LetterStyleConfig>) : undefined,
    updatedAt: o.updatedAt ? String(o.updatedAt) : undefined,
  };
}

export function letterheadFromBranding(branding: TenantBranding, companyFallback = 'Perusahaan'): LetterheadConfig {
  const initials = (branding.logoText || branding.companyName || companyFallback)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return parseLetterhead({
    ...DEFAULT_LETTERHEAD,
    companyName: branding.companyName || companyFallback,
    tagline: branding.tagline || DEFAULT_LETTERHEAD.tagline,
    address: branding.address || DEFAULT_LETTERHEAD.address,
    phone: branding.phone || DEFAULT_LETTERHEAD.phone,
    email: branding.email || DEFAULT_LETTERHEAD.email,
    website: branding.website || DEFAULT_LETTERHEAD.website,
    npwp: branding.npwp || DEFAULT_LETTERHEAD.npwp,
    logoText: branding.logoText || initials || DEFAULT_LETTERHEAD.logoText,
    logoUrl: branding.logoUrl || undefined,
    layout: branding.letterheadLayout || 'split',
  });
}

export function applyBrandingToLetterhead(
  letterhead: Partial<LetterheadConfig> | undefined,
  branding: TenantBranding,
  companyFallback?: string,
): LetterheadConfig {
  const global = letterheadFromBranding(branding, companyFallback);
  const merged = parseLetterhead({ ...global, ...(letterhead || {}) });
  if (!merged.logoUrl && branding.logoUrl) merged.logoUrl = branding.logoUrl;
  if (!merged.companyName && branding.companyName) merged.companyName = branding.companyName;
  return merged;
}

export function templateToDraft(
  template: HrDocumentTemplate,
  branding: TenantBranding,
  context?: LetterMergeContext,
): DraftContent {
  const texts = context
    ? mergeLetterTexts({
      subject: template.subject,
      salutation: template.salutation,
      body: template.body,
      closing: template.closing,
    }, context)
    : template;
  const letterhead = template.useGlobalLetterhead
    ? letterheadFromBranding(branding, String(context?.company_name || branding.companyName || 'Perusahaan'))
    : applyBrandingToLetterhead(template.letterhead, branding, String(context?.company_name || ''));
  return {
    subject: texts.subject || template.subject,
    salutation: texts.salutation || template.salutation,
    body: texts.body || template.body,
    closing: texts.closing || template.closing,
    place: context ? applyMergeFields(template.place, context) : template.place,
    letterhead,
    style: parseLetterStyle(template.style || DEFAULT_LETTER_STYLE),
  };
}

export function disciplinaryTemplateType(letterType: string): string {
  const t = String(letterType || '').toUpperCase();
  if (t === 'TEGURAN') return 'reprehend-letter';
  if (t === 'TERMINATION') return 'termination-letter';
  return 'warning-letter';
}

export function templateTypeForDocument(docType: string, data?: Record<string, unknown>): string {
  const explicit = String(data?.templateType || '').trim();
  if (explicit && getCatalogItem(explicit)) return explicit;
  if (docType === 'employment-contract') {
    const t = String(data?.contractType || '').toUpperCase();
    if (t === 'PKWTT') return 'employment-contract-pkwtt';
    if (t === 'MAGANG' || t === 'INTERNSHIP') return 'employment-contract-magang';
    return 'employment-contract';
  }
  if (docType === 'reference-letter') {
    const kind = String(data?.kind || data?.docType || '').toLowerCase();
    if (kind === 'paklaring') return 'paklaring';
  }
  if (getCatalogItem(docType)) return docType;
  return docType;
}

export async function listHrTemplates(tenantId: string): Promise<HrDocumentTemplate[]> {
  const stored = await readStoredTemplates(tenantId);
  return HR_TEMPLATE_CATALOG.map((c) => stored[c.type] || defaultTemplateFor(c.type));
}

export async function getHrTemplate(tenantId: string, type: string): Promise<HrDocumentTemplate> {
  const stored = await readStoredTemplates(tenantId);
  return stored[type] || defaultTemplateFor(type);
}

export async function saveHrTemplate(tenantId: string, patch: Partial<HrDocumentTemplate> & { type: string }): Promise<HrDocumentTemplate> {
  if (!sequelize) throw new Error('Database unavailable');
  const cols = await getTenantColumns();
  if (!cols.has('settings')) throw new Error('Kolom settings tidak tersedia');
  if (!getCatalogItem(patch.type)) throw new Error('Jenis template tidak dikenal');

  const [rows] = await sequelize.query(
    `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  if (!rows?.[0]) throw new Error('Tenant tidak ditemukan');
  const settings = parseTenantSettings(rows[0].settings);
  const map = (settings.documentTemplates && typeof settings.documentTemplates === 'object')
    ? { ...settings.documentTemplates }
    : {};
  const next = sanitizeHrTemplate({ ...defaultTemplateFor(patch.type), ...map[patch.type], ...patch, updatedAt: new Date().toISOString() }, patch.type);
  map[patch.type] = next;
  settings.documentTemplates = map;
  await sequelize.query(
    `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
    { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
  );
  return next;
}

export async function resetHrTemplate(tenantId: string, type: string): Promise<HrDocumentTemplate> {
  if (!sequelize) throw new Error('Database unavailable');
  const cols = await getTenantColumns();
  if (!cols.has('settings')) throw new Error('Kolom settings tidak tersedia');
  const [rows] = await sequelize.query(
    `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  if (!rows?.[0]) throw new Error('Tenant tidak ditemukan');
  const settings = parseTenantSettings(rows[0].settings);
  const map = (settings.documentTemplates && typeof settings.documentTemplates === 'object')
    ? { ...settings.documentTemplates }
    : {};
  delete map[type];
  settings.documentTemplates = map;
  await sequelize.query(
    `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
    { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
  );
  return defaultTemplateFor(type);
}

async function readStoredTemplates(tenantId: string): Promise<Record<string, HrDocumentTemplate>> {
  if (!sequelize || !tenantId) return {};
  const cols = await getTenantColumns();
  if (!cols.has('settings')) return {};
  const [rows] = await sequelize.query(
    `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  const settings = parseTenantSettings(rows?.[0]?.settings);
  const raw = settings.documentTemplates;
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, HrDocumentTemplate> = {};
  for (const [type, value] of Object.entries(raw as Record<string, unknown>)) {
    if (getCatalogItem(type)) out[type] = sanitizeHrTemplate(value, type);
  }
  return out;
}

export async function hydrateDocumentFromTemplate(opts: {
  tenantId: string;
  docType: string;
  data: Record<string, unknown>;
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    taxId?: string;
    logo?: string;
    [key: string]: unknown;
  };
  meta?: Record<string, unknown>;
}): Promise<{
  data: Record<string, unknown>;
  company: typeof opts.company;
  branding: TenantBranding;
}> {
  const branding = await getTenantBranding(opts.tenantId);
  const company = {
    ...opts.company,
    name: branding.companyName || opts.company.name,
    address: branding.address || opts.company.address,
    phone: branding.phone || opts.company.phone,
    email: branding.email || opts.company.email,
    website: branding.website || opts.company.website,
    taxId: branding.npwp || opts.company.taxId,
    logo: branding.logoUrl || opts.company.logo,
  };
  const tplType = templateTypeForDocument(opts.docType, opts.data);
  if (!getCatalogItem(tplType)) return { data: opts.data, company, branding };

  const template = await getHrTemplate(opts.tenantId, tplType);
  const context = buildMergeContext({
    letterData: opts.data,
    meta: opts.meta,
    companyName: company.name,
  });
  context.company_address = branding.address || String(context.company_address || '');
  const draft = templateToDraft(template, branding, context);
  const data = { ...opts.data };
  if (!data.body && draft.body) data.body = draft.body;
  if (!data.closing && draft.closing) data.closing = draft.closing;
  if (!data.salutation && draft.salutation) data.salutation = draft.salutation;
  if (!data.subject && draft.subject) data.subject = draft.subject;
  if (!data.intro && draft.body) data.intro = draft.body;
  if (!data.letterhead) data.letterhead = draft.letterhead;
  if (!data.style) data.style = draft.style;
  if (!data.place && draft.place) data.place = draft.place;
  return { data, company, branding };
}
