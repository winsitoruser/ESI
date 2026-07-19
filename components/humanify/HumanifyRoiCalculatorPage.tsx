import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Calculator } from 'lucide-react';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import { NaincodeFooter } from '@/components/humanify/NaincodeFooter';
import { HUMANIFY_BRAND, NAINCODE } from '@/lib/humanify/branding';

const HumanifyRoiCalculator = dynamic(
  () => import('@/components/humanify/HumanifyRoiCalculator'),
  {
    ssr: false,
    loading: () => (
      <div className="max-w-7xl mx-auto animate-pulse h-96 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
    ),
  },
);

export default function HumanifyRoiCalculatorPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#050508] text-white overflow-x-hidden">
      <style>{`
        @keyframes grid-fade {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.06; }
        }
        .hf-grid-bg {
          background-image:
            linear-gradient(rgba(139,92,246,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.15) 1px, transparent 1px);
          background-size: 64px 64px;
          animation: grid-fade 8s ease-in-out infinite;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 hf-grid-bg" />
        <div className="absolute top-[-15%] left-[30%] w-[700px] h-[700px] bg-violet-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.08),_transparent_60%)]" />
      </div>

      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#050508]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <HumanifyLogo
            href={HUMANIFY_BRAND.welcomePath}
            size="lg"
            variant="full"
            src={HUMANIFY_BRAND.welcomeLogoPath}
            aspect={HUMANIFY_BRAND.welcomeLogoAspect}
            className="rounded-lg"
            priority
          />
          <nav className="flex items-center gap-2 sm:gap-5">
            <Link
              href={HUMANIFY_BRAND.welcomePath}
              className="hidden md:inline text-sm text-violet-300/60 hover:text-violet-200 transition"
            >
              Beranda
            </Link>
            <Link
              href={HUMANIFY_BRAND.partnersPath}
              className="hidden md:inline text-sm text-violet-300/60 hover:text-violet-200 transition"
            >
              Partner
            </Link>
            <a
              href={NAINCODE.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline text-sm text-violet-300/60 hover:text-violet-200 transition"
            >
              {NAINCODE.name}
            </a>
            <Link
              href={HUMANIFY_BRAND.employeeLoginPath}
              className="hidden sm:inline text-sm text-violet-200/80 hover:text-white transition"
            >
              Portal Karyawan
            </Link>
            <Link
              href={HUMANIFY_BRAND.signupPath}
              className="hidden sm:inline text-sm text-violet-200/80 hover:text-white transition"
            >
              Daftar
            </Link>
            <Link
              href={HUMANIFY_BRAND.loginPath}
              className="px-4 py-2 rounded-xl bg-white text-violet-900 text-sm font-semibold hover:bg-violet-50 shadow-md shadow-violet-500/10 transition"
            >
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-violet-500/10 text-violet-300 px-4 py-2 rounded-full mb-6 border border-violet-400/20">
              <Calculator className="w-4 h-4" />
              <span className="text-sm font-semibold">Kalkulator ROI</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-200">
                Hitung Berapa Banyak
              </span>
              <br />
              <span className="text-white">yang Bisa Anda Hemat</span>
            </h1>

            <p className="text-lg text-violet-200/60 max-w-2xl mx-auto mb-10">
              Masukkan data perusahaan Anda dan lihat estimasi penghematan biaya serta waktu dengan
              menggunakan {HUMANIFY_BRAND.name}
            </p>
          </div>
        </section>

        <section className="pb-24 px-4 sm:px-6 lg:px-8">
          <HumanifyRoiCalculator />
        </section>
      </main>

      <NaincodeFooter />
    </div>
  );
}
