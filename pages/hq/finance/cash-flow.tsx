import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useFinancePeriod, PeriodSelector } from '../../../contexts/FinancePeriodContext';
import { FinancePageSkeleton } from '../../../components/finance/FinanceSkeleton';
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  RefreshCw,
  Download,
  ChevronLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Filter,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  BanknoteIcon,
  CreditCard,
  Landmark
} from 'lucide-react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface CashFlowSummary {
  openingBalance: number;
  closingBalance: number;
  netChange: number;
  cashInflow: number;
  cashOutflow: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  freeCashFlow: number;
}

interface CashFlowItem {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'inflow' | 'outflow' | 'transfer';
  source: string;
  destination: string;
  amount: number;
  status: 'completed' | 'pending' | 'scheduled';
  reference: string;
}

interface BankAccount {
  id: string;
  name: string;
  bank: string;
  accountNumber: string;
  type: 'checking' | 'savings' | 'petty_cash';
  balance: number;
  currency: string;
}

interface CashForecast {
  date: string;
  projected: number;
  actual?: number;
  variance?: number;
}

const defaultCFSummary: CashFlowSummary = { openingBalance: 0, closingBalance: 0, netChange: 0, cashInflow: 0, cashOutflow: 0, operatingCashFlow: 0, investingCashFlow: 0, financingCashFlow: 0, freeCashFlow: 0 };

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) {
    return `Rp ${(value / 1000000000).toFixed(2)}M`;
  } else if (Math.abs(value) >= 1000000) {
    return `Rp ${(value / 1000000).toFixed(1)}Jt`;
  }
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const MOCK_CF_SUMMARY: CashFlowSummary = {
  openingBalance: 3200000000, closingBalance: 3450000000, netChange: 250000000,
  cashInflow: 4250000000, cashOutflow: 4000000000, operatingCashFlow: 350000000,
  investingCashFlow: -80000000, financingCashFlow: -20000000, freeCashFlow: 270000000,
};

const MOCK_CF_ITEMS: CashFlowItem[] = [
  { id: 'cf1', date: '2026-03-12', description: 'Penerimaan Penjualan Harian', category: 'Operating', type: 'inflow', source: 'Sales', destination: 'BCA 1234567890', amount: 113500000, status: 'completed', reference: 'TXN-2026-0312' },
  { id: 'cf2', date: '2026-03-12', description: 'Pembayaran Supplier Bahan Baku', category: 'Operating', type: 'outflow', source: 'BCA 1234567890', destination: 'PT Sumber Makmur', amount: 95000000, status: 'completed', reference: 'PAY-2026-0312-001' },
  { id: 'cf3', date: '2026-03-11', description: 'Transfer ke Cabang Bali', category: 'Operating', type: 'transfer', source: 'BCA 1234567890', destination: 'BCA 0987654321', amount: 50000000, status: 'completed', reference: 'TRF-2026-0311' },
  { id: 'cf4', date: '2026-03-10', description: 'Pembelian Mesin Roasting', category: 'Investing', type: 'outflow', source: 'Mandiri 2468013579', destination: 'PT Mesin Indo', amount: 80000000, status: 'completed', reference: 'INV-2026-0310' },
  { id: 'cf5', date: '2026-03-15', description: 'Pembayaran Gaji Maret', category: 'Operating', type: 'outflow', source: 'BCA 1234567890', destination: 'Multi-transfer', amount: 520000000, status: 'scheduled', reference: 'PAY-2026-0315' },
];

const MOCK_BANK_ACCOUNTS: BankAccount[] = [
  { id: 'ba1', name: 'Rekening Utama Operasional', bank: 'BCA', accountNumber: '1234567890', type: 'checking', balance: 2100000000, currency: 'IDR' },
  { id: 'ba2', name: 'Rekening Investasi', bank: 'Mandiri', accountNumber: '2468013579', type: 'savings', balance: 1200000000, currency: 'IDR' },
  { id: 'ba3', name: 'Kas Kecil Pusat', bank: '-', accountNumber: '-', type: 'petty_cash', balance: 15000000, currency: 'IDR' },
  { id: 'ba4', name: 'Rekening Cabang Bali', bank: 'BCA', accountNumber: '0987654321', type: 'checking', balance: 135000000, currency: 'IDR' },
];

export default function CashFlowManagement() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { period } = useFinancePeriod();
  const [summary, setSummary] = useState<CashFlowSummary>(MOCK_CF_SUMMARY);
  const [cashFlowItems, setCashFlowItems] = useState<CashFlowItem[]>(MOCK_CF_ITEMS);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(MOCK_BANK_ACCOUNTS);
  const [forecast, setForecast] = useState<CashForecast[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'transactions' | 'accounts' | 'forecast'>('overview');
  const [filterType, setFilterType] = useState<'all' | 'inflow' | 'outflow' | 'transfer'>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hq/finance/cash-flow?period=${period}`);
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        if (payload.summary) setSummary(payload.summary);
        if (payload.items) setCashFlowItems(payload.items);
        if (payload.accounts) setBankAccounts(payload.accounts);
        if (payload.forecast) setForecast(payload.forecast);
      }
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
      setSummary(MOCK_CF_SUMMARY);
      setCashFlowItems(MOCK_CF_ITEMS);
      setBankAccounts(MOCK_BANK_ACCOUNTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [period]);

  if (!mounted) return null;

  // Derive weekly inflow/outflow from cashFlowItems
  const weeklyData = (() => {
    const weeks: { inflow: number; outflow: number }[] = [{ inflow: 0, outflow: 0 }, { inflow: 0, outflow: 0 }, { inflow: 0, outflow: 0 }, { inflow: 0, outflow: 0 }];
    cashFlowItems.forEach((item) => {
      const d = new Date(item.date).getDate();
      const weekIdx = Math.min(Math.floor((d - 1) / 7), 3);
      if (item.type === 'inflow') weeks[weekIdx].inflow += item.amount;
      else if (item.type === 'outflow') weeks[weekIdx].outflow += item.amount;
    });
    // If no items, fallback to even split from summary
    if (cashFlowItems.length === 0 && (summary.cashInflow > 0 || summary.cashOutflow > 0)) {
      for (let i = 0; i < 4; i++) { weeks[i].inflow = summary.cashInflow / 4; weeks[i].outflow = summary.cashOutflow / 4; }
    }
    return weeks;
  })();

  const cashFlowChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, stacked: true },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    colors: ['#10B981', '#EF4444'],
    xaxis: { categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4'] },
    yaxis: { labels: { formatter: (val) => formatCurrency(Math.abs(val)) } },
    legend: { position: 'top' },
    tooltip: { y: { formatter: (val) => formatCurrency(Math.abs(val)) } }
  };

  const cashFlowChartSeries = [
    { name: 'Kas Masuk', data: weeklyData.map(w => Math.round(w.inflow)) },
    { name: 'Kas Keluar', data: weeklyData.map(w => -Math.round(w.outflow)) }
  ];

  // Derive balance trend from opening balance + weekly cumulative net
  const balanceLabels = ['Week 0', 'Week 1', 'Week 2', 'Week 3', 'Week 4'];
  const balanceData = (() => {
    let running = summary.openingBalance;
    const points = [running];
    weeklyData.forEach(w => { running += w.inflow - w.outflow; points.push(Math.round(running)); });
    return points;
  })();

  const balanceTrendOptions: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
    colors: ['#3B82F6'],
    xaxis: { categories: balanceLabels },
    yaxis: { labels: { formatter: (val) => formatCurrency(val) } }
  };

  const balanceTrendSeries = [{ name: 'Balance', data: balanceData }];

  const cashFlowBreakdownOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
    colors: ['#10B981', '#EF4444', '#F59E0B'],
    xaxis: { labels: { formatter: (val) => formatCurrency(Math.abs(Number(val))) } },
    legend: { show: false }
  };

  const cashFlowBreakdownSeries = [{
    name: 'Amount',
    data: [
      { x: 'Operating', y: Math.round(summary.operatingCashFlow) },
      { x: 'Investing', y: Math.round(summary.investingCashFlow) },
      { x: 'Financing', y: Math.round(summary.financingCashFlow) }
    ]
  }];

  const forecastChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: [2, 2], dashArray: [0, 5] },
    colors: ['#3B82F6', '#10B981'],
    xaxis: { categories: forecast.map(f => f.date) },
    yaxis: { labels: { formatter: (val) => formatCurrency(val) } },
    legend: { position: 'top' }
  };

  const forecastChartSeries = [
    { name: 'Projected', data: forecast.map(f => f.projected) },
    { name: 'Actual', data: forecast.map(f => f.actual || null) }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"><CheckCircle className="w-3 h-3" />Completed</span>;
      case 'pending':
        return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs"><Clock className="w-3 h-3" />Pending</span>;
      case 'scheduled':
        return <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"><Calendar className="w-3 h-3" />Scheduled</span>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'inflow':
        return <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><ArrowDownRight className="w-4 h-4 text-green-600" /></div>;
      case 'outflow':
        return <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-red-600" /></div>;
      case 'transfer':
        return <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><ArrowRightLeft className="w-4 h-4 text-blue-600" /></div>;
      default:
        return null;
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return <CreditCard className="w-5 h-5 text-blue-600" />;
      case 'savings':
        return <Landmark className="w-5 h-5 text-green-600" />;
      case 'petty_cash':
        return <BanknoteIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <Wallet className="w-5 h-5 text-gray-600" />;
    }
  };

  const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const filteredItems = filterType === 'all' ? cashFlowItems : cashFlowItems.filter(item => item.type === filterType);

  return (
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hq/finance" className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('finance.cfTitle')}</h1>
              <p className="text-gray-500">{t('finance.cfSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSelector />
            <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4" /> {t('finance.newTransaction')}
            </button>
            <button onClick={() => {
              const rows = cashFlowItems.map(i => `${i.date},${i.description},${i.category},${i.type},${i.amount},${i.status},${i.reference}`);
              const csv = `Date,Description,Category,Type,Amount,Status,Reference\n${rows.join('\n')}`;
              const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `cash-flow-${period}.csv`; a.click(); URL.revokeObjectURL(url);
              toast.success('Export cash flow berhasil');
            }} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              <Download className="w-4 h-4" /> {t('finance.export')}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <p className="text-gray-500 text-sm">{t('finance.openingBalance')}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.openingBalance)}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="w-5 h-5 opacity-80" />
              <p className="text-green-100 text-sm">{t('finance.cfInflow')}</p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.cashInflow)}</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-5 h-5 opacity-80" />
              <p className="text-red-100 text-sm">{t('finance.cfOutflow')}</p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.cashOutflow)}</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <p className="text-gray-500 text-sm">{t('finance.cfNet')}</p>
            <p className={`text-2xl font-bold ${summary.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.netChange >= 0 ? '+' : ''}{formatCurrency(summary.netChange)}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 opacity-80" />
              <p className="text-blue-100 text-sm">{t('finance.closingBalance')}</p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.closingBalance)}</p>
          </div>
        </div>

        {/* Cash Flow Categories */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('finance.operatingCashFlow')}</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(summary.operatingCashFlow)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('finance.investingCashFlow')}</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(summary.investingCashFlow)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Landmark className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('finance.financingCashFlow')}</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(summary.financingCashFlow)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BanknoteIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('finance.freeCashFlow')}</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(summary.freeCashFlow)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {[
            { key: 'overview', label: t('finance.cfOverview'), icon: TrendingUp },
            { key: 'transactions', label: t('finance.cfTransactions'), icon: ArrowRightLeft },
            { key: 'accounts', label: t('finance.cfBankAccounts'), icon: Landmark },
            { key: 'forecast', label: t('finance.cfProjection'), icon: Calendar }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === tab.key ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {viewMode === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">{t('finance.weeklyCashFlow')}</h3>
              <Chart options={cashFlowChartOptions} series={cashFlowChartSeries} type="bar" height={300} />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">{t('finance.balanceTrend')}</h3>
              <Chart options={balanceTrendOptions} series={balanceTrendSeries} type="area" height={300} />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">{t('finance.cfByActivity')}</h3>
              <Chart options={cashFlowBreakdownOptions} series={cashFlowBreakdownSeries} type="bar" height={200} />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">{t('finance.bankAccountSummary')}</h3>
              <div className="space-y-3">
                {bankAccounts.slice(0, 4).map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                        {getAccountIcon(account.type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{account.name}</p>
                        <p className="text-xs text-gray-500">{account.bank} {account.accountNumber !== '-' && `• ${account.accountNumber}`}</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900">{formatCurrency(account.balance)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                <p className="font-medium text-gray-700">{t('finance.totalBalance')}</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(totalBankBalance)}</p>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'transactions' && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {['all', 'inflow', 'outflow', 'transfer'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterType === type ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    {getTypeIcon(item.type)}
                    <div>
                      <p className="font-medium text-gray-900">{item.description}</p>
                      <p className="text-xs text-gray-500">{item.date} • {item.reference} • {item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-bold ${item.type === 'inflow' ? 'text-green-600' : item.type === 'outflow' ? 'text-red-600' : 'text-blue-600'}`}>
                        {item.type === 'inflow' ? '+' : item.type === 'outflow' ? '-' : ''}{formatCurrency(item.amount)}
                      </p>
                      <p className="text-xs text-gray-500">{item.source} → {item.destination}</p>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'accounts' && (
          <div className="grid grid-cols-3 gap-4">
            {bankAccounts.map((account) => (
              <div key={account.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    {getAccountIcon(account.type)}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    account.type === 'checking' ? 'bg-blue-100 text-blue-700' :
                    account.type === 'savings' ? 'bg-green-100 text-green-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {account.type === 'checking' ? 'Giro' : account.type === 'savings' ? 'Tabungan' : 'Kas Kecil'}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">{account.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{account.bank} {account.accountNumber !== '-' && `• ${account.accountNumber}`}</p>
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Saldo Saat Ini</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(account.balance)}</p>
                </div>
              </div>
            ))}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
              <h3 className="font-semibold text-blue-100">Total All Accounts</h3>
              <p className="text-sm text-blue-200 mb-4">{bankAccounts.length} accounts</p>
              <div className="pt-4 border-t border-white/20">
                <p className="text-xs text-blue-200">Combined Balance</p>
                <p className="text-3xl font-bold">{formatCurrency(totalBankBalance)}</p>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'forecast' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Cash Flow Forecast</h3>
              <Chart options={forecastChartOptions} series={forecastChartSeries} type="line" height={350} />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Projected</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {forecast.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-medium text-gray-900">{item.date}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{formatCurrency(item.projected)}</td>
                      <td className="px-5 py-4 text-right text-gray-900">{item.actual ? formatCurrency(item.actual) : '-'}</td>
                      <td className="px-5 py-4 text-right">
                        {item.variance !== undefined ? (
                          <span className={item.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.variance >= 0 ? '+' : ''}{formatCurrency(item.variance)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {item.actual ? (
                          <span className="flex items-center justify-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Actual
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1 text-blue-600 text-sm">
                            <Clock className="w-4 h-4" />
                            Projected
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
