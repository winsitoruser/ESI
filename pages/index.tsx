import type { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]';

/** ESI ERP — no public landing page; go straight to login or HQ home. */
export const getServerSideProps: GetServerSideProps = async (ctx) => {
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
