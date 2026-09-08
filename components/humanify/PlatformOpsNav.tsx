import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard, Building2, HelpingHand, Activity, ClipboardList, Mail, CreditCard, FileText,
  Inbox, Users, Settings, Image as ImageIcon, Repeat, Package, Wallet, Target, Megaphone,
  BarChart3, Shield, TrendingUp, Key,
} from 'lucide-react';

const PRIMARY = [
  {
    href: '/platform',
    label: 'Ringkasan',
    hint: 'KPI & chart',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: '/platform/clients',
    label: 'Klien',
    hint: 'Tenant & lifecycle',
    icon: Building2,
    match: (path: string) => path === '/platform/clients' || path.startsWith('/platform/tenants'),
  },
  {
    href: '/platform/billing',
    label: 'Billing',
    hint: 'Bayar · voucher · paket',
    icon: CreditCard,
  },
  {
    href: '/platform/partners',
    label: 'Partner',
    hint: 'Referral & payout',
    icon: HelpingHand,
  },
  {
    href: '/platform/support',
    label: 'Support',
    hint: 'Antrean & tiket',
    icon: Inbox,
    match: (path: string) => path === '/platform/support' || path.startsWith('/platform/support/'),
  },
  {
    href: '/platform/observability',
    label: 'Observability',
    hint: 'Health & alerts',
    icon: Activity,
    match: (path: string) =>
      path === '/platform/observability' || path.startsWith('/platform/email-preview'),
  },
  {
    href: '/platform/audit',
    label: 'Audit',
    hint: 'Jejak operator',
    icon: FileText,
  },
] as const;

const MORE_GROUPS = [
  {
    label: 'Commercial',
    items: [
      { href: '/platform/subscriptions', label: 'Langganan', icon: Repeat },
      { href: '/platform/products', label: 'Produk', icon: Package },
      { href: '/platform/finance', label: 'Finance', icon: Wallet },
    ],
  },
  {
    label: 'Growth',
    items: [
      { href: '/platform/crm', label: 'CRM', icon: Target },
      { href: '/platform/marketing', label: 'Marketing', icon: Megaphone },
      { href: '/platform/content', label: 'Konten', icon: FileText },
      { href: '/platform/banners', label: 'Banner', icon: ImageIcon },
      { href: '/platform/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/platform/insights', label: 'Insight', icon: TrendingUp },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/platform/users', label: 'Pengguna', icon: Users },
      { href: '/platform/roles', label: 'Roles', icon: Key },
      { href: '/platform/approvals', label: 'Approval', icon: Shield },
      { href: '/platform/system', label: 'Sistem', icon: Settings },
      { href: '/platform/demo-checklist', label: 'Demo', icon: ClipboardList },
      { href: '/platform/email-preview', label: 'Email', icon: Mail },
    ],
  },
] as const;

/**
 * Primary ops navigation — control plane only.
 */
export default function PlatformOpsNav() {
  const router = useRouter();
  const path = router.pathname;

  return (
    <div className="mb-6 space-y-3">
      <nav
        aria-label="Admin Total"
        className="flex gap-1 overflow-x-auto hf-card p-1.5 w-full"
      >
        {PRIMARY.map((item) => {
          const Icon = item.icon;
          const active =
            'exact' in item && item.exact
              ? path === item.href
              : 'match' in item && item.match
                ? item.match(path)
                : path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex min-w-[7.5rem] flex-1 flex-col rounded-xl px-3 py-2 transition ${
                active
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-emerald-300' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {item.label}
              </span>
              <span className={`mt-0.5 text-[10px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>
                {item.hint}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 px-1">
        {MORE_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {group.label}
            </span>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = path === item.href || path.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${
                    active
                      ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
                      : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
