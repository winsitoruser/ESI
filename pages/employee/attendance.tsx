import Head from 'next/head';
import EmployeePortal from '@/components/employee/EmployeePortal';

/** ESS-S3-1 / Wave-57 — dedicated attendance route (real shell, shared portal). */
export default function EmployeeAttendanceRoute() {
  return (
    <>
      <Head><title>Absensi — Humanify</title></Head>
      <EmployeePortal initialTab="attendance" />
    </>
  );
}
