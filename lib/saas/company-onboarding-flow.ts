/**
 * Post–create-company journey (tenant-isolated).
 *
 * 1. Modal create → buka setup `?from=new-company&companyId=` (tanpa menunggu JWT switch)
 * 2. Wizard: lokasi, org, kebijakan, karyawan (boleh dilewati), go-live
 * 3. Dashboard: checklist operasional (karyawan → absensi → payroll)
 * JWT switch di tab parent bersifat fire-and-forget; GET onboarding memakai companyId + membership.
 */
export const NEW_COMPANY_SETUP_HREF = '/humanify/setup?from=new-company';
export const NEW_COMPANY_DASHBOARD_HREF = '/humanify?onboard=new-company';
export const SETUP_LAUNCH_DASHBOARD_HREF = '/humanify?onboard=1';
const HUMANIFY_LOGIN_PATH = '/humanify/login';

/** Setup wizard for a newly created company (load by companyId; no JWT switch required). */
export function newCompanySetupHref(tenantId?: string | null): string {
  const id = String(tenantId || '').trim();
  if (!id) return NEW_COMPANY_SETUP_HREF;
  return `${NEW_COMPANY_SETUP_HREF}&companyId=${encodeURIComponent(id)}`;
}

/** Login redirect that keeps setup query (`from`, `companyId`). */
export function humanifyLoginHref(callbackPath?: string | null): string {
  const dest = String(callbackPath || '').trim();
  const safe = dest.startsWith('/humanify') ? dest : '/humanify';
  return `${HUMANIFY_LOGIN_PATH}?callbackUrl=${encodeURIComponent(safe)}`;
}

export const INDUSTRY_LABELS: Record<string, string> = {
  professional_services: 'Jasa Profesional',
  software_house: 'Teknologi / IT',
  manufacturing: 'Manufaktur',
  retail_general: 'Retail',
  hospitality: 'Hospitality',
  health: 'Kesehatan',
  other: 'Lainnya',
};

export const POST_LAUNCH_ACTIONS = [
  {
    href: '/humanify/employees?add=1',
    title: 'Tambah karyawan',
    hint: 'Impor atau input data agar absensi & gaji punya subjek.',
  },
  {
    href: '/humanify/attendance',
    title: 'Siapkan absensi',
    hint: 'Shift, geofence, atau perangkat fingerprint.',
  },
  {
    href: '/humanify/leave',
    title: 'Cek kebijakan cuti',
    hint: 'Tipe cuti sudah terisi dari wizard — uji satu pengajuan.',
  },
  {
    href: '/humanify/payroll',
    title: 'Siapkan payroll',
    hint: 'Komponen gaji dan siklus pertama untuk perusahaan ini.',
  },
] as const;

export function industryLabel(value?: string | null): string {
  const key = String(value || '').trim();
  return INDUSTRY_LABELS[key] || key || 'Industri belum diisi';
}
