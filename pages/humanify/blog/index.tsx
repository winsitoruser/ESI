import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import HumanifyMarketingShell from '@/components/humanify/HumanifyMarketingShell';
import HumanifySeoHead from '@/components/humanify/HumanifySeoHead';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import { listPublishedArticles, type PublicArticle } from '@/lib/saas/cms-articles';

export default function HumanifyBlogIndex({ articles }: { articles: PublicArticle[] }) {
  return (
    <>
      <HumanifySeoHead
        title={`Blog — ${HUMANIFY_BRAND.name}`}
        description="Artikel HRIS, payroll, dan operasional SDM dari Humanify."
        path="/humanify/blog"
        keywords={['blog HRIS', 'payroll Indonesia', 'Humanify']}
      />
      <HumanifyMarketingShell
        links={[
          { label: 'Beranda', href: HUMANIFY_BRAND.welcomePath },
          { label: 'Partner', href: HUMANIFY_BRAND.partnersPath },
        ]}
        footerVariant="dark"
      >
        <div className="mx-auto max-w-3xl px-4 pb-16">
          <Link href={HUMANIFY_BRAND.welcomePath} className="mb-6 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Beranda
          </Link>
          <h1 className="mb-2 text-3xl font-bold text-white">Blog Humanify</h1>
          <p className="mb-10 text-violet-200/70">Panduan dan update produk untuk tim HR.</p>
          {articles.length === 0 ? (
            <p className="text-sm text-violet-200/60">Belum ada artikel terbit.</p>
          ) : (
            <ul className="space-y-4">
              {articles.map((a) => (
                <li key={a.id}>
                  <Link href={`/humanify/blog/${a.slug}`} className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-violet-400/40">
                    <h2 className="text-lg font-semibold text-white">{a.title}</h2>
                    {a.excerpt && <p className="mt-2 text-sm text-violet-200/70">{a.excerpt}</p>}
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
