import Link from 'next/link';
import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, Search, Shield, ExternalLink } from 'lucide-react';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import PlatformOpsNav from '@/components/humanify/PlatformOpsNav';
import OpsCommandPalette from '@/components/humanify/OpsCommandPalette';
import OpsNotificationBell from '@/components/humanify/OpsNotificationBell';
import { getApexOrigin, isAdminHost } from '@/lib/humanify/ops-host';

type Props = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  /** Show PlatformOpsNav (default true). Hide on login. */
  showNav?: boolean;
};

/**
 * Shell for Admin Total (admin.humanify.id) and legacy ops.humanify.id.
 * No Humanify HRIS sidebar, no ESS/MSS, no Aiman chat, no tenant modules.
 */
export default function OpsLayout({ children, title, subtitle, showNav = true }: Props) {
  const { data: session } = useSession();
  const email = (session?.user as any)?.email || '';
  const role = String((session?.user as any)?.role || '');
  const apex = getApexOrigin();
  const [adminTotal, setAdminTotal] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setAdminTotal(isAdminHost(window.location.host));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hostChip = adminTotal ? 'admin.humanify.id' : 'ops.humanify.id';

  return (
    <div className="humanify-theme min-h-screen bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink)]">
      <a
        href="#ops-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Lewati ke konten
      </a>
      <div className="pointer-events-none fixed inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.07),_transparent_55%)]" />

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/platform" className="shrink-0" aria-label="Admin Total beranda">
              <HumanifyLogo variant="full" size="sm" className="rounded" />
            </Link>
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                <Shield className="h-3 w-3" />
                Admin Total
              </p>
              {(title || subtitle) && (
                <div className="truncate">
                  {title && <p className="truncate text-sm font-semibold text-slate-900">{title}</p>}
                  {subtitle && <p className="hidden truncate text-xs text-slate-500 sm:block">{subtitle}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {showNav && (
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                aria-label="Cari modul atau klien"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cari</span>
                <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 lg:inline">
                  ⌘K
                </kbd>
              </button>
            )}
            {showNav && <OpsNotificationBell />}
            <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-100 lg:inline">
              {hostChip}
            </span>
            <a
              href={apex}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:inline-flex"
            >
              Tenant app
              <ExternalLink className="h-3 w-3" />
            </a>
            {email && (
              <div className="hidden text-right leading-tight md:block">
                <p className="max-w-[160px] truncate text-xs font-medium text-slate-700" title={email}>
                  {email}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">{role || 'operator'}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main id="ops-main" className="relative w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {showNav && <PlatformOpsNav />}
        {children}
      </main>

      <footer className="relative border-t border-slate-200/80 py-5 text-center text-[11px] text-slate-400">
        Humanify Admin Total · super_admin only · sesi terpisah dari portal tenant
      </footer>

      <OpsCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
