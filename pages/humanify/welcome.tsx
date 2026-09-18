import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import HumanifyWelcomePage from '@/components/humanify/HumanifyWelcomePage';
import HumanifySeoHead from '@/components/humanify/HumanifySeoHead';
import { authOptions } from '../api/auth/[...nextauth]';
import { HUMANIFY_BRAND, NAINCODE } from '@/lib/humanify/branding';
import { listPublicBanners, type PublicBanner } from '@/lib/saas/landing-banners';
import { listPublishedFaqs, type PublicFaq } from '@/lib/saas/cms-content';
import {
  HUMANIFY_DEFAULT_KEYWORDS,
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebPageJsonLd,
  buildWebSiteJsonLd,
} from '@/lib/humanify/seo';

const PAGE_DESCRIPTION =
  'Humanify HRIS — kelola rekrutmen, absensi GPS, payroll PPh 21 & BPJS, cuti, OKR, dan portal karyawan dalam satu platform. Trial 14 hari gratis.';

export default function WelcomePage({ banners, faqs }: { banners: PublicBanner[]; faqs: PublicFaq[] }) {
  const faqLd = buildFaqPageJsonLd(faqs);

  return (
    <>
      <HumanifySeoHead
        title={`${HUMANIFY_BRAND.name} — ${HUMANIFY_BRAND.productType} | ${NAINCODE.name}`}
        description={PAGE_DESCRIPTION}
        path={HUMANIFY_BRAND.welcomePath}
        keywords={HUMANIFY_DEFAULT_KEYWORDS}
        imageAlt={`${HUMANIFY_BRAND.name} dashboard HRIS`}
        jsonLd={[
          buildWebSiteJsonLd(),
          buildOrganizationJsonLd(),
          buildSoftwareApplicationJsonLd(),
          buildWebPageJsonLd({
            name: `${HUMANIFY_BRAND.name} HRIS`,
            description: PAGE_DESCRIPTION,
            path: HUMANIFY_BRAND.welcomePath,
          }),
          buildBreadcrumbJsonLd([{ name: 'Beranda', path: '/' }]),
          ...(faqLd ? [faqLd] : []),
        ]}
      />
      <HumanifyWelcomePage banners={banners} faqs={faqs} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (session?.user) {
    return { redirect: { destination: HUMANIFY_BRAND.appPath, permanent: false } };
  }
  let banners: PublicBanner[] = [];
  let faqs: PublicFaq[] = [];
  try {
    banners = await listPublicBanners('landing');
  } catch { /* landing stays static if CMS unavailable */ }
  try {
    faqs = await listPublishedFaqs();
  } catch { /* */ }
  return { props: { banners, faqs } };
};
