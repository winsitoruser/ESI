/**
 * First-time product tour — tooltip steps + light XP gamification.
 */
import { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, ChevronRight, ChevronLeft, Map } from 'lucide-react';
import { TOUR_STEPS, tourStorageKey } from '@/lib/humanify/first-run';

type Rect = { top: number; left: number; width: number; height: number };

function readTourState(tenantId: string | null) {
  try {
    const raw = localStorage.getItem(tourStorageKey(tenantId));
    if (!raw) return { completed: false, skipped: false, started: false };
    return JSON.parse(raw) as { completed?: boolean; skipped?: boolean; started?: boolean };
  } catch {
    return { completed: false, skipped: false, started: false };
  }
}

function writeTourState(
  tenantId: string | null,
  patch: { completed?: boolean; skipped?: boolean; started?: boolean },
) {
  try {
    const prev = readTourState(tenantId);
    localStorage.setItem(tourStorageKey(tenantId), JSON.stringify({ ...prev, ...patch }));
  } catch { /* */ }
}

export default function FirstRunTour() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [goLivePct, setGoLivePct] = useState<number | null>(null);
  const [tipPos, setTipPos] = useState<{ top: number; left: number }>({ top: 120, left: 24 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let tid: string | null = null;
      let pct: number | null = null;
      let ready = false;
      try {
        const ctx = await fetch('/api/humanify/saas-context');
        if (ctx.ok) {
          const j = await ctx.json();
          tid = j?.data?.tenantId || null;
          pct = typeof j?.data?.goLivePct === 'number' ? j.data.goLivePct : null;
          ready = Boolean(j?.data?.goLiveReady);
        }
      } catch { /* */ }
      if (cancelled) return;
      setTenantId(tid);
      setGoLivePct(pct);

      const state = readTourState(tid);
      const isFresh = !ready && (pct === null || pct < 70);
      if (!state.completed && !state.skipped && isFresh) {
        window.setTimeout(() => {
          if (!cancelled) {
            writeTourState(tid, { started: true });
            setActive(true);
          }
        }, 700);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const step = TOUR_STEPS[stepIdx];

  useLayoutEffect(() => {
    if (!active || !step?.target) {
      setRect(null);
      if (active && typeof window !== 'undefined') {
        setTipPos({
          top: window.scrollY + Math.max(80, window.innerHeight / 3),
          left: Math.max(16, (window.innerWidth - 340) / 2),
        });
      }
      return;
    }
    const el = document.querySelector(`[data-tour-id="${step.target}"]`) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const update = () => {
      const r = el.getBoundingClientRect();
      const nextRect = {
        top: r.top + window.scrollY - 8,
        left: r.left + window.scrollX - 8,
        width: r.width + 16,
        height: r.height + 16,
      };
      setRect(nextRect);
      setTipPos({
        top: Math.min(nextRect.top + nextRect.height + 12, window.scrollY + window.innerHeight - 220),
        left: Math.max(16, Math.min(nextRect.left, window.innerWidth - 360)),
      });
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [active, stepIdx, step?.target]);

  const finish = (mode: 'completed' | 'skipped') => {
    writeTourState(tenantId, mode === 'completed' ? { completed: true } : { skipped: true });
    setActive(false);
  };

  const next = () => {
    if (stepIdx >= TOUR_STEPS.length - 1) {
      finish('completed');
      return;
    }
    setStepIdx((i) => i + 1);
  };

  const prev = () => setStepIdx((i) => Math.max(0, i - 1));

  const restart = () => {
    writeTourState(tenantId, { completed: false, skipped: false, started: true });
    setStepIdx(0);
    setActive(true);
  };

  if (!active) {
    return (
      <button
        type="button"
        onClick={restart}
        className="fixed bottom-[5.75rem] left-5 z-40 inline-flex items-center gap-2 rounded-full border border-[color:var(--hf-border)] bg-white px-3 py-2 text-xs font-medium text-[color:var(--hf-ink-secondary)] shadow-md hover:border-[color:var(--hf-brand-500)] hover:text-[color:var(--hf-brand-600)]"
        title="Ulangi tour Day-1"
      >
        <Map className="h-3.5 w-3.5" />
        Tour Day-1
        {goLivePct != null && (
          <span className="rounded-full bg-[color:var(--hf-brand-100)] px-1.5 py-0.5 text-[10px] text-[color:var(--hf-brand-600)]">
            {goLivePct}%
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none" aria-live="polite">
      <div
        className={`absolute inset-0 pointer-events-auto ${rect ? 'bg-transparent' : 'bg-slate-900/45'}`}
        onClick={() => finish('skipped')}
      />
      {rect && (
        <div
          className="absolute rounded-xl ring-2 ring-[color:var(--hf-brand-500)] ring-offset-2 pointer-events-none transition-all duration-300"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.5)',
          }}
        />
      )}
      <div
        className="absolute w-[min(340px,calc(100vw-32px))] rounded-2xl border border-[color:var(--hf-border)] bg-white p-4 shadow-xl pointer-events-auto"
        style={{ top: tipPos.top, left: tipPos.left }}
        role="dialog"
        aria-labelledby="hf-tour-title"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--hf-brand-100)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--hf-brand-600)]">
            <Sparkles className="h-3 w-3" />
            Misi {stepIdx + 1}/{TOUR_STEPS.length}
          </div>
          <button
            type="button"
            onClick={() => finish('skipped')}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            aria-label="Tutup tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h4 id="hf-tour-title" className="text-sm font-semibold text-[color:var(--hf-ink)]">
          {step.title}
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--hf-ink-muted)]">{step.body}</p>
        {'href' in step && step.href && (
          <Link
            href={step.href}
            className="mt-2 inline-block text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
            onClick={() => finish('completed')}
          >
            Buka halaman →
          </Link>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={stepIdx === 0}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-500 disabled:opacity-30 hover:bg-slate-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Kembali
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--hf-brand)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[color:var(--hf-brand-600)]"
          >
            {stepIdx >= TOUR_STEPS.length - 1 ? 'Selesai' : 'Lanjut'}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
