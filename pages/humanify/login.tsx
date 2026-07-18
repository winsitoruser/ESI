import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { getCsrfToken } from 'next-auth/react';
import HumanifyLoginForm from '@/components/humanify/HumanifyLoginForm';
import HumanifySeoHead from '@/components/humanify/HumanifySeoHead';
import { authOptions } from '../api/auth/[...nextauth]';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

type Props = { csrfToken: string };

export default function HumanifyLoginPage({ csrfToken }: Props) {
  return (
    <>
      <HumanifySeoHead
        title={`Masuk — ${HUMANIFY_BRAND.name} ${HUMANIFY_BRAND.productType}`}
        description={`Login ${HUMANIFY_BRAND.name} — ${HUMANIFY_BRAND.productType} oleh ${HUMANIFY_BRAND.company}`}
        path={HUMANIFY_BRAND.loginPath}
        robots="index, follow"
      />
      <HumanifyLoginForm csrfToken={csrfToken} defaultRedirect={HUMANIFY_BRAND.appPath} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (session?.user) {
    const dest = (ctx.query.callbackUrl as string) || HUMANIFY_BRAND.appPath;
    return {
      redirect: {
        destination: dest.startsWith('/humanify') ? dest : HUMANIFY_BRAND.appPath,
        permanent: false,
      },
    };
  }
  const csrfToken = await getCsrfToken(ctx);
  return { props: { csrfToken: csrfToken || '' } };
};
