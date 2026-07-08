/** Humanify — HRIS product branding (Naincode) */

export const NAINCODE = {
  name: 'Naincode',
  legalName: 'Naincode Inti Teknologi',
  tagline: 'Inti teknologi untuk operasional bisnis',
  website: 'https://naincode.com',
} as const;

export const HUMANIFY_BRAND = {
  name: 'Humanify',
  productType: 'HRIS System',
  tagline: 'HRIS Software for People & Growth',
  logoPath: '/images/humanify-logo.png',
  /** Full white wordmark for dark marketing pages (welcome, landing) */
  welcomeLogoPath: '/images/humanify-logo-welcome.png',
  welcomeLogoAspect: 1024 / 405,
  description:
    'Sistem HRIS lengkap untuk mengelola karyawan, kehadiran, payroll, rekrutmen, dan kinerja — bagian dari ekosistem produk Naincode.',
  company: NAINCODE.legalName,
  parent: NAINCODE.name,
  loginPath: '/humanify/login',
  welcomePath: '/humanify/welcome',
  appPath: '/humanify',
  employeePortalPath: '/employee',
} as const;

export const HUMANIFY_FEATURES = [
  { title: 'Rekrutmen & Onboarding', desc: 'Dealls, LinkedIn, Indeed, Google Jobs, WhatsApp 1-click, E-Sign Privy, onboarding checklist' },
  { title: 'Database Karyawan', desc: 'Org chart, mutasi, contract expiry alert, custom data, genealogy' },
  { title: 'Payroll, Tax, BPJS', desc: 'Integrated calculation, THR, bonus, kasbon, pinjaman, slip gaji, tax & BPJS report' },
  { title: 'OKR / KPI', desc: 'Unlimited cascading alignment, monitoring, check-in, in-app reminder' },
  { title: 'Shift & Absensi', desc: 'GPS/geofence CI/CO, live tracking, leave, overtime management' },
  { title: 'Reimbursement', desc: 'Expense policy, self-service request, budget tracking per employee' },
  { title: 'Appraisal / 360°', desc: 'Performance review, 360 feedback, custom forms, 9-box matrix' },
  { title: 'Certificate & Analytics', desc: 'Certificate tracker, attendance stats, overtime & payroll analytics' },
  { title: 'Offboarding & Exit', desc: 'Exit interview, asset return, penggantian hak & cuti, final payroll, paklaring' },
  { title: 'Portal Karyawan', desc: 'Employee self-service — absensi, cuti, slip gaji, klaim' },
] as const;
