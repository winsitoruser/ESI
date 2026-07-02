import React, { useState, useEffect, useMemo } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  DollarSign,
  RefreshCw,
  Download,
  TrendingUp,
  Building2,
  Wallet,
  PieChart as PieChartIcon,
  BarChart3,
  Filter,
  FileText,
  CreditCard,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  rowsOr,
  MOCK_REPORTS_FINANCE_SUMMARY,
  MOCK_REPORTS_FINANCE_BRANCH,
  MOCK_REPORTS_FINANCE_TREND,
  MOCK_REPORTS_FINANCE_PAYMENT,
} from '@/lib/hq/mock-data';

interface FinanceData {
  branchId: string;
  branchName: string;
  branchCode: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  transactions: number;
  tax: number;
  discount: number;
  grossMargin: number;
  netMargin: number;
  cashSales: number;
  cardSales: number;
  digitalSales: number;
}

interface MonthlyTrend {
  month: string;
  revenue: number;
  profit: number;
  transactions: number;
}

interface PaymentBreakdown {
  method: string;
  amount: number;
  transactions: number;
  avgTicket: number;
  percentage: number;
}

interface Summary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  cashSales: number;
  cardSales: number;
  digitalSales: number;
  transactions: number;
  tax: number;
  discount: number;
  avgGrossMargin: number;
  avgNetMargin: number;
}

const PAYMENT_COLORS: Record<string, string> = {
  Cash: '#10B981',
  Card: '#3B82F6',
  Tunai: '#10B981',
  Kartu: '#3B82F6',
  QRIS: '#8B5CF6',
  'E-Wallet': '#F59E0B',
  Transfer: '#EC4899',
};

const FALLBACK_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export default function FinanceReport() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [financeData, setFinanceData] = useState<FinanceData[]>(MOCK_REPORTS_FINANCE_BRANCH);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>(MOCK_REPORTS_FINANCE_TREND);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>(MOCK_REPORTS_FINANCE_PAYMENT);
  const [summary, setSummary] = useState<Summary | null>(MOCK_REPORTS_FINANCE_SUMMARY);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('period', period);
      if (branchFilter !== 'all') params.set('branchId', branchFilter);
      if (period === 'custom') {
        if (customStart) params.set('startDate', customStart);
        if (customEnd) params.set('endDate', customEnd);
      }
      const res = await fetch(`/api/hq/reports/finance?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const d = json.data || json;
        const s = d.summary;
        setSummary(
          s && (s.revenue > 0 || s.transactions > 0) ? s : MOCK_REPORTS_FINANCE_SUMMARY
        );
        setFinanceData(rowsOr(d.financeData, MOCK_REPORTS_FINANCE_BRANCH));
        setMonthlyTrend(rowsOr(d.monthlyTrend, MOCK_REPORTS_FINANCE_TREND));
        setPaymentBreakdown(rowsOr(d.paymentBreakdown, MOCK_REPORTS_FINANCE_PAYMENT));
      } else {
        setSummary(MOCK_REPORTS_FINANCE_SUMMARY);
        setFinanceData(MOCK_REPORTS_FINANCE_BRANCH);
        setMonthlyTrend(MOCK_REPORTS_FINANCE_TREND);
        setPaymentBreakdown(MOCK_REPORTS_FINANCE_PAYMENT);
        toast.error('Gagal memuat laporan keuangan — menampilkan data demo');
      }
    } catch (error) {
      console.error('Error fetching finance report:', error);
      setSummary(MOCK_REPORTS_FINANCE_SUMMARY);
      setFinanceData(MOCK_REPORTS_FINANCE_BRANCH);
      setMonthlyTrend(MOCK_REPORTS_FINANCE_TREND);
      setPaymentBreakdown(MOCK_REPORTS_FINANCE_PAYMENT);
      toast.error('Koneksi gagal — menampilkan data demo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchFinanceData();
  }, [period, branchFilter]);

  const formatCurrency = (value: number) => {
    if (!value && value !== 0) return 'Rp 0';
    if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(0)}Jt`;
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const handleExport = (mode: 'summary' | 'detail' | 'trend') => {
    let csvContent = '';
    let filename = '';

    if (mode === 'summary' && summary) {
      filename = 'finance-summary';
      csvContent = [
        'Metric,Value',
        `Revenue,${summary.revenue}`,
        `COGS,${summary.cogs}`,
        `Gross Profit,${summary.grossProfit}`,
        `Operating Expenses,${summary.operatingExpenses}`,
        `Net Profit,${summary.netProfit}`,
        `Tax,${summary.tax}`,
        `Discount,${summary.discount}`,
        `Transactions,${summary.transactions}`,
        `Avg Gross Margin,${summary.avgGrossMargin}%`,
        `Avg Net Margin,${summary.avgNetMargin}%`,
        '',
        'Payment Method,Amount,Transactions,Avg Ticket,Percentage',
        ...paymentBreakdown.map(p => [p.method, p.amount, p.transactions, p.avgTicket, `${p.percentage}%`].join(',')),
      ].join('\n');
    } else if (mode === 'detail') {
      filename = 'finance-branches';
      csvContent = [
        ['Cabang', 'Kode', 'Revenue', 'COGS', 'Gross Profit', 'OpEx', 'Net Profit', 'Gross Margin %', 'Net Margin %', 'Cash', 'Card', 'Digital'].join(','),
        ...financeData.map(f => [
          f.branchName,
          f.branchCode,
          f.revenue,
          f.cogs,
          f.grossProfit,
          f.operatingExpenses,
          f.netProfit,
          f.grossMargin,
          f.netMargin,
          f.cashSales,
          f.cardSales,
          f.digitalSales,
        ].join(',')),
      ].join('\n');
    } else if (mode === 'trend') {
      filename = 'finance-trend';
      csvContent = [
        'Month,Revenue (Jt),Profit (Jt),Transactions',
        ...monthlyTrend.map(m => [m.month, m.revenue, m.profit, m.transactions].join(',')),
      ].join('\n');
    }

    if (!csvContent) return;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Export ${filename} berhasil`);
  };

  const profitByBranch = useMemo(
    () =>
      financeData
        .map(f => ({
          name: f.branchName.replace('Cabang ', '').replace('Kiosk ', ''),
          profit: +(f.netProfit / 1_000_000).toFixed(1),
          revenue: +(f.revenue / 1_000_000).toFixed(1),
        }))
        .sort((a, b) => b.profit - a.profit),
    [financeData]
  );

  const paymentPieData = useMemo(
    () =>
      paymentBreakdown.map((p, idx) => ({
        name: p.method,
        value: p.amount,
        color: PAYMENT_COLORS[p.method] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
      })),
    [paymentBreakdown]
  );

  if (!mounted) {
    return (
      <HQLayout title="Laporan Keuangan" subtitle="Analisis finansial seluruh cabang">
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        </div>
      </HQLayout>
    );
  }

  return (
    <HQLayout title="Laporan Keuangan" subtitle="Analisis finansial seluruh cabang">
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
                    onClick={fetchFinanceData}
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
                {financeData.map(b => (
                  <option key={b.branchId} value={b.branchId}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchFinanceData}
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
                      <FileText className="w-4 h-4 text-gray-500" /> Ringkasan keuangan (CSV)
                    </button>
                    <button onClick={() => handleExport('detail')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-500" /> Detail per cabang (CSV)
                    </button>
                    <button onClick={() => handleExport('trend')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-gray-500" /> Tren bulanan (CSV)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard icon={DollarSign} bg="bg-blue-100" color="text-blue-600" label="Total Revenue" value={formatCurrency(summary.revenue)} />
            <StatCard icon={TrendingUp} bg="bg-green-100" color="text-green-600" label="Gross Profit" value={formatCurrency(summary.grossProfit)} />
            <StatCard icon={Wallet} bg="bg-purple-100" color="text-purple-600" label="Net Profit" value={formatCurrency(summary.netProfit)} />
            <StatCard icon={BarChart3} bg="bg-yellow-100" color="text-yellow-600" label="Avg Gross Margin" value={`${summary.avgGrossMargin.toFixed(1)}%`} />
            <StatCard icon={PieChartIcon} bg="bg-teal-100" color="text-teal-600" label="Avg Net Margin" value={`${summary.avgNetMargin.toFixed(1)}%`} />
          </div>
        )}

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard title="Trend Revenue & Profit (Juta)">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}Jt`} />
                <Tooltip formatter={(value: number, name: string) => [`Rp ${value.toFixed(1)} Jt`, name === 'revenue' ? 'Revenue' : 'Profit']} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3B82F6" fill="url(#revGrad)" />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#10B981" fill="url(#profitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Metode Pembayaran">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
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
                    <Cell key={`pm-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Net Profit per Cabang */}
        <ChartCard title="Net Profit per Cabang (Juta)" className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={profitByBranch} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}Jt`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
              <Tooltip formatter={(value: number) => [`Rp ${value.toFixed(1)} Jt`, 'Net Profit']} />
              <Bar dataKey="profit" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Payment methods table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-500" /> Detail Metode Pembayaran
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metode</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Nominal</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transaksi</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg / Tx</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">Tidak ada data metode pembayaran</td>
                  </tr>
                ) : (
                  paymentBreakdown.map((p) => (
                    <tr key={p.method} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PAYMENT_COLORS[p.method] || '#6B7280' }} />
                          {p.method}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-medium">{formatCurrency(p.amount)}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{p.transactions.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(p.avgTicket)}</td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${p.percentage}%`, backgroundColor: PAYMENT_COLORS[p.method] || '#3B82F6' }} />
                          </div>
                          <span className="text-sm text-gray-600">{p.percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Table per Cabang */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Detail Keuangan per Cabang</h3>
          </div>
          <div className="overflow-x-auto">
            {loading && financeData.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Cabang</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Revenue</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">COGS</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Gross Profit</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">OpEx</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Net Profit</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs uppercase">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {financeData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">Tidak ada data keuangan</td>
                    </tr>
                  ) : (
                    financeData.map((f) => (
                      <tr key={f.branchId} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <Building2 className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{f.branchName}</p>
                              <p className="text-sm text-gray-500">{f.branchCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{formatCurrency(f.revenue)}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(f.cogs)}</td>
                        <td className="py-3 px-4 text-right text-green-600 font-medium">{formatCurrency(f.grossProfit)}</td>
                        <td className="py-3 px-4 text-right text-red-600">{formatCurrency(f.operatingExpenses)}</td>
                        <td className="py-3 px-4 text-right text-purple-600 font-bold">{formatCurrency(f.netProfit)}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              GM {f.grossMargin.toFixed(1)}%
                            </span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                              NM {f.netMargin.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {summary && financeData.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td className="py-3 px-4">Total</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(summary.revenue)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(summary.cogs)}</td>
                      <td className="py-3 px-4 text-right text-green-600">{formatCurrency(summary.grossProfit)}</td>
                      <td className="py-3 px-4 text-right text-red-600">{formatCurrency(summary.operatingExpenses)}</td>
                      <td className="py-3 px-4 text-right text-purple-600">{formatCurrency(summary.netProfit)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs">
                          Avg NM {summary.avgNetMargin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </div>
      </div>
    </HQLayout>
  );
}

function StatCard({ icon: Icon, bg, color, label, value }: { icon: any; bg: string; color: string; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-3 ${bg} rounded-xl`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
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
