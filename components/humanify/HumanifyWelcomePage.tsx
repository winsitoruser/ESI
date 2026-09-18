/**
 * Humanify marketing landing — pixel-mapped from Figma
 * https://www.figma.com/design/fmA9xALNbVbH9OOrfbMleo/Humanify?node-id=658-384
 */
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  CheckCircle2,
  Plus,
  Minus,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Instagram,
  Github,
  Youtube,
  Menu,
  X,
} from 'lucide-react';
import { HUMANIFY_BRAND, NAINCODE } from '@/lib/humanify/branding';
import { DEFAULT_SEAT_PRICING } from '@/lib/saas/seat-pricing-core';
import AimanFloatingChat from '@/components/humanify/AimanFloatingChat';
import MarketingBannerCarousel from '@/components/humanify/MarketingBannerCarousel';
import type { PublicBanner } from '@/lib/saas/landing-banners';
import type { PublicFaq } from '@/lib/saas/cms-content';

const IMG = '/images/landing';
const priceLabel = `Rp${DEFAULT_SEAT_PRICING.pricePerUserIdr.toLocaleString('id-ID')}`;

const DEFAULT_FAQS: PublicFaq[] = [
  {
    id: 'faq-1',
    category: 'general',
    question: 'Apakah Humanify cocok untuk perusahaan kecil?',
    answer:
      'Cocok. Humanify dapat digunakan oleh perusahaan dengan berbagai skala. HR dapat memulai dari kebutuhan dasar seperti data karyawan, absensi, dan rekrutmen, lalu berkembang ke payroll, analytics, dan modul lainnya sesuai pertumbuhan perusahaan.',
  },
  {
    id: 'faq-2',
    category: 'payroll',
    question: 'Apakah payroll mendukung PPh 21 dan BPJS?',
    answer:
      'Ya. Modul payroll Humanify mendukung perhitungan PPh 21, BPJS, THR, reimbursement, bonus, kasbon, dan pinjaman yang terintegrasi dengan data kehadiran dan karyawan.',
  },
  {
    id: 'faq-3',
    category: 'general',
    question: 'Apakah Humanify mendukung multi-cabang?',
    answer:
      'Ya. Anda dapat mengelola beberapa lokasi/unit dalam satu tenant dengan isolasi data per organisasi dan kontrol akses berbasis peran.',
  },
  {
    id: 'faq-4',
    category: 'ess',
    question: 'Apakah karyawan memiliki portal sendiri?',
    answer:
      'Ya. Portal karyawan (ESS) memungkinkan absensi, cuti, slip gaji, klaim, dan layanan self-service lainnya dari perangkat mobile maupun desktop.',
  },
  {
    id: 'faq-5',
    category: 'ai',
    question: 'Apakah AIMAN wajib digunakan?',
    answer:
      'Tidak. AIMAN bersifat opsional sebagai AI copilot. Tim HR tetap dapat menjalankan seluruh proses tanpa mengaktifkan fitur AI.',
  },
];

/** Order matches Figma grid: Talent → Employee → Time → Payroll (row1), Performance → Documents → Services → Offboarding (row2) */
const MODULES = [
  {
    title: 'Talent Acquisition',
    desc: 'Kelola kandidat, proses rekrutmen, hingga onboarding karyawan baru.',
    icon: `${IMG}/icon-users.svg`,
    iconBg: 'bg-[rgba(89,34,119,0.12)]',
  },
  {
    title: 'Employee Management',
    desc: 'Kelola data dan administrasi karyawan melalui satu database terpusat.',
    icon: `${IMG}/icon-dollar.svg`,
    iconBg: 'bg-[rgba(16,185,129,0.12)]',
  },
  {
    title: 'Time Management',
    desc: 'Atur attendance, shift, cuti, lembur, dan aktivitas operasional lainnya.',
    icon: `${IMG}/icon-target.svg`,
    iconBg: 'bg-[rgba(59,130,246,0.12)]',
  },
  {
    title: 'Payroll & Benefits',
    desc: 'Kelola payroll, PPh 21, BPJS, THR, reimbursement, bonus, kasbon, dan pinjaman.',
    icon: `${IMG}/icon-calendar.svg`,
    iconBg: 'bg-[rgba(20,184,166,0.12)]',
  },
  {
    title: 'Performance & Growth',
    desc: 'Pantau OKR, KPI, performance review, training, dan pengembangan karyawan.',
    icon: `${IMG}/icon-receipt.svg`,
    iconBg: 'bg-[#d4f0fb]',
  },
  {
    title: 'Employee Documents',
    desc: 'Simpan dan kelola dokumen serta sertifikat karyawan secara terstruktur.',
    icon: `${IMG}/icon-star.svg`,
    iconBg: 'bg-[rgba(249,115,22,0.12)]',
  },
  {
    title: 'Employee Services',
    desc: 'Permudah berbagai kebutuhan dan pengajuan karyawan melalui satu platform.',
    icon: `${IMG}/icon-activity.svg`,
    iconBg: 'bg-[rgba(236,72,153,0.12)]',
  },
  {
    title: 'Offboarding',
    desc: 'Kelola proses keluar karyawan mulai dari exit interview hingga final settlement.',
    icon: `${IMG}/icon-logout.svg`,
    iconBg: 'bg-[rgba(180,83,9,0.12)]',
  },
];

const AI_CARDS = [
  {
    title: 'Ask',
    desc: 'Cari informasi terkait workforce dengan lebih cepat melalui data HR yang terintegrasi.',
    image: `${IMG}/ai-ask.png`,
    icon: `${IMG}/icon-robot.svg`,
    iconBox: 'bg-[#592277]',
  },
  {
    title: 'Understand',
    desc: 'Ubah data HR menjadi informasi yang lebih mudah dipahami dan digunakan.',
    image: `${IMG}/ai-understand.png`,
    icon: `${IMG}/icon-wand.svg`,
    iconBox: 'bg-[#e6deeb]',
  },
  {
    title: 'Act',
    desc: 'Gunakan insight yang tersedia untuk membantu menentukan tindakan berikutnya.',
    image: `${IMG}/ai-act.png`,
    icon: `${IMG}/icon-trend.svg`,
    iconBox: 'bg-[#592277]',
  },
];

const INSIGHT_STEPS = [
  {
    n: '01',
    title: 'Temukan yang Penting',
    desc: 'Identifikasi informasi dan perubahan yang perlu mendapatkan perhatian.',
  },
  {
    n: '02',
    title: 'Pahami Kondisinya',
    desc: 'Lihat pola dan konteks dari data workforce secara lebih jelas.',
  },
  {
    n: '03',
    title: 'Tentukan Langkah Berikutnya',
    desc: 'Gunakan insight sebagai pendukung dalam mengambil keputusan dan menjalankan tindakan operasional.',
  },
];

const JOURNEY = [
  {
    id: 'attract',
    label: 'Attract & Hire',
    desc: 'Kelola proses pencarian kandidat, seleksi, hingga karyawan resmi bergabung.',
    tab: 'bg-[#e6deeb] text-[#35393f]',
    border: 'border-[#e6deeb]',
    accent: '#e6deeb',
  },
  {
    id: 'join',
    label: 'Join & Operate',
    desc: 'Kelola onboarding, data karyawan, attendance, cuti, dan lembur dalam satu alur.',
    tab: 'bg-[#ccbad5] text-[#35393f]',
    border: 'border-[#ccbad5]',
    accent: '#ccbad5',
  },
  {
    id: 'pay',
    label: 'Pay & Manage',
    desc: 'Proses payroll, pajak, BPJS, dan benefit menggunakan data HR yang terintegrasi.',
    tab: 'bg-[#7e34a6] text-[#f8f8f9]',
    border: 'border-[#7e34a6]',
    accent: '#7e34a6',
  },
  {
    id: 'exit',
    label: 'Exit',
    desc: 'Kelola proses offboarding, pengembalian aset, hingga final settlement secara terstruktur.',
    tab: 'bg-[#592277] text-[#f8f8f9]',
    border: 'border-[#592277]',
    accent: '#592277',
  },
];

const MOBILE_LEFT = [
  {
    title: 'Clock In & Clock Out',
    desc: 'Karyawan dapat mencatat waktu masuk dan pulang langsung melalui aplikasi.',
    icon: `${IMG}/icon-clock.svg`,
  },
  {
    title: 'Monitoring Kehadiran',
    desc: 'Pantau status hadir, terlambat, izin, dan absen secara praktis.',
    icon: `${IMG}/icon-chart-bar.svg`,
  },
  {
    title: 'Pengajuan Cuti & Izin',
    desc: 'Karyawan dapat mengajukan cuti atau izin dan memantau proses persetujuannya.',
    icon: `${IMG}/icon-calendar-check.svg`,
  },
];

const MOBILE_RIGHT = [
  {
    title: 'Panel Manajer',
    desc: 'Manajer dapat melihat dan memproses pengajuan tim seperti cuti, klaim, dan lembur.',
    icon: `${IMG}/icon-user.svg`,
  },
  {
    title: 'Surat Peringatan (SP)',
    desc: 'Ajukan dan kelola surat peringatan anggota tim langsung melalui sistem.',
    icon: `${IMG}/icon-warning.svg`,
  },
  {
    title: 'Slip Gaji Digital',
    desc: 'Karyawan dapat melihat slip gaji berdasarkan periode setelah payroll selesai.',
    icon: `${IMG}/icon-receipt-sp.svg`,
  },
];

const NAV_LINKS = [
  { label: 'Kalkulator ROI', href: HUMANIFY_BRAND.roiCalculatorPath },
  { label: 'Blog', href: '/humanify/blog' },
  { label: 'Partner', href: HUMANIFY_BRAND.partnersPath },
  { label: 'Karir', href: '/careers' },
  { label: 'Naincode', href: NAINCODE.website, external: true as const },
  { label: 'Portal Karyawan', href: HUMANIFY_BRAND.employeeLoginPath },
];

/** Product screens for hero fan — matches Figma node 680:62 */
const HERO_SHOTS = [
  { src: `${IMG}/hero-shot-left.png`, alt: 'Humanify dashboard — absensi & KPI' },
  { src: `${IMG}/hero-shot-center.png`, alt: 'Humanify HRIS overview' },
  { src: `${IMG}/hero-shot-right.png`, alt: 'Humanify analytics & AIMAN' },
] as const;

/** Figma-aligned slots: left (−6.68°), center (front), right (+6.68°) */
const HERO_SLOTS = [
  {
    id: 'left',
    left: '2%',
    x: '0%',
    top: '14%',
    rotate: -6.68,
    scale: 0.88,
    zIndex: 1,
    opacity: 0.9,
  },
  {
    id: 'center',
    left: '50%',
    x: '-50%',
    top: '4%',
    rotate: 0,
    scale: 1,
    zIndex: 3,
    opacity: 1,
  },
  {
    id: 'right',
    left: '26%',
    x: '0%',
    top: '14%',
    rotate: 6.68,
    scale: 0.88,
    zIndex: 2,
    opacity: 0.9,
  },
] as const;

function HeroProductCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion) return undefined;
    const t = window.setInterval(() => {
      setActive((i) => (i + 1) % HERO_SHOTS.length);
    }, 3200);
    return () => window.clearInterval(t);
  }, [paused, reduceMotion]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl aspect-[4/3] min-h-[220px] sm:aspect-[1200/615] sm:min-h-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Image
        src={`${IMG}/hero-bg.png`}
        alt=""
        fill
        className="object-cover"
        priority
        sizes="1200px"
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20"
        aria-hidden
      />

      {/* Stage — cards lower on purple plane like Figma */}
      <div className="absolute inset-x-[2%] bottom-0 top-[18%] sm:inset-x-[4%] sm:top-[20%]">
        <div className="relative h-full w-full">
          {HERO_SHOTS.map((shot, i) => {
            const slotIndex = (i - active + HERO_SHOTS.length) % HERO_SHOTS.length;
            const slot = HERO_SLOTS[slotIndex];
            const isFront = slot.id === 'center';

            return (
              <motion.button
                key={shot.src}
                type="button"
                aria-label={`${shot.alt}${isFront ? ' (aktif)' : ''}`}
                onClick={() => setActive(i)}
                className="absolute w-[86%] max-w-[883px] origin-center cursor-pointer border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#cc7bf9] sm:w-[74%]"
                initial={false}
                animate={{
                  left: slot.left,
                  x: slot.x,
                  top: slot.top,
                  rotate: slot.rotate,
                  scale: slot.scale,
                  opacity: slot.opacity,
                  zIndex: slot.zIndex,
                }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 140, damping: 24, mass: 0.85 }
                }
              >
                <div
                  className={`relative aspect-[883/459] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.4)] ring-1 ring-white/10 ${
                    isFront ? 'rounded-t-2xl rounded-b-md' : 'rounded-2xl'
                  }`}
                >
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 90vw, 883px"
                    priority={i === 1}
                  />
                  {!isFront && <div className="absolute inset-0 bg-[#12081c]/20" aria-hidden />}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 sm:bottom-5 sm:gap-2">
        {HERO_SHOTS.map((shot, i) => (
          <button
            key={shot.src}
            type="button"
            aria-label={`Tampilkan mockup ${i + 1}`}
            aria-current={i === active}
            onClick={() => setActive(i)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center"
          >
            <span
              className={`block h-2 rounded-full transition-all ${
                i === active ? 'w-6 bg-white' : 'w-2 bg-white/45'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-[#f6e6ff] px-4 py-2 text-sm font-medium text-[#592277]">
      {children}
    </span>
  );
}

function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-r from-[#cc7bf9] to-[#551777] bg-clip-text text-transparent">
      {children}
    </span>
  );
}

function PrimaryBtn({
  href,
  children,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#592277] px-6 py-3.5 text-base font-semibold text-[#f8f8f9] shadow-[0_0_0_6px_rgba(161,103,197,0.4)] transition hover:bg-[#501f6b] sm:w-auto sm:py-4 sm:text-lg ${className}`}
    >
      {children}
    </Link>
  );
}

function SecondaryBtn({
  href,
  children,
  external,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  className?: string;
}) {
  const cls = `inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#592277] px-6 py-3.5 text-base font-semibold text-[#592277] transition hover:bg-[#f6e6ff] sm:w-auto sm:py-4 sm:text-lg ${className}`;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
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
  const inView = useInView(ref, { once: true, margin: '-70px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Figma insight steps — numbers clear of vertical connector line */
function InsightTimeline() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    const t = window.setInterval(() => {
      setActive((i) => (i + 1) % INSIGHT_STEPS.length);
    }, 2800);
    return () => window.clearInterval(t);
  }, [inView]);

  return (
    <div ref={ref} className="relative w-full max-w-[491px]">
      <div className="flex flex-col">
        {INSIGHT_STEPS.map((step, i) => {
          const isActive = active === i;
          const isLast = i === INSIGHT_STEPS.length - 1;
          const filled = i < active;
          const filling = i === active;

          return (
            <motion.button
              key={step.n}
              type="button"
              onClick={() => setActive(i)}
              className="relative grid w-full grid-cols-[40px_16px_1fr] gap-x-2 border-0 bg-transparent p-0 text-left"
              initial={{ opacity: 0, x: 16 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.15 + i * 0.12, duration: 0.45 }}
            >
              {/* Number — own column, never under the line */}
              <span
                className={`pt-0.5 text-xl font-light tabular-nums transition-colors ${
                  isActive ? 'text-[#592277]' : 'text-[#592277]/70'
                }`}
              >
                {step.n}
              </span>

              {/* Vertical rail between number & copy */}
              <div className="relative flex justify-center self-stretch">
                <motion.span
                  className="absolute top-1.5 z-10 w-[3px] rounded-full bg-[#592277]"
                  aria-hidden
                  animate={{
                    height: isActive ? 28 : 14,
                    opacity: isActive ? 1 : 0.4,
                  }}
                  transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                />
                {!isLast && (
                  <div className="absolute bottom-0 top-9 w-px overflow-hidden bg-[#eee9f1]" aria-hidden>
                    <motion.div
                      className="w-[3px] -translate-x-px rounded-full bg-[#592277]"
                      initial={{ height: '0%' }}
                      animate={
                        inView
                          ? { height: filled || filling ? '100%' : '0%' }
                          : { height: '0%' }
                      }
                      transition={{
                        duration: filling ? 0.65 : 0.35,
                        ease: [0.22, 1, 0.36, 1],
                        delay: filling ? 0.05 : 0,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className={isLast ? 'pb-0' : 'pb-8'}>
                <motion.div animate={{ opacity: isActive ? 1 : 0.7 }} transition={{ duration: 0.25 }}>
                  <h3 className="mb-1.5 text-xl font-semibold text-[#35393f]">{step.title}</h3>
                  <p className="text-lg leading-snug text-[#5b616b]">{step.desc}</p>
                </motion.div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/** Figma ONE CONNECTED JOURNEY — overlapping stage tabs + animated highlight */
function JourneySection({
  journeyIdx,
  setJourneyIdx,
}: {
  journeyIdx: number;
  setJourneyIdx: React.Dispatch<React.SetStateAction<number>>;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl">
      {/* Mobile: natural stack — image strip + content flow */}
      <div className="lg:hidden">
        <div className="relative h-48 min-h-[180px] w-full sm:h-56">
          <Image src={`${IMG}/journey.png`} alt="" fill className="object-cover object-center" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#12081c]/70 to-[#12081c]" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <Pill>ONE CONNECTED JOURNEY</Pill>
            <h2 className="mt-3 text-[28px] font-bold leading-tight text-[#f8f8f9] sm:text-[32px]">
              Satu Alur untuk{' '}
              <GradientText>Seluruh Perjalanan Karyawan</GradientText>
            </h2>
          </div>
        </div>
        <div className="space-y-5 bg-[#12081c] px-5 pb-6 pt-2 sm:px-6">
          <p className="text-base leading-relaxed text-[#f8f8f9]/90 sm:text-lg">
            Setiap proses HR saling terhubung, sehingga data karyawan dapat digunakan secara konsisten sejak rekrutmen hingga offboarding.
          </p>
          <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {JOURNEY.map((j, i) => {
              const active = i === journeyIdx;
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => setJourneyIdx(i)}
                  className={`snap-start inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold ${j.tab} ${
                    active ? 'ring-2 ring-white/60' : 'opacity-80'
                  }`}
                >
                  <span className="opacity-70">{i + 1}. </span>
                  {j.label}
                </button>
              );
            })}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className={`border-l-2 pl-3 text-sm leading-relaxed text-[#e9e9e9] sm:text-base ${JOURNEY[journeyIdx].border}`}>
              {JOURNEY[journeyIdx].desc}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop: Figma overlay composition */}
      <div className="relative hidden aspect-[1200/588] min-h-[520px] lg:block">
        <Image src={`${IMG}/journey.png`} alt="" fill className="object-cover" sizes="1200px" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#12081c]/80 via-[#12081c]/25 to-[#12081c]/92" />

        <div className="absolute inset-0 flex flex-col justify-between p-10 lg:p-[46px]">
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55 }}
          >
            <Pill>ONE CONNECTED JOURNEY</Pill>
            <h2 className="mt-4 text-[44px] font-bold leading-tight text-[#f8f8f9]">
              Satu Alur untuk
              <br />
              <GradientText>Seluruh Perjalanan Karyawan</GradientText>
            </h2>
            <p className="mt-4 max-w-xl text-[22px] text-[#f8f8f9]">
              Setiap proses HR saling terhubung, sehingga data karyawan dapat digunakan secara konsisten sejak rekrutmen hingga offboarding.
            </p>
          </motion.div>

          <div>
            <div className="relative mb-5 flex h-[70px]">
              {JOURNEY.map((j, i) => {
                const active = i === journeyIdx;
                return (
                  <motion.button
                    key={j.id}
                    type="button"
                    onClick={() => setJourneyIdx(i)}
                    className={`relative flex h-full flex-1 items-center px-5 text-left text-lg font-semibold ${j.tab} ${
                      i === 0 ? 'rounded-l-[18px]' : ''
                    } ${i === JOURNEY.length - 1 ? 'rounded-r-[18px]' : ''} ${
                      i > 0 ? '-ml-7' : ''
                    } rounded-[18px]`}
                    style={{ zIndex: active ? 20 : i + 1 }}
                    animate={{
                      scale: active ? 1.04 : 1,
                      y: active ? -2 : 0,
                      boxShadow: active
                        ? `0 0 0 2px rgba(255,255,255,0.55), 0 12px 28px ${j.accent}66`
                        : '0 0 0 0 rgba(0,0,0,0)',
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    whileHover={{ scale: active ? 1.04 : 1.02 }}
                  >
                    <span className="opacity-70">{i + 1}. </span>
                    {j.label}
                    {active && (
                      <motion.span
                        layoutId="journey-glow"
                        className="pointer-events-none absolute inset-0 rounded-[18px] ring-2 ring-white/50"
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              {JOURNEY.map((j, i) => {
                const active = i === journeyIdx;
                return (
                  <motion.div
                    key={j.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={
                      inView
                        ? {
                            opacity: active ? 1 : 0.55,
                            y: 0,
                            borderColor: j.accent,
                          }
                        : {}
                    }
                    transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                    className={`border-l-2 pl-3 text-base text-[#e9e9e9] ${j.border}`}
                  >
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={`${j.id}-${active}`}
                        initial={{ opacity: 0.6 }}
                        animate={{ opacity: 1 }}
                        className={active ? 'font-medium' : ''}
                      >
                        {j.desc}
                      </motion.p>
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionShell({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-[1200px] px-5 sm:px-6 ${className}`}>
      {children}
    </section>
  );
}

export default function HumanifyWelcomePage({
  banners = [],
  faqs = [],
}: {
  banners?: PublicBanner[];
  faqs?: PublicFaq[];
}) {
  const [journeyIdx, setJourneyIdx] = useState(2);
  const [openFaq, setOpenFaq] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const faqItems = faqs.length > 0 ? faqs : DEFAULT_FAQS;
  const demoHref = 'https://naincode.com/konsultasi';
  const demoVideoSrc = '/videos/humanify-demo.mp4';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setJourneyIdx((i) => (i + 1) % JOURNEY.length);
    }, 5000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    const play = () => {
      void v.play().catch(() => {});
    };
    play();
    v.addEventListener('loadeddata', play);
    return () => v.removeEventListener('loadeddata', play);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-[#35393f] antialiased">
      {/* ── Header (Figma 658:1078) ── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all ${
          scrolled
            ? 'border-b border-[#eee9f1] bg-white/95 shadow-[0_4px_10px_rgba(0,0,0,0.06)] backdrop-blur-md'
            : 'bg-white'
        }`}
      >
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] sm:h-16 sm:px-6 lg:h-[85px] lg:px-12">
          <Link href={HUMANIFY_BRAND.welcomePath} className="relative h-8 w-28 shrink-0 sm:h-10 sm:w-36 lg:h-[53px] lg:w-[144px]">
            <Image src={`${IMG}/logo-wordmark.png`} alt={HUMANIFY_BRAND.name} fill className="object-contain object-left" priority />
          </Link>

          <nav className="hidden items-center gap-[26px] xl:flex">
            {NAV_LINKS.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-base text-[#35393f] transition hover:text-[#592277]"
                >
                  {item.label}
                </a>
              ) : (
                <Link key={item.label} href={item.href} className="inline-flex min-h-11 items-center text-base text-[#35393f] transition hover:text-[#592277]">
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            <Link
              href={HUMANIFY_BRAND.loginPath}
              className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-[#592277] px-4 text-base font-medium text-[#592277] transition hover:bg-[#f6e6ff]"
            >
              Masuk
            </Link>
            <Link
              href={HUMANIFY_BRAND.signupPath}
              className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#592277] px-4 text-base font-medium text-[#fdfdfd] transition hover:bg-[#501f6b]"
            >
              Daftar
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#592277] xl:hidden"
            aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-[#eee9f1] bg-white px-4 py-4 sm:px-6 xl:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((item) =>
                item.external ? (
                  <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-[#35393f]">
                    {item.label}
                  </a>
                ) : (
                  <Link key={item.label} href={item.href} className="inline-flex min-h-11 items-center text-[#35393f]" onClick={() => setMobileOpen(false)}>
                    {item.label}
                  </Link>
                ),
              )}
              <div className="mt-3 flex gap-3">
                <Link href={HUMANIFY_BRAND.loginPath} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] border border-[#592277] text-sm font-medium text-[#592277]">
                  Masuk
                </Link>
                <Link href={HUMANIFY_BRAND.signupPath} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] bg-[#592277] text-sm font-medium text-white">
                  Daftar
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex flex-col items-center gap-12 pt-24 pb-0 sm:gap-16 sm:pt-28 lg:gap-[70px] lg:pt-[152px]">
        {/* ── Hero ── */}
        <SectionShell className="flex flex-col items-center gap-[38px]">
          <FadeIn className="flex w-full flex-col items-center gap-3 text-center">
            <Pill>SMARTER HR STARTS HERE</Pill>
            <h1 className="text-[32px] font-bold leading-tight sm:text-[40px] lg:text-[44px]">
              Satu Platform untuk Cara Kerja HR
              <br />
              yang <GradientText>Lebih Baik</GradientText>
            </h1>
            <p className="max-w-[900px] text-lg text-[#656565] sm:text-[22px]">
              Kelola seluruh perjalanan karyawan mulai dari rekrutmen, kehadiran, payroll, hingga performance dalam satu sistem yang saling terhubung.
            </p>
          </FadeIn>

          <FadeIn delay={0.1} className="flex w-full max-w-md flex-col items-center gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-6">
            <PrimaryBtn href={HUMANIFY_BRAND.signupPath}>Coba Humanify Gratis</PrimaryBtn>
            <SecondaryBtn href="#features">Jelajahi Platform</SecondaryBtn>
          </FadeIn>

          {banners.length > 0 && (
            <div className="w-full">
              <MarketingBannerCarousel banners={banners} variant="landing" />
            </div>
          )}
        </SectionShell>

        {/* ── Hero product mockup (Figma 680:62) + carousel ── */}
        <SectionShell className="w-full">
          <FadeIn>
            <HeroProductCarousel />
          </FadeIn>
        </SectionShell>

        {/* ── AI for workforce ── */}
        <SectionShell>
          <FadeIn className="mx-auto mb-10 flex max-w-[900px] flex-col items-center gap-4 text-center">
            <Pill>AI FOR YOUR WORKFORCE</Pill>
            <h2 className="text-[32px] font-bold sm:text-[44px]">
              Bukan Sekadar Data. Saatnya HR Punya <GradientText>Jawaban.</GradientText>
            </h2>
            <p className="text-lg text-[#656565] sm:text-[22px]">
              Humanify menghubungkan data HR dengan AIMAN untuk membantu tim menemukan informasi penting, memahami kondisi workforce, dan menentukan langkah berikutnya dengan lebih cepat.
            </p>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-3">
            {AI_CARDS.map((card, i) => (
              <FadeIn key={card.title} delay={i * 0.08}>
                <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#eee9f1] bg-white">
                  <div className="relative aspect-[1536/1024] w-full">
                    <Image src={card.image} alt="" fill className="object-cover" sizes="400px" />
                  </div>
                  <div className="relative flex flex-1 flex-col gap-[7px] px-6 pb-6 pt-10">
                    <div className={`absolute -top-6 left-6 flex h-12 w-12 items-center justify-center rounded-lg p-3 ${card.iconBox}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={card.icon} alt="" width={24} height={24} className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-semibold text-[#35393f]">{card.title}</h3>
                    <p className="text-sm leading-normal text-[#5b616b]">{card.desc}</p>
                  </div>
                </article>
              </FadeIn>
            ))}
          </div>
        </SectionShell>

        {/* ── Lihat Humanify Beraksi ── */}
        <SectionShell>
          <FadeIn className="mb-8 max-w-[900px]">
            <h2 className="mb-4 text-[28px] font-bold sm:text-[30px]">Lihat Humanify Beraksi</h2>
            <p className="text-lg text-[#656565] sm:text-[22px]">
              Saksikan bagaimana Humanify membantu tim HR mengelola data, menemukan insight, dan menjalankan proses kerja dalam satu platform.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="relative overflow-hidden rounded-[6px] border border-black/20 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
              <div className="relative aspect-[1898/948] bg-[#1a1a1a]">
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  src={demoVideoSrc}
                  poster={`${IMG}/product-preview.png`}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  aria-label="Demo produk Humanify"
                />
              </div>
            </div>
          </FadeIn>
        </SectionShell>

        {/* ── Insights ── */}
        <SectionShell className="flex flex-col items-center gap-[38px]">
          <FadeIn className="flex w-full flex-col items-center gap-4 text-center">
            <Pill>FROM DATA TO DECISION</Pill>
            <h2 className="text-[32px] font-bold sm:text-[44px]">
              Ubah Data HR Menjadi Insight
              <br />
              yang <GradientText>Lebih Bermakna</GradientText>
            </h2>
            <p className="max-w-[900px] text-lg text-[#656565] sm:text-[22px]">
              Data yang tersimpan di Humanify membantu tim HR memahami kondisi organisasi dan menemukan informasi yang membutuhkan perhatian.
            </p>
          </FadeIn>

          <div className="grid w-full items-start gap-8 lg:grid-cols-[623fr_491fr] lg:gap-8">
            <FadeIn className="relative overflow-hidden rounded-2xl">
              <div className="relative aspect-[623/394]">
                <Image src={`${IMG}/insight-bg.png`} alt="" fill className="object-cover" sizes="623px" />
              </div>
              <div className="absolute left-[8%] right-[-5%] top-[15%] bottom-[5%] overflow-hidden rounded-lg shadow-xl sm:left-[13%]">
                <Image src={`${IMG}/insight-ui.png`} alt="Insight dashboard" fill className="object-cover object-left-top" sizes="600px" />
              </div>
            </FadeIn>

            <FadeIn delay={0.1} className="flex justify-start lg:justify-end">
              <InsightTimeline />
            </FadeIn>
          </div>
        </SectionShell>

        {/* ── Features ── */}
        <SectionShell id="features" className="scroll-mt-28">
          <FadeIn className="mb-10 flex flex-col items-center gap-4 text-center">
            <Pill>EVERYTHING HR NEEDS</Pill>
            <h2 className="text-[32px] font-bold sm:text-[44px]">
              Semua Kebutuhan HR <GradientText>dalam Satu Sistem</GradientText>
            </h2>
            <p className="max-w-[900px] text-lg text-[#656565] sm:text-[22px]">
              Humanify menyatukan berbagai kebutuhan HR dalam satu platform sehingga tim tidak perlu berpindah-pindah sistem untuk menjalankan pekerjaan sehari-hari.
            </p>
          </FadeIn>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m, i) => (
              <FadeIn key={m.title} delay={i * 0.04}>
                <article className="flex h-full min-h-[198px] flex-col gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-6">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg p-3 ${m.iconBg}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.icon} alt="" width={24} height={24} className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-base font-bold text-[#0f172a]">{m.title}</h3>
                    <p className="text-sm leading-[1.4] text-[#5b616b]">{m.desc}</p>
                  </div>
                </article>
              </FadeIn>
            ))}
          </div>
        </SectionShell>

        {/* ── Journey ── */}
        <SectionShell>
          <FadeIn>
            <JourneySection journeyIdx={journeyIdx} setJourneyIdx={setJourneyIdx} />
          </FadeIn>
        </SectionShell>

        {/* ── Mobile ESS (Figma 773:2098) ── */}
        <SectionShell>
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-0">
            <div className="order-2 flex flex-col gap-6 lg:order-1 lg:pr-[50px]">
              {MOBILE_LEFT.map((item, i) => (
                <FadeIn key={item.title} delay={i * 0.06}>
                  <article className="flex min-h-[173px] flex-col gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.icon} alt="" width={24} height={24} className="h-6 w-6" />
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-base font-semibold text-[#0f172a]">{item.title}</h3>
                      <p className="text-sm leading-[1.4] text-[#5b616b]">{item.desc}</p>
                    </div>
                  </article>
                </FadeIn>
              ))}
            </div>

            <FadeIn className="order-1 mx-auto lg:order-2" delay={0.1}>
              <div className="relative mx-auto h-[min(70vw,420px)] w-[min(52vw,264px)] sm:h-[529px] sm:w-[264px]">
                <Image
                  src={`${IMG}/phone-mockup.png`}
                  alt="Portal Karyawan Humanify — clock in, clock out, dan ringkasan kehadiran"
                  fill
                  className="object-contain"
                  sizes="264px"
                  priority
                />
              </div>
            </FadeIn>

            <div className="order-3 flex flex-col gap-6 lg:pl-[50px]">
              {MOBILE_RIGHT.map((item, i) => (
                <FadeIn key={item.title} delay={i * 0.06}>
                  <article className="flex min-h-[173px] flex-col gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.icon} alt="" width={24} height={24} className="h-6 w-6" />
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-base font-semibold text-[#0f172a]">{item.title}</h3>
                      <p className="text-sm leading-[1.4] text-[#5b616b]">{item.desc}</p>
                    </div>
                  </article>
                </FadeIn>
              ))}
            </div>
          </div>
        </SectionShell>

        {/* ── FAQ ── */}
        <SectionShell id="faq" className="scroll-mt-28">
          <div className="grid gap-10 lg:grid-cols-[438px_1fr] lg:gap-5">
            <FadeIn>
              <p className="mb-4 text-xl font-medium text-[#592277]">FAQ</p>
              <h2 className="mb-4 text-[28px] font-bold sm:text-[30px]">
                Pertanyaan Umum
                <br />
                <span className="bg-gradient-to-r from-[#d587ff] to-[#4f1071] bg-clip-text text-transparent">
                  Seputar Humanify
                </span>
              </h2>
              <p className="text-lg text-[#656565] sm:text-xl">
                Temukan jawaban atas pertanyaan yang paling sering diajukan sebelum mulai menggunakan Humanify.
              </p>
            </FadeIn>

            <FadeIn delay={0.08}>
              <div className="rounded-xl bg-[#f9fbff] px-[22px] py-[30px]">
                <div className="flex flex-col gap-[30px]">
                  {faqItems.map((faq, i) => {
                    const open = openFaq === i;
                    return (
                      <div
                        key={faq.id}
                        className={`rounded-xl px-3 py-3 transition ${
                          open ? 'bg-gradient-to-r from-[#e8d1f8] to-white' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center gap-2 py-1 text-left"
                          onClick={() => setOpenFaq(open ? -1 : i)}
                          aria-expanded={open}
                        >
                          <span className="flex-1 text-base font-medium text-[#35393f]">{faq.question}</span>
                          {open ? (
                            <Minus className="h-5 w-5 shrink-0 text-[#592277]" />
                          ) : (
                            <Plus className="h-5 w-5 shrink-0 text-[#592277]" />
                          )}
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.p
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden whitespace-pre-wrap text-sm leading-normal text-[#656565]"
                            >
                              <span className="mt-2 block">{faq.answer}</span>
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </FadeIn>
          </div>
        </SectionShell>

        {/* ── Pricing banner ── */}
        <SectionShell id="pricing" className="scroll-mt-28 w-full max-w-none px-0 sm:px-0 lg:max-w-[1200px] lg:px-6">
          <FadeIn>
            <div className="relative mx-5 overflow-hidden rounded-2xl sm:mx-6 lg:mx-0">
              <div className="relative min-h-[220px] sm:min-h-[243px]">
                <Image src={`${IMG}/pricing-visual.png`} alt="" fill className="object-cover" sizes="1200px" />
                <div className="absolute inset-0 bg-[#592277]/50" />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-8 text-center sm:px-6 sm:py-10">
                <p className="text-2xl font-bold text-white sm:text-[32px] lg:text-[44px]">
                  Mulai dari <span className="text-[#ffff54]">{priceLabel}</span>
                </p>
                <p className="mt-3 max-w-2xl text-sm text-white sm:text-base lg:text-[22px]">
                  Humanify dapat digunakan mulai dari {priceLabel} dengan fitur yang dapat disesuaikan berdasarkan kebutuhan dan skala perusahaan.
                </p>
                <Link
                  href={HUMANIFY_BRAND.roiCalculatorPath}
                  className="mt-6 inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-[#592277] transition hover:bg-[#f6e6ff] sm:w-auto"
                >
                  Hitung ROI
                </Link>
              </div>
            </div>
          </FadeIn>
        </SectionShell>

        {/* ── Final CTA ── */}
        <SectionShell className="flex flex-col items-center gap-[38px] pb-4 text-center">
          <FadeIn className="flex flex-col items-center gap-4">
            <Pill>READY TO TRANSFORM HR?</Pill>
            <h2 className="text-[32px] font-bold sm:text-[44px]">
              Saatnya HR <GradientText>Bekerja Lebih Terhubung</GradientText>
            </h2>
            <p className="max-w-[900px] text-lg text-[#656565] sm:text-[22px]">
              Satukan data, proses, dan kebutuhan workforce dalam Humanify agar pekerjaan HR lebih efisien dan informasi penting lebih mudah diakses.
            </p>
          </FadeIn>

          <FadeIn delay={0.08} className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <PrimaryBtn href={HUMANIFY_BRAND.signupPath} className="text-base">
              Coba Humanify Gratis
            </PrimaryBtn>
            <SecondaryBtn href={demoHref} external className="text-base">
              Jadwalkan Demo
            </SecondaryBtn>
          </FadeIn>

          <FadeIn delay={0.12} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-base text-[#2d2d2d]">
            {['Trial gratis', 'Dukungan onboarding', 'Siap untuk kebutuhan perusahaan'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-[18px] w-[18px] text-[#592277]" />
                {t}
              </span>
            ))}
          </FadeIn>
        </SectionShell>

        {/* ── Footer (Figma #501f6b) ── */}
        <footer className="w-full bg-[#501f6b] px-6 pt-[60px] text-[#dbdbdb] sm:px-10 lg:px-[60px]">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-10 lg:flex-row lg:justify-between">
            <div className="max-w-[480px]">
              <div className="relative mb-6 h-[53px] w-[144px]">
                <Image src={HUMANIFY_BRAND.welcomeLogoPath} alt={HUMANIFY_BRAND.name} fill className="object-contain object-left" />
              </div>
              <p className="mb-6 text-base leading-normal">{NAINCODE.footerTagline}</p>
              <div className="space-y-3 text-base">
                <a href={`mailto:${NAINCODE.email}`} className="flex items-center gap-2 hover:text-white">
                  <Mail className="h-6 w-6 shrink-0" />
                  {NAINCODE.email}
                </a>
                <a href={`tel:${NAINCODE.phone.replace(/\D/g, '')}`} className="flex items-center gap-2 hover:text-white">
                  <Phone className="h-6 w-6 shrink-0" />
                  {NAINCODE.phone}
                </a>
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-6 w-6 shrink-0" />
                  <span>{NAINCODE.address}</span>
                </p>
              </div>
              <div className="mt-6 flex gap-4">
                {[
                  { href: NAINCODE.social.linkedin, Icon: Linkedin, label: 'LinkedIn' },
                  { href: NAINCODE.social.instagram, Icon: Instagram, label: 'Instagram' },
                  { href: NAINCODE.social.github, Icon: Github, label: 'GitHub' },
                  { href: NAINCODE.social.youtube, Icon: Youtube, label: 'YouTube' },
                ].map(({ href, Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f8f8f9] text-[#501f6b] transition hover:scale-105"
                  >
                    <Icon className="h-[22px] w-[22px]" />
                  </a>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8 lg:gap-10">
              {(
                [
                  ['Services', NAINCODE.footerLinks.services],
                  ['Industries', NAINCODE.footerLinks.industries],
                  ['Company', NAINCODE.footerLinks.company],
                ] as const
              ).map(([title, links]) => (
                <div key={title} className="min-w-0">
                  <h3 className="mb-4 text-base font-semibold tracking-tight text-[#f8f8f9] sm:mb-6 sm:text-lg">{title}</h3>
                  <ul className="space-y-3 sm:space-y-4">
                    {links.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm tracking-tight transition hover:text-white sm:text-base"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-[22px] flex max-w-[1320px] flex-col items-center justify-between gap-3 border-t border-[#898989] py-[26px] text-sm text-[#f8f8f9] sm:flex-row">
            <p>© {new Date().getFullYear()} Naincode Inti Technology. All rights reserved.</p>
            <p>
              Made with <span className="text-[#f10004]">❤️</span> in Indonesia
            </p>
          </div>
        </footer>
      </main>

      <AimanFloatingChat />
    </div>
  );
}
