import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'react-hot-toast';
import {
  Ship, Plus, Search, Trash2, BarChart3, TrendingUp,
  FileText, Loader2, DollarSign, Globe, Plane,
  Package, Shield, Building2, Clock, AlertTriangle,
  CreditCard, BookOpen, Anchor, ArrowUpRight, ArrowDownRight,
  Activity, Weight, Box, MapPin, RefreshCw, ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line
} from 'recharts';
import {
  rowsOr,
  MOCK_EXIM_DOCUMENTS,
  MOCK_EXIM_CUSTOMS,
  MOCK_EXIM_LCS,
  MOCK_EXIM_CONTAINERS,
  MOCK_EXIM_PARTNERS,
  MOCK_EXIM_COSTS,
  MOCK_EXIM_HS_CODES,
  MOCK_EXIM_ANALYTICS,
} from '@/lib/hq/mock-data';

type TabType = 'dashboard' | 'shipments' | 'documents' | 'customs' | 'lcs' | 'containers' | 'partners' | 'costs' | 'hs-codes' | 'analytics';

const SC: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', booked: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-yellow-100 text-yellow-700', at_port: 'bg-indigo-100 text-indigo-700',
  customs_clearance: 'bg-orange-100 text-orange-700', delivered: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700', submitted: 'bg-blue-100 text-blue-700',
  cleared: 'bg-green-100 text-green-700', red_lane: 'bg-red-100 text-red-700',
  green_lane: 'bg-green-100 text-green-700', yellow_lane: 'bg-yellow-100 text-yellow-700',
  issued: 'bg-blue-100 text-blue-700', active: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700', paid: 'bg-green-100 text-green-700',
  approved: 'bg-green-100 text-green-700', empty: 'bg-gray-100 text-gray-700',
  loading: 'bg-blue-100 text-blue-700', loaded: 'bg-indigo-100 text-indigo-700',
  verified: 'bg-green-100 text-green-700', applied: 'bg-blue-100 text-blue-700',
  presented: 'bg-purple-100 text-purple-700', accepted: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700', rejected: 'bg-red-100 text-red-700',
  inspecting: 'bg-orange-100 text-orange-700',
};
const STATUS_COLORS: Record<string, string> = {
  draft: '#9CA3AF', booked: '#3B82F6', in_transit: '#F59E0B', at_port: '#6366F1',
  customs_clearance: '#F97316', delivered: '#22C55E', completed: '#10B981', cancelled: '#EF4444',
};
const TRANSPORT_COLORS: Record<string, string> = { sea: '#3B82F6', air: '#8B5CF6', land: '#F59E0B' };
const TRANSPORT_ICONS_KEYS: Record<string, string> = { sea: 'transportSea', air: 'transportAir', land: 'transportLand' };
const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#6366F1', '#EC4899'];

const fmt = (n: number, c = 'IDR') => new Intl.NumberFormat('id-ID', { style: 'currency', currency: c, minimumFractionDigits: 0 }).format(n);
const fmtShort = (n: number) => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n}`;
};
const fmtNum = (n: number) => new Intl.NumberFormat('id-ID').format(n);
const fD = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const Badge = ({ value }: { value: string }) => (<span className={`px-2 py-1 rounded-full text-xs font-medium ${SC[value] || 'bg-gray-100 text-gray-700'}`}>{(value || '').replace(/_/g, ' ')}</span>);
const TBadge = ({ type, t }: { type: string; t: (key: string) => string }) => (<span className={`px-2 py-1 rounded-full text-xs font-bold ${type === 'export' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{type === 'export' ? t('exportImport.exportLabel') : t('exportImport.importLabel')}</span>);

const ChartCard = ({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border p-5 ${className}`}>
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const MiniStatCard = ({ title, value, sub, icon: Icon, color, trend, trendUp }: any) => (
  <div className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1 truncate">{sub}</p>}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-medium">{typeof p.value === 'number' && p.value > 1000 ? fmtShort(p.value) : fmtNum(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function ExportImportPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const MOCK_EI_DASHBOARD = { totalShipments: 48, activeShipments: 12, totalValue: 8500000000, exportValue: 5200000000, importValue: 3300000000, pendingCustoms: 3, byStatus: { draft: 2, booked: 3, in_transit: 5, at_port: 2, customs_clearance: 3, delivered: 28, completed: 5 }, recentShipments: [{ id: 's1', shipmentNumber: 'SHP-2026-048', tradeType: 'export', destination: 'Singapore', status: 'in_transit', totalValue: 450000000 }] };
  const MOCK_EI_SHIPMENTS = [{ id: 's1', shipmentNumber: 'SHP-2026-048', tradeType: 'export', origin: 'Jakarta', destination: 'Singapore', status: 'in_transit', transportMode: 'sea', totalValue: 450000000, departureDate: '2026-03-12', arrivalDate: '2026-03-18' }, { id: 's2', shipmentNumber: 'SHP-2026-047', tradeType: 'import', origin: 'Shanghai', destination: 'Jakarta', status: 'customs_clearance', transportMode: 'sea', totalValue: 680000000, departureDate: '2026-03-05', arrivalDate: '2026-03-15' }];
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(MOCK_EI_DASHBOARD);
  const [shipments, setShipments] = useState<any[]>(MOCK_EI_SHIPMENTS);
  const [documents, setDocuments] = useState<any[]>(MOCK_EXIM_DOCUMENTS);
  const [customsList, setCustomsList] = useState<any[]>(MOCK_EXIM_CUSTOMS);
  const [lcs, setLcs] = useState<any[]>(MOCK_EXIM_LCS);
  const [containers, setContainers] = useState<any[]>(MOCK_EXIM_CONTAINERS);
  const [partners, setPartners] = useState<any[]>(MOCK_EXIM_PARTNERS);
  const [costs, setCosts] = useState<any[]>(MOCK_EXIM_COSTS);
  const [hsCodes, setHsCodes] = useState<any[]>(MOCK_EXIM_HS_CODES);
  const [analyticsData, setAnalyticsData] = useState<any>(MOCK_EXIM_ANALYTICS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tradeTypeFilter, setTradeTypeFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    setMounted(true);
    const tabFromUrl = router.query.tab as string;
    if (tabFromUrl && ['dashboard','shipments','customs','lcs','containers','documents','partners','costs','hs-codes','analytics'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl as TabType);
    }
  }, [router.query.tab]);

  const fetchData = useCallback(async (tab: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: tab === 'dashboard' ? 'dashboard' : tab });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (tradeTypeFilter !== 'all') params.set('tradeType', tradeTypeFilter);
      if (searchTerm) params.set('search', searchTerm);
      const r = await fetch('/api/hq/export-import?' + params);
      const d = await r.json();
      if (!d.success) return;
      switch (tab) {
        case 'dashboard': setDashboard(d.data); break;
        case 'shipments': setShipments(rowsOr(d.data?.rows, MOCK_EI_SHIPMENTS)); break;
        case 'documents': setDocuments(rowsOr(Array.isArray(d.data) ? d.data : [], MOCK_EXIM_DOCUMENTS)); break;
        case 'customs': setCustomsList(rowsOr(d.data?.rows, MOCK_EXIM_CUSTOMS)); break;
        case 'lcs': setLcs(rowsOr(d.data?.rows, MOCK_EXIM_LCS)); break;
        case 'containers': setContainers(rowsOr(Array.isArray(d.data) ? d.data : [], MOCK_EXIM_CONTAINERS)); break;
        case 'partners': setPartners(rowsOr(d.data?.rows, MOCK_EXIM_PARTNERS)); break;
        case 'costs': setCosts(rowsOr(Array.isArray(d.data) ? d.data : [], MOCK_EXIM_COSTS)); break;
        case 'hs-codes': setHsCodes(rowsOr(d.data?.rows, MOCK_EXIM_HS_CODES)); break;
        case 'analytics': setAnalyticsData(d.data && Object.keys(d.data).length ? d.data : MOCK_EXIM_ANALYTICS); break;
      }
    } catch (e: any) {
      console.error(e);
      if (tab === 'dashboard') setDashboard(MOCK_EI_DASHBOARD);
      if (tab === 'shipments') setShipments(MOCK_EI_SHIPMENTS);
      if (tab === 'documents') setDocuments(MOCK_EXIM_DOCUMENTS);
      if (tab === 'customs') setCustomsList(MOCK_EXIM_CUSTOMS);
      if (tab === 'lcs') setLcs(MOCK_EXIM_LCS);
      if (tab === 'containers') setContainers(MOCK_EXIM_CONTAINERS);
      if (tab === 'partners') setPartners(MOCK_EXIM_PARTNERS);
      if (tab === 'costs') setCosts(MOCK_EXIM_COSTS);
      if (tab === 'hs-codes') setHsCodes(MOCK_EXIM_HS_CODES);
      if (tab === 'analytics') setAnalyticsData(MOCK_EXIM_ANALYTICS);
    } finally { setLoading(false); }
  }, [statusFilter, searchTerm, tradeTypeFilter]);

  useEffect(() => { if (mounted) fetchData(activeTab); }, [mounted, activeTab, fetchData]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/hq/export-import?action=${activeTab}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.success) { toast.success(t('exportImport.success')); setShowCreateModal(false); setForm({}); fetchData(activeTab); }
      else toast.error(d.error?.message || t('exportImport.failed'));
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (table: string, id: string) => {
    if (!confirm(t('exportImport.confirmDelete'))) return;
    try { await fetch(`/api/hq/export-import?action=${table}&id=${id}`, { method: 'DELETE' }); toast.success(t('exportImport.deleted')); fetchData(activeTab); } catch (e: any) { toast.error(e.message); }
  };

  // Prepare chart data (must be before any early return to satisfy React hooks rules)
  const statusPieData = useMemo(() => (dashboard?.statusDistribution || []).map((s: any) => ({
    name: (s.status || '').replace(/_/g, ' '),
    value: Number(s.count),
    fill: STATUS_COLORS[s.status] || '#9CA3AF'
  })), [dashboard?.statusDistribution]);

  const transportPieData = useMemo(() => (dashboard?.transportBreakdown || []).map((t: any) => ({
    name: t.transport_mode ? (TRANSPORT_ICONS_KEYS[t.transport_mode] || t.transport_mode) : t.transport_mode,
    value: Number(t.count),
    totalValue: Number(t.value),
    fill: TRANSPORT_COLORS[t.transport_mode] || '#9CA3AF'
  })), [dashboard?.transportBreakdown]);

  const expLabel = t('exportImport.exportLabel');
  const impLabel = t('exportImport.importLabel');
  const transportName = (mode: string) => {
    const key = TRANSPORT_ICONS_KEYS[mode];
    return key ? t(`exportImport.${key}`) : (mode || '-');
  };

  const monthlyChartData = useMemo(() => (dashboard?.monthlyTrend || []).map((m: any) => ({
    month: m.month_label || m.month,
    [expLabel]: Number(m.export_value),
    [impLabel]: Number(m.import_value),
    Total: Number(m.total_value)
  })), [dashboard?.monthlyTrend, expLabel, impLabel]);

  const costBarData = useMemo(() => (dashboard?.costBreakdown || []).map((c: any) => ({
    name: (c.cost_category || '').replace(/_/g, ' '),
    total: Number(c.total),
    count: Number(c.count)
  })), [dashboard?.costBreakdown]);

  const ss = dashboard?.shipmentStats || {};
  const cs = dashboard?.customsStats || {};
  const ls = dashboard?.lcStats || {};
  const cns = dashboard?.containerStats || {};
  const ds = dashboard?.documentStats || {};
  const exportVal = Number(ss.export_value || 0);
  const importVal = Number(ss.import_value || 0);
  const tradeBalance = exportVal - importVal;

  if (!mounted) return null;

  const tabs = [
    { id: 'dashboard', name: t('exportImport.tabDashboard'), icon: BarChart3 }, { id: 'shipments', name: t('exportImport.tabShipments'), icon: Ship },
    { id: 'customs', name: t('exportImport.tabCustoms'), icon: Shield }, { id: 'lcs', name: t('exportImport.tabLc'), icon: CreditCard },
    { id: 'containers', name: t('exportImport.tabContainers'), icon: Package }, { id: 'documents', name: t('exportImport.tabDocuments'), icon: FileText },
    { id: 'partners', name: t('exportImport.tabPartners'), icon: Building2 }, { id: 'costs', name: t('exportImport.tabCosts'), icon: DollarSign },
    { id: 'hs-codes', name: t('exportImport.tabHsCodes'), icon: BookOpen }, { id: 'analytics', name: t('exportImport.tabAnalytics'), icon: TrendingUp },
  ];

  const Toolbar = ({ ph, sts, label, showTT }: { ph: string; sts: { v: string; l: string }[]; label: string; showTT?: boolean }) => (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" placeholder={ph} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchData(activeTab)} /></div>
      {showTT && <select className="border rounded-lg px-3 py-2 text-sm" value={tradeTypeFilter} onChange={e => setTradeTypeFilter(e.target.value)}><option value="all">{t('exportImport.allTypes')}</option><option value="export">{t('exportImport.exportFilter')}</option><option value="import">{t('exportImport.importFilter')}</option></select>}
      {sts.length > 0 && <select className="border rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">{t('exportImport.allStatuses')}</option>{sts.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}</select>}
      <button onClick={() => { setForm({}); setShowCreateModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"><Plus className="w-4 h-4" /> {label}</button>
    </div>
  );

  const DT = ({ cols, data, del }: { cols: { k: string; l: string; r?: (v: any, row: any) => React.ReactNode }[]; data: any[]; del?: string }) => (
    <div className="bg-white rounded-xl shadow-sm border overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{cols.map(c => <th key={c.k} className="px-4 py-3 text-left font-medium text-gray-600">{c.l}</th>)}{del && <th className="px-4 py-3 text-center font-medium text-gray-600">{t('exportImport.colActions')}</th>}</tr></thead><tbody className="divide-y">{data.map((row, i) => (<tr key={row.id || i} className="hover:bg-gray-50">{cols.map(c => <td key={c.k} className="px-4 py-3">{c.r ? c.r(row[c.k], row) : (row[c.k] ?? '-')}</td>)}{del && <td className="px-4 py-3 text-center"><button onClick={() => handleDelete(del, row.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button></td>}</tr>))}{data.length === 0 && <tr><td colSpan={cols.length + (del ? 1 : 0)} className="px-4 py-8 text-center text-gray-500">{t('exportImport.noTableData')}</td></tr>}</tbody></table></div>
  );

  return (
    <HQLayout title={t('exportImport.title')} subtitle={t('exportImport.subtitle')}>
      <div className="bg-white border-b sticky top-0 z-10"><div className="flex overflow-x-auto px-4">{tabs.map(tab => (<button key={tab.id} onClick={() => { setActiveTab(tab.id as TabType); setStatusFilter('all'); setSearchTerm(''); setTradeTypeFilter('all'); router.push({ pathname: router.pathname, query: tab.id === 'dashboard' ? {} : { tab: tab.id } }, undefined, { shallow: true }); }} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><tab.icon className="w-4 h-4" />{tab.name}</button>))}</div></div>

      <div className="p-6 space-y-6">
        {loading ? (<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><span className="ml-3 text-gray-500">{t('exportImport.loading')}</span></div>) : (<>

          {activeTab === 'dashboard' && dashboard && (<div className="space-y-6">
            {/* Row 1: Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <MiniStatCard title={t('exportImport.totalShipment')} value={fmtNum(Number(ss.total || 0))} sub={t('exportImport.exportSub', { count: ss.total_export || 0, count2: ss.total_import || 0 })} icon={Ship} color="bg-blue-500" />
              <MiniStatCard title={t('exportImport.inTransit')} value={fmtNum(Number(ss.in_transit || 0))} sub={t('exportImport.atPort', { count: ss.at_port || 0 })} icon={Globe} color="bg-amber-500" />
              <MiniStatCard title={t('exportImport.customsLabel')} value={`${cs.cleared || 0} / ${cs.total || 0}`} sub={t('exportImport.issuesSub', { count: cs.issues || 0 })} icon={Shield} color={Number(cs.issues) > 0 ? 'bg-red-500' : 'bg-green-500'} />
              <MiniStatCard title={t('exportImport.activeLc')} value={fmtNum(Number(ls.active || 0))} sub={Number(ls.expiring_soon) > 0 ? t('exportImport.expiringSoon', { count: ls.expiring_soon }) : t('exportImport.totalSub', { count: ls.total || 0 })} icon={CreditCard} color="bg-purple-500" />
              <MiniStatCard title={t('exportImport.containerLabel')} value={fmtNum(Number(cns.total || 0))} sub={t('exportImport.transitLoaded', { count: cns.in_transit || 0, count2: cns.loaded || 0 })} icon={Package} color="bg-indigo-500" />
              <MiniStatCard title={t('exportImport.documentsLabel')} value={fmtNum(Number(ds.total || 0))} sub={t('exportImport.verifiedSub', { count: ds.verified || 0 })} icon={FileText} color="bg-teal-500" />
            </div>

            {/* Row 2: Trade Balance Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight className="w-5 h-5 opacity-80" />
                  <span className="text-sm font-medium text-green-100">{t('exportImport.totalExport')}</span>
                </div>
                <p className="text-2xl font-bold">{fmt(exportVal, 'USD')}</p>
                <p className="text-xs text-green-200 mt-1">{t('exportImport.shipmentCount', { count: ss.total_export || 0 })}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownRight className="w-5 h-5 opacity-80" />
                  <span className="text-sm font-medium text-blue-100">{t('exportImport.totalImport')}</span>
                </div>
                <p className="text-2xl font-bold">{fmt(importVal, 'USD')}</p>
                <p className="text-xs text-blue-200 mt-1">{t('exportImport.shipmentCount', { count: ss.total_import || 0 })}</p>
              </div>
              <div className={`bg-gradient-to-br ${tradeBalance >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} rounded-xl p-5 text-white shadow-lg`}>
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-5 h-5 opacity-80" />
                  <span className="text-sm font-medium opacity-80">{t('exportImport.tradeBalance')}</span>
                </div>
                <p className="text-2xl font-bold">{fmt(Math.abs(tradeBalance), 'USD')}</p>
                <p className="text-xs opacity-80 mt-1">{tradeBalance >= 0 ? t('exportImport.surplus') : t('exportImport.deficit')}</p>
              </div>
            </div>

            {/* Row 3: Charts - Monthly Trend & Status Pie */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ChartCard title={t('exportImport.monthlyTrendTitle')} subtitle={t('exportImport.monthlyTrendSub')} className="lg:col-span-2">
                {monthlyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={monthlyChartData}>
                      <defs>
                        <linearGradient id="colorExport" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorImport" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtShort(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey={expLabel} stroke="#22C55E" fill="url(#colorExport)" strokeWidth={2} />
                      <Area type="monotone" dataKey={impLabel} stroke="#3B82F6" fill="url(#colorImport)" strokeWidth={2} />
                      <Line type="monotone" dataKey="Total" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">{t('exportImport.noTrendData')}</div>
                )}
              </ChartCard>

              <ChartCard title={t('exportImport.statusDistTitle')} subtitle={t('exportImport.statusDistSub')}>
                {statusPieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                          {statusPieData.map((entry: any, i: number) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {statusPieData.slice(0, 5).map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.fill }} />
                            <span className="capitalize text-gray-600">{s.name}</span>
                          </div>
                          <span className="font-semibold text-gray-800">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">{t('exportImport.noData')}</div>
                )}
              </ChartCard>
            </div>

            {/* Row 4: Transport Mode, Cost Breakdown, Customs Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ChartCard title={t('exportImport.transportModeTitle')} subtitle={t('exportImport.transportModeSub')}>
                {transportPieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={transportPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                          {transportPieData.map((entry: any, i: number) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {transportPieData.map((t: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: t.fill }} />
                            <span className="text-xs text-gray-600">{t.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-gray-800">{t.value}</span>
                            <span className="text-xs text-gray-400 ml-1">({fmtShort(t.totalValue)})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">{t('exportImport.noData')}</div>
                )}
              </ChartCard>

              <ChartCard title={t('exportImport.costBreakdownTitle')} subtitle={t('exportImport.costBreakdownSub')}>
                {costBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={costBarData} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}jt`} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip formatter={(v: number) => fmt(v)} labelStyle={{ fontWeight: 'bold' }} />
                      <Bar dataKey="total" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={18}>
                        {costBarData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">{t('exportImport.noCostData')}</div>
                )}
              </ChartCard>

              <ChartCard title={t('exportImport.customsPipelineTitle')} subtitle={t('exportImport.customsPipelineSub')}>
                <div className="space-y-3">
                  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-yellow-700 font-medium">{t('exportImport.waitingProcess')}</span>
                      <span className="text-lg font-bold text-yellow-700">{cs.pending || 0}</span>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-700 font-medium">{t('exportImport.submittedLabel')}</span>
                      <span className="text-lg font-bold text-blue-700">{cs.submitted || 0}</span>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-700 font-medium">{t('exportImport.clearedGreenLane')}</span>
                      <span className="text-lg font-bold text-green-700">{Number(cs.cleared || 0) + Number(cs.green_lane || 0)}</span>
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-700 font-medium">{t('exportImport.yellowLane')}</span>
                      <span className="text-lg font-bold text-amber-700">{cs.yellow_lane || 0}</span>
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-red-700 font-medium">{t('exportImport.redLaneIssues')}</span>
                      <span className="text-lg font-bold text-red-700">{cs.issues || 0}</span>
                    </div>
                  </div>
                  <div className="border-t pt-3 mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{t('exportImport.totalDutyTax')}</span>
                    <span className="text-sm font-bold text-gray-800">{fmt(Number(cs.total_duty || 0) + Number(cs.total_tax || 0))}</span>
                  </div>
                </div>
              </ChartCard>
            </div>

            {/* Row 5: Financial Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-gray-500 font-medium">{t('exportImport.totalGoodsValue')}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{fmt(Number(ss.total_goods_value || 0), 'USD')}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Anchor className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-gray-500 font-medium">{t('exportImport.totalFreight')}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{fmt(Number(ss.total_freight || 0), 'USD')}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Weight className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-gray-500 font-medium">{t('exportImport.totalWeight')}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{fmtNum(Number(ss.total_weight || 0))} kg</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Box className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-gray-500 font-medium">{t('exportImport.totalPackages')}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{fmtNum(Number(ss.total_packages || 0))}</p>
              </div>
            </div>

            {/* Row 6: Top Partners & Top Countries */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title={t('exportImport.topPartnersTitle')} subtitle={t('exportImport.topPartnersSub')}>
                {(dashboard.topPartners || []).length > 0 ? (
                  <div className="space-y-3">
                    {(dashboard.topPartners || []).map((p: any, i: number) => {
                      const maxVal = Number((dashboard.topPartners || [])[0]?.total_value || 1);
                      const pct = (Number(p.total_value) / maxVal) * 100;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                              <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{p.partner_name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-gray-800">{fmtShort(Number(p.total_value))}</span>
                              <span className="text-xs text-gray-400 ml-1">({p.shipment_count} ship.)</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">{t('exportImport.noPartnerData')}</div>
                )}
              </ChartCard>

              <ChartCard title={t('exportImport.countriesTitle')} subtitle={t('exportImport.countriesSub')}>
                {(dashboard.topCountries || []).length > 0 ? (
                  <div className="space-y-2">
                    {(dashboard.topCountries || []).slice(0, 6).map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-700">{c.country || 'N/A'}</span>
                          <TBadge type={c.trade_type} t={t} />
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-800">{fmtShort(Number(c.value))}</span>
                          <span className="text-xs text-gray-400 ml-1">({c.count}x)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">{t('exportImport.noCountryData')}</div>
                )}
              </ChartCard>
            </div>

            {/* Row 7: Recent Shipments Table */}
            <ChartCard title={t('exportImport.recentShipmentsTitle')} subtitle={t('exportImport.recentShipmentsSub')}>
              <DT cols={[
                { k: 'shipment_number', l: 'No.', r: v => <span className="font-mono text-xs font-semibold text-blue-600">{v}</span> },
                { k: 'trade_type', l: t('exportImport.colType'), r: v => <TBadge type={v} t={t} /> },
                { k: 'title', l: t('exportImport.colShipment'), r: (v, r) => <><p className="font-medium text-gray-800">{v}</p><p className="text-xs text-gray-500">{r.partner_name || '-'}</p></> },
                { k: 'transport_mode', l: t('exportImport.colMode'), r: v => <span className="text-xs capitalize">{transportName(v)}</span> },
                { k: 'status', l: t('exportImport.colStatus'), r: v => <Badge value={v} /> },
                { k: 'origin_port', l: t('exportImport.colRoute'), r: (v, r) => <span className="text-xs">{v || '-'} &rarr; {r.destination_port || '-'}</span> },
                { k: 'etd', l: t('exportImport.colEtd'), r: v => <span className="text-xs">{fD(v)}</span> },
                { k: 'eta', l: t('exportImport.colEta'), r: v => <span className="text-xs">{fD(v)}</span> },
                { k: 'goods_value', l: t('exportImport.colValue'), r: (v, r) => <span className="font-semibold">{fmt(Number(v || 0), r.currency || 'USD')}</span> },
              ]} data={dashboard.recentShipments || []} />
            </ChartCard>

            {/* Row 8: Active Containers */}
            {(dashboard.activeContainers || []).length > 0 && (
              <ChartCard title={t('exportImport.activeContainersTitle')} subtitle={t('exportImport.activeContainersSub', { count: (dashboard.activeContainers || []).length })}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(dashboard.activeContainers || []).slice(0, 6).map((c: any, i: number) => (
                    <div key={i} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-indigo-600">{c.container_number}</span>
                        <Badge value={c.status} />
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between"><span>{t('exportImport.colShipment')}</span><span className="font-mono">{c.shipment_number}</span></div>
                        <div className="flex justify-between"><span>{t('exportImport.colType')}</span><span>{c.container_type}</span></div>
                        <div className="flex justify-between"><span>{t('exportImport.colWeight')}</span><span>{fmtNum(Number(c.gross_weight || 0))} kg</span></div>
                        <div className="flex justify-between"><span>{t('exportImport.colPackages')}</span><span>{c.packages || 0}</span></div>
                        {c.is_hazardous && (
                          <div className="flex items-center gap-1 text-red-500 font-medium mt-1">
                            <AlertTriangle className="w-3 h-3" /> {t('exportImport.hazardous')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>
            )}
          </div>)}

          {activeTab === 'shipments' && (<div className="space-y-4">
            <Toolbar ph={t('exportImport.searchShipment')} showTT sts={[{v:'draft',l:t('exportImport.statusDraft')},{v:'booked',l:t('exportImport.statusBooked')},{v:'in_transit',l:t('exportImport.statusInTransit')},{v:'customs_clearance',l:t('exportImport.statusCustomsClearance')},{v:'delivered',l:t('exportImport.statusDelivered')},{v:'completed',l:t('exportImport.statusCompleted')}]} label={t('exportImport.createShipment')} />
            <DT cols={[
              { k: 'shipment_number', l: 'No.', r: v => <span className="font-mono text-xs font-semibold text-blue-600">{v}</span> },
              { k: 'trade_type', l: t('exportImport.colType'), r: v => <TBadge type={v} t={t} /> },
              { k: 'title', l: t('exportImport.colShipment'), r: (v, r) => <><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.partner_name || '-'}</p></> },
              { k: 'status', l: t('exportImport.colStatus'), r: v => <Badge value={v} /> },
              { k: 'incoterm', l: t('exportImport.colIncoterm'), r: v => v || '-' },
              { k: 'origin_port', l: t('exportImport.colRoute'), r: (v, r) => <span className="text-xs">{v || '-'} &rarr; {r.destination_port || '-'}</span> },
              { k: 'etd', l: t('exportImport.colEtdEta'), r: (v, r) => <span className="text-xs">{fD(v)} / {fD(r.eta)}</span> },
              { k: 'goods_value', l: t('exportImport.colValue'), r: (v, r) => fmt(Number(v || 0), r.currency || 'USD') },
            ]} data={shipments} del="shipments" />
          </div>)}

          {activeTab === 'customs' && (<div className="space-y-4">
            <Toolbar ph={t('exportImport.searchDeclaration')} sts={[{v:'pending',l:t('exportImport.statusPending')},{v:'submitted',l:t('exportImport.statusSubmitted')},{v:'cleared',l:t('exportImport.statusCleared')},{v:'red_lane',l:t('exportImport.statusRedLane')}]} label={t('exportImport.addDeclaration')} />
            <DT cols={[
              { k: 'declaration_number', l: t('exportImport.colDeclarationNo'), r: v => <span className="font-mono text-xs">{v || '-'}</span> },
              { k: 'declaration_type', l: t('exportImport.colType'), r: v => <span className={`px-2 py-1 rounded text-xs font-bold ${v === 'PEB' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{v}</span> },
              { k: 'shipment_number', l: t('exportImport.colShipment'), r: v => <span className="font-mono text-xs">{v}</span> },
              { k: 'status', l: t('exportImport.colStatus'), r: v => <Badge value={v} /> },
              { k: 'total_duty', l: t('exportImport.colDuty'), r: v => fmt(Number(v || 0)) },
              { k: 'total_tax', l: t('exportImport.colTax'), r: v => fmt(Number(v || 0)) },
              { k: 'declaration_date', l: t('exportImport.colDate'), r: v => fD(v) },
              { k: 'ppjk_name', l: t('exportImport.formPpjkName'), r: v => v || '-' },
            ]} data={customsList} del="customs" />
          </div>)}

          {activeTab === 'lcs' && (<div className="space-y-4">
            <Toolbar ph={t('exportImport.searchLc')} sts={[{v:'draft',l:t('exportImport.statusDraft')},{v:'issued',l:t('exportImport.statusIssued')},{v:'presented',l:t('exportImport.statusPresented')},{v:'paid',l:t('exportImport.statusPaid')},{v:'expired',l:t('exportImport.statusExpired')}]} label={t('exportImport.createLc')} />
            <DT cols={[
              { k: 'lc_number', l: t('exportImport.colLcNo'), r: v => <span className="font-mono text-xs">{v}</span> },
              { k: 'lc_type', l: t('exportImport.colType'), r: v => <span className="capitalize text-xs">{v}</span> },
              { k: 'status', l: t('exportImport.colStatus'), r: v => <Badge value={v} /> },
              { k: 'applicant_name', l: t('exportImport.colApplicant'), r: v => v || '-' },
              { k: 'beneficiary_name', l: t('exportImport.colBeneficiary'), r: v => v || '-' },
              { k: 'amount', l: t('exportImport.colValue'), r: (v, r) => fmt(Number(v || 0), r.currency || 'USD') },
              { k: 'expiry_date', l: t('exportImport.colExpire'), r: v => fD(v) },
            ]} data={lcs} del="lcs" />
          </div>)}

          {activeTab === 'containers' && (<div className="space-y-4">
            <Toolbar ph={t('exportImport.searchContainer')} sts={[{v:'empty',l:t('exportImport.statusEmpty')},{v:'loaded',l:t('exportImport.statusLoaded')},{v:'in_transit',l:t('exportImport.statusInTransit')}]} label={t('exportImport.addContainer')} />
            <DT cols={[
              { k: 'container_number', l: t('exportImport.colContainerNo'), r: v => <span className="font-mono text-xs font-bold">{v}</span> },
              { k: 'container_type', l: t('exportImport.colType'), r: v => <span className="font-mono text-xs">{v}</span> },
              { k: 'shipment_number', l: t('exportImport.colShipment'), r: v => <span className="font-mono text-xs">{v}</span> },
              { k: 'status', l: t('exportImport.colStatus'), r: v => <Badge value={v} /> },
              { k: 'seal_number', l: t('exportImport.colSeal'), r: v => v || '-' },
              { k: 'gross_weight', l: t('exportImport.colWeightKg'), r: v => Number(v || 0).toLocaleString() },
              { k: 'packages', l: t('exportImport.colPackages'), r: v => v || 0 },
              { k: 'is_hazardous', l: t('exportImport.colHazard'), r: v => v ? <AlertTriangle className="w-4 h-4 text-red-500" /> : '-' },
            ]} data={containers} del="containers" />
          </div>)}

          {activeTab === 'documents' && (<div className="space-y-4">
            <Toolbar ph={t('exportImport.searchDocument')} sts={[{v:'draft',l:t('exportImport.statusDraft')},{v:'issued',l:t('exportImport.statusIssued')},{v:'verified',l:t('exportImport.statusVerified')}]} label={t('exportImport.uploadDocument')} />
            <DT cols={[
              { k: 'document_type', l: t('exportImport.colType'), r: v => <span className="capitalize font-medium">{(v || '').replace(/_/g, ' ')}</span> },
              { k: 'document_number', l: t('exportImport.colNumber'), r: v => v || '-' },
              { k: 'shipment_number', l: t('exportImport.colShipment'), r: v => <span className="font-mono text-xs">{v}</span> },
              { k: 'status', l: t('exportImport.colStatus'), r: v => <Badge value={v} /> },
              { k: 'issuer', l: t('exportImport.colIssuer'), r: v => v || '-' },
              { k: 'issue_date', l: t('exportImport.colIssued'), r: v => fD(v) },
              { k: 'expiry_date', l: t('exportImport.colExpire'), r: v => fD(v) },
            ]} data={documents} del="documents" />
          </div>)}

          {activeTab === 'partners' && (<div className="space-y-4">
            <Toolbar ph={t('exportImport.searchPartner')} sts={[{v:'active',l:t('exportImport.statusActive')},{v:'inactive',l:t('exportImport.statusInactive')}]} label={t('exportImport.addPartner')} />
            <DT cols={[
              { k: 'partner_code', l: t('exportImport.colCode'), r: v => <span className="font-mono text-xs">{v}</span> },
              { k: 'name', l: t('exportImport.colName'), r: v => <span className="font-medium">{v}</span> },
              { k: 'partner_type', l: t('exportImport.colType'), r: v => <span className="capitalize">{(v || '').replace(/_/g, ' ')}</span> },
              { k: 'status', l: t('exportImport.colStatus'), r: v => <Badge value={v} /> },
              { k: 'country', l: t('exportImport.colCountry'), r: v => v || '-' },
              { k: 'contact_person', l: t('exportImport.colContact'), r: v => v || '-' },
              { k: 'email', l: t('exportImport.colEmail'), r: v => v || '-' },
            ]} data={partners} del="partners" />
          </div>)}

          {activeTab === 'costs' && (<div className="space-y-4">
            <Toolbar ph={t('exportImport.searchCost')} sts={[{v:'pending',l:t('exportImport.statusPending')},{v:'approved',l:t('exportImport.statusApproved')},{v:'paid',l:t('exportImport.statusPaid')}]} label={t('exportImport.addCost')} />
            <DT cols={[
              { k: 'cost_category', l: t('exportImport.colCategory'), r: v => <span className="capitalize font-medium">{(v || '').replace(/_/g, ' ')}</span> },
              { k: 'description', l: t('exportImport.colDescription'), r: v => v || '-' },
              { k: 'shipment_number', l: t('exportImport.colShipment'), r: v => <span className="font-mono text-xs">{v}</span> },
              { k: 'amount', l: t('exportImport.colAmount'), r: (v, r) => fmt(Number(v || 0), r.currency || 'IDR') },
              { k: 'amount_idr', l: t('exportImport.colAmountIdr'), r: v => fmt(Number(v || 0)) },
              { k: 'status', l: t('exportImport.colStatus'), r: v => <Badge value={v} /> },
              { k: 'paid_date', l: t('exportImport.colPayDate'), r: v => fD(v) },
            ]} data={costs} del="costs" />
          </div>)}

          {activeTab === 'hs-codes' && (<div className="space-y-4">
            <Toolbar ph={t('exportImport.searchHsCode')} sts={[]} label={t('exportImport.addHsCode')} />
            <DT cols={[
              { k: 'hs_code', l: t('exportImport.formHsCode'), r: v => <span className="font-mono font-bold">{v}</span> },
              { k: 'description', l: t('exportImport.colDescription'), r: v => <span className="text-xs">{(v || '').substring(0, 80)}</span> },
              { k: 'chapter', l: t('exportImport.colChapter'), r: v => v || '-' },
              { k: 'duty_rate', l: t('exportImport.colDutyRate'), r: v => `${Number(v || 0)}%` },
              { k: 'vat_rate', l: t('exportImport.colVatRate'), r: v => `${Number(v || 0)}%` },
              { k: 'pph_rate', l: t('exportImport.colPphRate'), r: v => `${Number(v || 0)}%` },
            ]} data={hsCodes} del="hs-codes" />
          </div>)}

          {activeTab === 'analytics' && analyticsData && (() => {
            const aMonthly = (analyticsData.monthlySummary || []).reduce((acc: any[], m: any) => {
              let found = acc.find((a: any) => a.month === m.month);
              if (!found) { found = { month: m.month, [expLabel]: 0, [impLabel]: 0 }; acc.push(found); }
              if (m.trade_type === 'export') { found[expLabel] = Number(m.value); }
              else { found[impLabel] = Number(m.value); }
              return acc;
            }, []).sort((a: any, b: any) => a.month.localeCompare(b.month));

            const aTransport = (analyticsData.byTransport || []).map((t: any) => ({
              name: transportName(t.transport_mode),
              value: Number(t.count),
              amount: Number(t.value),
              fill: TRANSPORT_COLORS[t.transport_mode] || '#9CA3AF'
            }));

            const aCost = (analyticsData.costBreakdown || []).map((c: any) => ({
              name: (c.cost_category || '').replace(/_/g, ' '),
              total: Number(c.total)
            }));

            const aCountry = (analyticsData.byCountry || []).map((c: any) => ({
              country: c.country || 'N/A',
              trade_type: c.trade_type,
              count: Number(c.count),
              value: Number(c.value)
            }));

            return (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">{t('exportImport.analyticsTitle')}</h3>

              {/* Trade Balance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(analyticsData.tradeBalance || []).map((tb: any) => (
                  <div key={tb.trade_type} className={`rounded-xl p-5 text-white shadow-lg ${tb.trade_type === 'export' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
                    <TBadge type={tb.trade_type} t={t} />
                    <p className="text-2xl font-bold mt-2">{fmt(Number(tb.total_value || 0), 'USD')}</p>
                    <p className="text-xs opacity-80 mt-1">{t('exportImport.shipmentCount', { count: tb.shipment_count })} &bull; {t('exportImport.tabCosts')}: {fmtShort(Number(tb.total_cost || 0))}</p>
                  </div>
                ))}
                {(analyticsData.tradeBalance || []).length >= 2 && (() => {
                  const expV = Number((analyticsData.tradeBalance.find((tb: any) => tb.trade_type === 'export') || {}).total_value || 0);
                  const impV = Number((analyticsData.tradeBalance.find((tb: any) => tb.trade_type === 'import') || {}).total_value || 0);
                  const bal = expV - impV;
                  return (
                    <div className={`rounded-xl p-5 text-white shadow-lg ${bal >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
                      <span className="text-xs font-medium opacity-80">{t('exportImport.balanceLabel')}</span>
                      <p className="text-2xl font-bold mt-2">{fmt(Math.abs(bal), 'USD')}</p>
                      <p className="text-xs opacity-80 mt-1">{bal >= 0 ? t('exportImport.tradeSurplus') : t('exportImport.tradeDeficit')}</p>
                    </div>
                  );
                })()}
              </div>

              {/* Monthly Trend Chart */}
              <ChartCard title={t('exportImport.monthlyTradeTrend')} subtitle={t('exportImport.monthlyTrendSub')} className="lg:col-span-2">
                {aMonthly.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={aMonthly}>
                      <defs>
                        <linearGradient id="aColorExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="aColorImp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtShort(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey={expLabel} stroke="#22C55E" fill="url(#aColorExp)" strokeWidth={2} />
                      <Area type="monotone" dataKey={impLabel} stroke="#3B82F6" fill="url(#aColorImp)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">{t('exportImport.noMonthlyData')}</div>}
              </ChartCard>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Transport Mode Pie */}
                <ChartCard title={t('exportImport.transportModeTitle')} subtitle={t('exportImport.transportDistSub')}>
                  {aTransport.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={aTransport} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                            {aTransport.map((entry: any, i: number) => <Cell key={i} fill={entry.fill} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {aTransport.map((t: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: t.fill }} />
                              <span className="text-sm text-gray-600">{t.name}</span>
                            </div>
                            <span className="text-sm font-bold">{t.value} ({fmtShort(t.amount)})</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">{t('exportImport.noData')}</div>}
                </ChartCard>

                {/* Cost Breakdown Bar */}
                <ChartCard title={t('exportImport.costBreakdownTitle')} subtitle={t('exportImport.costBreakdownSub')}>
                  {aCost.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={aCost} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}jt`} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                        <Tooltip formatter={(v: number) => fmt(v)} labelStyle={{ fontWeight: 'bold' }} />
                        <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={18}>
                          {aCost.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">{t('exportImport.noCostData')}</div>}
                </ChartCard>
              </div>

              {/* Top Countries */}
              <ChartCard title={t('exportImport.tradeByCountryTitle')} subtitle={t('exportImport.tradeByCountrySub')}>
                {aCountry.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aCountry.slice(0, 10).map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">{c.country}</span>
                          <TBadge type={c.trade_type} t={t} />
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-800">{fmtShort(c.value)}</span>
                          <span className="text-xs text-gray-400 ml-1">({c.count}x)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">{t('exportImport.noCountryData')}</div>}
              </ChartCard>
            </div>
          );})()}
        </>)}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">{t('exportImport.createNew', { name: tabs.find(tb => tb.id === activeTab)?.name || '' })}</h3></div>
            <div className="p-6 space-y-4">
              {activeTab === 'shipments' && (<>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formTitle')} *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formType')} *</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.tradeType || 'import'} onChange={e => setForm({ ...form, tradeType: e.target.value })}><option value="import">{t('exportImport.importFilter')}</option><option value="export">{t('exportImport.exportFilter')}</option></select></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formTransport')}</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.transportMode || 'sea'} onChange={e => setForm({ ...form, transportMode: e.target.value })}><option value="sea">{t('exportImport.transportSea')}</option><option value="air">{t('exportImport.transportAir')}</option><option value="land">{t('exportImport.transportLand')}</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formIncoterm')}</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.incoterm || ''} onChange={e => setForm({ ...form, incoterm: e.target.value })}><option value="">{t('exportImport.formSelect')}</option><option value="FOB">FOB</option><option value="CIF">CIF</option><option value="EXW">EXW</option><option value="DDP">DDP</option><option value="CFR">CFR</option></select></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formPartner')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.partnerName || ''} onChange={e => setForm({ ...form, partnerName: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formOriginPort')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.originPort || ''} onChange={e => setForm({ ...form, originPort: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formDestPort')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.destinationPort || ''} onChange={e => setForm({ ...form, destinationPort: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">ETD</label><input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.etd || ''} onChange={e => setForm({ ...form, etd: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">ETA</label><input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.eta || ''} onChange={e => setForm({ ...form, eta: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formGoodsValue')}</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.goodsValue || ''} onChange={e => setForm({ ...form, goodsValue: e.target.value })} /></div>
              </>)}
              {activeTab === 'customs' && (<>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formShipmentId')} *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="UUID pengiriman" value={form.shipmentId || ''} onChange={e => setForm({ ...form, shipmentId: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formDeclarationType')} *</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.declarationType || 'PIB'} onChange={e => setForm({ ...form, declarationType: e.target.value })}><option value="PIB">PIB (Impor)</option><option value="PEB">PEB (Ekspor)</option></select></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formDeclarationNo')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.declarationNumber || ''} onChange={e => setForm({ ...form, declarationNumber: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formCustomsOffice')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customsOffice || ''} onChange={e => setForm({ ...form, customsOffice: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.colDate')}</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.declarationDate || ''} onChange={e => setForm({ ...form, declarationDate: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.colDuty')}</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.totalDuty || 0} onChange={e => setForm({ ...form, totalDuty: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.colTax')}</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.totalTax || 0} onChange={e => setForm({ ...form, totalTax: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formExciseRate')}</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.totalExcise || 0} onChange={e => setForm({ ...form, totalExcise: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formPpjkName')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.ppjkName || ''} onChange={e => setForm({ ...form, ppjkName: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formPpjkLicense')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.ppjkLicense || ''} onChange={e => setForm({ ...form, ppjkLicense: e.target.value })} /></div>
                </div>
              </>)}
              {activeTab === 'documents' && (<>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formShipmentId')} *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="UUID pengiriman" value={form.shipmentId || ''} onChange={e => setForm({ ...form, shipmentId: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formDocType')} *</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.documentType || ''} onChange={e => setForm({ ...form, documentType: e.target.value })}><option value="">{t('exportImport.formSelect')}</option><option value="bill_of_lading">Bill of Lading</option><option value="commercial_invoice">Commercial Invoice</option><option value="packing_list">Packing List</option><option value="certificate_of_origin">Certificate of Origin</option><option value="insurance_policy">Insurance Policy</option><option value="customs_declaration">Customs Declaration</option><option value="phytosanitary">Phytosanitary</option><option value="fumigation">Fumigation</option></select></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.colNumber')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.documentNumber || ''} onChange={e => setForm({ ...form, documentNumber: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formTitle')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.colIssuer')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.issuer || ''} onChange={e => setForm({ ...form, issuer: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.colIssued')}</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.issueDate || ''} onChange={e => setForm({ ...form, issueDate: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formExpiryDate')}</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.expiryDate || ''} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></div>
              </>)}
              {activeTab === 'containers' && (<>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formShipmentId')} *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="UUID pengiriman" value={form.shipmentId || ''} onChange={e => setForm({ ...form, shipmentId: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formContainerNo')} *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. MSKU1234567" value={form.containerNumber || ''} onChange={e => setForm({ ...form, containerNumber: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formContainerType')}</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.containerType || '20GP'} onChange={e => setForm({ ...form, containerType: e.target.value })}><option value="20GP">20GP</option><option value="40GP">40GP</option><option value="40HC">40HC</option><option value="20RF">20RF</option><option value="40RF">40RF</option><option value="20OT">20OT</option><option value="40OT">40OT</option></select></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.colSeal')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.sealNumber || ''} onChange={e => setForm({ ...form, sealNumber: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formGrossWeight')}</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.grossWeight || 0} onChange={e => setForm({ ...form, grossWeight: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formTareWeight')}</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.tareWeight || 0} onChange={e => setForm({ ...form, tareWeight: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.colPackages')}</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.packages || 0} onChange={e => setForm({ ...form, packages: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formGoodsDesc')}</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.goodsDescription || ''} onChange={e => setForm({ ...form, goodsDescription: e.target.value })} /></div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isHazardous" checked={form.isHazardous || false} onChange={e => setForm({ ...form, isHazardous: e.target.checked })} />
                  <label htmlFor="isHazardous" className="text-sm font-medium">{t('exportImport.hazardous')}</label>
                </div>
              </>)}
              {activeTab === 'costs' && (<>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formShipmentId')} *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="UUID pengiriman" value={form.shipmentId || ''} onChange={e => setForm({ ...form, shipmentId: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.colCategory')} *</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.costCategory || ''} onChange={e => setForm({ ...form, costCategory: e.target.value })}><option value="">{t('exportImport.formSelect')}</option><option value="freight">{t('exportImport.costFreight')}</option><option value="customs_duty">{t('exportImport.costCustomsDuty')}</option><option value="insurance">{t('exportImport.costInsurance')}</option><option value="handling">{t('exportImport.costHandling')}</option><option value="storage">{t('exportImport.costStorage')}</option><option value="documentation">{t('exportImport.costDocumentation')}</option><option value="inspection">{t('exportImport.costInspection')}</option><option value="other">{t('exportImport.costOther')}</option></select></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formVendor')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.vendorName || ''} onChange={e => setForm({ ...form, vendorName: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.colDescription')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.colAmount')} *</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formCurrency')}</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.currency || 'IDR'} onChange={e => setForm({ ...form, currency: e.target.value })}><option value="IDR">IDR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="CNY">CNY</option><option value="JPY">JPY</option></select></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formExchangeRate')}</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.exchangeRate || 1} onChange={e => setForm({ ...form, exchangeRate: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formInvoiceNo')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.invoiceNumber || ''} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} /></div>
              </>)}
              {activeTab === 'partners' && (<>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formName')} *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formType')} *</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.partnerType || ''} onChange={e => setForm({ ...form, partnerType: e.target.value })}><option value="">{t('exportImport.formSelect')}</option><option value="buyer">{t('exportImport.partnerBuyer')}</option><option value="seller">{t('exportImport.partnerSeller')}</option><option value="forwarder">{t('exportImport.partnerForwarder')}</option><option value="shipping_line">{t('exportImport.partnerShippingLine')}</option><option value="customs_broker">{t('exportImport.partnerCustomsBroker')}</option><option value="insurance">{t('exportImport.partnerInsurance')}</option></select></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formCountry')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formEmail')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formContactPerson')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.contactPerson || ''} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></div>
              </>)}
              {activeTab === 'lcs' && (<>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formLcType')}</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.lcType || 'irrevocable'} onChange={e => setForm({ ...form, lcType: e.target.value })}><option value="irrevocable">Irrevocable</option><option value="revocable">Revocable</option><option value="confirmed">Confirmed</option><option value="standby">Standby</option></select></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formAmount')} *</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formApplicant')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.applicantName || ''} onChange={e => setForm({ ...form, applicantName: e.target.value })} /></div>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formBeneficiary')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.beneficiaryName || ''} onChange={e => setForm({ ...form, beneficiaryName: e.target.value })} /></div>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formIssuingBank')}</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.issuingBank || ''} onChange={e => setForm({ ...form, issuingBank: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formExpiryDate')}</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.expiryDate || ''} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formPayment')}</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.paymentTerms || 'at sight'} onChange={e => setForm({ ...form, paymentTerms: e.target.value })}><option value="at sight">At Sight</option><option value="usance">Usance</option><option value="deferred">Deferred</option></select></div>
                </div>
              </>)}
              {activeTab === 'hs-codes' && (<>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formHsCode')} *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="cth. 0901.11.00" value={form.hsCode || ''} onChange={e => setForm({ ...form, hsCode: e.target.value })} /></div>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formDescEn')} *</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div><label className="block text-sm font-medium mb-1">{t('exportImport.formDescId')}</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.descriptionId || ''} onChange={e => setForm({ ...form, descriptionId: e.target.value })} /></div>
                <div className="grid grid-cols-4 gap-3">
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formDutyRate')}</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dutyRate || 0} onChange={e => setForm({ ...form, dutyRate: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formVatRate')}</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.vatRate || 11} onChange={e => setForm({ ...form, vatRate: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formExciseRate')}</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.exciseRate || 0} onChange={e => setForm({ ...form, exciseRate: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('exportImport.formPphRate')}</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.pphRate || 0} onChange={e => setForm({ ...form, pphRate: e.target.value })} /></div>
                </div>
              </>)}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg text-sm">{t('exportImport.cancel')}</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} {t('exportImport.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}
