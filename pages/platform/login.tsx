import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { getCsrfToken } from 'next-auth/react';
import { authOptions } from '../api/auth/[...nextauth]';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import {
  getAdminHost,
  getOpsHost,
  isAdminHost,
  isOpsHost,
  isPlatformOperatorRole,
} from '@/lib/humanify/ops-host';
import OpsLoginForm from '@/components/humanify/OpsLoginForm';
import Head from 'next/head';
import { safeInternalPath } from '@/lib/security/safe-redirect';

type Props = { csrfToken: string; adminTotal: boolean };

/**
 * Platform operator login — ops.humanify.id/login and admin.humanify.id/login (Admin Total).
 * Session cookies are host-only, so apex humanify.id sessions do not grant access.
 */
export default function PlatformOpsLoginPage({ csrfToken, adminTotal }: Props) {
  return (
    <>
      <Head>
        <title>{`${adminTotal ? 'Admin Total' : 'Ops'} Login — ${HUMANIFY_BRAND.name}`}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content={adminTotal
            ? 'Humanify Admin Total — login superadmin platform'
            : 'Humanify Platform Control Plane — operator login'}
        />
      </Head>
      <OpsLoginForm csrfToken={csrfToken} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const host = String(ctx.req.headers['x-forwarded-host'] || ctx.req.headers.host || '')
    .split(',')[0]
    .trim();
  const proto = String(ctx.req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https'))
    .split(',')[0]
    .trim();
  const adminTotal = isAdminHost(host);
  const prevUrl = process.env.NEXTAUTH_URL;
  if (host) process.env.NEXTAUTH_URL = `${proto}://${host}`;

  try {
    if (!isOpsHost(host) && process.env.NODE_ENV === 'production') {
      return {
        redirect: {
          destination: `https://${adminTotal ? getAdminHost() : getOpsHost()}/login`,
          permanent: false,
        },
      };
    }

    const session = await getServerSession(ctx.req, ctx.res, authOptions);
    if (session?.user && isPlatformOperatorRole((session.user as any).role)) {
      const dest = safeInternalPath(ctx.query.callbackUrl as string, '/platform');
      return {
        redirect: {
          destination: dest,
          permanent: false,
        },
      };
    }

    const csrfToken = await getCsrfToken(ctx);
    return { props: { csrfToken: csrfToken || '', adminTotal } };
  } finally {
    if (prevUrl !== undefined) process.env.NEXTAUTH_URL = prevUrl;
  }
};
