/**
 * Humanify SEO helpers — site URL, public routes, JSON-LD builders.
 */

export const HUMANIFY_SITE_URL = (
  process.env.NEXT_PUBLIC_HUMANIFY_URL ||
  process.env.NEXTAUTH_URL ||
  'https://humanify.id'
).replace(/\/$/, '');

export const HUMANIFY_DEFAULT_KEYWORDS =
  'HRIS Indonesia, software HR, payroll Indonesia, absensi GPS, sistem kehadiran, slip gaji, PPh 21, BPJS, Humanify, Naincode';

export type HumanifySeoProps = {
  title: string;
  description: string;
  path: string;
  /** index,follow (default) or noindex for private/auth-thin pages */
  robots?: string;
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: 'website' | 'article' | 'product';
  keywords?: string | string[];
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** ISO date for article pages */
  publishedTime?: string;
  modifiedTime?: string;
};

/** Public marketing URLs included in sitemap (canonical paths). */
export const HUMANIFY_PUBLIC_ROUTES: {
  path: string;
  priority: number;
  changefreq: 'daily' | 'weekly' | 'monthly';
  title: string;
  description: string;
}[] = [
  {
    path: '/',
    priority: 1.0,
    changefreq: 'weekly',
    title: 'Humanify — HRIS System | Naincode',
    description:
      'Sistem HRIS lengkap untuk mengelola karyawan, kehadiran, payroll, rekrutmen, dan kinerja — bagian dari ekosistem produk Naincode.',
  },
  {
    path: '/humanify/welcome',
    priority: 0.3,
    changefreq: 'monthly',
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
    path: '/humanify/blog',
    priority: 0.75,
    changefreq: 'weekly',
    title: 'Blog Humanify — HRIS, payroll, dan operasional SDM',
    description: 'Artikel HRIS, payroll, dan operasional SDM dari Humanify.',
  },
  {
    path: '/employee/login',
    priority: 0.55,
    changefreq: 'monthly',
    title: 'Portal Karyawan — Humanify',
    description:
      'Login Portal Karyawan Humanify — absensi, cuti, slip gaji, dan klaim mandiri.',
  },
  {
    path: '/careers',
    priority: 0.5,
    changefreq: 'monthly',
    title: 'Karir — Humanify',
    description: 'Portal lowongan per perusahaan di ekosistem Humanify.',
  },
];

export function absoluteUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${HUMANIFY_SITE_URL}${p}`;
}

/** Prefer wide marketing visual for social cards (≈16:9 product shot). */
export function defaultOgImage(): string {
  return absoluteUrl('/images/landing/product-preview.png');
}

export function truncateMeta(text: string, max = 160): string {
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export function normalizeKeywords(keywords?: string | string[]): string | undefined {
  if (!keywords) return undefined;
  const list = Array.isArray(keywords) ? keywords : keywords.split(',');
  const cleaned = list.map((k) => k.trim()).filter(Boolean);
  if (!cleaned.length) return undefined;
  return cleaned.join(', ');
}

export function buildSoftwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Humanify',
    alternateName: 'Humanify HRIS',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'HRIS',
    operatingSystem: 'Web',
    url: absoluteUrl('/'),
    image: defaultOgImage(),
    description:
      'Sistem HRIS lengkap untuk mengelola karyawan, kehadiran, payroll, rekrutmen, dan kinerja.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'IDR',
      description: 'Trial 14 hari gratis',
      url: absoluteUrl('/humanify/signup'),
      availability: 'https://schema.org/InStock',
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
    inLanguage: ['id', 'en'],
  };
}

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Naincode Inti Teknologi',
    legalName: 'PT Naincode Inti Teknologi',
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
    brand: {
      '@type': 'Brand',
      name: 'Humanify',
      url: absoluteUrl('/'),
      logo: absoluteUrl('/images/landing/logo-wordmark.png'),
    },
  };
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Humanify',
    alternateName: 'Humanify HRIS',
    url: HUMANIFY_SITE_URL,
    description: 'HRIS Software for People & Growth by Naincode',
    inLanguage: ['id-ID', 'en-US'],
    publisher: {
      '@type': 'Organization',
      name: 'Naincode Inti Teknologi',
      logo: absoluteUrl('/images/naincode-logo.png'),
    },
  };
}

export function buildWebPageJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  type?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': opts.type || 'WebPage',
    name: opts.name,
    description: truncateMeta(opts.description, 300),
    url: absoluteUrl(opts.path),
    isPartOf: {
      '@type': 'WebSite',
      name: 'Humanify',
      url: HUMANIFY_SITE_URL,
    },
    inLanguage: 'id-ID',
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildFaqPageJsonLd(
  faqs: Array<{ question: string; answer: string }>,
) {
  const mainEntity = faqs
    .filter((f) => f.question?.trim() && f.answer?.trim())
    .slice(0, 20)
    .map((f) => ({
      '@type': 'Question',
      name: f.question.trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer.trim(),
      },
    }));

  if (!mainEntity.length) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
}

export function buildArticleJsonLd(opts: {
  title: string;
  description: string;
  path: string;
  publishedAt?: string | null;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: truncateMeta(opts.description, 300),
    url: absoluteUrl(opts.path),
    image: opts.image || defaultOgImage(),
    datePublished: opts.publishedAt || undefined,
    dateModified: opts.publishedAt || undefined,
    author: {
      '@type': 'Organization',
      name: 'Humanify',
      url: absoluteUrl('/'),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Naincode Inti Teknologi',
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/images/naincode-logo.png'),
      },
    },
    mainEntityOfPage: absoluteUrl(opts.path),
    inLanguage: 'id-ID',
  };
}

export function buildHowToRoiJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Hitung ROI HRIS dengan Humanify',
    description:
      'Masukkan data karyawan dan biaya HR untuk melihat estimasi penghematan menggunakan Humanify.',
    url: absoluteUrl('/humanify/pricing/roi-calculator'),
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Masukkan jumlah karyawan dan gaji',
        text: 'Sesuaikan slider jumlah karyawan, gaji rata-rata, dan staf HR.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Tinjau estimasi penghematan',
        text: 'Lihat penghematan biaya dan waktu per bulan serta proyeksi tahunan.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Mulai trial Humanify',
        text: 'Daftar trial 14 hari gratis tanpa kartu kredit.',
      },
    ],
  };
}
