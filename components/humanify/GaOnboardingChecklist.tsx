/**
 * First-day HR checklist — tenant-scoped + live signals (no cross-account localStorage leak).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, Circle, Users, Clock, Calendar, DollarSign, UserCheck, FileText,
  Sparkles, RotateCcw,
} from 'lucide-react';
import {
  FIRST_RUN_STEPS,
  LEGACY_GA_CHECKLIST_KEY,
  computeFirstRunXp,
  deriveFirstRunDone,
  firstRunLevel,
  firstRunStorageKey,
  type FirstRunManual,
  type FirstRunStepId,
} from '@/lib/humanify/first-run';

const ICONS: Record<FirstRunStepId, typeof Users> = {
  import: Users,
  docs: FileText,
  attendance: Clock,
  leave: Calendar,
  payroll: DollarSign,
  ess: UserCheck,
};

type GoLiveItem = { id: string; done: boolean };

export default function GaOnboardingChecklist() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [manual, setManual] = useState<FirstRunManual>({});
  const [live, setLive] = useState({
    employeeCount: 0,
    docsComplete: false,
    hasAttendanceSignal: false,
    hasLeaveSignal: false,
    hasPayrollSignal: false,
    essVisited: false,
  });
  const [ready, setReady] = useState(false);

  const loadLive = useCallback(async (tid: string | null) => {
    let employeeCount = 0;
    let docsComplete = false;
    let hasAttendanceSignal = false;
    let hasLeaveSignal = false;
    let hasPayrollSignal = false;

    try {
      const dashRes = await fetch('/api/humanify/dashboard');
      if (dashRes.ok) {
        const dash = await dashRes.json();
        if (dash.success) {
          employeeCount = Number(dash.stats?.active || dash.stats?.total || 0);
          const dc = dash.documentCompliance || dash.docCompliance;
          if (dc && Number(dc.activeEmployees || 0) > 0) {
            docsComplete = Number(dc.incomplete || 0) === 0 && Number(dc.complete || 0) > 0;
          }
        }
      }
    } catch { /* */ }

    try {
      const glRes = await fetch('/api/humanify/go-live');
      if (glRes.ok) {
        const gl = await glRes.json();
        const items: GoLiveItem[] = gl?.data?.items || [];
        const byId = Object.fromEntries(items.map((i) => [i.id, i.done]));
        // Prefer real activity signals — not seed-only leave_types / slug-only careers
        if (byId.first_employee) employeeCount = Math.max(employeeCount, 1);
        hasAttendanceSignal = Boolean(byId.attendance_ready);
        hasLeaveSignal = Boolean(byId.leave_ready);
        hasPayrollSignal = Boolean(byId.payroll_ready);
      }
    } catch { /* */ }

    let essVisited = false;
    try {
      if (tid) {
        essVisited = localStorage.getItem(`humanify-ess-visited:${tid}`) === '1';
      }
    } catch { /* */ }

    setLive({
      employeeCount,
      docsComplete,
      hasAttendanceSignal,
      hasLeaveSignal,
      hasPayrollSignal,
      essVisited,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let tid: string | null = null;
      try {
        const ctx = await fetch('/api/humanify/saas-context');
        if (ctx.ok) {
          const j = await ctx.json();
          tid = j?.data?.tenantId || null;
        }
      } catch { /* */ }
      if (cancelled) return;
      setTenantId(tid);

      // Drop legacy global checklist so new tenants don't inherit old ticks
      try {
        localStorage.removeItem(LEGACY_GA_CHECKLIST_KEY);
      } catch { /* */ }

      try {
        const raw = localStorage.getItem(firstRunStorageKey(tid));
        if (raw) setManual(JSON.parse(raw));
      } catch { /* */ }

      await loadLive(tid);
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [loadLive]);

  const done = useMemo(() => deriveFirstRunDone(manual, live), [manual, live]);
  const completed = FIRST_RUN_STEPS.filter((s) => done[s.id]).length;
  const pct = Math.round((completed / FIRST_RUN_STEPS.length) * 100);
  const xp = computeFirstRunXp(done);
  const level = firstRunLevel(xp);

  const persistManual = (next: FirstRunManual) => {
    setManual(next);
    try {
      localStorage.setItem(firstRunStorageKey(tenantId), JSON.stringify(next));
    } catch { /* */ }
  };

  const toggle = (id: FirstRunStepId) => {
    // Only allow manual toggle for steps not already proven by live signals
    const liveDone = deriveFirstRunDone({}, live)[id];
    if (liveDone) return;
    persistManual({ ...manual, [id]: !manual[id] });
  };

  const resetManual = () => {
    persistManual({});
    void loadLive(tenantId);
  };

  if (!ready) return null;

  const checklistComplete = completed === FIRST_RUN_STEPS.length;
  if (checklistComplete) {
    return null;
  }

  return (
    <div
      id="hf-tour-checklist"
      data-tour-id="hf-tour-checklist"
      className="hf-card relative overflow-hidden"
    >
      <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[var(--hf-brand-500)]" aria-hidden />
      <div className="flex items-start justify-between gap-3 border-b border-[color:var(--hf-border-subtle)] px-5 py-4 pl-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[color:var(--hf-ink)]">Checklist hari pertama HR</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--hf-brand-100)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--hf-brand-600)]">
              <Sparkles className="h-3 w-3" />
              {level.name} · {xp} XP
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">
            {completed}/{FIRST_RUN_STEPS.length} misi · progress per perusahaan
            {tenantId ? '' : ' (sesi tanpa tenant)'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-[color:var(--hf-brand-500)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <button
            type="button"
            onClick={resetManual}
            className="inline-flex items-center gap-1 text-[10px] text-[color:var(--hf-ink-faint)] hover:text-[color:var(--hf-ink-muted)]"
            title="Reset centang manual (sinyal live tetap)"
          >
            <RotateCcw className="h-3 w-3" /> Reset manual
          </button>
        </div>
      </div>
      <ul className="divide-y divide-[color:var(--hf-border-subtle)]">
        {FIRST_RUN_STEPS.map((step) => {
          const Icon = ICONS[step.id];
          const isDone = Boolean(done[step.id]);
          const auto = deriveFirstRunDone({}, live)[step.id];
          return (
            <li
              key={step.id}
              id={step.tourTarget}
              data-tour-id={step.tourTarget}
              className="flex items-center gap-3 px-5 py-3 pl-6 hover:bg-[var(--hf-surface-muted)]"
            >
              <button
                type="button"
                onClick={() => toggle(step.id)}
                className="flex-shrink-0 text-[color:var(--hf-brand-600)]"
                aria-label={isDone ? 'Tandai belum' : 'Tandai selesai'}
                disabled={auto}
                title={auto ? 'Otomatis dari data live' : undefined}
              >
                {isDone
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  : <Circle className="h-5 w-5 text-slate-300" />}
              </button>
              <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <Link
                  href={step.href}
                  className={`text-sm ${isDone ? 'text-slate-400 line-through' : 'text-slate-800 hover:text-[color:var(--hf-brand-600)]'}`}
                >
                  {step.label}
                </Link>
                <p className="text-[10px] text-slate-400">
                  +{step.xp} XP{auto ? ' · auto' : ''}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-[color:var(--hf-border-subtle)] px-5 py-3 pl-6">
        <Link
          href="/humanify/go-live"
          className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
        >
          Lihat go-live checklist sistem →
        </Link>
      </div>
    </div>
  );
}
