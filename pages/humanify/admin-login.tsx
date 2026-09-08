import { GetServerSideProps } from 'next';
import { getAdminHost, isAdminHost } from '@/lib/humanify/ops-host';

/**
 * Legacy tenant-admin login path — Admin Total lives on admin.humanify.id/login
 * (rewrite to /platform/login), same control plane as ops.
 */
export default function HumanifyAdminLoginRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const host = String(ctx.req.headers['x-forwarded-host'] || ctx.req.headers.host || '');
  const dest = isAdminHost(host)
    ? '/login'
    : `https://${getAdminHost()}/login`;
  return { redirect: { destination: dest, permanent: false } };
};
