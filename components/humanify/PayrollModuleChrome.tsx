import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  LayoutDashboard, Calculator, FileText, Gift, Percent, Shield, Clock,
  Wallet, CreditCard, BarChart3, Banknote,
} from 'lucide-react';
import { OpsPageHero, OpsStage, type OpsChip } from '@/components/humanify/OpsPageChrome';

export const PAYROLL_NAV = [
  { id: 'hub', href: '/humanify/payroll', label: 'Dasbor', icon: LayoutDashboard },
  { id: 'main', href: '/humanify/payroll/main', label: 'Proses', icon: Calculator },
  { id: 'slip', href: '/humanify/payroll/slip-gaji', label: 'Slip', icon: FileText },
  { id: 'thr', href: '/humanify/payroll/thr', label: 'THR', icon: Gift },
  { id: 'pph21', href: '/humanify/payroll/pph21', label: 'PPh 21', icon: Percent },
  { id: 'bpjs', href: '/humanify/payroll/bpjs', label: 'BPJS', icon: Shield },
  { id: 'lembur', href: '/humanify/payroll/lembur', label: 'Lembur', icon: Clock },
  { id: 'bonus', href: '/humanify/payroll/bonus', label: 'Bonus', icon: Gift },
  { id: 'kasbon', href: '/humanify/payroll/cash-advance', label: 'Kasbon', icon: Wallet },
  { id: 'loan', href: '/humanify/payroll/loan', label: 'Pinjaman', icon: CreditCard },
  { id: 'laporan', href: '/humanify/payroll/laporan', label: 'Laporan', icon: BarChart3 },
  { id: 'transfer', href: '/humanify/payroll/disbursement', label: 'Transfer', icon: Banknote },
] as const;

export type PayrollNavId = (typeof PAYROLL_NAV)[number]['id'];

export function PayrollModuleNav({ current }: { current: PayrollNavId }) {
  return (
    <nav
      aria-label="Modul Payroll"
      className="flex min-w-0 overflow-x-auto hf-card p-1.5"
    >
      {PAYROLL_NAV.map((item) => {
        const Icon = item.icon as LucideIcon;
        const active = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-[var(--hf-radius)] px-3 py-2 text-xs font-medium transition-colors md:text-sm ${
              active
                ? 'bg-[var(--hf-brand-600)] text-white'
                : 'text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)] hover:text-[color:var(--hf-ink)]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PayrollShell({
  current,
  title,
  subtitle,
  icon,
  actions,
  chips,
  score,
  scoreLabel,
  children,
}: {
  current: PayrollNavId;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  chips?: OpsChip[];
  score?: number | null;
  scoreLabel?: string;
  children: ReactNode;
}) {
  return (
    <OpsStage>
      <OpsPageHero
        title={title}
        subtitle={subtitle}
        badge="Payroll"
        liveLabel="Finance ops"
        icon={icon}
        actions={actions}
        chips={chips}
        score={score}
        scoreLabel={scoreLabel}
      />
      <PayrollModuleNav current={current} />
      {children}
    </OpsStage>
  );
}
