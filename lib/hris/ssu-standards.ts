/**
 * Standar Struktur & Skala Upah (SSU) — baseline Humanify
 * Sumber utama: Permenaker RI No. 1 Tahun 2017 tentang Struktur dan Skala Upah
 * (melaksanakan UU 13/2003 Pasal 92 & PP 78/2015 Pasal 14)
 * Referensi praktik: metode ranking / dua titik / point factor; tipe traditional / market / broadbanding
 *
 * @see https://www.gaikindo.or.id/wp-content/uploads/2019/09/Permenaker_1_2017-tentang-Struktur-Skala-Upah.pdf
 * @see https://www.talenta.co/blog/mengetahui-struktur-dan-skala-upah-bagi-perusahaan/
 */

export const SSU_REGULATION = {
  code: 'PERMENAKER_1_2017',
  title: 'Permenaker No. 1 Tahun 2017 tentang Struktur dan Skala Upah',
  related: [
    'UU No. 13 Tahun 2003 Pasal 92',
    'PP No. 78 Tahun 2015 Pasal 14',
  ],
} as const;

/** Faktor wajib diperhatikan saat menyusun SSU (Pasal 2) */
export const SSU_COMPOSITION_FACTORS = [
  { id: 'golongan', label: 'Golongan jabatan', description: 'Banyaknya golongan / pengelompokan berdasarkan bobot jabatan' },
  { id: 'jabatan', label: 'Jabatan', description: 'Sekelompok tugas dan pekerjaan dalam organisasi' },
  { id: 'masa_kerja', label: 'Masa kerja', description: 'Pengalaman (tahun) yang dipersyaratkan pada jabatan' },
  { id: 'pendidikan', label: 'Pendidikan', description: 'Jenjang pendidikan formal sesuai sistem pendidikan nasional' },
  { id: 'kompetensi', label: 'Kompetensi', description: 'Pengetahuan, keterampilan, dan sikap kerja sesuai standar jabatan' },
] as const;

/** Tahapan penyusunan (Pasal 4) */
export const SSU_BUILD_STEPS = [
  { id: 'analisa_jabatan', label: 'Analisa jabatan', description: 'Uraian jabatan dari data tugas & tanggung jawab' },
  { id: 'evaluasi_jabatan', label: 'Evaluasi jabatan', description: 'Menilai, membandingkan, dan memeringkat jabatan' },
  { id: 'penentuan_ssu', label: 'Penentuan SSU', description: 'Tetapkan rentang upah pokok per golongan; perhatikan UMP/UMK' },
] as const;

/** Metode lampiran Permenaker 1/2017 */
export type SsuMethodId = 'ranking_sederhana' | 'dua_titik' | 'point_factor' | 'lainnya';

export const SSU_METHODS: { id: SsuMethodId; label: string; description: string }[] = [
  {
    id: 'ranking_sederhana',
    label: 'Ranking sederhana',
    description: 'Urutkan jabatan dari termudah ke tersulit, lalu isi upah terkecil–terbesar per golongan.',
  },
  {
    id: 'dua_titik',
    label: 'Dua titik',
    description: 'Tentukan upah terendah & tertinggi organisasi, interpolasi ke golongan di antaranya.',
  },
  {
    id: 'point_factor',
    label: 'Point factor',
    description: 'Bobot faktor (keahlian, tanggung jawab, usaha, kondisi kerja) → poin → grade → skala.',
  },
  {
    id: 'lainnya',
    label: 'Metode lain',
    description: 'Metode internal perusahaan selama memenuhi Pasal 2–4 Permenaker 1/2017.',
  },
];

/** Jenis struktur umum (praktik industri) */
export type SsuStructureType = 'traditional' | 'market_based' | 'broadbanding';

export const SSU_STRUCTURE_TYPES: { id: SsuStructureType; label: string; description: string }[] = [
  {
    id: 'traditional',
    label: 'Tradisional (narrow grade)',
    description: 'Banyak grade dengan rentang sempit — cocok organisasi hierarkis.',
  },
  {
    id: 'market_based',
    label: 'Berbasis pasar',
    description: 'Rentang mengacu benchmark pasar + kemampuan perusahaan & UMP/UMK.',
  },
  {
    id: 'broadbanding',
    label: 'Broadbanding',
    description: 'Sedikit band lebar — fleksibel untuk organisasi flat / skill-based.',
  },
];

export type SsuPolicyStatus = 'draft' | 'established' | 'under_review' | 'archived';

export interface SsuPolicy {
  id?: string;
  tenantId?: string;
  status: SsuPolicyStatus;
  method: SsuMethodId;
  structureType: SsuStructureType;
  decisionNumber?: string;
  decisionDate?: string;
  decidedBy?: string;
  effectiveFrom?: string;
  nextReviewDate?: string;
  umpReference?: number;
  umkRegion?: string;
  notes?: string;
  /** Pasal 8 — pemberitahuan perorangan ke pekerja */
  notifiedAt?: string;
  notifiedMethod?: 'individual' | 'portal' | 'letter' | 'mixed';
  /** Pasal 9 — dilampirkan saat PP/PKB */
  attachedToPpPkb?: boolean;
  statementLetterUrl?: string;
  checklist?: Record<string, boolean>;
  updatedAt?: string;
}

/** Checklist kepatuhan operasional (bukan nasihat hukum) */
export const SSU_COMPLIANCE_CHECKLIST: { id: string; label: string; pasal: string }[] = [
  { id: 'composed', label: 'SSU disusun dengan memperhatikan 5 faktor (golongan, jabatan, masa kerja, pendidikan, kompetensi)', pasal: 'Pasal 2' },
  { id: 'base_wage_only', label: 'Nilai di SSU adalah upah pokok (bukan total take-home)', pasal: 'Pasal 3' },
  { id: 'steps_done', label: 'Tahapan analisa → evaluasi → penentuan SSU telah dilakukan', pasal: 'Pasal 4' },
  { id: 'respect_minimum_wage', label: 'Rentang upah memperhatikan upah minimum yang berlaku', pasal: 'Pasal 4(4)' },
  { id: 'sk_issued', label: 'Ditetapkan pimpinan perusahaan dalam bentuk surat keputusan', pasal: 'Pasal 5' },
  { id: 'applies_to_all', label: 'Berlaku bagi seluruh pekerja yang mempunyai hubungan kerja', pasal: 'Pasal 7' },
  { id: 'notified_individually', label: 'Diberitahukan kepada pekerja secara perorangan (minimal golongan jabatannya)', pasal: 'Pasal 8' },
  { id: 'attach_pp_pkb', label: 'Dilampirkan / diperlihatkan saat pengesahan PP atau pendaftaran PKB', pasal: 'Pasal 9' },
  { id: 'review_ready', label: 'Ada jadwal peninjauan ulang SSU', pasal: 'Pasal 10' },
];

/** Template golongan default (ranking sederhana) — upah pokok IDR, contoh UMKM/SMB */
export interface SsuGradeTemplate {
  code: string;
  name: string;
  level: number;
  minSalary: number;
  midSalary: number;
  maxSalary: number;
  educationHint: string;
  experienceYearsMin: number;
  competencyHint: string;
  description: string;
}

export const SSU_DEFAULT_GRADE_TEMPLATES: SsuGradeTemplate[] = [
  {
    code: 'G1', name: 'Pelaksana / Operator', level: 1,
    minSalary: 3_500_000, midSalary: 4_000_000, maxSalary: 4_800_000,
    educationHint: 'SMA/SMK', experienceYearsMin: 0,
    competencyHint: 'Melaksanakan tugas rutin sesuai SOP',
    description: 'Golongan terendah — pekerjaan operasional dasar',
  },
  {
    code: 'G2', name: 'Staf Junior', level: 2,
    minSalary: 4_500_000, midSalary: 5_500_000, maxSalary: 6_500_000,
    educationHint: 'D3 / S1', experienceYearsMin: 1,
    competencyHint: 'Menyelesaikan pekerjaan administratif/teknis dengan supervisi',
    description: 'Staf dengan tanggung jawab terbatas',
  },
  {
    code: 'G3', name: 'Staf', level: 3,
    minSalary: 6_000_000, midSalary: 7_500_000, maxSalary: 9_000_000,
    educationHint: 'S1', experienceYearsMin: 2,
    competencyHint: 'Mandiri pada lingkup pekerjaan; kolaborasi lintas fungsi',
    description: 'Staf penuh — bobot jabatan menengah',
  },
  {
    code: 'G4', name: 'Staf Senior / Spesialis', level: 4,
    minSalary: 8_500_000, midSalary: 10_500_000, maxSalary: 13_000_000,
    educationHint: 'S1', experienceYearsMin: 4,
    competencyHint: 'Keahlian mendalam; mentoring; problem solving kompleks',
    description: 'Spesialis atau staf senior',
  },
  {
    code: 'G5', name: 'Supervisor / Team Lead', level: 5,
    minSalary: 10_000_000, midSalary: 13_000_000, maxSalary: 16_000_000,
    educationHint: 'S1', experienceYearsMin: 5,
    competencyHint: 'Memimpin tim kecil; kontrol kualitas & jadwal',
    description: 'Pengawas lini pertama',
  },
  {
    code: 'G6', name: 'Manajer', level: 6,
    minSalary: 15_000_000, midSalary: 20_000_000, maxSalary: 28_000_000,
    educationHint: 'S1 / S2', experienceYearsMin: 7,
    competencyHint: 'Mengelola fungsi; anggaran; KPI unit',
    description: 'Manajemen menengah',
  },
  {
    code: 'G7', name: 'Senior Manajer / Kepala Divisi', level: 7,
    minSalary: 25_000_000, midSalary: 35_000_000, maxSalary: 50_000_000,
    educationHint: 'S1 / S2', experienceYearsMin: 10,
    competencyHint: 'Strategi fungsi; kepemimpinan lintas departemen',
    description: 'Manajemen atas',
  },
  {
    code: 'G8', name: 'Direktur / C-Level', level: 8,
    minSalary: 40_000_000, midSalary: 60_000_000, maxSalary: 100_000_000,
    educationHint: 'S1 / S2', experienceYearsMin: 12,
    competencyHint: 'Kepemimpinan organisasi; keputusan strategis',
    description: 'Pimpinan tertinggi operasional',
  },
];

export function defaultSsuPolicy(): SsuPolicy {
  return {
    status: 'draft',
    method: 'ranking_sederhana',
    structureType: 'traditional',
    checklist: Object.fromEntries(SSU_COMPLIANCE_CHECKLIST.map((c) => [c.id, false])),
  };
}

export function validateGradeBand(min: number, mid: number | null | undefined, max: number): string | null {
  if (min < 0 || max < 0) return 'Upah tidak boleh negatif';
  if (max > 0 && min > max) return 'Upah terkecil tidak boleh melebihi upah terbesar';
  if (mid != null && mid > 0) {
    if (mid < min || (max > 0 && mid > max)) return 'Titik tengah harus berada di antara upah terkecil dan terbesar';
  }
  return null;
}

/** Pastikan upah pokok grade ≥ referensi UMP/UMK jika diisi (Pasal 4 ayat 4) */
export function validateAgainstMinimumWage(minSalary: number, umpReference?: number | null): string | null {
  if (umpReference && umpReference > 0 && minSalary > 0 && minSalary < umpReference) {
    return `Upah terkecil grade (${minSalary}) di bawah referensi UMP/UMK (${umpReference})`;
  }
  return null;
}

export function ssuComplianceScore(checklist?: Record<string, boolean> | null): { done: number; total: number; pct: number } {
  const total = SSU_COMPLIANCE_CHECKLIST.length;
  const done = SSU_COMPLIANCE_CHECKLIST.filter((c) => checklist?.[c.id]).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
