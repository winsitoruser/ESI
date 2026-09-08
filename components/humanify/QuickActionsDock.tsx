import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Keyboard,
  Megaphone,
  Target,
  UserPlus,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  HUMANIFY_QUICK_ACTIONS,
  QUICK_DOCK_STORAGE_KEY,
  matchQuickActionShortcut,
  type QuickActionDef,
  type QuickActionId,
} from '@/lib/humanify/quick-actions';

const ICONS: Record<QuickActionId, LucideIcon> = {
  'add-employee': UserPlus,
  attendance: Clock,
  payroll: DollarSign,
  recruitment: UserPlus,
  kpi: Target,
  announcements: Megaphone,
  calendar: Calendar,
  reports: BarChart3,
};

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(QUICK_DOCK_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function labelFor(t: (key: string) => string, def: QuickActionDef) {
  const translated = t(def.labelKey);
  return !translated || translated === def.labelKey ? def.fallbackLabel : translated;
}

/** Dashboard-only floating bar — bottom center, compact. */
export default function QuickActionsDock() {
  const { t } = useTranslation();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [flashId, setFlashId] = useState<QuickActionId | null>(null);
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  useEffect(() => {
    document.body.classList.add('hf-quick-dock-active');
    document.body.classList.toggle('hf-quick-dock-collapsed', collapsed);
    return () => {
      document.body.classList.remove('hf-quick-dock-active', 'hf-quick-dock-collapsed');
    };
  }, [collapsed]);

  const persistCollapsed = useCallback((next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem(QUICK_DOCK_STORAGE_KEY, next ? '1' : '0');
    } catch { /* */ }
  }, []);

  const go = useCallback((def: QuickActionDef) => {
    setFlashId(def.id);
    window.setTimeout(() => setFlashId((cur) => (cur === def.id ? null : cur)), 450);
    if (collapsed) persistCollapsed(false);
    void router.push(def.href);
  }, [collapsed, persistCollapsed, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHintOpen(false);
        return;
      }
      const match = matchQuickActionShortcut(e);
      if (!match) return;
      e.preventDefault();
      setHintOpen(false);
      go(match);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const title = t('hris.quickActions') === 'hris.quickActions' ? 'Aksi Cepat' : t('hris.quickActions');

  return (
    <div className="hf-quick-dock pointer-events-none fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[45] flex justify-center px-3">
      <nav aria-label={title} className="pointer-events-auto relative">
        {collapsed ? (
          <button
            type="button"
            onClick={() => persistCollapsed(false)}
            className="hf-quick-dock-shell inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold shadow-[var(--hf-shadow-md)]"
            aria-expanded="false"
          >
            <Zap className="h-3.5 w-3.5 text-[color:var(--hf-brand-600)]" />
            {title}
            <ChevronUp className="h-3.5 w-3.5 text-[color:var(--hf-ink-muted)]" />
          </button>
        ) : (
          <div className="hf-quick-dock-shell flex items-center gap-1 rounded-2xl p-1 shadow-[var(--hf-shadow-md)]">
            <ul className="flex flex-wrap justify-center gap-0.5">
              {HUMANIFY_QUICK_ACTIONS.map((action) => {
                const Icon = ICONS[action.id];
                const label = labelFor(t, action);
                const isFlash = flashId === action.id;
                const isActive = router.asPath === action.href || router.pathname === action.href.split('?')[0];
                return (
                  <li key={action.id}>
                    <Link
                      href={action.href}
                      id={action.tourId}
                      data-tour-id={action.tourId}
                      aria-keyshortcuts={`${action.shortcut} Alt+${action.altDigit}`}
                      aria-label={`${label} (${action.shortcut})`}
                      title={`${label} · ${action.shortcut} atau Alt+${action.altDigit}`}
                      onClick={() => setFlashId(action.id)}
                      className={`hf-quick-dock-item group flex w-[6.75rem] flex-col items-center rounded-xl px-1.5 py-1.5 text-center ${
                        isActive ? 'hf-quick-dock-item--active' : ''
                      } ${isFlash ? 'hf-quick-dock-item--flash' : ''}`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)] transition group-hover:bg-[var(--hf-brand-600)] group-hover:text-white">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="mt-1 w-full text-[11px] font-medium leading-tight text-[color:var(--hf-ink)]">
                        {label}
                      </span>
                      <kbd className="mt-0.5 font-mono text-[9px] font-semibold text-[color:var(--hf-ink-faint)]">
                        {action.shortcut}
                      </kbd>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="flex shrink-0 flex-col border-l border-[var(--hf-border)] pl-0.5">
              <button
                type="button"
                onClick={() => setHintOpen((v) => !v)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)] hover:text-[color:var(--hf-ink)]"
                aria-expanded={hintOpen}
                aria-label="Daftar pintasan keyboard"
                title="Pintasan keyboard"
              >
                <Keyboard className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => persistCollapsed(true)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)] hover:text-[color:var(--hf-ink)]"
                aria-label="Sembunyikan aksi cepat"
                title="Sembunyikan"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {hintOpen && !collapsed && (
          <div
            role="dialog"
            aria-label="Pintasan aksi cepat"
            className="hf-quick-dock-shell absolute bottom-[calc(100%+0.5rem)] left-1/2 w-[min(100vw-1.5rem,20rem)] -translate-x-1/2 rounded-xl p-3 text-xs shadow-[var(--hf-shadow-md)]"
          >
            <p className="mb-2 font-semibold text-[color:var(--hf-ink)]">Pintasan keyboard</p>
            <ul className="space-y-1 text-[color:var(--hf-ink-secondary)]">
              {HUMANIFY_QUICK_ACTIONS.map((action) => (
                <li key={action.id} className="flex items-center justify-between gap-3">
                  <span>{labelFor(t, action)}</span>
                  <span className="shrink-0 font-mono text-[10px] text-[color:var(--hf-ink-muted)]">
                    {action.shortcut} · Alt+{action.altDigit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </div>
  );
}
