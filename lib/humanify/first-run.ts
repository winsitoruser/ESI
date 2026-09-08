/**
 * First-run HR journey — shared steps, storage keys, XP levels.
 * Progress is tenant-scoped so a new signup never inherits another account's checks.
 */

export const FIRST_RUN_STEPS = [
  {
    id: 'import',
    label: 'Tambah / impor karyawan',
    hint: 'Minimal 1 data karyawan aktif agar absensi & payroll punya subjek.',
    href: '/humanify/employees?add=1',
    tourTarget: 'hf-tour-employees',
    xp: 20,
  },
  {
    id: 'docs',
    label: 'Lengkapi dokumen inti',
    hint: 'KTP / NPWP di profil karyawan untuk compliance Day-1.',
    href: '/humanify/employees',
    tourTarget: 'hf-tour-docs',
    xp: 15,
  },
  {
    id: 'attendance',
    label: 'Siapkan absensi',
    hint: 'Buka absensi atau atur shift/geofence.',
    href: '/humanify/attendance',
    tourTarget: 'hf-tour-attendance',
    xp: 20,
  },
  {
    id: 'leave',
    label: 'Uji alur cuti',
    hint: 'Buat pengajuan cuti uji atau cek tipe cuti.',
    href: '/humanify/leave',
    tourTarget: 'hf-tour-leave',
    xp: 15,
  },
  {
    id: 'payroll',
    label: 'Coba payroll (Growth+)',
    hint: 'Isi gaji atau jalankan kalkulasi pertama.',
    href: '/humanify/payroll',
    tourTarget: 'hf-tour-payroll',
    xp: 20,
  },
  {
    id: 'ess',
    label: 'Buka portal karyawan (ESS)',
    hint: 'Lihat pengalaman karyawan setelah data ada.',
    href: '/humanify/ess',
    tourTarget: 'hf-tour-ess',
    xp: 10,
  },
] as const;

export type FirstRunStepId = (typeof FIRST_RUN_STEPS)[number]['id'];

export type FirstRunManual = Partial<Record<FirstRunStepId, boolean>>;

export interface FirstRunLiveSignals {
  employeeCount?: number;
  docsComplete?: boolean;
  hasAttendanceSignal?: boolean;
  hasLeaveSignal?: boolean;
  hasPayrollSignal?: boolean;
  essVisited?: boolean;
}

export function firstRunStorageKey(tenantId: string | null | undefined): string {
  const tid = String(tenantId || '').trim() || 'unknown';
  return `humanify-first-run-v2:${tid}`;
}

export function tourStorageKey(tenantId: string | null | undefined): string {
  const tid = String(tenantId || '').trim() || 'unknown';
  return `humanify-first-run-tour-v1:${tid}`;
}

/** Legacy unscoped key that caused cross-tenant false checks. */
export const LEGACY_GA_CHECKLIST_KEY = 'humanify-ga-checklist-v1';

export function deriveFirstRunDone(
  manual: FirstRunManual,
  live: FirstRunLiveSignals,
): Record<FirstRunStepId, boolean> {
  return {
    import: Boolean(manual.import) || (live.employeeCount || 0) >= 1,
    docs: Boolean(manual.docs) || Boolean(live.docsComplete),
    attendance: Boolean(manual.attendance) || Boolean(live.hasAttendanceSignal),
    leave: Boolean(manual.leave) || Boolean(live.hasLeaveSignal),
    payroll: Boolean(manual.payroll) || Boolean(live.hasPayrollSignal),
    ess: Boolean(manual.ess) || Boolean(live.essVisited),
  };
}

export function computeFirstRunXp(done: Record<string, boolean>): number {
  return FIRST_RUN_STEPS.reduce((sum, step) => sum + (done[step.id] ? step.xp : 0), 0);
}

export function firstRunLevel(xp: number): { name: string; nextAt: number; rank: number } {
  if (xp >= 100) return { name: 'Siap Operasi', nextAt: 100, rank: 3 };
  if (xp >= 50) return { name: 'HR Builder', nextAt: 100, rank: 2 };
  if (xp >= 20) return { name: 'Starter', nextAt: 50, rank: 1 };
  return { name: 'Pemula', nextAt: 20, rank: 0 };
}

export const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Selamat datang di Humanify',
    body: 'Tour singkat ini menuntun Day-1 HR. Selesaikan misi untuk naik level — seperti checklist berhadiah XP.',
    target: null as string | null,
  },
  {
    id: 'checklist',
    title: 'Misi hari pertama',
    body: 'Centang hanya setelah benar-benar dikerjakan. Progress tersimpan per perusahaan, bukan per browser global.',
    target: 'hf-tour-checklist',
  },
  {
    id: 'employees',
    title: 'Mulai dari karyawan',
    body: 'Tambah atau impor karyawan dulu — semua modul lain bergantung pada master data ini.',
    target: 'hf-tour-employees',
  },
  {
    id: 'modules',
    title: 'Modul HR di dashboard',
    body: 'Absensi, cuti, payroll, dan ESS ada di grid modul. Ikuti misi di checklist untuk urutan yang aman.',
    target: 'hf-tour-modules',
  },
  {
    id: 'go-live',
    title: 'Go-live checklist resmi',
    body: 'Untuk sinyal sistem (email, setup wizard, billing), buka Go-live Checklist di sidebar setelah tour ini.',
    target: null,
    href: '/humanify/go-live',
  },
] as const;
