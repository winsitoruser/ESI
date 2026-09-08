import type { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EnterprisePageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  gradient?: 'indigo' | 'slate' | 'emerald' | 'violet' | 'corporate';
  variant?: 'dark' | 'corporate';
}

const GRADIENTS = {
  indigo: 'from-slate-800 via-slate-900 to-slate-800',
  slate: 'from-slate-800 via-slate-900 to-slate-800',
  emerald: 'from-teal-900 via-slate-900 to-slate-800',
  violet: 'from-slate-900 via-[var(--hf-brand)] to-slate-900',
  corporate: 'from-white via-slate-50 to-slate-50',
};

export default function EnterprisePageHeader({
  title,
  subtitle,
  badge,
  icon: Icon,
  actions,
  gradient = 'corporate',
  variant = 'corporate',
}: EnterprisePageHeaderProps) {
  const isCorporate = variant === 'corporate' || gradient === 'corporate';

  if (isCorporate) {
    return (
      <div className="hf-card relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6">
        <div className="absolute inset-y-0 left-0 w-1 bg-[var(--hf-brand-600)]" aria-hidden />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 pl-2">
            {badge && (
              <div className="mb-1.5 flex items-center gap-2 text-[color:var(--hf-ink-muted)]">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span className="hf-section-label">{badge}</span>
              </div>
            )}
            <h1 className="hf-page-title">{title}</h1>
            {subtitle && <p className="hf-page-subtitle max-w-2xl">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 pl-2 md:pl-0">{actions}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-[var(--hf-radius-xl)] bg-gradient-to-br ${GRADIENTS[gradient]} p-5 text-white shadow-[var(--hf-shadow-md)] md:p-6`}>
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          {badge && (
            <div className="mb-1.5 flex items-center gap-2 text-white/70">
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">{badge}</span>
            </div>
          )}
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-white/70">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
