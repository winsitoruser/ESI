import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import {
  UserCheck, Users, Clock, DollarSign, Target, GraduationCap, Smartphone,
  ArrowRight, Sparkles, BarChart3, Shield, Layers, ChevronRight,
  Building2, Zap, Lock, HeadphonesIcon, Globe, CheckCircle2,
} from 'lucide-react';
import { HUMANIFY_BRAND, HUMANIFY_FEATURES, NAINCODE } from '@/lib/humanify/branding';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import { NaincodeFooter } from '@/components/humanify/NaincodeFooter';

const ICONS = [Users, Clock, DollarSign, Target, GraduationCap, Smartphone];
const MODULE_ICON_BG = [
  'bg-blue-50 text-blue-600',
  'bg-slate-100 text-slate-600',
  'bg-emerald-50 text-emerald-600',
  'bg-indigo-50 text-indigo-600',
  'bg-cyan-50 text-cyan-600',
  'bg-violet-50 text-violet-600',
  'bg-amber-50 text-amber-600',
  'bg-rose-50 text-rose-600',
  'bg-orange-50 text-orange-600',
  'bg-sky-50 text-sky-600',
];

const STATS = [
  { value: 10000, suffix: '+', label: 'Karyawan Terkelola' },
  { value: 99.9, suffix: '%', label: 'Akurasi Kehadiran', decimals: 1 },
  { value: 50, suffix: '+', label: 'Fitur Terintegrasi' },
  { value: 24, suffix: '/7', label: 'Portal Karyawan' },
];

const MARQUEE_ITEMS = [
  'Hire-to-Retire', 'Dealls & LinkedIn', 'E-Sign Privy', 'OKR Cascading', 'Payroll Otomatis',
  'Rekrutmen AI Search', 'Onboarding & Asset', 'Offboarding & Exit', 'BPJS & THR', 'PPh 21',
  'Reimbursement', 'Bonus & Pinjaman', '360° Appraisal', 'Certificate Tracker', 'Geofence Absensi',
  'Workforce Analytics', 'Multi-approval Workflow', 'Portal Karyawan',
];

const WHY_ITEMS = [
  {
    icon: Layers,
    title: 'All-in-One HRIS',
    desc: 'Satu platform untuk seluruh siklus hidup karyawan — dari rekrutmen hingga offboarding.',
  },
  {
    icon: Shield,
    title: 'Compliance Indonesia',
    desc: 'BPJS, PPh 21, THR, dan regulasi ketenagakerjaan — sudah terintegrasi dari awal.',
  },
  {
    icon: BarChart3,
    title: 'Data-Driven HR',
    desc: 'Workforce analytics, dashboard real-time, dan laporan yang actionable.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-First ESS',
    desc: 'Portal karyawan responsif — absensi, cuti, dan slip gaji dari mana saja.',
  },
  {
    icon: Lock,
    title: 'Enterprise Security',
    desc: 'Multi-tenant, role-based access, audit trail, dan enkripsi data.',
  },
  {
    icon: Globe,
    title: 'Ekosistem Naincode',
    desc: 'Terintegrasi dengan portofolio produk teknologi Naincode untuk skala bisnis.',
  },
];

const PROCESS_STEPS = [
  {
    step: '01',
    title: 'Rekrutmen → E-Sign → Onboarding',
    desc: 'Dealls, LinkedIn, Indeed, Google Jobs, WhatsApp 1-click, Privy e-sign, checklist onboarding & asset issue.',
    duration: 'Minggu 1–2',
  },
  {
    step: '02',
    title: 'HR Ops & Kehadiran',
    desc: 'Absensi GPS, shift, cuti, lembur, reimbursement, bonus, kasbon, pinjaman — semua feed ke payroll.',
    duration: 'Harian',
  },
  {
    step: '03',
    title: 'OKR, KPI & Pengembangan',
    desc: 'Cascading OKR, penilaian 360°, training, certificate registry, workforce analytics.',
    duration: 'Per kuartal',
  },
  {
    step: '04',
    title: 'Payroll & Offboarding',
    desc: 'Gaji daily/weekly/monthly, PPh 21, BPJS report, exit interview, asset return, final settlement.',
    duration: 'Bulanan',
  },
];

function AnimatedCounter({
  value,
  suffix = '',
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: 2000, bounce: 0 });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (isInView) motionVal.set(value);
  }, [isInView, motionVal, value]);

  useEffect(() => {
    const unsub = spring.on('change', (v) => {
      setDisplay(decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString('id-ID'));
    });
    return unsub;
  }, [spring, decimals]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

function FadeIn({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function CorporateHeroBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="mb-8 inline-flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-5 py-3 shadow-sm"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
        <Building2 className="h-4 w-4 text-blue-600" />
      </div>
      <div className="text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Enterprise HRIS</p>
        <p className="text-sm text-slate-500">People-first platform untuk institusi & korporasi</p>
      </div>
    </motion.div>
  );
}

export default function HumanifyWelcomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-800">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .hf-marquee {
          animation: marquee 35s linear infinite;
        }
        .hf-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Soft ambient */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_#f8fafc_0%,_#ffffff_40%,_#f1f5f9_100%)]" />
        <div className="absolute top-0 right-0 h-[420px] w-[420px] rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[320px] w-[320px] rounded-full bg-slate-200/50 blur-3xl" />
      </div>

      {/* Header */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <HumanifyLogo
            href={HUMANIFY_BRAND.welcomePath}
            size="lg"
            variant="withText"
            priority
            textClassName="font-semibold text-slate-800 tracking-tight"
            subtitleClassName="text-xs text-slate-500 font-medium"
          />
          <nav className="flex items-center gap-2 sm:gap-5">
            <Link
              href={HUMANIFY_BRAND.roiCalculatorPath}
              className="hidden text-sm text-slate-500 transition hover:text-slate-800 md:inline"
            >
              Kalkulator ROI
            </Link>
            <a
              href={NAINCODE.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-sm text-slate-500 transition hover:text-slate-800 md:inline"
            >
              {NAINCODE.name}
            </a>
            <Link
              href={HUMANIFY_BRAND.employeeLoginPath}
              className="hidden text-sm text-slate-600 transition hover:text-slate-900 sm:inline"
            >
              Portal Karyawan
            </Link>
            <Link
              href={HUMANIFY_BRAND.loginPath}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-slate-200/80">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.07]"
              style={{ backgroundImage: "url('/images/humanify-hero-bg.png')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-slate-50/95 to-slate-50" />
          </div>

          <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-32 sm:pb-28 sm:pt-40">
            <div className="mx-auto max-w-4xl text-center">
              <CorporateHeroBadge />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-4 text-sm tracking-wide text-slate-500"
              >
                {NAINCODE.legalName}
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.25 }}
                className="mb-6 text-4xl font-semibold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
              >
                HRIS yang
                <span className="mt-2 block text-blue-700">mengutamakan manusia</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.45 }}
                className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl"
              >
                {HUMANIFY_BRAND.description}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.6 }}
                className="flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <Link
                  href={HUMANIFY_BRAND.loginPath}
                  className="group inline-flex min-w-[240px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Masuk ke Humanify
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href={HUMANIFY_BRAND.employeeLoginPath}
                  className="inline-flex min-w-[240px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-3.5 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Smartphone className="h-4 w-4" />
                  Portal Karyawan
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-14 lg:grid-cols-4">
            {STATS.map((stat, i) => (
              <FadeIn key={stat.label} delay={i * 0.08} className="text-center">
                <p className="text-3xl font-semibold text-blue-700 sm:text-4xl">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                </p>
                <p className="mt-2 text-sm text-slate-500">{stat.label}</p>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Marquee */}
        <section className="overflow-hidden border-b border-slate-200/80 bg-slate-100/60 py-10">
          <p className="mb-6 text-center text-xs uppercase tracking-[0.25em] text-slate-400">
            Modul terintegrasi dalam satu platform
          </p>
          <div className="relative">
            <div className="absolute bottom-0 left-0 top-0 z-10 w-24 bg-gradient-to-r from-slate-100 to-transparent" />
            <div className="absolute bottom-0 right-0 top-0 z-10 w-24 bg-gradient-to-l from-slate-100 to-transparent" />
            <div className="hf-marquee flex whitespace-nowrap">
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                <span
                  key={`${item}-${i}`}
                  className="mx-6 inline-flex items-center text-sm font-medium text-slate-500"
                >
                  <Sparkles className="mr-2 h-3.5 w-3.5 text-blue-400/70" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Modules */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <FadeIn className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Our Modules</p>
            <h2 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Solusi HRIS <span className="text-blue-700">End-to-End</span>
            </h2>
            <p className="mx-auto max-w-xl text-slate-600">
              Dari konsep hingga operasional harian — modul lengkap untuk setiap tahap siklus hidup karyawan.
            </p>
          </FadeIn>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {HUMANIFY_FEATURES.map((f, i) => {
              const Icon = ICONS[i] || UserCheck;
              const iconBg = MODULE_ICON_BG[i % MODULE_ICON_BG.length];
              return (
                <FadeIn key={f.title} delay={i * 0.06}>
                  <motion.div
                    whileHover={{ y: -3 }}
                    className="group h-full rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-800 transition-colors group-hover:text-blue-800">
                      {f.title}
                    </h3>
                    <p className="mb-4 text-sm leading-relaxed text-slate-500">{f.desc}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors group-hover:text-blue-700">
                      Pelajari lebih lanjut
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </motion.div>
                </FadeIn>
              );
            })}
          </div>
        </section>

        {/* Why Humanify */}
        <section className="border-y border-slate-200/80 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
            <div className="grid items-start gap-16 lg:grid-cols-2">
              <FadeIn>
                <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Why Humanify</p>
                <h2 className="mb-5 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                  Bukan sekadar software,
                  <span className="mt-1 block text-blue-700">partner SDM Anda</span>
                </h2>
                <p className="mb-8 leading-relaxed text-slate-600">
                  Kami tidak hanya membangun sistem HR — kami membangun fondasi untuk pertumbuhan tim Anda.
                  Setiap fitur dirancang dengan standar enterprise dan visi jangka panjang.
                </p>
                <Link
                  href={HUMANIFY_BRAND.loginPath}
                  className="group inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800"
                >
                  Mulai sekarang
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </FadeIn>

              <div className="grid gap-4 sm:grid-cols-2">
                {WHY_ITEMS.map((item, i) => (
                  <FadeIn key={item.title} delay={i * 0.06}>
                    <div className="h-full rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 transition hover:border-blue-200 hover:bg-white">
                      <item.icon className="mb-3 h-5 w-5 text-blue-600" />
                      <h4 className="mb-1.5 text-sm font-semibold text-slate-800">{item.title}</h4>
                      <p className="text-xs leading-relaxed text-slate-500">{item.desc}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <FadeIn className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Our Process</p>
            <h2 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Dari rekrutmen hingga <span className="text-blue-700">payroll</span>
            </h2>
            <p className="mx-auto max-w-lg text-slate-600">
              Metodologi terstruktur yang memastikan setiap tahap SDM berjalan efisien dan terukur.
            </p>
          </FadeIn>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map((step, i) => (
              <FadeIn key={step.step} delay={i * 0.1}>
                <div className="group relative h-full rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                  <span className="absolute right-5 top-4 text-5xl font-black text-slate-100 transition-colors group-hover:text-blue-50">
                    {step.step}
                  </span>
                  <p className="mb-3 text-xs font-bold tracking-wider text-blue-600">{step.step}</p>
                  <h3 className="mb-2 text-base font-semibold text-slate-800">{step.title}</h3>
                  <p className="mb-4 text-sm leading-relaxed text-slate-500">{step.desc}</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                    <Clock className="h-3 w-3" />
                    {step.duration}
                  </span>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Trust badges */}
        <section className="border-y border-slate-200/80 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 sm:grid-cols-3">
            {[
              { icon: Shield, title: 'Enterprise-ready', desc: 'Multi-tenant, RBAC, audit trail' },
              { icon: Zap, title: 'Real-time Data', desc: 'Dashboard & laporan instan' },
              { icon: Building2, title: 'Ekosistem Naincode', desc: 'Produk teknologi terintegrasi' },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.08} className="flex items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <item.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="mb-1 font-semibold text-slate-800">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-10 text-center shadow-sm sm:p-16">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-100/50" />
              <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-slate-100/80" />
              <div className="relative">
                <h2 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  Siap transformasi
                  <span className="mt-1 block text-blue-700">manajemen SDM Anda?</span>
                </h2>
                <p className="mx-auto mb-8 max-w-lg text-slate-600">
                  Mulai kelola karyawan, kehadiran, dan payroll dalam satu platform — didukung teknologi Naincode.
                </p>
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href={HUMANIFY_BRAND.loginPath}
                    className="group inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    Masuk ke Humanify
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <a
                    href={NAINCODE.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-3.5 font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <HeadphonesIcon className="h-4 w-4" />
                    Kunjungi {NAINCODE.name}
                  </a>
                </div>
                <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-slate-500">
                  {['Gratis untuk tim internal', 'Tanpa komitmen', 'Dukungan penuh'].map((t) => (
                    <span key={t} className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </section>
      </main>

      <NaincodeFooter variant="light" />
    </div>
  );
}
