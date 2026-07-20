import Head from 'next/head';
import EmployeePortal from '@/components/employee/EmployeePortal';

/** ESS-S3-1 / Wave-57 — dedicated leave route (real shell, shared portal). */
export default function EmployeeLeaveRoute() {
  return (
    <>
      <Head><title>Cuti — Humanify</title></Head>
      <EmployeePortal initialTab="leave" />
    </>
  );
}
