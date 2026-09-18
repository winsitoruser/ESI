import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import HumanifySignupForm from '@/components/humanify/HumanifySignupForm';
import HumanifySeoHead from '@/components/humanify/HumanifySeoHead';
import { authOptions } from '../api/auth/[...nextauth]';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import { buildBreadcrumbJsonLd, buildSoftwareApplicationJsonLd, buildWebPageJsonLd } from '@/lib/humanify/seo';

export default function HumanifySignupPage() {
  return (
    <>
      <HumanifySeoHead
        title={`Daftar Trial ${HUMANIFY_BRAND.name} HRIS — 14 Hari Gratis`}
        description={`Daftar gratis ${HUMANIFY_BRAND.name} — trial 14 hari HRIS untuk perusahaan Anda. Tanpa kartu kredit. Mulai kelola SDM hari ini.`}
        path={HUMANIFY_BRAND.signupPath}
        keywords={[
          'daftar HRIS',
          'trial HRIS gratis',
          'software HR Indonesia',
          'Humanify signup',
          'demo payroll',
        ]}
        jsonLd={[
          buildSoftwareApplicationJsonLd(),
          buildWebPageJsonLd({
            name: `Daftar ${HUMANIFY_BRAND.name}`,
            description: `Trial 14 hari gratis ${HUMANIFY_BRAND.name} HRIS.`,
            path: HUMANIFY_BRAND.signupPath,
          }),
          buildBreadcrumbJsonLd([
            { name: 'Beranda', path: '/' },
            { name: 'Daftar', path: HUMANIFY_BRAND.signupPath },
          ]),
        ]}
      />
      <HumanifySignupForm />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (session?.user) {
    const setupDone = (session.user as any).setupCompleted !== false;
    return {
      redirect: {
        destination: setupDone ? HUMANIFY_BRAND.appPath : HUMANIFY_BRAND.setupPath,
        permanent: false,
      },
    };
  }
  return { props: {} };
};
