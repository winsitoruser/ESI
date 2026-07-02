import React, { useState, useEffect, useCallback } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { PageGuard } from '../../../components/permissions';
import {
  History, Search, Filter, Download, Eye, User, Building2, Calendar,
  Clock, Shield, AlertTriangle, FileText, Package, DollarSign, Settings,
  Trash2, Edit, Plus, Lock, Unlock, RefreshCw, ChevronDown, BarChart3,
  Activity, TrendingUp, Users, X, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';

interface AuditLog {
  id: string; userId: string; userName: string; userRole: string;
  action: string; resource: string; resourceId: string; resourceName: string;
  details: Record<string, any>; oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null; isHqIntervention: boolean;
  targetBranchName: string | null; ipAddress: string; userAgent: string; createdAt: string;
}

interface Stats {
  total: number; today: number; thisWeek: number; activeUsers: number;
  byAction: { action: string; count: number; label: string; color: string }[];
  byEntity: { entity_type: string; count: number; label: string }[];
  byUser: { user_id: number; user_name: string; role: string; count: number }[];
  dailyTrend: { date: string; count: number }[];
}

interface FilterOptions {
  actions: { value: string; label: string }[];
  entities: { value: string; label: string }[];
  users: { value: string; label: string }[];
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800', UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800', LOGIN: 'bg-purple-100 text-purple-800',
  LOGOUT: 'bg-gray-100 text-gray-800', APPROVE: 'bg-emerald-100 text-emerald-800',
  REJECT: 'bg-orange-100 text-orange-800', LOCK: 'bg-yellow-100 text-yellow-800',
  UNLOCK: 'bg-cyan-100 text-cyan-800', EXPORT: 'bg-indigo-100 text-indigo-800',
  IMPORT: 'bg-teal-100 text-teal-800', VOID: 'bg-red-100 text-red-800',
  CONVERT: 'bg-violet-100 text-violet-800',
};

const actionIcons: Record<string, React.ReactNode> = {
  CREATE: <Plus className="w-3 h-3" />, UPDATE: <Edit className="w-3 h-3" />,
  DELETE: <Trash2 className="w-3 h-3" />, LOGIN: <User className="w-3 h-3" />,
  LOGOUT: <User className="w-3 h-3" />, APPROVE: <Shield className="w-3 h-3" />,
  REJECT: <AlertTriangle className="w-3 h-3" />, LOCK: <Lock className="w-3 h-3" />,
  UNLOCK: <Unlock className="w-3 h-3" />, EXPORT: <Download className="w-3 h-3" />,
  IMPORT: <FileText className="w-3 h-3" />, VOID: <X className="w-3 h-3" />,
};

const barColors = ['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-orange-500', 'bg-pink-500'];

const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'al1', userId: '1', userName: 'Admin HQ', userRole: 'super_admin', action: 'UPDATE', resource: 'branch', resourceId: 'b1', resourceName: 'Cabang Jakarta', details: { field: 'status', from: 'inactive', to: 'active' }, oldValues: { status: 'inactive' }, newValues: { status: 'active' }, isHqIntervention: true, targetBranchName: 'Cabang Jakarta', ipAddress: '192.168.1.10', userAgent: 'Mozilla/5.0', createdAt: '2026-03-15T08:30:00Z' },
  { id: 'al2', userId: '2', userName: 'Budi Santoso', userRole: 'branch_manager', action: 'CREATE', resource: 'transaction', resourceId: 'txn-501', resourceName: 'POS Transaction #501', details: { amount: 250000 }, oldValues: null, newValues: { amount: 250000, status: 'completed' }, isHqIntervention: false, targetBranchName: 'Cabang Bandung', ipAddress: '192.168.2.15', userAgent: 'Mozilla/5.0', createdAt: '2026-03-15T09:15:00Z' },
  { id: 'al3', userId: '1', userName: 'Admin HQ', userRole: 'super_admin', action: 'DELETE', resource: 'product', resourceId: 'prod-88', resourceName: 'Produk Discontinue', details: { reason: 'discontinued' }, oldValues: { name: 'Produk Discontinue' }, newValues: null, isHqIntervention: true, targetBranchName: null, ipAddress: '192.168.1.10', userAgent: 'Mozilla/5.0', createdAt: '2026-03-14T16:45:00Z' },
  { id: 'al4', userId: '3', userName: 'Siti Rahayu', userRole: 'finance', action: 'APPROVE', resource: 'expense', resourceId: 'exp-22', resourceName: 'Klaim Transport', details: { amount: 1200000 }, oldValues: { status: 'pending' }, newValues: { status: 'approved' }, isHqIntervention: false, targetBranchName: null, ipAddress: '192.168.1.25', userAgent: 'Mozilla/5.0', createdAt: '2026-03-14T14:20:00Z' },
];
const MOCK_AUDIT_STATS: Stats = { total: 1250, today: 45, thisWeek: 280, activeUsers: 18, byAction: [{ action: 'UPDATE', count: 520, label: 'Update', color: 'bg-blue-500' }, { action: 'CREATE', count: 380, label: 'Create', color: 'bg-green-500' }, { action: 'DELETE', count: 85, label: 'Delete', color: 'bg-red-500' }, { action: 'LOGIN', count: 180, label: 'Login', color: 'bg-purple-500' }], byEntity: [{ entity_type: 'transaction', count: 420, label: 'Transaksi' }, { entity_type: 'product', count: 280, label: 'Produk' }, { entity_type: 'employee', count: 150, label: 'Karyawan' }], byUser: [{ user_id: 1, user_name: 'Admin HQ', role: 'super_admin', count: 380 }, { user_id: 2, user_name: 'Budi Santoso', role: 'branch_manager', count: 220 }], dailyTrend: [{ date: '2026-03-09', count: 38 }, { date: '2026-03-10', count: 42 }, { date: '2026-03-11', count: 35 }, { date: '2026-03-12', count: 48 }, { date: '2026-03-13', count: 40 }, { date: '2026-03-14', count: 52 }, { date: '2026-03-15', count: 45 }] };

export default function AuditLogViewer() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<'logs' | 'analytics'>('logs');

  // Log list state
  const [logs, setLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(MOCK_AUDIT_LOGS.length);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ actions: [{ value: 'CREATE', label: 'Create' }, { value: 'UPDATE', label: 'Update' }, { value: 'DELETE', label: 'Delete' }], entities: [{ value: 'transaction', label: 'Transaksi' }, { value: 'product', label: 'Produk' }], users: [{ value: '1', label: 'Admin HQ' }, { value: '2', label: 'Budi Santoso' }] });

  // Stats
  const [stats, setStats] = useState<Stats | null>(MOCK_AUDIT_STATS);
  const [statsPeriod, setStatsPeriod] = useState('30');

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const api = useCallback(async (actionParam: string, extra = '') => {
    try {
      const r = await fetch(`/api/hq/audit-logs?action=${actionParam}${extra}`);
      return r.ok ? await r.json() : { success: false };
    } catch { return { success: false }; }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    if (filterAction !== 'all') params.set('filterAction', filterAction);
    if (filterEntity !== 'all') params.set('filterEntity', filterEntity);
    if (filterUser !== 'all') params.set('filterUser', filterUser);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (search) params.set('search', search);

    const r = await api('list', `&${params}`);
    if (r.success) {
      setLogs(r.logs || []);
      setTotal(r.total || 0);
      setTotalPages(r.totalPages || 0);
    } else {
      setLogs(MOCK_AUDIT_LOGS);
      setTotal(MOCK_AUDIT_LOGS.length);
      setTotalPages(1);
    }
    setLoading(false);
  }, [page, pageSize, filterAction, filterEntity, filterUser, dateFrom, dateTo, search, api]);

  const fetchStats = useCallback(async () => {
    const r = await api('stats', `&period=${statsPeriod}`);
    if (r.success) setStats(r.data);
    else setStats(MOCK_AUDIT_STATS);
  }, [statsPeriod, api]);

  const fetchFilters = useCallback(async () => {
    const r = await api('filters');
    if (r.success) setFilterOptions(r.data);
  }, [api]);

  useEffect(() => { setMounted(true); fetchFilters(); }, []);
  useEffect(() => { if (mounted) fetchLogs(); }, [mounted, page, filterAction, filterEntity, filterUser, dateFrom, dateTo]);
  useEffect(() => { if (mounted && tab === 'analytics') fetchStats(); }, [mounted, tab, statsPeriod]);

  const handleSearch = () => { setPage(1); fetchLogs(); };
  const handleExport = () => {
    const params = new URLSearchParams();
    if (filterAction !== 'all') params.set('filterAction', filterAction);
    if (filterEntity !== 'all') params.set('filterEntity', filterEntity);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    window.open(`/api/hq/audit-logs?action=export&${params}`, '_blank');
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const timeSince = (d: string) => {
    if (!d) return '-';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dd = Math.floor(diff / 86400000);
    if (m < 1) return 'Baru saja';
    if (m < 60) return `${m}m lalu`;
    if (h < 24) return `${h}j lalu`;
    return `${dd}h lalu`;
  };
  const initials = (name: string) => (name || 'S').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (!mounted) return null;

  const maxTrend = stats?.dailyTrend ? Math.max(...stats.dailyTrend.map(d => d.count), 1) : 1;
  const maxAction = stats?.byAction ? Math.max(...stats.byAction.map(a => a.count), 1) : 1;
  const maxEntity = stats?.byEntity ? Math.max(...stats.byEntity.map(e => e.count), 1) : 1;

  return (
    <PageGuard
      anyPermission={['audit.view', 'audit.*']}
      title="Audit Logs"
      description="Riwayat aktivitas sistem & intervensi HQ (data sensitif)."
    >
    <HQLayout title={t('auditLogs.title')} subtitle={t('auditLogs.subtitle')}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setTab('logs')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'logs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <History className="w-4 h-4 inline mr-1.5" />{t('auditLogs.activityLog')}
            </button>
            <button onClick={() => setTab('analytics')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <BarChart3 className="w-4 h-4 inline mr-1.5" />{t('auditLogs.analytics')}
            </button>
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <Download className="w-4 h-4" /> {t('auditLogs.exportExcel')}
          </button>
        </div>

        {tab === 'logs' && (<>
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder={t('auditLogs.searchPlaceholder')} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="all">{t('auditLogs.allActions')}</option>
                {filterOptions.actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
              <select value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="all">{t('auditLogs.allEntities')}</option>
                {filterOptions.entities.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
              <select value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="all">{t('auditLogs.allUsers')}</option>
                {filterOptions.users.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <span className="text-gray-400 text-xs">s/d</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <button onClick={() => { setPage(1); fetchLogs(); }} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('auditLogs.totalLogs'), value: total, icon: History, color: 'blue' },
              { label: t('auditLogs.page'), value: `${page}/${totalPages || 1}`, icon: FileText, color: 'gray' },
              { label: t('auditLogs.deletions'), value: logs.filter(l => l.action === 'DELETE').length, icon: Trash2, color: 'red' },
              { label: t('auditLogs.hqActions'), value: logs.filter(l => l.isHqIntervention).length, icon: Shield, color: 'purple' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
                <div><p className="text-xs text-gray-500">{s.label}</p><p className={`text-xl font-bold text-${s.color}-600`}>{s.value}</p></div>
                <div className={`p-2.5 bg-${s.color}-100 rounded-xl`}><s.icon className={`w-5 h-5 text-${s.color}-600`} /></div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /> {t('auditLogs.loading')}</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-20 text-gray-400"><History className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>{t('auditLogs.noLogs')}</p></div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b">
                  {[t('auditLogs.time'), t('auditLogs.user'), t('auditLogs.action'), t('auditLogs.entity'), t('auditLogs.detail'), 'IP', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/70 cursor-pointer transition-colors" onClick={() => setSelectedLog(log)}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{timeSince(log.createdAt)}</div>
                        <div className="text-[11px] text-gray-400">{formatDate(log.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">{initials(log.userName)}</div>
                          <div><div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{log.userName}</div><div className="text-[10px] text-gray-400">{log.userRole}</div></div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                          {actionIcons[log.action]} {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{log.resourceName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{log.resource} #{log.resourceId}</div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {log.oldValues || log.newValues ? (
                          <div className="text-[11px] text-gray-500 truncate">
                            {log.oldValues && <span className="text-red-500 line-through mr-1">{JSON.stringify(log.oldValues).substring(0, 40)}</span>}
                            {log.newValues && <span className="text-green-600">{JSON.stringify(log.newValues).substring(0, 40)}</span>}
                          </div>
                        ) : <span className="text-gray-300 text-xs">-</span>}
                      </td>
                      <td className="px-4 py-3"><span className="text-[11px] text-gray-400 font-mono">{log.ipAddress}</span></td>
                      <td className="px-4 py-3"><Eye className="w-4 h-4 text-gray-300 hover:text-blue-500" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <span className="text-xs text-gray-500">{t('auditLogs.showing')} {(page-1)*pageSize+1}-{Math.min(page*pageSize, total)} {t('auditLogs.of')} {total}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const pg = start + i;
                    return pg <= totalPages ? (
                      <button key={pg} onClick={() => setPage(pg)} className={`w-8 h-8 rounded text-xs font-medium ${pg === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-600'}`}>{pg}</button>
                    ) : null;
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        </>)}

        {tab === 'analytics' && (<>
          {/* Period selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Periode:</span>
            {[{ v: '7', l: '7 Hari' }, { v: '30', l: '30 Hari' }, { v: '90', l: '90 Hari' }].map(p => (
              <button key={p.v} onClick={() => setStatsPeriod(p.v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statsPeriod === p.v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p.l}</button>
            ))}
          </div>

          {!stats ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" /> Memuat analitik...</div>
          ) : (<>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Aktivitas', value: stats.total, icon: Activity, color: 'blue', bg: 'bg-blue-100' },
                { label: 'Hari Ini', value: stats.today, icon: Clock, color: 'green', bg: 'bg-green-100' },
                { label: 'Minggu Ini', value: stats.thisWeek, icon: TrendingUp, color: 'amber', bg: 'bg-amber-100' },
                { label: 'User Aktif', value: stats.activeUsers, icon: Users, color: 'purple', bg: 'bg-purple-100' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border p-5 flex items-center justify-between">
                  <div><p className="text-xs text-gray-500 mb-1">{s.label}</p><p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</p></div>
                  <div className={`p-3 ${s.bg} rounded-xl`}><s.icon className={`w-6 h-6 text-${s.color}-600`} /></div>
                </div>
              ))}
            </div>

            {/* Daily trend chart */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Tren Harian</h3>
              <div className="flex items-end gap-1 h-40">
                {stats.dailyTrend.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count} aktivitas`}>
                    <span className="text-[9px] text-gray-400">{d.count}</span>
                    <div className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600" style={{ height: `${Math.max(4, (d.count / maxTrend) * 120)}px` }} />
                    <span className="text-[8px] text-gray-400 truncate w-full text-center">{String(d.date).slice(5)}</span>
                  </div>
                ))}
                {stats.dailyTrend.length === 0 && <div className="flex-1 text-center text-gray-300 text-sm py-10">Belum ada data</div>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* By Action */}
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Berdasarkan Aksi</h3>
                <div className="space-y-3">
                  {stats.byAction.map((a, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium w-20 justify-center ${actionColors[a.action] || 'bg-gray-100 text-gray-700'}`}>{a.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden"><div className={`h-full ${barColors[i % barColors.length]} rounded-full transition-all`} style={{ width: `${(a.count / maxAction) * 100}%` }} /></div>
                      <span className="text-xs font-semibold text-gray-700 w-10 text-right">{a.count}</span>
                    </div>
                  ))}
                  {stats.byAction.length === 0 && <p className="text-gray-300 text-sm text-center py-4">Belum ada data</p>}
                </div>
              </div>

              {/* By Entity */}
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Berdasarkan Entity</h3>
                <div className="space-y-3">
                  {stats.byEntity.map((e, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-24 truncate" title={e.label}>{e.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden"><div className={`h-full ${barColors[i % barColors.length]} rounded-full transition-all`} style={{ width: `${(e.count / maxEntity) * 100}%` }} /></div>
                      <span className="text-xs font-semibold text-gray-700 w-10 text-right">{e.count}</span>
                    </div>
                  ))}
                  {stats.byEntity.length === 0 && <p className="text-gray-300 text-sm text-center py-4">Belum ada data</p>}
                </div>
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">User Paling Aktif</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.byUser.map((u, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">{initials(u.user_name)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{u.user_name}</div>
                      <div className="text-[10px] text-gray-400">{u.role || 'staff'}</div>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{u.count}</span>
                  </div>
                ))}
                {stats.byUser.length === 0 && <p className="text-gray-300 text-sm text-center py-4 col-span-3">Belum ada data</p>}
              </div>
            </div>
          </>)}
        </>)}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Detail Audit Log</h2>
              <button onClick={() => setSelectedLog(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Header */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">{initials(selectedLog.userName)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{selectedLog.userName}</h3>
                    <span className="px-2 py-0.5 bg-gray-200 rounded text-[10px]">{selectedLog.userRole}</span>
                    {selectedLog.isHqIntervention && <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-medium"><Shield className="w-3 h-3" /> HQ</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${actionColors[selectedLog.action] || 'bg-gray-100'}`}>
                  {actionIcons[selectedLog.action]} {selectedLog.action}
                </span>
              </div>

              {/* Resource */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">Entity</h4>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="p-2 bg-gray-100 rounded-lg"><FileText className="w-4 h-4 text-gray-500" /></div>
                  <div><p className="font-medium text-gray-900 text-sm">{selectedLog.resourceName}</p><p className="text-xs text-gray-400">{selectedLog.resource} • ID: {selectedLog.resourceId}</p></div>
                </div>
              </div>

              {selectedLog.targetBranchName && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Building2 className="w-4 h-4 text-blue-600" /><span className="text-sm font-medium text-blue-800">{selectedLog.targetBranchName}</span>
                </div>
              )}

              {/* Changes */}
              {(selectedLog.oldValues || selectedLog.newValues) && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Perubahan Data</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedLog.oldValues && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-[10px] font-medium text-red-600 mb-1.5">Sebelum</p>
                        <pre className="text-[11px] text-red-800 overflow-auto max-h-40 whitespace-pre-wrap">{JSON.stringify(selectedLog.oldValues, null, 2)}</pre>
                      </div>
                    )}
                    {selectedLog.newValues && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-[10px] font-medium text-green-600 mb-1.5">Sesudah</p>
                        <pre className="text-[11px] text-green-800 overflow-auto max-h-40 whitespace-pre-wrap">{JSON.stringify(selectedLog.newValues, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Technical */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">Detail Teknis</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-gray-100"><span className="text-gray-500">IP Address</span><span className="font-mono text-gray-900">{selectedLog.ipAddress || '-'}</span></div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100"><span className="text-gray-500">User Agent</span><span className="text-gray-900 truncate max-w-xs text-xs" title={selectedLog.userAgent || '-'}>{(selectedLog.userAgent || '-').substring(0, 50)}{(selectedLog.userAgent?.length || 0) > 50 ? '...' : ''}</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-500">Log ID</span><span className="font-mono text-gray-900">{selectedLog.id}</span></div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setSelectedLog(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </HQLayout>
    </PageGuard>
  );
}
