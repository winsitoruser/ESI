/**
 * Klasifikasi tenaga kerja & skema penggajian HRIS SIMESI.
 * Mendukung karyawan tetap, kontrak, harian lepas, buruh, dan borongan.
 */

export interface HrisOption {
  code: string;
  label: string;
  desc?: string;
}

/** Kategori hubungan kerja (kolom employment_category di employees) */
export const EMPLOYMENT_CATEGORIES: HrisOption[] = [
  { code: 'permanent', label: 'Karyawan Tetap', desc: 'PKWTT / status permanen' },
  { code: 'contract', label: 'Kontrak', desc: 'PKWT / kontrak berjangka' },
  { code: 'daily_casual', label: 'Harian Lepas', desc: 'Tenaga kerja harian tanpa kontrak tetap' },
  { code: 'labor', label: 'Buruh', desc: 'Buruh lapangan / operasional harian' },
  { code: 'outsource', label: 'Outsource / Vendor', desc: 'Tenaga dari pihak ketiga' },
  { code: 'intern', label: 'Magang / Intern', desc: 'Peserta magang' },
  // Multifinance / pembiayaan
  { code: 'account_officer', label: 'Account Officer', desc: 'Akuisisi & pencairan kredit (pembiayaan)' },
  { code: 'collector', label: 'Kolektor', desc: 'Penagihan & recovery angsuran' },
  { code: 'surveyor', label: 'Surveyor Kredit', desc: 'Survey & verifikasi agunan' },
  { code: 'telemarketing', label: 'Telemarketing', desc: 'Prospek via telepon (pembiayaan)' },
  { code: 'field_agent', label: 'Agen Lapangan', desc: 'Kunjungan lapangan pembiayaan' },
];

/** Tipe perhitungan gaji (kolom pay_type di employee_salaries) */
export const PAY_TYPES: HrisOption[] = [
  { code: 'monthly', label: 'Bulanan', desc: 'Gaji pokok per bulan' },
  { code: 'weekly', label: 'Mingguan', desc: 'Gaji per minggu' },
  { code: 'daily', label: 'Harian', desc: 'Upah per hari hadir (dari absensi)' },
  { code: 'hourly', label: 'Per Jam', desc: 'Upah per jam kerja (dari absensi)' },
  { code: 'project', label: 'Per Proyek', desc: 'Upah berdasarkan penugasan & timesheet proyek' },
  { code: 'piecework', label: 'Borongan', desc: 'Upah per satuan hasil kerja (kuantitas × tarif)' },
  { code: 'commission', label: 'Komisi Murni', desc: 'Pendapatan dari komisi penagihan/pencairan' },
  { code: 'base_plus_commission', label: 'Gaji Pokok + Komisi', desc: 'Gaji tetap ditambah komisi variabel' },
];

/** Satuan umum untuk borongan */
export const PIECE_UNITS: HrisOption[] = [
  { code: 'unit', label: 'Unit / Pcs' },
  { code: 'kg', label: 'Kilogram' },
  { code: 'm2', label: 'Meter Persegi' },
  { code: 'm3', label: 'Meter Kubik' },
  { code: 'paket', label: 'Paket / Lot' },
  { code: 'rit', label: 'Rit / Trip' },
  { code: 'jam', label: 'Jam Kerja' },
  { code: 'hari', label: 'Hari Kerja' },
];

/** Tipe pekerja di penugasan proyek (pjm_resources.worker_type) */
export const PROJECT_WORKER_TYPES: HrisOption[] = [
  { code: 'permanent', label: 'Tetap' },
  { code: 'contract', label: 'Kontrak' },
  { code: 'daily', label: 'Harian' },
  { code: 'hourly', label: 'Per Jam' },
  { code: 'piecework', label: 'Borongan' },
];

/** Status laporan pengawasan harian */
export const SUPERVISION_REPORT_STATUS: HrisOption[] = [
  { code: 'draft', label: 'Draf' },
  { code: 'submitted', label: 'Dikirim' },
  { code: 'reviewed', label: 'Direview HR' },
  { code: 'rejected', label: 'Ditolak' },
];

/** Status kehadiran dalam laporan pengawas */
export const SUPERVISION_ATTENDANCE: HrisOption[] = [
  { code: 'present', label: 'Hadir' },
  { code: 'late', label: 'Terlambat' },
  { code: 'absent', label: 'Tidak Hadir' },
  { code: 'half_day', label: 'Setengah Hari' },
  { code: 'leave', label: 'Izin/Cuti' },
];

/** Shift kerja lapangan */
export const FIELD_SHIFTS: HrisOption[] = [
  { code: 'pagi', label: 'Pagi (06-14)' },
  { code: 'siang', label: 'Siang (14-22)' },
  { code: 'malam', label: 'Malam (22-06)' },
  { code: 'full', label: 'Full Day' },
];

export const CASUAL_CATEGORIES = ['daily_casual', 'labor', 'outsource'];

/** Kategori pekerjaan multifinance / pembiayaan */
export const MF_EMPLOYMENT_CATEGORIES = [
  'account_officer', 'collector', 'surveyor', 'telemarketing', 'field_agent',
];

const catMap = Object.fromEntries(EMPLOYMENT_CATEGORIES.map((c) => [c.code, c.label]));
const payMap = Object.fromEntries(PAY_TYPES.map((p) => [p.code, p.label]));
const unitMap = Object.fromEntries(PIECE_UNITS.map((u) => [u.code, u.label]));

export function getEmploymentCategoryLabel(code?: string | null): string {
  if (!code) return '-';
  return catMap[code] || code;
}

export function getPayTypeLabel(code?: string | null): string {
  if (!code) return '-';
  return payMap[code] || code;
}

export function getPieceUnitLabel(code?: string | null): string {
  if (!code) return '-';
  return unitMap[code] || code;
}

export function isCasualEmployment(category?: string | null): boolean {
  return !!category && CASUAL_CATEGORIES.includes(category);
}

export function isMultifinanceEmployment(category?: string | null): boolean {
  return !!category && MF_EMPLOYMENT_CATEGORIES.includes(category);
}

/** Rekomendasi pay_type berdasarkan kategori pekerjaan */
export function suggestedPayType(category: string): string {
  switch (category) {
    case 'daily_casual':
    case 'labor':
      return 'daily';
    case 'outsource':
      return 'project';
    case 'contract':
      return 'monthly';
    case 'intern':
      return 'daily';
    case 'collector':
      return 'commission';
    case 'account_officer':
    case 'field_agent':
      return 'base_plus_commission';
    case 'surveyor':
      return 'piecework';
    case 'telemarketing':
      return 'monthly';
    default:
      return 'monthly';
  }
}

/** Default kelayakan BPJS/PPh untuk kategori pekerjaan */
export function defaultPayrollFlags(category: string): { bpjsEligible: boolean; taxEligible: boolean } {
  if (isCasualEmployment(category)) {
    return { bpjsEligible: false, taxEligible: false };
  }
  if (category === 'intern') {
    return { bpjsEligible: false, taxEligible: false };
  }
  return { bpjsEligible: true, taxEligible: true };
}
