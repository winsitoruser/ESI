/**
 * HRIS Disciplinary Letter Workflow — Surat Teguran, SP1/SP2/SP3, PHK
 * SOP konfigurasi per jenis surat, multi-step approval, good governance
 */

export type DisciplinaryLetterType = 'TEGURAN' | 'SP1' | 'SP2' | 'SP3' | 'TERMINATION';

export type DisciplinaryPhase =
  | 'request'
  | 'investigation'
  | 'drafting'
  | 'review'
  | 'approval'
  | 'issuance'
  | 'acknowledgment';

export type DisciplinaryStatus =
  | 'draft'
  | 'submitted'
  | 'investigating'
  | 'drafting'
  | 'review'
  | 'pending_approval'
  | 'approved'
  | 'issued'
  | 'acknowledged'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export type ViolationType =
  | 'discipline'
  | 'attendance'
  | 'misconduct'
  | 'performance'
  | 'safety'
  | 'ethics'
  | 'other';

export interface SOPPhase {
  phase: DisciplinaryPhase;
  label: string;
  role: string;
  required: boolean;
  /** Otomatis lanjut ke tahap berikutnya setelah disetujui */
  autoAdvance?: boolean;
}

export interface SOPApprovalLevel {
  level: number;
  phase: DisciplinaryPhase;
  role: string;
  title: string;
  required: boolean;
}

export interface SOPPrerequisites {
  /** SP sebelumnya yang wajib ada (mis. SP2 butuh SP1) */
  requiresPreviousType?: DisciplinaryLetterType;
  /** Minimal hari sejak surat sebelumnya */
  minDaysSincePrevious?: number;
  /** Maksimal hari sejak surat sebelumnya (masa berlaku SP) */
  maxDaysSincePrevious?: number;
  /** Wajib ada kasus investigasi terbuka */
  requiresInvestigation?: boolean;
}

export interface LetterSOPTemplate {
  id?: string;
  name: string;
  letterType: DisciplinaryLetterType;
  description: string;
  phases: SOPPhase[];
  approvalLevels: SOPApprovalLevel[];
  prerequisites: SOPPrerequisites;
  /** Masa berlaku surat (bulan) — SP biasanya 6 bulan */
  validityMonths: number;
  isDefault?: boolean;
}

export const LETTER_TYPE_LABELS: Record<DisciplinaryLetterType, string> = {
  TEGURAN: 'Surat Teguran',
  SP1: 'Surat Peringatan I (SP1)',
  SP2: 'Surat Peringatan II (SP2)',
  SP3: 'Surat Peringatan III (SP3)',
  TERMINATION: 'Surat Pemutusan Hubungan Kerja',
};

export const PHASE_LABELS: Record<DisciplinaryPhase, string> = {
  request: 'Pengajuan',
  investigation: 'Investigasi',
  drafting: 'Pembuatan Draft',
  review: 'Review & Verifikasi',
  approval: 'Persetujuan',
  issuance: 'Penerbitan',
  acknowledgment: 'Konfirmasi Penerimaan',
};

export const STATUS_LABELS: Record<DisciplinaryStatus, string> = {
  draft: 'Draft',
  submitted: 'Diajukan',
  investigating: 'Investigasi',
  drafting: 'Penyusunan Draft',
  review: 'Review',
  pending_approval: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  issued: 'Diterbitkan',
  acknowledged: 'Diterima Karyawan',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
};

export const VIOLATION_TYPE_LABELS: Record<ViolationType, string> = {
  discipline: 'Kedisiplinan',
  attendance: 'Kehadiran / Keterlambatan',
  misconduct: 'Pelanggaran Perilaku',
  performance: 'Kinerja',
  safety: 'Keselamatan Kerja (K3)',
  ethics: 'Etika & Kode Etik',
  other: 'Lainnya',
};

/** Hierarki eskalasi disiplin standar UU Ketenagakerjaan */
export const DISCIPLINARY_LADDER: DisciplinaryLetterType[] = [
  'TEGURAN',
  'SP1',
  'SP2',
  'SP3',
  'TERMINATION',
];

/** SOP default per jenis surat — dapat dioverride via konfigurasi tenant */
export const DEFAULT_SOP_TEMPLATES: LetterSOPTemplate[] = [
  {
    name: 'SOP Surat Teguran',
    letterType: 'TEGURAN',
    description: 'Teguran lisan/tertulis awal sebelum SP formal. Atasan mengajukan, HR menyusun & menerbitkan.',
    validityMonths: 3,
    prerequisites: {},
    phases: [
      { phase: 'request', label: 'Pengajuan Atasan', role: 'MANAGER', required: true },
      { phase: 'drafting', label: 'Penyusunan Surat', role: 'HR_STAFF', required: true },
      { phase: 'approval', label: 'Persetujuan HRD', role: 'HR_MANAGER', required: true },
      { phase: 'issuance', label: 'Penerbitan', role: 'HR_STAFF', required: true, autoAdvance: true },
      { phase: 'acknowledgment', label: 'Konfirmasi Karyawan', role: 'EMPLOYEE', required: false },
    ],
    approvalLevels: [
      { level: 1, phase: 'request', role: 'MANAGER', title: 'Atasan Langsung / Manajer', required: true },
      { level: 2, phase: 'drafting', role: 'HR_STAFF', title: 'Staff HRD', required: true },
      { level: 3, phase: 'approval', role: 'HR_MANAGER', title: 'Manajer HRD', required: true },
      { level: 4, phase: 'issuance', role: 'HR_STAFF', title: 'Staff HRD (Penerbitan)', required: true },
    ],
  },
  {
    name: 'SOP Surat Peringatan I (SP1)',
    letterType: 'SP1',
    description: 'Peringatan pertama resmi. Atasan mengajukan dengan bukti pelanggaran, HR verifikasi & terbitkan SP1.',
    validityMonths: 6,
    prerequisites: {},
    phases: [
      { phase: 'request', label: 'Pengajuan Atasan', role: 'MANAGER', required: true },
      { phase: 'investigation', label: 'Verifikasi HRD', role: 'HR_STAFF', required: true },
      { phase: 'drafting', label: 'Penyusunan SP1', role: 'HR_STAFF', required: true },
      { phase: 'approval', label: 'Persetujuan HRD', role: 'HR_MANAGER', required: true },
      { phase: 'issuance', label: 'Penerbitan SP1', role: 'HR_STAFF', required: true, autoAdvance: true },
      { phase: 'acknowledgment', label: 'Tanda Terima Karyawan', role: 'EMPLOYEE', required: true },
    ],
    approvalLevels: [
      { level: 1, phase: 'request', role: 'MANAGER', title: 'Atasan Langsung', required: true },
      { level: 2, phase: 'investigation', role: 'HR_STAFF', title: 'Staff HRD (Verifikasi)', required: true },
      { level: 3, phase: 'drafting', role: 'HR_STAFF', title: 'Staff HRD (Draft)', required: true },
      { level: 4, phase: 'approval', role: 'HR_MANAGER', title: 'Manajer HRD', required: true },
      { level: 5, phase: 'issuance', role: 'HR_STAFF', title: 'Penerbitan Surat', required: true },
    ],
  },
  {
    name: 'SOP Surat Peringatan II (SP2)',
    letterType: 'SP2',
    description: 'Peringatan kedua. Wajib ada SP1 aktif. Investigasi wajib, persetujuan Direktur.',
    validityMonths: 6,
    prerequisites: {
      requiresPreviousType: 'SP1',
      minDaysSincePrevious: 1,
      maxDaysSincePrevious: 180,
      requiresInvestigation: true,
    },
    phases: [
      { phase: 'request', label: 'Pengajuan HRD', role: 'HR_STAFF', required: true },
      { phase: 'investigation', label: 'Investigasi Internal', role: 'HR_MANAGER', required: true },
      { phase: 'drafting', label: 'Penyusunan SP2', role: 'HR_STAFF', required: true },
      { phase: 'review', label: 'Review Legal', role: 'LEGAL', required: true },
      { phase: 'approval', label: 'Persetujuan Direktur', role: 'DIRECTOR', required: true },
      { phase: 'issuance', label: 'Penerbitan SP2', role: 'HR_MANAGER', required: true },
      { phase: 'acknowledgment', label: 'Tanda Terima Karyawan', role: 'EMPLOYEE', required: true },
    ],
    approvalLevels: [
      { level: 1, phase: 'request', role: 'HR_STAFF', title: 'Staff HRD', required: true },
      { level: 2, phase: 'investigation', role: 'HR_MANAGER', title: 'Manajer HRD (Investigasi)', required: true },
      { level: 3, phase: 'drafting', role: 'HR_STAFF', title: 'Staff HRD (Draft SP2)', required: true },
      { level: 4, phase: 'review', role: 'LEGAL', title: 'Legal / Compliance', required: true },
      { level: 5, phase: 'approval', role: 'DIRECTOR', title: 'Direktur', required: true },
      { level: 6, phase: 'issuance', role: 'HR_MANAGER', title: 'Manajer HRD (Penerbitan)', required: true },
    ],
  },
  {
    name: 'SOP Surat Peringatan III (SP3)',
    letterType: 'SP3',
    description: 'Peringatan terakhir sebelum PHK. Wajib SP2 aktif. Sidang pemeriksaan & persetujuan manajemen puncak.',
    validityMonths: 6,
    prerequisites: {
      requiresPreviousType: 'SP2',
      minDaysSincePrevious: 1,
      maxDaysSincePrevious: 180,
      requiresInvestigation: true,
    },
    phases: [
      { phase: 'request', label: 'Pengajuan HRD', role: 'HR_MANAGER', required: true },
      { phase: 'investigation', label: 'Sidang Pemeriksaan', role: 'HR_MANAGER', required: true },
      { phase: 'drafting', label: 'Penyusunan SP3', role: 'HR_STAFF', required: true },
      { phase: 'review', label: 'Review Legal', role: 'LEGAL', required: true },
      { phase: 'approval', label: 'Persetujuan Manajemen', role: 'DIRECTOR', required: true },
      { phase: 'issuance', label: 'Penerbitan SP3', role: 'HR_MANAGER', required: true },
      { phase: 'acknowledgment', label: 'Tanda Terima Karyawan', role: 'EMPLOYEE', required: true },
    ],
    approvalLevels: [
      { level: 1, phase: 'request', role: 'HR_MANAGER', title: 'Manajer HRD', required: true },
      { level: 2, phase: 'investigation', role: 'HR_MANAGER', title: 'Komite Investigasi', required: true },
      { level: 3, phase: 'drafting', role: 'HR_STAFF', title: 'Staff HRD (Draft SP3)', required: true },
      { level: 4, phase: 'review', role: 'LEGAL', title: 'Legal / Compliance', required: true },
      { level: 5, phase: 'approval', role: 'DIRECTOR', title: 'Direktur / Manajemen', required: true },
      { level: 6, phase: 'issuance', role: 'HR_MANAGER', title: 'Penerbitan SP3', required: true },
    ],
  },
  {
    name: 'SOP Pemutusan Hubungan Kerja (PHK)',
    letterType: 'TERMINATION',
    description: 'Proses PHK/pemecatan. Investigasi mendalam, review legal, persetujuan berjenjang hingga penerbitan surat PHK.',
    validityMonths: 0,
    prerequisites: {
      requiresPreviousType: 'SP3',
      requiresInvestigation: true,
    },
    phases: [
      { phase: 'request', label: 'Pengajuan PHK', role: 'HR_MANAGER', required: true },
      { phase: 'investigation', label: 'Investigasi & Dokumentasi', role: 'HR_MANAGER', required: true },
      { phase: 'review', label: 'Review Legal & Compliance', role: 'LEGAL', required: true },
      { phase: 'drafting', label: 'Penyusunan Surat PHK', role: 'HR_STAFF', required: true },
      { phase: 'approval', label: 'Persetujuan Direktur', role: 'DIRECTOR', required: true },
      { phase: 'approval', label: 'Persetujuan Manajemen Puncak', role: 'GM', required: true },
      { phase: 'issuance', label: 'Penerbitan Surat PHK', role: 'HR_MANAGER', required: true },
      { phase: 'acknowledgment', label: 'Serah Terima & Clearance', role: 'EMPLOYEE', required: false },
    ],
    approvalLevels: [
      { level: 1, phase: 'request', role: 'HR_MANAGER', title: 'Manajer HRD (Pengajuan)', required: true },
      { level: 2, phase: 'investigation', role: 'HR_MANAGER', title: 'Komite Investigasi PHK', required: true },
      { level: 3, phase: 'review', role: 'LEGAL', title: 'Legal / Compliance', required: true },
      { level: 4, phase: 'drafting', role: 'HR_STAFF', title: 'Staff HRD (Draft PHK)', required: true },
      { level: 5, phase: 'approval', role: 'DIRECTOR', title: 'Direktur', required: true },
      { level: 6, phase: 'approval', role: 'GM', title: 'Manajemen Puncak / Komisaris', required: true },
      { level: 7, phase: 'issuance', role: 'HR_MANAGER', title: 'Penerbitan Surat PHK', required: true },
    ],
  },
];

export function getDefaultSOP(letterType: DisciplinaryLetterType): LetterSOPTemplate {
  return (
    DEFAULT_SOP_TEMPLATES.find((t) => t.letterType === letterType) ||
    DEFAULT_SOP_TEMPLATES[0]
  );
}

export function getLetterNumberPrefix(letterType: DisciplinaryLetterType): string {
  const map: Record<DisciplinaryLetterType, string> = {
    TEGURAN: 'ST',
    SP1: 'SP1',
    SP2: 'SP2',
    SP3: 'SP3',
    TERMINATION: 'PHK',
  };
  return map[letterType] || 'HR';
}

export function generateLetterNumber(letterType: DisciplinaryLetterType, seq: number): string {
  const prefix = getLetterNumberPrefix(letterType);
  const year = new Date().getFullYear();
  return `${prefix}/${String(seq).padStart(4, '0')}/HR/${year}`;
}

export function computeExpiryDate(issueDate: string, validityMonths: number): string | null {
  if (!validityMonths || !issueDate) return null;
  const d = new Date(issueDate);
  d.setMonth(d.getMonth() + validityMonths);
  return d.toISOString().split('T')[0];
}

export function getDocumentTypeForLetter(letterType: DisciplinaryLetterType): string {
  if (letterType === 'TEGURAN') return 'reprehend-letter';
  if (letterType === 'TERMINATION') return 'termination-letter';
  return 'warning-letter';
}

export function buildLetterDocumentData(letter: Record<string, unknown>, employee?: Record<string, unknown>) {
  const letterType = (letter.letter_type || letter.letterType) as DisciplinaryLetterType;
  const empName = employee?.name || letter.employee_name || '-';
  const empCode = employee?.employee_code || letter.employee_code || letter.employee_id || '-';
  const violationRaw = (letter.violation_type || letter.violationType || 'other') as ViolationType;

  const dc = parseDraftContent(letter.draft_content);
  const base = {
    employeeName: empName,
    employeeId: empCode,
    position: employee?.position || letter.position || '-',
    department: employee?.department_label || employee?.department || letter.department || '-',
    violationType: violationRaw,
    violationTypeLabel: VIOLATION_TYPE_LABELS[violationRaw] || letter.violation_type,
    violationDescription: letter.violation_description || letter.violationDescription || '-',
    expiryDate: letter.expiry_date || letter.expiryDate,
    incidentDate: letter.incident_date || letter.incidentDate,
    notes: letter.notes,
    letterhead: dc.letterhead,
    style: dc.style,
    salutation: dc.salutation,
    subject: dc.subject,
    place: dc.place,
    closing: dc.closing,
    body: dc.body,
  };

  if (letterType === 'TERMINATION') {
    return {
      ...base,
      terminationType: letter.termination_type || 'PHK',
      reason: letter.violation_description || letter.request_reason || '-',
      effectiveDate: letter.effective_date || letter.effectiveDate,
      severanceAmount: letter.severance_amount,
      body: (letter.draft_content as any)?.body,
    };
  }

  if (letterType === 'TEGURAN') {
    return {
      ...base,
      body: dc.body || `Dengan ini kami menyampaikan Surat Teguran kepada Saudara/i ${empName} terkait pelanggaran berikut:`,
      closing: dc.closing || 'Surat teguran ini diharapkan menjadi perhatian serius. Pelanggaran berulang dapat mengakibatkan tindakan disiplin lebih lanjut sesuai peraturan perusahaan.',
    };
  }

  return {
    ...base,
    warningType: letterType,
    body: dc.body,
    closing: dc.closing,
  };
}

/** Validasi prasyarat eskalasi SP */
export function validatePrerequisites(
  letterType: DisciplinaryLetterType,
  sop: LetterSOPTemplate,
  previousLetters: Array<{ letter_type: string; status: string; issue_date?: string; expiry_date?: string }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const prereq = sop.prerequisites;
  if (!prereq?.requiresPreviousType) return { valid: true, errors };

  const prev = previousLetters
    .filter((l) => l.letter_type === prereq.requiresPreviousType && ['issued', 'acknowledged', 'active'].includes(l.status))
    .sort((a, b) => new Date(b.issue_date || 0).getTime() - new Date(a.issue_date || 0).getTime())[0];

  if (!prev) {
    errors.push(`${LETTER_TYPE_LABELS[letterType]} memerlukan ${LETTER_TYPE_LABELS[prereq.requiresPreviousType]} yang sudah diterbitkan`);
    return { valid: false, errors };
  }

  if (prev.issue_date && prereq.maxDaysSincePrevious) {
    const daysSince = Math.floor((Date.now() - new Date(prev.issue_date).getTime()) / 86400000);
    if (daysSince > prereq.maxDaysSincePrevious) {
      errors.push(`Masa berlaku ${LETTER_TYPE_LABELS[prereq.requiresPreviousType]} sudah habis (${daysSince} hari). Mulai dari SP1 kembali.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function statusToPhase(status: DisciplinaryStatus): DisciplinaryPhase {
  const map: Partial<Record<DisciplinaryStatus, DisciplinaryPhase>> = {
    submitted: 'request',
    investigating: 'investigation',
    drafting: 'drafting',
    review: 'review',
    pending_approval: 'approval',
    approved: 'issuance',
    issued: 'acknowledgment',
  };
  return map[status] || 'request';
}

export interface LetterheadConfig {
  companyName: string;
  tagline?: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  npwp?: string;
  /** Inisial singkat — tampil jika tidak ada logoUrl */
  logoText?: string;
  /** URL atau path publik logo perusahaan (mis. /uploads/letter-logos/...) */
  logoUrl?: string;
  layout: 'centered' | 'left' | 'split';
  showBorder: boolean;
  borderColor?: string;
}

export type LetterFontFamily = 'serif' | 'sans' | 'times';
export type LetterLayoutDensity = 'compact' | 'normal' | 'relaxed';

export interface LetterStyleConfig {
  fontFamily: LetterFontFamily;
  fontSize: '10pt' | '11pt' | '12pt';
  lineHeight: number;
  bodyAlign: 'justify' | 'left';
  accentColor: string;
  headerTextColor: string;
  showViolationBox: boolean;
  density: LetterLayoutDensity;
  signatureLayout: 'dual' | 'single-right';
  signerLeftLabel: string;
  signerRightLabel: string;
}

export const DEFAULT_LETTERHEAD: LetterheadConfig = {
  companyName: 'PT Naincode Inti Teknologi',
  tagline: 'People & Workforce Platform',
  address: 'Jl. Sudirman Kav. 52, Jakarta Selatan 12190',
  phone: '(021) 1234-5678',
  email: 'hr@naincode.com',
  website: 'www.naincode.com',
  npwp: '01.234.567.8-901.000',
  logoText: 'NI',
  layout: 'centered',
  showBorder: true,
  borderColor: '#1e293b',
};

export const DEFAULT_LETTER_STYLE: LetterStyleConfig = {
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
};

export const LETTER_STYLE_PRESETS: { id: string; label: string; style: Partial<LetterStyleConfig>; letterhead?: Partial<LetterheadConfig> }[] = [
  { id: 'formal', label: 'Formal (Serif)', style: { fontFamily: 'serif', accentColor: '#1e40af', headerTextColor: '#0f172a' } },
  { id: 'modern', label: 'Modern (Sans)', style: { fontFamily: 'sans', accentColor: '#059669', headerTextColor: '#111827' }, letterhead: { layout: 'split' } },
  { id: 'minimal', label: 'Minimal', style: { fontFamily: 'sans', fontSize: '10pt', showViolationBox: false, density: 'compact' }, letterhead: { showBorder: false, layout: 'left' } },
  { id: 'classic', label: 'Klasik (Times)', style: { fontFamily: 'times', accentColor: '#7c2d12', headerTextColor: '#1c1917' }, letterhead: { layout: 'centered', borderColor: '#44403c' } },
];

export interface DraftContent {
  salutation?: string;
  subject?: string;
  body: string;
  closing: string;
  place?: string;
  letterhead?: LetterheadConfig;
  style?: LetterStyleConfig;
}

/** Generate default draft surat saat pengajuan dibuat */
export function buildDefaultDraftContent(params: {
  letterType: DisciplinaryLetterType;
  employeeName: string;
  employeeCode?: string;
  position?: string;
  department?: string;
  violationType?: string;
  violationDescription: string;
  incidentDate?: string;
  companyName?: string;
}): DraftContent {
  const {
    letterType, employeeName, position, department,
    violationDescription, incidentDate,
    companyName = 'PT Naincode Inti Teknologi',
  } = params;

  const violationLabel = VIOLATION_TYPE_LABELS[(params.violationType || 'discipline') as ViolationType] || params.violationType;
  const dateStr = incidentDate
    ? new Date(incidentDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const titles: Record<DisciplinaryLetterType, string> = {
    TEGURAN: 'SURAT TEGURAN',
    SP1: 'SURAT PERINGATAN PERTAMA (SP-I)',
    SP2: 'SURAT PERINGATAN KEDUA (SP-II)',
    SP3: 'SURAT PERINGATAN KETIGA (SP-III)',
    TERMINATION: 'SURAT PEMUTUSAN HUBUNGAN KERJA',
  };

  let body = '';
  let closing = '';

  if (letterType === 'TERMINATION') {
    body = `Dengan ini ${companyName} memberitahukan bahwa hubungan kerja dengan Saudara/i ${employeeName}${position ? `, ${position}` : ''}${department ? `, ${department}` : ''}, dinyatakan berakhir.\n\nHal ini didasarkan pada pelanggaran berikut:\n${violationDescription}\n\nKejadian pada tanggal ${dateStr}. Proses disiplin dan investigasi internal telah dilaksanakan sesuai Peraturan Perusahaan dan ketentuan Undang-Undang Ketenagakerjaan.`;
    closing = 'Demikian surat ini disampaikan untuk dapat diperhatikan. Hak-hak karyawan akan diselesaikan sesuai ketentuan yang berlaku.';
  } else if (letterType === 'TEGURAN') {
    body = `Menindaklanjuti temuan disiplin, dengan ini kami sampaikan Surat Teguran kepada Saudara/i ${employeeName} terkait ${violationLabel.toLowerCase()}.\n\nPada tanggal ${dateStr}, Saudara/i terbukti melakukan pelanggaran:\n${violationDescription}\n\nTeguran ini menjadi peringatan awal agar tidak terulang.`;
    closing = 'Kami harapkan perbaikan sikap dan kepatuhan terhadap peraturan perusahaan. Pelanggaran berulang dapat mengakibatkan Surat Peringatan (SP) sesuai prosedur HR.';
  } else {
    body = `Berdasarkan hasil pemeriksaan dan/atau laporan atasan langsung, dengan ini ${companyName} menerbitkan ${titles[letterType]} kepada:

Nama        : ${employeeName}
Jabatan     : ${position || '—'}
Departemen  : ${department || '—'}

Karena telah melakukan pelanggaran ${violationLabel} pada tanggal ${dateStr}, dengan uraian:
${violationDescription}

Pelanggaran ini melanggar Peraturan Perusahaan dan terganggunya ketertiban kerja.`;
    closing = letterType === 'SP3'
      ? 'Surat Peringatan III ini merupakan peringatan terakhir. Apabila pelanggaran serupa terulang, perusahaan berhak mengambil tindakan PHK sesuai peraturan perundang-undangan.'
      : `Surat Peringatan ini berlaku selama 6 (enam) bulan. Apabila pelanggaran terulang, perusahaan akan menerbitkan ${letterType === 'SP1' ? 'SP-II' : 'SP-III'} atau tindakan lebih lanjut.`;
  }

  return {
    salutation: `Kepada Yth.\n${employeeName}\n${position || ''}${department ? `\n${department}` : ''}`,
    subject: titles[letterType],
    body,
    closing,
    place: 'Jakarta',
    letterhead: { ...DEFAULT_LETTERHEAD, companyName: companyName || DEFAULT_LETTERHEAD.companyName },
    style: { ...DEFAULT_LETTER_STYLE },
  };
}

export function parseLetterhead(raw?: Partial<LetterheadConfig>): LetterheadConfig {
  return { ...DEFAULT_LETTERHEAD, ...(raw || {}) };
}

export function parseLetterStyle(raw?: Partial<LetterStyleConfig>): LetterStyleConfig {
  return { ...DEFAULT_LETTER_STYLE, ...(raw || {}) };
}

export function parseDraftContent(raw: unknown): DraftContent {
  if (!raw) return { body: '', closing: '', letterhead: DEFAULT_LETTERHEAD, style: DEFAULT_LETTER_STYLE };
  if (typeof raw === 'string') {
    try { return parseDraftContent(JSON.parse(raw)); } catch { return { body: raw, closing: '', letterhead: DEFAULT_LETTERHEAD, style: DEFAULT_LETTER_STYLE }; }
  }
  const o = raw as Record<string, unknown>;
  return {
    salutation: (o.salutation as string) || '',
    subject: (o.subject as string) || '',
    body: (o.body as string) || '',
    closing: (o.closing as string) || '',
    place: (o.place as string) || 'Jakarta',
    letterhead: parseLetterhead(o.letterhead as Partial<LetterheadConfig>),
    style: parseLetterStyle(o.style as Partial<LetterStyleConfig>),
  };
}

export function getLetterFontCss(family: LetterFontFamily): string {
  const map: Record<LetterFontFamily, string> = {
    serif: 'Georgia, "Times New Roman", serif',
    sans: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    times: '"Times New Roman", Times, serif',
  };
  return map[family] || map.serif;
}

export function getLetterPadding(density: LetterLayoutDensity): string {
  return density === 'compact' ? '15mm' : density === 'relaxed' ? '25mm' : '20mm';
}

export function normalizeSOPTemplate(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    letter_type: row.letter_type || row.letterType,
    letterType: row.letter_type || row.letterType,
    description: row.description || '',
    phases: row.phases || [],
    approval_levels: row.approval_levels || row.approvalLevels || [],
    approvalLevels: row.approval_levels || row.approvalLevels || [],
    prerequisites: row.prerequisites || {},
    validity_months: row.validity_months ?? row.validityMonths ?? 6,
    validityMonths: row.validity_months ?? row.validityMonths ?? 6,
    is_active: row.is_active ?? row.isActive ?? true,
    is_default: row.is_default ?? row.isDefault ?? false,
    tenant_id: row.tenant_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
