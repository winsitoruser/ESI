import React, { useState, useCallback } from 'react';
import {
  Search, Plus, Filter, ChevronLeft, ChevronRight, Eye, Trash2,
  Loader2, Star, XCircle, X, CheckCircle, Clock, AlertTriangle,
  ArrowUpRight, ArrowDownRight, FileText, Download, Printer
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ============================================================
// TYPES
// ============================================================
export type TabType =
  | 'dashboard' | 'vendors' | 'rfqs' | 'tenders' | 'procurement-requests'
  | 'purchase-orders' | 'goods-receipts' | 'invoices'
  | 'contracts' | 'evaluations' | 'approvals' | 'budget'
  | 'analytics' | 'audit-trail' | 'settings';

export interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

export interface StatusOption {
  v: string;
  l: string;
}

// ============================================================
// FORMATTERS
// ============================================================
export const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export const fmtShort = (n: number) => {
  if (n >= 1e12) return `Rp ${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)}M`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)}Jt`;
  return fmt(n);
};

export const fD = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export const fDT = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

export const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

// ============================================================
// STATUS COLORS
// ============================================================
export const SC: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  inactive: 'bg-gray-50 text-gray-600 ring-1 ring-gray-500/20',
  blacklisted: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
  pending_approval: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  draft: 'bg-slate-50 text-slate-600 ring-1 ring-slate-500/20',
  published: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
  closed: 'bg-gray-100 text-gray-600 ring-1 ring-gray-500/20',
  awarded: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  cancelled: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
  submitted: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  rejected: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
  in_process: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  fulfilled: 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/20',
  expired: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
  terminated: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
  renewed: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
  announcement: 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20',
  registration: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20',
  submission: 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20',
  evaluation: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  negotiation: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20',
  completed: 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/20',
  sent: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
  partial_received: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20',
  confirmed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  overdue: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
  matched: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  unmatched: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  partial_match: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20',
  passed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  failed: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
  low: 'bg-gray-100 text-gray-600 ring-1 ring-gray-300',
  normal: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
  high: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
  urgent: 'bg-red-50 text-red-600 ring-1 ring-red-200',
};

export const GRADIENTS: Record<string, string> = {
  blue: 'from-blue-600 to-blue-400',
  indigo: 'from-indigo-600 to-indigo-400',
  purple: 'from-purple-600 to-violet-400',
  green: 'from-emerald-600 to-emerald-400',
  orange: 'from-orange-500 to-amber-400',
  rose: 'from-rose-600 to-pink-400',
  cyan: 'from-cyan-600 to-cyan-400',
  teal: 'from-teal-600 to-teal-400',
  slate: 'from-slate-600 to-slate-400',
};

// ============================================================
// API HELPER
// ============================================================
export async function eprFetch(action: string, method = 'GET', body?: any, query?: Record<string, string>) {
  const qs = new URLSearchParams({ action, ...(query || {}) }).toString();
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`/api/hq/e-procurement?${qs}`, opts);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'API Error');
  return json.data;
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
export const Badge = ({ value, colors }: { value: string; colors?: Record<string, string> }) => {
  const cls = colors?.[value] || SC[value] || 'bg-gray-100 text-gray-600 ring-1 ring-gray-300';
  const label = (value || '').replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
};

export const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(s => (
      <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
    ))}
    <span className="text-xs font-medium text-gray-600 ml-1.5">{Number(rating).toFixed(1)}</span>
  </div>
);

export const ScoreBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
  <div className="flex items-center gap-3">
    {label && <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>}
    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
    </div>
    <span className="text-xs font-bold text-gray-700 w-8 text-right">{Number(score).toFixed(0)}</span>
  </div>
);

export const GradientStatCard = ({ title, value, sub, icon: Icon, gradient, trend }: any) => (
  <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group">
    <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[gradient] || GRADIENTS.blue}`} />
    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
    <div className="absolute -right-2 -bottom-6 w-32 h-32 bg-white/5 rounded-full" />
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && trend !== null && (
          <div className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5">
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="text-sm text-white/70 mt-1">{title}</p>
      {sub && <p className="text-xs text-white/50 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export const MiniStatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
  <div className="bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export const ProgressBar = ({ value, max, color = 'bg-blue-500', showLabel = true }: { value: number; max: number; color?: string; showLabel?: boolean }) => {
  const p = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${p}%` }} />
      </div>
      {showLabel && <span className="text-xs font-bold text-gray-600 w-10 text-right">{p.toFixed(0)}%</span>}
    </div>
  );
};

// ============================================================
// TOOLBAR — Search, filter, create
// ============================================================
interface ToolbarProps {
  placeholder?: string;
  statuses?: StatusOption[];
  createLabel?: string;
  search: string;
  setSearch: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  onRefresh: () => void;
  onCreateClick: () => void;
  loading?: boolean;
  extraFilters?: React.ReactNode;
}

export const Toolbar = ({
  placeholder = 'Cari...', statuses = [], createLabel = 'Buat Baru',
  search, setSearch, statusFilter, setStatusFilter, onRefresh, onCreateClick, loading, extraFilters
}: ToolbarProps) => (
  <div className="bg-white rounded-2xl border shadow-sm p-4">
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
          placeholder={placeholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {statuses.length > 0 && (
        <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === 'all' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-blue-100' : 'text-gray-500 hover:text-gray-700'}`}
          >Semua</button>
          {statuses.map(s => (
            <button
              key={s.v}
              onClick={() => setStatusFilter(s.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${statusFilter === s.v ? 'bg-white shadow-sm text-blue-600 ring-1 ring-blue-100' : 'text-gray-500 hover:text-gray-700'}`}
            >{s.l}</button>
          ))}
        </div>
      )}
      {extraFilters}
      <button onClick={onRefresh} disabled={loading} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50">
        <Loader2 className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
      </button>
      <button onClick={onCreateClick} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all">
        <Plus className="w-4 h-4" /> {createLabel}
      </button>
    </div>
  </div>
);

// ============================================================
// DATA TABLE — With pagination
// ============================================================
interface DataTableProps {
  columns: Column[];
  data: any[];
  total?: number;
  page?: number;
  limit?: number;
  onPageChange?: (p: number) => void;
  onView?: (row: any) => void;
  onDelete?: (row: any) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export const DataTable = ({
  columns, data, total = 0, page = 1, limit = 20,
  onPageChange, onView, onDelete, loading, emptyMessage = 'Belum ada data'
}: DataTableProps) => {
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50/80">
              {columns.map(c => (
                <th key={c.key} className={`px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${c.className || ''}`}>
                  {c.label}
                </th>
              ))}
              {(onView || onDelete) && (
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={columns.length + 1} className="px-5 py-16 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                <p className="text-sm text-gray-400 mt-2">Memuat data...</p>
              </td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="px-5 py-16 text-center text-gray-400 text-sm">{emptyMessage}</td></tr>
            ) : data.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-blue-50/30 transition-colors group">
                {columns.map(c => (
                  <td key={c.key} className={`px-5 py-3.5 ${c.className || ''}`}>
                    {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '-')}
                  </td>
                ))}
                {(onView || onDelete) && (
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onView && (
                        <button onClick={() => onView(row)} className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors" title="Lihat Detail">
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(row)} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > limit && (
        <div className="px-5 py-3 border-t bg-gray-50/50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Menampilkan {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} dari {total}
          </p>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => onPageChange?.(page - 1)} className="p-1.5 border rounded-lg hover:bg-white disabled:opacity-30 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return (
                <button key={p} onClick={() => onPageChange?.(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${p === page ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white border text-gray-600'}`}>
                  {p}
                </button>
              );
            })}
            <button disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)} className="p-1.5 border rounded-lg hover:bg-white disabled:opacity-30 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// DETAIL DRAWER — Slide-in panel for entity details
// ============================================================
interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  width?: string;
  actions?: React.ReactNode;
}

export const DetailDrawer = ({ open, onClose, title, subtitle, badge, children, width = 'max-w-2xl', actions }: DetailDrawerProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white w-full ${width} h-full shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300`}>
        <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 truncate">{title}</h3>
                {badge && <Badge value={badge} />}
              </div>
              {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {actions}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// CREATE MODAL
// ============================================================
interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  saving?: boolean;
}

export const CreateModal = ({ open, onClose, title, children, onSubmit, saving }: CreateModalProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-400">Isi form di bawah untuk membuat data baru</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(85vh-160px)]">
          {children}
        </div>
        <div className="p-6 border-t bg-gray-50/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all">
            Batal
          </button>
          <button onClick={onSubmit} disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Simpan
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// FORM FIELDS
// ============================================================
export const FormInput = ({ label, required, ...props }: any) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label} {required && '*'}</label>
    <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all" {...props} />
  </div>
);

export const FormTextarea = ({ label, required, ...props }: any) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label} {required && '*'}</label>
    <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all resize-none" {...props} />
  </div>
);

export const FormSelect = ({ label, required, options, ...props }: any) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label} {required && '*'}</label>
    <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all" {...props}>
      {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ============================================================
// APPROVAL FLOW TIMELINE
// ============================================================
export const ApprovalTimeline = ({ steps }: { steps: any[] }) => (
  <div className="space-y-3">
    {steps.map((s: any, i: number) => (
      <div key={s.id || i} className="flex items-start gap-3">
        <div className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            s.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
            s.status === 'rejected' ? 'bg-red-100 text-red-600' :
            s.status === 'pending' ? 'bg-amber-100 text-amber-600' :
            'bg-gray-100 text-gray-400'
          }`}>
            {s.status === 'approved' ? <CheckCircle className="w-4 h-4" /> :
             s.status === 'rejected' ? <XCircle className="w-4 h-4" /> :
             <Clock className="w-4 h-4" />}
          </div>
          {i < steps.length - 1 && <div className="w-0.5 h-8 bg-gray-200 mt-1" />}
        </div>
        <div className="flex-1 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Step {s.step}: {s.approver_role || s.approver_name || 'Approver'}</p>
              <p className="text-xs text-gray-500">{s.approver_name || '-'}</p>
            </div>
            <Badge value={s.status || 'pending'} />
          </div>
          {s.comments && <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded-lg">{s.comments}</p>}
          {s.decided_at && <p className="text-xs text-gray-400 mt-1">{fDT(s.decided_at)}</p>}
        </div>
      </div>
    ))}
  </div>
);

// ============================================================
// AUDIT TRAIL LIST
// ============================================================
export const AuditTrailList = ({ items }: { items: any[] }) => (
  <div className="space-y-2">
    {items.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Belum ada aktivitas</p>}
    {items.map((a: any, i: number) => (
      <div key={a.id || i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          a.action === 'created' ? 'bg-blue-100 text-blue-600' :
          a.action === 'status_change' ? 'bg-amber-100 text-amber-600' :
          a.action === 'approved' ? 'bg-emerald-100 text-emerald-600' :
          'bg-gray-100 text-gray-500'
        }`}>
          <FileText className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">{a.description || a.action}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">{a.performed_by_name || 'System'}</span>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-400">{fDT(a.created_at)}</span>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ============================================================
// SECTION HEADER
// ============================================================
export const SectionHeader = ({ icon: Icon, title, subtitle, color = 'from-blue-500 to-indigo-600', actions }: any) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

// ============================================================
// INFO ROW (for detail views)
// ============================================================
export const InfoRow = ({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) => (
  <div className={`flex items-start justify-between py-2 ${className || ''}`}>
    <span className="text-sm text-gray-500 shrink-0 w-40">{label}</span>
    <span className="text-sm font-medium text-gray-900 text-right">{value || '-'}</span>
  </div>
);

// ============================================================
// EMPTY STATE
// ============================================================
export const EmptyState = ({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-gray-400" />
    </div>
    <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
    {description && <p className="text-sm text-gray-500 mt-1 max-w-sm text-center">{description}</p>}
  </div>
);
