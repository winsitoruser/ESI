import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard, Building2, HelpingHand, Activity, ClipboardList,
} from 'lucide-react';

const LINKS = [
  { href: '/platform', label: 'Ringkasan', icon: LayoutDashboard, exact: true },
  { href: '/platform/clients', label: 'Klien', icon: Building2 },
  { href: '/platform/partners', label: 'Partner & Billing', icon: HelpingHand },
  { href: '/platform/observability', label: 'Observability', icon: Activity },
  { href: '/platform/demo-checklist', label: 'Demo checklist', icon: ClipboardList },
];

/**
 * Shared sub-nav for Humanify platform ops pages.
 */
export default function PlatformOpsNav() {
  const router = useRouter();
  const path = router.pathname;

  return (
    <nav className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3 mb-1">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact
          ? path === href
          : href === '/platform/clients'
            ? path === href || path.startsWith('/platform/tenants')
            : path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              active
                ? 'bg-[var(--hf-brand-600)] text-white border-transparent'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
