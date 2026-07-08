/**
 * Konstanta bisnis Multifinance / Pembiayaan untuk HRIS & workforce.
 * Mendukung: leasing, kredit motor/mobil, multiguna, KTA, pembiayaan syariah.
 */

import type { HrisOption } from './workforce-types';

/** Tipe agen lapangan pembiayaan */
export const MF_AGENT_TYPES: HrisOption[] = [
  { code: 'account_officer', label: 'Account Officer (AO)', desc: 'Akuisisi & pencairan kredit baru' },
  { code: 'collector', label: 'Kolektor', desc: 'Penagihan & recovery angsuran' },
  { code: 'surveyor', label: 'Surveyor / Analis', desc: 'Survey kredit & verifikasi agunan' },
  { code: 'telemarketing', label: 'Telemarketing / Telesales', desc: 'Prospek & follow-up via telepon' },
  { code: 'field_agent', label: 'Agen Lapangan', desc: 'Kunjungan lapangan umum' },
  { code: 'branch_staff', label: 'Staf Cabang', desc: 'Operasional cabang pembiayaan' },
];

/** Produk pembiayaan */
export const MF_PRODUCT_TYPES: HrisOption[] = [
  { code: 'motor', label: 'Kredit Motor' },
  { code: 'mobil', label: 'Kredit Mobil' },
  { code: 'multiguna', label: 'Multiguna / Dana Talangan' },
  { code: 'kta', label: 'KTA (Tanpa Agunan)' },
  { code: 'syariah', label: 'Pembiayaan Syariah' },
  { code: 'heavy_equipment', label: 'Alat Berat / Mesin' },
  { code: 'working_capital', label: 'Modal Kerja' },
];

/** Jenis aktivitas lapangan */
export const MF_ACTIVITY_TYPES: HrisOption[] = [
  { code: 'collection', label: 'Penagihan / Koleksi', desc: 'Kunjungan penagihan angsuran' },
  { code: 'survey', label: 'Survey Kredit', desc: 'Survey calon debitur & agunan' },
  { code: 'disbursement', label: 'Pencairan', desc: 'Serah terima dana / unit' },
  { code: 'follow_up', label: 'Follow-up', desc: 'Tindak lanjut janji bayar / prospek' },
  { code: 'recovery', label: 'Recovery / Tarik Unit', desc: 'Penarikan agunan / unit' },
  { code: 'prospect', label: 'Prospek Baru', desc: 'Akuisisi nasabah baru' },
];

/** Hasil kunjungan koleksi */
export const MF_VISIT_OUTCOMES: HrisOption[] = [
  { code: 'paid_full', label: 'Bayar Lunas Angsuran' },
  { code: 'paid_partial', label: 'Bayar Sebagian' },
  { code: 'promise_to_pay', label: 'Janji Bayar (PTP)' },
  { code: 'not_home', label: 'Tidak Ada di Tempat' },
  { code: 'refused', label: 'Menolak Bayar' },
  { code: 'restructured', label: 'Restrukturisasi' },
  { code: 'unit_recovered', label: 'Unit/Agunan Ditarik' },
  { code: 'skip', label: 'Skip / Tidak Ditemukan' },
];

/** Jenis skema komisi */
export const MF_COMMISSION_TYPES: HrisOption[] = [
  { code: 'disbursement', label: 'Komisi Pencairan', desc: '% dari nilai pencairan kredit' },
  { code: 'collection', label: 'Komisi Penagihan', desc: '% dari angsuran tertagih' },
  { code: 'recovery', label: 'Komisi Recovery', desc: 'Bonus recovery NPL/tunggakan' },
  { code: 'prospect', label: 'Komisi Prospek', desc: 'Bonus per akuisisi nasabah baru' },
  { code: 'visit', label: 'Bonus Kunjungan', desc: 'Tetap per kunjungan valid' },
];

/** Bucket DPD (Days Past Due) untuk komisi recovery */
export const MF_DPD_BUCKETS: HrisOption[] = [
  { code: 'current', label: 'Lancar (0 hari)' },
  { code: 'dpd_1_30', label: 'DPD 1–30' },
  { code: 'dpd_31_60', label: 'DPD 31–60' },
  { code: 'dpd_61_90', label: 'DPD 61–90' },
  { code: 'dpd_90_plus', label: 'DPD > 90 (NPL)' },
];

export const MF_AGENT_EMPLOYMENT_CATEGORIES = [
  'account_officer', 'collector', 'surveyor', 'telemarketing', 'field_agent',
];

const agentMap = Object.fromEntries(MF_AGENT_TYPES.map((a) => [a.code, a.label]));
const productMap = Object.fromEntries(MF_PRODUCT_TYPES.map((p) => [p.code, p.label]));
const activityMap = Object.fromEntries(MF_ACTIVITY_TYPES.map((a) => [a.code, a.label]));
const outcomeMap = Object.fromEntries(MF_VISIT_OUTCOMES.map((o) => [o.code, o.label]));
const commissionMap = Object.fromEntries(MF_COMMISSION_TYPES.map((c) => [c.code, c.label]));

export function getAgentTypeLabel(code?: string | null): string {
  return code ? (agentMap[code] || code) : '-';
}

export function getProductTypeLabel(code?: string | null): string {
  return code ? (productMap[code] || code) : '-';
}

export function getActivityTypeLabel(code?: string | null): string {
  return code ? (activityMap[code] || code) : '-';
}

export function getVisitOutcomeLabel(code?: string | null): string {
  return code ? (outcomeMap[code] || code) : '-';
}

export function getCommissionTypeLabel(code?: string | null): string {
  return code ? (commissionMap[code] || code) : '-';
}

/** Rekomendasi pay_type untuk agen pembiayaan */
export function suggestedMfPayType(agentType: string): string {
  switch (agentType) {
    case 'collector':
      return 'commission';
    case 'account_officer':
    case 'field_agent':
      return 'base_plus_commission';
    case 'telemarketing':
      return 'monthly';
    case 'surveyor':
      return 'piecework';
    default:
      return 'monthly';
  }
}

/** Hitung komisi sederhana */
export function calcCommission(baseAmount: number, rateType: string, rateValue: number): number {
  if (rateType === 'percentage') return Math.round(baseAmount * rateValue / 100);
  return Math.round(rateValue);
}
