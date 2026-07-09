import type { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EnterprisePageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  gradient?: 'indigo' | 'slate' | 'emerald' | 'violet';
}

const GRADIENTS = {
  indigo: 'from-slate-900 via-indigo-950 to-violet-900',
  slate: 'from-slate-900 via-slate-800 to-slate-900',
  emerald: 'from-emerald-900 via-teal-900 to-slate-900',
  violet: 'from-violet-950 via-purple-900 to-indigo-950',
};

export default function EnterprisePageHeader({
  title,
  subtitle,
  badge,
  icon: Icon,
  actions,
  gradient = 'indigo',
}: EnterprisePageHeaderProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${GRADIENTS[gradient]} p-6 text-white shadow-xl md:p-8`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          {badge && (
            <div className="mb-2 flex items-center gap-2 text-indigo-200">
              {Icon && <Icon className="h-4 w-4" />}
              <span className="text-xs font-semibold uppercase tracking-wider">{badge}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm text-white/75">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
