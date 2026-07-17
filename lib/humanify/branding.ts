/** Humanify — HRIS product branding (Naincode) */

export const NAINCODE = {
  name: 'Naincode',
  legalName: 'Naincode Inti Teknologi',
  tagline: 'Inti teknologi untuk operasional bisnis',
  footerTagline:
    'Trusted technology partner to build scalable, secure digital solutions that have a real impact on your business growth.',
  website: 'https://naincode.com',
  logoPath: '/images/naincode-logo.png',
  logoTextPath: '/images/humanify_white.png',
  email: 'hello@naincode.com',
  phone: '+62 877-8814-1650',
  address:
    'Jl. Tanah Abang II No.74A, Petojo Sel., Kecamatan Gambir, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10160',
  social: {
    linkedin: 'https://linkedin.com/company/naincode',
    instagram: 'https://instagram.com/naincode.com',
    github: 'https://github.com/naincode',
    youtube: 'https://youtube.com/@naincode',
  },
  footerLinks: {
    services: [
      { label: 'Web Development', href: 'https://naincode.com/layanan/web-development' },
      { label: 'Mobile Development', href: 'https://naincode.com/layanan/mobile-development' },
      { label: 'UI/UX Design', href: 'https://naincode.com/layanan/ui-ux' },
      { label: 'Cloud & DevOps', href: 'https://naincode.com/layanan/cloud-devops' },
      { label: 'Digital Transformation', href: 'https://naincode.com/layanan/digital-transformation' },
      { label: 'Cybersecurity', href: 'https://naincode.com/layanan/cybersecurity' },
    ],
    industries: [
      { label: 'Enterprise', href: 'https://naincode.com/industri/enterprise' },
      { label: 'SME', href: 'https://naincode.com/industri/sme' },
      { label: 'Startup', href: 'https://naincode.com/industri/startup' },
      { label: 'Case Studies', href: 'https://naincode.com/studi-kasus' },
      { label: 'Products', href: 'https://naincode.com/produk' },
    ],
    company: [
      { label: 'About Us', href: 'https://naincode.com/tentang' },
      { label: 'Our Process', href: 'https://naincode.com/proses' },
      { label: 'Consultation', href: 'https://naincode.com/konsultasi' },
      { label: 'Blog & Insight', href: 'https://naincode.com/blog' },
      { label: 'FAQ', href: 'https://naincode.com/faq' },
    ],
  },
} as const;

export const HUMANIFY_BRAND = {
  name: 'Humanify',
  productType: 'HRIS System',
  tagline: 'HRIS Software for People & Growth',
  logoPath: '/images/humanify-logo.png',
  /** Full wordmark for dark marketing pages (welcome, login) */
  welcomeLogoPath: '/images/humanify_white.png',
  welcomeLogoAspect: 1024 / 405,
  /** Full wordmark for light background (app/dashboard sidebar) */
  appLogoPath: '/images/humanify.png',
  appLogoAspect: 1024 / 405,
  description:
    'Sistem HRIS lengkap untuk mengelola karyawan, kehadiran, payroll, rekrutmen, dan kinerja — bagian dari ekosistem produk Naincode.',
  company: NAINCODE.legalName,
  parent: NAINCODE.name,
  loginPath: '/humanify/login',
  signupPath: '/humanify/signup',
  setupPath: '/humanify/setup',
  welcomePath: '/humanify/welcome',
  roiCalculatorPath: '/humanify/pricing/roi-calculator',
  appPath: '/humanify',
  employeePortalPath: '/employee',
  employeeLoginPath: '/employee/login',
} as const;

export const HUMANIFY_FEATURES = [
  { title: 'Rekrutmen & Onboarding', desc: 'Pipeline kandidat, webhook job board, onboarding checklist, integrasi e-sign (Privy) tersedia.', href: '/humanify/recruitment' },
  { title: 'Database Karyawan', desc: 'Org chart, mutasi, contract expiry alert, custom data, genealogy.', href: '/humanify/employees' },
  { title: 'Payroll, Tax, BPJS', desc: 'Perhitungan terintegrasi, THR, bonus, kasbon, pinjaman, slip gaji, laporan pajak & BPJS.', href: '/humanify/payroll' },
  { title: 'OKR / KPI', desc: 'Cascading alignment, monitoring, check-in, dan pengingat in-app.', href: '/humanify/kpi' },
  { title: 'Shift & Absensi', desc: 'GPS/geofence clock-in/out, shift, cuti, dan manajemen lembur.', href: '/humanify/attendance-management' },
  { title: 'Reimbursement', desc: 'Kebijakan expense, self-service request, OCR struk, tracking budget per karyawan.', href: '/humanify/reimbursement' },
  { title: 'Appraisal / 360°', desc: 'Performance review, feedback 360°, form kustom, matriks 9-box.', href: '/humanify/performance' },
  { title: 'Certificate & Analytics', desc: 'Certificate tracker, statistik absensi, lembur & payroll analytics.', href: '/humanify/workforce-analytics' },
  { title: 'Offboarding & Exit', desc: 'Exit interview, pengembalian asset, hak & cuti, final payroll, paklaring.', href: '/humanify/offboarding' },
  { title: 'Portal Karyawan', desc: 'Employee self-service — absensi, cuti, slip gaji, klaim.', href: '/employee' },
] as const;
