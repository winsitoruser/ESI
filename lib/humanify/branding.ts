/** Humanify — HRIS product branding (Naincode) */

export const NAINCODE = {
  name: 'Naincode',
  legalName: 'Naincode Inti Teknologi',
  tagline: 'Inti teknologi untuk operasional bisnis',
  footerTagline:
    'Trusted technology partner to build scalable, secure digital solutions that have a real impact on your business growth.',
  website: 'https://naincode.com',
  logoPath: '/images/naincode-logo.png',
  logoTextPath: '/images/naincode-logo-text.png',
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
  welcomeLogoPath: '/images/humanify-logo-brand.png',
  welcomeLogoAspect: 1024 / 405,
  description:
    'Sistem HRIS lengkap untuk mengelola karyawan, kehadiran, payroll, rekrutmen, dan kinerja — bagian dari ekosistem produk Naincode.',
  company: NAINCODE.legalName,
  parent: NAINCODE.name,
  loginPath: '/humanify/login',
  welcomePath: '/humanify/welcome',
  roiCalculatorPath: '/humanify/pricing/roi-calculator',
  appPath: '/humanify',
  employeePortalPath: '/employee',
  employeeLoginPath: '/employee/login',
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
