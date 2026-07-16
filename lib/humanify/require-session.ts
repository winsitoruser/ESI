import type { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

// 🚧 DEV BYPASS — set ke false untuk mengaktifkan kembali guard login
// NOTE: explicitly disable bypass so humanify pages require login
const DEV_BYPASS = false;

/** Redirect ke welcome jika belum login — dipakai halaman app Humanify (bukan /humanify root) */
export async function requireHumanifySession(ctx: GetServerSidePropsContext) {
  if (DEV_BYPASS) return { props: {} }; // ← bypass login saat development

  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session?.user) {
    const path = ctx.resolvedUrl || HUMANIFY_BRAND.appPath;
    const dest =
      path === '/humanify' || path === '/humanify/'
        ? HUMANIFY_BRAND.welcomePath
        : `${HUMANIFY_BRAND.loginPath}?callbackUrl=${encodeURIComponent(path)}`;
    return { redirect: { destination: dest, permanent: false } };
  }
  return { props: {} };
}

export const getServerSideProps: GetServerSideProps = requireHumanifySession;
