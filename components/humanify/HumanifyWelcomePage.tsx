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

const ICONS = [Users, Clock, DollarSign, Target, GraduationCap, Smartphone];

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
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function CodeHero() {
  const lines = [
    { text: 'const workforce = await ', color: 'text-violet-300' },
    { text: 'humanify', color: 'text-fuchsia-400' },
    { text: '.manage();', color: 'text-violet-300' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="inline-flex flex-col items-start gap-1 px-5 py-3.5 rounded-2xl border border-white/[0.1] bg-[#050508]/55 backdrop-blur-md font-mono text-sm mb-8 shadow-lg shadow-violet-950/30"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 text-[10px] text-violet-400/50 uppercase tracking-wider">humanify.config</span>
      </div>
      <div>
        {lines.map((l, i) => (
          <span key={i} className={l.color}>{l.text}</span>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-violet-400/60 text-xs mt-1"
      >
        // People-First HR Platform
        <motion.span
          className="inline-block w-[7px] h-[14px] bg-violet-400 ml-0.5 align-middle"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </motion.div>
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
    <div className="min-h-screen bg-[#050508] text-white overflow-x-hidden">
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

      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 hf-grid-bg" />
        <motion.div
          className="absolute top-[-15%] left-[30%] w-[700px] h-[700px] bg-violet-600/15 rounded-full blur-[140px]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[120px]"
          animate={{ scale: [1.05, 1, 1.05], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.08),_transparent_60%)]" />
      </div>

      {/* Header */}
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
            size="md"
            variant="full"
            src={HUMANIFY_BRAND.welcomeLogoPath}
            aspect={HUMANIFY_BRAND.welcomeLogoAspect}
            priority
          />
          <nav className="flex items-center gap-2 sm:gap-5">
            <a
              href={NAINCODE.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline text-sm text-violet-300/60 hover:text-violet-200 transition"
            >
              {NAINCODE.name}
            </a>
            <Link
              href={HUMANIFY_BRAND.employeePortalPath}
              className="hidden sm:inline text-sm text-violet-200/80 hover:text-white transition"
            >
              Portal Karyawan
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
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
              style={{ backgroundImage: "url('/images/humanify-hero-bg.png')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#050508]/92 via-[#050508]/78 to-[#050508]" />
            <div className="absolute inset-0 bg-gradient-to-r from-violet-950/50 via-[#050508]/20 to-fuchsia-950/40" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 pt-32 sm:pt-40 pb-20 sm:pb-28">
          <div className="max-w-4xl mx-auto text-center">
            <CodeHero />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-violet-300/60 mb-4 tracking-wide"
            >
              {NAINCODE.legalName}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6"
            >
              HRIS yang
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-200">
                mengutamakan manusia
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-lg sm:text-xl text-violet-200/70 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              {HUMANIFY_BRAND.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="flex flex-col sm:flex-row gap-3 justify-center items-center"
            >
              <Link
                href={HUMANIFY_BRAND.loginPath}
                className="group inline-flex items-center justify-center gap-2 min-w-[240px] px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300"
              >
                Masuk ke Humanify
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href={HUMANIFY_BRAND.employeePortalPath}
                className="inline-flex items-center justify-center gap-2 min-w-[240px] px-8 py-3.5 rounded-xl border border-white/10 text-violet-100 font-medium hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300"
              >
                <Smartphone className="w-4 h-4" />
                Portal Karyawan
              </Link>
            </motion.div>
          </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-white/[0.06] bg-white/[0.02]">
          <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <FadeIn key={stat.label} delay={i * 0.1} className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                </p>
                <p className="text-sm text-violet-300/50 mt-2">{stat.label}</p>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Marquee */}
        <section className="py-10 overflow-hidden border-b border-white/[0.04]">
          <p className="text-center text-xs uppercase tracking-[0.25em] text-violet-400/40 mb-6">
            Modul terintegrasi dalam satu platform
          </p>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#050508] to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#050508] to-transparent z-10" />
            <div className="hf-marquee flex whitespace-nowrap">
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                <span
                  key={`${item}-${i}`}
                  className="inline-flex items-center mx-6 text-sm text-violet-300/40 font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-2 text-violet-500/40" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Modules */}
        <section className="max-w-7xl mx-auto px-6 py-24 sm:py-32">
          <FadeIn className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-violet-400/60 font-medium mb-3">Our Modules</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Solusi HRIS
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300"> End-to-End</span>
            </h2>
            <p className="text-violet-200/60 max-w-xl mx-auto">
              Dari konsep hingga operasional harian — modul lengkap untuk setiap tahap siklus hidup karyawan.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {HUMANIFY_FEATURES.map((f, i) => {
              const Icon = ICONS[i] || UserCheck;
              return (
                <FadeIn key={f.title} delay={i * 0.08}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="group h-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 hover:bg-white/[0.06] hover:border-violet-400/20 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-5 h-5 text-violet-200" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-violet-100 transition-colors">{f.title}</h3>
                    <p className="text-sm text-violet-200/60 leading-relaxed mb-4">{f.desc}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-violet-400/70 group-hover:text-violet-300 transition-colors">
                      Pelajari lebih lanjut
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </motion.div>
                </FadeIn>
              );
            })}
          </div>
        </section>

        {/* Why Humanify */}
        <section className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="max-w-7xl mx-auto px-6 py-24 sm:py-32">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <FadeIn>
                <p className="text-sm uppercase tracking-[0.2em] text-violet-400/60 font-medium mb-3">Why Humanify</p>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5 leading-tight">
                  Bukan sekadar software,
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300">
                    partner SDM Anda
                  </span>
                </h2>
                <p className="text-violet-200/60 leading-relaxed mb-8">
                  Kami tidak hanya membangun sistem HR — kami membangun fondasi untuk pertumbuhan tim Anda.
                  Setiap fitur dirancang dengan standar enterprise dan visi jangka panjang.
                </p>
                <Link
                  href={HUMANIFY_BRAND.loginPath}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-white transition group"
                >
                  Mulai sekarang
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </FadeIn>

              <div className="grid sm:grid-cols-2 gap-4">
                {WHY_ITEMS.map((item, i) => (
                  <FadeIn key={item.title} delay={i * 0.08}>
                    <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-400/15 transition-all duration-300 h-full">
                      <item.icon className="w-5 h-5 text-violet-400 mb-3" />
                      <h4 className="font-semibold text-sm mb-1.5">{item.title}</h4>
                      <p className="text-xs text-violet-300/50 leading-relaxed">{item.desc}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="max-w-7xl mx-auto px-6 py-24 sm:py-32">
          <FadeIn className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-violet-400/60 font-medium mb-3">Our Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Dari rekrutmen hingga
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300"> payroll</span>
            </h2>
            <p className="text-violet-200/60 max-w-lg mx-auto">
              Metodologi terstruktur yang memastikan setiap tahap SDM berjalan efisien dan terukur.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PROCESS_STEPS.map((step, i) => (
              <FadeIn key={step.step} delay={i * 0.12}>
                <div className="relative p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-violet-400/20 transition-all duration-300 h-full group">
                  <span className="text-5xl font-black text-white/[0.04] absolute top-4 right-5 group-hover:text-violet-500/10 transition-colors">
                    {step.step}
                  </span>
                  <p className="text-xs font-bold text-violet-400 mb-3 tracking-wider">{step.step}</p>
                  <h3 className="font-semibold text-base mb-2">{step.title}</h3>
                  <p className="text-sm text-violet-200/55 leading-relaxed mb-4">{step.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs text-violet-400/60 bg-violet-500/10 px-2.5 py-1 rounded-full">
                    <Clock className="w-3 h-3" />
                    {step.duration}
                  </span>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Trust badges */}
        <section className="border-y border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-6 py-14 grid sm:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: 'Enterprise-ready', desc: 'Multi-tenant, RBAC, audit trail' },
              { icon: Zap, title: 'Real-time Data', desc: 'Dashboard & laporan instan' },
              { icon: Building2, title: 'Ekosistem Naincode', desc: 'Produk teknologi terintegrasi' },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.1} className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold mb-1">{item.title}</p>
                  <p className="text-sm text-violet-300/50">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-6 py-24 sm:py-32">
          <FadeIn>
            <div className="relative rounded-3xl border border-white/[0.1] bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-violet-900/20 p-10 sm:p-16 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.15),_transparent_70%)]" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  Siap transformasi
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200">
                    manajemen SDM Anda?
                  </span>
                </h2>
                <p className="text-violet-200/60 max-w-lg mx-auto mb-8">
                  Mulai kelola karyawan, kehadiran, dan payroll dalam satu platform — didukung teknologi Naincode.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <Link
                    href={HUMANIFY_BRAND.loginPath}
                    className="group inline-flex items-center justify-center gap-2 min-w-[220px] px-8 py-3.5 rounded-xl bg-white text-violet-900 font-semibold hover:bg-violet-50 shadow-lg transition"
                  >
                    Masuk ke Humanify
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <a
                    href={NAINCODE.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 min-w-[220px] px-8 py-3.5 rounded-xl border border-white/15 text-violet-100 font-medium hover:bg-white/5 transition"
                  >
                    <HeadphonesIcon className="w-4 h-4" />
                    Kunjungi {NAINCODE.name}
                  </a>
                </div>
                <div className="flex flex-wrap justify-center gap-6 mt-8 text-xs text-violet-300/40">
                  {['Gratis untuk tim internal', 'Tanpa komitmen', 'Dukungan penuh'].map((t) => (
                    <span key={t} className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-500/50" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <HumanifyLogo
              href={HUMANIFY_BRAND.welcomePath}
              size="sm"
              variant="full"
              src={HUMANIFY_BRAND.welcomeLogoPath}
              aspect={HUMANIFY_BRAND.welcomeLogoAspect}
            />
            <p className="text-xs text-violet-400/40">Bagian dari {NAINCODE.legalName}</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-violet-400/50">
            <Link href={HUMANIFY_BRAND.employeePortalPath} className="hover:text-violet-300 transition">
              Portal Karyawan
            </Link>
            <Link href={HUMANIFY_BRAND.loginPath} className="hover:text-violet-300 transition">
              Masuk
            </Link>
            <a href={NAINCODE.website} target="_blank" rel="noopener noreferrer" className="hover:text-violet-300 transition">
              {NAINCODE.name}
            </a>
          </div>
          <p className="text-xs text-violet-400/30">© {new Date().getFullYear()} {NAINCODE.legalName}</p>
        </div>
      </footer>
    </div>
  );
}
