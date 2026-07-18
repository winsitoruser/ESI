import type { GetServerSideProps } from 'next';
import { HUMANIFY_PUBLIC_ROUTES, HUMANIFY_SITE_URL } from '@/lib/humanify/seo';

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Dynamic sitemap — Humanify public marketing pages */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: HUMANIFY_SITE_URL + '/', priority: '1.0', changefreq: 'weekly' },
    ...HUMANIFY_PUBLIC_ROUTES.map((r) => ({
      loc: HUMANIFY_SITE_URL + r.path,
      priority: String(r.priority),
      changefreq: r.changefreq,
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(body);
  res.end();

  return { props: {} };
};

export default function SitemapXml() {
  return null;
}
