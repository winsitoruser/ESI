/**
 * SFA Sales Management Module
 *
 * Modul terpadu untuk Manajemen Penjualan pada industri Retail/FMCG/Direct Sales.
 *
 * Sub-tabs:
 *   1. Dashboard       — ringkasan penjualan aktual vs target + trend
 *   2. Entry           — input penjualan terupdated (manual/bulk, import field orders)
 *   3. Vs Target       — Global · Per Item · Per Product Group · Per Outlet · Per Sales
 *   4. Outlet Growth   — outlet transaksi, target pertumbuhan outlet, coverage
 *   5. Target Config   — CRUD target item/group dan target pertumbuhan outlet
 *
 * Konsumsi API:
 *   /api/hq/sfa/sales-management?action=...
 */
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  Plus, X, Save, Target as TargetIcon, TrendingUp, TrendingDown, Store, Package,
  Users, Filter, RefreshCw, Download, Upload, ShoppingBag, Layers,
  CheckCircle2, AlertTriangle, Trash2, Edit2, BarChart2, FileSpreadsheet,
  FileDown, FileUp, Percent, Eye,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell, ComposedChart,
} from 'recharts';
import { Activity, Award, Trophy, Crown, Globe, MapPin, Info, Zap, Link2, ShieldCheck, Settings as SettingsIcon } from 'lucide-react';
import SalespersonPicker, { SalespersonOption } from './SalespersonPicker';

type Props = {
  /** Formatter mata uang yang disediakan parent (ikut setting currency user) */
  fmtCur: (n: number) => string;
  /** Formatter tanggal */
  fmtDate: (d: string) => string;
  /** Formatter angka */
  fmtNum: (n: number) => string;
  /** Role-aware flag utk tombol manager-only */
  canManage: boolean;
};

type SubTab = 'dashboard' | 'entry' | 'vs-target' | 'outlet' | 'analytics' | 'target-config';
type VsTargetTab = 'global' | 'product' | 'group' | 'outlet' | 'salesperson';
type TargetCfgTab = 'item' | 'outlet-growth';
type AnalyticsTab = 'pareto' | 'performance' | 'leaderboard' | 'scorecard' | 'advanced' | 'insights';
type ParetoDim = 'outlet' | 'product' | 'salesperson';
type PerformanceDim = 'branch' | 'territory' | 'team';

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#14b8a6', '#f97316', '#6366f1', '#a855f7'];

const OUTLET_CLASSES = ['A', 'B', 'C', 'D'];

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function pct(n: any): string {
  const v = parseFloat(n);
  if (!Number.isFinite(v)) return '-';
  return `${v.toFixed(1)}%`;
}

// ────────────────────────────────────────────────────────────────
// Small UI primitives (keep consistent with parent page styling)
// ────────────────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant = 'primary', icon: Icon, disabled }: any) => {
  const variants: Record<string, string> = {
    primary: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700',
    secondary: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
    danger: 'bg-red-50 text-red-700 border border-red-100 hover:bg-red-100',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100',
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary}`}
    >
      {Icon ? <Icon className="w-4 h-4" /> : null}
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

const StatCard = ({
  label, value, sub, icon: Icon, color = 'amber', trend,
}: any) => {
  const colors: Record<string, string> = {
    amber: 'from-amber-50 to-orange-50 text-amber-700 border-amber-100',
    blue: 'from-blue-50 to-indigo-50 text-blue-700 border-blue-100',
    emerald: 'from-emerald-50 to-teal-50 text-emerald-700 border-emerald-100',
    purple: 'from-purple-50 to-fuchsia-50 text-purple-700 border-purple-100',
    red: 'from-red-50 to-rose-50 text-red-700 border-red-100',
  };
  return (
    <div className={`rounded-2xl p-4 border bg-gradient-to-br ${colors[color] || colors.amber}`}>
      <div className="flex justify-between items-start">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        {Icon ? <Icon className="w-4 h-4 opacity-70" /> : null}
      </div>
      <p className="text-xl font-extrabold text-gray-900 mt-2">{value}</p>
      {sub ? <p className="text-[11px] text-gray-500 mt-1">{sub}</p> : null}
      {trend !== undefined && Number.isFinite(trend) ? (
        <div className={`inline-flex items-center gap-1 mt-2 text-[11px] font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend.toFixed(1)}%
        </div>
      ) : null}
    </div>
  );
};

const AchievementBar = ({ actual, target }: { actual: number; target: number }) => {
  const pctValue = target > 0 ? Math.min((actual / target) * 100, 150) : 0;
  const barWidth = Math.min(pctValue, 100);
  const color =
    pctValue >= 100 ? 'bg-emerald-500'
    : pctValue >= 75 ? 'bg-amber-500'
    : pctValue >= 50 ? 'bg-orange-500'
    : 'bg-red-500';
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1 text-[11px]">
        <span className="font-semibold text-gray-700">{pctValue.toFixed(1)}%</span>
        {pctValue > 100 && <span className="text-emerald-600 font-semibold">+{(pctValue - 100).toFixed(1)}%</span>}
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
        <div className={`h-full ${color} transition-all`} style={{ width: `${barWidth}%` }} />
        {pctValue > 100 && (
          <div className="absolute inset-y-0 left-0 w-full border-r-2 border-gray-400" />
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, subtitle }: any) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
      <Icon className="w-7 h-7 text-gray-300" />
    </div>
    <p className="text-sm font-medium text-gray-500">{title}</p>
    {subtitle ? <p className="text-xs text-gray-400 mt-1">{subtitle}</p> : null}
  </div>
);

const inputCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all';

// ────────────────────────────────────────────────────────────────
// API helper
// ────────────────────────────────────────────────────────────────
async function apiSM(action: string, method: string = 'GET', body?: any, query: string = '') {
  const res = await fetch(`/api/hq/sfa/sales-management?action=${action}${query ? `&${query}` : ''}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────
export default function SalesManagementModule({ fmtCur, fmtDate, fmtNum, canManage }: Props) {
  const { t } = useTranslation();
  const m = useCallback(
    (key: string, params?: Record<string, string | number>) => t(`sfa.salesMgmt.${key}` as any, params),
    [t]
  );
  const salesTypes = useMemo(
    () =>
      [
        { value: 'primary', label: m('salesTypePrimary') },
        { value: 'secondary', label: m('salesTypeSecondary') },
        { value: 'direct', label: m('salesTypeDirect') },
      ] as Array<{ value: string; label: string }>,
    [m]
  );
  const outletChannels = useMemo(
    () =>
      [
        { value: 'modern_trade', label: m('chModern') },
        { value: 'general_trade', label: m('chGeneral') },
        { value: 'horeca', label: m('chHoreca') },
        { value: 'ecommerce', label: m('chEcom') },
        { value: 'wholesale', label: m('chWholesale') },
      ] as Array<{ value: string; label: string }>,
    [m]
  );

  const [subTab, setSubTab] = useState<SubTab>('dashboard');
  const [period, setPeriod] = useState<string>(currentPeriod());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Data states
  const [dashboard, setDashboard] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [entryFilters, setEntryFilters] = useState<any>({ period: currentPeriod() });

  // VS Target states
  const [vsTab, setVsTab] = useState<VsTargetTab>('global');
  const [vsGlobal, setVsGlobal] = useState<any>(null);
  const [vsProduct, setVsProduct] = useState<any[]>([]);
  const [vsGroup, setVsGroup] = useState<any[]>([]);
  const [vsOutlet, setVsOutlet] = useState<any[]>([]);
  const [vsSales, setVsSales] = useState<any[]>([]);

  // Outlet states
  const [outletCoverage, setOutletCoverage] = useState<any>(null);
  const [outletTrx, setOutletTrx] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any>(null);
  const [distPerProduct, setDistPerProduct] = useState<any[]>([]);

  // Analytics states
  const [anaTab, setAnaTab] = useState<AnalyticsTab>('insights');
  const [paretoDim, setParetoDim] = useState<ParetoDim>('outlet');
  const [paretoData, setParetoData] = useState<{ rows: any[]; summary: any } | null>(null);
  const [perfDim, setPerfDim] = useState<PerformanceDim>('branch');
  const [perfData, setPerfData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [advKpis, setAdvKpis] = useState<any>(null);
  const [growthTrend, setGrowthTrend] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any>(null);
  const [scorecardSpId, setScorecardSpId] = useState<string>('');
  /** MTD/YTD, Pareto+target, perilaku order outlet */
  const [insightsMtd, setInsightsMtd] = useState<any>(null);
  const [paretoTarget, setParetoTarget] = useState<{ rows: any[]; summary: any } | null>(null);
  const [orderBehavior, setOrderBehavior] = useState<any>(null);

  // Target Config states
  const [cfgTab, setCfgTab] = useState<TargetCfgTab | 'integration'>('item');
  const [itemTargets, setItemTargets] = useState<any[]>([]);
  const [growthTargets, setGrowthTargets] = useState<any[]>([]);

  // Integration config + health
  const [integrationConfig, setIntegrationConfig] = useState<any>({
    require_inventory_for_physical_targets: true,
    require_inventory_for_physical_entries: true,
    allow_non_physical_without_inventory: true,
    auto_decrement_stock: true,
    allow_negative_stock: false,
    auto_snapshot_stock_on_target: true,
    require_hris_for_salespersons: true,
    require_hris_for_sp_targets: false,
    auto_sync_on_field_orders: true,
    hris_sales_departments: ['Sales', 'Marketing', 'Field Force'],
    link_outlet_to_crm_customer: true,
  });
  const [integrationHealth, setIntegrationHealth] = useState<any>(null);

  // Modal states
  const [modal, setModal] = useState<'' | 'entry' | 'bulk' | 'import' | 'item-target' | 'growth-target' | 'csv-import' | 'drilldown'>('');
  const [csvText, setCsvText] = useState<string>('');
  const [csvImportResult, setCsvImportResult] = useState<any>(null);
  const [drillCtx, setDrillCtx] = useState<{ title: string; outlet_id?: any; product_id?: any; salesperson_id?: any; product_group?: string } | null>(null);
  const [drillRows, setDrillRows] = useState<any[]>([]);
  const [drillSummary, setDrillSummary] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [bulkRows, setBulkRows] = useState<any[]>([{}]);
  const [bulkSharedSp, setBulkSharedSp] = useState<SalespersonOption | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load data per tab ──
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const r = await apiSM('sales-dashboard', 'GET', undefined, `period=${period}`);
    if (r.success) setDashboard(r.data);
    setLoading(false);
  }, [period]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const qs = Object.entries(entryFilters)
      .filter(([, v]) => v !== '' && v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    const r = await apiSM('sales-entries', 'GET', undefined, qs);
    if (r.success) setEntries(r.data || []);
    setLoading(false);
  }, [entryFilters]);

  const loadFilters = useCallback(async () => {
    const r = await apiSM('lookup-filters');
    if (r.success) setFilters(r.data);
  }, []);

  const loadVsTarget = useCallback(async (which: VsTargetTab) => {
    setLoading(true);
    const action = `vs-target-${which === 'group' ? 'product-group' : which === 'salesperson' ? 'salesperson' : which}`;
    const r = await apiSM(action, 'GET', undefined, `period=${period}`);
    if (r.success) {
      if (which === 'global') setVsGlobal(r.data);
      else if (which === 'product') setVsProduct(r.data || []);
      else if (which === 'group') setVsGroup(r.data || []);
      else if (which === 'outlet') setVsOutlet(r.data || []);
      else if (which === 'salesperson') setVsSales(r.data || []);
    }
    setLoading(false);
  }, [period]);

  const loadOutletData = useCallback(async () => {
    setLoading(true);
    const [cov, trx, dist, distProd] = await Promise.all([
      apiSM('outlet-coverage', 'GET', undefined, `period=${period}`),
      apiSM('outlet-transactions', 'GET', undefined, `period=${period}`),
      apiSM('distribution', 'GET', undefined, `period=${period}`),
      apiSM('distribution-per-product', 'GET', undefined, `period=${period}&limit=30`),
    ]);
    if (cov.success) setOutletCoverage(cov.data);
    if (trx.success) setOutletTrx(trx.data || []);
    if (dist.success) setDistribution(dist.data);
    if (distProd.success) setDistPerProduct(distProd.data || []);
    setLoading(false);
  }, [period]);

  const openDrillDown = useCallback(async (ctx: { title: string; outlet_id?: any; product_id?: any; salesperson_id?: any; product_group?: string }) => {
    setDrillCtx(ctx);
    setModal('drilldown');
    setDrillRows([]); setDrillSummary(null);
    const qs = new URLSearchParams({ period });
    if (ctx.outlet_id) qs.set('outlet_id', String(ctx.outlet_id));
    if (ctx.product_id) qs.set('product_id', String(ctx.product_id));
    if (ctx.salesperson_id) qs.set('salesperson_id', String(ctx.salesperson_id));
    if (ctx.product_group) qs.set('product_group', ctx.product_group);
    const r = await apiSM('entries-drilldown', 'GET', undefined, qs.toString());
    if (r.success) { setDrillRows(r.data || []); setDrillSummary(r.summary); }
    else showToast('error', r.message || m('toastLoadDetailFail'));
  }, [period, m]);

  const downloadCsvTemplate = () => {
    window.open('/api/hq/sfa/sales-management?action=csv-template', '_blank');
  };

  const exportCsv = () => {
    const qs = new URLSearchParams({ action: 'export-csv', include_all: '1' });
    const ef = entryFilters;
    if (ef.period) qs.set('period', ef.period);
    else qs.set('period', period);
    if (ef.sales_type) qs.set('sales_type', ef.sales_type);
    if (ef.product_group) qs.set('product_group', ef.product_group);
    if (ef.outlet_channel) qs.set('outlet_channel', ef.outlet_channel);
    if (ef.salesperson_id) qs.set('salesperson_id', ef.salesperson_id);
    if (filters.sales_type && !ef.sales_type) qs.set('sales_type', filters.sales_type);
    if (filters.salesperson_id && !ef.salesperson_id) qs.set('salesperson_id', filters.salesperson_id);
    window.open(`/api/hq/sfa/sales-management?${qs.toString()}`, '_blank');
  };

  const submitCsvImport = async () => {
    if (!csvText.trim()) return showToast('error', m('toastPasteCsv'));
    const r = await apiSM('import-csv', 'POST', { csv: csvText });
    if (r.success) {
      setCsvImportResult({ inserted: r.inserted, errors: r.errors || [] });
      showToast('success', r.message || m('toastImportDone'));
      loadEntries();
    } else showToast('error', r.message || m('toastImportFail'));
  };

  const onCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ''));
    reader.readAsText(file);
  };

  const loadItemTargets = useCallback(async () => {
    const r = await apiSM('item-targets', 'GET', undefined, `period=${period}`);
    if (r.success) setItemTargets(r.data || []);
  }, [period]);

  const loadGrowthTargets = useCallback(async () => {
    const r = await apiSM('outlet-growth-targets', 'GET', undefined, `period=${period}`);
    if (r.success) setGrowthTargets(r.data || []);
  }, [period]);

  const loadIntegrationConfig = useCallback(async () => {
    const r = await apiSM('integration-config', 'GET');
    if (r.success) {
      setIntegrationConfig(r.data);
      if (r.health) setIntegrationHealth(r.health);
    }
  }, []);

  const saveIntegrationConfig = useCallback(async (patch: any) => {
    const r = await apiSM('update-integration-config', 'POST', { ...integrationConfig, ...patch });
    if (r.success) {
      setIntegrationConfig(r.data);
      showToast('success', r.message || m('toastConfigSaved'));
    } else {
      showToast('error', r.error || m('toastConfigFail'));
    }
  }, [integrationConfig, m]);

  const loadPareto = useCallback(async (dim: ParetoDim) => {
    setLoading(true);
    const action = dim === 'outlet' ? 'pareto-outlets' : dim === 'product' ? 'pareto-products' : 'pareto-salespersons';
    const r = await apiSM(action, 'GET', undefined, `period=${period}`);
    if (r.success) setParetoData({ rows: r.rows || [], summary: r.summary || {} });
    setLoading(false);
  }, [period]);

  const loadPerformance = useCallback(async (dim: PerformanceDim) => {
    setLoading(true);
    const action = `performance-${dim}`;
    const r = await apiSM(action, 'GET', undefined, `period=${period}`);
    if (r.success) setPerfData(r);
    setLoading(false);
  }, [period]);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    const r = await apiSM('leaderboard', 'GET', undefined, `period=${period}&limit=10`);
    if (r.success) setLeaderboard(r);
    setLoading(false);
  }, [period]);

  const loadScorecard = useCallback(async () => {
    setLoading(true);
    const qs = scorecardSpId ? `period=${period}&salesperson_id=${scorecardSpId}` : `period=${period}`;
    const r = await apiSM('salesperson-scorecard', 'GET', undefined, qs);
    if (r.success) setScorecards(r.data || []);
    setLoading(false);
  }, [period, scorecardSpId]);

  const loadAdvancedKpis = useCallback(async () => {
    setLoading(true);
    const [kpi, growth, funnel] = await Promise.all([
      apiSM('advanced-kpis', 'GET', undefined, `period=${period}`),
      apiSM('growth-analysis', 'GET', undefined, `period=${period}&months=12`),
      apiSM('sales-funnel', 'GET', undefined, `period=${period}`),
    ]);
    if (kpi.success) setAdvKpis(kpi.data);
    if (growth.success) setGrowthTrend(growth.data || []);
    if (funnel.success) setFunnelData(funnel.data);
    setLoading(false);
  }, [period]);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    const [mtd, pt, ob] = await Promise.all([
      apiSM('mtd-ytd-run', 'GET', undefined, `period=${period}`),
      apiSM('pareto-product-target', 'GET', undefined, `period=${period}&limit=60`),
      apiSM('outlet-order-behavior', 'GET', undefined, `period=${period}`),
    ]);
    if (mtd.success) setInsightsMtd(mtd.data);
    if (pt.success) setParetoTarget({ rows: pt.rows || [], summary: pt.summary || {} });
    if (ob.success) setOrderBehavior(ob.data);
    setLoading(false);
  }, [period]);

  useEffect(() => { loadFilters(); }, [loadFilters]);

  useEffect(() => {
    if (subTab === 'dashboard') loadDashboard();
    else if (subTab === 'entry') loadEntries();
    else if (subTab === 'vs-target') loadVsTarget(vsTab);
    else if (subTab === 'outlet') loadOutletData();
    else if (subTab === 'analytics') {
      if (anaTab === 'pareto') loadPareto(paretoDim);
      else if (anaTab === 'performance') loadPerformance(perfDim);
      else if (anaTab === 'leaderboard') loadLeaderboard();
      else if (anaTab === 'scorecard') loadScorecard();
      else if (anaTab === 'advanced') loadAdvancedKpis();
      else if (anaTab === 'insights') loadInsights();
    }
    else if (subTab === 'target-config') {
      if (cfgTab === 'item') loadItemTargets();
      else if (cfgTab === 'outlet-growth') loadGrowthTargets();
      else if (cfgTab === 'integration') loadIntegrationConfig();
    }
  }, [subTab, vsTab, cfgTab, anaTab, paretoDim, perfDim, period, loadDashboard, loadEntries, loadVsTarget, loadOutletData, loadItemTargets, loadGrowthTargets, loadIntegrationConfig, loadPareto, loadPerformance, loadLeaderboard, loadScorecard, loadAdvancedKpis, loadInsights]);

  useEffect(() => { loadIntegrationConfig(); }, [loadIntegrationConfig]);

  // ── Handlers ──
  const submitEntry = async () => {
    if (!form.entry_date || !form.product_name) {
      return showToast('error', m('toastDateProductRequired'));
    }
    const { _selectedItem, ...payload } = form;
    const r = await apiSM('create-sales-entry', 'POST', payload);
    if (r.success) {
      showToast('success', r.message || m('toastSaved'));
      setModal(''); setForm({});
      loadEntries();
    } else showToast('error', r.error || r.message || m('toastFail'));
  };

  const submitBulk = async () => {
    const validRows = bulkRows.filter(r => r.entry_date && r.product_name);
    if (validRows.length === 0) return showToast('error', m('toastNoValidRows'));
    const r = await apiSM('bulk-sales-entry', 'POST', { entries: validRows });
    if (r.success) {
      showToast('success', r.message || m('toastRowsSaved', { n: r.inserted }));
      setModal(''); setBulkRows([{}]);
      loadEntries();
    } else showToast('error', r.error || m('toastFail'));
  };

  const submitImport = async () => {
    const r = await apiSM('import-from-field-orders', 'POST', { period });
    if (r.success) {
      showToast('success', r.message || m('toastImportDone'));
      setModal('');
      loadEntries();
      loadDashboard();
    } else showToast('error', r.error || m('toastFail'));
  };

  const deleteEntry = async (id: string) => {
    if (!confirm(m('confirmDeleteEntry'))) return;
    const r = await apiSM('delete-sales-entry', 'DELETE', undefined, `id=${id}`);
    if (r.success) { showToast('success', m('toastDeleted')); loadEntries(); }
    else showToast('error', r.error || m('toastFail'));
  };

  const submitItemTarget = async () => {
    if (!form.name || !form.period || (!form.target_value && !form.target_quantity)) {
      return showToast('error', m('toastTargetFields'));
    }

    // Client-side guard (server also enforces)
    const it = form.item_type || 'product';
    const isPhysical = it === 'product' || it === 'bundle';
    if (form.target_level === 'product'
      && isPhysical
      && integrationConfig?.require_inventory_for_physical_targets
      && !form.inventory_product_id) {
      return showToast('error', m('toastPhysicalInventory'));
    }
    if (form.scope_type === 'salesperson'
      && integrationConfig?.require_hris_for_sp_targets
      && !form.hris_employee_id) {
      return showToast('error', m('toastSpHrisRequired'));
    }

    const { _selectedItem, _selectedSp, ...payload } = form;
    const action = form.id ? 'update-item-target' : 'create-item-target';
    const method = form.id ? 'PUT' : 'POST';
    const r = await apiSM(action, method, payload);
    if (r.success) {
      showToast('success', r.message || m('toastSaved'));
      setModal(''); setForm({});
      loadItemTargets();
    } else showToast('error', r.error || m('toastFail'));
  };

  const deleteItemTarget = async (id: string) => {
    if (!confirm(m('confirmDeleteTarget'))) return;
    const r = await apiSM('delete-item-target', 'DELETE', undefined, `id=${id}`);
    if (r.success) { showToast('success', m('toastDeleted')); loadItemTargets(); }
    else showToast('error', r.error || m('toastFail'));
  };

  const submitGrowthTarget = async () => {
    if (!form.name || !form.period) return showToast('error', m('toastNamePeriodRequired'));
    const action = form.id ? 'update-outlet-growth-target' : 'create-outlet-growth-target';
    const method = form.id ? 'PUT' : 'POST';
    const r = await apiSM(action, method, form);
    if (r.success) {
      showToast('success', r.message || m('toastSaved'));
      setModal(''); setForm({});
      loadGrowthTargets();
    } else showToast('error', r.error || m('toastFail'));
  };

  const deleteGrowthTarget = async (id: string) => {
    if (!confirm(m('confirmDeleteGrowth'))) return;
    const r = await apiSM('delete-outlet-growth-target', 'DELETE', undefined, `id=${id}`);
    if (r.success) { showToast('success', m('toastDeleted')); loadGrowthTargets(); }
    else showToast('error', r.error || m('toastFail'));
  };

  const addBulkRow = () => setBulkRows([...bulkRows, {}]);
  const removeBulkRow = (i: number) => setBulkRows(bulkRows.filter((_, idx) => idx !== i));
  const updateBulkRow = (i: number, k: string, v: any) => {
    const copy = [...bulkRows];
    copy[i] = { ...copy[i], [k]: v };
    setBulkRows(copy);
  };

  // ──────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header + Period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">{m('title')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{m('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{m('period')}</span>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm font-semibold text-gray-900 bg-transparent focus:outline-none"
            />
          </div>
          <Btn variant="secondary" icon={RefreshCw} onClick={() => {
            if (subTab === 'dashboard') loadDashboard();
            else if (subTab === 'entry') loadEntries();
            else if (subTab === 'vs-target') loadVsTarget(vsTab);
            else if (subTab === 'outlet') loadOutletData();
            else if (subTab === 'analytics') {
              if (anaTab === 'pareto') loadPareto(paretoDim);
              else if (anaTab === 'performance') loadPerformance(perfDim);
              else if (anaTab === 'leaderboard') loadLeaderboard();
              else if (anaTab === 'scorecard') loadScorecard();
              else if (anaTab === 'advanced') loadAdvancedKpis();
              else if (anaTab === 'insights') loadInsights();
            }
            else if (subTab === 'target-config') { cfgTab === 'item' ? loadItemTargets() : loadGrowthTargets(); }
          }}>{m('refresh')}</Btn>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {([
          ['dashboard', m('tabDashboard')],
          ['entry', m('tabEntry')],
          ['vs-target', m('tabVsTarget')],
          ['outlet', m('tabOutlet')],
          ['analytics', m('tabAnalytics')],
          ['target-config', m('tabTargetCfg')],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSubTab(k as SubTab)}
            className={`flex-1 min-w-max px-3 py-2 text-xs font-semibold rounded-lg transition-all ${subTab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >{label}</button>
        ))}
      </div>

      {/* ═══════════ DASHBOARD ═══════════ */}
      {subTab === 'dashboard' && dashboard && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label={m('statActualSales')}
              value={fmtCur(dashboard.summary.netTotal)}
              sub={m('subEntryCount', { count: dashboard.summary.entryCount })}
              icon={ShoppingBag} color="amber"
              trend={dashboard.summary.growthPct}
            />
            <StatCard
              label={m('statGlobalTarget')}
              value={fmtCur(dashboard.summary.globalTarget)}
              sub={m('subAchievement', { pct: pct(dashboard.summary.globalAchievement) })}
              icon={TargetIcon} color="purple"
            />
            <StatCard
              label={m('outletTrx')}
              value={fmtNum(dashboard.summary.activeOutlets)}
              sub={m('subTarget', { v: fmtNum(dashboard.summary.targetActiveOutlets || 0) })}
              icon={Store} color="blue"
            />
            <StatCard
              label={m('statTotalQty')}
              value={fmtNum(dashboard.summary.totalQty)}
              sub={m('subSkuActive', { n: dashboard.summary.activeProducts })}
              icon={Package} color="emerald"
            />
          </div>

          {/* Mini KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4"><p className="text-[11px] text-gray-500 font-semibold uppercase">{m('statSalesActive')}</p><p className="text-lg font-extrabold text-gray-900 mt-1">{fmtNum(dashboard.summary.activeSalespeople)}</p></Card>
            <Card className="p-4"><p className="text-[11px] text-gray-500 font-semibold uppercase">{m('statTargetProductiveOutlet')}</p><p className="text-lg font-extrabold text-gray-900 mt-1">{fmtNum(dashboard.summary.targetProductiveOutlets || 0)}</p></Card>
            <Card className="p-4"><p className="text-[11px] text-gray-500 font-semibold uppercase">{m('statTargetNewOutlet')}</p><p className="text-lg font-extrabold text-gray-900 mt-1">{fmtNum(dashboard.summary.targetNewOutlets || 0)}</p></Card>
            <Card className="p-4"><p className="text-[11px] text-gray-500 font-semibold uppercase">{m('statPrevPeriod')}</p><p className="text-lg font-extrabold text-gray-900 mt-1">{fmtCur(dashboard.summary.previousTotal)}</p></Card>
          </div>

          {/* Kalender: MTD / YTD & pace vs target (entry_date) */}
          {dashboard.mtdYtd && (
            <Card className="p-5 border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{m('mtdYtdTitle')}</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    S/d {fmtDate(dashboard.mtdYtd.as_of)} · bulan {dashboard.mtdYtd.period_month}
                    {dashboard.mtdYtd.yoy_mtd?.growth_pct != null && (
                      <span className={`ml-2 font-semibold ${dashboard.mtdYtd.yoy_mtd.growth_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        YoY MTD: {dashboard.mtdYtd.yoy_mtd.growth_pct >= 0 ? '+' : ''}{dashboard.mtdYtd.yoy_mtd.growth_pct}%
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="rounded-xl bg-white border border-indigo-100 p-3">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase">MTD Net</p>
                  <p className="text-lg font-extrabold text-gray-900">{fmtCur(dashboard.mtdYtd.mtd?.net || 0)}</p>
                  <p className="text-[10px] text-gray-400">{fmtNum(dashboard.mtdYtd.mtd?.entries || 0)} entry</p>
                </div>
                <div className="rounded-xl bg-white border border-indigo-100 p-3">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase">YTD Net</p>
                  <p className="text-lg font-extrabold text-gray-900">{fmtCur(dashboard.mtdYtd.ytd?.net || 0)}</p>
                  <p className="text-[10px] text-gray-400">{fmtNum(dashboard.mtdYtd.ytd?.outlets || 0)} outlet</p>
                </div>
                <div className="rounded-xl bg-white border border-amber-100 p-3">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase">Target bulan (penuh)</p>
                  <p className="text-lg font-extrabold text-amber-800">{fmtCur(dashboard.mtdYtd.running?.month_target_value || 0)}</p>
                </div>
                <div className="rounded-xl bg-white border border-violet-100 p-3">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase">Pencapaian vs target penuh</p>
                  <p className="text-lg font-extrabold text-violet-800">{pct(dashboard.mtdYtd.running?.achievement_mtd_vs_full_month_pct)}</p>
                  <p className="text-[10px] text-gray-400">hari ke-{dashboard.mtdYtd.running?.day_of_month}/{dashboard.mtdYtd.running?.days_in_month}</p>
                </div>
                <div className="rounded-xl bg-white border border-emerald-100 p-3">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase">Pace vs target prorata</p>
                  <p className="text-lg font-extrabold text-emerald-800">{pct(dashboard.mtdYtd.running?.pace_vs_prorata_pct)}</p>
                  <p className="text-[10px] text-gray-400">prorata {fmtCur(dashboard.mtdYtd.running?.prorated_target_value || 0)}</p>
                </div>
                <div className="rounded-xl bg-white border border-sky-100 p-3">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase">Proyeksi akhir bulan</p>
                  <p className="text-lg font-extrabold text-sky-800">{fmtCur(dashboard.mtdYtd.running?.projected_month_end_net || 0)}</p>
                  <p className="text-[10px] text-gray-400">gap {fmtCur(dashboard.mtdYtd.running?.gap_to_full_month_target || 0)}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Charts: top products & channel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-900">{m('top10Products')}</h3>
                <span className="text-[11px] text-gray-500">{m('byNetValue')}</span>
              </div>
              {dashboard.topProducts?.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dashboard.topProducts} layout="vertical" margin={{ left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="product_name" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip formatter={(v: any) => fmtCur(Number(v))} />
                    <Bar dataKey="net_total" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={Package} title={m('emptyNoProduct')} />}
            </Card>

            <Card className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-900">{m('outletChannelContrib')}</h3>
              </div>
              {dashboard.byChannel?.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={dashboard.byChannel}
                      dataKey="net_total" nameKey="outlet_channel"
                      cx="50%" cy="50%" outerRadius={90} innerRadius={45}
                      paddingAngle={2}
                    >
                      {dashboard.byChannel.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtCur(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={Layers} title={m('emptyNoChannel')} />}
            </Card>
          </div>

          {/* Top outlets & top sales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">{m('top10OutletTrx')}</h3>
              <div className="divide-y divide-gray-50">
                {(dashboard.topOutlets || []).map((o: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center">{i + 1}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{o.outlet_name || '-'}</p>
                        <p className="text-[11px] text-gray-400">{o.outlet_channel || '—'} · {o.trx_count} trx</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{fmtCur(Number(o.net_total))}</p>
                  </div>
                ))}
                {(!dashboard.topOutlets || dashboard.topOutlets.length === 0) && <EmptyState icon={Store} title={m('emptyNoOutletTrx')} />}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">{m('top10Sales')}</h3>
              <div className="divide-y divide-gray-50">
                {(dashboard.topSalespeople || []).map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.salesperson_name || `ID ${s.salesperson_id}`}</p>
                        <p className="text-[11px] text-gray-400">{s.trx_count} trx · {s.outlets_covered} outlet</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{fmtCur(Number(s.net_total))}</p>
                  </div>
                ))}
                {(!dashboard.topSalespeople || dashboard.topSalespeople.length === 0) && <EmptyState icon={Users} title={m('emptyNoSalesActivity')} />}
              </div>
            </Card>
          </div>

          {/* Recent entries */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">{m('recentEntries')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-gray-500 uppercase border-b border-gray-100">
                    <th className="py-2 pr-3">Tanggal</th>
                    <th className="py-2 pr-3">Tipe</th>
                    <th className="py-2 pr-3">Outlet</th>
                    <th className="py-2 pr-3">Produk</th>
                    <th className="py-2 pr-3 text-right">Qty</th>
                    <th className="py-2 pr-3 text-right">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(dashboard.recent || []).map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="py-2 pr-3 text-gray-600">{fmtDate(r.entry_date)}</td>
                      <td className="py-2 pr-3"><span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">{r.sales_type}</span></td>
                      <td className="py-2 pr-3 text-gray-700">{r.outlet_name || '-'}</td>
                      <td className="py-2 pr-3 text-gray-700">{r.product_name}</td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">{fmtNum(Number(r.quantity))}</td>
                      <td className="py-2 pr-3 text-right font-bold text-gray-900">{fmtCur(Number(r.net_amount))}</td>
                    </tr>
                  ))}
                  {(!dashboard.recent || dashboard.recent.length === 0) && (
                    <tr><td colSpan={6}><EmptyState icon={ShoppingBag} title={m('emptyNoEntries')} /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════ ENTRY PENJUALAN ═══════════ */}
      {subTab === 'entry' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                className={`${inputCls} max-w-[160px]`}
                value={entryFilters.period || ''}
                onChange={(e) => setEntryFilters((f: any) => ({ ...f, period: e.target.value }))}
              />
              <select className={`${inputCls} max-w-[160px]`} value={entryFilters.sales_type || ''}
                onChange={(e) => setEntryFilters((f: any) => ({ ...f, sales_type: e.target.value }))}>
                <option value="">{m('allTypes')}</option>
                {salesTypes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select className={`${inputCls} max-w-[180px]`} value={entryFilters.product_group || ''}
                onChange={(e) => setEntryFilters((f: any) => ({ ...f, product_group: e.target.value }))}>
                <option value="">{m('allGroups')}</option>
                {(filters.product_groups || []).map((g: string) => <option key={g} value={g}>{g}</option>)}
              </select>
              <select className={`${inputCls} max-w-[180px]`} value={entryFilters.outlet_channel || ''}
                onChange={(e) => setEntryFilters((f: any) => ({ ...f, outlet_channel: e.target.value }))}>
                <option value="">{m('allChannels')}</option>
                {outletChannels.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <Btn variant="secondary" icon={Filter} onClick={loadEntries}>{m('apply')}</Btn>
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="secondary" icon={Upload} onClick={() => { setModal('import'); }}>{m('importFieldOrder')}</Btn>
              <Btn variant="secondary" icon={Download} onClick={() => { setModal('bulk'); setBulkRows([{}]); }}>{m('bulkEntry')}</Btn>
              <Btn variant="secondary" icon={FileDown} onClick={exportCsv}>{m('exportCsv')}</Btn>
              <Btn variant="secondary" icon={FileUp} onClick={() => { setCsvText(''); setCsvImportResult(null); setModal('csv-import'); }}>{m('importCsv')}</Btn>
              <Btn icon={Plus} onClick={() => { setModal('entry'); setForm({ entry_date: new Date().toISOString().slice(0, 10), sales_type: 'primary', status: 'confirmed' }); }}>{m('addEntry')}</Btn>
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-gray-500 uppercase border-b border-gray-100">
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Tipe</th>
                    <th className="px-4 py-3">Outlet</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Produk</th>
                    <th className="px-4 py-3">Grup</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Harga</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3">Sales</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.map((e: any) => (
                    <tr key={e.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">{fmtDate(e.entry_date)}</td>
                      <td className="px-4 py-2.5"><span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">{e.sales_type}</span></td>
                      <td className="px-4 py-2.5 text-gray-700">{e.outlet_name || '-'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{e.outlet_channel || '—'}</td>
                      <td className="px-4 py-2.5 font-semibold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          {e.item_type && e.item_type !== 'product' && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${e.item_type === 'service' ? 'bg-blue-100 text-blue-700' : e.item_type === 'bundle' ? 'bg-purple-100 text-purple-700' : e.item_type === 'subscription' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                              {e.item_type}
                            </span>
                          )}
                          <span>{e.product_name}</span>
                          {e.stock_decremented && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold" title="Stok sudah dikurangi">📦</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{e.product_group || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{fmtNum(Number(e.quantity))}</td>
                      <td className="px-4 py-2.5 text-right">{fmtCur(Number(e.unit_price))}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmtCur(Number(e.net_amount))}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{e.salesperson_name || '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          e.status === 'confirmed' ? 'bg-blue-50 text-blue-700'
                            : e.status === 'invoiced' ? 'bg-purple-50 text-purple-700'
                            : e.status === 'paid' ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>{e.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {canManage && (
                          <button onClick={() => deleteEntry(e.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr><td colSpan={12}><EmptyState icon={ShoppingBag} title={m('emptyNoEntriesLong')} subtitle={m('emptyNoEntriesSub')} /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════ VS TARGET ═══════════ */}
      {subTab === 'vs-target' && (
        <div className="space-y-4">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
            {([
              ['global', m('vsGlobal')],
              ['product', m('vsProduct')],
              ['group', m('vsGroup')],
              ['outlet', m('vsOutlet')],
              ['salesperson', m('vsSalesperson')],
            ] as const).map(([k, label]) => (
              <button key={k} onClick={() => setVsTab(k as VsTargetTab)}
                className={`flex-1 min-w-max px-3 py-2 text-xs font-semibold rounded-lg transition-all ${vsTab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* GLOBAL */}
          {vsTab === 'global' && vsGlobal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label={m('statTargetValue')} value={fmtCur(vsGlobal.target.value)} icon={TargetIcon} color="purple" />
                <StatCard label={m('statActualValue')} value={fmtCur(vsGlobal.actual.value)} icon={ShoppingBag} color="amber" />
                <StatCard label={m('statAchievement')} value={`${pct(vsGlobal.achievement_pct)}`}
                  sub={vsGlobal.gap >= 0 ? m('gapLabel', { v: fmtCur(vsGlobal.gap) }) : m('overLabel', { v: fmtCur(Math.abs(vsGlobal.gap)) })}
                  icon={BarChart2}
                  color={vsGlobal.achievement_pct >= 100 ? 'emerald' : vsGlobal.achievement_pct >= 75 ? 'amber' : 'red'} />
                <StatCard label={m('statTotalQtyActual')} value={fmtNum(vsGlobal.actual.qty)} sub={`Target: ${fmtNum(vsGlobal.target.qty)}`} icon={Package} color="blue" />
              </div>

              <Card className="p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">{m('trend6m')}</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={vsGlobal.trend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => fmtCur(Number(v))} />
                    <Legend />
                    <Bar dataKey="target_value" fill="#c7d2fe" name={m('chartTarget')} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="actual_value" fill="#f59e0b" name={m('chartActual')} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* PRODUCT */}
          {vsTab === 'product' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-gray-500 uppercase border-b border-gray-100">
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3">Grup</th>
                      <th className="px-4 py-3 text-right">Target Qty</th>
                      <th className="px-4 py-3 text-right">Aktual Qty</th>
                      <th className="px-4 py-3 text-right">{m('statTargetValue')}</th>
                      <th className="px-4 py-3 text-right">{m('statActualValue')}</th>
                      <th className="px-4 py-3 w-52">Achievement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {vsProduct.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-amber-50/40 cursor-pointer"
                          onClick={() => openDrillDown({ title: `Produk: ${r.product_name}`, product_id: r.product_id })}>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{r.product_sku || '—'}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-900">{r.product_name || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{r.product_group || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtNum(Number(r.target_qty))}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtNum(Number(r.actual_qty))}</td>
                        <td className="px-4 py-2.5 text-right">{fmtCur(Number(r.target_value))}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmtCur(Number(r.actual_value))}</td>
                        <td className="px-4 py-2.5">
                          {Number(r.target_value) > 0
                            ? <AchievementBar actual={Number(r.actual_value)} target={Number(r.target_value)} />
                            : <span className="text-[11px] text-gray-400">{m('noTarget')}</span>}
                        </td>
                      </tr>
                    ))}
                    {vsProduct.length === 0 && (
                      <tr><td colSpan={8}><EmptyState icon={Package} title={m('emptyVsProduct')} /></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* PRODUCT GROUP */}
          {vsTab === 'group' && (
            <>
              <Card className="p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">{m('vsGroupTitle')}</h3>
                {vsGroup.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={vsGroup}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="product_group" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={70} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => fmtCur(Number(v))} />
                      <Legend />
                      <Bar dataKey="target_value" name={m('chartTarget')} fill="#c7d2fe" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="actual_value" name={m('chartActual')} fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={Layers} title={m('emptyVsGroup')} />}
              </Card>

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-gray-500 uppercase border-b border-gray-100">
                        <th className="px-4 py-3">Grup Produk</th>
                        <th className="px-4 py-3 text-right">Jml SKU</th>
                        <th className="px-4 py-3 text-right">Outlet</th>
                        <th className="px-4 py-3 text-right">Target</th>
                        <th className="px-4 py-3 text-right">Aktual</th>
                        <th className="px-4 py-3 w-52">Achievement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {vsGroup.map((g: any, i: number) => (
                        <tr key={i} className="hover:bg-amber-50/40 cursor-pointer"
                            onClick={() => openDrillDown({ title: `Grup: ${g.product_group}`, product_group: g.product_group })}>
                          <td className="px-4 py-2.5 font-semibold text-gray-900">{g.product_group}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtNum(Number(g.product_count))}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtNum(Number(g.outlet_count))}</td>
                          <td className="px-4 py-2.5 text-right">{fmtCur(Number(g.target_value))}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmtCur(Number(g.actual_value))}</td>
                          <td className="px-4 py-2.5">
                            {Number(g.target_value) > 0
                              ? <AchievementBar actual={Number(g.actual_value)} target={Number(g.target_value)} />
                              : <span className="text-[11px] text-gray-400">{m('noTarget')}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {/* OUTLET */}
          {vsTab === 'outlet' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-gray-500 uppercase border-b border-gray-100">
                      <th className="px-4 py-3">Kode</th>
                      <th className="px-4 py-3">Outlet</th>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3 text-right">Trx</th>
                      <th className="px-4 py-3 text-right">Aktual</th>
                      <th className="px-4 py-3 text-right">Sebelumnya</th>
                      <th className="px-4 py-3 text-right">Growth</th>
                      <th className="px-4 py-3 text-right">Target</th>
                      <th className="px-4 py-3 w-40">Achievement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {vsOutlet.map((o: any, i: number) => (
                      <tr key={i} className="hover:bg-amber-50/40 cursor-pointer"
                          onClick={() => openDrillDown({ title: `Outlet: ${o.outlet_name}`, outlet_id: o.outlet_id })}>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{o.outlet_code || '—'}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-900">{o.outlet_name}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{o.outlet_channel || '—'}</td>
                        <td className="px-4 py-2.5 text-xs">{o.outlet_class || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtNum(Number(o.trx_count))}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmtCur(Number(o.actual_value))}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{fmtCur(Number(o.prev_value))}</td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${Number(o.growth_pct) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{o.growth_pct !== null ? `${Number(o.growth_pct).toFixed(1)}%` : '—'}</td>
                        <td className="px-4 py-2.5 text-right">{fmtCur(Number(o.target_value))}</td>
                        <td className="px-4 py-2.5">
                          {Number(o.target_value) > 0
                            ? <AchievementBar actual={Number(o.actual_value)} target={Number(o.target_value)} />
                            : <span className="text-[11px] text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                    {vsOutlet.length === 0 && (
                      <tr><td colSpan={10}><EmptyState icon={Store} title={m('emptyVsOutlet')} /></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* SALESPERSON */}
          {vsTab === 'salesperson' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-gray-500 uppercase border-b border-gray-100">
                      <th className="px-4 py-3">Sales</th>
                      <th className="px-4 py-3 text-right">Trx</th>
                      <th className="px-4 py-3 text-right">Outlet Dicakup</th>
                      <th className="px-4 py-3 text-right">Target</th>
                      <th className="px-4 py-3 text-right">Aktual</th>
                      <th className="px-4 py-3 w-52">Achievement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {vsSales.map((s: any, i: number) => (
                      <tr key={i} className="hover:bg-amber-50/40 cursor-pointer"
                          onClick={() => openDrillDown({ title: `Salesperson: ${s.salesperson_name || `ID ${s.salesperson_id}`}`, salesperson_id: s.salesperson_id })}>
                        <td className="px-4 py-2.5 font-semibold text-gray-900">{s.salesperson_name || `ID ${s.salesperson_id}`}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtNum(Number(s.trx_count))}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtNum(Number(s.outlets_covered))}</td>
                        <td className="px-4 py-2.5 text-right">{fmtCur(Number(s.target_value))}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmtCur(Number(s.actual_value))}</td>
                        <td className="px-4 py-2.5">
                          {Number(s.target_value) > 0
                            ? <AchievementBar actual={Number(s.actual_value)} target={Number(s.target_value)} />
                            : <span className="text-[11px] text-gray-400">{m('noTarget')}</span>}
                        </td>
                      </tr>
                    ))}
                    {vsSales.length === 0 && (
                      <tr><td colSpan={6}><EmptyState icon={Users} title={m('emptyVsSales')} /></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════ OUTLET & GROWTH ═══════════ */}
      {subTab === 'outlet' && outletCoverage && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Outlet Transaksi" value={fmtNum(outletCoverage.actual.active_outlets)}
              sub={`Target: ${fmtNum(outletCoverage.target?.active_outlets || 0)}`}
              icon={Store} color="blue"
              trend={outletCoverage.actual.growth_pct} />
            <StatCard label="Outlet Produktif" value={fmtNum(outletCoverage.actual.productive_outlets)}
              sub={`Min. ${fmtCur(outletCoverage.target?.productive_threshold || 0)}`}
              icon={CheckCircle2} color="emerald" />
            <StatCard label="Outlet Baru" value={fmtNum(outletCoverage.actual.new_outlets)}
              sub={`Target: ${fmtNum(outletCoverage.target?.new_outlets || 0)}`}
              icon={Plus} color="amber" />
            <StatCard label="Periode Sebelumnya" value={fmtNum(outletCoverage.actual.prev_active_outlets)}
              sub={`Growth ${pct(outletCoverage.actual.growth_pct)}`}
              icon={TrendingUp} color="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Trend Outlet Transaksi (6 Bulan)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={outletCoverage.trend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="active_outlets" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Breakdown Outlet per Channel</h3>
              {(outletCoverage.byChannel || []).length > 0 ? (
                <div className="space-y-3">
                  {outletCoverage.byChannel.map((c: any, i: number) => {
                    const total = outletCoverage.byChannel.reduce((s: number, x: any) => s + Number(x.active_outlets), 0);
                    const pctVal = total > 0 ? (Number(c.active_outlets) / total) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-700">{c.channel}</span>
                          <span className="text-gray-500">{fmtNum(Number(c.active_outlets))} outlet · {fmtCur(Number(c.total_value))}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pctVal}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <EmptyState icon={Layers} title={m('emptyNoChannel')} />}
            </Card>
          </div>

          {/* ── Distribution KPI (FMCG: ND & WD) ── */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Percent className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-gray-900">Distribution KPIs (FMCG)</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">Numeric & Weighted Distribution</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <StatCard label="Outlet Universe"
                value={fmtNum(distribution?.universe_outlets || 0)}
                sub="Total outlet ter-register (target)"
                icon={Store} color="bg-slate-500" />
              <StatCard label="Outlet Aktif"
                value={fmtNum(distribution?.active_outlets || 0)}
                sub="Outlet bertransaksi pd periode"
                icon={Store} color="bg-emerald-500" />
              <StatCard label="Numeric Distribution (ND)"
                value={distribution?.numeric_distribution_pct !== null && distribution?.numeric_distribution_pct !== undefined ? `${distribution.numeric_distribution_pct}%` : '—'}
                sub="Outlet aktif / universe"
                icon={Percent} color="bg-indigo-500" />
              <StatCard label="Total Omzet Periode"
                value={fmtCur(distribution?.grand_total || 0)}
                sub="Basis perhitungan WD"
                icon={TrendingUp} color="bg-amber-500" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-gray-500 uppercase border-b border-gray-100">
                    <th className="px-2 py-3">SKU</th>
                    <th className="px-2 py-3">Produk</th>
                    <th className="px-2 py-3">Grup</th>
                    <th className="px-2 py-3 text-right"># Outlet</th>
                    <th className="px-2 py-3 text-right">ND %</th>
                    <th className="px-2 py-3 text-right">WD %</th>
                    <th className="px-2 py-3 text-right">Qty</th>
                    <th className="px-2 py-3 text-right">Omzet</th>
                    <th className="px-2 py-3 text-center">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {distPerProduct.map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-2 py-2 font-mono text-[11px] text-gray-500">{p.product_sku || '—'}</td>
                      <td className="px-2 py-2 font-semibold text-gray-900">{p.product_name}</td>
                      <td className="px-2 py-2 text-xs text-gray-500">{p.product_group || '—'}</td>
                      <td className="px-2 py-2 text-right font-mono text-xs">{fmtNum(p.outlet_count)}</td>
                      <td className="px-2 py-2 text-right">
                        {p.numeric_distribution_pct !== null
                          ? <span className={`text-xs font-bold ${p.numeric_distribution_pct >= 60 ? 'text-emerald-600' : p.numeric_distribution_pct >= 30 ? 'text-amber-600' : 'text-red-600'}`}>{p.numeric_distribution_pct}%</span>
                          : <span className="text-gray-400 text-[11px]">—</span>}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {p.weighted_distribution_pct !== null
                          ? <span className={`text-xs font-bold ${p.weighted_distribution_pct >= 60 ? 'text-emerald-600' : p.weighted_distribution_pct >= 30 ? 'text-amber-600' : 'text-red-600'}`}>{p.weighted_distribution_pct}%</span>
                          : <span className="text-gray-400 text-[11px]">—</span>}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-xs">{fmtNum(p.product_qty)}</td>
                      <td className="px-2 py-2 text-right font-bold text-gray-900">{fmtCur(p.product_value)}</td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => openDrillDown({ title: `Produk: ${p.product_name}`, product_id: p.product_id })}
                          className="p-1 rounded hover:bg-amber-50 text-amber-600" title="Lihat entries">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {distPerProduct.length === 0 && (
                    <tr><td colSpan={9}><EmptyState icon={Package} title="Belum ada data distribusi" subtitle="Atur target outlet universe di Konfigurasi Target untuk melihat ND/WD" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-500 mt-3 leading-relaxed">
              <strong>ND</strong> (Numeric Distribution) = % outlet dlm universe yg mengambil produk.
              <strong className="ml-2">WD</strong> (Weighted Distribution) = % kontribusi omzet outlet yg ambil produk ini terhadap total omzet universe — proxy bobot nilai outlet.
            </p>
          </Card>

          {/* Daftar outlet transaksi */}
          <Card className="p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-900">Daftar Outlet Transaksi Periode {period}</h3>
              <span className="text-[11px] text-gray-500">{outletTrx.length} outlet</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-gray-500 uppercase border-b border-gray-100">
                    <th className="px-2 py-3">Kode</th>
                    <th className="px-2 py-3">Outlet</th>
                    <th className="px-2 py-3">Channel</th>
                    <th className="px-2 py-3 text-right">Trx</th>
                    <th className="px-2 py-3 text-right">SKU</th>
                    <th className="px-2 py-3 text-right">Total</th>
                    <th className="px-2 py-3 text-center">Produktif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {outletTrx.map((o: any, i: number) => (
                    <tr key={i} className="hover:bg-amber-50/40 cursor-pointer"
                        onClick={() => openDrillDown({ title: `Outlet: ${o.outlet_name}`, outlet_id: o.outlet_id })}>
                      <td className="px-2 py-2 font-mono text-[11px] text-gray-500">{o.outlet_code || '—'}</td>
                      <td className="px-2 py-2 font-semibold text-gray-900">{o.outlet_name}</td>
                      <td className="px-2 py-2 text-xs text-gray-500">{o.outlet_channel || '—'}</td>
                      <td className="px-2 py-2 text-right font-mono text-xs">{fmtNum(Number(o.trx_count))}</td>
                      <td className="px-2 py-2 text-right font-mono text-xs">{fmtNum(Number(o.product_variety))}</td>
                      <td className="px-2 py-2 text-right font-bold text-gray-900">{fmtCur(Number(o.total_value))}</td>
                      <td className="px-2 py-2 text-center">
                        {o.is_productive
                          ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">Produktif</span>
                          : <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600">—</span>}
                      </td>
                    </tr>
                  ))}
                  {outletTrx.length === 0 && (
                    <tr><td colSpan={7}><EmptyState icon={Store} title={m('emptyNoOutletTrx')} /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ANALISIS SALES (Pareto / Performance / Scorecard) */}
      {/* ═══════════════════════════════════════════════ */}
      {subTab === 'analytics' && (
        <div className="space-y-4">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
            {([
              ['insights', m('anaInsights')],
              ['pareto', m('anaPareto')],
              ['performance', m('anaPerformance')],
              ['leaderboard', m('anaLeaderboard')],
              ['scorecard', m('anaScorecard')],
              ['advanced', m('anaAdvanced')],
            ] as const).map(([k, label]) => (
              <button key={k} onClick={() => setAnaTab(k as AnalyticsTab)}
                className={`flex-1 min-w-max px-3 py-2 text-xs font-semibold rounded-lg transition-all ${anaTab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
            ))}
          </div>

          {/* ── RINGKASAN MTD/YTD + PARETO TARGET + ORDER OUTLET ── */}
          {anaTab === 'insights' && (
            <div className="space-y-5">
              {insightsMtd && (
                <Card className="p-5 border-indigo-100">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">MTD / YTD & pencapaian berjalan</h3>
                  <p className="text-[11px] text-gray-500 mb-4">
                    Data dari tanggal entry · s/d {fmtDate(insightsMtd.as_of)}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard label="MTD (net)" value={fmtCur(insightsMtd.mtd?.net || 0)} sub={`${fmtNum(insightsMtd.mtd?.entries || 0)} entry`} icon={ShoppingBag} color="amber" />
                    <StatCard label="YTD (net)" value={fmtCur(insightsMtd.ytd?.net || 0)} sub="tahun kalender" icon={TrendingUp} color="emerald" />
                    <StatCard label="Target bulan" value={fmtCur(insightsMtd.running?.month_target_value || 0)} sub="dari item target" icon={TargetIcon} color="purple" />
                    <StatCard label="vs target penuh" value={pct(insightsMtd.running?.achievement_mtd_vs_full_month_pct)} sub={`hari ${insightsMtd.running?.day_of_month}/${insightsMtd.running?.days_in_month}`} icon={Percent} color="blue" />
                    <StatCard label="Pace vs prorata" value={pct(insightsMtd.running?.pace_vs_prorata_pct)} sub={fmtCur(insightsMtd.running?.prorated_target_value || 0)} icon={Activity} color="emerald" />
                    <StatCard label="Proyeksi akhir bulan" value={fmtCur(insightsMtd.running?.projected_month_end_net || 0)} sub={`gap ${fmtCur(insightsMtd.running?.gap_to_full_month_target || 0)}`} icon={BarChart2} color="purple" />
                  </div>
                  {insightsMtd.yoy_mtd?.growth_pct != null && (
                    <p className="text-xs text-gray-600 mt-3">
                      <strong>YoY MTD:</strong>{' '}
                      <span className={insightsMtd.yoy_mtd.growth_pct >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {insightsMtd.yoy_mtd.growth_pct >= 0 ? '+' : ''}{insightsMtd.yoy_mtd.growth_pct}%
                      </span>
                      {' '}(MTD tahun lalu: {fmtCur(insightsMtd.yoy_mtd.net_ly_same_window || 0)})
                    </p>
                  )}
                </Card>
              )}

              {paretoTarget && (
                <Card className="p-5">
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Pareto produk + pencapaian target</h3>
                      <p className="text-[11px] text-gray-500">Kelas A/B/C dari kontribusi nilai; kolom target dari konfigurasi item target</p>
                    </div>
                    <div className="flex gap-2 text-[11px]">
                      <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 font-semibold">A: {paretoTarget.summary.class_A}</span>
                      <span className="px-2 py-1 rounded bg-amber-50 text-amber-800 font-semibold">B: {paretoTarget.summary.class_B}</span>
                      <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 font-semibold">C: {paretoTarget.summary.class_C}</span>
                      {paretoTarget.summary.avg_achievement_among_with_target != null && (
                        <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-800 font-semibold">
                          Ø capai (ada target): {paretoTarget.summary.avg_achievement_among_with_target}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="text-left text-[11px] text-gray-500 uppercase">
                          <th className="px-2 py-2">#</th>
                          <th className="px-2 py-2">Produk</th>
                          <th className="px-2 py-2 text-right">Nilai</th>
                          <th className="px-2 py-2 text-right">Kum %</th>
                          <th className="px-2 py-2 text-center">Kelas</th>
                          <th className="px-2 py-2 text-right">Target</th>
                          <th className="px-2 py-2 text-right">% capai</th>
                          <th className="px-2 py-2 text-center">Detail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paretoTarget.rows.map((r: any) => (
                          <tr key={r.rank} className="hover:bg-amber-50/40">
                            <td className="px-2 py-1.5 font-mono text-xs text-gray-500">{r.rank}</td>
                            <td className="px-2 py-1.5 font-semibold text-gray-900">{r.product_name || '—'}</td>
                            <td className="px-2 py-1.5 text-right font-bold">{fmtCur(r.metric_value)}</td>
                            <td className="px-2 py-1.5 text-right text-indigo-600 text-xs">{r.cumulative_pct}%</td>
                            <td className="px-2 py-1.5 text-center">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.abc_class === 'A' ? 'bg-emerald-100 text-emerald-800' : r.abc_class === 'B' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>{r.abc_class}</span>
                            </td>
                            <td className="px-2 py-1.5 text-right text-xs">{r.target_value > 0 ? fmtCur(r.target_value) : '—'}</td>
                            <td className="px-2 py-1.5 text-right text-xs font-semibold">{r.achievement_pct != null ? `${r.achievement_pct}%` : '—'}</td>
                            <td className="px-2 py-1.5 text-center">
                              <button type="button" onClick={() => openDrillDown({ title: `Produk: ${r.product_name}`, product_id: r.product_id })}
                                className="p-1 rounded hover:bg-amber-100 text-amber-600"><Eye className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                        {paretoTarget.rows.length === 0 && (
                          <tr><td colSpan={8}><EmptyState icon={Package} title={m('emptyParetoTarget')} /></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {orderBehavior && (
                <Card className="p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Perilaku order outlet (field order)</h3>
                  <p className="text-[11px] text-gray-500 mb-4">
                    Berdasarkan <code className="text-[10px] bg-gray-100 px-1 rounded">sfa_field_orders</code> periode {period}
                  </p>
                  {!orderBehavior.available ? (
                    <p className="text-sm text-gray-600">{orderBehavior.message || 'Data tidak tersedia.'}</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        <StatCard label="Jumlah order" value={fmtNum(orderBehavior.overview?.order_count || 0)} icon={ShoppingBag} color="amber" />
                        <StatCard label="Nilai order" value={fmtCur(orderBehavior.overview?.revenue || 0)} icon={TrendingUp} color="emerald" />
                        <StatCard label="Avg tiket" value={fmtCur(orderBehavior.overview?.avg_ticket || 0)} sub="per order" icon={TargetIcon} color="blue" />
                        <StatCard label="Avg baris/order" value={fmtNum(orderBehavior.overview?.avg_lines_per_order || 0)} sub="SKU lines" icon={Layers} color="purple" />
                      </div>
                      {orderBehavior.repeat_vs_single && (
                        <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                          <strong className="text-gray-800">Outlet single vs repeat:</strong>{' '}
                          {fmtNum(orderBehavior.repeat_vs_single.single_order_outlets)} outlet sekali order ·{' '}
                          {fmtNum(orderBehavior.repeat_vs_single.repeat_order_outlets)} outlet repeat
                          {orderBehavior.repeat_vs_single.repeat_rate_pct != null && (
                            <span className="text-indigo-700 font-semibold"> · repeat rate {orderBehavior.repeat_vs_single.repeat_rate_pct}%</span>
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Status order</h4>
                          <div className="space-y-1">
                            {(orderBehavior.by_status || []).map((s: any, i: number) => (
                              <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50">
                                <span className="font-medium text-gray-800">{s.status || '—'}</span>
                                <span className="text-gray-600">{s.count} · {fmtCur(s.revenue)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Hari dalam minggu (ISO)</h4>
                          <div className="h-48">
                            {(orderBehavior.by_weekday || []).length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={orderBehavior.by_weekday}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                  <YAxis tick={{ fontSize: 10 }} />
                                  <Tooltip />
                                  <Bar dataKey="orders" fill="#6366f1" name="Order" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            ) : <EmptyState icon={BarChart2} title="Belum ada pola hari" />}
                          </div>
                        </div>
                      </div>
                      <div className="mt-5">
                        <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Top outlet by order (customer)</h4>
                        <div className="overflow-x-auto max-h-56 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr className="text-left text-[11px] text-gray-500 uppercase">
                                <th className="px-2 py-2">Outlet</th>
                                <th className="px-2 py-2 text-right">Order</th>
                                <th className="px-2 py-2 text-right">Nilai</th>
                                <th className="px-2 py-2 text-right">Avg tiket</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(orderBehavior.top_outlets || []).map((o: any, i: number) => (
                                <tr key={i} className="border-b border-gray-50">
                                  <td className="px-2 py-1.5 font-medium text-gray-900">{o.outlet_name}</td>
                                  <td className="px-2 py-1.5 text-right">{fmtNum(o.order_count)}</td>
                                  <td className="px-2 py-1.5 text-right">{fmtCur(o.revenue)}</td>
                                  <td className="px-2 py-1.5 text-right text-xs">{fmtCur(o.avg_ticket)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {(orderBehavior.by_salesperson || []).length > 0 && (
                        <div className="mt-5">
                          <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Order per salesperson</h4>
                          <div className="flex flex-wrap gap-2">
                            {orderBehavior.by_salesperson.map((s: any, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-900 text-xs font-semibold border border-amber-100">
                                {s.salesperson_name} · {s.orders} ord · {fmtCur(s.revenue)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* ── PARETO 80/20 ── */}
          {anaTab === 'pareto' && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 font-semibold">Dimensi:</span>
                {([
                  ['outlet', '🏪 Outlet'],
                  ['product', '📦 Produk'],
                  ['salesperson', '👤 Salesperson'],
                ] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setParetoDim(k as ParetoDim)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${paretoDim === k ? 'bg-amber-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'}`}>{label}</button>
                ))}
              </div>

              {paretoData && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <StatCard label="Total Entity" value={fmtNum(paretoData.summary.total_entities || 0)} icon={Layers} color="bg-slate-500" />
                    <StatCard label="Kelas A (vital)" value={fmtNum(paretoData.summary.class_A || 0)} sub="0-80% kumulatif" icon={Crown} color="bg-emerald-500" />
                    <StatCard label="Kelas B" value={fmtNum(paretoData.summary.class_B || 0)} sub="80-95%" icon={Award} color="bg-amber-500" />
                    <StatCard label="Kelas C (tail)" value={fmtNum(paretoData.summary.class_C || 0)} sub="95-100%" icon={Package} color="bg-gray-400" />
                    <StatCard label="Top 20% Kontribusi" value={`${paretoData.summary.top_20_pct_contribution || 0}%`} sub="Prinsip 80/20" icon={Percent} color="bg-indigo-500" />
                  </div>

                  <Card className="p-5">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Kurva Pareto — {paretoDim.toUpperCase()}</h3>
                    {paretoData.rows.length > 0 ? (
                      <ResponsiveContainer width="100%" height={340}>
                        <ComposedChart data={paretoData.rows.slice(0, 40)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="rank" tick={{ fontSize: 10 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="metric_value" name="Nilai" fill="#f59e0b" />
                          <Line yAxisId="right" type="monotone" dataKey="cumulative_pct" name="Kumulatif %" stroke="#6366f1" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : <EmptyState icon={BarChart2} title="Belum ada data" />}
                  </Card>

                  <Card>
                    <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr className="text-left text-[11px] text-gray-500 uppercase">
                            <th className="px-3 py-2 w-12 text-center">#</th>
                            <th className="px-3 py-2">Nama</th>
                            {paretoDim === 'outlet' && <th className="px-3 py-2">Channel</th>}
                            {paretoDim === 'product' && <th className="px-3 py-2">Grup/Brand</th>}
                            <th className="px-3 py-2 text-right">Nilai</th>
                            <th className="px-3 py-2 text-right">Trx</th>
                            <th className="px-3 py-2 text-right">Kontrib %</th>
                            <th className="px-3 py-2 text-right">Kumulatif %</th>
                            <th className="px-3 py-2 text-center">Kelas</th>
                            <th className="px-3 py-2 text-center">Detail</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {paretoData.rows.map((r: any) => {
                            const cls = r.abc_class;
                            const clsColor = cls === 'A' ? 'bg-emerald-100 text-emerald-800' : cls === 'B' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600';
                            const name = paretoDim === 'outlet' ? r.outlet_name : paretoDim === 'product' ? r.product_name : r.salesperson_name;
                            const sub = paretoDim === 'outlet' ? r.outlet_channel : paretoDim === 'product' ? `${r.product_group || ''} ${r.product_brand ? '· ' + r.product_brand : ''}` : null;
                            const drillArgs: any = { title: `${paretoDim}: ${name}` };
                            if (paretoDim === 'outlet') drillArgs.outlet_id = r.outlet_id;
                            if (paretoDim === 'product') drillArgs.product_id = r.product_id;
                            if (paretoDim === 'salesperson') drillArgs.salesperson_id = r.salesperson_id;
                            return (
                              <tr key={r.rank} className="hover:bg-amber-50/40">
                                <td className="px-3 py-2 text-center font-mono text-xs text-gray-500">{r.rank}</td>
                                <td className="px-3 py-2 font-semibold text-gray-900">{name || '—'}</td>
                                {paretoDim === 'outlet' && <td className="px-3 py-2 text-xs text-gray-500">{r.outlet_channel || '—'}</td>}
                                {paretoDim === 'product' && <td className="px-3 py-2 text-xs text-gray-500">{sub || '—'}</td>}
                                <td className="px-3 py-2 text-right font-bold text-gray-900">{fmtCur(r.metric_value)}</td>
                                <td className="px-3 py-2 text-right font-mono text-xs">{fmtNum(r.trx_count)}</td>
                                <td className="px-3 py-2 text-right text-xs font-semibold text-amber-600">{r.contribution_pct}%</td>
                                <td className="px-3 py-2 text-right text-xs font-semibold text-indigo-600">{r.cumulative_pct}%</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${clsColor}`}>{cls}</span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button onClick={() => openDrillDown(drillArgs)}
                                    className="p-1 rounded hover:bg-amber-100 text-amber-600"><Eye className="w-4 h-4" /></button>
                                </td>
                              </tr>
                            );
                          })}
                          {paretoData.rows.length === 0 && (
                            <tr><td colSpan={10}><EmptyState icon={BarChart2} title="Belum ada data" /></td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </>
              )}
            </>
          )}

          {/* ── PERFORMANCE MATRIX ── */}
          {anaTab === 'performance' && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 font-semibold">Dimensi:</span>
                {([
                  ['branch', '🏢 Branch'],
                  ['territory', '🗺️ Territory / Wilayah'],
                  ['team', '👥 Tim'],
                ] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setPerfDim(k as PerformanceDim)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${perfDim === k ? 'bg-indigo-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}>{label}</button>
                ))}
              </div>

              {perfData && (
                <>
                  <Card className="p-5">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Penjualan per {perfDim === 'branch' ? 'Branch' : perfDim === 'territory' ? 'Territory' : 'Tim'}</h3>
                    {(perfData.data || []).length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={perfData.data.slice(0, 15)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="dim_name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: any) => fmtCur(Number(v))} />
                          <Legend />
                          <Bar dataKey="prev_value" name={m('periodPrev')} fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="actual_value" name={m('chartActual')} fill="#6366f1" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="target_value" name={m('chartTarget')} fill="#fbbf24" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState icon={MapPin} title="Belum ada data" />}
                  </Card>

                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[11px] text-gray-500 uppercase border-b border-gray-100">
                            <th className="px-3 py-2 w-12 text-center">#</th>
                            <th className="px-3 py-2">{perfDim === 'branch' ? 'Branch' : perfDim === 'territory' ? 'Territory' : 'Tim'}</th>
                            <th className="px-3 py-2 text-right">Aktual</th>
                            <th className="px-3 py-2 text-right">Periode Lalu</th>
                            <th className="px-3 py-2 text-right">MoM</th>
                            <th className="px-3 py-2 text-right">Target</th>
                            <th className="px-3 py-2 text-right">Achievement</th>
                            <th className="px-3 py-2 text-right">Outlet</th>
                            <th className="px-3 py-2 text-right">Sales</th>
                            <th className="px-3 py-2 text-right">SKU</th>
                            <th className="px-3 py-2 text-right">Avg/Outlet</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {(perfData.data || []).map((r: any) => (
                            <tr key={r.rank} className="hover:bg-gray-50/50">
                              <td className="px-3 py-2 text-center font-mono text-xs text-gray-500">{r.rank}</td>
                              <td className="px-3 py-2 font-semibold text-gray-900">{r.dim_name}</td>
                              <td className="px-3 py-2 text-right font-bold text-gray-900">{fmtCur(r.actual_value)}</td>
                              <td className="px-3 py-2 text-right text-gray-500">{fmtCur(r.prev_value)}</td>
                              <td className={`px-3 py-2 text-right font-semibold text-xs ${r.growth_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {r.growth_pct >= 0 ? '▲' : '▼'} {Math.abs(r.growth_pct).toFixed(1)}%
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">{fmtCur(r.target_value)}</td>
                              <td className="px-3 py-2 text-right">
                                {r.achievement_pct !== null
                                  ? <span className={`font-bold text-xs ${r.achievement_pct >= 100 ? 'text-emerald-600' : r.achievement_pct >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{r.achievement_pct}%</span>
                                  : <span className="text-gray-400 text-[11px]">—</span>}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-xs">{fmtNum(r.active_outlets)}</td>
                              <td className="px-3 py-2 text-right font-mono text-xs">{fmtNum(r.active_salespersons)}</td>
                              <td className="px-3 py-2 text-right font-mono text-xs">{fmtNum(r.active_products)}</td>
                              <td className="px-3 py-2 text-right text-xs text-gray-600">{fmtCur(r.avg_per_outlet)}</td>
                            </tr>
                          ))}
                          {(perfData.data || []).length === 0 && (
                            <tr><td colSpan={11}><EmptyState icon={MapPin} title="Belum ada data" /></td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </>
              )}
            </>
          )}

          {/* ── LEADERBOARD ── */}
          {anaTab === 'leaderboard' && leaderboard && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(leaderboard.categories || []).map((cat: any) => {
                const rows = leaderboard.data?.[cat.key] || [];
                return (
                  <Card key={cat.key} className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-5 h-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-gray-900">{cat.label}</h3>
                    </div>
                    {rows.length === 0 ? (
                      <EmptyState icon={Trophy} title="Belum ada data" />
                    ) : (
                      <div className="space-y-2">
                        {rows.map((r: any) => {
                          const badgeBg = r.badge === 'gold' ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white'
                            : r.badge === 'silver' ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900'
                              : r.badge === 'bronze' ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
                                : 'bg-gray-100 text-gray-600';
                          const icon = r.badge === 'gold' ? '🥇' : r.badge === 'silver' ? '🥈' : r.badge === 'bronze' ? '🥉' : `#${r.rank}`;
                          const isCurrency = cat.key === 'revenue';
                          return (
                            <div key={r.rank} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-amber-50 cursor-pointer"
                              onClick={() => openDrillDown({ title: `Sales: ${r.salesperson_name}`, salesperson_id: r.salesperson_id })}>
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${badgeBg}`}>{icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm text-gray-900 truncate">{r.salesperson_name || `ID ${r.salesperson_id}`}</div>
                                <div className="text-[11px] text-gray-500">{cat.label}</div>
                              </div>
                              <div className="text-right font-bold text-sm text-gray-900 shrink-0">
                                {isCurrency ? fmtCur(r.score) : fmtNum(r.score)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── SCORECARD ── */}
          {anaTab === 'scorecard' && (
            <>
              <Card className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-500 font-semibold">Filter Salesperson:</span>
                  <select className={inputCls + ' max-w-xs'} value={scorecardSpId} onChange={(e) => setScorecardSpId(e.target.value)}>
                    <option value="">Semua Sales</option>
                    {(filterOpts.salespersons || []).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <Btn icon={RefreshCw} onClick={loadScorecard}>{m('apply')}</Btn>
                </div>
              </Card>

              <div className="grid grid-cols-1 gap-4">
                {scorecards.map((sc: any) => (
                  <Card key={sc.salesperson_id} className="p-5">
                    <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-bold text-sm">
                            {(sc.salesperson_name || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-gray-900">{sc.salesperson_name || `ID ${sc.salesperson_id}`}</h4>
                            <p className="text-[11px] text-gray-500">{sc.team_name || '—'} · {sc.territory_name || '—'}</p>
                          </div>
                        </div>
                      </div>
                      {sc.target.achievement_pct !== null && (
                        <div className="text-right">
                          <div className="text-[10px] text-gray-500 uppercase">Achievement</div>
                          <div className={`text-2xl font-bold ${sc.target.achievement_pct >= 100 ? 'text-emerald-600' : sc.target.achievement_pct >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                            {sc.target.achievement_pct}%
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-3">
                        <div className="text-[10px] text-emerald-700 uppercase font-semibold">Revenue</div>
                        <div className="text-sm font-bold text-emerald-900">{fmtCur(sc.kpi.revenue)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3">
                        <div className="text-[10px] text-indigo-700 uppercase font-semibold">Outlet Dicakup</div>
                        <div className="text-sm font-bold text-indigo-900">{fmtNum(sc.kpi.outlets_covered)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3">
                        <div className="text-[10px] text-amber-700 uppercase font-semibold">Avg Order</div>
                        <div className="text-sm font-bold text-amber-900">{fmtCur(sc.kpi.avg_order_value)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                        <div className="text-[10px] text-purple-700 uppercase font-semibold">Rev/Outlet</div>
                        <div className="text-sm font-bold text-purple-900">{fmtCur(sc.kpi.revenue_per_outlet)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3">
                        <div className="text-[10px] text-slate-700 uppercase font-semibold">SKU Variety</div>
                        <div className="text-sm font-bold text-slate-900">{fmtNum(sc.kpi.unique_products)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                      <div><span className="text-gray-500">Trx:</span> <b>{fmtNum(sc.kpi.trx_count)}</b></div>
                      <div><span className="text-gray-500">Hari Aktif:</span> <b>{fmtNum(sc.kpi.active_days)}</b></div>
                      <div><span className="text-gray-500">Kunjungan:</span> <b>{fmtNum(sc.kpi.visit_count)}</b></div>
                      <div><span className="text-gray-500">Call Rate/hari:</span> <b>{sc.kpi.call_rate_per_day}</b></div>
                      <div><span className="text-gray-500">Productive Call:</span> <b>{sc.kpi.productive_call_rate !== null ? sc.kpi.productive_call_rate + '%' : '—'}</b></div>
                    </div>

                    {sc.target.value > 0 && (
                      <div className="mt-3">
                        <AchievementBar actual={sc.kpi.revenue} target={sc.target.value} />
                      </div>
                    )}

                    <div className="mt-3 flex justify-end">
                      <button onClick={() => openDrillDown({ title: `Sales: ${sc.salesperson_name}`, salesperson_id: sc.salesperson_id })}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Lihat entries
                      </button>
                    </div>
                  </Card>
                ))}
                {scorecards.length === 0 && (
                  <Card><EmptyState icon={Users} title="Belum ada data sales" subtitle="Pilih filter atau tambahkan sales entries." /></Card>
                )}
              </div>
            </>
          )}

          {/* ── ADVANCED KPIs ── */}
          {anaTab === 'advanced' && (
            <>
              {advKpis && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Revenue" value={fmtCur(advKpis.volume.revenue)} sub={`Gross ${fmtCur(advKpis.volume.gross_revenue)}`} icon={TrendingUp} color="bg-emerald-500" />
                    <StatCard label="Avg Basket" value={fmtCur(advKpis.basket.avg_basket_value)} sub={`${advKpis.basket.lines_per_order} lines/order`} icon={ShoppingBag} color="bg-indigo-500" />
                    <StatCard label="Avg Unit Price" value={fmtCur(advKpis.basket.avg_unit_price)} icon={Package} color="bg-amber-500" />
                    <StatCard label="Discount Rate" value={`${advKpis.basket.discount_rate_pct}%`} sub={`${fmtCur(advKpis.volume.total_discount)}`} icon={Percent} color="bg-purple-500" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-sm font-bold text-gray-900">Konsentrasi & Kualitas</h3>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-50">
                          <span className="text-gray-600">HHI (Herfindahl Index)</span>
                          <span className="font-mono font-bold">{advKpis.concentration.hhi} <span className="text-[10px] ml-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700">{advKpis.concentration.hhi_label}</span></span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                          <span className="text-gray-600">Return Rate</span>
                          <span className={`font-bold ${advKpis.concentration.return_rate_pct > 5 ? 'text-red-600' : 'text-emerald-600'}`}>{advKpis.concentration.return_rate_pct}%</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                          <span className="text-gray-600">Jumlah Outlet Aktif</span>
                          <span className="font-bold">{fmtNum(advKpis.volume.outlets)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-50">
                          <span className="text-gray-600">Jumlah Salesperson</span>
                          <span className="font-bold">{fmtNum(advKpis.volume.salespersons)}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600">SKU Unik Terjual</span>
                          <span className="font-bold">{fmtNum(advKpis.volume.products)}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-3">HHI &lt; 0.15 = terdiversifikasi (sehat), 0.15-0.25 = moderat, &gt; 0.25 = terkonsentrasi (risiko).</p>
                    </Card>

                    <Card className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-emerald-600" />
                        <h3 className="text-sm font-bold text-gray-900">Outlet Baru vs Repeat</h3>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={[
                            { name: 'Outlet Baru', value: advKpis.mix.new_outlets, fill: '#10b981' },
                            { name: 'Outlet Repeat', value: advKpis.mix.repeat_outlets, fill: '#6366f1' },
                          ]} dataKey="value" innerRadius={45} outerRadius={80} label />
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                        <div className="bg-emerald-50 rounded-lg p-2">
                          <div className="text-[10px] text-emerald-700 uppercase font-semibold">Rev Outlet Baru</div>
                          <div className="font-bold text-emerald-900">{fmtCur(advKpis.mix.new_outlet_revenue)}</div>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-2">
                          <div className="text-[10px] text-indigo-700 uppercase font-semibold">Rev Repeat</div>
                          <div className="font-bold text-indigo-900">{fmtCur(advKpis.mix.repeat_outlet_revenue)}</div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </>
              )}

              {/* Growth trend */}
              {growthTrend.length > 0 && (
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-gray-900">Tren Revenue 12 Bulan + MoM & YoY</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={growthTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="mom_growth_pct" name="MoM %" stroke="#10b981" strokeWidth={2} dot />
                      <Line yAxisId="right" type="monotone" dataKey="yoy_growth_pct" name="YoY %" stroke="#6366f1" strokeWidth={2} dot />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Sales Funnel */}
              {funnelData && (
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-gray-900">Sales Funnel (Visit → Order → Revenue)</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {(funnelData.stages || []).map((s: any, i: number) => {
                      const colors = ['bg-slate-500', 'bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
                      return (
                        <div key={s.stage} className="text-center">
                          <div className={`${colors[i % colors.length]} text-white rounded-lg p-3`}>
                            <div className="text-[10px] uppercase font-semibold opacity-80">{s.label}</div>
                            <div className="text-lg font-bold">{fmtNum(s.count)}</div>
                            {s.value !== null && <div className="text-[11px] opacity-90">{fmtCur(s.value)}</div>}
                          </div>
                          {i < funnelData.stages.length - 1 && (
                            <div className="text-center text-gray-400 my-1 text-xs">↓</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="text-[10px] text-gray-500 uppercase">Visit → Order</div>
                      <div className="font-bold text-gray-900">{funnelData.conversion.visit_to_order_pct !== null ? funnelData.conversion.visit_to_order_pct + '%' : '—'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="text-[10px] text-gray-500 uppercase">Order → Approved</div>
                      <div className="font-bold text-gray-900">{funnelData.conversion.order_to_approved_pct !== null ? funnelData.conversion.order_to_approved_pct + '%' : '—'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="text-[10px] text-gray-500 uppercase">Outlet Productivity</div>
                      <div className="font-bold text-gray-900">{funnelData.conversion.outlet_productivity_pct !== null ? funnelData.conversion.outlet_productivity_pct + '%' : '—'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="text-[10px] text-gray-500 uppercase">Avg Rev/Visit</div>
                      <div className="font-bold text-gray-900">{funnelData.conversion.avg_revenue_per_visit !== null ? fmtCur(funnelData.conversion.avg_revenue_per_visit) : '—'}</div>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════ TARGET CONFIG ═══════════ */}
      {subTab === 'target-config' && (
        <div className="space-y-4">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-2xl">
            {([
              ['item', m('cfgTabItem')],
              ['outlet-growth', m('cfgTabOutletGrowth')],
              ['integration', m('cfgTabIntegration')],
            ] as const).map(([k, label]) => (
              <button key={k} onClick={() => setCfgTab(k as any)}
                className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${cfgTab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Item targets */}
          {cfgTab === 'item' && (
            <>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">Target penjualan per item, grup produk, brand, atau global. Mendukung scope (global, team, salesperson, outlet, territory).</p>
                {canManage && (
                  <Btn icon={Plus} onClick={() => { setModal('item-target'); setForm({ period, target_level: 'product', target_type: 'value', scope_type: 'global', currency: 'IDR' }); }}>{m('addItemTarget')}</Btn>
                )}
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-gray-500 uppercase border-b border-gray-100">
                        <th className="px-4 py-3">Kode</th>
                        <th className="px-4 py-3">Nama</th>
                        <th className="px-4 py-3">Level</th>
                        <th className="px-4 py-3">Scope</th>
                        <th className="px-4 py-3">Periode</th>
                        <th className="px-4 py-3 text-right">Target Qty</th>
                        <th className="px-4 py-3 text-right">{m('statTargetValue')}</th>
                        <th className="px-4 py-3 text-right">Aktual</th>
                        <th className="px-4 py-3 w-52">Achievement</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {itemTargets.map((t: any) => (
                        <tr key={t.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{t.code}</td>
                          <td className="px-4 py-2.5 font-semibold text-gray-900">{t.name}</td>
                          <td className="px-4 py-2.5 text-xs"><span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold uppercase">{t.target_level}</span></td>
                          <td className="px-4 py-2.5 text-xs text-gray-600">{t.scope_type}{t.scope_name ? `: ${t.scope_name}` : ''}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{t.period}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtNum(Number(t.target_quantity))}</td>
                          <td className="px-4 py-2.5 text-right">{fmtCur(Number(t.target_value))}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmtCur(Number(t.actual_value))}</td>
                          <td className="px-4 py-2.5">
                            {Number(t.target_value) > 0
                              ? <AchievementBar actual={Number(t.actual_value)} target={Number(t.target_value)} />
                              : <span className="text-[11px] text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            {canManage && (
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => { setModal('item-target'); setForm(t); }} className="text-gray-500 hover:bg-gray-100 p-1 rounded"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => deleteItemTarget(t.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {itemTargets.length === 0 && (
                        <tr><td colSpan={10}><EmptyState icon={TargetIcon} title={m('emptyTargets')} subtitle={m('emptyTargetsSub')} /></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {/* Outlet growth targets */}
          {cfgTab === 'outlet-growth' && (
            <>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">Target pertumbuhan outlet: jumlah outlet bertransaksi, outlet baru, dan outlet produktif.</p>
                {canManage && (
                  <Btn icon={Plus} onClick={() => { setModal('growth-target'); setForm({ period, scope_type: 'global' }); }}>{m('addGrowthTarget')}</Btn>
                )}
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-gray-500 uppercase border-b border-gray-100">
                        <th className="px-4 py-3">Kode</th>
                        <th className="px-4 py-3">Nama</th>
                        <th className="px-4 py-3">Scope</th>
                        <th className="px-4 py-3">Periode</th>
                        <th className="px-4 py-3 text-right">Target Aktif</th>
                        <th className="px-4 py-3 text-right">Aktual Aktif</th>
                        <th className="px-4 py-3 text-right">Target Produktif</th>
                        <th className="px-4 py-3 text-right">Aktual Produktif</th>
                        <th className="px-4 py-3 text-right">Target Baru</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {growthTargets.map((g: any) => (
                        <tr key={g.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{g.code}</td>
                          <td className="px-4 py-2.5 font-semibold text-gray-900">{g.name}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-600">{g.scope_type}{g.scope_name ? `: ${g.scope_name}` : ''}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{g.period}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtNum(Number(g.target_active_outlets))}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-gray-900">{fmtNum(Number(g.actual_active_outlets || 0))}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtNum(Number(g.target_productive_outlets))}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-gray-900">{fmtNum(Number(g.actual_productive_outlets || 0))}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtNum(Number(g.target_new_outlets))}</td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            {canManage && (
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => { setModal('growth-target'); setForm(g); }} className="text-gray-500 hover:bg-gray-100 p-1 rounded"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => deleteGrowthTarget(g.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {growthTargets.length === 0 && (
                        <tr><td colSpan={10}><EmptyState icon={Store} title={m('emptyGrowth')} /></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {/* Integration config */}
          {cfgTab === 'integration' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-indigo-100 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-indigo-900 mb-0.5">{m('integPolicyTitle')}</h3>
                  <p className="text-xs text-indigo-800">
                    Kontrol penuh bagaimana SFA terintegrasi dengan data produk (Inventory) dan karyawan (HRIS). Pengaturan ini berlaku untuk seluruh tenant dan akan divalidasi di server.
                  </p>
                </div>
                {integrationHealth && (
                  <div className="text-right">
                    <div className="text-[10px] text-indigo-600 font-bold uppercase">Compliance</div>
                    <div className={`text-lg font-bold ${integrationHealth.compliance_score >= 90 ? 'text-emerald-700' : integrationHealth.compliance_score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {integrationHealth.compliance_score ?? 0}%
                    </div>
                  </div>
                )}
              </div>

              {/* Health cards */}
              {integrationHealth && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Target Fisik (Linked)" value={`${integrationHealth.targets_physical_linked || 0}/${integrationHealth.targets_physical_total || 0}`} icon={Package} color="emerald"
                    sub={`${integrationHealth.targets_physical_unlinked || 0} belum link inventory`} />
                  <StatCard label="Entry Fisik (Linked)" value={`${integrationHealth.entries_physical_linked || 0}/${integrationHealth.entries_physical_total || 0}`} icon={ShoppingBag} color="blue"
                    sub={`${integrationHealth.entries_physical_unlinked || 0} belum link inventory`} />
                  <StatCard label="Salesperson HRIS" value={`${integrationHealth.salespersons_hris_linked || 0}/${integrationHealth.salespersons_total || 0}`} icon={Users} color="purple"
                    sub={`${integrationHealth.salespersons_no_hris || 0} tanpa link HRIS`} />
                  <StatCard label="Auto Stock Decrement" value={integrationConfig?.auto_decrement_stock ? 'AKTIF' : 'OFF'} icon={Zap} color={integrationConfig?.auto_decrement_stock ? 'emerald' : 'amber'}
                    sub={integrationConfig?.allow_negative_stock ? 'Negatif: diizinkan' : 'Negatif: dicegah'} />
                </div>
              )}

              {/* Inventory policy */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-gray-900">{m('integInventoryTitle')}</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { k: 'require_inventory_for_physical_targets', label: m('intReqInvTargets'), desc: m('intReqInvTargetsDesc') },
                    { k: 'require_inventory_for_physical_entries', label: m('intReqInvEntries'), desc: m('intReqInvEntriesDesc') },
                    { k: 'allow_non_physical_without_inventory', label: m('intAllowNonPhysical'), desc: m('intAllowNonPhysicalDesc') },
                    { k: 'auto_decrement_stock', label: m('intAutoDecrement'), desc: m('intAutoDecrementDesc') },
                    { k: 'allow_negative_stock', label: m('intAllowNegative'), desc: m('intAllowNegativeDesc') },
                    { k: 'auto_snapshot_stock_on_target', label: m('intSnapshot'), desc: m('intSnapshotDesc') },
                  ].map(row => (
                    <label key={row.k} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition">
                      <input
                        type="checkbox"
                        disabled={!canManage}
                        checked={!!integrationConfig?.[row.k]}
                        onChange={(e) => saveIntegrationConfig({ [row.k]: e.target.checked })}
                        className="mt-0.5 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{row.label}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{row.desc}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${integrationConfig?.[row.k] ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {integrationConfig?.[row.k] ? 'AKTIF' : 'OFF'}
                      </span>
                    </label>
                  ))}
                </div>
              </Card>

              {/* HRIS policy */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-gray-900">{m('integHrisTitle')}</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { k: 'require_hris_for_salespersons', label: m('intHrisEntries'), desc: m('intHrisEntriesDesc') },
                    { k: 'require_hris_for_sp_targets', label: m('intHrisTargets'), desc: m('intHrisTargetsDesc') },
                    { k: 'auto_sync_on_field_orders', label: m('intAutoFo'), desc: m('intAutoFoDesc') },
                    { k: 'link_outlet_to_crm_customer', label: m('intLinkOutletCrm'), desc: m('intLinkOutletCrmDesc') },
                  ].map(row => (
                    <label key={row.k} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 cursor-pointer transition">
                      <input
                        type="checkbox"
                        disabled={!canManage}
                        checked={!!integrationConfig?.[row.k]}
                        onChange={(e) => saveIntegrationConfig({ [row.k]: e.target.checked })}
                        className="mt-0.5 w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{row.label}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{row.desc}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${integrationConfig?.[row.k] ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {integrationConfig?.[row.k] ? 'AKTIF' : 'OFF'}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Departemen sales filter */}
                <div className="mt-4 p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1.5">Departemen HRIS yang dianggap "Sales"</label>
                  <input
                    type="text"
                    disabled={!canManage}
                    className={inputCls}
                    value={(integrationConfig?.hris_sales_departments || []).join(', ')}
                    onChange={(e) => {
                      const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setIntegrationConfig((c: any) => ({ ...c, hris_sales_departments: arr }));
                    }}
                    onBlur={(e) => {
                      const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      saveIntegrationConfig({ hris_sales_departments: arr });
                    }}
                    placeholder="Sales, Marketing, SFA, Business Development"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Pisahkan dengan koma. Karyawan dari departemen ini akan muncul di picker salesperson. Kosongkan untuk menampilkan semua.</p>
                </div>
              </Card>

              {!canManage && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  Hanya Manager/Admin yang dapat mengubah konfigurasi integrasi.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ MODALS ═══════════ */}
      {modal === 'entry' && (
        <Modal title={form.id ? m('modalEditEntry') : m('modalAddEntry')} onClose={() => { setModal(''); setForm({}); }} wide>
          {/* Item Type Selector (universal — cocok semua industri) */}
          <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-3">
            <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-2">Tipe Item</label>
            <div className="flex gap-2 flex-wrap">
              {([
                { v: 'product', l: '📦 Produk (Inventory)', desc: 'Barang fisik, tracking stok' },
                { v: 'service', l: '🛠️ Jasa / Layanan', desc: 'Non-stock, bebas durasi' },
                { v: 'bundle', l: '🎁 Paket / Bundle', desc: 'Kombinasi produk' },
                { v: 'subscription', l: '🔄 Langganan', desc: 'Berulang / periodik' },
                { v: 'other', l: '🗂️ Lainnya', desc: 'Custom / ad-hoc' },
              ]).map(opt => (
                <button key={opt.v} type="button"
                  onClick={() => setForm({ ...form, item_type: opt.v, inventory_product_id: null, decrement_stock: opt.v === 'product' })}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${(form.item_type || 'product') === opt.v ? 'bg-amber-500 text-white shadow' : 'bg-white border border-amber-200 text-gray-600 hover:border-amber-400'}`}
                  title={opt.desc}
                >{opt.l}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tanggal" required><input type="date" className={inputCls} value={form.entry_date || ''} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></FormField>
            <FormField label="Tipe Sales" required>
              <select className={inputCls} value={form.sales_type || 'primary'} onChange={(e) => setForm({ ...form, sales_type: e.target.value })}>
                {salesTypes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </FormField>
            <FormField label="Outlet / Customer"><input className={inputCls} value={form.outlet_name || ''} onChange={(e) => setForm({ ...form, outlet_name: e.target.value })} /></FormField>
            <FormField label="Channel">
              <select className={inputCls} value={form.outlet_channel || ''} onChange={(e) => setForm({ ...form, outlet_channel: e.target.value })}>
                <option value="">—</option>
                {outletChannels.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </FormField>
            <FormField label="Kelas Outlet">
              <select className={inputCls} value={form.outlet_class || ''} onChange={(e) => setForm({ ...form, outlet_class: e.target.value })}>
                <option value="">—</option>
                {OUTLET_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Kota Outlet"><input className={inputCls} value={form.outlet_city || ''} onChange={(e) => setForm({ ...form, outlet_city: e.target.value })} /></FormField>

            {/* ── Item picker (inventory-backed) ── */}
            <FormField label={`Pilih dari Katalog ${form.item_type === 'service' ? 'Jasa' : form.item_type === 'bundle' ? 'Paket' : 'Produk'}`} span={2}>
              <ItemPicker
                itemType={(form.item_type || 'product') as any}
                selected={form._selectedItem || null}
                onSelect={(it) => {
                  setForm({
                    ...form,
                    _selectedItem: it,
                    inventory_product_id: it.id,
                    product_id: String(it.id),
                    product_sku: it.sku || '',
                    product_name: it.name,
                    product_group: it.category_name || form.product_group || '',
                    product_uom: it.unit || 'pcs',
                    unit_price: form.unit_price || it.sell_price,
                    item_type: it.item_type,
                    decrement_stock: it.item_type === 'product',
                  });
                }}
                onManualMode={() => setForm({ ...form, _selectedItem: null, inventory_product_id: null })}
              />
            </FormField>

            <FormField label="Nama Item" required><input className={inputCls} value={form.product_name || ''} onChange={(e) => setForm({ ...form, product_name: e.target.value })} /></FormField>
            <FormField label="SKU / Kode"><input className={inputCls} value={form.product_sku || ''} onChange={(e) => setForm({ ...form, product_sku: e.target.value })} /></FormField>
            <FormField label="Kategori / Grup"><input className={inputCls} value={form.product_group || ''} onChange={(e) => setForm({ ...form, product_group: e.target.value })} /></FormField>
            <FormField label="Brand"><input className={inputCls} value={form.product_brand || ''} onChange={(e) => setForm({ ...form, product_brand: e.target.value })} /></FormField>
            <FormField label="UOM / Satuan"><input className={inputCls} value={form.product_uom || ''} onChange={(e) => setForm({ ...form, product_uom: e.target.value })} placeholder="pcs, kg, session, bulan..." /></FormField>
            <FormField label="Quantity" required><input type="number" step="0.01" className={inputCls} value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></FormField>
            <FormField label="Harga Satuan" required><input type="number" step="0.01" className={inputCls} value={form.unit_price || ''} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></FormField>
            <FormField label="Discount"><input type="number" step="0.01" className={inputCls} value={form.discount_amount || ''} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} /></FormField>
            <FormField label="Pajak"><input type="number" step="0.01" className={inputCls} value={form.tax_amount || ''} onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} /></FormField>

            {/* ── Service-specific fields ── */}
            {form.item_type === 'service' && (
              <>
                <FormField label="Durasi (menit)"><input type="number" className={inputCls} value={form.service_duration_minutes || ''} onChange={(e) => setForm({ ...form, service_duration_minutes: e.target.value })} /></FormField>
                <FormField label="Lokasi Jasa"><input className={inputCls} value={form.service_location || ''} onChange={(e) => setForm({ ...form, service_location: e.target.value })} placeholder="Di outlet / on-site / online" /></FormField>
              </>
            )}

            {/* ── Inventory integration controls ── */}
            {form.item_type === 'product' && form.inventory_product_id && (
              <FormField label={m('integInventoryTitle')} span={2}>
                <div className="flex gap-4 items-center bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.decrement_stock !== false}
                      onChange={(e) => setForm({ ...form, decrement_stock: e.target.checked })} />
                    <span className="text-sm font-semibold text-indigo-700">Kurangi stok otomatis</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form.allow_negative_stock}
                      onChange={(e) => setForm({ ...form, allow_negative_stock: e.target.checked })} />
                    <span className="text-xs text-gray-600">Izinkan stok negatif</span>
                  </label>
                  {form._selectedItem && (
                    <span className="ml-auto text-xs text-indigo-700 font-semibold">
                      Tersedia: {form._selectedItem.stock_available} {form._selectedItem.unit}
                    </span>
                  )}
                </div>
              </FormField>
            )}

            <FormField label={
              <span className="flex items-center gap-1.5">
                Salesperson (HRIS)
                {integrationConfig?.require_hris_for_salespersons && <span className="text-red-500">*</span>}
              </span>
            } span={2}>
              <SalespersonPicker
                value={form._selectedSp || null}
                onSelect={(sp) => {
                  if (!sp) {
                    setForm({ ...form, _selectedSp: null, hris_employee_id: null, salesperson_user_id: null, salesperson_id: '', salesperson_name: '', salesperson_employee_number: '', salesperson_department: '' });
                    return;
                  }
                  setForm({
                    ...form,
                    _selectedSp: sp,
                    hris_employee_id: sp.hris_employee_id,
                    salesperson_user_id: sp.user_id || null,
                    salesperson_id: sp.user_id || sp.hris_employee_id,
                    salesperson_name: sp.name,
                    salesperson_employee_number: sp.employee_number || '',
                    salesperson_department: sp.department || '',
                  });
                }}
                allowManual={!integrationConfig?.require_hris_for_salespersons}
                onManualMode={() => setForm({ ...form, _selectedSp: null, hris_employee_id: null })}
              />
              {!form._selectedSp && integrationConfig?.require_hris_for_salespersons && (
                <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Kebijakan tenant: salesperson wajib di-link ke HRIS.</span>
                </div>
              )}
            </FormField>
            <FormField label="No Referensi"><input className={inputCls} value={form.reference_number || ''} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} /></FormField>
            <FormField label="Status">
              <select className={inputCls} value={form.status || 'confirmed'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="invoiced">Invoiced</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </FormField>
            <FormField label="Catatan" span={2}><textarea className={inputCls} rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => { setModal(''); setForm({}); }}>{m('cancel')}</Btn>
            <Btn icon={Save} onClick={submitEntry}>{m('save')}</Btn>
          </div>
        </Modal>
      )}

      {modal === 'bulk' && (
        <Modal title={m('modalBulk')} onClose={() => { setModal(''); setBulkRows([{}]); setBulkSharedSp(null); }} wide>
          <p className="text-xs text-gray-500 mb-3">Input beberapa penjualan sekaligus. Setiap baris minimal memiliki tanggal dan nama produk.</p>

          {/* Shared salesperson applier */}
          <div className="mb-3 p-3 rounded-xl border bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Salesperson (HRIS) untuk semua baris</label>
              {integrationConfig?.require_hris_for_salespersons && (
                <span className="text-[10px] font-semibold text-red-600">* Wajib HRIS</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SalespersonPicker
                  value={bulkSharedSp}
                  onSelect={(sp) => {
                    setBulkSharedSp(sp);
                    if (sp) {
                      setBulkRows(rows => rows.map(r => ({
                        ...r,
                        hris_employee_id: sp.hris_employee_id,
                        salesperson_user_id: sp.user_id || null,
                        salesperson_id: sp.user_id || sp.hris_employee_id,
                        salesperson_name: sp.name,
                        salesperson_employee_number: sp.employee_number || '',
                        salesperson_department: sp.department || '',
                      })));
                    }
                  }}
                  allowManual={!integrationConfig?.require_hris_for_salespersons}
                  onManualMode={() => setBulkSharedSp(null)}
                />
              </div>
              {bulkSharedSp && (
                <button type="button"
                  onClick={() => {
                    setBulkSharedSp(null);
                    setBulkRows(rows => rows.map(r => ({ ...r, hris_employee_id: null, salesperson_user_id: null, salesperson_id: '', salesperson_name: '', salesperson_employee_number: '', salesperson_department: '' })));
                  }}
                  className="text-[11px] font-semibold text-red-600 px-2 py-1.5 rounded hover:bg-red-50">
                  {m('reset')}
                </button>
              )}
            </div>
            <p className="text-[10px] text-indigo-700 mt-1.5">Pilih satu karyawan HRIS untuk menerapkan ke semua baris. Anda masih bisa mengoverride per baris di bawah bila perlu.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] text-gray-500 uppercase">
                  <th className="py-2 pr-2">Tanggal</th>
                  <th className="py-2 pr-2">Tipe</th>
                  <th className="py-2 pr-2">Outlet</th>
                  <th className="py-2 pr-2">Channel</th>
                  <th className="py-2 pr-2">Produk</th>
                  <th className="py-2 pr-2">Grup</th>
                  <th className="py-2 pr-2">Qty</th>
                  <th className="py-2 pr-2">Harga</th>
                  <th className="py-2 pr-2">Sales</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bulkRows.map((r, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2"><input type="date" className={inputCls} value={r.entry_date || ''} onChange={(e) => updateBulkRow(i, 'entry_date', e.target.value)} /></td>
                    <td className="py-1 pr-2">
                      <select className={inputCls} value={r.sales_type || 'primary'} onChange={(e) => updateBulkRow(i, 'sales_type', e.target.value)}>
                        {salesTypes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="py-1 pr-2"><input className={inputCls} value={r.outlet_name || ''} onChange={(e) => updateBulkRow(i, 'outlet_name', e.target.value)} /></td>
                    <td className="py-1 pr-2">
                      <select className={inputCls} value={r.outlet_channel || ''} onChange={(e) => updateBulkRow(i, 'outlet_channel', e.target.value)}>
                        <option value="">—</option>
                        {outletChannels.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </td>
                    <td className="py-1 pr-2"><input className={inputCls} value={r.product_name || ''} onChange={(e) => updateBulkRow(i, 'product_name', e.target.value)} /></td>
                    <td className="py-1 pr-2"><input className={inputCls} value={r.product_group || ''} onChange={(e) => updateBulkRow(i, 'product_group', e.target.value)} /></td>
                    <td className="py-1 pr-2"><input type="number" step="0.01" className={inputCls} value={r.quantity || ''} onChange={(e) => updateBulkRow(i, 'quantity', e.target.value)} /></td>
                    <td className="py-1 pr-2"><input type="number" step="0.01" className={inputCls} value={r.unit_price || ''} onChange={(e) => updateBulkRow(i, 'unit_price', e.target.value)} /></td>
                    <td className="py-1 pr-2"><input className={inputCls} value={r.salesperson_name || ''} onChange={(e) => updateBulkRow(i, 'salesperson_name', e.target.value)} /></td>
                    <td className="py-1 pr-2 text-right">
                      {bulkRows.length > 1 && <button onClick={() => removeBulkRow(i)} className="text-red-500"><X className="w-4 h-4" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between mt-4">
            <Btn variant="secondary" icon={Plus} onClick={addBulkRow}>{m('addRow')}</Btn>
            <div className="flex gap-2">
              <Btn variant="secondary" onClick={() => { setModal(''); setBulkRows([{}]); }}>{m('cancel')}</Btn>
              <Btn icon={Save} onClick={submitBulk}>{m('saveAll')}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'import' && (
        <Modal title={m('importFieldOrder')} onClose={() => setModal('')}>
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Semua Field Order berstatus <b>approved</b> pada periode <b>{period}</b> akan diimpor sebagai entry penjualan primary (sell-in). Field order yang di-approve setelah ini akan ter-sync otomatis.</span>
            </div>
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => setModal('')}>{m('cancel')}</Btn>
              <Btn icon={Upload} onClick={submitImport}>{m('processImport')}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'csv-import' && (
        <Modal title={m('modalCsvTitle')} onClose={() => { setModal(''); setCsvText(''); setCsvImportResult(null); }} wide>
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
              <FileSpreadsheet className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="mb-1">Gunakan template CSV resmi agar kolom sesuai. Kolom wajib: <code className="bg-white px-1 rounded">entry_date</code>, <code className="bg-white px-1 rounded">product_name</code>, <code className="bg-white px-1 rounded">quantity</code>, <code className="bg-white px-1 rounded">unit_price</code>.</p>
                <button onClick={downloadCsvTemplate} className="text-amber-700 underline font-semibold hover:text-amber-900">📥 Download Template CSV</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Upload file CSV">
                <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onCsvFile(e.target.files[0])}
                  className="block w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" />
              </FormField>
              <FormField label="Atau paste teks CSV">
                <span className="text-[10px] text-gray-500">Karakter: {csvText.length.toLocaleString()}</span>
              </FormField>
            </div>
            <FormField label="Preview / Paste Area" span={2}>
              <textarea className={inputCls + ' font-mono text-xs'} rows={10} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="entry_date,sales_type,...&#10;2026-04-18,primary,..." />
            </FormField>
            {csvImportResult && (
              <div className={`rounded-xl p-3 border text-xs ${csvImportResult.errors.length > 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                <div className="font-semibold mb-1">Hasil: {csvImportResult.inserted} baris tersimpan, {csvImportResult.errors.length} error</div>
                {csvImportResult.errors.slice(0, 10).map((e: any, i: number) => (
                  <div key={i}>Baris {e.row}: {e.error}</div>
                ))}
                {csvImportResult.errors.length > 10 && <div>... dan {csvImportResult.errors.length - 10} error lainnya</div>}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => { setModal(''); setCsvText(''); setCsvImportResult(null); }}>{m('close')}</Btn>
              <Btn icon={FileUp} onClick={submitCsvImport}>{m('importNow')}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'drilldown' && drillCtx && (
        <Modal title={m('detailEntries', { title: drillCtx.title })} onClose={() => { setModal(''); setDrillCtx(null); setDrillRows([]); setDrillSummary(null); }} wide>
          <div className="space-y-3">
            {drillSummary && (
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Jumlah Baris" value={fmtNum(drillSummary.count || 0)} icon={Layers} color="bg-indigo-500" />
                <StatCard label="Total Qty" value={fmtNum(drillSummary.qty || 0)} icon={Package} color="bg-emerald-500" />
                <StatCard label="Total Nilai" value={fmtCur(drillSummary.total || 0)} icon={TrendingUp} color="bg-amber-500" />
              </div>
            )}
            <div className="overflow-x-auto max-h-[450px] overflow-y-auto border border-gray-100 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-[11px] text-gray-500 uppercase">
                    <th className="px-3 py-2">Tanggal</th>
                    <th className="px-3 py-2">Tipe</th>
                    <th className="px-3 py-2">Salesperson</th>
                    <th className="px-3 py-2">Outlet</th>
                    <th className="px-3 py-2">Produk</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Net</th>
                    <th className="px-3 py-2">Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {drillRows.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 text-xs">{fmtDate(r.entry_date)}</td>
                      <td className="px-3 py-2 text-[11px]"><span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold uppercase">{r.sales_type}</span></td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.salesperson_name || '—'}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-gray-900">{r.outlet_name || '—'}</td>
                      <td className="px-3 py-2 text-xs">{r.product_name}{r.product_group ? <span className="text-[10px] text-gray-400 block">{r.product_group}</span> : null}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{fmtNum(Number(r.quantity))}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{fmtCur(Number(r.unit_price))}</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900">{fmtCur(Number(r.net_amount))}</td>
                      <td className="px-3 py-2 text-[10px] text-gray-500 font-mono">{r.reference_number || '—'}</td>
                    </tr>
                  ))}
                  {drillRows.length === 0 && (
                    <tr><td colSpan={9}><EmptyState icon={Layers} title="Tidak ada data" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Btn variant="secondary" onClick={() => { setModal(''); setDrillCtx(null); setDrillRows([]); setDrillSummary(null); }}>{m('close')}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'item-target' && (
        <Modal title={form.id ? m('modalEditTarget') : m('modalNewTarget')} onClose={() => { setModal(''); setForm({}); }} wide>
          {/* Integration policy banner */}
          <div className="mb-4 p-3 rounded-xl border bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-800 space-y-0.5 flex-1">
              <p className="font-semibold">{m('integPolicyTitle')}</p>
              <p>
                Produk fisik {integrationConfig?.require_inventory_for_physical_targets ? <b className="text-indigo-900">WAJIB</b> : 'opsional'} terhubung ke katalog inventory.
                {' '}Target scope salesperson {integrationConfig?.require_hris_for_sp_targets ? <b className="text-indigo-900">WAJIB</b> : 'dapat'} di-link ke HRIS.
              </p>
            </div>
            {canManage && (
              <button onClick={() => { setModal(''); setSubTab('target-config'); setCfgTab('integration' as any); }}
                className="text-[11px] font-semibold text-indigo-700 hover:underline flex items-center gap-1 shrink-0"
                type="button">
                <SettingsIcon className="w-3 h-3" /> Atur Kebijakan
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nama Target" required span={2}>
              <input className={inputCls} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth: Target Penjualan Q1 Produk A" />
            </FormField>

            <FormField label="Level Target" required>
              <select className={inputCls} value={form.target_level || 'product'} onChange={(e) => setForm({ ...form, target_level: e.target.value })}>
                <option value="global">Global (Seluruh Penjualan)</option>
                <option value="product_group">Per Grup Produk</option>
                <option value="product">Per Item Produk</option>
                <option value="brand">Per Brand</option>
              </select>
            </FormField>

            <FormField label="Tipe Item">
              <select className={inputCls} value={form.item_type || 'product'}
                onChange={(e) => {
                  const nt = e.target.value;
                  const isPhys = nt === 'product' || nt === 'bundle';
                  setForm({
                    ...form,
                    item_type: nt,
                    // Clear selected inventory link when switching to non-physical that allows manual
                    ...(!isPhys && integrationConfig?.allow_non_physical_without_inventory
                      ? { _selectedItem: null, inventory_product_id: null, require_inventory_link: false }
                      : {}),
                  });
                }}>
                <option value="product">Produk Fisik (wajib inventory)</option>
                <option value="bundle">Paket / Bundle (wajib inventory)</option>
                <option value="service">Jasa / Layanan (non-fisik)</option>
                <option value="subscription">Subscription / Langganan (non-fisik)</option>
                <option value="other">Non-fisik lainnya</option>
              </select>
            </FormField>

            {form.target_level === 'product' && (
              <FormField label={
                <span className="flex items-center gap-1.5">
                  Pilih Item dari Inventory
                  {((form.item_type || 'product') === 'product' || form.item_type === 'bundle') && integrationConfig?.require_inventory_for_physical_targets && (
                    <span className="text-red-500 text-sm">*</span>
                  )}
                </span>
              } span={2}>
                <ItemPicker
                  itemType={(form.item_type || 'product') as any}
                  selected={form._selectedItem || null}
                  onSelect={(it) => {
                    setForm({
                      ...form,
                      _selectedItem: it,
                      inventory_product_id: it.id,
                      product_id: String(it.id),
                      product_sku: it.sku || '',
                      product_name: it.name,
                      product_group: it.category_name || form.product_group || '',
                      product_unit: it.unit || 'pcs',
                      product_category_id: it.category_id || null,
                      item_type: it.item_type || form.item_type || 'product',
                      require_inventory_link: true,
                    });
                  }}
                  onManualMode={
                    ((form.item_type === 'service' || form.item_type === 'subscription' || form.item_type === 'other')
                      && integrationConfig?.allow_non_physical_without_inventory)
                      ? () => setForm({ ...form, _selectedItem: null, inventory_product_id: null, require_inventory_link: false })
                      : undefined
                  }
                />
                {form._selectedItem && (
                  <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-800 flex items-start gap-2">
                    <Link2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div><b>{form._selectedItem.name}</b> · SKU <span className="font-mono">{form._selectedItem.sku || '—'}</span></div>
                      <div className="text-[10px] text-emerald-700 mt-0.5 flex gap-3 flex-wrap">
                        <span>Stok: <b>{form._selectedItem.stock_available}</b> {form._selectedItem.unit}</span>
                        <span>Harga: <b>Rp {form._selectedItem.sell_price?.toLocaleString()}</b></span>
                        {form._selectedItem.category_name && <span>Kategori: <b>{form._selectedItem.category_name}</b></span>}
                      </div>
                    </div>
                  </div>
                )}
                {!form._selectedItem && (form.item_type === 'product' || form.item_type === 'bundle' || !form.item_type) && integrationConfig?.require_inventory_for_physical_targets && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Produk fisik wajib dipilih dari katalog inventory.</span>
                  </div>
                )}
                {!form._selectedItem && (form.item_type === 'service' || form.item_type === 'subscription' || form.item_type === 'other') && (
                  <div className="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-800 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Item non-fisik boleh diinput manual tanpa link ke inventory (sesuai kebijakan tenant).</span>
                  </div>
                )}
              </FormField>
            )}

            {form.target_level === 'product' && (
              <>
                <FormField label="Nama Item / Jasa">
                  <input className={inputCls} value={form.product_name || ''} disabled={!!form.inventory_product_id}
                    onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
                </FormField>
                <FormField label="SKU / Kode">
                  <input className={inputCls} value={form.product_sku || ''} disabled={!!form.inventory_product_id}
                    onChange={(e) => setForm({ ...form, product_sku: e.target.value })} />
                </FormField>
              </>
            )}

            {form.target_level === 'product_group' && (
              <FormField label="Grup Produk / Kategori" span={2}>
                <input className={inputCls} value={form.product_group || ''} onChange={(e) => setForm({ ...form, product_group: e.target.value })}
                  placeholder="cth: Snack · Minuman · Elektronik" />
              </FormField>
            )}
            {form.target_level === 'brand' && (
              <FormField label="Brand" span={2}><input className={inputCls} value={form.product_brand || ''}
                onChange={(e) => setForm({ ...form, product_brand: e.target.value })} /></FormField>
            )}

            <FormField label="Scope">
              <select className={inputCls} value={form.scope_type || 'global'}
                onChange={(e) => setForm({ ...form, scope_type: e.target.value, scope_id: '', scope_name: '', hris_employee_id: null, _selectedSp: null })}>
                <option value="global">Global</option>
                <option value="branch">Branch</option>
                <option value="territory">Territory</option>
                <option value="team">Tim</option>
                <option value="salesperson">Salesperson</option>
                <option value="outlet">Outlet</option>
              </select>
            </FormField>

            {form.scope_type === 'salesperson' ? (
              <FormField label={
                <span className="flex items-center gap-1.5">
                  Pilih Salesperson (HRIS)
                  {integrationConfig?.require_hris_for_sp_targets && <span className="text-red-500">*</span>}
                </span>
              } span={2}>
                <SalespersonPicker
                  value={form._selectedSp || null}
                  onSelect={(sp) => {
                    if (!sp) {
                      setForm({ ...form, _selectedSp: null, hris_employee_id: null, salesperson_user_id: null, scope_id: '', scope_name: '' });
                      return;
                    }
                    setForm({
                      ...form,
                      _selectedSp: sp,
                      hris_employee_id: sp.hris_employee_id,
                      salesperson_user_id: sp.user_id || null,
                      scope_id: sp.user_id ? String(sp.user_id) : sp.hris_employee_id,
                      scope_name: sp.name,
                    });
                  }}
                  allowManual={!integrationConfig?.require_hris_for_sp_targets}
                  onManualMode={() => setForm({ ...form, _selectedSp: null, hris_employee_id: null })}
                />
              </FormField>
            ) : (form.scope_type && form.scope_type !== 'global') ? (
              <>
                <FormField label="Scope ID"><input className={inputCls} value={form.scope_id || ''} onChange={(e) => setForm({ ...form, scope_id: e.target.value })} /></FormField>
                <FormField label="Scope Name"><input className={inputCls} value={form.scope_name || ''} onChange={(e) => setForm({ ...form, scope_name: e.target.value })} /></FormField>
              </>
            ) : null}

            <FormField label="Periode" required><input type="month" className={inputCls} value={form.period || ''} onChange={(e) => setForm({ ...form, period: e.target.value })} /></FormField>
            <FormField label="Tipe Target">
              <select className={inputCls} value={form.target_type || 'value'} onChange={(e) => setForm({ ...form, target_type: e.target.value })}>
                <option value="value">Nilai (Rupiah)</option>
                <option value="quantity">Quantity</option>
                <option value="both">Keduanya</option>
              </select>
            </FormField>
            <FormField label="Target Quantity"><input type="number" step="0.01" className={inputCls} value={form.target_quantity || ''} onChange={(e) => setForm({ ...form, target_quantity: e.target.value })} /></FormField>
            <FormField label={m('statTargetValue')}><input type="number" step="0.01" className={inputCls} value={form.target_value || ''} onChange={(e) => setForm({ ...form, target_value: e.target.value })} /></FormField>
            <FormField label="Catatan" span={2}><textarea className={inputCls} rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => { setModal(''); setForm({}); }}>{m('cancel')}</Btn>
            <Btn icon={Save} onClick={submitItemTarget}>{m('save')}</Btn>
          </div>
        </Modal>
      )}

      {modal === 'growth-target' && (
        <Modal title={form.id ? m('modalEditGrowth') : m('modalNewGrowth')} onClose={() => { setModal(''); setForm({}); }}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nama" required span={2}><input className={inputCls} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
            <FormField label="Scope">
              <select className={inputCls} value={form.scope_type || 'global'} onChange={(e) => setForm({ ...form, scope_type: e.target.value })}>
                <option value="global">Global</option>
                <option value="branch">Branch</option>
                <option value="territory">Territory</option>
                <option value="team">Tim</option>
                <option value="salesperson">Salesperson</option>
              </select>
            </FormField>
            <FormField label="Periode" required><input type="month" className={inputCls} value={form.period || ''} onChange={(e) => setForm({ ...form, period: e.target.value })} /></FormField>
            {form.scope_type && form.scope_type !== 'global' && <>
              <FormField label="Scope ID"><input className={inputCls} value={form.scope_id || ''} onChange={(e) => setForm({ ...form, scope_id: e.target.value })} /></FormField>
              <FormField label="Scope Name"><input className={inputCls} value={form.scope_name || ''} onChange={(e) => setForm({ ...form, scope_name: e.target.value })} /></FormField>
            </>}
            <FormField label="Target Outlet Aktif (bertransaksi)"><input type="number" className={inputCls} value={form.target_active_outlets || ''} onChange={(e) => setForm({ ...form, target_active_outlets: e.target.value })} /></FormField>
            <FormField label="Target Outlet Baru"><input type="number" className={inputCls} value={form.target_new_outlets || ''} onChange={(e) => setForm({ ...form, target_new_outlets: e.target.value })} /></FormField>
            <FormField label="Target Outlet Produktif"><input type="number" className={inputCls} value={form.target_productive_outlets || ''} onChange={(e) => setForm({ ...form, target_productive_outlets: e.target.value })} /></FormField>
            <FormField label="Target Outlet Terdaftar"><input type="number" className={inputCls} value={form.target_registered_outlets || ''} onChange={(e) => setForm({ ...form, target_registered_outlets: e.target.value })} /></FormField>
            <FormField label="Threshold Produktif (Rp)"><input type="number" step="0.01" className={inputCls} value={form.productive_threshold || ''} onChange={(e) => setForm({ ...form, productive_threshold: e.target.value })} /></FormField>
            <FormField label="Target Growth Rate (%)"><input type="number" step="0.01" className={inputCls} value={form.growth_rate_target || ''} onChange={(e) => setForm({ ...form, growth_rate_target: e.target.value })} /></FormField>
            <FormField label="Catatan" span={2}><textarea className={inputCls} rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => { setModal(''); setForm({}); }}>{m('cancel')}</Btn>
            <Btn icon={Save} onClick={submitGrowthTarget}>{m('save')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Inventory-backed item picker (product / service / bundle / subscription / other)
// ────────────────────────────────────────────────────────────────
type CatalogItem = {
  id: number; name: string; sku: string; barcode?: string; unit: string;
  sell_price: number; buy_price: number; category_id?: number; category_name?: string;
  product_type?: string; is_trackable?: boolean; can_be_sold: boolean;
  item_type: 'product' | 'service' | 'bundle' | 'subscription' | 'other';
  stock_total: number; stock_available: number; stock_locations: number;
};

function ItemPicker({
  itemType, onSelect, onManualMode, selected,
}: {
  itemType: 'product' | 'service' | 'bundle' | 'subscription' | 'other' | 'all';
  onSelect: (item: CatalogItem) => void;
  onManualMode?: () => void;
  selected?: CatalogItem | null;
}) {
  const { t } = useTranslation();
  const m = useCallback((key: string, params?: Record<string, string | number>) => t(`sfa.salesMgmt.${key}` as any, params), [t]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loadingPick, setLoadingPick] = useState(false);
  const debounceRef = useRef<any>(null);

  const fetchItems = useCallback(async (kw: string) => {
    setLoadingPick(true);
    try {
      const qs = new URLSearchParams({ item_type: itemType, limit: '30' });
      if (kw) qs.set('search', kw);
      const r = await fetch(`/api/hq/sfa/sales-management?action=item-catalog&${qs.toString()}`);
      const j = await r.json();
      if (j.success) setItems(j.data || []);
    } finally { setLoadingPick(false); }
  }, [itemType]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchItems(search), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, open, fetchItems]);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:border-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 text-left">
        <Package className="w-4 h-4 text-gray-400" />
        <span className="flex-1 truncate">
          {selected ? (
            <>
              <b>{selected.name}</b>
              <span className="text-[11px] text-gray-500 ml-2">· {selected.sku || 'no-SKU'}</span>
              {selected.item_type === 'product' && (
                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${selected.stock_available > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {m('stock', { n: selected.stock_available })}
                </span>
              )}
            </>
          ) : <span className="text-gray-400">{m('pickItemPlaceholder')}</span>}
        </span>
        <span className="text-xs text-amber-600">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={m('searchSku')}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none" />
            {onManualMode && (
              <button type="button" onClick={() => { onManualMode(); setOpen(false); }}
                className="text-[11px] font-semibold px-2 py-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 shrink-0">{m('manualInput')}</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loadingPick && (
              <div className="p-4 text-center text-xs text-gray-500">{m('loading')}</div>
            )}
            {!loadingPick && items.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-400">{m('noMatchingItems')} {onManualMode ? m('useManualAdhoc') : ''}</div>
            )}
            {items.map((it) => {
              const isService = it.item_type === 'service';
              const isBundle = it.item_type === 'bundle';
              const stockColor = isService ? 'bg-blue-50 text-blue-700'
                : it.stock_available > 10 ? 'bg-emerald-50 text-emerald-700'
                  : it.stock_available > 0 ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-600';
              return (
                <button key={it.id} type="button" onClick={() => { onSelect(it); setOpen(false); setSearch(''); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-amber-50/60 border-b border-gray-50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900 truncate">{it.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${isService ? 'bg-blue-100 text-blue-700' : isBundle ? 'bg-purple-100 text-purple-700' : it.item_type === 'subscription' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {it.item_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        SKU: <span className="font-mono">{it.sku || '—'}</span>
                        {it.category_name && <span className="ml-2">· {it.category_name}</span>}
                        <span className="ml-2">· {it.unit}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-gray-900">{it.sell_price.toLocaleString()}</div>
                      {!isService && (
                        <div className={`text-[10px] font-semibold px-1.5 py-0.5 rounded inline-block ${stockColor}`}>
                          {isService ? m('serviceShort') : m('stock', { n: it.stock_available })}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Modal & form helpers
// ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: any; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl shadow-2xl mt-10 w-full ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, required, children, span }: any) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}
