import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Activity, Building2, ClipboardList, CreditCard, HelpingHand, LayoutDashboard,
  Loader2, Mail, FileText, Search, Inbox, Users, Settings, Image as ImageIcon, Repeat, Package,
  Wallet, Target, Megaphone, BarChart3, Shield, TrendingUp, Key,
} from 'lucide-react';

type TenantHit = { id: string; name?: string; slug?: string; status?: string; subscription_plan?: string };

type PaletteItem = {
  id: string;
  kind: 'module' | 'tenant';
  href: string;
  title: string;
  hint: string;
};

const MODULES: PaletteItem[] = [
  { id: 'mod-home', kind: 'module', href: '/platform', title: 'Ringkasan', hint: 'KPI, chart, antrean perhatian' },
  { id: 'mod-clients', kind: 'module', href: '/platform/clients', title: 'Klien', hint: 'Tenant, plan, support mode' },
  { id: 'mod-billing', kind: 'module', href: '/platform/billing', title: 'Billing', hint: 'Pembayaran, voucher, paket' },
  { id: 'mod-partners', kind: 'module', href: '/platform/partners', title: 'Partner', hint: 'Referral, leads, payout' },
  { id: 'mod-support', kind: 'module', href: '/platform/support', title: 'Support', hint: 'Trial, unpaid, risiko, email' },
  { id: 'mod-obs', kind: 'module', href: '/platform/observability', title: 'Observability', hint: 'Health, error, alert' },
  { id: 'mod-audit', kind: 'module', href: '/platform/audit', title: 'Audit', hint: 'Jejak aksi operator' },
  { id: 'mod-users', kind: 'module', href: '/platform/users', title: 'Pengguna', hint: 'Operator platform & akun tenant' },
  { id: 'mod-system', kind: 'module', href: '/platform/system', title: 'Sistem', hint: 'SMTP, RLS, Redis, backup, cron' },
  { id: 'mod-banners', kind: 'module', href: '/platform/banners', title: 'Banner', hint: 'Carousel landing & dashboard HR' },
  { id: 'mod-subs', kind: 'module', href: '/platform/subscriptions', title: 'Langganan', hint: 'Paket, trial, renewal, churn' },
  { id: 'mod-products', kind: 'module', href: '/platform/products', title: 'Produk', hint: 'Katalog paket & fitur' },
  { id: 'mod-finance', kind: 'module', href: '/platform/finance', title: 'Finance', hint: 'Transaksi, revenue, refund' },
  { id: 'mod-crm', kind: 'module', href: '/platform/crm', title: 'CRM', hint: 'Pipeline lead & deal' },
  { id: 'mod-marketing', kind: 'module', href: '/platform/marketing', title: 'Marketing', hint: 'Campaign & funnel' },
  { id: 'mod-content', kind: 'module', href: '/platform/content', title: 'Konten', hint: 'FAQ landing CMS' },
  { id: 'mod-analytics', kind: 'module', href: '/platform/analytics', title: 'Analytics', hint: 'KPI bisnis & export' },
  { id: 'mod-insights', kind: 'module', href: '/platform/insights', title: 'Insight', hint: 'Forecast & rekomendasi' },
  { id: 'mod-roles', kind: 'module', href: '/platform/roles', title: 'Roles', hint: 'Desk staf & matriks izin' },
  { id: 'mod-approvals', kind: 'module', href: '/platform/approvals', title: 'Approval', hint: 'Refund besar & aksi sensitif' },
  { id: 'mod-demo', kind: 'module', href: '/platform/demo-checklist', title: 'Demo checklist', hint: 'Walkthrough sales 15 menit' },
  { id: 'mod-email', kind: 'module', href: '/platform/email-preview', title: 'Email templates', hint: 'Preview undangan & alert' },
];

function iconFor(item: PaletteItem) {
  if (item.kind === 'tenant') return Building2;
  if (item.href === '/platform/billing') return CreditCard;
  if (item.href === '/platform/partners') return HelpingHand;
  if (item.href === '/platform/observability') return Activity;
  if (item.href === '/platform/audit') return FileText;
  if (item.href === '/platform/support') return Inbox;
  if (item.href === '/platform/users') return Users;
  if (item.href === '/platform/system') return Settings;
  if (item.href === '/platform/banners') return ImageIcon;
  if (item.href === '/platform/subscriptions') return Repeat;
  if (item.href === '/platform/products') return Package;
  if (item.href === '/platform/finance') return Wallet;
  if (item.href === '/platform/crm') return Target;
  if (item.href === '/platform/marketing') return Megaphone;
  if (item.href === '/platform/content') return FileText;
  if (item.href === '/platform/analytics') return BarChart3;
  if (item.href === '/platform/insights') return TrendingUp;
  if (item.href === '/platform/roles') return Key;
  if (item.href === '/platform/approvals') return Shield;
  if (item.href === '/platform/demo-checklist') return ClipboardList;
  if (item.href === '/platform/email-preview') return Mail;
  if (item.href === '/platform/clients') return Building2;
  return LayoutDashboard;
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function OpsCommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [tenants, setTenants] = useState<TenantHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ('');
      setActive(0);
      setTenants([]);
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const needle = q.trim();
    if (needle.length < 2) {
      setTenants([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          action: 'tenants',
          search: needle,
          limit: '8',
          page: '1',
        });
        const res = await fetch(`/api/platform?${params}`);
        const json = await res.json();
        if (!cancelled) setTenants(json.success ? (json.data?.tenants || []) : []);
      } catch {
        if (!cancelled) setTenants([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q, open]);

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const modules = needle
      ? MODULES.filter((m) => `${m.title} ${m.hint}`.toLowerCase().includes(needle))
      : MODULES;
    const tenantItems: PaletteItem[] = tenants.map((t) => ({
      id: `tenant-${t.id}`,
      kind: 'tenant',
      href: `/platform/tenants/${t.id}`,
      title: t.name || t.slug || 'Tenant',
      hint: `/${t.slug || '—'} · ${t.status || '—'} · ${t.subscription_plan || '—'}`,
    }));
    return [...modules, ...tenantItems];
  }, [q, tenants]);

  useEffect(() => {
    setActive(0);
  }, [items.length, q]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(items.length - 1, i + 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = items[active];
        if (item) {
          onClose();
          router.push(item.href);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, active, onClose, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Cari Admin Total">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Tutup pencarian"
        onClick={onClose}
      />
      <div className="relative mx-auto mt-[12vh] w-full max-w-lg px-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="relative border-b border-slate-100">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari modul atau klien…"
              className="w-full bg-transparent py-3.5 pl-11 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              aria-label="Cari modul atau klien"
            />
            {searching ? (
              <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            ) : (
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                esc
              </kbd>
            )}
          </div>
          <ul className="max-h-[min(24rem,50vh)] overflow-y-auto py-1">
            {items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-500">
                Tidak ada hasil untuk “{q.trim()}”
              </li>
            )}
            {items.map((item, idx) => {
              const Icon = iconFor(item);
              const selected = idx === active;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => {
                      onClose();
                      router.push(item.href);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                      selected ? 'bg-emerald-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      selected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{item.title}</span>
                      <span className="block truncate text-[11px] text-slate-500">{item.hint}</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      {item.kind === 'tenant' ? 'Klien' : 'Modul'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
            ↑↓ pilih · Enter buka · Esc tutup
          </p>
        </div>
      </div>
    </div>
  );
}
