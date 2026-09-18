import Head from 'next/head';
import {
  absoluteUrl,
  defaultOgImage,
  normalizeKeywords,
  truncateMeta,
  type HumanifySeoProps,
} from '@/lib/humanify/seo';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import { toJsonLdScript } from '@/lib/security/sanitize-user-text';

/**
 * Shared SEO head for Humanify public & app pages.
 * Emits title, description, canonical, Open Graph, Twitter, and JSON-LD.
 */
export default function HumanifySeoHead({
  title,
  description,
  path,
  robots = 'index, follow',
  image,
  imageAlt,
  imageWidth = 1200,
  imageHeight = 630,
  type = 'website',
  keywords,
  jsonLd,
  publishedTime,
  modifiedTime,
}: HumanifySeoProps) {
  const url = absoluteUrl(path);
  const ogImage = image || defaultOgImage();
  const desc = truncateMeta(description, 160);
  const kw = normalizeKeywords(keywords);
  const fullTitle = title.includes(HUMANIFY_BRAND.name)
    ? title
    : `${title} | ${HUMANIFY_BRAND.name}`;
  const alt = imageAlt || `${HUMANIFY_BRAND.name} — ${HUMANIFY_BRAND.productType}`;

  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {kw ? <meta name="keywords" content={kw} /> : null}
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <link rel="canonical" href={url} />
      <link rel="icon" href={HUMANIFY_BRAND.marketingLogoPath} type="image/png" />
      <link rel="apple-touch-icon" href={HUMANIFY_BRAND.logoPath} />
      <link rel="alternate" hrefLang="id" href={url} />
      <link rel="alternate" hrefLang="x-default" href={url} />

      <meta property="og:site_name" content={HUMANIFY_BRAND.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:image:alt" content={alt} />
      <meta property="og:image:width" content={String(imageWidth)} />
      <meta property="og:image:height" content={String(imageHeight)} />
      <meta property="og:locale" content="id_ID" />
      <meta property="og:locale:alternate" content="en_US" />

      {type === 'article' && publishedTime ? (
        <meta property="article:published_time" content={publishedTime} />
      ) : null}
      {type === 'article' && (modifiedTime || publishedTime) ? (
        <meta property="article:modified_time" content={modifiedTime || publishedTime} />
      ) : null}
      {type === 'article' ? <meta property="article:author" content={HUMANIFY_BRAND.company} /> : null}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={alt} />

      <meta name="theme-color" content="#592277" />
      <meta name="msapplication-TileColor" content="#592277" />
      <meta name="author" content={HUMANIFY_BRAND.company} />
      <meta name="application-name" content={HUMANIFY_BRAND.name} />
      <meta name="format-detection" content="telephone=no" />

      {schemas.filter(Boolean).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: toJsonLdScript(schema) }}
        />
      ))}
    </Head>
  );
}
