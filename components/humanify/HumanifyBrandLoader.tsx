import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

type Variant = 'boot' | 'signup' | 'launch';

const MESSAGES: Record<Variant, string[]> = {
  boot: [
    'Menyiapkan workspace…',
    'Memuat konfigurasi HRIS…',
    'Hampir siap…',
  ],
  signup: [
    'Membuat akun perusahaan…',
    'Menyiapkan workspace trial…',
    'Mengaktifkan portal HR…',
    'Membuka wizard setup…',
  ],
  launch: [
    'Meluncurkan workspace…',
    'Mengaktifkan modul HRIS…',
    'Menyiapkan dashboard…',
    'Selamat datang di Humanify!',
  ],
};

type HumanifyBrandLoaderProps = {
  mode?: 'fullscreen' | 'inline';
  variant?: Variant;
  message?: string;
  /** 0–100; omit for indeterminate progress */
  progress?: number;
  className?: string;
};

/**
 * Branded Humanify loading — logo pulse, orbit rings, rotating status.
 * CSS transforms only (GPU) to stay smooth during signup / go-live.
 */
export default function HumanifyBrandLoader({
  mode = 'fullscreen',
  variant = 'boot',
  message,
  progress,
  className = '',
}: HumanifyBrandLoaderProps) {
  const lines = MESSAGES[variant];
  const [idx, setIdx] = useState(0);
  const [autoProgress, setAutoProgress] = useState(8);

  useEffect(() => {
    if (message) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % lines.length), 2200);
    return () => clearInterval(t);
  }, [message, lines.length]);

  useEffect(() => {
    if (typeof progress === 'number') return;
    const t = setInterval(() => {
      setAutoProgress((p) => {
        if (p >= 92) return 88 + Math.random() * 4;
        return Math.min(92, p + 4 + Math.random() * 6);
      });
    }, 400);
    return () => clearInterval(t);
  }, [progress]);

  const pct = typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : autoProgress;
  const status = message || lines[idx];

  const body = (
    <div className={`relative flex flex-col items-center justify-center text-center px-6 ${className}`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[90px]" />
        <div className="absolute left-[35%] top-[40%] h-48 w-48 -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-[60px] animate-pulse" />
      </div>

      <div className="relative z-10 mb-8 flex h-28 w-28 items-center justify-center">
        <span className="hfy-orbit absolute inset-0 rounded-full border border-violet-400/25" />
        <span className="hfy-orbit-rev absolute inset-2 rounded-full border border-dashed border-fuchsia-400/30" />
        <span className="absolute inset-[-6px] rounded-full border border-violet-500/10" />

        <span className="hfy-orbit absolute inset-0">
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.9)]" />
        </span>
        <span className="hfy-orbit-rev absolute inset-2">
          <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-fuchsia-400 shadow-[0_0_10px_rgba(232,121,249,0.9)]" />
        </span>

        <motion.div
          className="relative z-10 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-white/20"
          animate={{
            scale: [1, 1.06, 1],
            boxShadow: [
              '0 0 28px rgba(139,92,246,0.35)',
              '0 0 48px rgba(192,132,252,0.55)',
              '0 0 28px rgba(139,92,246,0.35)',
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUMANIFY_BRAND.logoPath}
            alt={HUMANIFY_BRAND.name}
            className="h-full w-full scale-[2.35] object-cover object-[22%_center]"
            draggable={false}
          />
        </motion.div>
      </div>

      <motion.p
        className="relative z-10 text-lg font-semibold tracking-tight text-white"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {HUMANIFY_BRAND.name}
      </motion.p>
      <p className="relative z-10 mt-1 text-xs font-medium uppercase tracking-[0.2em] text-violet-300/70">
        {HUMANIFY_BRAND.productType}
      </p>

      <div className="relative z-10 mt-6 h-5 min-w-[240px]">
        <AnimatePresence mode="wait">
          <motion.p
            key={status}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="text-sm text-violet-100/80"
          >
            {status}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="relative z-10 mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-violet-400"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        />
        <div className="hfy-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>
    </div>
  );

  const styles = (
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes hfy-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes hfy-spin-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
      @keyframes hfy-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      .hfy-orbit { animation: hfy-spin 8s linear infinite; will-change: transform; }
      .hfy-orbit-rev { animation: hfy-spin-rev 12s linear infinite; will-change: transform; }
      .hfy-shimmer { animation: hfy-shimmer 1.6s ease-in-out infinite; will-change: transform; }
    ` }} />
  );

  if (mode === 'inline') {
    return (
      <>
        {styles}
        <div className="flex min-h-[50vh] items-center justify-center bg-transparent">{body}</div>
      </>
    );
  }

  return (
    <>
      {styles}
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0a0812]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, #000 40%, transparent 100%)',
          }}
        />
        {body}
      </div>
    </>
  );
}
