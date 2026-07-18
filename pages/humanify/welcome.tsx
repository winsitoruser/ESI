import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import HumanifyWelcomePage from '@/components/humanify/HumanifyWelcomePage';
import HumanifySeoHead from '@/components/humanify/HumanifySeoHead';
import { authOptions } from '../api/auth/[...nextauth]';
import { HUMANIFY_BRAND, NAINCODE } from '@/lib/humanify/branding';
import {
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
} from '@/lib/humanify/seo';

export default function WelcomePage() {
  return (
    <>
      <HumanifySeoHead
        title={`${HUMANIFY_BRAND.name} — ${HUMANIFY_BRAND.productType} | ${NAINCODE.name}`}
        description={HUMANIFY_BRAND.description}
        path={HUMANIFY_BRAND.welcomePath}
        keywords="HRIS Indonesia, software HR, payroll Indonesia, absensi GPS, sistem kehadiran, Humanify, Naincode"
        jsonLd={[
          buildWebSiteJsonLd(),
          buildOrganizationJsonLd(),
          buildSoftwareApplicationJsonLd(),
        ]}
      />
      <HumanifyWelcomePage />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (session?.user) {
    return { redirect: { destination: HUMANIFY_BRAND.appPath, permanent: false } };
  }
  return { props: {} };
};
