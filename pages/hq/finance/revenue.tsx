import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import TransactionFormModal from '../../../components/hq/finance/TransactionFormModal';
import Link from 'next/link';
import { useFinancePeriod, PeriodSelector } from '../../../contexts/FinancePeriodContext';
import { FinancePageSkeleton } from '../../../components/finance/FinanceSkeleton';
import FinanceErrorModal from '../../../components/finance/FinanceErrorModal';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Calendar,
  Building2,
  ShoppingCart,
  CreditCard,
  Smartphone,
  Banknote,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  Users,
  Clock,
  Target
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { rowsOr, MOCK_HQ_BRANCHES, MOCK_HQ_ACCOUNTS, MOCK_HQ_HOURLY_REVENUE } from '@/lib/hq/mock-data';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface RevenueData {
  totalRevenue: number;
  previousRevenue: number;
  growth: number;
  avgDailyRevenue: number;
  avgTicketSize: number;
  totalTransactions: number;
  cashSales: number;
  cardSales: number;
  digitalSales: number;
  onlineSales: number;
  offlineSales: number;
}

interface BranchRevenue {
  id: string;
  name: string;
  code: string;
  revenue: number;
  transactions: number;
  avgTicket: number;
  growth: number;
  contribution: number;
}

interface ProductRevenue {
  id: string;
  name: string;
  category: string;
  revenue: number;
  quantity: number;
  avgPrice: number;
  growth: number;
}

interface HourlyRevenue {
  hour: string;
  revenue: number;
  transactions: number;
}

const defaultRevData: RevenueData = { totalRevenue: 0, previousRevenue: 0, growth: 0, avgDailyRevenue: 0, avgTicketSize: 0, totalTransactions: 0, cashSales: 0, cardSales: 0, digitalSales: 0, onlineSales: 0, offlineSales: 0 };

const formatCurrency = (value: number) => {
  if (value >= 1000000000) {
    return `Rp ${(value / 1000000000).toFixed(1)}M`;
  } else if (value >= 1000000) {
    return `Rp ${(value / 1000000).toFixed(1)}Jt`;
  }
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const formatFullCurrency = (value: number) => {
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const MOCK_REV_DATA: RevenueData = {
  totalRevenue: 4250000000, previousRevenue: 3920000000, growth: 8.4,
  avgDailyRevenue: 141700000, avgTicketSize: 230700, totalTransactions: 18420,
  cashSales: 1700000000, cardSales: 1275000000, digitalSales: 850000000,
  onlineSales: 425000000, offlineSales: 3825000000,
};

const MOCK_BRANCH_REV: BranchRevenue[] = [
  { id: 'b1', name: 'Kantor Pusat Jakarta', code: 'HQ-001', revenue: 1200000000, transactions: 5200, avgTicket: 230769, growth: 8.5, contribution: 28.2 },
  { id: 'b2', name: 'Cabang Bandung', code: 'BR-002', revenue: 850000000, transactions: 3800, avgTicket: 223684, growth: 12.2, contribution: 20.0 },
  { id: 'b3', name: 'Cabang Surabaya', code: 'BR-003', revenue: 780000000, transactions: 3400, avgTicket: 229412, growth: 6.8, contribution: 18.4 },
  { id: 'b5', name: 'Cabang Bali', code: 'BR-005', revenue: 680000000, transactions: 2900, avgTicket: 234483, growth: 15.3, contribution: 16.0 },
  { id: 'b4', name: 'Cabang Medan', code: 'BR-004', revenue: 420000000, transactions: 1820, avgTicket: 230769, growth: 4.2, contribution: 9.9 },
  { id: 'b6', name: 'Cabang Semarang', code: 'BR-006', revenue: 320000000, transactions: 1300, avgTicket: 246154, growth: -2.1, contribution: 7.5 },
];

const MOCK_PRODUCT_REV: ProductRevenue[] = [
  { id: '1', name: 'Kopi Arabica Blend', category: 'Minuman', revenue: 850000000, quantity: 42500, avgPrice: 20000, growth: 12.5 },
  { id: '2', name: 'Kopi Robusta Premium', category: 'Minuman', revenue: 620000000, quantity: 31000, avgPrice: 20000, growth: 8.3 },
  { id: '3', name: 'Teh Herbal Mix', category: 'Minuman', revenue: 380000000, quantity: 25333, avgPrice: 15000, growth: 5.1 },
  { id: '4', name: 'Cookies Coklat', category: 'Makanan', revenue: 270000000, quantity: 13500, avgPrice: 20000, growth: 18.2 },
];

export default function RevenueAnalysis() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { period } = useFinancePeriod();
  const [apiError, setApiError] = useState<{ show: boolean; message: string; details?: string }>({ show: false, message: '' });
  const [dateRange, setDateRange] = useState({ start: '2026-02-01', end: '2026-02-22' });
  const [revenueData, setRevenueData] = useState<RevenueData>(MOCK_REV_DATA);
  const [branchRevenue, setBranchRevenue] = useState<BranchRevenue[]>(MOCK_BRANCH_REV);
  const [productRevenue, setProductRevenue] = useState<ProductRevenue[]>(MOCK_PRODUCT_REV);
  const [hourlyRevenue, setHourlyRevenue] = useState<HourlyRevenue[]>(MOCK_HQ_HOURLY_REVENUE);
  const [viewMode, setViewMode] = useState<'branch' | 'product' | 'time'>('branch');
  const [showAddModal, setShowAddModal] = useState(false);
  const [branches, setBranches] = useState<any[]>(MOCK_HQ_BRANCHES);
  const [accounts, setAccounts] = useState<any[]>(MOCK_HQ_ACCOUNTS);
  
  useEffect(() => {
    const fetchBranchesAndAccounts = async () => {
      try {
        const [branchRes, accountRes] = await Promise.all([
          fetch('/api/hq/branches?limit=100'),
          fetch('/api/hq/finance/accounts?limit=100')
        ]);
        
        if (branchRes.ok) {
          const branchJson = await branchRes.json();
          const branchPayload = branchJson.data || branchJson;
          setBranches(rowsOr(branchPayload.branches, MOCK_HQ_BRANCHES));
        }
        
        if (accountRes.ok) {
          const accountJson = await accountRes.json();
          const accountPayload = accountJson.data || accountJson;
          setAccounts(rowsOr(accountPayload.accounts || accountPayload.receivables, MOCK_HQ_ACCOUNTS));
        }
      } catch (error) {
        console.error('Error fetching branches/accounts:', error);
      }
    };
    
    if (mounted) {
      fetchBranchesAndAccounts();
    }
  }, [mounted]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Try the dedicated revenue API first (has summary + branches + products + hourly)
      const revRes = await fetch(`/api/hq/finance/revenue?period=${period}`);
      if (revRes.ok) {
        const revJson = await revRes.json();
        const revPayload = revJson.data || revJson;
        if (revPayload.summary) {
          setRevenueData({
            ...defaultRevData,
            totalRevenue: revPayload.summary.totalRevenue || 0,
            avgDailyRevenue: revPayload.summary.avgDailyRevenue || 0,
            avgTicketSize: revPayload.summary.avgTicketSize || 0,
            totalTransactions: revPayload.summary.totalTransactions || 0,
            growth: revPayload.summary.growth || 0,
          });
        }
        if (revPayload.branches && revPayload.branches.length > 0) {
          const totalRev = revPayload.branches.reduce((s: number, b: any) => s + (b.revenue || 0), 0);
          setBranchRevenue(revPayload.branches.map((b: any) => ({
            id: b.id, name: b.name, code: b.code,
            revenue: b.revenue || 0, transactions: b.transactions || 0,
            avgTicket: b.avgTicket || 0, growth: b.growth || 0,
            contribution: totalRev > 0 ? (b.revenue / totalRev) * 100 : 0
          })));
        }
        if (revPayload.products) setProductRevenue(revPayload.products);
        setHourlyRevenue(rowsOr(revPayload.hourly, MOCK_HQ_HOURLY_REVENUE));
        setLoading(false);
        return;
      }

      // Fallback: fetch from transactions API
      const response = await fetch(`/api/hq/finance/transactions?type=income&limit=100&page=1`);
      if (response.ok) {
        const result = await response.json();
        const rawData = result.data || result;
        const transactions = (Array.isArray(rawData) ? rawData : []).map((t: any) => ({
          ...t,
          type: t.type || t.transactionType || '',
          amount: parseFloat(t.amount || 0),
        }));
        
        const totalRevenue = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
        const totalTransactions = transactions.length;
        const avgTicketSize = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
        
        const branchMap: { [key: string]: { revenue: number; count: number; name: string; code: string } } = {};
        transactions.forEach((t: any) => {
          const branchId = t.branchId || 'unknown';
          if (!branchMap[branchId]) {
            branchMap[branchId] = { revenue: 0, count: 0, name: t.branch?.name || 'Unknown', code: t.branch?.code || 'N/A' };
          }
          branchMap[branchId].revenue += parseFloat(t.amount || 0);
          branchMap[branchId].count += 1;
        });
        
        const mappedBranches = Object.keys(branchMap).map((id) => ({
          id,
          name: branchMap[id].name, code: branchMap[id].code,
          revenue: branchMap[id].revenue, transactions: branchMap[id].count,
          avgTicket: branchMap[id].count > 0 ? branchMap[id].revenue / branchMap[id].count : 0,
          growth: 0, contribution: totalRevenue > 0 ? (branchMap[id].revenue / totalRevenue) * 100 : 0
        }));
        
        setRevenueData({ ...defaultRevData, totalRevenue, avgTicketSize, totalTransactions });
        if (mappedBranches.length > 0) setBranchRevenue(mappedBranches);
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      setRevenueData(MOCK_REV_DATA);
      setBranchRevenue(MOCK_BRANCH_REV);
      setProductRevenue(MOCK_PRODUCT_REV);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [period]);

  if (!mounted) return null;

  const revenueTrendOptions: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
    colors: ['#3B82F6'],
    xaxis: { categories: ['1', '5', '10', '15', '20', '22'], title: { text: 'Day of Month' } },
    yaxis: { labels: { formatter: (val) => formatCurrency(val * 1000000) } },
    tooltip: { y: { formatter: (val) => formatFullCurrency(val * 1000000) } }
  };

  const revenueTrendSeries = [{ name: 'Revenue', data: [120, 180, 220, 195, 280, 320] }];

  const paymentMethodOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut' },
    labels: ['Cash', 'Card', 'Digital Payment'],
    colors: ['#10B981', '#3B82F6', '#8B5CF6'],
    legend: { position: 'bottom' },
    dataLabels: { enabled: true }
  };

  const paymentMethodSeries = [
    Math.round(revenueData.cashSales / 1000000),
    Math.round(revenueData.cardSales / 1000000),
    Math.round(revenueData.digitalSales / 1000000)
  ];

  const channelOptions: ApexCharts.ApexOptions = {
    chart: { type: 'pie' },
    labels: ['Online', 'Offline'],
    colors: ['#F59E0B', '#6366F1'],
    legend: { position: 'bottom' }
  };

  const channelSeries = [
    Math.round(revenueData.onlineSales / 1000000),
    Math.round(revenueData.offlineSales / 1000000)
  ];

  const hourlyOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '70%' } },
    colors: ['#3B82F6'],
    xaxis: { categories: hourlyRevenue.map(h => h.hour) },
    yaxis: { labels: { formatter: (val) => formatCurrency(val) } },
    tooltip: { y: { formatter: (val) => formatFullCurrency(val) } }
  };

  const hourlySeries = [{ name: 'Revenue', data: hourlyRevenue.map(h => h.revenue) }];

  const branchCompareOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
    xaxis: { labels: { formatter: (val) => formatCurrency(Number(val)) } },
    legend: { show: false }
  };

  const branchCompareSeries = [{
    name: 'Revenue',
    data: branchRevenue.map(b => ({ x: b.code, y: b.revenue }))
  }];

  if (loading && !mounted) {
    return <HQLayout><FinancePageSkeleton /></HQLayout>;
  }

  return (
    <HQLayout>
      <FinanceErrorModal
        isOpen={apiError.show}
        onClose={() => setApiError({ show: false, message: '' })}
        message={apiError.message}
        details={apiError.details}
        type="error"
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hq/finance" className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('finance.revTitle')}</h1>
              <p className="text-gray-500">{t('finance.revSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSelector />
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-4 h-4" />
              {t('finance.export')}
            </button>
          </div>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-8 h-8 opacity-80" />
              <span className={`flex items-center text-sm px-2 py-1 rounded-full ${revenueData.growth >= 0 ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
                {revenueData.growth >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {Math.abs(revenueData.growth)}%
              </span>
            </div>
            <p className="text-blue-100 text-sm">{t('finance.totalRevenue')}</p>
            <p className="text-2xl font-bold">{formatCurrency(revenueData.totalRevenue)}</p>
            <p className="text-blue-200 text-xs mt-1">vs {formatCurrency(revenueData.previousRevenue)} prev</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm">{t('finance.avgDailyRevenue')}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenueData.avgDailyRevenue)}</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm">{t('finance.totalTransactions')}</p>
            <p className="text-2xl font-bold text-gray-900">{revenueData.totalTransactions.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm">{t('finance.avgTicketSize')}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenueData.avgTicketSize)}</p>
          </div>
        </div>

        {/* Payment & Channel Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Banknote className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('finance.cashSales')}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(revenueData.cashSales)}</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${revenueData.totalRevenue > 0 ? (revenueData.cashSales / revenueData.totalRevenue) * 100 : 0}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{revenueData.totalRevenue > 0 ? ((revenueData.cashSales / revenueData.totalRevenue) * 100).toFixed(1) : '0.0'}% of total</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('finance.cardSales')}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(revenueData.cardSales)}</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${revenueData.totalRevenue > 0 ? (revenueData.cardSales / revenueData.totalRevenue) * 100 : 0}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{revenueData.totalRevenue > 0 ? ((revenueData.cardSales / revenueData.totalRevenue) * 100).toFixed(1) : '0.0'}% of total</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('finance.digitalPayment')}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(revenueData.digitalSales)}</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${revenueData.totalRevenue > 0 ? (revenueData.digitalSales / revenueData.totalRevenue) * 100 : 0}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{revenueData.totalRevenue > 0 ? ((revenueData.digitalSales / revenueData.totalRevenue) * 100).toFixed(1) : '0.0'}% of total</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">{t('finance.revenueTrend')}</h3>
            <Chart options={revenueTrendOptions} series={revenueTrendSeries} type="area" height={280} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">{t('finance.hourlyRevenue')}</h3>
            <Chart options={hourlyOptions} series={hourlySeries} type="bar" height={280} />
          </div>
        </div>

        {/* Payment & Channel Charts */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">{t('finance.paymentMethods')}</h3>
            <Chart options={paymentMethodOptions} series={paymentMethodSeries} type="donut" height={250} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">{t('finance.salesChannel')}</h3>
            <Chart options={channelOptions} series={channelSeries} type="pie" height={250} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">{t('finance.revenueByBranch')}</h3>
            <Chart options={branchCompareOptions} series={branchCompareSeries} type="bar" height={250} />
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex items-center gap-4 p-4">
              <button
                onClick={() => setViewMode('branch')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewMode === 'branch' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Building2 className="w-4 h-4" />
                {t('finance.byBranch')}
              </button>
              <button
                onClick={() => setViewMode('product')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewMode === 'product' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Package className="w-4 h-4" />
                {t('finance.byProduct')}
              </button>
              <button
                onClick={() => setViewMode('time')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewMode === 'time' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Clock className="w-4 h-4" />
                {t('finance.byTime')}
              </button>
              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'branch' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transactions</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Ticket</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Growth</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {branchRevenue.map((branch) => (
                    <tr key={branch.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{branch.name}</p>
                          <p className="text-xs text-gray-500">{branch.code}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-gray-900">{formatCurrency(branch.revenue)}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{branch.transactions.toLocaleString()}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{formatCurrency(branch.avgTicket)}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`flex items-center justify-center gap-1 ${branch.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {branch.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(branch.growth)}%
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${branch.contribution}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-600">{branch.contribution}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === 'product' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Sold</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Price</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productRevenue.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-medium text-gray-900">{product.name}</td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{product.category}</span>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-gray-900">{formatCurrency(product.revenue)}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{product.quantity.toLocaleString()}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{formatCurrency(product.avgPrice)}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`flex items-center justify-center gap-1 ${product.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(product.growth)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === 'time' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hour</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transactions</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg per Tx</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {hourlyRevenue.map((item) => (
                    <tr key={item.hour} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-medium text-gray-900">{item.hour}</td>
                      <td className="px-5 py-4 text-right font-medium text-gray-900">{formatCurrency(item.revenue)}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{item.transactions.toLocaleString()}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{formatCurrency(Math.round(item.revenue / item.transactions))}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${(item.revenue / Math.max(...hourlyRevenue.map(h => h.revenue))) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </HQLayout>
  );
}
