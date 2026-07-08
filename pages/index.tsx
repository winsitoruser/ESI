import type { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]';
import { isHumanifyHost } from '@/lib/humanify/host';
import { HUMANIFY_WELCOME } from '@/lib/humanify/paths';

/** ESI ERP — no public landing; Humanify domain → welcome landing. */
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const host = ctx.req.headers.host;

  if (isHumanifyHost(host)) {
    return {
      redirect: {
        destination: HUMANIFY_WELCOME,
        permanent: false,
      },
    };
  }

  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  return {
    redirect: {
      destination: session?.user ? '/hq/home' : '/auth/login',
      permanent: false,
    },
  };
};

export default function RootRedirect() {
  return null;
}
