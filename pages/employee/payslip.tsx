import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Loader2 } from 'lucide-react';

/** ESS-S3-1 — dedicated route → portal tab. */
export default function EmployeePayslipRoute() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/employee?tab=payslip');
  }, [router]);
  return (
    <>
      <Head><title>Slip Gaji — Humanify</title></Head>
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    </>
  );
}
