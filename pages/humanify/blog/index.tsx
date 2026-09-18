import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import HumanifyMarketingShell from '@/components/humanify/HumanifyMarketingShell';
import HumanifySeoHead from '@/components/humanify/HumanifySeoHead';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import { listPublishedArticles, type PublicArticle } from '@/lib/saas/cms-articles';
import {
  buildBreadcrumbJsonLd,
  buildWebPageJsonLd,
} from '@/lib/humanify/seo';

export default function HumanifyBlogIndex({ articles }: { articles: PublicArticle[] }) {
  return (
    <>
      <HumanifySeoHead
        title={`Blog — ${HUMANIFY_BRAND.name}`}
        description="Artikel HRIS, payroll, absensi, dan operasional SDM dari Humanify untuk tim HR Indonesia."
        path="/humanify/blog"
        keywords={['blog HRIS', 'payroll Indonesia', 'tips HR', 'Humanify', 'absensi karyawan']}
        jsonLd={[
          buildWebPageJsonLd({
            name: `Blog ${HUMANIFY_BRAND.name}`,
            description: 'Artikel HRIS, payroll, dan operasional SDM dari Humanify.',
            path: '/humanify/blog',
            type: 'CollectionPage',
          }),
          buildBreadcrumbJsonLd([
            { name: 'Beranda', path: '/' },
            { name: 'Blog', path: '/humanify/blog' },
          ]),
        ]}
      />
      <HumanifyMarketingShell
        links={[
          { label: 'Beranda', href: HUMANIFY_BRAND.welcomePath },
          { label: 'Partner', href: HUMANIFY_BRAND.partnersPath },
        ]}
        footerVariant="brand"
      >
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-4">
          <Link
            href={HUMANIFY_BRAND.welcomePath}
            className="mb-6 inline-flex min-h-11 items-center gap-1 text-sm text-[#656565] hover:text-[#592277]"
          >
            <ArrowLeft className="h-4 w-4" /> Beranda
          </Link>
          <h1 className="mb-2 text-3xl font-bold text-[#35393f]">Blog Humanify</h1>
          <p className="mb-10 text-[#656565]">Panduan dan update produk untuk tim HR.</p>
          {articles.length === 0 ? (
            <p className="text-sm text-[#656565]">Belum ada artikel terbit.</p>
          ) : (
            <ul className="space-y-4">
              {articles.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/humanify/blog/${a.slug}`}
                    className="block rounded-2xl border border-[#eee9f1] bg-white p-5 transition hover:border-[#592277]/40"
                  >
                    <h2 className="text-lg font-semibold text-[#35393f]">{a.title}</h2>
                    {a.excerpt && <p className="mt-2 text-sm text-[#656565]">{a.excerpt}</p>}
                    {a.publishedAt && (
                      <time
                        dateTime={a.publishedAt}
                        className="mt-3 block text-xs text-[#656565]/80"
                      >
                        {new Date(a.publishedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </time>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </HumanifyMarketingShell>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  let articles: PublicArticle[] = [];
  try {
    articles = await listPublishedArticles(20);
  } catch { /* */ }
  return { props: { articles } };
};
