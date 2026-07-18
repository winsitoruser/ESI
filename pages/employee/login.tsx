import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { getCsrfToken } from 'next-auth/react';
import EmployeePortalLoginForm from '@/components/humanify/EmployeePortalLoginForm';
import HumanifySeoHead from '@/components/humanify/HumanifySeoHead';
import { authOptions } from '../api/auth/[...nextauth]';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

type Props = { csrfToken: string };

export default function EmployeeLoginPage({ csrfToken }: Props) {
  return (
    <>
      <HumanifySeoHead
        title={`Portal Karyawan — ${HUMANIFY_BRAND.name}`}
        description={`Login Portal Karyawan ${HUMANIFY_BRAND.name} — absensi, cuti, slip gaji, dan klaim mandiri.`}
        path={HUMANIFY_BRAND.employeeLoginPath}
      />
      <EmployeePortalLoginForm csrfToken={csrfToken} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (session?.user) {
    const dest = (ctx.query.callbackUrl as string) || HUMANIFY_BRAND.employeePortalPath;
    return {
      redirect: {
        destination: dest.startsWith('/employee') ? dest : HUMANIFY_BRAND.employeePortalPath,
        permanent: false,
      },
    };
  }
  const csrfToken = await getCsrfToken(ctx);
  return { props: { csrfToken: csrfToken || '' } };
};
