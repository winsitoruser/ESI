import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import {
  Activity, RefreshCw, Filter, UserPlus, Target, DollarSign, Calendar,
  Award, Clock, ChevronRight, Search, Bell, Loader2, FileText, Users,
} from 'lucide-react';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  detail?: string;
  time: string;
  actor?: string;
  source?: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Activity; color: string; badge: string; label: string }> = {
  employee_joined: { icon: UserPlus, color: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Karyawan' },
  leave_request: { icon: Calendar, color: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Cuti' },
  kpi_update: { icon: Target, color: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200', label: 'KPI' },
  kpi_assigned: { icon: Target, color: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200', label: 'KPI' },
  payroll: { icon: DollarSign, color: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Payroll' },
  performance_review: { icon: Award, color: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Kinerja' },
  performance: { icon: Award, color: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Kinerja' },
  attendance: { icon: Clock, color: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700 border-teal-200', label: 'Absensi' },
  training: { icon: Award, color: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Training' },
  announcement: { icon: Bell, color: 'bg-fuchsia-500', badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', label: 'Pengumuman' },
};

const SOURCE_LABEL: Record<string, string> = {
  log: 'Log HRIS', employees: 'Data Karyawan', leave: 'Cuti', payroll: 'Payroll', kpi: 'KPI',
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'Semua' },
  { key: 'employee_joined', label: 'Karyawan' },
  { key: 'leave_request', label: 'Cuti' },
  { key: 'kpi_assigned', label: 'KPI' },
  { key: 'performance_review', label: 'Kinerja' },
  { key: 'attendance', label: 'Absensi' },
  { key: 'payroll', label: 'Payroll' },
];

function fmtTime(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateFull(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return 'baru saja';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} hari lalu`;
  return '';
}

function dateGroupLabel(dateStr: string) {
  if (!dateStr) return 'Tanpa tanggal';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Tanpa tanggal';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diffDays === 0) return 'Hari Ini';
  if (diffDays === 1) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function groupByDate(items: ActivityItem[]) {
  const groups: { label: string; sortKey: number; items: ActivityItem[] }[] = [];
  const map = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const label = dateGroupLabel(item.time);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  for (const [label, groupItems] of map) {
    const sortKey = groupItems[0]?.time ? new Date(groupItems[0].time).getTime() : 0;
    groups.push({ label, sortKey, items: groupItems });
  }
  return groups.sort((a, b) => b.sortKey - a.sortKey);
}

const USE_MOCK_UI = process.env.NODE_ENV !== 'production';

export default function HRISActivitiesPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>(USE_MOCK_UI ? 'demo' : 'empty');
  const [summary, setSummary] = useState<{ total: number; byType: Record<string, number>; showing: number }>({ total: 0, byType: {}, showing: 0 });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const res = await fetch(`/api/humanify/activities?${params}`);
      const json = await res.json();
      if (json.success) {
        setActivities(json.data || []);
        if (json.summary) setSummary(json.summary);
        if (json.meta?.isMock && USE_MOCK_UI) setDataSource('demo');
        else if (json.data?.length) setDataSource('live');
        else setDataSource('empty');
      }
    } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchActivities(); }, [typeFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return activities;
    const s = search.toLowerCase();
    return activities.filter(a =>
      a.title?.toLowerCase().includes(s) ||
      a.detail?.toLowerCase().includes(s) ||
      a.actor?.toLowerCase().includes(s)
    );
  }, [activities, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const statCards = [
    { label: 'Total Log', value: summary.total || activities.length, icon: Activity, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'KPI', value: (summary.byType?.kpi_assigned || 0) + (summary.byType?.kpi_update || 0), icon: Target, color: 'text-purple-600 bg-purple-50' },
    { label: 'Cuti', value: summary.byType?.leave_request || 0, icon: Calendar, color: 'text-amber-600 bg-amber-50' },
    { label: 'Kinerja', value: summary.byType?.performance_review || 0, icon: Award, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Absensi', value: summary.byType?.attendance || 0, icon: Clock, color: 'text-teal-600 bg-teal-50' },
    { label: 'Payroll', value: summary.byType?.payroll || 0, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <HQLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-600" />
              Aktivitas HRIS
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Timeline presisi aktivitas kepegawaian — KPI, cuti, kinerja, absensi & payroll
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DataSourceBadge source={dataSource} />
            <span className="text-xs text-gray-400 hidden sm:inline">
              Menampilkan {filtered.length} dari {summary.total || activities.length} log
            </span>
            <button onClick={fetchActivities} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((s, i) => (
            <div key={i} className="bg-white border rounded-xl p-3.5">
              <div className={`inline-flex p-1.5 rounded-lg ${s.color} mb-1.5`}>
                <s.icon className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search & filter */}
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari judul, detail, atau aktor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {FILTER_OPTIONS.map(f => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  typeFilter === f.key
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="bg-white border rounded-xl p-16 flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm">Memuat aktivitas...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border rounded-xl p-16 text-center text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="font-medium text-gray-500">Tidak ada aktivitas ditemukan</p>
            <p className="text-sm mt-1">Coba ubah filter atau kata kunci pencarian</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(group => (
              <div key={group.label}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 whitespace-nowrap">
                    {group.label}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* Items */}
                <div className="bg-white border rounded-xl overflow-hidden">
                  {group.items.map((a, idx) => {
                    const cfg = TYPE_CONFIG[a.type] || {
                      icon: FileText, color: 'bg-gray-400',
                      badge: 'bg-gray-50 text-gray-600 border-gray-200', label: a.type,
                    };
                    const Icon = cfg.icon;
                    const isLast = idx === group.items.length - 1;
                    const rel = timeAgo(a.time);

                    return (
                      <div
                        key={a.id}
                        className={`flex gap-0 hover:bg-gray-50/80 transition-colors ${!isLast ? 'border-b border-gray-100' : ''}`}
                      >
                        {/* Time column */}
                        <div className="w-[72px] flex-shrink-0 py-4 pl-4 pr-2 text-right">
                          <p className="text-sm font-mono font-semibold text-gray-800 tabular-nums leading-none">
                            {fmtTime(a.time)}
                          </p>
                          {rel && (
                            <p className="text-[10px] text-gray-400 mt-1 leading-tight">{rel}</p>
                          )}
                        </div>

                        {/* Timeline spine */}
                        <div className="flex flex-col items-center w-8 flex-shrink-0 pt-4">
                          <div className={`w-3 h-3 rounded-full ring-4 ring-white ${cfg.color} z-10`} />
                          {!isLast && <div className="w-px flex-1 bg-gray-200 -mt-0.5" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 py-3.5 pr-4 pb-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.badge}`}>
                                  <Icon className="w-3 h-3" />
                                  {cfg.label}
                                </span>
                                {a.source && (
                                  <span className="text-[10px] text-gray-400">
                                    {SOURCE_LABEL[a.source] || a.source}
                                  </span>
                                )}
                              </div>
                              <p className="font-semibold text-gray-900 text-sm leading-snug">{a.title}</p>
                              {a.detail && (
                                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{a.detail}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {a.actor && a.actor !== 'Sistem' && a.actor !== 'HR System' && a.actor !== 'System' && (
                                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                    <Users className="w-3 h-3" />
                                    {a.actor}
                                  </span>
                                )}
                                <span className="text-xs text-gray-300 hidden sm:inline">
                                  {fmtDateFull(a.time)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer nav */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
          <Link href="/humanify/reports" className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Lihat Laporan HRIS <ChevronRight className="w-4 h-4" />
          </Link>
          <span className="text-gray-200">|</span>
          <Link href="/humanify" className="text-sm text-gray-500 hover:text-gray-700">
            Kembali ke Dasbor HRIS
          </Link>
        </div>
      </div>
    </HQLayout>
  );
}
