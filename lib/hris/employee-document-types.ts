/** Kategori & tipe dokumen karyawan HRIS — selaras standar Mekari Talenta Employee Files */

export type EmployeeDocumentCategory =
  | 'identitas'
  | 'kepegawaian'
  | 'pendidikan'
  | 'keuangan'
  | 'kendaraan'
  | 'lainnya';

export type DocumentVerificationStatus = 'pending' | 'verified' | 'rejected' | 'draft';
export type DocumentLifecycleStatus = 'active' | 'expired' | 'revoked';

export interface EmployeeDocumentTypeOption {
  value: string;
  label: string;
  category: EmployeeDocumentCategory;
  /** Dokumen wajib saat onboarding / kelengkapan berkas */
  required?: boolean;
  hasNumber?: boolean;
  hasExpiry?: boolean;
  /** Petunjuk upload untuk HR */
  uploadHint?: string;
}

export const EMPLOYEE_DOCUMENT_CATEGORIES: { key: EmployeeDocumentCategory; label: string }[] = [
  { key: 'identitas', label: 'Identitas & Keluarga' },
  { key: 'kepegawaian', label: 'Kepegawaian & Kontrak' },
  { key: 'pendidikan', label: 'Pendidikan & Sertifikasi' },
  { key: 'keuangan', label: 'Keuangan & BPJS' },
  { key: 'kendaraan', label: 'Kendaraan & Perjalanan' },
  { key: 'lainnya', label: 'Lainnya' },
];

export const EMPLOYEE_DOCUMENT_TYPES: EmployeeDocumentTypeOption[] = [
  // Identitas — wajib onboarding
  { value: 'KTP', label: 'KTP (Kartu Tanda Penduduk)', category: 'identitas', required: true, hasNumber: true, uploadHint: 'Foto/scan KTP asli, jelas & tidak blur' },
  { value: 'KK', label: 'KK (Kartu Keluarga)', category: 'identitas', required: true, hasNumber: true, uploadHint: 'Scan halaman identitas karyawan di KK' },
  { value: 'FOTO', label: 'Foto Karyawan', category: 'lainnya', required: true, uploadHint: 'Foto formal berlatar polos, wajah terlihat jelas' },
  { value: 'AKTA_LAHIR', label: 'Akta Kelahiran', category: 'identitas' },
  { value: 'AKTA_NIKAH', label: 'Akta Nikah / Buku Nikah', category: 'identitas' },
  { value: 'PASPOR', label: 'Paspor', category: 'identitas', hasNumber: true, hasExpiry: true },
  { value: 'KITAS', label: 'KITAS / Izin Tinggal', category: 'identitas', hasNumber: true, hasExpiry: true },

  // Kepegawaian
  { value: 'KONTRAK_KERJA', label: 'Kontrak Kerja', category: 'kepegawaian', required: true, hasNumber: true },
  { value: 'PKWT', label: 'PKWT', category: 'kepegawaian', hasNumber: true, hasExpiry: true },
  { value: 'PKWTT', label: 'PKWTT', category: 'kepegawaian', hasNumber: true },
  { value: 'NDA', label: 'Perjanjian Kerahasiaan (NDA)', category: 'kepegawaian' },
  { value: 'SP', label: 'Surat Peringatan (SP)', category: 'kepegawaian', hasNumber: true },
  { value: 'SK_PENGANGKATAN', label: 'SK Pengangkatan', category: 'kepegawaian', hasNumber: true },
  { value: 'SK_MUTASI', label: 'SK Mutasi', category: 'kepegawaian', hasNumber: true },
  { value: 'SK_PROMOSI', label: 'SK Promosi', category: 'kepegawaian', hasNumber: true },
  { value: 'SURAT_REFERENSI', label: 'Surat Referensi', category: 'kepegawaian' },
  { value: 'SURAT_KETERANGAN_KERJA', label: 'Surat Keterangan Kerja', category: 'kepegawaian' },

  // Pendidikan
  { value: 'IJAZAH', label: 'Ijazah', category: 'pendidikan', required: true, uploadHint: 'Scan ijazah terakhir / pendidikan tertinggi' },
  { value: 'TRANSKRIP', label: 'Transkrip Nilai', category: 'pendidikan' },
  { value: 'SERTIFIKAT', label: 'Sertifikat / Lisensi', category: 'pendidikan', hasExpiry: true },
  { value: 'SERTIFIKAT_PELATIHAN', label: 'Sertifikat Pelatihan', category: 'pendidikan', hasExpiry: true },
  { value: 'CV', label: 'Curriculum Vitae (CV)', category: 'lainnya' },

  // Keuangan — wajib payroll
  { value: 'NPWP', label: 'NPWP', category: 'keuangan', required: true, hasNumber: true, uploadHint: 'Foto/scan kartu NPWP atau SKT' },
  { value: 'BPJS', label: 'Kartu BPJS', category: 'keuangan', hasNumber: true },
  { value: 'BPJS_KETENAGAKERJAAN', label: 'BPJS Ketenagakerjaan', category: 'keuangan', required: true, hasNumber: true },
  { value: 'BPJS_KESEHATAN', label: 'BPJS Kesehatan', category: 'keuangan', required: true, hasNumber: true },
  { value: 'REKENING_BANK', label: 'Buku Tabungan / Rekening Bank', category: 'keuangan', required: true, hasNumber: true, uploadHint: 'Halaman depan buku tabungan / screenshot rekening payroll' },

  // Kendaraan
  { value: 'SIM', label: 'SIM', category: 'kendaraan', hasNumber: true, hasExpiry: true },
  { value: 'STNK', label: 'STNK', category: 'kendaraan', hasNumber: true, hasExpiry: true },

  { value: 'OTHER', label: 'Dokumen Lainnya', category: 'lainnya' },
];

const TYPE_MAP = Object.fromEntries(EMPLOYEE_DOCUMENT_TYPES.map((t) => [t.value, t]));

export const REQUIRED_DOCUMENT_TYPES = EMPLOYEE_DOCUMENT_TYPES.filter((t) => t.required);

export const ACCEPTED_DOCUMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];
export const ACCEPTED_DOCUMENT_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
export const MAX_DOCUMENT_SIZE_MB = 10;

const EXT_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export function getDocumentTypeLabel(value: string): string {
  return TYPE_MAP[value]?.label || value?.replace(/_/g, ' ') || value;
}

export function getDocumentTypeMeta(value: string): EmployeeDocumentTypeOption | undefined {
  return TYPE_MAP[value];
}

export function getDocumentTypesByCategory(category: EmployeeDocumentCategory): EmployeeDocumentTypeOption[] {
  return EMPLOYEE_DOCUMENT_TYPES.filter((t) => t.category === category);
}

export function isAcceptedFile(file: { name?: string; type?: string }): boolean {
  const ext = (file.name || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  const mime = file.type || EXT_MIME[ext] || '';
  if (mime && ACCEPTED_DOCUMENT_MIME.includes(mime)) return true;
  return ACCEPTED_DOCUMENT_EXTENSIONS.includes(ext);
}

export function getAcceptAttribute(): string {
  return ACCEPTED_DOCUMENT_EXTENSIONS.join(',');
}

export type ExpiryState = 'none' | 'valid' | 'expiring_soon' | 'expired';

export function getExpiryState(expiryDate?: string | null, warnDays = 30): ExpiryState {
  if (!expiryDate) return 'none';
  const exp = new Date(expiryDate);
  if (Number.isNaN(exp.getTime())) return 'none';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  const diffDays = (exp.getTime() - now.getTime()) / 86400000;
  if (diffDays < 0) return 'expired';
  if (diffDays <= warnDays) return 'expiring_soon';
  return 'valid';
}

export function getVerificationLabel(status?: string | null): string {
  const map: Record<string, string> = {
    pending: 'Menunggu Verifikasi',
    verified: 'Terverifikasi',
    rejected: 'Ditolak',
    draft: 'Draft',
    active: 'Aktif',
    expired: 'Kedaluwarsa',
    revoked: 'Dicabut',
  };
  return map[status || ''] || status || 'Menunggu Verifikasi';
}

export interface DocumentCompleteness {
  totalRequired: number;
  uploadedRequired: number;
  verifiedRequired: number;
  percent: number;
  missing: EmployeeDocumentTypeOption[];
  expiringSoon: any[];
  expired: any[];
}

/** Hitung kelengkapan dokumen wajib (standar Mekari Employee Files checklist) */
export function computeDocumentCompleteness(documents: any[]): DocumentCompleteness {
  const byType = new Map<string, any[]>();
  (documents || []).forEach((d) => {
    const list = byType.get(d.document_type) || [];
    list.push(d);
    byType.set(d.document_type, list);
  });

  const missing: EmployeeDocumentTypeOption[] = [];
  let uploadedRequired = 0;
  let verifiedRequired = 0;

  REQUIRED_DOCUMENT_TYPES.forEach((req) => {
    const docs = byType.get(req.value) || [];
    const withFile = docs.filter((d) => d.file_url);
    if (withFile.length === 0) {
      missing.push(req);
    } else {
      uploadedRequired += 1;
      if (withFile.some((d) => d.status === 'verified' || d.metadata?.verification_status === 'verified')) {
        verifiedRequired += 1;
      }
    }
  });

  const expiringSoon: any[] = [];
  const expired: any[] = [];
  (documents || []).forEach((d) => {
    const state = getExpiryState(d.expiry_date);
    if (state === 'expiring_soon') expiringSoon.push(d);
    if (state === 'expired') expired.push(d);
  });

  const totalRequired = REQUIRED_DOCUMENT_TYPES.length;
  const percent = totalRequired > 0 ? Math.round((uploadedRequired / totalRequired) * 100) : 100;

  return {
    totalRequired,
    uploadedRequired,
    verifiedRequired,
    percent,
    missing,
    expiringSoon,
    expired,
  };
}

export function getEmployeeDocumentDownloadUrl(docId: string, download = false): string {
  const params = new URLSearchParams({ action: 'download', id: String(docId) });
  if (download) params.set('disposition', 'attachment');
  return `/api/humanify/employee-documents?${params.toString()}`;
}
