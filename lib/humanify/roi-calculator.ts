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
  netSaving: number;
  roiPersen: number;
  paybackPeriodHari: number;
  penghematanTahunan: number;
  biayaSebelum: number;
  biayaSesudah: number;
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

export const ROI_ASSUMPTIONS = {
  efisiensiWaktu: 0.8,
  errorRatePayroll: 0.02,
  jamKerjaPerMinggu: 40,
  mingguPerBulan: 4,
  bulanPerTahun: 12,
} as const;

export const HUMANIFY_PRICING_TIERS = [
  { nama: 'Starter (1–100 Karyawan)', minKaryawan: 1, maxKaryawan: 100, hargaBulanan: 1_800_000 },
  { nama: 'Growth (101–300 Karyawan)', minKaryawan: 101, maxKaryawan: 300, hargaBulanan: 3_200_000 },
  { nama: 'Business (301–500 Karyawan)', minKaryawan: 301, maxKaryawan: 500, hargaBulanan: 4_800_000 },
  { nama: 'Enterprise (501–1000 Karyawan)', minKaryawan: 501, maxKaryawan: 1000, hargaBulanan: 7_200_000 },
  { nama: 'Enterprise Plus (1001+ Karyawan)', minKaryawan: 1001, maxKaryawan: Infinity, hargaBulanan: 9_500_000 },
] as const;

export function getPricingTier(jumlahKaryawan: number) {
  const tier = HUMANIFY_PRICING_TIERS.find(
    (t) => jumlahKaryawan >= t.minKaryawan && jumlahKaryawan <= t.maxKaryawan,
  );
  return tier ?? HUMANIFY_PRICING_TIERS[HUMANIFY_PRICING_TIERS.length - 1];
}

export function calculateRoi(input: RoiInput): RoiResult {
  const {
    efisiensiWaktu,
    errorRatePayroll,
    jamKerjaPerMinggu,
    mingguPerBulan,
    bulanPerTahun,
  } = ROI_ASSUMPTIONS;

  const penghematanJamPerBulan = input.jamAdminPerMinggu * mingguPerBulan * efisiensiWaktu;

  const penghematanBiayaHRStaff =
    (penghematanJamPerBulan / (jamKerjaPerMinggu * mingguPerBulan)) *
    input.jumlahStaffHR *
    input.rataGajiStaffHR;

  const penguranganErrorPayroll =
    input.jumlahKaryawan * input.rataGajiKaryawan * errorRatePayroll;

  const totalPenghematan = penghematanBiayaHRStaff + penguranganErrorPayroll;

  const tier = getPricingTier(input.jumlahKaryawan);
  const biayaLangganan = tier.hargaBulanan;
  const netSaving = totalPenghematan - biayaLangganan;

  const biayaSebelum =
    input.jumlahStaffHR * input.rataGajiStaffHR + penguranganErrorPayroll;
  const biayaSesudah = biayaSebelum - totalPenghematan + biayaLangganan;

  return {
    penghematanJamPerBulan,
    penghematanBiayaHRStaff,
    penguranganErrorPayroll,
    totalPenghematan,
    biayaLangganan,
    namaTier: tier.nama,
    netSaving,
    roiPersen: biayaLangganan > 0 ? (netSaving / biayaLangganan) * 100 : 0,
    paybackPeriodHari: netSaving > 0 ? (biayaLangganan / netSaving) * 30 : 0,
    penghematanTahunan: netSaving * bulanPerTahun,
    biayaSebelum,
    biayaSesudah,
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

/** Parse URL query params (jk, rg, jh, rh, ja) into RoiInput */
export function parseRoiQueryParams(query: Record<string, string | string[] | undefined>): RoiInput {
  const num = (key: string, fallback: number) => {
    const raw = query[key];
    const str = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(str);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  return {
    jumlahKaryawan: num('jk', ROI_DEFAULTS.jumlahKaryawan),
    rataGajiKaryawan: num('rg', ROI_DEFAULTS.rataGajiKaryawan),
    jumlahStaffHR: num('jh', ROI_DEFAULTS.jumlahStaffHR),
    rataGajiStaffHR: num('rh', ROI_DEFAULTS.rataGajiStaffHR),
    jamAdminPerMinggu: num('ja', ROI_DEFAULTS.jamAdminPerMinggu),
  };
}

export function buildRoiQueryString(input: RoiInput): string {
  const params = new URLSearchParams({
    jk: String(input.jumlahKaryawan),
    rg: String(input.rataGajiKaryawan),
    jh: String(input.jumlahStaffHR),
    rh: String(input.rataGajiStaffHR),
    ja: String(input.jamAdminPerMinggu),
  });
  return params.toString();
}
