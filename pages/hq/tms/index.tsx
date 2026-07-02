import React, { useState, useEffect, useCallback } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import {
  Package, Truck, MapPin, Users, DollarSign, FileText, Navigation,
  Plus, Search, RefreshCw, X, Eye, Edit, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Clock, Loader2,
  BarChart3, TrendingUp, Send, Warehouse, Router, ClipboardCheck,
  LayoutDashboard, Building2, Map, Receipt, Globe, CreditCard,
  Activity, Target, Star, Timer, Shield, Zap, Award, Download as DownloadIcon
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { rowsOr, MOCK_HQ_TMS } from '@/lib/hq/mock-data';

const CHART_COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#3B82F6','#14B8A6'];
const CLS = { fontSize: 11, fill: '#6B7280' };

type TabType = 'dashboard' | 'shipments' | 'trips' | 'carriers' | 'routes' | 'billing' | 'zones' | 'rate-cards' | 'warehouses' | 'tracking' | 'carrier-scores' | 'delivery-sla' | 'logistics-analytics' | 'dispatch';

const TAB_GROUPS: { label: string; icon: any; tabs: { id: TabType; label: string; icon: any }[] }[] = [
  { label: 'Utama', icon: LayoutDashboard, tabs: [
    { id: 'dashboard', label: 'Dasbor', icon: LayoutDashboard },
    { id: 'shipments', label: 'Pengiriman', icon: Package },
    { id: 'trips', label: 'Perjalanan', icon: Navigation },
  ]},
  { label: 'Operasional', icon: Send, tabs: [
    { id: 'dispatch', label: 'Pengiriman Barang', icon: Send },
    { id: 'tracking', label: 'Pelacakan', icon: Activity },
    { id: 'carriers', label: 'Pengangkut', icon: Building2 },
    { id: 'routes', label: 'Rute', icon: Map },
  ]},
  { label: 'Analitik', icon: BarChart3, tabs: [
    { id: 'logistics-analytics', label: 'KPI Logistik', icon: BarChart3 },
    { id: 'carrier-scores', label: 'Skor Pengangkut', icon: Star },
    { id: 'delivery-sla', label: 'SLA Pengiriman', icon: Timer },
  ]},
  { label: 'Admin', icon: Receipt, tabs: [
    { id: 'billing', label: 'Penagihan', icon: Receipt },
    { id: 'zones', label: 'Zona', icon: Globe },
    { id: 'rate-cards', label: 'Tarif', icon: CreditCard },
    { id: 'warehouses', label: 'Gudang', icon: Warehouse },
  ]},
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', confirmed: 'bg-blue-100 text-blue-700',
  assigned: 'bg-indigo-100 text-indigo-700', picked_up: 'bg-purple-100 text-purple-700',
  in_transit: 'bg-yellow-100 text-yellow-700', arrived: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700', pod_received: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700', planned: 'bg-gray-100 text-gray-600',
  dispatched: 'bg-blue-100 text-blue-700', in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700', active: 'bg-green-100 text-green-700',
  unpaid: 'bg-red-100 text-red-700', partial: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700',
  sent: 'bg-blue-100 text-blue-700', void: 'bg-gray-100 text-gray-600',
  normal: 'bg-gray-100 text-gray-600', high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700', low: 'bg-gray-100 text-gray-500',
};

const fmt = (n: any) => Number(n || 0).toLocaleString('id-ID');
const fmtRp = (n: any) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('id-ID') : '-';

export default function TMSPage() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  const [dashboard, setDashboard] = useState<any>(MOCK_HQ_TMS.dashboard);
  const [shipments, setShipments] = useState<any[]>(MOCK_HQ_TMS.shipments);
  const [trips, setTrips] = useState<any[]>(MOCK_HQ_TMS.trips);
  const [carriers, setCarriers] = useState<any[]>(MOCK_HQ_TMS.carriers);
  const [routes, setRoutes] = useState<any[]>(MOCK_HQ_TMS.routes);
  const [freightBills, setFreightBills] = useState<any[]>(MOCK_HQ_TMS.freightBills);
  const [zones, setZones] = useState<any[]>(MOCK_HQ_TMS.zones);
  const [rateCards, setRateCards] = useState<any[]>(MOCK_HQ_TMS.rateCards);
  const [warehouses, setWarehouses] = useState<any[]>(MOCK_HQ_TMS.warehouses);
  // For dropdowns in forms
  const [fmsVehicles, setFmsVehicles] = useState<any[]>(MOCK_HQ_TMS.fmsVehicles);
  const [fmsDrivers, setFmsDrivers] = useState<any[]>(MOCK_HQ_TMS.fmsDrivers);
  // Enhanced states
  const [tracking, setTracking] = useState<any[]>(MOCK_HQ_TMS.tracking);
  const [carrierScores, setCarrierScores] = useState<any[]>(MOCK_HQ_TMS.carrierScores);
  const [deliverySlas, setDeliverySlas] = useState<any[]>(MOCK_HQ_TMS.deliverySlas);
  const [slaPerformance, setSlaPerformance] = useState<any>(MOCK_HQ_TMS.slaPerformance);
  const [logisticsKpi, setLogisticsKpi] = useState<any>(MOCK_HQ_TMS.logisticsKpi);
  const [dispatchQueue, setDispatchQueue] = useState<any[]>(MOCK_HQ_TMS.dispatchQueue);
  const [chartData, setChartData] = useState<any>(MOCK_HQ_TMS.chartData);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchData(); }, [mounted, tab]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const api = async (action: string, method = 'GET', body?: any, base = '/api/hq/tms') => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`${base}?action=${action}`, opts);
    return r.json();
  };
  const apiE = async (action: string, method = 'GET', body?: any) => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/hq/tms/enhanced?action=${action}`, opts);
    return r.json();
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      switch (tab) {
        case 'dashboard': {
          const [r, c] = await Promise.all([api('dashboard'), api('dashboard-charts')]);
          if (r.success) setDashboard(r.data ?? MOCK_HQ_TMS.dashboard);
          if (c.success) setChartData(c.data ?? MOCK_HQ_TMS.chartData);
          break;
        }
        case 'shipments': {
          const [r, c, v, d] = await Promise.all([
            api('shipments'), api('carriers'),
            api('vehicles', 'GET', undefined, '/api/hq/fms'),
            api('drivers', 'GET', undefined, '/api/hq/fms')
          ]);
          if (r.success) setShipments(rowsOr(r.data, MOCK_HQ_TMS.shipments));
          if (c.success) setCarriers(rowsOr(c.data, MOCK_HQ_TMS.carriers));
          if (v.success) setFmsVehicles(rowsOr(v.data, MOCK_HQ_TMS.fmsVehicles));
          if (d.success) setFmsDrivers(rowsOr(d.data, MOCK_HQ_TMS.fmsDrivers));
          break;
        }
        case 'trips': {
          const [r, v, d] = await Promise.all([
            api('trips'),
            api('vehicles', 'GET', undefined, '/api/hq/fms'),
            api('drivers', 'GET', undefined, '/api/hq/fms')
          ]);
          if (r.success) setTrips(rowsOr(r.data, MOCK_HQ_TMS.trips));
          if (v.success) setFmsVehicles(rowsOr(v.data, MOCK_HQ_TMS.fmsVehicles));
          if (d.success) setFmsDrivers(rowsOr(d.data, MOCK_HQ_TMS.fmsDrivers));
          break;
        }
        case 'carriers': {
          const r = await api('carriers');
          if (r.success) setCarriers(rowsOr(r.data, MOCK_HQ_TMS.carriers));
          break;
        }
        case 'routes': {
          const r = await api('routes');
          if (r.success) setRoutes(rowsOr(r.data, MOCK_HQ_TMS.routes));
          break;
        }
        case 'billing': {
          const r = await api('freight-bills');
          if (r.success) setFreightBills(rowsOr(r.data, MOCK_HQ_TMS.freightBills));
          break;
        }
        case 'zones': {
          const r = await api('zones');
          if (r.success) setZones(rowsOr(r.data, MOCK_HQ_TMS.zones));
          break;
        }
        case 'rate-cards': {
          const [r, z] = await Promise.all([api('rate-cards'), api('zones')]);
          if (r.success) setRateCards(rowsOr(r.data, MOCK_HQ_TMS.rateCards));
          if (z.success) setZones(rowsOr(z.data, MOCK_HQ_TMS.zones));
          break;
        }
        case 'warehouses': {
          const r = await api('warehouses');
          if (r.success) setWarehouses(rowsOr(r.data, MOCK_HQ_TMS.warehouses));
          break;
        }
        case 'tracking': {
          const r = await apiE('shipment-tracking');
          if (r.success) setTracking(rowsOr(r.data, MOCK_HQ_TMS.tracking));
          break;
        }
        case 'carrier-scores': {
          const r = await apiE('carrier-scores');
          if (r.success) setCarrierScores(rowsOr(r.data, MOCK_HQ_TMS.carrierScores));
          break;
        }
        case 'delivery-sla': {
          const [r1, r2] = await Promise.all([apiE('delivery-slas'), apiE('sla-performance')]);
          if (r1.success) setDeliverySlas(rowsOr(r1.data, MOCK_HQ_TMS.deliverySlas));
          if (r2.success) setSlaPerformance(r2.data ?? MOCK_HQ_TMS.slaPerformance);
          break;
        }
        case 'logistics-analytics': {
          const r = await apiE('logistics-analytics');
          if (r.success) setLogisticsKpi(r.data ?? MOCK_HQ_TMS.logisticsKpi);
          break;
        }
        case 'dispatch': {
          const [r1, v, d] = await Promise.all([
            apiE('dispatch-queue'),
            api('vehicles', 'GET', undefined, '/api/hq/fms'),
            api('drivers', 'GET', undefined, '/api/hq/fms')
          ]);
          if (r1.success) setDispatchQueue(rowsOr(r1.data, MOCK_HQ_TMS.dispatchQueue));
          if (v.success) setFmsVehicles(rowsOr(v.data, MOCK_HQ_TMS.fmsVehicles));
          if (d.success) setFmsDrivers(rowsOr(d.data, MOCK_HQ_TMS.fmsDrivers));
          break;
        }
      }
    } catch (e) { console.error('TMS fetch error:', e); }
    setLoading(false);
  }, [tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let r;
      switch (modal) {
        case 'add-shipment': r = await api('create-shipment', 'POST', form); break;
        case 'add-trip': r = await api('create-trip', 'POST', form); break;
        case 'add-carrier': r = await api('create-carrier', 'POST', form); break;
        case 'add-route': r = await api('create-route', 'POST', form); break;
        case 'add-bill': r = await api('create-freight-bill', 'POST', form); break;
        case 'add-zone': r = await api('create-zone', 'POST', form); break;
        case 'add-rate-card': r = await api('create-rate-card', 'POST', form); break;
        case 'add-warehouse': r = await api('create-warehouse', 'POST', form); break;
        case 'add-pod': r = await api('create-pod', 'POST', form); break;
        case 'add-sla': r = await apiE('create-sla', 'POST', form); break;
        case 'dispatch-assign': r = await apiE('dispatch-assign', 'POST', form); break;
        default: r = { success: false, error: 'Unknown' };
      }
      if (r?.success) { showToast(r.message || 'Berhasil'); setModal(null); setForm({}); fetchData(); }
      else showToast(r?.error || 'Gagal');
    } catch { showToast('Terjadi error'); }
    setSaving(false);
  };

  const handleExport = async (entity: string) => {
    try {
      const r = await api('export&entity=' + entity);
      if (!r.success || !r.data?.length) { showToast('Tidak ada data untuk export'); return; }
      const headers = Object.keys(r.data[0]);
      const csv = [headers.join(','), ...r.data.map((row: any) => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `tms_${entity}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url); showToast('Export CSV berhasil');
    } catch { showToast('Export gagal'); }
  };

  if (!mounted) return null;

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none';
  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
  const StatCard = ({ icon: Icon, label, value, color = 'indigo', sub }: any) => (
    <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`p-2 sm:p-2.5 rounded-lg bg-${color}-50 flex-shrink-0`}><Icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${color}-600`} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 truncate">{label}</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-[10px] sm:text-xs text-gray-400 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
  const SectionHeader = ({ title, onAdd, addLabel, onExport }: { title: string; onAdd?: () => void; addLabel?: string; onExport?: () => void }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
        {onExport && <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"><DownloadIcon className="w-4 h-4" /><span className="hidden sm:inline">Export CSV</span><span className="sm:hidden">Export</span></button>}
        {onAdd && <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"><Plus className="w-4 h-4" />{addLabel || 'Tambah'}</button>}
      </div>
    </div>
  );

  const filteredShipments = shipments.filter(s => (!search || s.shipment_number?.toLowerCase().includes(search.toLowerCase()) || s.consignee_name?.toLowerCase().includes(search.toLowerCase())) && (!statusFilter || s.status === statusFilter));

  const activeGroupIdx = TAB_GROUPS.findIndex(g => g.tabs.some(t => t.id === tab));
  const activeGroup = TAB_GROUPS[activeGroupIdx >= 0 ? activeGroupIdx : 0];

  return (
    <HQLayout>
      <div className="-m-6 h-[calc(100vh-4rem)] flex flex-col bg-gray-50/50 overflow-hidden">
        {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm">{toast}</div>}

        {/* ─── Sticky Header ─── */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200">
          {/* Title Bar */}
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 truncate"><Package className="w-6 h-6 text-indigo-600 flex-shrink-0" />Manajemen Transportasi</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative hidden sm:block"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-52 lg:w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            </div>
          </div>

          {/* ─── Group Selector ─── */}
          <div className="px-4 sm:px-6 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {TAB_GROUPS.map((g, gi) => {
              const GIcon = g.icon;
              const isActive = gi === (activeGroupIdx >= 0 ? activeGroupIdx : 0);
              return (
                <button key={g.label} onClick={() => { const firstTab = g.tabs[0].id; setTab(firstTab); setSearch(''); setStatusFilter(''); }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}>
                  <GIcon className="w-4 h-4" /><span className="hidden sm:inline">{g.label}</span>
                </button>
              );
            })}
          </div>

          {/* ─── Sub-tabs for active group ─── */}
          <div className="px-4 sm:px-6 py-2 bg-gray-50/80 flex items-center gap-1 overflow-x-auto scrollbar-hide border-t border-gray-100">
            {activeGroup.tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); setStatusFilter(''); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    tab === t.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:shadow-sm'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </button>
              );
            })}
            {/* Mobile search */}
            <div className="relative sm:hidden ml-auto flex-shrink-0">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
              <input className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-36 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ─── Content (scrollable, fit-screen) ─── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>}

          {/* DASHBOARD */}
          {!loading && tab === 'dashboard' && dashboard && (
            <div className="space-y-6">
              {/* ── KPI Summary ── */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard icon={Package} label="Total Pengiriman" value={fmt(dashboard.shipments?.total)} color="indigo" />
                <StatCard icon={Send} label="Dalam Perjalanan" value={fmt(dashboard.shipments?.in_transit)} color="yellow" />
                <StatCard icon={CheckCircle} label="Terkirim" value={fmt(dashboard.shipments?.delivered)} color="green" />
                <StatCard icon={Navigation} label="Trip Aktif" value={fmt(dashboard.trips?.in_progress)} color="blue" sub={`${fmt(dashboard.trips?.planned)} direncanakan`} />
                <StatCard icon={Building2} label="Pengangkut Aktif" value={fmt(dashboard.carriers?.active)} color="purple" />
                <StatCard icon={DollarSign} label="Pendapatan" value={fmtRp(dashboard.shipments?.total_revenue)} color="emerald" />
              </div>

              {/* ── Row 1: Shipment Trend (Area) + Status Doughnut ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-0.5 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500" />Tren Pengiriman & Pendapatan</h3>
                  <p className="text-xs text-gray-400 mb-4">12 bulan terakhir</p>
                  {chartData?.shipmentTrend?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={chartData.shipmentTrend.map((s:any)=>({month:s.month?.slice(5),total:Number(s.total),delivered:Number(s.delivered),revenue:Number(s.revenue)}))}>
                        <defs>
                          <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366F1" stopOpacity={0}/></linearGradient>
                          <linearGradient id="gDel" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={CLS} />
                        <YAxis yAxisId="l" tick={CLS} />
                        <YAxis yAxisId="r" orientation="right" tick={CLS} tickFormatter={(v:number)=>v>=1e6?`${(v/1e6).toFixed(0)}jt`:v>=1e3?`${(v/1e3).toFixed(0)}rb`:String(v)} />
                        <Tooltip formatter={(v:number,name:string)=>name==='revenue'?fmtRp(v):fmt(v)} />
                        <Legend />
                        <Area yAxisId="l" type="monotone" dataKey="total" name="Shipment" stroke="#6366F1" fill="url(#gRev)" strokeWidth={2} />
                        <Area yAxisId="l" type="monotone" dataKey="delivered" name="Delivered" stroke="#10B981" fill="url(#gDel)" strokeWidth={2} />
                        <Line yAxisId="r" type="monotone" dataKey="revenue" name="Revenue" stroke="#F59E0B" strokeWidth={2} dot={{r:3}} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">Belum ada data trend</div>}
                </div>
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4">Status Pengiriman</h3>
                  {chartData?.shipmentsByStatus?.length > 0 ? (<>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={chartData.shipmentsByStatus.map((s:any)=>({name:s.status?.replace(/_/g,' '),value:Number(s.count)}))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                          {chartData.shipmentsByStatus.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v:number)=>fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-1.5">{chartData.shipmentsByStatus.map((s:any,i:number)=>(
                      <div key={s.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}} /><span className="capitalize text-gray-600">{s.status?.replace(/_/g,' ')}</span></div>
                        <span className="font-semibold text-gray-900">{fmt(s.count)}</span>
                      </div>
                    ))}</div>
                  </>) : <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">Belum ada data</div>}
                </div>
              </div>

              {/* ── Row 2: Carrier Performance (Bar) + Delivery Performance (Doughnut) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-0.5 flex items-center gap-2"><Building2 className="w-5 h-5 text-purple-500" />Performa Pengangkut</h3>
                  <p className="text-xs text-gray-400 mb-4">Pengangkut teratas berdasarkan jumlah pengiriman</p>
                  {chartData?.carrierPerformance?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData.carrierPerformance.map((c:any)=>({name:c.carrier_name?.length>12?c.carrier_name.slice(0,12)+'..':c.carrier_name,shipments:Number(c.shipments),revenue:Number(c.revenue)}))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={CLS} />
                        <YAxis yAxisId="l" tick={CLS} />
                        <YAxis yAxisId="r" orientation="right" tick={CLS} tickFormatter={(v:number)=>v>=1e6?`${(v/1e6).toFixed(0)}jt`:`${(v/1e3).toFixed(0)}rb`} />
                        <Tooltip formatter={(v:number,name:string)=>name==='revenue'?fmtRp(v):fmt(v)} />
                        <Legend />
                        <Bar yAxisId="l" dataKey="shipments" name="Shipments" fill="#6366F1" radius={[4,4,0,0]} />
                        <Bar yAxisId="r" dataKey="revenue" name="Revenue" fill="#10B981" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">Belum ada data</div>}
                </div>
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-0.5 flex items-center gap-2"><Target className="w-5 h-5 text-green-500" />Performa Pengiriman</h3>
                  <p className="text-xs text-gray-400 mb-4">Rasio pengiriman tepat waktu vs terlambat</p>
                  {chartData?.deliveryPerformance?.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={200}>
                        <PieChart>
                          <Pie data={chartData.deliveryPerformance.filter((d:any)=>d.perf!=='pending').map((d:any)=>({name:d.perf==='on_time'?'On Time':'Late',value:Number(d.count)}))} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={70} paddingAngle={3}>
                            {chartData.deliveryPerformance.filter((d:any)=>d.perf!=='pending').map((_:any,i:number)=><Cell key={i} fill={i===0?'#10B981':'#EF4444'} />)}
                          </Pie>
                          <Tooltip formatter={(v:number)=>fmt(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-3">
                        {chartData.deliveryPerformance.map((d:any)=>(
                          <div key={d.perf} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${d.perf==='on_time'?'bg-green-500':d.perf==='late'?'bg-red-500':'bg-gray-400'}`} />
                              <span className="text-sm capitalize text-gray-600">{d.perf==='on_time'?'Tepat Waktu':d.perf==='late'?'Terlambat':'Pending'}</span>
                            </div>
                            <span className="text-lg font-bold text-gray-900">{fmt(d.count)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Belum ada data</div>}
                </div>
              </div>

              {/* ── Row 3: Status & Billing Info Cards ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-indigo-500" />Status Pengiriman</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-2xl font-bold text-gray-700">{fmt(dashboard.shipments?.draft)}</p><p className="text-xs text-gray-500">Draft</p></div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg"><p className="text-2xl font-bold text-blue-700">{fmt(dashboard.shipments?.confirmed)}</p><p className="text-xs text-gray-500">Confirmed</p></div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg"><p className="text-2xl font-bold text-yellow-700">{fmt(dashboard.shipments?.in_transit)}</p><p className="text-xs text-gray-500">In Transit</p></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" />Penagihan</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-lg"><p className="text-2xl font-bold text-green-700">{fmtRp(dashboard.billing?.paid)}</p><p className="text-xs text-gray-500">Terbayar</p></div>
                    <div className="text-center p-3 bg-red-50 rounded-lg"><p className="text-2xl font-bold text-red-700">{fmtRp(dashboard.billing?.outstanding)}</p><p className="text-xs text-gray-500">Belum Terbayar</p></div>
                  </div>
                </div>
              </div>

              {/* ── Weight/Volume Trend (Line) ── */}
              {chartData?.weightByMonth?.length > 0 && (
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-0.5 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-500" />Volume Pengiriman</h3>
                  <p className="text-xs text-gray-400 mb-4">Berat (kg) & Koli — 12 bulan terakhir</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData.weightByMonth.map((w:any)=>({month:w.month?.slice(5),berat:Number(w.weight),koli:Number(w.pieces)}))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={CLS} />
                      <YAxis yAxisId="l" tick={CLS} tickFormatter={(v:number)=>v>=1e3?`${(v/1e3).toFixed(0)}k`:String(v)} />
                      <YAxis yAxisId="r" orientation="right" tick={CLS} />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="l" type="monotone" dataKey="berat" name="Berat (kg)" stroke="#6366F1" strokeWidth={2} dot={{r:3}} />
                      <Line yAxisId="r" type="monotone" dataKey="koli" name="Koli" stroke="#F59E0B" strokeWidth={2} dot={{r:3}} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── Recent Shipments ── */}
              {dashboard.recentShipments?.length > 0 && (
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">Pengiriman Terbaru</h3>
                  <div className="space-y-2">{dashboard.recentShipments.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{s.shipment_number}</span>
                        <span className="text-sm text-gray-500">{s.consignee_name || s.destination_name || '-'}</span>
                        {s.carrier_name && <span className="text-xs text-gray-400">via {s.carrier_name}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{fmtRp(s.total_charge)}</span>
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  ))}</div>
                </div>
              )}
            </div>
          )}

          {/* SHIPMENTS */}
          {!loading && tab === 'shipments' && (
            <div>
              <SectionHeader title="Daftar Pengiriman" onExport={() => handleExport('shipments')} onAdd={() => { setForm({ shipment_type: 'standard', priority: 'normal', status: 'draft' }); setModal('add-shipment'); }} addLabel="Buat Pengiriman" />
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {['','draft','confirmed','assigned','in_transit','delivered','cancelled'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {s ? s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : 'Semua'} {s ? `(${shipments.filter(sh => sh.status === s).length})` : `(${shipments.length})`}
                  </button>
                ))}
              </div>
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['No. Pengiriman','Tipe','Pengirim','Penerima','Tujuan','Berat','Pengangkut','Kendaraan','Total','Prioritas','Status'].map(h => <th key={h} className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{filteredShipments.length === 0 ? <tr><td colSpan={11} className="text-center py-8 text-gray-400">Belum ada pengiriman</td></tr> : filteredShipments.map(s => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium">{s.shipment_number}</td>
                      <td className="px-3 py-3 capitalize">{s.shipment_type}</td>
                      <td className="px-3 py-3">{s.shipper_name || '-'}</td>
                      <td className="px-3 py-3">{s.consignee_name || '-'}</td>
                      <td className="px-3 py-3 max-w-[150px] truncate">{s.destination_name || s.destination_address || '-'}</td>
                      <td className="px-3 py-3">{fmt(s.total_weight_kg)} kg</td>
                      <td className="px-3 py-3">{s.carrier_name || '-'}</td>
                      <td className="px-3 py-3">{s.vehicle_code || '-'}</td>
                      <td className="px-3 py-3 font-medium">{fmtRp(s.total_charge)}</td>
                      <td className="px-3 py-3"><StatusBadge status={s.priority} /></td>
                      <td className="px-3 py-3"><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* TRIPS */}
          {!loading && tab === 'trips' && (
            <div>
              <SectionHeader title="Daftar Perjalanan" onExport={() => handleExport('trips')} onAdd={() => { setForm({ trip_type: 'delivery', status: 'planned', shipment_ids: [] }); setModal('add-trip'); }} addLabel="Buat Perjalanan" />
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['No. Trip','Tipe','Kendaraan','Pengemudi','Rute','Rencana Mulai','Pengiriman','Terkirim','Jarak','Biaya','Status'].map(h => <th key={h} className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{trips.length === 0 ? <tr><td colSpan={11} className="text-center py-8 text-gray-400">Belum ada trip</td></tr> : trips.map(t => (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium">{t.trip_number}</td>
                      <td className="px-3 py-3 capitalize">{t.trip_type}</td>
                      <td className="px-3 py-3">{t.vehicle_code} ({t.license_plate})</td>
                      <td className="px-3 py-3">{t.driver_name}</td>
                      <td className="px-3 py-3">{t.route_name || '-'}</td>
                      <td className="px-3 py-3">{fmtDate(t.planned_start)}</td>
                      <td className="px-3 py-3">{t.total_shipments}</td>
                      <td className="px-3 py-3 text-green-600 font-medium">{t.delivered_shipments}</td>
                      <td className="px-3 py-3">{fmt(t.total_distance_km)} km</td>
                      <td className="px-3 py-3">{fmtRp(t.total_expense)}</td>
                      <td className="px-3 py-3"><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* CARRIERS */}
          {!loading && tab === 'carriers' && (
            <div>
              <SectionHeader title="Daftar Pengangkut" onExport={() => handleExport('carriers')} onAdd={() => { setForm({ carrier_type: 'external', payment_terms: 'net30' }); setModal('add-carrier'); }} addLabel="Tambah Pengangkut" />
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Kode','Nama','Tipe','Kontak','Telepon','Pengiriman','Peringkat','Ketepatan','Syarat','Status'].map(h => <th key={h} className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{carriers.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-gray-400">Belum ada pengangkut</td></tr> : carriers.map(c => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium">{c.carrier_code}</td>
                      <td className="px-3 py-3">{c.carrier_name}</td>
                      <td className="px-3 py-3 capitalize">{c.carrier_type}</td>
                      <td className="px-3 py-3">{c.contact_person || '-'}</td>
                      <td className="px-3 py-3">{c.phone || '-'}</td>
                      <td className="px-3 py-3">{c.shipment_count || 0}</td>
                      <td className="px-3 py-3">{Number(c.rating || 0).toFixed(1)}</td>
                      <td className="px-3 py-3">{Number(c.on_time_rate || 0).toFixed(0)}%</td>
                      <td className="px-3 py-3 uppercase text-xs">{c.payment_terms}</td>
                      <td className="px-3 py-3"><StatusBadge status={c.is_active ? 'active' : 'inactive'} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ROUTES */}
          {!loading && tab === 'routes' && (
            <div>
              <SectionHeader title="Daftar Rute" onAdd={() => { setForm({ route_type: 'one_way' }); setModal('add-route'); }} addLabel="Tambah Rute" />
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Kode','Nama','Asal','Tujuan','Jarak','Durasi','Tol','BBM Est.','Tipe'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{routes.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">Belum ada rute</td></tr> : routes.map(r => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{r.route_code}</td>
                      <td className="px-4 py-3">{r.route_name}</td>
                      <td className="px-4 py-3">{r.origin_name || '-'}</td>
                      <td className="px-4 py-3">{r.destination_name || '-'}</td>
                      <td className="px-4 py-3">{fmt(r.distance_km)} km</td>
                      <td className="px-4 py-3">{Number(r.estimated_duration_hours || 0).toFixed(1)} jam</td>
                      <td className="px-4 py-3">{fmtRp(r.toll_cost)}</td>
                      <td className="px-4 py-3">{fmtRp(r.fuel_estimate)}</td>
                      <td className="px-4 py-3 capitalize">{r.route_type?.replace(/_/g, ' ')}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* BILLING */}
          {!loading && tab === 'billing' && (
            <div>
              <SectionHeader title="Penagihan Pengiriman" onExport={() => handleExport('billing')} onAdd={() => { setForm({ bill_type: 'invoice_customer', currency: 'IDR', status: 'draft' }); setModal('add-bill'); }} addLabel="Buat Tagihan" />
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['No. Tagihan','Tipe','Tanggal','Jatuh Tempo','Customer/Carrier','Total','Terbayar','Sisa','Pembayaran','Status'].map(h => <th key={h} className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{freightBills.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-gray-400">Belum ada tagihan</td></tr> : freightBills.map(b => (
                    <tr key={b.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium">{b.bill_number}</td>
                      <td className="px-3 py-3 capitalize text-xs">{b.bill_type?.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-3">{fmtDate(b.bill_date)}</td>
                      <td className="px-3 py-3">{fmtDate(b.due_date)}</td>
                      <td className="px-3 py-3">{b.customer_name || b.carrier_name || '-'}</td>
                      <td className="px-3 py-3 font-medium">{fmtRp(b.total_amount)}</td>
                      <td className="px-3 py-3 text-green-600">{fmtRp(b.paid_amount)}</td>
                      <td className="px-3 py-3 text-red-600">{fmtRp(b.balance)}</td>
                      <td className="px-3 py-3"><StatusBadge status={b.payment_status} /></td>
                      <td className="px-3 py-3"><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ZONES */}
          {!loading && tab === 'zones' && (
            <div>
              <SectionHeader title="Zona Pengiriman" onAdd={() => { setForm({ zone_type: 'city' }); setModal('add-zone'); }} addLabel="Tambah Zona" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {zones.length === 0 ? <p className="text-gray-400 col-span-3 text-center py-8">Belum ada zona</p> : zones.map(z => (
                  <div key={z.id} className="bg-white rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{z.zone_code}</span>
                      <span className="text-xs text-gray-400 capitalize">{z.zone_type}</span>
                    </div>
                    <p className="text-sm text-gray-600">{z.zone_name}</p>
                    {z.cities?.length > 0 && <p className="text-xs text-gray-400 mt-1">{z.cities.slice(0,5).join(', ')}{z.cities.length > 5 ? ` +${z.cities.length-5}` : ''}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RATE CARDS */}
          {!loading && tab === 'rate-cards' && (
            <div>
              <SectionHeader title="Tarif Pengiriman" onAdd={() => { setForm({ rate_type: 'per_kg', service_type: 'standard' }); setModal('add-rate-card'); }} addLabel="Tambah Tarif" />
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Nama Tarif','Asal','Tujuan','Service','Kendaraan','Tipe Rate','Base Rate','Per Unit','Min. Charge','Berlaku'].map(h => <th key={h} className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{rateCards.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-gray-400">Belum ada tarif</td></tr> : rateCards.map(r => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium">{r.rate_name}</td>
                      <td className="px-3 py-3">{r.origin_zone_name || '-'}</td>
                      <td className="px-3 py-3">{r.dest_zone_name || '-'}</td>
                      <td className="px-3 py-3 capitalize">{r.service_type || '-'}</td>
                      <td className="px-3 py-3 capitalize">{r.vehicle_type || '-'}</td>
                      <td className="px-3 py-3 capitalize">{r.rate_type?.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-3">{fmtRp(r.base_rate)}</td>
                      <td className="px-3 py-3">{fmtRp(r.per_unit_rate)}</td>
                      <td className="px-3 py-3">{fmtRp(r.min_charge)}</td>
                      <td className="px-3 py-3 text-xs">{fmtDate(r.effective_from)} — {fmtDate(r.effective_to)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* WAREHOUSES */}
          {!loading && tab === 'warehouses' && (
            <div>
              <SectionHeader title="Gudang & Depot" onAdd={() => { setForm({ warehouse_type: 'depot' }); setModal('add-warehouse'); }} addLabel="Tambah Gudang" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouses.length === 0 ? <p className="text-gray-400 col-span-3 text-center py-8">Belum ada gudang</p> : warehouses.map(w => (
                  <div key={w.id} className="bg-white rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{w.warehouse_code}</span>
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full capitalize">{w.warehouse_type}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-700">{w.warehouse_name}</p>
                    <p className="text-xs text-gray-500 mt-1">{w.city}{w.province ? `, ${w.province}` : ''}</p>
                    {w.contact_person && <p className="text-xs text-gray-400 mt-1">{w.contact_person} · {w.phone}</p>}
                    {Number(w.capacity_m3) > 0 && <p className="text-xs text-gray-400">Kapasitas: {fmt(w.capacity_m3)} m³</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ DISPATCH ═══ */}
          {!loading && tab === 'dispatch' && (
            <div className="space-y-6">
              <SectionHeader title="Alur Kerja Pengiriman" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Package} label="Menunggu Pengiriman" value={fmt(dispatchQueue.filter((s: any) => s.status === 'confirmed').length)} color="yellow" />
                <StatCard icon={Send} label="Sudah Dikirim" value={fmt(dispatchQueue.filter((s: any) => s.status === 'dispatched' || s.status === 'in_transit').length)} color="blue" />
                <StatCard icon={CheckCircle} label="Selesai" value={fmt(dispatchQueue.filter((s: any) => s.status === 'delivered').length)} color="green" />
                <StatCard icon={Truck} label="Kendaraan Tersedia" value={fmt(fmsVehicles.filter((v: any) => v.status === 'available').length)} color="indigo" />
              </div>
              <div className="bg-white rounded-xl border overflow-x-auto">
                <div className="px-4 py-3 border-b bg-yellow-50"><h4 className="font-medium text-yellow-700 flex items-center gap-2"><Send className="w-4 h-4" />Pengiriman Siap Dikirim</h4></div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['No. Shipment','Penerima','Tujuan','Berat','Prioritas','Status','Aksi'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{dispatchQueue.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Tidak ada pengiriman menunggu</td></tr> : dispatchQueue.map((s: any) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{s.shipment_number}</td>
                      <td className="px-4 py-3">{s.consignee_name || '-'}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate">{s.destination_name || s.destination_address || '-'}</td>
                      <td className="px-4 py-3">{fmt(s.total_weight_kg)} kg</td>
                      <td className="px-4 py-3"><StatusBadge status={s.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3">
                        {(s.status === 'confirmed' || s.status === 'assigned') && (
                          <button onClick={() => { setForm({ shipment_id: s.id, shipment_number: s.shipment_number }); setModal('dispatch-assign'); }} className="text-xs text-indigo-600 hover:underline font-medium">Tugaskan & Kirim</button>
                        )}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ TRACKING ═══ */}
          {!loading && tab === 'tracking' && (
            <div className="space-y-6">
              <SectionHeader title="Pelacakan Pengiriman" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Activity} label="Sedang Dilacak" value={fmt(tracking.length)} color="indigo" />
                <StatCard icon={Navigation} label="Dalam Perjalanan" value={fmt(tracking.filter((t: any) => t.current_status === 'in_transit').length)} color="yellow" />
                <StatCard icon={CheckCircle} label="Terkirim" value={fmt(tracking.filter((t: any) => t.current_status === 'delivered').length)} color="green" />
                <StatCard icon={AlertCircle} label="Terlambat" value={fmt(tracking.filter((t: any) => t.is_delayed).length)} color="red" />
              </div>
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Pengiriman','Penerima','Tujuan','Status','Lokasi Terakhir','Pembaruan','ETA','Terlambat'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{tracking.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">Belum ada data tracking</td></tr> : tracking.map((t: any) => (
                    <tr key={t.id} className={`border-b hover:bg-gray-50 ${t.is_delayed ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 font-medium">{t.shipment_number}</td>
                      <td className="px-4 py-3">{t.consignee_name || '-'}</td>
                      <td className="px-4 py-3 max-w-[150px] truncate">{t.destination_name || '-'}</td>
                      <td className="px-4 py-3"><StatusBadge status={t.current_status} /></td>
                      <td className="px-4 py-3 text-xs">{t.current_location || '-'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{t.last_update ? new Date(t.last_update).toLocaleString('id-ID') : '-'}</td>
                      <td className="px-4 py-3 text-xs">{t.eta ? new Date(t.eta).toLocaleString('id-ID') : '-'}</td>
                      <td className="px-4 py-3">{t.is_delayed ? <span className="text-red-600 font-medium text-xs">Ya</span> : '-'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ CARRIER SCORES ═══ */}
          {!loading && tab === 'carrier-scores' && (
            <div className="space-y-6">
              <SectionHeader title="Penilaian Performa Pengangkut" />
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['#','Pengangkut','Pengiriman','Tepat Waktu %','Kerusakan %','Klaim','Biaya/kg','Peringkat','Skor','Nilai'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{carrierScores.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-gray-400">Belum ada data</td></tr> : carrierScores.map((c: any, i: number) => (
                    <tr key={c.carrier_id || i} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3"><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>{i+1}</span></td>
                      <td className="px-4 py-3 font-medium">{c.carrier_name}</td>
                      <td className="px-4 py-3">{fmt(c.total_shipments)}</td>
                      <td className="px-4 py-3"><span className={`font-medium ${Number(c.on_time_pct) >= 90 ? 'text-green-600' : Number(c.on_time_pct) >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{Number(c.on_time_pct).toFixed(1)}%</span></td>
                      <td className="px-4 py-3">{Number(c.damage_pct).toFixed(1)}%</td>
                      <td className="px-4 py-3">{fmt(c.claim_count)}</td>
                      <td className="px-4 py-3">{fmtRp(c.avg_cost_per_kg)}</td>
                      <td className="px-4 py-3">{Number(c.avg_rating).toFixed(1)}⭐</td>
                      <td className="px-4 py-3 font-bold text-indigo-700">{Number(c.overall_score).toFixed(0)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${Number(c.overall_score) >= 85 ? 'bg-green-100 text-green-700' : Number(c.overall_score) >= 70 ? 'bg-blue-100 text-blue-700' : Number(c.overall_score) >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{Number(c.overall_score) >= 85 ? 'A' : Number(c.overall_score) >= 70 ? 'B' : Number(c.overall_score) >= 50 ? 'C' : 'D'}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ DELIVERY SLA ═══ */}
          {!loading && tab === 'delivery-sla' && (
            <div className="space-y-6">
              <SectionHeader title="Manajemen SLA Pengiriman" onAdd={() => { setForm({ sla_type: 'delivery_time', priority: 'normal', target_hours: 24, penalty_type: 'percentage', penalty_value: 5 }); setModal('add-sla'); }} addLabel="Tambah SLA" />
              {slaPerformance && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Target} label="Total Pengiriman" value={fmt(slaPerformance.total_shipments)} color="indigo" />
                  <StatCard icon={CheckCircle} label="Tepat Waktu" value={fmt(slaPerformance.on_time)} color="green" sub={`${Number(slaPerformance.on_time_pct).toFixed(1)}%`} />
                  <StatCard icon={AlertCircle} label="Terlambat" value={fmt(slaPerformance.late)} color="red" sub={`${Number(slaPerformance.late_pct).toFixed(1)}%`} />
                  <StatCard icon={Clock} label="Avg Delivery (jam)" value={Number(slaPerformance.avg_delivery_hours).toFixed(1)} color="blue" />
                </div>
              )}
              <div className="bg-white rounded-xl border overflow-x-auto">
                <div className="px-4 py-3 border-b"><h4 className="font-medium text-gray-700">Aturan SLA</h4></div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Nama','Tipe','Service','Prioritas','Target (jam)','Penalti','Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{deliverySlas.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada SLA rule</td></tr> : deliverySlas.map((s: any) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{s.sla_name}</td>
                      <td className="px-4 py-3 capitalize">{s.sla_type?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 capitalize">{s.service_type || 'all'}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.priority || 'normal'} /></td>
                      <td className="px-4 py-3 font-medium">{s.max_delivery_hours || '-'}h</td>
                      <td className="px-4 py-3 text-xs">{Number(s.penalty_per_hour_late) > 0 ? `${fmtRp(s.penalty_per_hour_late)}/jam` : Number(s.penalty_per_day_late) > 0 ? `${fmtRp(s.penalty_per_day_late)}/hari` : '-'}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.is_active ? 'active' : 'draft'} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ LOGISTICS ANALYTICS ═══ */}
          {!loading && tab === 'logistics-analytics' && logisticsKpi && (
            <div className="space-y-6">
              <SectionHeader title="KPI & Analitik Logistik" />
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <StatCard icon={Package} label="Total Pengiriman" value={fmt(logisticsKpi.overview?.total_shipments)} color="indigo" />
                <StatCard icon={CheckCircle} label="Terkirim" value={fmt(logisticsKpi.overview?.delivered)} color="green" />
                <StatCard icon={DollarSign} label="Pendapatan" value={fmtRp(logisticsKpi.overview?.total_revenue)} color="emerald" />
                <StatCard icon={TrendingUp} label="On-Time %" value={`${Number(logisticsKpi.overview?.on_time_pct || 0).toFixed(1)}%`} color="blue" />
                <StatCard icon={Truck} label="Rata-rata Biaya/Pengiriman" value={fmtRp(logisticsKpi.overview?.avg_cost_per_shipment)} color="orange" />
                <StatCard icon={Clock} label="Avg Delivery (jam)" value={Number(logisticsKpi.overview?.avg_delivery_hours || 0).toFixed(1)} color="purple" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by Service - Doughnut Chart */}
                {logisticsKpi.revenueByService?.length > 0 && (
                  <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" />Pendapatan per Tipe Layanan</h4>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={200}>
                        <PieChart>
                          <Pie data={logisticsKpi.revenueByService.map((s:any)=>({name:s.service_type||'standard',value:Number(s.revenue||0)}))} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={70} paddingAngle={3}>
                            {logisticsKpi.revenueByService.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v:number)=>fmtRp(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">{logisticsKpi.revenueByService.map((s:any,i:number)=>(
                        <div key={s.service_type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}} /><span className="text-sm capitalize text-gray-600">{s.service_type||'standard'}</span></div>
                          <div className="text-right"><p className="text-sm font-semibold">{fmtRp(s.revenue)}</p><p className="text-xs text-gray-400">{s.count} shipment</p></div>
                        </div>
                      ))}</div>
                    </div>
                  </div>
                )}
                {/* Top Routes */}
                {logisticsKpi.topRoutes?.length > 0 && (
                  <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><Map className="w-4 h-4 text-blue-500" />Rute Teratas</h4>
                    {logisticsKpi.topRoutes.length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(160, logisticsKpi.topRoutes.length * 32)}>
                        <BarChart layout="vertical" data={logisticsKpi.topRoutes.map((r:any)=>({name:r.route_name?.length>15?r.route_name.slice(0,15)+'..':r.route_name,trips:Number(r.trip_count),km:Number(r.total_distance)}))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" tick={CLS} />
                          <YAxis type="category" dataKey="name" width={100} tick={{fontSize:11,fill:'#374151'}} />
                          <Tooltip />
                          <Bar dataKey="trips" name="Trips" fill="#6366F1" radius={[0,4,4,0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>
                )}
              </div>
              {/* Monthly Trend - Area Chart */}
              {logisticsKpi.monthlyTrend?.length > 0 && (
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h4 className="font-semibold text-gray-700 mb-0.5 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-500" />Trend Bulanan</h4>
                  <p className="text-xs text-gray-400 mb-4">Shipment, Revenue & On-Time Rate</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={logisticsKpi.monthlyTrend.map((m:any)=>({month:m.month?.slice(5),shipments:Number(m.shipments),revenue:Number(m.revenue),ontime:Number(m.on_time_pct||0)}))}>
                      <defs>
                        <linearGradient id="gKpiRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366F1" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={CLS} />
                      <YAxis yAxisId="l" tick={CLS} tickFormatter={(v:number)=>v>=1e6?`${(v/1e6).toFixed(0)}jt`:v>=1e3?`${(v/1e3).toFixed(0)}rb`:String(v)} />
                      <YAxis yAxisId="r" orientation="right" tick={CLS} domain={[0,100]} tickFormatter={(v:number)=>`${v}%`} />
                      <Tooltip formatter={(v:number,name:string)=>name==='Revenue'?fmtRp(v):name==='On-Time %'?`${Number(v).toFixed(1)}%`:fmt(v)} />
                      <Legend />
                      <Area yAxisId="l" type="monotone" dataKey="revenue" name="Revenue" stroke="#6366F1" fill="url(#gKpiRev)" strokeWidth={2} />
                      <Line yAxisId="l" type="monotone" dataKey="shipments" name="Shipments" stroke="#10B981" strokeWidth={2} dot={{r:3}} />
                      <Line yAxisId="r" type="monotone" dataKey="ontime" name="On-Time %" stroke="#F59E0B" strokeWidth={2} dot={{r:3}} strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-4 overflow-x-auto"><table className="w-full text-sm">
                    <thead><tr className="border-b">{['Bulan','Pengiriman','Terkirim','Pendapatan','Tepat Waktu %','Rata-rata Jam'].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
                    <tbody>{logisticsKpi.monthlyTrend.map((m: any) => (
                      <tr key={m.month} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{m.month}</td>
                        <td className="px-3 py-2">{fmt(m.shipments)}</td>
                        <td className="px-3 py-2 text-green-600">{fmt(m.delivered)}</td>
                        <td className="px-3 py-2 font-medium">{fmtRp(m.revenue)}</td>
                        <td className="px-3 py-2"><span className={`font-medium ${Number(m.on_time_pct) >= 90 ? 'text-green-600' : Number(m.on_time_pct) >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{Number(m.on_time_pct).toFixed(1)}%</span></td>
                        <td className="px-3 py-2">{Number(m.avg_hours).toFixed(1)}</td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal */}
        {modal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  {modal === 'add-shipment' ? 'Buat Pengiriman' : modal === 'add-trip' ? 'Buat Perjalanan' : modal === 'add-carrier' ? 'Tambah Pengangkut' : modal === 'add-route' ? 'Tambah Rute' : modal === 'add-bill' ? 'Buat Tagihan' : modal === 'add-zone' ? 'Tambah Zona' : modal === 'add-rate-card' ? 'Tambah Tarif' : modal === 'add-warehouse' ? 'Tambah Gudang' : modal === 'add-pod' ? 'Catat POD' : modal === 'add-sla' ? 'Tambah Aturan SLA' : modal === 'dispatch-assign' ? 'Tugaskan & Kirim' : 'Formulir'}
                </h3>
                <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3 overflow-y-auto flex-1">

                {modal === 'add-shipment' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.shipment_type || 'standard'} onChange={e => setForm({...form, shipment_type: e.target.value})}><option value="standard">Standard</option><option value="express">Express</option><option value="same_day">Same Day</option><option value="scheduled">Scheduled</option><option value="charter">Charter</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Prioritas</label><select className={inputCls} value={form.priority || 'normal'} onChange={e => setForm({...form, priority: e.target.value})}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Pengirim</label><input className={inputCls} value={form.shipper_name || ''} onChange={e => setForm({...form, shipper_name: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Telp Pengirim</label><input className={inputCls} value={form.shipper_phone || ''} onChange={e => setForm({...form, shipper_phone: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Penerima *</label><input required className={inputCls} value={form.consignee_name || ''} onChange={e => setForm({...form, consignee_name: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Telp Penerima</label><input className={inputCls} value={form.consignee_phone || ''} onChange={e => setForm({...form, consignee_phone: e.target.value})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Asal</label><input className={inputCls} value={form.origin_name || ''} onChange={e => setForm({...form, origin_name: e.target.value})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Tujuan *</label><input required className={inputCls} value={form.destination_name || ''} onChange={e => setForm({...form, destination_name: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Berat (kg)</label><input type="number" className={inputCls} value={form.total_weight_kg || ''} onChange={e => setForm({...form, total_weight_kg: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Jumlah Koli</label><input type="number" className={inputCls} value={form.total_pieces || ''} onChange={e => setForm({...form, total_pieces: parseInt(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Pengangkut</label><select className={inputCls} value={form.carrier_id || ''} onChange={e => setForm({...form, carrier_id: e.target.value})}><option value="">-</option>{carriers.map(c => <option key={c.id} value={c.id}>{c.carrier_name}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Biaya Pengiriman</label><input type="number" className={inputCls} value={form.freight_charge || ''} onChange={e => setForm({...form, freight_charge: parseFloat(e.target.value), total_charge: parseFloat(e.target.value)})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Deskripsi Barang</label><input className={inputCls} value={form.goods_description || ''} onChange={e => setForm({...form, goods_description: e.target.value})} /></div>
                  </div>
                </>}

                {modal === 'add-trip' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.trip_type || 'delivery'} onChange={e => setForm({...form, trip_type: e.target.value})}><option value="delivery">Delivery</option><option value="pickup">Pickup</option><option value="transfer">Transfer</option><option value="charter">Charter</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Rute</label><select className={inputCls} value={form.route_id || ''} onChange={e => setForm({...form, route_id: e.target.value})}><option value="">-</option>{routes.map(r => <option key={r.id} value={r.id}>{r.route_code} - {r.route_name}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Kendaraan *</label><select required className={inputCls} value={form.vehicle_id || ''} onChange={e => setForm({...form, vehicle_id: e.target.value})}><option value="">Pilih</option>{fmsVehicles.filter((v: any) => v.status === 'available').map((v: any) => <option key={v.id} value={v.id}>{v.vehicle_code} - {v.license_plate}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Pengemudi *</label><select required className={inputCls} value={form.driver_id || ''} onChange={e => setForm({...form, driver_id: e.target.value})}><option value="">Pilih</option>{fmsDrivers.filter((d: any) => d.availability === 'available').map((d: any) => <option key={d.id} value={d.id}>{d.driver_code} - {d.full_name}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Rencana Mulai</label><input type="datetime-local" className={inputCls} value={form.planned_start || ''} onChange={e => setForm({...form, planned_start: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Rencana Selesai</label><input type="datetime-local" className={inputCls} value={form.planned_end || ''} onChange={e => setForm({...form, planned_end: e.target.value})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Lokasi Awal</label><input className={inputCls} value={form.start_location || ''} onChange={e => setForm({...form, start_location: e.target.value})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Catatan</label><input className={inputCls} value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} /></div>
                  </div>
                </>}

                {modal === 'add-carrier' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Kode *</label><input required className={inputCls} value={form.carrier_code || ''} onChange={e => setForm({...form, carrier_code: e.target.value})} placeholder="CR-001" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Nama *</label><input required className={inputCls} value={form.carrier_name || ''} onChange={e => setForm({...form, carrier_name: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.carrier_type || 'external'} onChange={e => setForm({...form, carrier_type: e.target.value})}><option value="internal">Internal</option><option value="external">External</option><option value="third_party">Third Party</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Kontak</label><input className={inputCls} value={form.contact_person || ''} onChange={e => setForm({...form, contact_person: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Telepon</label><input className={inputCls} value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Email</label><input type="email" className={inputCls} value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Terms Pembayaran</label><select className={inputCls} value={form.payment_terms || 'net30'} onChange={e => setForm({...form, payment_terms: e.target.value})}><option value="cod">COD</option><option value="net7">Net 7</option><option value="net14">Net 14</option><option value="net30">Net 30</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">NPWP</label><input className={inputCls} value={form.npwp || ''} onChange={e => setForm({...form, npwp: e.target.value})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Alamat</label><input className={inputCls} value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} /></div>
                  </div>
                </>}

                {modal === 'add-route' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Kode *</label><input required className={inputCls} value={form.route_code || ''} onChange={e => setForm({...form, route_code: e.target.value})} placeholder="RT-001" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Nama *</label><input required className={inputCls} value={form.route_name || ''} onChange={e => setForm({...form, route_name: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Asal</label><input className={inputCls} value={form.origin_name || ''} onChange={e => setForm({...form, origin_name: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Tujuan</label><input className={inputCls} value={form.destination_name || ''} onChange={e => setForm({...form, destination_name: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Jarak (km)</label><input type="number" className={inputCls} value={form.distance_km || ''} onChange={e => setForm({...form, distance_km: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Durasi (jam)</label><input type="number" step="0.5" className={inputCls} value={form.estimated_duration_hours || ''} onChange={e => setForm({...form, estimated_duration_hours: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Biaya Tol</label><input type="number" className={inputCls} value={form.toll_cost || ''} onChange={e => setForm({...form, toll_cost: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.route_type || 'one_way'} onChange={e => setForm({...form, route_type: e.target.value})}><option value="one_way">One Way</option><option value="round_trip">Round Trip</option><option value="multi_stop">Multi Stop</option></select></div>
                  </div>
                </>}

                {modal === 'add-bill' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.bill_type || 'invoice_customer'} onChange={e => setForm({...form, bill_type: e.target.value})}><option value="invoice_customer">Invoice Customer</option><option value="invoice_carrier">Invoice Carrier</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Jatuh Tempo</label><input type="date" className={inputCls} value={form.due_date || ''} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">{form.bill_type === 'invoice_carrier' ? 'Carrier' : 'Customer'}</label><input className={inputCls} value={form.customer_name || ''} onChange={e => setForm({...form, customer_name: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Subtotal *</label><input required type="number" className={inputCls} value={form.subtotal || ''} onChange={e => { const s = parseFloat(e.target.value); setForm({...form, subtotal: s, total_amount: s + (parseFloat(form.tax_amount)||0) - (parseFloat(form.discount_amount)||0) }); }} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Pajak</label><input type="number" className={inputCls} value={form.tax_amount || ''} onChange={e => setForm({...form, tax_amount: parseFloat(e.target.value), total_amount: (parseFloat(form.subtotal)||0) + parseFloat(e.target.value) - (parseFloat(form.discount_amount)||0) })} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Diskon</label><input type="number" className={inputCls} value={form.discount_amount || ''} onChange={e => setForm({...form, discount_amount: parseFloat(e.target.value), total_amount: (parseFloat(form.subtotal)||0) + (parseFloat(form.tax_amount)||0) - parseFloat(e.target.value) })} /></div>
                    <div className="col-span-2 bg-indigo-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold text-indigo-700">{fmtRp(form.total_amount || 0)}</p></div>
                  </div>
                </>}

                {modal === 'add-zone' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Kode *</label><input required className={inputCls} value={form.zone_code || ''} onChange={e => setForm({...form, zone_code: e.target.value})} placeholder="JKT" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Nama *</label><input required className={inputCls} value={form.zone_name || ''} onChange={e => setForm({...form, zone_name: e.target.value})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.zone_type || 'city'} onChange={e => setForm({...form, zone_type: e.target.value})}><option value="city">Kota</option><option value="province">Provinsi</option><option value="region">Region</option><option value="country">Negara</option><option value="custom">Custom</option></select></div>
                  </div>
                </>}

                {modal === 'add-rate-card' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Nama Tarif *</label><input required className={inputCls} value={form.rate_name || ''} onChange={e => setForm({...form, rate_name: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Zona Asal</label><select className={inputCls} value={form.origin_zone_id || ''} onChange={e => setForm({...form, origin_zone_id: e.target.value})}><option value="">-</option>{zones.map(z => <option key={z.id} value={z.id}>{z.zone_code} - {z.zone_name}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Zona Tujuan</label><select className={inputCls} value={form.destination_zone_id || ''} onChange={e => setForm({...form, destination_zone_id: e.target.value})}><option value="">-</option>{zones.map(z => <option key={z.id} value={z.id}>{z.zone_code} - {z.zone_name}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Service</label><select className={inputCls} value={form.service_type || 'standard'} onChange={e => setForm({...form, service_type: e.target.value})}><option value="standard">Standard</option><option value="express">Express</option><option value="same_day">Same Day</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Rate Type</label><select className={inputCls} value={form.rate_type || 'per_kg'} onChange={e => setForm({...form, rate_type: e.target.value})}><option value="per_kg">Per Kg</option><option value="per_m3">Per m³</option><option value="per_piece">Per Koli</option><option value="per_trip">Per Trip</option><option value="per_km">Per Km</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Base Rate</label><input type="number" className={inputCls} value={form.base_rate || ''} onChange={e => setForm({...form, base_rate: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Per Unit Rate</label><input type="number" className={inputCls} value={form.per_unit_rate || ''} onChange={e => setForm({...form, per_unit_rate: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Min. Charge</label><input type="number" className={inputCls} value={form.min_charge || ''} onChange={e => setForm({...form, min_charge: parseFloat(e.target.value)})} /></div>
                  </div>
                </>}

                {modal === 'add-warehouse' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Kode *</label><input required className={inputCls} value={form.warehouse_code || ''} onChange={e => setForm({...form, warehouse_code: e.target.value})} placeholder="WH-JKT" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Nama *</label><input required className={inputCls} value={form.warehouse_name || ''} onChange={e => setForm({...form, warehouse_name: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.warehouse_type || 'depot'} onChange={e => setForm({...form, warehouse_type: e.target.value})}><option value="hub">Hub</option><option value="depot">Depot</option><option value="cross_dock">Cross Dock</option><option value="distribution_center">Distribution Center</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Kota</label><input className={inputCls} value={form.city || ''} onChange={e => setForm({...form, city: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Provinsi</label><input className={inputCls} value={form.province || ''} onChange={e => setForm({...form, province: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Kontak</label><input className={inputCls} value={form.contact_person || ''} onChange={e => setForm({...form, contact_person: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Telepon</label><input className={inputCls} value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Kapasitas (m³)</label><input type="number" className={inputCls} value={form.capacity_m3 || ''} onChange={e => setForm({...form, capacity_m3: parseFloat(e.target.value)})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Alamat</label><input className={inputCls} value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} /></div>
                  </div>
                </>}

                {modal === 'add-sla' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Nama SLA *</label><input required className={inputCls} value={form.sla_name || ''} onChange={e => setForm({...form, sla_name: e.target.value})} placeholder="Standard Delivery 24h" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.sla_type || 'delivery_time'} onChange={e => setForm({...form, sla_type: e.target.value})}><option value="delivery_time">Delivery Time</option><option value="pickup_time">Pickup Time</option><option value="response_time">Response Time</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Service</label><select className={inputCls} value={form.service_type || ''} onChange={e => setForm({...form, service_type: e.target.value})}><option value="">Semua</option><option value="standard">Standard</option><option value="express">Express</option><option value="same_day">Same Day</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Prioritas</label><select className={inputCls} value={form.priority || 'normal'} onChange={e => setForm({...form, priority: e.target.value})}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Target (jam) *</label><input required type="number" className={inputCls} value={form.target_hours || 24} onChange={e => setForm({...form, target_hours: parseInt(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe Penalti</label><select className={inputCls} value={form.penalty_type || 'percentage'} onChange={e => setForm({...form, penalty_type: e.target.value})}><option value="percentage">Persentase</option><option value="fixed">Nominal Tetap</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Nilai Penalti</label><input type="number" step="0.01" className={inputCls} value={form.penalty_value || 5} onChange={e => setForm({...form, penalty_value: parseFloat(e.target.value)})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Deskripsi</label><input className={inputCls} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} /></div>
                  </div>
                </>}

                {modal === 'dispatch-assign' && <>
                  <div className="space-y-3">
                    <div className="bg-indigo-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">Pengiriman</p>
                      <p className="text-lg font-bold text-indigo-700">{form.shipment_number}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs font-medium text-gray-600">Kendaraan *</label><select required className={inputCls} value={form.vehicle_id || ''} onChange={e => setForm({...form, vehicle_id: e.target.value})}><option value="">Pilih</option>{fmsVehicles.filter((v: any) => v.status === 'available').map((v: any) => <option key={v.id} value={v.id}>{v.vehicle_code} - {v.license_plate}</option>)}</select></div>
                      <div><label className="text-xs font-medium text-gray-600">Pengemudi *</label><select required className={inputCls} value={form.driver_id || ''} onChange={e => setForm({...form, driver_id: e.target.value})}><option value="">Pilih</option>{fmsDrivers.filter((d: any) => d.availability === 'available').map((d: any) => <option key={d.id} value={d.id}>{d.driver_code} - {d.full_name}</option>)}</select></div>
                      <div><label className="text-xs font-medium text-gray-600">Rencana Mulai</label><input type="datetime-local" className={inputCls} value={form.planned_start || ''} onChange={e => setForm({...form, planned_start: e.target.value})} /></div>
                      <div><label className="text-xs font-medium text-gray-600">ETA</label><input type="datetime-local" className={inputCls} value={form.eta || ''} onChange={e => setForm({...form, eta: e.target.value})} /></div>
                      <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Catatan</label><input className={inputCls} value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} /></div>
                    </div>
                  </div>
                </>}

                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button type="button" onClick={() => setModal(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Batal</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
