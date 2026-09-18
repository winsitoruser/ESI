import { quoteSeatSubscription } from '@/lib/saas/seat-pricing-core';

/** Humanify ROI Calculator — estimasi penghematan HRIS */

export interface RoiInput {
  jumlahKaryawan: number;
  rataGajiKaryawan: number;
  jumlahStaffHR: number;
  rataGajiStaffHR: number;
  jamAdminPerMinggu: number;
}

export interface RoiResult {
  penghematanJamPerBulan: number;
  penghematanBiayaHRStaff: number;
  penguranganErrorPayroll: number;
  totalPenghematan: number;
  biayaLangganan: number;
  namaTier: string;
  hargaPerUser: number;
  netSaving: number;
  roiPersen: number;
  paybackPeriodHari: number;
  penghematanTahunan: number;
  biayaSebelum: number;
  biayaSesudah: number;
  /** FTE-equivalent of hours saved (for storytelling) */
  fteDihémat: number;
}

export interface RoiMonthlyProjection {
  bulan: string;
  biayaLangganan: number;
  penghematan: number;
  netSaving: number;
}

export const ROI_DEFAULTS: RoiInput = {
  jumlahKaryawan: 100,
  rataGajiKaryawan: 5_000_000,
  jumlahStaffHR: 3,
  rataGajiStaffHR: 6_000_000,
  jamAdminPerMinggu: 30,
};

export const ROI_FIELD_RANGES = {
  jumlahKaryawan: { min: 10, max: 3000, step: 10 },
  rataGajiKaryawan: { min: 2_000_000, max: 30_000_000, step: 500_000 },
  jumlahStaffHR: { min: 1, max: 20, step: 1 },
  rataGajiStaffHR: { min: 3_000_000, max: 30_000_000, step: 500_000 },
  jamAdminPerMinggu: { min: 5, max: 60, step: 1 },
} as const;

/**
 * Conservative assumptions for credible sales conversations.
 * - efisiensiWaktu: share of admin hours automated by HRIS (payroll, absensi, cuti, ESS)
 * - errorRatePayroll: monthly payroll correction / overpayment avoided (of monthly wage bill)
 */
export const ROI_ASSUMPTIONS = {
  efisiensiWaktu: 0.7,
  errorRatePayroll: 0.005,
  jamKerjaPerMinggu: 40,
  mingguPerBulan: 4,
  bulanPerTahun: 12,
} as const;

/** Short query keys used in shareable URLs */
export const ROI_QUERY_KEYS = ['jk', 'rg', 'jh', 'rh', 'ja'] as const;

export type RoiCompanyPreset = {
  id: string;
  label: string;
  hint: string;
  values: RoiInput;
};

export const ROI_COMPANY_PRESETS: RoiCompanyPreset[] = [
  {
    id: 'startup',
    label: 'Startup',
    hint: '25 karyawan',
    values: {
      jumlahKaryawan: 25,
      rataGajiKaryawan: 7_000_000,
      jumlahStaffHR: 1,
      rataGajiStaffHR: 8_000_000,
      jamAdminPerMinggu: 20,
    },
  },
  {
    id: 'sme',
    label: 'UKM',
    hint: '100 karyawan',
    values: { ...ROI_DEFAULTS },
  },
  {
    id: 'mid',
    label: 'Menengah',
    hint: '500 karyawan',
    values: {
      jumlahKaryawan: 500,
      rataGajiKaryawan: 6_000_000,
      jumlahStaffHR: 6,
      rataGajiStaffHR: 8_000_000,
      jamAdminPerMinggu: 40,
    },
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    hint: '1.500 karyawan',
    values: {
      jumlahKaryawan: 1500,
      rataGajiKaryawan: 7_500_000,
      jumlahStaffHR: 12,
      rataGajiStaffHR: 10_000_000,
      jamAdminPerMinggu: 50,
    },
  },
];

/** Maps savings drivers to Humanify product modules (marketing copy). */
export const ROI_VALUE_DRIVERS = [
  {
    id: 'time',
    title: 'Otomasi admin HR',
    desc: 'Payroll, absensi GPS, cuti, dan portal karyawan mengurangi pekerjaan manual berulang.',
    modules: ['Payroll & BPJS', 'Absensi & Shift', 'Cuti & ESS'],
  },
  {
    id: 'payroll',
    title: 'Akurasi payroll',
    desc: 'Hitung gaji, THR, pajak, dan BPJS terintegrasi — lebih sedikit koreksi dan overpayment.',
    modules: ['Payroll', 'Slip Gaji', 'Laporan Pajak'],
  },
  {
    id: 'selfserve',
    title: 'Self-service karyawan',
    desc: 'Karyawan ajukan cuti, cek slip, dan klaim sendiri — HR fokus ke keputusan, bukan tiket.',
    modules: ['Portal Karyawan', 'Reimbursement', 'Dokumen'],
  },
] as const;

/**
 * Per-user volume pricing — ROI uses billed headcount, not flat plan list.
 */
export const HUMANIFY_PRICING_TIERS = [
  {
    nama: 'Standar (1–250 karyawan)',
    minKaryawan: 1,
    maxKaryawan: 250,
    hargaPerUser: 10_000,
    planId: 'starter' as const,
  },
  {
    nama: 'Volume 251–1.000',
    minKaryawan: 251,
    maxKaryawan: 1000,
    hargaPerUser: 9_500,
    planId: 'growth' as const,
  },
  {
    nama: 'Volume 1.001+',
    minKaryawan: 1001,
    maxKaryawan: Infinity,
    hargaPerUser: 9_000,
    planId: 'enterprise' as const,
  },
] as const;

export function getPricingTier(jumlahKaryawan: number) {
  const tier = HUMANIFY_PRICING_TIERS.find(
    (t) => jumlahKaryawan >= t.minKaryawan && jumlahKaryawan <= t.maxKaryawan,
  );
  return tier ?? HUMANIFY_PRICING_TIERS[HUMANIFY_PRICING_TIERS.length - 1];
}

export function clampRoiInput(input: Partial<RoiInput> | null | undefined): RoiInput {
  const base = { ...ROI_DEFAULTS, ...(input || {}) };
  const clamp = (key: keyof RoiInput) => {
    const range = ROI_FIELD_RANGES[key];
    const raw = Number(base[key]);
    const n = Number.isFinite(raw) ? raw : ROI_DEFAULTS[key];
    const stepped = Math.round(n / range.step) * range.step;
    return Math.min(range.max, Math.max(range.min, stepped));
  };
  return {
    jumlahKaryawan: clamp('jumlahKaryawan'),
    rataGajiKaryawan: clamp('rataGajiKaryawan'),
    jumlahStaffHR: clamp('jumlahStaffHR'),
    rataGajiStaffHR: clamp('rataGajiStaffHR'),
    jamAdminPerMinggu: clamp('jamAdminPerMinggu'),
  };
}

export function calculateRoi(input: RoiInput): RoiResult {
  const values = clampRoiInput(input);
  const {
    efisiensiWaktu,
    errorRatePayroll,
    jamKerjaPerMinggu,
    mingguPerBulan,
    bulanPerTahun,
  } = ROI_ASSUMPTIONS;

  const jamKerjaBulan = jamKerjaPerMinggu * mingguPerBulan;
  const penghematanJamPerBulan = values.jamAdminPerMinggu * mingguPerBulan * efisiensiWaktu;

  const penghematanBiayaHRStaff =
    (penghematanJamPerBulan / jamKerjaBulan) * values.jumlahStaffHR * values.rataGajiStaffHR;

  const penguranganErrorPayroll =
    values.jumlahKaryawan * values.rataGajiKaryawan * errorRatePayroll;

  const totalPenghematan = penghematanBiayaHRStaff + penguranganErrorPayroll;

  const tier = getPricingTier(values.jumlahKaryawan);
  const quote = quoteSeatSubscription({ seats: values.jumlahKaryawan, interval: 'monthly' });
  const biayaLangganan = quote.monthlyIdr;
  const netSaving = totalPenghematan - biayaLangganan;

  const biayaSebelum =
    values.jumlahStaffHR * values.rataGajiStaffHR + penguranganErrorPayroll;
  const biayaSesudah = biayaSebelum - totalPenghematan + biayaLangganan;

  return {
    penghematanJamPerBulan,
    penghematanBiayaHRStaff,
    penguranganErrorPayroll,
    totalPenghematan,
    biayaLangganan,
    namaTier: tier.nama,
    hargaPerUser: quote.rateIdr,
    netSaving,
    roiPersen: biayaLangganan > 0 ? (netSaving / biayaLangganan) * 100 : 0,
    paybackPeriodHari: netSaving > 0 ? (biayaLangganan / netSaving) * 30 : 0,
    penghematanTahunan: netSaving * bulanPerTahun,
    biayaSebelum,
    biayaSesudah,
    fteDihémat: penghematanJamPerBulan / jamKerjaBulan,
  };
}

export function getMonthlyProjection(result: RoiResult): RoiMonthlyProjection[] {
  const rows: RoiMonthlyProjection[] = [];
  for (let month = 1; month <= 12; month++) {
    const biayaLangganan = result.biayaLangganan * month;
    const penghematan = result.totalPenghematan * month;
    rows.push({
      bulan: `Bulan ${month}`,
      biayaLangganan,
      penghematan,
      netSaving: penghematan - biayaLangganan,
    });
  }
  return rows;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value);
}

export function hasRoiQueryParams(
  query: Record<string, string | string[] | undefined>,
): boolean {
  return ROI_QUERY_KEYS.some((k) => {
    const v = query[k];
    if (v == null) return false;
    const str = Array.isArray(v) ? v[0] : v;
    return String(str).length > 0;
  });
}

/** Parse URL query params (jk, rg, jh, rh, ja) into RoiInput */
export function parseRoiQueryParams(
  query: Record<string, string | string[] | undefined>,
): RoiInput {
  const num = (key: string, fallback: number) => {
    const raw = query[key];
    const str = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(str);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  return clampRoiInput({
    jumlahKaryawan: num('jk', ROI_DEFAULTS.jumlahKaryawan),
    rataGajiKaryawan: num('rg', ROI_DEFAULTS.rataGajiKaryawan),
    jumlahStaffHR: num('jh', ROI_DEFAULTS.jumlahStaffHR),
    rataGajiStaffHR: num('rh', ROI_DEFAULTS.rataGajiStaffHR),
    jamAdminPerMinggu: num('ja', ROI_DEFAULTS.jamAdminPerMinggu),
  });
}

export function buildRoiQueryString(input: RoiInput): string {
  const clamped = clampRoiInput(input);
  const params = new URLSearchParams({
    jk: String(clamped.jumlahKaryawan),
    rg: String(clamped.rataGajiKaryawan),
    jh: String(clamped.jumlahStaffHR),
    rh: String(clamped.rataGajiStaffHR),
    ja: String(clamped.jamAdminPerMinggu),
  });
  return params.toString();
}

export function matchCompanyPreset(input: RoiInput): string | null {
  const clamped = clampRoiInput(input);
  const found = ROI_COMPANY_PRESETS.find((p) =>
    (Object.keys(p.values) as Array<keyof RoiInput>).every(
      (k) => p.values[k] === clamped[k],
    ),
  );
  return found?.id ?? null;
}
