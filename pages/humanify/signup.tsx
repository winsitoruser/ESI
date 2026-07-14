import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import HumanifySignupForm from '@/components/humanify/HumanifySignupForm';
import { authOptions } from '../api/auth/[...nextauth]';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

export default function HumanifySignupPage() {
  return (
    <>
      <Head>
        <title>Daftar — {HUMANIFY_BRAND.name} {HUMANIFY_BRAND.productType}</title>
        <meta
          name="description"
          content={`Daftar gratis ${HUMANIFY_BRAND.name} — trial 14 hari HRIS untuk perusahaan Anda.`}
        />
        <link rel="icon" href={HUMANIFY_BRAND.welcomeLogoPath} type="image/png" />
      </Head>
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
