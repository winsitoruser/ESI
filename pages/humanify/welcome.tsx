import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import HumanifyWelcomePage from '@/components/humanify/HumanifyWelcomePage';
import { authOptions } from '../api/auth/[...nextauth]';
import { HUMANIFY_BRAND, NAINCODE } from '@/lib/humanify/branding';

export default function WelcomePage() {
  return (
    <>
      <Head>
        <title>{HUMANIFY_BRAND.name} — {HUMANIFY_BRAND.productType} | {NAINCODE.name}</title>
        <meta name="description" content={HUMANIFY_BRAND.description} />
        <link rel="icon" href={HUMANIFY_BRAND.logoPath} type="image/png" />
      </Head>
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
