import React from 'react';
import dynamic from 'next/dynamic';
import { Calculator } from 'lucide-react';
import HumanifyMarketingShell from '@/components/humanify/HumanifyMarketingShell';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

const HumanifyRoiCalculator = dynamic(
  () => import('@/components/humanify/HumanifyRoiCalculator'),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto h-96 max-w-7xl animate-pulse rounded-2xl border border-[#eee9f1] bg-[#f6e6ff]/50" />
    ),
  },
);

export default function HumanifyRoiCalculatorPage() {
  return (
    <HumanifyMarketingShell footerVariant="brand">
      <div className="relative overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute left-[20%] top-[-10%] h-[480px] w-[480px] rounded-full bg-[#f6e6ff] blur-[100px]" />
          <div className="absolute bottom-[10%] right-[-5%] h-[360px] w-[360px] rounded-full bg-[#e6deeb]/80 blur-[90px]" />
        </div>

        <section className="relative px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-20">
          <div className="mx-auto max-w-7xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#eee9f1] bg-[#f6e6ff] px-4 py-2 text-[#592277]">
              <Calculator className="h-4 w-4" />
              <span className="text-sm font-semibold">Kalkulator ROI</span>
            </div>

            <h1 className="mb-6 text-3xl font-bold tracking-tight text-[#35393f] md:text-4xl lg:text-5xl xl:text-6xl">
              Hitung Berapa Banyak
              <br />
              <span className="text-[#592277]">yang Bisa Anda Hemat</span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg text-[#656565]">
              Masukkan data perusahaan Anda dan lihat estimasi penghematan biaya serta waktu dengan
              menggunakan {HUMANIFY_BRAND.name}
            </p>
          </div>
        </section>

        <section className="relative px-4 pb-24 sm:px-6 lg:px-8">
          <HumanifyRoiCalculator />
        </section>
      </div>
    </HumanifyMarketingShell>
  );
}
