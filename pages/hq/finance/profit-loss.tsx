import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { PageGuard } from '../../../components/permissions';
import { useFinancePeriod, PeriodSelector } from '../../../contexts/FinancePeriodContext';
import { FinancePageSkeleton } from '../../../components/finance/FinanceSkeleton';
import DocumentExportButton from '@/components/documents/DocumentExportButton';
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, Download,
  Calendar, Building2, ChevronLeft, FileText, Printer, ChevronDown,
  ChevronRight as ChevronRightIcon, Activity, PieChart as PieChartIcon, Target
} from 'lucide-react';
import dynamic from 'next/dynamic';

const INDUSTRY_OPTIONS = [
  { value: 'general', label: 'Umum' }, { value: 'fnb', label: 'F&B' },
  { value: 'retail', label: 'Retail' }, { value: 'logistics', label: 'Logistik' },
  { value: 'hospitality', label: 'Hospitality' }, { value: 'manufacturing', label: 'Manufaktur' },
  { value: 'finance', label: 'Finance' }, { value: 'pharmacy', label: 'Farmasi' },
];

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface PLSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;
  otherIncome: number;
  otherExpenses: number;
  ebitda: number;
  depreciation: number;
  interestExpense: number;
  taxExpense: number;
  netIncome: number;
  netMargin: number;
  previousNetIncome: number;
  growth: number;
}

interface PLLineItem {
  id: string;
  name: string;
  currentPeriod: number;
  previousPeriod: number;
  change: number;
  changePercent: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
}

interface BranchPL {
  id: string;
  name: string;
  code: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  netIncome: number;
  margin: number;
}

const defaultPLSummary: PLSummary = { revenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0, operatingExpenses: 0, operatingIncome: 0, operatingMargin: 0, otherIncome: 0, otherExpenses: 0, ebitda: 0, depreciation: 0, interestExpense: 0, taxExpense: 0, netIncome: 0, netMargin: 0, previousNetIncome: 0, growth: 0 };

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) {
    return `Rp ${(value / 1000000000).toFixed(2)}M`;
  } else if (Math.abs(value) >= 1000000) {
    return `Rp ${(value / 1000000).toFixed(1)}Jt`;
  }
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const formatFullCurrency = (value: number) => {
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const MOCK_PL_SUMMARY: PLSummary = {
  revenue: 4250000000, cogs: 1700000000, grossProfit: 2550000000, grossMargin: 60,
  operatingExpenses: 1650000000, operatingIncome: 900000000, operatingMargin: 21.2,
  otherIncome: 35000000, otherExpenses: 15000000, ebitda: 1050000000,
  depreciation: 85000000, interestExpense: 25000000, taxExpense: 175000000,
  netIncome: 850000000, netMargin: 20, previousNetIncome: 780000000, growth: 9.0,
};

const MOCK_PL_ITEMS: PLLineItem[] = [
  { id: '1', name: 'Pendapatan Penjualan', currentPeriod: 4250000000, previousPeriod: 3920000000, change: 330000000, changePercent: 8.4 },
  { id: '2', name: 'Harga Pokok Penjualan (COGS)', currentPeriod: -1700000000, previousPeriod: -1568000000, change: -132000000, changePercent: 8.4 },
  { id: '3', name: 'Laba Kotor', currentPeriod: 2550000000, previousPeriod: 2352000000, change: 198000000, changePercent: 8.4, isSubtotal: true },
  { id: '4', name: 'Biaya Gaji & Tunjangan', currentPeriod: -520000000, previousPeriod: -510000000, change: -10000000, changePercent: 2.0, indent: 1 },
  { id: '5', name: 'Biaya Utilitas', currentPeriod: -145000000, previousPeriod: -135000000, change: -10000000, changePercent: 7.4, indent: 1 },
  { id: '6', name: 'Biaya Marketing', currentPeriod: -185000000, previousPeriod: -190000000, change: 5000000, changePercent: -2.6, indent: 1 },
  { id: '7', name: 'Total Biaya Operasional', currentPeriod: -1650000000, previousPeriod: -1540000000, change: -110000000, changePercent: 7.1, isSubtotal: true },
  { id: '8', name: 'Laba Bersih', currentPeriod: 850000000, previousPeriod: 780000000, change: 70000000, changePercent: 9.0, isTotal: true },
];

const MOCK_BRANCH_PL: BranchPL[] = [
  { id: 'b1', name: 'Kantor Pusat Jakarta', code: 'HQ-001', revenue: 1200000000, cogs: 480000000, grossProfit: 720000000, opex: 420000000, netIncome: 300000000, margin: 25 },
  { id: 'b2', name: 'Cabang Bandung', code: 'BR-002', revenue: 850000000, cogs: 340000000, grossProfit: 510000000, opex: 290000000, netIncome: 220000000, margin: 25.9 },
  { id: 'b3', name: 'Cabang Surabaya', code: 'BR-003', revenue: 780000000, cogs: 312000000, grossProfit: 468000000, opex: 310000000, netIncome: 158000000, margin: 20.3 },
  { id: 'b5', name: 'Cabang Bali', code: 'BR-005', revenue: 680000000, cogs: 272000000, grossProfit: 408000000, opex: 195000000, netIncome: 213000000, margin: 31.3 },
];

export default function ProfitLossReport() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { period } = useFinancePeriod();
  const [comparePeriod, setComparePeriod] = useState<'previous' | 'yoy'>('previous');
  const [industry, setIndustry] = useState('general');
  const [summary, setSummary] = useState<PLSummary>(MOCK_PL_SUMMARY);
  const [plItems, setPLItems] = useState<PLLineItem[]>(MOCK_PL_ITEMS);
  const [branchPL, setBranchPL] = useState<BranchPL[]>(MOCK_BRANCH_PL);
  const [expandedSections, setExpandedSections] = useState<string[]>(['revenue', 'cogs', 'opex']);
  const [viewMode, setViewMode] = useState<'statement' | 'branch' | 'trend' | 'margins'>('statement');

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hq/finance/profit-loss?period=${period}`);
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        if (payload.summary) setSummary(payload.summary);
        if (payload.items) setPLItems(payload.items);
        if (payload.branches) setBranchPL(payload.branches);
      }
    } catch (error) {
      console.error('Error fetching P&L data:', error);
      setSummary(MOCK_PL_SUMMARY);
      setPLItems(MOCK_PL_ITEMS);
      setBranchPL(MOCK_BRANCH_PL);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [period]);

  if (!mounted) return null;

  const marginTrendOptions: ApexCharts.ApexOptions = {
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: [2, 2, 2] },
    colors: ['#3B82F6', '#10B981', '#8B5CF6'],
    xaxis: { categories: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'] },
    yaxis: { labels: { formatter: (val) => `${val}%` }, max: 50 },
    legend: { position: 'top' }
  };

  const marginTrendSeries = [
    { name: 'Gross Margin', data: [38, 39, 40, 41, 40, 40] },
    { name: 'Operating Margin', data: [23, 24, 25, 26, 25, 25] },
    { name: 'Net Margin', data: [18, 19, 20, 21, 20, 20] }
  ];

  const profitTrendOptions: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
    colors: ['#10B981'],
    xaxis: { categories: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'] },
    yaxis: { labels: { formatter: (val) => formatCurrency(val * 1000000) } }
  };

  const profitTrendSeries = [{ name: 'Net Income', data: [620, 680, 720, 780, 800, 824] }];

  const revenueVsCostOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    colors: ['#3B82F6', '#EF4444', '#10B981'],
    xaxis: { categories: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'] },
    yaxis: { labels: { formatter: (val) => formatCurrency(val * 1000000) } },
    legend: { position: 'top' }
  };

  const revenueVsCostSeries = [
    { name: 'Revenue', data: [3200, 3450, 3680, 3900, 4000, 4120] },
    { name: 'Costs', data: [2560, 2760, 2944, 3120, 3200, 3296] },
    { name: 'Profit', data: [640, 690, 736, 780, 800, 824] }
  ];

  const branchPLOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, stacked: false },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    colors: ['#3B82F6', '#10B981'],
    xaxis: { labels: { formatter: (val) => formatCurrency(Number(val)) } },
    legend: { position: 'top' }
  };

  const branchPLSeries = [
    { name: 'Revenue', data: branchPL.map(b => ({ x: b.code, y: b.revenue })) },
    { name: 'Net Income', data: branchPL.map(b => ({ x: b.code, y: b.netIncome })) }
  ];

  return (
    <PageGuard
      anyPermission={['finance.view_pnl', 'reports.finance', 'finance.*']}
      title="Laporan Laba Rugi"
      description="Laporan keuangan P&L lintas cabang (data sensitif)."
    >
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hq/finance" className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('finance.plTitle')}</h1>
              <p className="text-gray-500">{t('finance.plSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <PeriodSelector />
            <select value={comparePeriod} onChange={(e) => setComparePeriod(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="previous">{t('finance.vsPreviousPeriod')}</option>
              <option value="yoy">{t('finance.vsLastYear')}</option>
            </select>
            <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <DocumentExportButton
              documentType="profit-loss"
              data={{ items: plItems.map(i => ({ Kategori: i.isSubtotal ? 'Subtotal' : i.isTotal ? 'Total' : '', Akun: i.name, 'Periode Ini': i.currentPeriod, 'Periode Lalu': i.previousPeriod, Perubahan: i.change, 'Perubahan %': i.changePercent })), summary }}
              meta={{ period: `${period} - ${new Date().getFullYear()}` }}
              options={{ orientation: 'portrait' }}
              showFormats={['pdf', 'excel', 'csv', 'html']}
              label="Export P&L"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
            <p className="text-blue-100 text-sm">{t('finance.totalRevenue')}</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.revenue)}</p>
            <div className="flex items-center gap-1 mt-2 text-sm text-blue-200">
              <ArrowUpRight className="w-4 h-4" />
              12.4% vs prev
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <p className="text-gray-500 text-sm">{t('finance.grossProfit')}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.grossProfit)}</p>
            <p className="text-sm text-green-600 mt-2">Margin: {summary.grossMargin}%</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <p className="text-gray-500 text-sm">{t('finance.operatingIncome')}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.operatingIncome)}</p>
            <p className="text-sm text-green-600 mt-2">Margin: {summary.operatingMargin}%</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <p className="text-gray-500 text-sm">EBITDA</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.ebitda)}</p>
            <p className="text-sm text-gray-500 mt-2">{summary.revenue > 0 ? ((summary.ebitda / summary.revenue) * 100).toFixed(1) : '0.0'}% of revenue</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
            <p className="text-green-100 text-sm">{t('finance.netIncome')}</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.netIncome)}</p>
            <div className="flex items-center gap-1 mt-2 text-sm text-green-200">
              <ArrowUpRight className="w-4 h-4" />
              {summary.growth}% growth
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {([
            { v: 'statement' as const, l: t('finance.plStatement'), icon: FileText },
            { v: 'branch' as const, l: t('finance.byBranch'), icon: Building2 },
            { v: 'trend' as const, l: t('finance.plTrend'), icon: TrendingUp },
            { v: 'margins' as const, l: t('finance.plMarginAnalysis'), icon: PieChartIcon },
          ]).map(t => (
            <button key={t.v} onClick={() => setViewMode(t.v)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === t.v ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="w-4 h-4" />{t.l}
            </button>
          ))}
        </div>

        {viewMode === 'statement' && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-5 gap-4 text-xs font-medium text-gray-500 uppercase">
                <div className="col-span-2">{t('finance.account')}</div>
                <div className="text-right">{t('finance.currentPeriod')}</div>
                <div className="text-right">{t('finance.previousPeriod')}</div>
                <div className="text-right">{t('finance.change')}</div>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {plItems.map((item) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-5 gap-4 px-4 py-3 ${item.isTotal ? 'bg-blue-50 font-bold' : item.isSubtotal ? 'bg-gray-50 font-semibold' : 'hover:bg-gray-50'}`}
                >
                  <div className={`col-span-2 ${item.indent ? `pl-${item.indent * 6}` : ''}`} style={{ paddingLeft: item.indent ? `${item.indent * 24}px` : '0' }}>
                    {item.name}
                  </div>
                  <div className={`text-right ${item.isTotal ? 'text-blue-600' : ''}`}>
                    {formatFullCurrency(item.currentPeriod)}
                  </div>
                  <div className="text-right text-gray-600">
                    {formatFullCurrency(item.previousPeriod)}
                  </div>
                  <div className={`text-right flex items-center justify-end gap-1 ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {item.changePercent.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'branch' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">{t('finance.revenueVsNetIncomeByBranch')}</h3>
              <Chart options={branchPLOptions} series={branchPLSeries} type="bar" height={300} />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.branch')}</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('finance.revenue')}</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">COGS</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('finance.grossProfit')}</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Opex</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('finance.netIncome')}</th>
                      <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('finance.margin')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {branchPL.map((branch) => (
                      <tr key={branch.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900">{branch.name}</p>
                          <p className="text-xs text-gray-500">{branch.code}</p>
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-gray-900">{formatCurrency(branch.revenue)}</td>
                        <td className="px-5 py-4 text-right text-red-600">{formatCurrency(branch.cogs)}</td>
                        <td className="px-5 py-4 text-right text-green-600">{formatCurrency(branch.grossProfit)}</td>
                        <td className="px-5 py-4 text-right text-red-600">{formatCurrency(branch.opex)}</td>
                        <td className="px-5 py-4 text-right font-bold text-green-600">{formatCurrency(branch.netIncome)}</td>
                        <td className="px-5 py-4 text-center">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            {branch.margin}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50 font-bold">
                      <td className="px-5 py-4 text-blue-900">Total Konsolidasi</td>
                      <td className="px-5 py-4 text-right text-blue-900">{formatCurrency(branchPL.reduce((a, b) => a + b.revenue, 0))}</td>
                      <td className="px-5 py-4 text-right text-red-600">{formatCurrency(branchPL.reduce((a, b) => a + b.cogs, 0))}</td>
                      <td className="px-5 py-4 text-right text-green-600">{formatCurrency(branchPL.reduce((a, b) => a + b.grossProfit, 0))}</td>
                      <td className="px-5 py-4 text-right text-red-600">{formatCurrency(branchPL.reduce((a, b) => a + b.opex, 0))}</td>
                      <td className="px-5 py-4 text-right text-green-600">{formatCurrency(branchPL.reduce((a, b) => a + b.netIncome, 0))}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">20%</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'trend' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Margin Trend</h3>
              <Chart options={marginTrendOptions} series={marginTrendSeries} type="line" height={300} />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Net Income Trend</h3>
              <Chart options={profitTrendOptions} series={profitTrendSeries} type="area" height={300} />
            </div>

            <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Revenue vs Costs vs Profit</h3>
              <Chart options={revenueVsCostOptions} series={revenueVsCostSeries} type="bar" height={350} />
            </div>
          </div>
        )}

        {viewMode === 'margins' && (
          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-sm text-indigo-700"><strong>Margin Analysis ({INDUSTRY_OPTIONS.find(i => i.value === industry)?.label})</strong>: Analisis mendalam margin profitabilitas per layer — gross, operating, EBITDA, dan net — dengan benchmark industri.</p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Margin Kotor', value: summary.grossMargin, benchmark: industry === 'fnb' ? 65 : industry === 'retail' ? 35 : 40, color: 'blue' },
                { label: 'Margin Operasi', value: summary.operatingMargin, benchmark: industry === 'fnb' ? 15 : industry === 'retail' ? 8 : 25, color: 'green' },
                { label: 'Margin EBITDA', value: summary.revenue > 0 ? Math.round((summary.ebitda / summary.revenue) * 100) : 0, benchmark: industry === 'fnb' ? 18 : industry === 'retail' ? 10 : 28, color: 'purple' },
                { label: 'Margin Bersih', value: summary.netMargin, benchmark: industry === 'fnb' ? 10 : industry === 'retail' ? 5 : 20, color: 'teal' },
              ].map(m => {
                const diff = m.value - m.benchmark;
                return (
                  <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm text-gray-500 mb-1">{m.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{m.value}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3 mb-2">
                      <div className={`h-2.5 rounded-full bg-${m.color}-500`} style={{ width: `${Math.min(m.value, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Benchmark: {m.benchmark}%</span>
                      <span className={`font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {diff >= 0 ? '+' : ''}{diff}pp
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Margin Waterfall</h3>
                <Chart
                  options={{
                    chart: { type: 'bar', toolbar: { show: false } },
                    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%', colors: { ranges: [{ from: -999999999, to: 0, color: '#EF4444' }, { from: 0, to: 999999999, color: '#10B981' }] } } },
                    xaxis: { categories: ['Revenue', 'COGS', 'Gross Profit', 'Opex', 'Operating', 'Other', 'Tax', 'Net Income'] },
                    yaxis: { labels: { formatter: (v: number) => formatCurrency(v) } },
                  }}
                  series={[{
                    name: 'Amount',
                    data: [summary.revenue, -summary.cogs, summary.grossProfit, -summary.operatingExpenses, summary.operatingIncome, summary.otherIncome - summary.otherExpenses, -summary.taxExpense, summary.netIncome]
                  }]}
                  type="bar"
                  height={300}
                />
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Cost Structure</h3>
                <Chart
                  options={{
                    chart: { type: 'donut' },
                    labels: ['COGS', 'Salaries', 'Rent & Utilities', 'Marketing', 'Depreciation', 'Tax', 'Other'],
                    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'],
                    legend: { position: 'bottom' },
                    dataLabels: { enabled: true, formatter: (v: number) => `${v.toFixed(1)}%` },
                  }}
                  series={summary.revenue > 0 ? [
                    Math.round((summary.cogs / summary.revenue) * 100),
                    Math.round((309000000 / summary.revenue) * 100),
                    Math.round((123600000 / summary.revenue) * 100),
                    Math.round((92700000 / summary.revenue) * 100),
                    Math.round((summary.depreciation / summary.revenue) * 100),
                    Math.round((summary.taxExpense / summary.revenue) * 100),
                    Math.round(((summary.otherExpenses + summary.interestExpense) / summary.revenue) * 100),
                  ] : [0, 0, 0, 0, 0, 0, 0]}
                  type="donut"
                  height={300}
                />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Margin Trend (6 Month)</h3>
              <Chart options={marginTrendOptions} series={marginTrendSeries} type="line" height={280} />
            </div>
          </div>
        )}
      </div>
    </HQLayout>
    </PageGuard>
  );
}
