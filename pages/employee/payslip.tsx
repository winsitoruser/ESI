import Head from 'next/head';
import EmployeePortal from '@/components/employee/EmployeePortal';

/** ESS-S3-1 / Wave-57 — dedicated payslip route (real shell, shared portal). */
export default function EmployeePayslipRoute() {
  return (
    <>
      <Head><title>Slip Gaji — Humanify</title></Head>
      <EmployeePortal initialTab="payslip" />
    </>
  );
}
