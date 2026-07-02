import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// Redirect page for /finance/billing to /billing
export default function FinanceBillingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/billing');
  }, [router]);

  return (
    <>
      <Head>
        <title>Redirecting... | FARMAX</title>
        <meta name="description" content="Mengalihkan ke halaman billing dan subscription FARMAX" />
      </Head>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Mengalihkan ke halaman Billing...</p>
      </div>
    </>
  );
}
