import Head from 'next/head';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import { NaincodeFooter } from '@/components/humanify/NaincodeFooter';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

/**
 * Legacy /careers — SaaS multi-tenant requires per-company URL /c/{slug}/careers
 */
export default function CareersIndexRedirect() {
  return (
    <>
      <Head>
        <title>Portal Karir — {HUMANIFY_BRAND.name}</title>
        <meta
          name="description"
          content="Portal karir Humanify — setiap perusahaan memiliki URL karir sendiri di /c/{slug}/careers."
        />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://humanify.id/careers" />
        <link rel="icon" href={HUMANIFY_BRAND.welcomeLogoPath} type="image/png" />
      </Head>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="border-b bg-white">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <HumanifyLogo className="h-8 w-auto" />
            <Link href="/humanify/login" className="text-sm text-blue-600 hover:underline">Masuk HR</Link>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-16 flex-1">
          <div className="bg-white border rounded-xl p-8 text-center space-y-4">
            <Building2 className="w-12 h-12 text-indigo-500 mx-auto" />
            <h1 className="text-2xl font-bold text-slate-900">Portal karir per perusahaan</h1>
            <p className="text-slate-600 text-sm max-w-md mx-auto">
              Humanify adalah HRIS multi-tenant. Setiap perusahaan memiliki URL karir sendiri:
            </p>
            <code className="block text-sm bg-slate-100 rounded-lg px-4 py-3 text-slate-800">
              https://humanify.id/c/<span className="text-indigo-600">{'{slug-perusahaan}'}</span>/careers
            </code>
            <p className="text-xs text-slate-500">
              Tim HR: salin tautan dari modul Rekrutmen → Integrasi, atau dari Platform Admin.
            </p>
            <Link href="/humanify/welcome" className="inline-block text-sm text-blue-600 hover:underline">
              Pelajari Humanify →
            </Link>
          </div>
        </main>
        <NaincodeFooter />
      </div>
    </>
  );
}
