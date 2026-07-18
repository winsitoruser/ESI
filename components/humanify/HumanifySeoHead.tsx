import Head from 'next/head';
import {
  absoluteUrl,
  defaultOgImage,
  type HumanifySeoProps,
} from '@/lib/humanify/seo';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

/**
 * Shared SEO head for Humanify public & app pages.
 */
export default function HumanifySeoHead({
  title,
  description,
  path,
  robots = 'index, follow',
  image,
  type = 'website',
  keywords,
  jsonLd,
}: HumanifySeoProps) {
  const url = absoluteUrl(path);
  const ogImage = image || defaultOgImage();
  const fullTitle = title.includes(HUMANIFY_BRAND.name)
    ? title
    : `${title} | ${HUMANIFY_BRAND.name}`;

  const schemas = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <link rel="canonical" href={url} />
      <link rel="icon" href={HUMANIFY_BRAND.welcomeLogoPath} type="image/png" />
      <link rel="apple-touch-icon" href={HUMANIFY_BRAND.logoPath} />

      <meta property="og:site_name" content={HUMANIFY_BRAND.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="id_ID" />
      <meta property="og:locale:alternate" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      <meta name="theme-color" content="#5B21B6" />
      <meta name="author" content={HUMANIFY_BRAND.company} />

      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </Head>
  );
}
