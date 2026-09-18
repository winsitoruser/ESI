import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import HumanifyMarketingShell from '@/components/humanify/HumanifyMarketingShell';
import HumanifySeoHead from '@/components/humanify/HumanifySeoHead';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import { getPublishedArticle, type PublicArticle } from '@/lib/saas/cms-articles';
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  truncateMeta,
} from '@/lib/humanify/seo';

export default function HumanifyBlogPost({ article }: { article: PublicArticle }) {
  const path = `/humanify/blog/${article.slug}`;
  const description = truncateMeta(article.excerpt || article.title, 160);

  return (
    <>
      <HumanifySeoHead
        title={`${article.title} — ${HUMANIFY_BRAND.name}`}
        description={description}
        path={path}
        type="article"
        publishedTime={article.publishedAt || undefined}
        keywords={['HRIS', 'Humanify', 'payroll', article.title]}
        jsonLd={[
          buildArticleJsonLd({
            title: article.title,
            description,
            path,
            publishedAt: article.publishedAt,
          }),
          buildBreadcrumbJsonLd([
            { name: 'Beranda', path: '/' },
            { name: 'Blog', path: '/humanify/blog' },
            { name: article.title, path },
          ]),
        ]}
      />
      <HumanifyMarketingShell
        links={[{ label: 'Blog', href: '/humanify/blog' }, { label: 'Beranda', href: HUMANIFY_BRAND.welcomePath }]}
        footerVariant="brand"
      >
        <article className="mx-auto max-w-3xl px-4 pb-16 pt-4" itemScope itemType="https://schema.org/Article">
          <Link
            href="/humanify/blog"
            className="mb-6 inline-flex min-h-11 items-center gap-1 text-sm text-[#656565] hover:text-[#592277]"
          >
            <ArrowLeft className="h-4 w-4" /> Semua artikel
          </Link>
          <h1 className="mb-4 text-3xl font-bold text-[#35393f]" itemProp="headline">
            {article.title}
          </h1>
          {article.publishedAt && (
            <time
              dateTime={article.publishedAt}
              itemProp="datePublished"
              className="mb-6 block text-sm text-[#656565]"
            >
              {new Date(article.publishedAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
          )}
          {article.excerpt && (
            <p className="mb-8 text-lg text-[#656565]" itemProp="description">
              {article.excerpt}
            </p>
          )}
          <div
            className="whitespace-pre-wrap text-sm leading-relaxed text-[#35393f]/90"
            itemProp="articleBody"
          >
            {article.body}
          </div>
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
