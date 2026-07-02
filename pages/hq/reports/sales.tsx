import React, { useState, useEffect, useMemo } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Download,
  RefreshCw,
  Building2,
  FileText,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  CreditCard,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  ComposedChart,
} from 'recharts';
import {
  rowsOr,
  MOCK_REPORTS_SALES_SUMMARY,
  MOCK_REPORTS_SALES_BRANCH,
  MOCK_REPORTS_SALES_TOP_PRODUCTS,
  MOCK_REPORTS_SALES_DAILY,
  MOCK_REPORTS_SALES_HOURLY,
  MOCK_REPORTS_SALES_PAYMENT,
} from '@/lib/hq/mock-data';

interface BranchSales {
  branchId: string;
  branchName: string;
  branchCode: string;
  sales: number;
  transactions: number;
  avgTicket: number;
  items: number;
  discount: number;
  grossProfit: number;
  grossMargin: number;
  growth: number;
  target: number;
  achievement: number;
}

interface ProductSales {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  quantitySold: number;
  revenue: number;
  avgPrice: number;
  growth: number;
}

interface DailySales {
  date: string;
  dayName: string;
  sales: number;
  transactions: number;
  avgTicket: number;
}

interface HourlySales {
  hour: number;
  sales: number;
  transactions: number;
}

interface PaymentMethodSales {
  method: string;
  amount: number;
  transactions: number;
  percentage: number;
}

interface SalesSummary {
  totalSales: number;
  totalTransactions: number;
  averageTicket: number;
  totalItems: number;
  averageItemsPerTransaction: number;
  totalDiscount: number;
  totalTax: number;
  netSales: number;
  grossProfit: number;
  grossMargin: number;
  salesGrowth: number;
  transactionGrowth: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export default function SalesReport() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [searchProduct, setSearchProduct] = useState('');

  const [summary, setSummary] = useState<SalesSummary | null>(MOCK_REPORTS_SALES_SUMMARY);
  const [branchSales, setBranchSales] = useState<BranchSales[]>(MOCK_REPORTS_SALES_BRANCH);
  const [topProducts, setTopProducts] = useState<ProductSales[]>(MOCK_REPORTS_SALES_TOP_PRODUCTS);
  const [dailySales, setDailySales] = useState<DailySales[]>(MOCK_REPORTS_SALES_DAILY);
  const [hourlySales, setHourlySales] = useState<HourlySales[]>(MOCK_REPORTS_SALES_HOURLY);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSales[]>(MOCK_REPORTS_SALES_PAYMENT);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('period', period);
      if (branchFilter !== 'all') params.set('branchId', branchFilter);
      if (period === 'custom') {
        if (customStart) params.set('startDate', customStart);
        if (customEnd) params.set('endDate', customEnd);
      }
      const res = await fetch(`/api/hq/reports/sales?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const d = json.data || json;
        const s = d.summary;
        setSummary(s && (s.totalSales > 0 || s.totalTransactions > 0) ? s : MOCK_REPORTS_SALES_SUMMARY);
        setBranchSales(rowsOr(d.branchSales, MOCK_REPORTS_SALES_BRANCH));
        setTopProducts(rowsOr(d.topProducts, MOCK_REPORTS_SALES_TOP_PRODUCTS));
        setDailySales(rowsOr(d.dailySales, MOCK_REPORTS_SALES_DAILY));
        setHourlySales(rowsOr(d.hourlySales, MOCK_REPORTS_SALES_HOURLY));
        setPaymentMethods(rowsOr(d.paymentMethods, MOCK_REPORTS_SALES_PAYMENT));
      } else {
        setSummary(MOCK_REPORTS_SALES_SUMMARY);
        setBranchSales(MOCK_REPORTS_SALES_BRANCH);
        setTopProducts(MOCK_REPORTS_SALES_TOP_PRODUCTS);
        setDailySales(MOCK_REPORTS_SALES_DAILY);
        setHourlySales(MOCK_REPORTS_SALES_HOURLY);
        setPaymentMethods(MOCK_REPORTS_SALES_PAYMENT);
        toast.error('Gagal memuat data penjualan — menampilkan data demo');
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setSummary(MOCK_REPORTS_SALES_SUMMARY);
      setBranchSales(MOCK_REPORTS_SALES_BRANCH);
      setTopProducts(MOCK_REPORTS_SALES_TOP_PRODUCTS);
      setDailySales(MOCK_REPORTS_SALES_DAILY);
      setHourlySales(MOCK_REPORTS_SALES_HOURLY);
      setPaymentMethods(MOCK_REPORTS_SALES_PAYMENT);
      toast.error('Koneksi gagal — menampilkan data demo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchSalesData();
  }, [period, branchFilter]);

  const formatCurrency = (value: number) => {
    if (!value && value !== 0) return 'Rp 0';
    if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}Jt`;
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const handleExport = (format: 'csv' | 'summary') => {
    if (!summary) return;

    let csvContent = '';
    const filenamePrefix = format === 'summary' ? 'sales-summary' : 'sales-branches';

    if (format === 'summary') {
      csvContent = [
        'Section,Metric,Value',
        `Summary,Total Penjualan,${summary.totalSales}`,
        `Summary,Net Sales,${summary.netSales}`,
        `Summary,Gross Profit,${summary.grossProfit}`,
        `Summary,Gross Margin,${summary.grossMargin}%`,
        `Summary,Total Transaksi,${summary.totalTransactions}`,
        `Summary,Avg Ticket,${summary.averageTicket}`,
        `Summary,Total Items,${summary.totalItems}`,
        `Summary,Total Discount,${summary.totalDiscount}`,
        `Summary,Sales Growth,${summary.salesGrowth}%`,
        '',
        'Branch,Code,Sales,Transactions,AvgTicket,GrossProfit,Margin%,Growth%,Achievement%',
        ...branchSales.map(b => [b.branchName, b.branchCode, b.sales, b.transactions, b.avgTicket, b.grossProfit, b.grossMargin, b.growth, b.achievement].join(',')),
        '',
        'Top Products,SKU,Category,Quantity,Revenue,AvgPrice,Growth%',
        ...topProducts.map(p => [p.productName, p.sku, p.category, p.quantitySold, p.revenue, p.avgPrice, p.growth].join(',')),
        '',
        'Payment Method,Amount,Transactions,Percentage',
        ...paymentMethods.map(m => [m.method, m.amount, m.transactions, `${m.percentage}%`].join(',')),
      ].join('\n');
    } else {
      csvContent = [
        ['Cabang', 'Kode', 'Penjualan', 'Transaksi', 'Avg Ticket', 'Gross Profit', 'Margin %', 'Growth %', 'Achievement %'].join(','),
        ...branchSales.map(b => [
          b.branchName,
          b.branchCode,
          b.sales,
          b.transactions,
          b.avgTicket.toFixed(0),
          b.grossProfit,
          b.grossMargin.toFixed(1),
          b.growth.toFixed(1),
          b.achievement.toFixed(1),
        ].join(',')),
      ].join('\n');
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenamePrefix}-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export laporan penjualan berhasil');
  };

  const branchChartData = useMemo(
    () => branchSales.map(b => ({
      name: b.branchName.replace('Cabang ', '').replace('Kiosk ', ''),
      sales: +(b.sales / 1_000_000).toFixed(1),
      profit: +(b.grossProfit / 1_000_000).toFixed(1),
      transactions: b.transactions,
    })),
    [branchSales]
  );

  const pieData = useMemo(
    () => branchSales.map(b => ({ name: b.branchName.replace('Cabang ', ''), value: b.sales })),
    [branchSales]
  );

  const paymentPieData = useMemo(
    () => paymentMethods.map((m, i) => ({ name: m.method, value: m.amount, color: COLORS[i % COLORS.length] })),
    [paymentMethods]
  );

  const dailyChartData = useMemo(
    () => dailySales.map(d => ({
      ...d,
      salesJt: +(d.sales / 1_000_000).toFixed(1),
    })),
    [dailySales]
  );

  const filteredProducts = useMemo(
    () =>
      topProducts.filter(
        p =>
          searchProduct === '' ||
          p.productName.toLowerCase().includes(searchProduct.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchProduct.toLowerCase()) ||
          p.category.toLowerCase().includes(searchProduct.toLowerCase())
      ),
    [topProducts, searchProduct]
  );

  if (!mounted) {
    return (
      <HQLayout title="Laporan Penjualan" subtitle="Analisis penjualan konsolidasi semua cabang">
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        </div>
      </HQLayout>
    );
  }

  return (
    <HQLayout title="Laporan Penjualan" subtitle="Analisis penjualan konsolidasi semua cabang">
      <div className="space-y-6">
        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center gap-2 text-gray-500">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filter</span>
              </div>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="today">Hari Ini</option>
                <option value="week">7 Hari Terakhir</option>
                <option value="month">Bulan Ini</option>
                <option value="quarter">Kuartal Ini</option>
                <option value="year">Tahun Ini</option>
                <option value="custom">Custom Tanggal</option>
              </select>
              {period === 'custom' && (
                <>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <span className="text-gray-400 text-sm">-</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={fetchSalesData}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Terapkan
                  </button>
                </>
              )}
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">Semua Cabang</option>
                {branchSales.map(b => (
                  <option key={b.branchId} value={b.branchId}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchSalesData}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <div className="hidden group-hover:block absolute right-0 top-full pt-1 w-56 z-10">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-lg py-1">
                    <button onClick={() => handleExport('summary')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" /> Ringkasan lengkap (CSV)
                    </button>
                    <button onClick={() => handleExport('csv')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-500" /> Data per cabang (CSV)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard label="Total Penjualan" value={formatCurrency(summary.totalSales)} change={summary.salesGrowth} icon={DollarSign} bg="bg-blue-100" color="text-blue-600" />
            <StatCard label="Transaksi" value={summary.totalTransactions.toLocaleString('id-ID')} change={summary.transactionGrowth} icon={ShoppingCart} bg="bg-green-100" color="text-green-600" />
            <StatCard label="Avg Ticket" value={formatCurrency(summary.averageTicket)} icon={FileText} bg="bg-purple-100" color="text-purple-600" />
            <StatCard label="Gross Profit" value={formatCurrency(summary.grossProfit)} icon={TrendingUp} bg="bg-emerald-100" color="text-emerald-600" />
            <StatCard label="Gross Margin" value={`${summary.grossMargin.toFixed(1)}%`} icon={PieChartIcon} bg="bg-orange-100" color="text-orange-600" />
            <StatCard label="Cabang Aktif" value={`${branchSales.length}`} icon={Building2} bg="bg-cyan-100" color="text-cyan-600" />
          </div>
        )}

        {/* Charts Row 1: Branch Bar + Pie */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard title="Penjualan per Cabang (Juta)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${v}Jt`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`Rp ${value.toFixed(1)} Jt`, 'Penjualan']} />
                <Bar dataKey="sales" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Distribusi Penjualan">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </RechartsPie>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Charts Row 2: Daily Trend */}
        <ChartCard title="Tren Penjualan Harian" className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyChartData}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} />
              <YAxis tickFormatter={(v) => `${v}Jt`} />
              <Tooltip
                formatter={(value: number, name: string) => name === 'salesJt' ? [`Rp ${value.toFixed(1)}Jt`, 'Penjualan'] : [value, 'Transaksi']}
                labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long' })}
              />
              <Area type="monotone" dataKey="salesJt" stroke="#3B82F6" fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Charts Row 3: Hourly + Payment */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard title="Pola Jam Sibuk (Peak Hours)">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourlySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
                <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}Jt`} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(v: number, n: string) => [n === 'sales' ? formatCurrency(v) : v, n]} />
                <Legend />
                <Bar yAxisId="left" dataKey="sales" name="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="transactions" name="Transaksi" stroke="#F59E0B" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Metode Pembayaran">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={paymentPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {paymentPieData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Branch Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Detail per Cabang</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cabang</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Penjualan</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transaksi</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Ticket</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Profit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Growth</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Achievement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && branchSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    </td>
                  </tr>
                ) : branchSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">Tidak ada data penjualan</td>
                  </tr>
                ) : (
                  branchSales.map((b) => (
                    <tr key={b.branchId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{b.branchName}</div>
                            <div className="text-sm text-gray-500">{b.branchCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(b.sales)}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{b.transactions.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(b.avgTicket)}</td>
                      <td className="px-6 py-4 text-right text-green-600 font-medium">{formatCurrency(b.grossProfit)}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{b.grossMargin.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1 ${b.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {b.growth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          {Math.abs(b.growth).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${b.achievement >= 100 ? 'bg-green-500' : b.achievement >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(b.achievement, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${b.achievement >= 100 ? 'text-green-600' : 'text-gray-600'}`}>
                            {b.achievement.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {summary && branchSales.length > 0 && (
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td className="px-6 py-4 text-gray-900">Total</td>
                    <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(summary.totalSales)}</td>
                    <td className="px-6 py-4 text-right text-gray-900">{summary.totalTransactions.toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(summary.averageTicket)}</td>
                    <td className="px-6 py-4 text-right text-green-600">{formatCurrency(summary.grossProfit)}</td>
                    <td className="px-6 py-4 text-right text-gray-900">{summary.grossMargin.toFixed(1)}%</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1 ${summary.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {summary.salesGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {Math.abs(summary.salesGrowth).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Top Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-500" />
              Top Produk Terlaris
            </h3>
            <input
              type="text"
              placeholder="Cari produk / SKU / kategori..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm w-full sm:w-72"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">Tidak ada produk</td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.productId} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{p.productName}</td>
                      <td className="px-6 py-3 text-sm text-gray-500 font-mono">{p.sku}</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700">{p.category}</span>
                      </td>
                      <td className="px-6 py-3 text-right text-gray-700">{p.quantitySold.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900">{formatCurrency(p.revenue)}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(p.avgPrice)}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`inline-flex items-center gap-1 ${p.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {p.growth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {Math.abs(p.growth).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Methods Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-500" />
              Ringkasan Metode Pembayaran
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metode</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nominal</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transaksi</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg / Tx</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentMethods.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">Tidak ada data metode pembayaran</td>
                  </tr>
                ) : (
                  paymentMethods.map((m) => (
                    <tr key={m.method} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{m.method}</td>
                      <td className="px-6 py-3 text-right font-medium">{formatCurrency(m.amount)}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{m.transactions.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(m.transactions > 0 ? Math.round(m.amount / m.transactions) : 0)}</td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${m.percentage}%` }} />
                          </div>
                          <span className="text-sm text-gray-600">{m.percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </HQLayout>
  );
}

function StatCard({ label, value, change, icon: Icon, bg, color }: { label: string; value: string; change?: number; icon: any; bg: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          {typeof change === 'number' && change !== 0 && (
            <div className={`flex items-center gap-1 text-xs mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        <div className={`p-3 ${bg} rounded-xl`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-80">{children}</div>
    </div>
  );
}
