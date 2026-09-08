/**
 * Rule-based leave type & approval suggestions for HR configuration.
 * Inspired by UU Ketenagakerjaan No. 13/2003 + praktik HRIS Indonesia.
 * No external LLM — deterministic presets HR can one-click apply.
 */

export interface LeaveTypeSuggestion {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  max_days_per_year: number;
  min_days_per_request: number;
  max_days_per_request: number;
  is_paid: boolean;
  salary_deduction_percent: number;
  carry_forward: boolean;
  max_carry_forward_days: number;
  requires_attachment: boolean;
  requires_medical_cert: boolean;
  applicable_gender: string;
  min_service_months: number;
  color: string;
  icon: string;
  rationale: string;
  legalBasis?: string;
  priority: 'recommended' | 'optional' | 'compliance';
}

export interface ApprovalFlowSuggestion {
  id: string;
  name: string;
  description: string;
  leave_type_code: string | null;
  trigger_days: number;
  levels: Array<{ level: number; role: string; label: string }>;
  rationale: string;
  priority: 'recommended' | 'optional';
}

/** Catalog aligned with common Indo HRIS + UU 13/2003 arts. 79–93. */
export const LEAVE_TYPE_SUGGESTIONS: LeaveTypeSuggestion[] = [
  {
    id: 'annual',
    code: 'annual',
    name: 'Cuti Tahunan',
    description: 'Cuti tahunan 12 hari kerja setelah masa kerja 12 bulan (UU 13/2003 Pasal 79).',
    category: 'regular',
    max_days_per_year: 12,
    min_days_per_request: 1,
    max_days_per_request: 12,
    is_paid: true,
    salary_deduction_percent: 0,
    carry_forward: true,
    max_carry_forward_days: 6,
    requires_attachment: false,
    requires_medical_cert: false,
    applicable_gender: '',
    min_service_months: 12,
    color: '#3B82F6',
    icon: 'calendar',
    rationale: 'Wajib bagi pekerja tetap. Saran: izinkan carry-forward maksimal 6 hari agar saldo tidak hangus sekaligus.',
    legalBasis: 'UU 13/2003 Pasal 79 ayat (2) huruf c',
    priority: 'compliance',
  },
  {
    id: 'sick',
    code: 'sick',
    name: 'Cuti Sakit',
    description: 'Cuti sakit dengan surat dokter; berbayar sesuai kebijakan perusahaan.',
    category: 'medical',
    max_days_per_year: 30,
    min_days_per_request: 1,
    max_days_per_request: 14,
    is_paid: true,
    salary_deduction_percent: 0,
    carry_forward: false,
    max_carry_forward_days: 0,
    requires_attachment: true,
    requires_medical_cert: true,
    applicable_gender: '',
    min_service_months: 0,
    color: '#EF4444',
    icon: 'heart-pulse',
    rationale: 'Wajibkan surat dokter untuk klaim >1 hari. Batas per request 14 hari agar eskalasi HR jelas.',
    legalBasis: 'Praktik HR + kebijakan internal',
    priority: 'recommended',
  },
  {
    id: 'maternity',
    code: 'maternity',
    name: 'Cuti Melahirkan',
    description: '1,5 bulan sebelum + 1,5 bulan sesudah persalinan (total ~90 hari kalender / ~60–90 hari kerja tergantung kebijakan).',
    category: 'special',
    max_days_per_year: 90,
    min_days_per_request: 30,
    max_days_per_request: 90,
    is_paid: true,
    salary_deduction_percent: 0,
    carry_forward: false,
    max_carry_forward_days: 0,
    requires_attachment: true,
    requires_medical_cert: true,
    applicable_gender: 'female',
    min_service_months: 0,
    color: '#EC4899',
    icon: 'baby',
    rationale: 'Hanya untuk karyawan perempuan. Lampiran surat keterangan hamil/kelahiran wajib.',
    legalBasis: 'UU 13/2003 Pasal 82',
    priority: 'compliance',
  },
  {
    id: 'paternity',
    code: 'paternity',
    name: 'Cuti Ayah / Pendampingan Istri Melahirkan',
    description: 'Cuti khusus suami saat istri melahirkan (praktik modern + UU Cipta Kerja / kebijakan perusahaan).',
    category: 'special',
    max_days_per_year: 2,
    min_days_per_request: 1,
    max_days_per_request: 2,
    is_paid: true,
    salary_deduction_percent: 0,
    carry_forward: false,
    max_carry_forward_days: 0,
    requires_attachment: true,
    requires_medical_cert: false,
    applicable_gender: 'male',
    min_service_months: 0,
    color: '#06B6D4',
    icon: 'users',
    rationale: 'Mulai dari 2 hari berbayar; banyak perusahaan menaikkan ke 3–5 hari sebagai benefit.',
    legalBasis: 'Kebijakan perusahaan / praktik industri',
    priority: 'recommended',
  },
  {
    id: 'marriage',
    code: 'marriage',
    name: 'Cuti Menikah',
    description: 'Cuti pernikahan karyawan (lazim 3 hari).',
    category: 'special',
    max_days_per_year: 3,
    min_days_per_request: 1,
    max_days_per_request: 3,
    is_paid: true,
    salary_deduction_percent: 0,
    carry_forward: false,
    max_carry_forward_days: 0,
    requires_attachment: true,
    requires_medical_cert: false,
    applicable_gender: '',
    min_service_months: 0,
    color: '#A855F7',
    icon: 'heart',
    rationale: 'Minta lampiran undangan/akta. Tidak perlu carry-forward.',
    legalBasis: 'Kebijakan perusahaan',
    priority: 'optional',
  },
  {
    id: 'bereavement',
    code: 'bereavement',
    name: 'Cuti Duka / Keluarga Meninggal',
    description: 'Cuti ketika anggota keluarga inti meninggal dunia.',
    category: 'special',
    max_days_per_year: 3,
    min_days_per_request: 1,
    max_days_per_request: 3,
    is_paid: true,
    salary_deduction_percent: 0,
    carry_forward: false,
    max_carry_forward_days: 0,
    requires_attachment: false,
    requires_medical_cert: false,
    applicable_gender: '',
    min_service_months: 0,
    color: '#64748B',
    icon: 'cloud',
    rationale: 'Hindari birokrasi berlebih; lampiran opsional agar proses cepat.',
    legalBasis: 'Kebijakan perusahaan',
    priority: 'recommended',
  },
  {
    id: 'unpaid',
    code: 'unpaid',
    name: 'Cuti Tidak Berbayar',
    description: 'Cuti di luar kuota tahunan dengan potongan gaji 100%.',
    category: 'unpaid',
    max_days_per_year: 30,
    min_days_per_request: 1,
    max_days_per_request: 14,
    is_paid: false,
    salary_deduction_percent: 100,
    carry_forward: false,
    max_carry_forward_days: 0,
    requires_attachment: true,
    requires_medical_cert: false,
    applicable_gender: '',
    min_service_months: 6,
    color: '#F59E0B',
    icon: 'wallet',
    rationale: 'Gunakan setelah cuti tahunan habis. Wajib approval 2 tingkat karena dampak payroll.',
    legalBasis: 'Kesepakatan kerja / peraturan perusahaan',
    priority: 'optional',
  },
  {
    id: 'menstrual',
    code: 'menstrual',
    name: 'Cuti Haid',
    description: 'Cuti haid pada hari pertama dan kedua (Pasal 81).',
    category: 'medical',
    max_days_per_year: 24,
    min_days_per_request: 1,
    max_days_per_request: 2,
    is_paid: true,
    salary_deduction_percent: 0,
    carry_forward: false,
    max_carry_forward_days: 0,
    requires_attachment: false,
    requires_medical_cert: false,
    applicable_gender: 'female',
    min_service_months: 0,
    color: '#F43F5E',
    icon: 'activity',
    rationale: 'Khusus perempuan; biasanya tanpa surat dokter untuk 1–2 hari.',
    legalBasis: 'UU 13/2003 Pasal 81',
    priority: 'compliance',
  },
  {
    id: 'miscarriage',
    code: 'miscarriage',
    name: 'Cuti Keguguran',
    description: 'Cuti 1,5 bulan setelah keguguran sesuai keterangan dokter (Pasal 82 ayat 2).',
    category: 'medical',
    max_days_per_year: 45,
    min_days_per_request: 7,
    max_days_per_request: 45,
    is_paid: true,
    salary_deduction_percent: 0,
    carry_forward: false,
    max_carry_forward_days: 0,
    requires_attachment: true,
    requires_medical_cert: true,
    applicable_gender: 'female',
    min_service_months: 0,
    color: '#FB7185',
    icon: 'heart',
    rationale: 'Kepatuhan Pasal 82; lampirkan surat dokter. Terpisah dari cuti melahirkan.',
    legalBasis: 'UU 13/2003 Pasal 82 ayat (2)',
    priority: 'compliance',
  },
  {
    id: 'pilgrimage',
    code: 'pilgrimage',
    name: 'Cuti Ibadah (Haji / Umrah)',
    description: 'Cuti keagamaan di luar kuota tahunan, sesuai peraturan perusahaan.',
    category: 'special',
    max_days_per_year: 40,
    min_days_per_request: 1,
    max_days_per_request: 40,
    is_paid: true,
    salary_deduction_percent: 0,
    carry_forward: false,
    max_carry_forward_days: 0,
    requires_attachment: true,
    requires_medical_cert: false,
    applicable_gender: '',
    min_service_months: 12,
    color: '#10B981',
    icon: 'calendar',
    rationale: 'Lampirkan bukti keberangkatan. Banyak perusahaan membatasi 1 kali masa kerja untuk haji.',
    legalBasis: 'Peraturan perusahaan / Perjanjian Kerja',
    priority: 'optional',
  },
  {
    id: 'long_service',
    code: 'long_service',
    name: 'Cuti Besar / Masa Kerja Panjang',
    description: 'Cuti tambahan setelah masa kerja tertentu (lazim 1 bulan setiap 6 tahun).',
    category: 'regular',
    max_days_per_year: 22,
    min_days_per_request: 5,
    max_days_per_request: 22,
    is_paid: true,
    salary_deduction_percent: 0,
    carry_forward: false,
    max_carry_forward_days: 0,
    requires_attachment: false,
    requires_medical_cert: false,
    applicable_gender: '',
    min_service_months: 72,
    color: '#6366F1',
    icon: 'award',
    rationale: 'Benefit retensi. Set min_service_months sesuai PKB (contoh 6 tahun).',
    legalBasis: 'PKB / peraturan perusahaan',
    priority: 'optional',
  },
];

export const APPROVAL_FLOW_SUGGESTIONS: ApprovalFlowSuggestion[] = [
  {
    id: 'std-manager',
    name: 'Standar — Atasan Langsung',
    description: 'Semua cuti ≤3 hari: 1 tingkat (manager).',
    leave_type_code: null,
    trigger_days: 0,
    levels: [{ level: 1, role: 'manager', label: 'Atasan Langsung' }],
    rationale: 'Alur paling sederhana untuk SMB. Cocok sebagai default.',
    priority: 'recommended',
  },
  {
    id: 'long-leave',
    name: 'Cuti Panjang — Manager + HR',
    description: 'Cuti >3 hari: Manager lalu HR.',
    leave_type_code: null,
    trigger_days: 3,
    levels: [
      { level: 1, role: 'manager', label: 'Atasan Langsung' },
      { level: 2, role: 'hr', label: 'HR / People Ops' },
    ],
    rationale: 'Mengurangi abuse cuti panjang dan menyelaraskan dengan payroll.',
    priority: 'recommended',
  },
  {
    id: 'unpaid-strict',
    name: 'Cuti Tidak Berbayar — 2 Tingkat',
    description: 'UNPAID selalu butuh Manager + HR.',
    leave_type_code: 'unpaid',
    trigger_days: 0,
    levels: [
      { level: 1, role: 'manager', label: 'Atasan Langsung' },
      { level: 2, role: 'hr', label: 'HR / People Ops' },
    ],
    rationale: 'Dampak potongan gaji — jangan single-approve.',
    priority: 'recommended',
  },
  {
    id: 'maternity-hr',
    name: 'Cuti Melahirkan — HR + Direktur',
    description: 'MATERNITY: HR verifikasi dokumen, lalu approval final.',
    leave_type_code: 'maternity',
    trigger_days: 0,
    levels: [
      { level: 1, role: 'hr', label: 'HR' },
      { level: 2, role: 'director', label: 'Direktur / Head of People' },
    ],
    rationale: 'Dokumen medis + kepatuhan hukum; bypass manager operasional jika perlu.',
    priority: 'optional',
  },
];

/** Canonical code → aliases seen in seed / wizard / tenant custom names. */
export const LEAVE_TYPE_CODE_ALIASES: Record<string, string[]> = {
  annual: ['annual', 'cuti_tahunan', 'tahunan'],
  sick: ['sick', 'sakit', 'cuti_sakit'],
  maternity: ['maternity', 'melahirkan', 'hamil'],
  paternity: ['paternity', 'ayah', 'pendampingan'],
  marriage: ['marriage', 'menikah', 'pernikahan'],
  bereavement: ['bereavement', 'duka', 'duka_cita'],
  unpaid: ['unpaid', 'tanpa_gaji', 'unpaid_leave'],
  menstrual: ['menstrual', 'haid', 'cuti_haid', 'menstruation'],
  miscarriage: ['miscarriage', 'keguguran', 'abortus'],
  pilgrimage: ['pilgrimage', 'haji', 'umrah', 'ibadah'],
  long_service: ['long_service', 'cuti_besar', 'cuti_panjang'],
};

export function normalizeLeaveSuggestionCode(code: unknown): string {
  return String(code || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function leaveTypeAlreadyConfigured(code: string, existingCodes: string[]): boolean {
  const canon = normalizeLeaveSuggestionCode(code);
  const aliases = LEAVE_TYPE_CODE_ALIASES[canon] || [canon];
  const want = new Set(aliases.map((c) => c.toUpperCase()));
  want.add(canon.toUpperCase());
  return existingCodes.some((c) => want.has(normalizeLeaveSuggestionCode(c).toUpperCase()));
}

export function suggestLeaveTypes(existingCodes: string[] = []) {
  const suggestions = LEAVE_TYPE_SUGGESTIONS.map((s) => ({
    ...s,
    alreadyConfigured: leaveTypeAlreadyConfigured(s.code, existingCodes),
  }));
  const missingCompliance = suggestions.filter((s) => s.priority === 'compliance' && !s.alreadyConfigured);
  return {
    suggestions,
    summary: {
      total: suggestions.length,
      missing: suggestions.filter((s) => !s.alreadyConfigured).length,
      missingCompliance: missingCompliance.length,
      complianceCodes: missingCompliance.map((s) => s.code),
      tip:
        missingCompliance.length > 0
          ? `Ada ${missingCompliance.length} tipe cuti kepatuhan (UU) yang belum dikonfigurasi — prioritaskan Cuti Tahunan, Melahirkan, Haid, dan Keguguran.`
          : 'Katalog kepatuhan sudah lengkap. Pertimbangkan tipe opsional (menikah, duka, unpaid, ibadah) sesuai budaya perusahaan.',
    },
  };
}

export function suggestApprovalFlows(existingNames: string[] = []) {
  const existing = new Set(existingNames.map((n) => n.toLowerCase()));
  const suggestions = APPROVAL_FLOW_SUGGESTIONS.map((s) => ({
    ...s,
    alreadyConfigured: [...existing].some((n) => n.includes(s.name.toLowerCase().slice(0, 12))),
  }));
  return {
    suggestions,
    summary: {
      total: suggestions.length,
      tip: 'Mulai dari alur Standar + Cuti Panjang; tambahkan aturan khusus unpaid/maternity bila tipe tersebut sudah aktif.',
    },
  };
}

export function suggestionToLeaveTypePayload(s: LeaveTypeSuggestion, sortOrder = 0) {
  return {
    code: s.code,
    name: s.name,
    description: s.description,
    category: s.category,
    color: s.color,
    icon: s.icon,
    maxDaysPerYear: s.max_days_per_year,
    minDaysPerRequest: s.min_days_per_request,
    maxDaysPerRequest: s.max_days_per_request,
    isPaid: s.is_paid,
    salaryDeductionPercent: s.salary_deduction_percent,
    carryForward: s.carry_forward,
    maxCarryForwardDays: s.max_carry_forward_days,
    requiresAttachment: s.requires_attachment,
    requiresMedicalCert: s.requires_medical_cert,
    applicableGender: s.applicable_gender || null,
    minServiceMonths: s.min_service_months,
    isActive: true,
    sortOrder,
  };
}
