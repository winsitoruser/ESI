import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { PublicBanner } from '@/lib/saas/landing-banners';

type Props = {
  banners: PublicBanner[];
  variant?: 'landing' | 'dashboard';
  className?: string;
};

function prefersReducedMotion() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Marketing banner carousel — landing (dark) or HR dashboard (token chrome).
 * Auto-advance pauses on hover/focus and respects reduced motion.
 */
export default function MarketingBannerCarousel({
  banners,
  variant = 'landing',
  className = '',
}: Props) {
  const slides = (banners || []).filter((b) => b.imageUrl);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((dir: number) => {
    setIndex((i) => {
      const n = slides.length;
      if (n < 2) return 0;
      return (i + dir + n) % n;
    });
    setPaused(true);
  }, [slides.length]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused || hover || prefersReducedMotion()) return undefined;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(t);
  }, [slides.length, paused, hover]);

  if (slides.length === 0) return null;
  const current = slides[index] || slides[0];
  const landing = variant === 'landing';

  return (
    <section
      className={`relative overflow-hidden ${
        landing
          ? 'rounded-2xl border border-[#eee9f1] shadow-[0_12px_40px_rgba(89,34,119,0.12)]'
          : 'hf-card overflow-hidden'
      } ${className}`}
      aria-roledescription="carousel"
      aria-label="Banner Humanify"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onTouchStart={(e) => { touchX.current = e.changedTouches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        touchX.current = null;
        if (start == null || end == null) return;
        const delta = end - start;
        if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
      }}
    >
      <div className={`relative ${landing ? 'aspect-[16/8] sm:aspect-[16/7]' : 'aspect-[21/8] min-h-[160px] sm:min-h-[200px]'}`}>
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-500 ${i === index ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            aria-hidden={i !== index}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <div
              className={`absolute inset-0 ${
                landing
                  ? 'bg-gradient-to-t from-[#501f6b] via-[#501f6b]/45 to-transparent'
                  : 'bg-gradient-to-r from-slate-950/80 via-slate-950/35 to-transparent'
              }`}
            />
          </div>
        ))}

        <div className={`relative z-10 flex h-full flex-col justify-end ${landing ? 'p-4 sm:p-6 lg:p-10' : 'p-5 sm:p-7'}`}>
          <p className={`max-w-2xl font-semibold tracking-tight ${landing ? 'text-xl leading-snug text-white sm:text-2xl lg:text-4xl' : 'text-lg text-white sm:text-2xl'}`}>
            {current.title}
          </p>
          {current.subtitle && (
            <p className={`mt-2 max-w-xl line-clamp-3 ${landing ? 'text-sm text-violet-100/80 sm:text-base' : 'text-sm text-white/80'}`}>
              {current.subtitle}
            </p>
          )}
          {current.ctaHref && current.ctaLabel && (
            <Link
              href={current.ctaHref}
              className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold transition sm:w-fit ${
                landing
                  ? 'bg-white text-slate-900 hover:bg-violet-100'
                  : 'bg-[var(--hf-brand-600)] text-white hover:opacity-90'
              }`}
            >
              {current.ctaLabel}
            </Link>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-between px-2 sm:px-3">
          <button
            type="button"
            onClick={() => go(-1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/55"
            aria-label="Banner sebelumnya"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/55"
            aria-label="Banner berikutnya"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 sm:bottom-3 sm:gap-2">
        {slides.length > 1 && slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Banner ${i + 1}`}
            aria-current={i === index}
            onClick={() => { setIndex(i); setPaused(true); }}
            className="inline-flex min-h-11 min-w-11 items-center justify-center"
          >
            <span
              className={`block h-2 rounded-full transition-all ${
                i === index ? 'w-6 bg-white' : 'w-2 bg-white/45'
              }`}
            />
          </button>
        ))}
        {slides.length > 1 && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white"
            aria-label={paused ? 'Putar banner' : 'Jeda banner'}
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </section>
  );
}

/** Client-side rail for HR dashboard — hidden when no live banners. */
export function DashboardBannerRail({ className = 'mb-5' }: { className?: string }) {
  const [banners, setBanners] = useState<PublicBanner[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/humanify/banners?placement=dashboard')
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.success) setBanners(json.data?.banners || []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  if (!banners.length) return null;
  return <MarketingBannerCarousel banners={banners} variant="dashboard" className={className} />;
}
