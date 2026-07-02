import React, { useState, useEffect } from 'react';
import {
  Sparkles, Clock, Play, Pause, RefreshCw, Download,
  DollarSign, Receipt, Store, Target, ArrowUpRight, ArrowDownRight,
  Activity, Package, AlertCircle, Building2, BarChart3, Truck,
  Bell, CheckCircle, TrendingUp, TrendingDown, Users, AlertTriangle,
  Settings, ChevronRight, Wallet, CreditCard, Briefcase
} from 'lucide-react';
import WidgetWrapper from './WidgetWrapper';
import { WidgetComponentProps } from '../../../lib/widgets/types';
import { useTranslation, localeMap } from '@/lib/i18n';

interface DashboardData {
  branches: any[];
  alerts: any[];
  salesTrend: any[];
  regionPerformance: any[];
}

function useDashboardData() {
  const [data, setData] = useState<DashboardData>({ branches: [], alerts: [], salesTrend: [], regionPerformance: [] });
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/hq/dashboard?period=today');
      if (r.ok) {
        const json = await r.json();
        const p = json.data || json;
        setData({
          branches: p.branches || [],
          alerts: p.alerts || [],
          salesTrend: p.salesTrend || [],
          regionPerformance: p.regionPerformance || [],
        });
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch_(); const i = setInterval(fetch_, 60000); return () => clearInterval(i); }, []);
  return { data, loading, refresh: fetch_ };
}

// ═══════════════════════════════════════════════
// WIDGET: Welcome Header
// ═══════════════════════════════════════════════
export function WelcomeWidget({ isEditMode }: WidgetComponentProps) {
  const { t, language } = useTranslation();
  const [time, setTime] = useState(new Date());
  const [isLive, setIsLive] = useState(true);
  useEffect(() => { const ti = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(ti); }, []);

  const greeting = time.getHours() < 12 ? t('dashboard.wc.morning') : time.getHours() < 18 ? t('dashboard.wc.afternoon') : t('dashboard.wc.evening');

  return (
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-xl p-6 text-white shadow-xl h-full">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('dashboard.wc.greet')} {greeting}!</h1>
              <p className="text-white/80 text-sm">
                {time.toLocaleDateString(localeMap[language] || 'id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm">{isLive ? t('dashboard.wc.liveMode') : t('dashboard.wc.staticMode')}</span>
            </div>
            <div className="text-sm text-white/80">
              <Clock className="w-4 h-4 inline mr-1" />
              {time.toLocaleTimeString(localeMap[language] || 'id-ID')}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isLive ? 'bg-green-500/20 text-green-100 border border-green-400/30' : 'bg-white/10 text-white/80 border border-white/20'
            }`}
          >
            {isLive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isLive ? t('dashboard.wc.live') : t('dashboard.wc.paused')}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl text-sm font-medium hover:bg-white/90 transition-all">
            <Download className="w-4 h-4" />
            {t('dashboard.wc.export')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// WIDGET: Revenue Today
// ═══════════════════════════════════════════════
export function RevenueTodayWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const { data, loading } = useDashboardData();
  const active = data.branches.filter((b: any) => b.isActive && b.type !== 'warehouse');
  const today = active.reduce((s: number, b: any) => s + b.todaySales, 0);
  const yesterday = active.reduce((s: number, b: any) => s + b.yesterdaySales, 0);
  const growth = yesterday > 0 ? ((today - yesterday) / yesterday * 100) : 0;

  return (
    <WidgetWrapper title={t('dashboard.widgets.sales-revenue-today')} module="sales" icon={<Wallet className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      {loading ? <div className="animate-pulse h-16 bg-gray-100 rounded-lg" /> : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              growth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              {growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(growth).toFixed(1)}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(today)}</p>
          <p className="text-xs text-gray-400 mt-1">vs {formatCurrency(yesterday)} {t('dashboard.wc.yesterday')}</p>
        </div>
      )}
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// WIDGET: Transaction Count
// ═══════════════════════════════════════════════
export function TransactionCountWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const { data, loading } = useDashboardData();
  const active = data.branches.filter((b: any) => b.isActive && b.type !== 'warehouse');
  const totalTrx = active.reduce((s: number, b: any) => s + b.transactionCount, 0);
  const totalSales = active.reduce((s: number, b: any) => s + b.todaySales, 0);

  return (
    <WidgetWrapper title={t('dashboard.widgets.sales-transactions')} module="sales" icon={<CreditCard className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      {loading ? <div className="animate-pulse h-16 bg-gray-100 rounded-lg" /> : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-600">
              <Activity className="w-3 h-3" /> {t('dashboard.wc.live')}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalTrx.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">{t('dashboard.wc.avg')} {formatCurrency(totalSales / (totalTrx || 1))}{t('dashboard.wc.perTrx')}</p>
        </div>
      )}
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// WIDGET: Stock Value
// ═══════════════════════════════════════════════
export function StockValueWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const { data, loading } = useDashboardData();
  const totalStock = data.branches.reduce((s: number, b: any) => s + b.stockValue, 0);
  const lowStock = data.branches.reduce((s: number, b: any) => s + b.lowStockItems, 0);

  return (
    <WidgetWrapper title={t('dashboard.widgets.inventory-stock-value')} module="inventory" icon={<Package className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      {loading ? <div className="animate-pulse h-16 bg-gray-100 rounded-lg" /> : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-gradient-to-br from-violet-400 to-violet-600 rounded-xl">
              <Package className="w-5 h-5 text-white" />
            </div>
            {lowStock > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-600">
                <AlertCircle className="w-3 h-3" /> {lowStock}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalStock)}</p>
          <p className="text-xs text-gray-400 mt-1">{t('dashboard.wc.atLocations', { count: data.branches.length })}</p>
        </div>
      )}
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// WIDGET: Monthly Target
// ═══════════════════════════════════════════════
export function MonthlyTargetWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const { data, loading } = useDashboardData();
  const active = data.branches.filter((b: any) => b.isActive && b.type !== 'warehouse');
  const monthSales = active.reduce((s: number, b: any) => s + b.monthSales, 0);
  const targetAmount = 5000000000;
  const pct = Math.round((monthSales / targetAmount) * 100);

  return (
    <WidgetWrapper title={t('dashboard.widgets.sales-monthly-target')} module="sales" icon={<Target className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      {loading ? <div className="animate-pulse h-16 bg-gray-100 rounded-lg" /> : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-600">{t('dashboard.wc.thisMonth')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(monthSales)}</p>
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">{t('dashboard.wc.target')} {formatCurrency(targetAmount)}</span>
              <span className="font-medium text-amber-600">{pct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-gradient-to-r from-amber-400 to-amber-600 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// WIDGET: Active Branches Status
// ═══════════════════════════════════════════════
export function BranchStatusWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  const { data, loading } = useDashboardData();
  const online = data.branches.filter((b: any) => b.status === 'online').length;
  const warning = data.branches.filter((b: any) => b.status === 'warning').length;
  const offline = data.branches.filter((b: any) => b.status === 'offline').length;
  const avgPerf = data.branches.length > 0
    ? Math.round(data.branches.filter((b: any) => b.isActive).reduce((s: number, b: any) => s + b.performanceScore, 0) / (data.branches.filter((b: any) => b.isActive).length || 1))
    : 0;

  return (
    <WidgetWrapper title={t('dashboard.widgets.branch-status')} module="branches" icon={<Store className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      {loading ? <div className="animate-pulse h-16 bg-gray-100 rounded-lg" /> : (
        <div>
          <p className="text-2xl font-bold text-gray-900">{online}/{data.branches.length}</p>
          <div className="flex items-center gap-3 text-xs mt-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" />{online} {t('dashboard.wc.online')}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full" />{warning} {t('dashboard.wc.warning')}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" />{offline} {t('dashboard.wc.offline')}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">{t('dashboard.wc.avgPerformance')}</span>
              <span className="font-medium">{avgPerf}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${avgPerf}%` }} />
            </div>
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// WIDGET: Alerts / Notifications
// ═══════════════════════════════════════════════
export function AlertsWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  const { data } = useDashboardData();
  const alerts = data.alerts || [];
  const getIcon = (type: string) => {
    switch (type) {
      case 'low_stock': return <Package className="w-4 h-4" />;
      case 'high_sales': return <TrendingUp className="w-4 h-4" />;
      case 'low_sales': return <TrendingDown className="w-4 h-4" />;
      case 'employee': return <Users className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };
  const getColor = (sev: string) => {
    switch (sev) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <WidgetWrapper title={t('dashboard.widgets.core-alerts')} module="core" icon={<Bell className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-200" />
            <p className="text-sm">{t('dashboard.wc.noAlerts')}</p>
          </div>
        ) : alerts.slice(0, 5).map((a: any) => (
          <div key={a.id} className={`p-2.5 rounded-lg border text-xs ${getColor(a.severity)}`}>
            <div className="flex items-start gap-2">
              {getIcon(a.type)}
              <div className="min-w-0">
                <p className="font-medium truncate">{a.branchName}</p>
                <p className="mt-0.5 line-clamp-2">{a.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// WIDGET: Quick Actions
// ═══════════════════════════════════════════════
export function QuickActionsWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  const actions = [
    { label: 'Proyek Konservasi', icon: Briefcase, href: '/hq/project-management', color: 'from-emerald-500 to-emerald-600' },
    { label: t('dashboard.wc.viewReports'), icon: BarChart3, href: '/hq/reports/sales', color: 'from-emerald-500 to-emerald-600' },
    { label: t('dashboard.wc.manageStock'), icon: Package, href: '/hq/inventory', color: 'from-violet-500 to-violet-600' },
    { label: t('dashboard.wc.employees'), icon: Users, href: '/hq/hris', color: 'from-amber-500 to-amber-600' },
    { label: t('dashboard.wc.finance'), icon: DollarSign, href: '/hq/finance', color: 'from-pink-500 to-pink-600' },
    { label: t('dashboard.wc.settings'), icon: Settings, href: '/hq/settings', color: 'from-gray-500 to-gray-600' },
  ];

  return (
    <WidgetWrapper title={t('dashboard.widgets.core-quick-actions')} module="core" icon={<Sparkles className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="grid grid-cols-2 gap-2">
        {actions.map(a => (
          <button
            key={a.label}
            onClick={() => window.location.href = a.href}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left group"
          >
            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${a.color} text-white`}>
              <a.icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">{a.label}</span>
          </button>
        ))}
      </div>
    </WidgetWrapper>
  );
}
