/**
 * Kategorisasi tenaga kerja Humanify — organik, non-organik (outsourcing), TKA.
 * Mendukung pengelolaan terpisah dari karyawan PKWTT/PKWT organik.
 */

export type WorkforceSegment = 'organic' | 'non_organic' | 'foreign';

export type EmploymentCategory =
  | 'permanent'      // PKWTT
  | 'contract'       // PKWT
  | 'probation'
  | 'intern'         // magang
  | 'freelance'
  | 'daily_casual'
  | 'labor'
  | 'outsource'      // tenaga non-organik / alih daya
  | 'foreign';      // TKA (boleh overlap kontrak)

/** Jenis izin / dokumen TKA yang umum dikelola HR */
export type TkaPermitType =
  | 'rptka'           // Rencana Penggunaan TKA
  | 'imta'            // IMTA (legacy naming) / notifikasi Kemnaker
  | 'vitas'           // Visa tinggal terbatas
  | 'kitas'           // Kartu Izin Tinggal Terbatas
  | 'kitap'           // Kartu Izin Tinggal Tetap
  | 'passport'
  | 'work_agreement'  // Perjanjian kerja TKA
  | 'other';

export const TKA_PERMIT_TYPES: { id: TkaPermitType; label: string; description: string }[] = [
  { id: 'rptka', label: 'RPTKA', description: 'Rencana Penggunaan Tenaga Kerja Asing' },
  { id: 'imta', label: 'IMTA / Notifikasi Kemnaker', description: 'Izin / notifikasi mempekerjakan TKA' },
  { id: 'vitas', label: 'VITAS', description: 'Visa tinggal terbatas' },
  { id: 'kitas', label: 'KITAS', description: 'Kartu Izin Tinggal Terbatas' },
  { id: 'kitap', label: 'KITAP', description: 'Kartu Izin Tinggal Tetap' },
  { id: 'passport', label: 'Paspor', description: 'Dokumen perjalanan TKA' },
  { id: 'work_agreement', label: 'Perjanjian kerja TKA', description: 'Kontrak kerja dengan TKA' },
  { id: 'other', label: 'Lainnya', description: 'Dokumen pendukung lain' },
];

export type TkaPermitStatus = 'draft' | 'submitted' | 'approved' | 'active' | 'expiring' | 'expired' | 'revoked';

export const OUTSOURCE_VENDOR_TYPES = [
  { id: 'pkwt_provider', label: 'Penyedia tenaga kerja (UU Cipta Kerja / PP 35)' },
  { id: 'job_contractor', label: 'Pemborongan pekerjaan' },
  { id: 'agency', label: 'Agency / staffing' },
  { id: 'other', label: 'Lainnya' },
] as const;

export type OutsourceVendorType = typeof OUTSOURCE_VENDOR_TYPES[number]['id'];

export const WORKFORCE_SEGMENTS: {
  id: WorkforceSegment;
  label: string;
  description: string;
  categories: EmploymentCategory[];
}[] = [
  {
    id: 'organic',
    label: 'Organik',
    description: 'Karyawan dengan hubungan kerja langsung (PKWTT, PKWT, magang, harian perusahaan)',
    categories: ['permanent', 'contract', 'probation', 'intern', 'daily_casual', 'labor', 'freelance'],
  },
  {
    id: 'non_organic',
    label: 'Non-organik / Outsourcing',
    description: 'Tenaga yang dikelola melalui vendor alih daya / pemborongan — bukan karyawan organik perusahaan pengguna',
    categories: ['outsource'],
  },
  {
    id: 'foreign',
    label: 'Tenaga Kerja Asing (TKA)',
    description: 'Warga negara asing yang dipekerjakan; wajib kelola RPTKA, izin tinggal, dan dokumen terkait',
    categories: ['foreign', 'contract', 'permanent'],
  },
];

export function segmentForCategory(category?: string | null, isForeign?: boolean): WorkforceSegment {
  if (isForeign || category === 'foreign') return 'foreign';
  if (category === 'outsource') return 'non_organic';
  return 'organic';
}

export function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / (24 * 60 * 60 * 1000));
}

export function derivePermitStatus(expiryDate?: string | null, current?: TkaPermitStatus): TkaPermitStatus {
  if (current === 'revoked' || current === 'draft' || current === 'submitted') return current;
  const d = daysUntil(expiryDate);
  if (d == null) return current || 'active';
  if (d < 0) return 'expired';
  if (d <= 60) return 'expiring';
  return 'approved';
}
