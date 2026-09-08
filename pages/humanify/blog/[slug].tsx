import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import HumanifyMarketingShell from '@/components/humanify/HumanifyMarketingShell';
import HumanifySeoHead from '@/components/humanify/HumanifySeoHead';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import { getPublishedArticle, type PublicArticle } from '@/lib/saas/cms-articles';

export default function HumanifyBlogPost({ article }: { article: PublicArticle }) {
  return (
    <>
      <HumanifySeoHead
        title={`${article.title} — ${HUMANIFY_BRAND.name}`}
        description={article.excerpt || article.title}
        path={`/humanify/blog/${article.slug}`}
      />
      <HumanifyMarketingShell
        links={[{ label: 'Blog', href: '/humanify/blog' }, { label: 'Beranda', href: HUMANIFY_BRAND.welcomePath }]}
        footerVariant="dark"
      >
        <article className="mx-auto max-w-3xl px-4 pb-16">
          <Link href="/humanify/blog" className="mb-6 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Semua artikel
          </Link>
          <h1 className="mb-4 text-3xl font-bold text-white">{article.title}</h1>
          {article.excerpt && <p className="mb-8 text-lg text-violet-200/70">{article.excerpt}</p>}
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-violet-100/80">{article.body}</div>
        </article>
      </HumanifyMarketingShell>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const slug = String(ctx.params?.slug || '');
  let article: PublicArticle | null = null;
  try {
    article = await getPublishedArticle(slug);
  } catch { /* */ }
  if (!article) return { notFound: true };
  return { props: { article } };
};
