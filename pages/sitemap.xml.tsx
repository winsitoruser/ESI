import type { GetServerSideProps } from 'next';
import { HUMANIFY_PUBLIC_ROUTES, HUMANIFY_SITE_URL } from '@/lib/humanify/seo';
import { listPublishedArticles } from '@/lib/saas/cms-articles';

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

type SitemapEntry = {
  loc: string;
  priority: string;
  changefreq: string;
  lastmod: string;
};

/** Dynamic sitemap — marketing pages + published blog articles */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set<string>();
  const urls: SitemapEntry[] = [];

  const push = (entry: SitemapEntry) => {
    if (seen.has(entry.loc)) return;
    seen.add(entry.loc);
    urls.push(entry);
  };

  for (const r of HUMANIFY_PUBLIC_ROUTES) {
    push({
      loc: HUMANIFY_SITE_URL + r.path,
      priority: String(r.priority),
      changefreq: r.changefreq,
      lastmod: today,
    });
  }

  try {
    const articles = await listPublishedArticles(100);
    for (const a of articles) {
      push({
        loc: `${HUMANIFY_SITE_URL}/humanify/blog/${a.slug}`,
        priority: '0.65',
        changefreq: 'monthly',
        lastmod: a.publishedAt ? a.publishedAt.slice(0, 10) : today,
      });
    }
  } catch {
    /* CMS unavailable — static routes only */
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
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
