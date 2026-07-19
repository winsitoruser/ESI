/**
 * Humanify SEO helpers — site URL, public routes, JSON-LD builders.
 */

export const HUMANIFY_SITE_URL =
  (process.env.NEXT_PUBLIC_HUMANIFY_URL || process.env.NEXTAUTH_URL || 'https://humanify.id')
    .replace(/\/$/, '');

export type HumanifySeoProps = {
  title: string;
  description: string;
  path: string;
  /** index,follow (default) or noindex for private/auth-thin pages */
  robots?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  keywords?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

/** Public marketing URLs included in sitemap */
export const HUMANIFY_PUBLIC_ROUTES: {
  path: string;
  priority: number;
  changefreq: 'daily' | 'weekly' | 'monthly';
  title: string;
  description: string;
}[] = [
  {
    path: '/humanify/welcome',
    priority: 1.0,
    changefreq: 'weekly',
    title: 'Humanify — HRIS System | Naincode',
    description:
      'Sistem HRIS lengkap untuk mengelola karyawan, kehadiran, payroll, rekrutmen, dan kinerja — bagian dari ekosistem produk Naincode.',
  },
  {
    path: '/humanify/signup',
    priority: 0.9,
    changefreq: 'monthly',
    title: 'Daftar Trial Humanify HRIS — 14 Hari Gratis',
    description:
      'Daftar gratis Humanify — trial 14 hari HRIS untuk perusahaan Anda. Tanpa kartu kredit.',
  },
  {
    path: '/humanify/login',
    priority: 0.5,
    changefreq: 'monthly',
    title: 'Masuk — Humanify HRIS System',
    description: 'Login Humanify — HRIS System oleh Naincode Inti Teknologi.',
  },
  {
    path: '/humanify/pricing/roi-calculator',
    priority: 0.85,
    changefreq: 'monthly',
    title: 'Kalkulator ROI HRIS | Hitung Penghematan — Humanify',
    description:
      'Hitung estimasi penghematan biaya dan waktu dengan Humanify. Kalkulator ROI interaktif untuk perusahaan Anda.',
  },
  {
    path: '/humanify/partners',
    priority: 0.7,
    changefreq: 'monthly',
    title: 'Partner Channel — Humanify HRIS',
    description:
      'Daftar sebagai partner Humanify — konsultan payroll, BPJS, akuntan, dan vendor absensi.',
  },
  {
    path: '/employee/login',
    priority: 0.6,
    changefreq: 'monthly',
    title: 'Portal Karyawan — Humanify',
    description:
      'Login Portal Karyawan Humanify — absensi, cuti, slip gaji, dan klaim mandiri.',
  },
];

export function absoluteUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${HUMANIFY_SITE_URL}${p}`;
}

export function defaultOgImage(): string {
  return absoluteUrl('/images/humanify-logo.png');
}

export function buildSoftwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Humanify',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'HRIS',
    operatingSystem: 'Web',
    url: absoluteUrl('/humanify/welcome'),
    description:
      'Sistem HRIS lengkap untuk mengelola karyawan, kehadiran, payroll, rekrutmen, dan kinerja.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'IDR',
      description: 'Trial 14 hari gratis',
      url: absoluteUrl('/humanify/signup'),
    },
    provider: {
      '@type': 'Organization',
      name: 'Naincode Inti Teknologi',
      url: 'https://naincode.com',
      logo: absoluteUrl('/images/naincode-logo.png'),
    },
    featureList: [
      'Rekrutmen & Onboarding',
      'Absensi GPS & Geofence',
      'Payroll, PPh 21, BPJS, THR',
      'OKR / KPI & 360° Appraisal',
      'AIMAN AI Guide HR',
      'Portal Karyawan (ESS)',
    ],
  };
}

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Naincode Inti Teknologi',
    url: 'https://naincode.com',
    logo: absoluteUrl('/images/naincode-logo.png'),
    sameAs: [
      'https://linkedin.com/company/naincode',
      'https://instagram.com/naincode.com',
      'https://github.com/naincode',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+62-877-8814-1650',
      contactType: 'sales',
      areaServed: 'ID',
      availableLanguage: ['Indonesian', 'English'],
    },
  };
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Humanify',
    url: HUMANIFY_SITE_URL,
    description: 'HRIS Software for People & Growth by Naincode',
    publisher: {
      '@type': 'Organization',
      name: 'Naincode Inti Teknologi',
    },
  };
}
