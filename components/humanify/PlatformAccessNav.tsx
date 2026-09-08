import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  UserCheck, Heart, Shield, Building2, UserPlus, Lock, Fingerprint, KeyRound, CreditCard, CheckCircle2,
} from 'lucide-react';
import { OpsPageHero, OpsStage, type OpsChip } from '@/components/humanify/OpsPageChrome';

const LINKS = [
  { id: 'ess', href: '/humanify/ess', label: 'ESS', icon: Heart },
  { id: 'mss', href: '/humanify/mss', label: 'Persetujuan HR', icon: Shield },
  { id: 'org', href: '/humanify/org-settings', label: 'Organisasi', icon: Building2 },
  { id: 'users', href: '/humanify/users', label: 'Tim', icon: UserPlus },
  { id: 'roles', href: '/humanify/users/roles', label: 'Role', icon: Shield },
  { id: 'security', href: '/humanify/security', label: '2FA', icon: Lock },
  { id: 'sso', href: '/humanify/sso', label: 'SSO', icon: Fingerprint },
  { id: 'enterprise', href: '/humanify/enterprise', label: 'Enterprise', icon: KeyRound },
  { id: 'billing', href: '/humanify/billing', label: 'Billing', icon: CreditCard },
  { id: 'golive', href: '/humanify/go-live', label: 'Go-live', icon: CheckCircle2 },
] as const;

export type PlatformAccessNavId = (typeof LINKS)[number]['id'];

export default function PlatformAccessNav({ current }: { current: PlatformAccessNavId }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav
        aria-label="Modul Platform & Akses"
        className="flex min-w-0 flex-1 overflow-x-auto hf-card p-1.5"
      >
        {LINKS.map((item) => {
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
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/employee"
        target="_blank"
        rel="noopener noreferrer"
        className="hf-btn-secondary inline-flex shrink-0 items-center gap-1.5 text-xs md:text-sm"
      >
        <UserCheck className="h-3.5 w-3.5" />
        Buka portal
      </Link>
    </div>
  );
}

export function PlatformAccessShell({
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
  current: PlatformAccessNavId;
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
        badge="Platform & Akses"
        liveLabel="Ops"
        icon={icon}
        actions={actions}
        chips={chips}
        score={score}
        scoreLabel={scoreLabel}
      />
      <PlatformAccessNav current={current} />
      {children}
    </OpsStage>
  );
}
