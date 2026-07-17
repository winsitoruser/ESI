import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import {
  UserCheck, Users, Clock, DollarSign, Target, GraduationCap, Smartphone,
  ArrowRight, Sparkles, BarChart3, Shield, Layers,
  Building2, Lock, Globe, CheckCircle2,
  PieChart, Activity, Brain, Bot, ScanLine, TrendingUp, MessageSquare, Zap, Cpu, Wand2,
} from 'lucide-react';
import { HUMANIFY_BRAND, HUMANIFY_FEATURES, NAINCODE } from '@/lib/humanify/branding';
import Image from 'next/image';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import { NaincodeFooter } from '@/components/humanify/NaincodeFooter';

const ICONS = [Users, Clock, DollarSign, Target, GraduationCap, Smartphone, PieChart, Activity];
const MODULE_ICON_BG = [
  'bg-violet-500/10 text-violet-400',
  'bg-white/[0.05] text-violet-200/80',
  'bg-emerald-500/10 text-emerald-400',
  'bg-indigo-500/10 text-indigo-400',
  'bg-cyan-500/10 text-cyan-400',
  'bg-fuchsia-500/10 text-fuchsia-400',
  'bg-amber-500/10 text-amber-400',
  'bg-rose-500/10 text-rose-400',
  'bg-orange-500/10 text-orange-400',
  'bg-sky-500/10 text-sky-400',
];

const STATS = [
  { value: 10000, suffix: '+', label: 'Karyawan Terkelola' },
  { value: 99.9, suffix: '%', label: 'Akurasi Kehadiran', decimals: 1 },
  { value: 50, suffix: '+', label: 'Fitur Terintegrasi' },
  { value: 24, suffix: '/7', label: 'Portal Karyawan' },
];

const MARQUEE_ITEMS = [
  'AIMAN AI Copilot', 'AI Screening Kandidat', 'Prediksi Cuti', 'OCR Reimbursement',
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

const AI_FEATURES = [
  {
    icon: Bot,
    title: 'AIMAN — AI Guide HR',
    desc: 'Copilot percakapan yang memahami data live Humanify: absensi, cuti, rekrutmen, KPI, dan payroll — jawaban kontekstual dalam bahasa Indonesia.',
    tag: 'Copilot',
    accent: 'from-violet-500 to-fuchsia-500',
  },
  {
    icon: Wand2,
    title: 'AI Screening Rekrutmen',
    desc: 'Skor kandidat otomatis, ranking pipeline 7-stage, dan rekomendasi tindak lanjut — kurangi time-to-hire tanpa kehilangan kualitas.',
    tag: 'Rekrutmen',
    accent: 'from-fuchsia-500 to-pink-500',
  },
  {
    icon: TrendingUp,
    title: 'Prediktif & Workforce Analytics',
    desc: 'Forecast permintaan cuti, deteksi pola kehadiran, dan insight turnover — keputusan SDM berbasis sinyal, bukan asumsi.',
    tag: 'Analytics',
    accent: 'from-cyan-500 to-violet-500',
  },
  {
    icon: ScanLine,
    title: 'OCR Klaim & Reimbursement',
    desc: 'Upload foto struk → auto-fill nominal, tanggal, kategori. Vision AI opsional untuk struk kompleks.',
    tag: 'OCR',
    accent: 'from-emerald-500 to-cyan-500',
  },
  {
    icon: Brain,
    title: 'Insight Multi-Modul',
    desc: 'Rekomendasi prioritas tinggi per modul HR — rekrutmen, absensi, kinerja, engagement — dengan confidence score & action items.',
    tag: 'Insights',
    accent: 'from-amber-500 to-orange-500',
  },
  {
    icon: Shield,
    title: 'Hybrid & Privacy-First',
    desc: 'Rule-based intelligence default; LLM hanya saat dikonfigurasi. Data tenant tetap ter-scope — bukan chatbot generik.',
    tag: 'Enterprise',
    accent: 'from-indigo-500 to-violet-500',
  },
];

const AI_PIPELINE = [
  { step: '01', label: 'Kumpulkan sinyal', desc: 'Data HR live dari modul terintegrasi — absensi, cuti, pipeline, KPI.' },
  { step: '02', label: 'Analisis cerdas', desc: 'Rule engine + LLM (opsional) menghasilkan insight & skor.' },
  { step: '03', label: 'Rekomendasi aksi', desc: 'AIMAN merangkum prioritas dan langkah operasional untuk tim SDM.' },
];

const AIMAN_DEMO_LINES = [
  { role: 'user' as const, text: 'Bagaimana kondisi absensi tim minggu ini?' },
  { role: 'ai' as const, text: 'Tingkat kehadiran 94,2%. 3 karyawan terlambat berulang di divisi Operasional — saya sarankan review shift & reminder manager.' },
  { role: 'user' as const, text: 'Prediksi kebutuhan cuti bulan depan?' },
  { role: 'ai' as const, text: 'Forecast +18% vs rata-rata — puncak di minggu 2–3. Pertimbangkan backup shift dan approval cuti lebih awal.' },
];

function AnimatedCounter({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
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

  return <span ref={ref}>{display}{suffix}</span>;
}

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
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
      className="mb-8 inline-flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 shadow-sm backdrop-blur-md"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
        <Building2 className="h-4 w-4 text-violet-400" />
      </div>
      <div className="text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-400">Enterprise HRIS</p>
        <p className="text-sm text-violet-200/60">People-first platform untuk institusi & korporasi</p>
      </div>
    </motion.div>
  );
}

function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
      className="relative mt-16 mx-auto w-full max-w-5xl rounded-t-2xl border-t border-x border-white/[0.1] bg-[#0a0812]/80 backdrop-blur-2xl shadow-[0_-20px_50px_rgba(139,92,246,0.15)] overflow-hidden"
    >

      {/* Mockup Content — render provided dashboard sample image for clarity */}
      <div className="flex h-[400px] sm:h-[500px] w-full items-center justify-center pt-10">
        <div className="relative w-full max-w-5xl">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <div className="ml-4 text-xs text-violet-200/40 font-mono flex-1 text-center pr-12">humanify.naincode.com</div>
          </div>
          <div className="relative">
            <Image
              src="/images/dashboard-sample.png"
              alt="Dashboard sample"
              width={1400}
              height={700}
              className="w-full h-[400px] sm:h-[500px] object-cover rounded-b-2xl border border-white/[0.05]"
              priority
            />
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0a0812] to-transparent" />
          </div>
        </div>
      </div>

      {/* Bottom fade out */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0a0812] to-transparent" />
    </motion.div>
  );
}

function SimpleParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    let particles: { x: number; y: number; r: number; dx: number; dy: number; alpha: number }[] = [];
    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const init = () => {
      width = canvas.width = parent.offsetWidth;
      height = canvas.height = parent.offsetHeight;
      particles = [];
      const count = Math.floor(width / 10); // More particles
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 2 + 0.8, // Slightly larger
          dx: (Math.random() - 0.5) * 0.8,
          dy: (Math.random() - 0.5) * 0.8,
          alpha: Math.random() * 0.5 + 0.3, // Higher opacity
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        // Bright violet/white color for better visibility
        ctx.fillStyle = `rgba(196, 181, 253, ${p.alpha})`;
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    init();
    draw();

    const observer = new ResizeObserver(() => {
      init();
    });
    observer.observe(parent);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
}

function AimanChatMockup() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    AIMAN_DEMO_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 800 + i * 1200));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative rounded-3xl border border-white/[0.1] bg-[#0a0812]/80 backdrop-blur-xl overflow-hidden shadow-[0_0_60px_rgba(139,92,246,0.2)]">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-fuchsia-600/10 pointer-events-none" />
      <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-4 bg-white/[0.02]">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/30">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">AIMAN</p>
          <p className="text-xs text-violet-300/70">AI Guide HR · Humanify Intelligence</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>
      <div className="p-5 space-y-3 min-h-[280px]">
        {AIMAN_DEMO_LINES.slice(0, visibleLines).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                line.role === 'user'
                  ? 'bg-violet-600/30 border border-violet-500/20 text-violet-100'
                  : 'bg-white/[0.05] border border-white/[0.08] text-violet-100/90'
              }`}
            >
              {line.text}
            </div>
          </motion.div>
        ))}
        {visibleLines < AIMAN_DEMO_LINES.length && visibleLines > 0 && (
          <div className="flex items-center gap-2 text-xs text-violet-300/50 pl-1">
            <Cpu className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '2s' }} />
            AIMAN menelusuri data Humanify...
          </div>
        )}
      </div>
    </div>
  );
}

export default function HumanifyWelcomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const marquee1 = MARQUEE_ITEMS.slice(0, Math.ceil(MARQUEE_ITEMS.length / 2));
  const marquee2 = MARQUEE_ITEMS.slice(Math.ceil(MARQUEE_ITEMS.length / 2));

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0812] text-white">


      {/* Header */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled
            ? 'border-b border-white/[0.08] bg-[#0a0812]/80 shadow-sm backdrop-blur-md'
            : 'bg-transparent'
          }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <HumanifyLogo
            href={HUMANIFY_BRAND.welcomePath}
            size="lg"
            variant="full"
            src={HUMANIFY_BRAND.welcomeLogoPath}
            aspect={HUMANIFY_BRAND.welcomeLogoAspect}
            priority
          />
          <nav className="flex items-center gap-2 sm:gap-5">
            <Link href={HUMANIFY_BRAND.roiCalculatorPath} className="hidden text-sm text-violet-200/60 transition hover:text-white md:inline">
              Kalkulator ROI
            </Link>
            <a href={NAINCODE.website} target="_blank" rel="noopener noreferrer" className="hidden text-sm text-violet-200/60 transition hover:text-white md:inline">
              {NAINCODE.name}
            </a>
            <Link href={HUMANIFY_BRAND.signupPath} className="hidden text-sm text-violet-200/80 transition hover:text-white sm:inline">
              Daftar
            </Link>
            <Link href={HUMANIFY_BRAND.employeeLoginPath} className="hidden text-sm text-violet-200/80 transition hover:text-white sm:inline">
              Portal Karyawan
            </Link>
            <Link href={HUMANIFY_BRAND.loginPath} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500">
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="relative pt-32 sm:pt-40 overflow-hidden border-b border-white/[0.08]">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.05]" style={{ backgroundImage: "url('/images/humanify-hero-bg.png')" }} />

            <SimpleParticles />

            {/* Dynamic Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_100%)]" />

            {/* Subtle glow blobs for hero */}
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[120px] mix-blend-screen" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[150px] mix-blend-screen" />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0812]/10 via-[#0a0812]/60 to-[#0a0812]" />

            {/* Floating Decorative Elements */}
            <motion.div animate={{ y: [0, -20, 0], opacity: [0.6, 1, 0.6] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[25%] right-[5%] lg:right-[15%] hidden lg:flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0a0812]/40 p-4 backdrop-blur-xl shadow-[0_0_30px_rgba(139,92,246,0.15)] z-20">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-violet-200/60 uppercase tracking-wider">Karyawan Aktif</p>
                <p className="text-lg font-bold text-white">10.000<span className="text-fuchsia-400">+</span></p>
              </div>
            </motion.div>

            <motion.div animate={{ y: [0, 20, 0], opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }} className="absolute bottom-[20%] left-[2%] lg:left-[10%] hidden lg:flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0a0812]/40 p-4 backdrop-blur-xl shadow-[0_0_30px_rgba(217,70,239,0.1)] z-20">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-violet-200/60 uppercase tracking-wider">Payroll Bulan Ini</p>
                <p className="text-lg font-bold text-white">Selesai 100%</p>
              </div>
            </motion.div>
          </div>

          <div className="relative mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-4xl text-center">
              <CorporateHeroBadge />

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-4 text-sm tracking-wide text-violet-200/60">
                {NAINCODE.legalName}
              </motion.p>

              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.25 }} className="mb-6 text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-white">
                HRIS yang
                <span className="mt-2 block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">mengutamakan manusia</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.45 }} className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-violet-200/80 sm:text-xl">
                {HUMANIFY_BRAND.description}
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.6 }} className="flex flex-col items-center justify-center gap-3 sm:flex-row relative z-30">
                <Link href={HUMANIFY_BRAND.signupPath} className="group inline-flex min-w-[240px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-violet-500/40 hover:-translate-y-0.5">
                  Mulai trial gratis
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link href={HUMANIFY_BRAND.loginPath} className="inline-flex min-w-[240px] items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md px-8 py-3.5 font-medium text-white transition hover:border-white/[0.15] hover:bg-white/[0.06]">
                  Masuk ke Humanify
                </Link>
              </motion.div>
            </div>
          </div>

          <DashboardMockup />
        </section>

        {/* Stats */}
        {/* <section className="border-b border-white/[0.08] bg-white/[0.02]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-14 lg:grid-cols-4">
            {STATS.map((stat, i) => (
              <FadeIn key={stat.label} delay={i * 0.08} className="text-center relative">
                <div className="absolute inset-0 bg-violet-500/5 blur-2xl rounded-full" />
                <p className="relative text-3xl font-bold text-white sm:text-4xl">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                </p>
                <p className="relative mt-2 text-sm font-medium uppercase tracking-widest text-violet-200/50">{stat.label}</p>
              </FadeIn>
            ))}
          </div>
        </section> */}

        {/* Marquee */}
        <section className="overflow-hidden border-b border-white/[0.08] bg-white/[0.01] py-16">
          <p className="mb-10 text-center text-xs font-semibold uppercase tracking-[0.25em] text-violet-200/40">
            Ekosistem fitur terlengkap dalam satu platform
          </p>
          <div className="relative marquee-container flex flex-col gap-4">
            {/* Left fades */}
            <div className="absolute bottom-0 left-0 top-0 z-10 w-32 bg-gradient-to-r from-[#0a0812] to-transparent pointer-events-none" />
            <div className="absolute bottom-0 right-0 top-0 z-10 w-32 bg-gradient-to-l from-[#0a0812] to-transparent pointer-events-none" />

            {/* Row 1 */}
            <div className="flex w-max animate-marquee-left whitespace-nowrap">
              {[...marquee1, ...marquee1, ...marquee1].map((item, i) => (
                <div key={`m1-${i}`} className="mx-3 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-2.5 backdrop-blur-sm transition-colors hover:bg-white/[0.08]">
                  <Sparkles className="h-4 w-4 text-fuchsia-400" />
                  <span className="text-sm font-medium text-violet-100/80">{item}</span>
                </div>
              ))}
            </div>

            {/* Row 2 */}
            <div className="flex w-max animate-marquee-right whitespace-nowrap">
              {[...marquee2, ...marquee2, ...marquee2].map((item, i) => (
                <div key={`m2-${i}`} className="mx-3 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-2.5 backdrop-blur-sm transition-colors hover:bg-white/[0.08]">
                  <CheckCircle2 className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-medium text-violet-100/80">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI — Fitur Unggulan */}
        <section className="relative overflow-hidden border-b border-white/[0.08]">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/15 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-fuchsia-600/10 rounded-full blur-[100px]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_40%,transparent_100%)]" />
          </div>

          <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
            <FadeIn className="mb-16 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200"
              >
                <Sparkles className="h-4 w-4 text-fuchsia-400" />
                Fitur Unggulan AI
                <Zap className="h-4 w-4 text-amber-400" />
              </motion.div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                SDM lebih cerdas dengan{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400">
                  AI
                </span>
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-violet-200/70">
                Humanify memadukan rule engine, vision AI, dan LLM — dari screening kandidat hingga prediksi cuti.
                Bukan gimmick: AI yang benar-benar membaca data HR tenant Anda.
              </p>
            </FadeIn>

            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-start mb-20">
              <FadeIn delay={0.1}>
                <AimanChatMockup />
              </FadeIn>
              <FadeIn delay={0.2} className="space-y-6">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20">
                      <MessageSquare className="h-6 w-6 text-violet-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Kenalan dengan AIMAN</h3>
                      <p className="text-sm leading-relaxed text-violet-200/70">
                        AIMAN (<em>Artificial Intelligence Management Advisor for HR</em>) adalah asisten percakapan resmi Humanify.
                        Tanya apa saja tentang workforce — AIMAN merangkum data live, memberi prioritas, dan menyarankan langkah operasional.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: '8+', label: 'Modul HR' },
                    { val: 'Hybrid', label: 'Rules + LLM' },
                    { val: 'ID', label: 'Bahasa Indonesia' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-white/[0.06] bg-[#110e1b]/60 px-4 py-3 text-center">
                      <p className="text-lg font-bold text-white">{s.val}</p>
                      <p className="text-[10px] uppercase tracking-wider text-violet-300/50 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Rekrutmen', 'Absensi', 'Cuti', 'KPI', 'Payroll', 'Engagement', 'Workforce'].map((m) => (
                    <span key={m} className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-violet-200/80">
                      <Brain className="h-3 w-3 text-fuchsia-400" />
                      {m}
                    </span>
                  ))}
                </div>
              </FadeIn>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-16">
              {AI_FEATURES.map((f, i) => (
                <FadeIn key={f.title} delay={i * 0.06}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#110e1b]/80 p-6 transition-all hover:border-violet-500/30"
                  >
                    <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${f.accent} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
                    <div className="relative">
                      <div className="mb-4 flex items-center justify-between">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} shadow-lg`}>
                          <f.icon className="h-5 w-5 text-white" />
                        </div>
                        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300/70">
                          {f.tag}
                        </span>
                      </div>
                      <h3 className="mb-2 text-lg font-bold text-white">{f.title}</h3>
                      <p className="text-sm leading-relaxed text-violet-200/60">{f.desc}</p>
                    </div>
                  </motion.div>
                </FadeIn>
              ))}
            </div>

            <FadeIn>
              <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#110e1b] to-[#0a0812] p-8 sm:p-12">
                <div className="mb-10 text-center">
                  <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">Penerapan AI</p>
                  <h3 className="text-2xl font-bold text-white sm:text-3xl">
                    Dari data mentah → insight → aksi
                  </h3>
                </div>
                <div className="grid gap-6 md:grid-cols-3 relative">
                  <div className="hidden md:block absolute top-1/2 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent -translate-y-1/2" />
                  {AI_PIPELINE.map((p, i) => (
                    <div key={p.step} className="relative text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10 text-xl font-black text-violet-300">
                        {p.step}
                      </div>
                      <h4 className="mb-2 font-bold text-white">{p.label}</h4>
                      <p className="text-sm text-violet-200/60 leading-relaxed max-w-xs mx-auto">{p.desc}</p>
                      {i < AI_PIPELINE.length - 1 && (
                        <ArrowRight className="hidden md:block absolute top-7 -right-3 h-5 w-5 text-violet-500/50" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href={HUMANIFY_BRAND.signupPath}
                    className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:shadow-violet-500/40"
                  >
                    Coba Humanify + AIMAN
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <p className="text-xs text-violet-300/50 text-center sm:text-left">
                    LLM opsional · Rule-based selalu aktif · Data tenant terisolasi
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Modules Bento Grid */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <FadeIn className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">Our Modules</p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Solusi HRIS <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">End-to-End</span>
            </h2>
            <p className="mx-auto max-w-xl text-violet-200/70 text-lg">
              Dari rekrutmen hingga operasional harian — fitur canggih yang dirancang untuk skala enterprise.
            </p>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 auto-rows-[240px]">
            {HUMANIFY_FEATURES.map((f, i) => {
              const Icon = ICONS[i] || UserCheck;
              const iconBg = MODULE_ICON_BG[i % MODULE_ICON_BG.length];

              // Bento box sizing logic
              let colSpan = 'col-span-1';
              let rowSpan = 'row-span-1';

              if (i === 0) { colSpan = 'md:col-span-2 xl:col-span-2'; rowSpan = 'md:row-span-2'; } // Large hero card
              else if (i === 3) { colSpan = 'md:col-span-2 xl:col-span-2'; } // Wide card

              return (
                <FadeIn key={f.title} delay={i * 0.05} className={`${colSpan} ${rowSpan}`}>
                  <motion.div
                    whileHover={{ scale: 0.98 }}
                    className="group relative h-full w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#110e1b] p-8 transition-all hover:border-violet-500/30 flex flex-col justify-between"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute -right-12 -top-12 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-colors" />

                    <div>
                      <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg} shadow-inner`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className={`font-bold text-white mb-3 ${i === 0 ? 'text-3xl' : 'text-xl'}`}>
                        {f.title}
                      </h3>
                      <p className={`text-violet-200/60 leading-relaxed ${i === 0 ? 'text-lg max-w-md' : 'text-sm'}`}>
                        {f.desc}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-violet-400 opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                      Pelajari modul <ArrowRight className="h-4 w-4" />
                    </div>
                  </motion.div>
                </FadeIn>
              );
            })}
          </div>
        </section>

        {/* Why Humanify */}
        <section className="border-y border-white/[0.08] bg-white/[0.01]">
          <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
            <div className="grid items-center gap-16 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <FadeIn>
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-400">Why Humanify</p>
                  <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
                    Bukan sekadar software,
                    <span className="mt-2 block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">partner SDM Anda</span>
                  </h2>
                  <p className="mb-8 text-lg leading-relaxed text-violet-200/70">
                    Kami tidak hanya membangun sistem HR — kami membangun fondasi untuk pertumbuhan tim Anda.
                    Setiap fitur dirancang dengan standar enterprise, keamanan tinggi, dan kemudahan penggunaan.
                  </p>
                  <Link href={HUMANIFY_BRAND.loginPath} className="group inline-flex items-center gap-2 text-sm font-bold text-white bg-white/5 border border-white/10 px-6 py-3 rounded-xl transition hover:bg-white/10">
                    Mulai sekarang
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </FadeIn>
              </div>

              <div className="lg:col-span-3 grid gap-4 sm:grid-cols-2">
                {WHY_ITEMS.map((item, i) => (
                  <FadeIn key={item.title} delay={i * 0.1}>
                    <div className="group h-full rounded-3xl border border-white/[0.06] bg-[#110e1b]/50 p-6 transition-all hover:border-fuchsia-500/30 hover:bg-[#110e1b]">
                      <div className="mb-4 inline-flex p-3 rounded-xl bg-white/5 group-hover:bg-fuchsia-500/10 transition-colors">
                        <item.icon className="h-6 w-6 text-violet-300 group-hover:text-fuchsia-400 transition-colors" />
                      </div>
                      <h4 className="mb-2 text-lg font-bold text-white">{item.title}</h4>
                      <p className="text-sm leading-relaxed text-violet-200/60">{item.desc}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32 relative">
          <FadeIn className="mb-20 text-center relative z-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">Workflow</p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Dari rekrutmen hingga <span className="text-fuchsia-400">payroll</span>
            </h2>
            <p className="mx-auto max-w-xl text-violet-200/70 text-lg">
              Siklus hidup karyawan yang mulus dalam satu alur yang terotomatisasi.
            </p>
          </FadeIn>

          <div className="relative">
            {/* Connecting Line background */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-violet-500/0 via-violet-500/50 to-fuchsia-500/0 -translate-y-1/2 z-0" />

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
              {PROCESS_STEPS.map((step, i) => (
                <FadeIn key={step.step} delay={i * 0.15}>
                  <div className="group relative h-full rounded-3xl border border-white/[0.08] bg-[#0a0812] p-8 shadow-xl transition-all hover:-translate-y-2 hover:border-violet-500/40 hover:shadow-violet-500/10">
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-fuchsia-500/20 transition-all" />
                    <span className="inline-block mb-4 text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-400 to-white/20">
                      {step.step}
                    </span>
                    <h3 className="mb-3 text-lg font-bold text-white leading-snug">{step.title}</h3>
                    <p className="mb-6 text-sm leading-relaxed text-violet-200/60">{step.desc}</p>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-violet-300">
                      <Clock className="h-3.5 w-3.5" />
                      {step.duration}
                    </span>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <FadeIn>
            <div className="relative overflow-hidden rounded-[2.5rem] border border-violet-500/20 bg-[#110e1b] p-10 text-center shadow-2xl sm:p-20">
              {/* Complex background for CTA */}
              <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay" />
              <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]" />
              <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-fuchsia-600/20 blur-[100px]" />

              <div className="relative z-10">
                <h2 className="mb-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                  Siap transformasi
                  <span className="mt-2 block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">manajemen SDM Anda?</span>
                </h2>
                <p className="mx-auto mb-10 max-w-xl text-lg text-violet-200/70">
                  Mulai kelola karyawan, kehadiran, dan payroll dalam satu platform modern — didukung teknologi Naincode.
                </p>
                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link href={HUMANIFY_BRAND.signupPath} className="group inline-flex min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-white text-[#0a0812] px-8 py-4 font-bold transition hover:bg-violet-50 hover:scale-105">
                    Daftar trial gratis
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link href={HUMANIFY_BRAND.loginPath} className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold text-white transition hover:bg-white/10">
                    Masuk ke aplikasi
                  </Link>
                </div>
                <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm font-medium text-violet-200/50">
                  {['Gratis untuk tim internal', 'Tanpa kartu kredit', 'Setup dalam 5 menit'].map((t) => (
                    <span key={t} className="inline-flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </section>
      </main>

      <NaincodeFooter variant="dark" />
    </div>
  );
}
