import Link from 'next/link';
import { useRouter } from 'next/router';
import type { LucideIcon } from 'lucide-react';
import { Target, Settings, Award, Activity, ChevronRight } from 'lucide-react';
import EnterprisePageHeader from '@/components/humanify/EnterprisePageHeader';

export const PERFORMANCE_MODULES = [
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
  gradient?: 'indigo' | 'slate' | 'emerald' | 'violet';
  actions?: React.ReactNode;
}

export function PerformanceModuleNav({ active }: { active: PerformanceModuleKey }) {
  return (
    <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
      {PERFORMANCE_MODULES.map((m) => {
        const Icon = m.icon;
        const isActive = m.key === active;
        return (
          <Link
            key={m.key}
            href={m.href}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {m.label}
            {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
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
    <div className="flex overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
      {tabs.map((tab) => {
        const tabKey = (tab.key ?? tab.id) as T;
        const Icon = tab.icon;
        const isActive = active === tabKey;
        return (
          <button
            key={String(tabKey)}
            type="button"
            onClick={() => onChange(tabKey)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? 'bg-[var(--hf-brand-600)] text-white shadow-sm shadow-[var(--hf-brand-600)]/20'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
            {tab.count != null && (
              <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
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
  gradient = 'indigo',
  actions,
}: PerformanceModuleChromeProps) {
  const router = useRouter();

  return (
    <div className="space-y-5">
      <EnterprisePageHeader
        title={title}
        subtitle={subtitle}
        badge={badge}
        icon={icon}
        gradient={gradient}
        actions={actions}
      />
      <PerformanceModuleNav active={active} />
      {router.query.debug === '1' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Modul aktif: <strong>{active}</strong> · Path: {router.pathname}
        </div>
      )}
    </div>
  );
}
