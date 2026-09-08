import Link from 'next/link';
import { useRouter } from 'next/router';
import type { LucideIcon } from 'lucide-react';
import { Target, Settings, Award, Activity, Crosshair } from 'lucide-react';
import EnterprisePageHeader from '@/components/humanify/EnterprisePageHeader';

export const PERFORMANCE_MODULES = [
  { href: '/humanify/okr', label: 'OKR Perusahaan', icon: Crosshair, key: 'okr' },
  { href: '/humanify/kpi', label: 'KPI Karyawan', icon: Target, key: 'kpi' },
  { href: '/humanify/kpi-settings', label: 'Pengaturan KPI', icon: Settings, key: 'kpi-settings' },
  { href: '/humanify/performance', label: 'Penilaian Kinerja', icon: Award, key: 'performance' },
  { href: '/humanify/engagement', label: 'Keterlibatan', icon: Activity, key: 'engagement' },
] as const;

export type PerformanceModuleKey = (typeof PERFORMANCE_MODULES)[number]['key'];

interface PerformanceModuleChromeProps {
  active: PerformanceModuleKey;
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: LucideIcon;
  gradient?: 'indigo' | 'slate' | 'emerald' | 'violet' | 'corporate';
  actions?: React.ReactNode;
}

export function PerformanceModuleNav({ active }: { active: PerformanceModuleKey }) {
  return (
    <nav className="flex flex-wrap gap-1 hf-card p-1.5">
      {PERFORMANCE_MODULES.map((m) => {
        const Icon = m.icon;
        const isActive = m.key === active;
        return (
          <Link
            key={m.key}
            href={m.href}
            className={`flex items-center gap-2 rounded-[var(--hf-radius)] px-3.5 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[var(--hf-brand-600)] text-white'
                : 'text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)] hover:text-[color:var(--hf-ink)]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function EnterpriseTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key?: T; id?: T; label: string; icon?: LucideIcon; count?: number }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex overflow-x-auto hf-card p-1.5">
      {tabs.map((tab) => {
        const tabKey = (tab.key ?? tab.id) as T;
        const Icon = tab.icon;
        const isActive = active === tabKey;
        return (
          <button
            key={String(tabKey)}
            type="button"
            onClick={() => onChange(tabKey)}
            className={`flex shrink-0 items-center gap-2 rounded-[var(--hf-radius)] px-3.5 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[var(--hf-brand-600)] text-white'
                : 'text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
            {tab.count != null && (
              <span className={`rounded-md px-1.5 py-0.5 text-xs tabular-nums ${isActive ? 'bg-white/20' : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function PerformanceModuleChrome({
  active,
  title,
  subtitle,
  badge = 'Performance & Engagement',
  icon = Target,
  gradient = 'corporate',
  actions,
}: PerformanceModuleChromeProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <EnterprisePageHeader
        title={title}
        subtitle={subtitle}
        badge={badge}
        icon={icon}
        gradient={gradient}
        variant="corporate"
        actions={actions}
      />
      <PerformanceModuleNav active={active} />
      {router.query.debug === '1' && (
        <div className="rounded-[var(--hf-radius-lg)] border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Modul aktif: <strong>{active}</strong> · Path: {router.pathname}
        </div>
      )}
    </div>
  );
}
