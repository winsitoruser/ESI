import React from 'react';
import { MapPin, Loader2 } from 'lucide-react';

/** Enterprise design tokens — Humanify Employee Portal */
export const EP = {
  accent: 'from-violet-600 to-indigo-600',
  accentSolid: 'bg-violet-600',
  surface: 'bg-white',
  muted: 'text-slate-500',
  border: 'border-slate-200/80',
  shadow: 'shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.04)]',
  shadowLg: 'shadow-[0_4px_24px_rgba(15,23,42,0.08)]',
  radius: 'rounded-2xl',
  radiusLg: 'rounded-3xl',
} as const;

export function PortalLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c0f1a]">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-xl animate-pulse" />
        <Loader2 className="relative w-10 h-10 text-violet-400 animate-spin" />
      </div>
      <p className="mt-5 text-sm font-medium text-slate-400 tracking-wide">Memuat Portal Karyawan</p>
    </div>
  );
}

export function Card({ children, className = '', variant = 'default' }: {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'accent';
}) {
  const variants = {
    default: `${EP.surface} ${EP.border} border ${EP.shadow}`,
    elevated: `${EP.surface} border border-slate-100 ${EP.shadowLg}`,
    accent: 'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white border border-white/10 shadow-xl shadow-indigo-950/20',
  };
  return (
    <div className={`${EP.radiusLg} overflow-hidden ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3.5">
      <div className="min-w-0">
        <h3 className="font-semibold text-slate-900 text-sm tracking-tight">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    approved: { bg: 'bg-emerald-50 ring-emerald-500/20', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Disetujui' },
    pending: { bg: 'bg-amber-50 ring-amber-500/20', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Menunggu' },
    rejected: { bg: 'bg-rose-50 ring-rose-500/20', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Ditolak' },
    completed: { bg: 'bg-sky-50 ring-sky-500/20', text: 'text-sky-700', dot: 'bg-sky-500', label: 'Selesai' },
    reimbursed: { bg: 'bg-emerald-50 ring-emerald-500/20', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Dibayar' },
    present: { bg: 'bg-emerald-50 ring-emerald-500/20', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Hadir' },
    late: { bg: 'bg-amber-50 ring-amber-500/20', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Terlambat' },
  };
  const s = map[status] || { bg: 'bg-slate-50 ring-slate-500/10', text: 'text-slate-600', dot: 'bg-slate-400', label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ring-1 ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function GeofenceBadge({ name, status, distance }: {
  name?: string | null;
  status?: string | null;
  distance?: number | null;
}) {
  if (!name && (!status || status === 'unknown')) return null;
  const inside = status === 'inside';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
      inside ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20' : 'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20'
    }`}>
      <MapPin className="w-3 h-3 flex-shrink-0" />
      {inside ? `Dalam geofence · ${name}` : name ? `Luar ${distance ?? '?'}m · ${name}` : 'Geofence tidak dikonfigurasi'}
    </span>
  );
}

export function StatTile({ label, value, sub, accent }: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
}) {
  const accents = {
    emerald: 'from-emerald-500/10 to-teal-500/5 border-emerald-200/60 text-emerald-700',
    amber: 'from-amber-500/10 to-orange-500/5 border-amber-200/60 text-amber-700',
    rose: 'from-rose-500/10 to-pink-500/5 border-rose-200/60 text-rose-700',
    sky: 'from-sky-500/10 to-blue-500/5 border-sky-200/60 text-sky-700',
    violet: 'from-violet-500/10 to-indigo-500/5 border-violet-200/60 text-violet-700',
  };
  const a = accent ? accents[accent] : 'from-slate-500/5 to-slate-500/0 border-slate-200/60 text-slate-700';
  return (
    <div className={`rounded-xl bg-gradient-to-br border p-3 ${a}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-0.5">{value}</p>
      {sub && <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}

export function QuickAction({ icon: Icon, label, gradient, onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2 p-2 rounded-2xl active:scale-95 transition-all duration-200"
    >
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shadow-slate-900/10 group-hover:scale-105 transition-transform ring-1 ring-white/20`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-[10px] font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>
    </button>
  );
}

export function EnterpriseHero({
  greeting,
  userName,
  userPosition,
  userBranch,
  userDept,
  initials,
}: {
  greeting: { text: string; icon: React.ReactNode };
  userName: string;
  userPosition: string;
  userBranch: string;
  userDept: string;
  initials: string;
}) {
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <Card variant="accent" className="p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-60" />
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-12 -left-8 w-36 h-36 bg-indigo-400/15 rounded-full blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/40 to-indigo-600/30 border border-white/20 flex items-center justify-center text-base font-bold flex-shrink-0 backdrop-blur-sm shadow-inner">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-violet-200/90 text-xs mb-1">
                {greeting.icon}
                <span className="font-medium">{greeting.text}</span>
              </div>
              <h2 className="text-xl font-bold leading-tight truncate tracking-tight">{userName}</h2>
              <p className="text-xs text-slate-300/90 truncate mt-0.5">{userPosition}</p>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mb-3 capitalize">{today}</p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/8 text-[11px] font-medium border border-white/10 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {userBranch}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/8 text-[11px] font-medium border border-white/10 backdrop-blur-sm">
            {userDept}
          </span>
        </div>
      </div>
    </Card>
  );
}
