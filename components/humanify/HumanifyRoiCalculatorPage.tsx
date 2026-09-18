import React from 'react';
import dynamic from 'next/dynamic';
import { Calculator, ShieldCheck, Timer, Users } from 'lucide-react';
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

const TRUST_POINTS = [
  {
    icon: Timer,
    title: 'Hemat waktu HR',
    desc: 'Payroll, absensi, dan cuti otomatis',
  },
  {
    icon: ShieldCheck,
    title: 'Payroll akurat',
    desc: 'BPJS, PPh 21, dan slip gaji terintegrasi',
  },
  {
    icon: Users,
    title: 'Self-service',
    desc: 'Portal karyawan mengurangi tiket admin',
  },
] as const;

export default function HumanifyRoiCalculatorPage() {
  return (
    <HumanifyMarketingShell footerVariant="brand">
      <div className="relative overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute left-[15%] top-[-12%] h-[520px] w-[520px] rounded-full bg-[#f6e6ff] blur-[110px]" />
          <div className="absolute bottom-[8%] right-[-8%] h-[380px] w-[380px] rounded-full bg-[#e6deeb]/90 blur-[100px]" />
        </div>

        <section className="relative px-4 pb-8 pt-14 sm:px-6 lg:px-8 lg:pt-16">
          <div className="mx-auto max-w-7xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#eee9f1] bg-[#f6e6ff] px-4 py-2 text-[#592277]">
              <Calculator className="h-4 w-4" />
              <span className="text-sm font-semibold">Kalkulator ROI</span>
            </div>

            <h1 className="mb-5 text-3xl font-bold tracking-tight text-[#35393f] md:text-4xl lg:text-5xl xl:text-6xl">
              Hitung Berapa Banyak
              <br />
              <span className="text-[#592277]">yang Bisa Anda Hemat</span>
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-lg text-[#656565]">
              Masukkan data perusahaan Anda dan lihat estimasi penghematan biaya serta waktu dengan
              menggunakan {HUMANIFY_BRAND.name} — HRIS untuk payroll, absensi, cuti, dan portal
              karyawan.
            </p>

            <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-3">
              {TRUST_POINTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-2xl border border-[#eee9f1] bg-white/80 px-4 py-3 text-left shadow-sm backdrop-blur-sm"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f6e6ff] text-[#592277]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#35393f]">{item.title}</p>
                      <p className="text-xs text-[#656565]">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative px-4 pb-24 sm:px-6 lg:px-8">
          <HumanifyRoiCalculator />
        </section>
      </div>
    </HumanifyMarketingShell>
  );
}
