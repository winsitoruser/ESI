import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp, ShoppingCart, Store, ChevronRight, ArrowUpRight, ArrowDownRight,
  Receipt, Package, Coffee, Truck, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import WidgetWrapper from './WidgetWrapper';
import { WidgetComponentProps } from '../../../lib/widgets/types';
import { useTranslation } from '@/lib/i18n';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

function useDashboardData() {
  const [data, setData] = useState<any>({ branches: [], alerts: [], salesTrend: [], regionPerformance: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/hq/dashboard?period=today');
        if (r.ok) { const j = await r.json(); const p = j.data || j; setData({ branches: p.branches || [], alerts: p.alerts || [], salesTrend: p.salesTrend || [], regionPerformance: p.regionPerformance || [] }); }
      } catch {}
      setLoading(false);
    })();
  }, []);
  return { data, loading };
}

// ═══════════════════════════════════════════════
// WIDGET: Sales Trend Chart
// ═══════════════════════════════════════════════
export function SalesTrendWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const { data, loading } = useDashboardData();
  const [view, setView] = useState<'daily' | 'weekly'>('daily');

  const trend = data.salesTrend.length > 0 ? data.salesTrend : [
    { day: t('dashboard.wc.mon'), sales: 125000000 }, { day: t('dashboard.wc.tue'), sales: 142000000 }, { day: t('dashboard.wc.wed'), sales: 138000000 },
    { day: t('dashboard.wc.thu'), sales: 155000000 }, { day: t('dashboard.wc.fri'), sales: 162000000 }, { day: t('dashboard.wc.sat'), sales: 185000000 }, { day: t('dashboard.wc.sun'), sales: 154000000 }
  ];

  const categories = trend.map((t: any) => t.day || t.date || '');
  const salesData = trend.map((t: any) => typeof t.sales === 'number' && t.sales > 10000 ? t.sales : t.sales * 1000000);

  return (
    <WidgetWrapper title={t('dashboard.widgets.sales-trend')} module="sales" icon={<TrendingUp className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="flex items-center gap-2 mb-3">
        {['daily', 'weekly'].map(v => (
          <button key={v} onClick={() => setView(v as any)}
            className={`px-3 py-1 text-xs rounded-lg transition-all ${view === v ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>
            {v === 'daily' ? t('dashboard.wc.daily') : t('dashboard.wc.weekly')}
          </button>
        ))}
      </div>
      {loading ? <div className="animate-pulse h-48 bg-gray-100 rounded-lg" /> : (
        <div className="h-56">
          <Chart type="area" height="100%" width="100%" options={{
            chart: { toolbar: { show: false }, sparkline: { enabled: false } },
            stroke: { curve: 'smooth', width: 2.5 },
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
            colors: ['#6366F1'],
            xaxis: { categories, labels: { style: { fontSize: '11px', colors: '#6B7280' } }, axisBorder: { show: false }, axisTicks: { show: false } },
            yaxis: { labels: { formatter: (v: number) => formatCurrency(v), style: { fontSize: '11px', colors: '#6B7280' } } },
            grid: { borderColor: '#E5E7EB', strokeDashArray: 4 },
            tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
            dataLabels: { enabled: false },
          }} series={[{ name: t('dashboard.wc.sales'), data: salesData }]} />
        </div>
      )}
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// WIDGET: Sales by Branch (Bar Chart)
// ═══════════════════════════════════════════════
export function SalesByBranchWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const { data, loading } = useDashboardData();
  const branchData = data.branches
    .filter((b: any) => b.type !== 'warehouse')
    .map((b: any) => ({ name: b.name?.replace('Cabang ', '').replace('Kiosk ', '') || '', sales: b.todaySales || 0 }))
    .sort((a: any, b: any) => b.sales - a.sales)
    .slice(0, 8);

  return (
    <WidgetWrapper title={t('dashboard.widgets.branch-sales')} module="branches" icon={<BarChart3 className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      {loading ? <div className="animate-pulse h-48 bg-gray-100 rounded-lg" /> : (
        <div className="h-56">
          <Chart type="bar" height="100%" width="100%" options={{
            chart: { toolbar: { show: false } },
            colors: ['#6366F1'],
            plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
            xaxis: { categories: branchData.map((b: any) => b.name), labels: { style: { fontSize: '10px', colors: '#6B7280' } }, axisBorder: { show: false }, axisTicks: { show: false } },
            yaxis: { labels: { formatter: (v: number) => formatCurrency(v), style: { fontSize: '11px', colors: '#6B7280' } } },
            grid: { borderColor: '#E5E7EB', strokeDashArray: 4 },
            tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
            dataLabels: { enabled: false },
          }} series={[{ name: t('dashboard.wc.sales'), data: branchData.map((b: any) => b.sales) }]} />
        </div>
      )}
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// WIDGET: Region Performance (Horizontal Bar)
// ═══════════════════════════════════════════════
export function RegionPerformanceWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const { data, loading } = useDashboardData();
  const regions = data.regionPerformance.length > 0 ? data.regionPerformance : [
    { region: 'DKI Jakarta', sales: 53500000, branches: 2 }, { region: 'Jawa Barat', sales: 32000000, branches: 2 },
    { region: 'Jawa Timur', sales: 28500000, branches: 1 }, { region: 'Sumatera Utara', sales: 22000000, branches: 1 },
    { region: 'DI Yogyakarta', sales: 18500000, branches: 1 }
  ];

  return (
    <WidgetWrapper title={t('dashboard.widgets.branch-region')} module="branches" icon={<PieChartIcon className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      {loading ? <div className="animate-pulse h-48 bg-gray-100 rounded-lg" /> : (
        <div className="h-56">
          <Chart type="bar" height="100%" width="100%" options={{
            chart: { toolbar: { show: false } },
            colors: ['#8B5CF6'],
            plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
            xaxis: { labels: { formatter: (v: number) => formatCurrency(Number(v)), style: { fontSize: '11px', colors: '#6B7280' } } },
            yaxis: { labels: { style: { fontSize: '11px', colors: '#6B7280' } } },
            grid: { borderColor: '#E5E7EB', strokeDashArray: 4 },
            tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
            dataLabels: { enabled: false },
          }} series={[{ name: t('dashboard.wc.sales'), data: regions.map((r: any) => ({ x: r.region, y: typeof r.sales === 'number' && r.sales > 10000 ? r.sales : r.sales * 1000000 })) }]} />
        </div>
      )}
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// WIDGET: Top Products
// ═══════════════════════════════════════════════
export function TopProductsWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/hq/dashboard?period=today');
        if (r.ok) {
          const j = await r.json();
          const p = j.data?.topProducts || j.topProducts || [];
          setProducts(p.length > 0 ? p : [
            { id: '1', name: 'Nasi Goreng Spesial', category: 'Makanan', sold: 245, growth: 12.5 },
            { id: '2', name: 'Es Teh Manis', category: 'Minuman', sold: 198, growth: 8.2 },
            { id: '3', name: 'Ayam Bakar', category: 'Makanan', sold: 156, growth: -3.1 },
            { id: '4', name: 'Mie Goreng', category: 'Makanan', sold: 134, growth: 5.7 },
            { id: '5', name: 'Jus Alpukat', category: 'Minuman', sold: 112, growth: 15.3 },
          ]);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <WidgetWrapper title={t('dashboard.widgets.sales-top-products')} module="sales" icon={<ShoppingCart className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      {loading ? <div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg" />)}</div> : (
        <div className="space-y-3">
          {products.slice(0, 5).map((p: any, i: number) => (
            <div key={p.id} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'
              }`}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-500">{p.category}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{p.sold?.toLocaleString()}</p>
                <p className={`text-xs flex items-center justify-end gap-0.5 ${p.growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {p.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(p.growth)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// WIDGET: Recent Transactions
// ═══════════════════════════════════════════════
export function RecentTransactionsWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/hq/finance/transactions?limit=5');
        if (r.ok) {
          const j = await r.json();
          setTransactions((j.data || []).slice(0, 5));
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <WidgetWrapper title={t('dashboard.widgets.finance-transactions')} module="finance" icon={<Receipt className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      {loading ? <div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}</div> : (
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">{t('dashboard.wc.noTransactions')}</p>
          ) : transactions.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Receipt className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{t.transactionNumber || t.id?.substring(0, 12)}</p>
                <p className="text-xs text-gray-500 truncate">{t.description || t.category || '-'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-xs font-semibold ${t.transactionType === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.transactionType === 'income' ? '+' : '-'}{formatCurrency(parseFloat(t.amount) || 0)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// WIDGET: Branch Performance Table
// ═══════════════════════════════════════════════
export function BranchPerformanceWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const { data, loading } = useDashboardData();

  return (
    <WidgetWrapper title={t('dashboard.widgets.branch-performance')} module="branches" icon={<Store className="w-4 h-4" />} size={size} isEditMode={isEditMode} noPadding>
      {loading ? <div className="animate-pulse h-48 bg-gray-100 m-4 rounded-lg" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('dashboard.wc.branch')}</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">{t('dashboard.wc.status')}</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">{t('dashboard.wc.sales')}</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">{t('dashboard.wc.performance')}</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">{t('dashboard.wc.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.branches.slice(0, 6).map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        b.type === 'warehouse' ? 'bg-orange-100' : b.type === 'kiosk' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {b.type === 'warehouse' ? <Truck className="w-4 h-4 text-orange-600" /> :
                         b.type === 'kiosk' ? <Coffee className="w-4 h-4 text-green-600" /> :
                         <Store className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{b.name}</p>
                        <p className="text-xs text-gray-500">{b.city}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      b.status === 'online' ? 'bg-emerald-50 text-emerald-700' : b.status === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'online' ? 'bg-emerald-500' : b.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      {b.status === 'online' ? t('dashboard.wc.online') : b.status === 'warning' ? t('dashboard.wc.warning') : t('dashboard.wc.offline')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(b.todaySales)}</p>
                    <p className={`text-xs ${b.todaySales >= b.yesterdaySales ? 'text-emerald-600' : 'text-red-600'}`}>
                      {b.todaySales >= b.yesterdaySales ? '↑' : '↓'}
                      {b.yesterdaySales > 0 ? Math.abs(((b.todaySales - b.yesterdaySales) / b.yesterdaySales * 100)).toFixed(1) : 0}%
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <div className="relative w-10 h-10">
                        <svg className="w-10 h-10 transform -rotate-90">
                          <circle cx="20" cy="20" r="16" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                          <circle cx="20" cy="20" r="16" fill="none"
                            stroke={b.performanceScore >= 80 ? '#10B981' : b.performanceScore >= 60 ? '#F59E0B' : '#EF4444'}
                            strokeWidth="3" strokeDasharray={`${b.performanceScore * 1.005} 100.5`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{b.performanceScore}%</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => window.location.href = '/hq/dashboard'}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetWrapper>
  );
}
