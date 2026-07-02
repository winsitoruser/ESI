import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import DocumentExportButton from '@/components/documents/DocumentExportButton';
import {
  FileText,
  Calculator,
  Calendar,
  RefreshCw,
  Download,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  Percent,
  Receipt,
  TrendingUp,
  X
} from 'lucide-react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface TaxSummary {
  totalTaxLiability: number;
  paidTaxes: number;
  pendingTaxes: number;
  vatCollected: number;
  vatPaid: number;
  netVat: number;
  incomeTax: number;
  withholdingTax: number;
  nextDueDate: string;
  nextDueAmount: number;
}

interface TaxObligation {
  id: string;
  type: string;
  period: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paidDate?: string;
  reference?: string;
}

interface TaxReport {
  id: string;
  name: string;
  period: string;
  type: string;
  status: 'filed' | 'draft' | 'pending';
  filedDate?: string;
  amount: number;
}

const defaultTaxSummary: TaxSummary = { totalTaxLiability: 0, paidTaxes: 0, pendingTaxes: 0, vatCollected: 0, vatPaid: 0, netVat: 0, incomeTax: 0, withholdingTax: 0, nextDueDate: '', nextDueAmount: 0 };

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) {
    return `Rp ${(value / 1000000000).toFixed(2)}M`;
  } else if (Math.abs(value) >= 1000000) {
    return `Rp ${(value / 1000000).toFixed(1)}Jt`;
  }
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const MOCK_TAX_SUMMARY: TaxSummary = {
  totalTaxLiability: 425000000, paidTaxes: 310000000, pendingTaxes: 115000000,
  vatCollected: 467500000, vatPaid: 187000000, netVat: 280500000,
  incomeTax: 87500000, withholdingTax: 57000000,
  nextDueDate: '2026-04-15', nextDueAmount: 85000000,
};

const MOCK_TAX_OBLIGATIONS: TaxObligation[] = [
  { id: 'to1', type: 'PPN (VAT)', period: 'Februari 2026', dueDate: '2026-03-15', amount: 280500000, status: 'paid', paidDate: '2026-03-12', reference: 'NTPN-2026-02-001' },
  { id: 'to2', type: 'PPh 21 (Withholding)', period: 'Februari 2026', dueDate: '2026-03-10', amount: 57000000, status: 'paid', paidDate: '2026-03-08', reference: 'NTPN-2026-02-002' },
  { id: 'to3', type: 'PPh 25 (Income Tax)', period: 'Februari 2026', dueDate: '2026-03-15', amount: 87500000, status: 'pending' },
  { id: 'to4', type: 'PPN (VAT)', period: 'Maret 2026', dueDate: '2026-04-15', amount: 85000000, status: 'pending' },
];

const MOCK_TAX_REPORTS: TaxReport[] = [
  { id: 'tr1', name: 'SPT Masa PPN Februari 2026', period: 'Februari 2026', type: 'PPN', status: 'filed', filedDate: '2026-03-12', amount: 280500000 },
  { id: 'tr2', name: 'SPT Masa PPh 21 Februari 2026', period: 'Februari 2026', type: 'PPh 21', status: 'filed', filedDate: '2026-03-08', amount: 57000000 },
  { id: 'tr3', name: 'SPT Masa PPh 25 Februari 2026', period: 'Februari 2026', type: 'PPh 25', status: 'draft', amount: 87500000 },
  { id: 'tr4', name: 'SPT Masa PPN Maret 2026', period: 'Maret 2026', type: 'PPN', status: 'pending', amount: 0 },
];

export default function TaxManagement() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TaxSummary>(MOCK_TAX_SUMMARY);
  const [obligations, setObligations] = useState<TaxObligation[]>(MOCK_TAX_OBLIGATIONS);
  const [reports, setReports] = useState<TaxReport[]>(MOCK_TAX_REPORTS);
  const [viewMode, setViewMode] = useState<'obligations' | 'reports' | 'summary'>('obligations');
  const [year, setYear] = useState('2026');
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [taxCalc, setTaxCalc] = useState({
    type: 'ppn' as 'ppn' | 'pph21' | 'pph25',
    revenue: 0,
    purchases: 0,
    grossSalary: 0,
    netIncome: 0,
    period: 'Februari 2026'
  });
  const [calcResult, setCalcResult] = useState<{ label: string; amount: number }[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hq/finance/tax?year=${year}`);
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        if (payload.summary) setSummary(payload.summary);
        if (payload.obligations) setObligations(payload.obligations);
        if (payload.reports) setReports(payload.reports);
      }
    } catch (error) {
      console.error('Error fetching tax data:', error);
      setSummary(MOCK_TAX_SUMMARY);
      setObligations(MOCK_TAX_OBLIGATIONS);
      setReports(MOCK_TAX_REPORTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [year]);

  if (!mounted) return null;

  const taxBreakdownOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut' },
    labels: ['VAT (PPN)', 'Income Tax (PPh 25)', 'Withholding Tax (PPh 21)'],
    colors: ['#3B82F6', '#10B981', '#F59E0B'],
    legend: { position: 'bottom' },
    dataLabels: { enabled: true }
  };

  const taxBreakdownSeries = [
    Math.round(summary.netVat / 1000000),
    Math.round(summary.incomeTax / 1000000),
    Math.round(summary.withholdingTax / 1000000)
  ];

  const monthlyTaxOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, stacked: true },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    colors: ['#3B82F6', '#10B981', '#F59E0B'],
    xaxis: { categories: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'] },
    yaxis: { labels: { formatter: (val) => formatCurrency(val * 1000000) } },
    legend: { position: 'top' }
  };

  const monthlyTaxSeries = [
    { name: 'VAT', data: [95, 102, 108, 115, 115, 124] },
    { name: 'PPh 25', data: [55, 58, 60, 62, 60, 63] },
    { name: 'PPh 21', data: [68, 72, 75, 78, 79, 82] }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'filed':
        return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"><CheckCircle className="w-3 h-3" />{status === 'paid' ? 'Paid' : 'Filed'}</span>;
      case 'pending':
      case 'draft':
        return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs"><Clock className="w-3 h-3" />{status === 'pending' ? 'Pending' : 'Draft'}</span>;
      case 'overdue':
        return <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs"><AlertTriangle className="w-3 h-3" />Overdue</span>;
      default:
        return null;
    }
  };

  const pendingObligations = obligations.filter(o => o.status === 'pending');
  const paidObligations = obligations.filter(o => o.status === 'paid');

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
              <h1 className="text-2xl font-bold text-gray-900">{t('finance.taxTitle')}</h1>
              <p className="text-gray-500">{t('finance.taxSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
            <button 
              onClick={() => setShowCalcModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Calculator className="w-4 h-4" />
              {t('finance.calculateTax')}
            </button>
            <DocumentExportButton
              documentType="tax-report"
              data={{ items: obligations.map(o => ({ 'Jenis Pajak': o.type, 'Periode': o.period, 'Jatuh Tempo': o.dueDate, 'Jumlah': o.amount, 'Status': o.status, 'Referensi': o.reference || '-' })), summary }}
              meta={{ period: `${year}` }}
              showFormats={['pdf', 'excel', 'csv']}
              label="Export Pajak"
            />
          </div>
        </div>

        {/* Alert for upcoming due */}
        {summary.pendingTaxes > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-yellow-800">{t('finance.upcomingTaxPayment')}</p>
                <p className="text-sm text-yellow-600">Due: {summary.nextDueDate} - Amount: {formatCurrency(summary.nextDueAmount)}</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
              {t('finance.payNow')}
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-5 h-5 opacity-80" />
              <p className="text-purple-100 text-sm">{t('finance.totalTaxLiability')}</p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalTaxLiability)}</p>
            <p className="text-purple-200 text-xs mt-1">YTD 2026</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-gray-500 text-sm">{t('finance.paidTaxes')}</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.paidTaxes)}</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <p className="text-gray-500 text-sm">{t('finance.pendingTaxes')}</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.pendingTaxes)}</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-5 h-5 text-blue-500" />
              <p className="text-gray-500 text-sm">{t('finance.netVat')}</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.netVat)}</p>
            <p className="text-xs text-gray-500 mt-1">Collected - Paid</p>
          </div>
        </div>

        {/* VAT Details */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('finance.vatCollected')}</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(summary.vatCollected)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('finance.vatPaid')}</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(summary.vatPaid)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calculator className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Net VAT Payable</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(summary.netVat)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Tax Breakdown</h3>
            <Chart options={taxBreakdownOptions} series={taxBreakdownSeries} type="donut" height={280} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Monthly Tax Payments</h3>
            <Chart options={monthlyTaxOptions} series={monthlyTaxSeries} type="bar" height={280} />
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setViewMode('obligations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewMode === 'obligations' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Calendar className="w-4 h-4" />
            Tax Obligations
          </button>
          <button
            onClick={() => setViewMode('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewMode === 'reports' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <FileText className="w-4 h-4" />
            Tax Reports
          </button>
        </div>

        {viewMode === 'obligations' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Type</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {obligations.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-gray-900">{item.type}</td>
                    <td className="px-5 py-4 text-gray-600">{item.period}</td>
                    <td className="px-5 py-4 text-gray-600">{item.dueDate}</td>
                    <td className="px-5 py-4 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                    <td className="px-5 py-4 text-center">{getStatusBadge(item.status)}</td>
                    <td className="px-5 py-4 text-gray-500 text-sm">{item.reference || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'reports' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report Name</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-gray-900">{item.name}</td>
                    <td className="px-5 py-4 text-gray-600">{item.period}</td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{item.type}</span>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                    <td className="px-5 py-4 text-center">{getStatusBadge(item.status)}</td>
                    <td className="px-5 py-4 text-gray-500 text-sm">{item.filedDate || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Calculate Tax Modal */}
        {showCalcModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Tax Calculator</h2>
                <button onClick={() => { setShowCalcModal(false); setCalcResult([]); }} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Type *</label>
                    <select
                      value={taxCalc.type}
                      onChange={(e) => { setTaxCalc({ ...taxCalc, type: e.target.value as any }); setCalcResult([]); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="ppn">PPN (VAT) 12%</option>
                      <option value="pph21">PPh 21 (Withholding)</option>
                      <option value="pph25">PPh 25 (Corporate Income)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                    <select
                      value={taxCalc.period}
                      onChange={(e) => setTaxCalc({ ...taxCalc, period: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="Februari 2026">Februari 2026</option>
                      <option value="Maret 2026">Maret 2026</option>
                      <option value="Q1 2026">Q1 2026</option>
                    </select>
                  </div>
                </div>

                {taxCalc.type === 'ppn' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Revenue (Rp)</label>
                      <input
                        type="number"
                        value={taxCalc.revenue}
                        onChange={(e) => setTaxCalc({ ...taxCalc, revenue: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Total sales revenue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Purchases (Rp)</label>
                      <input
                        type="number"
                        value={taxCalc.purchases}
                        onChange={(e) => setTaxCalc({ ...taxCalc, purchases: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Total purchases with VAT"
                      />
                    </div>
                  </>
                )}

                {taxCalc.type === 'pph21' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Gross Salary (Rp)</label>
                    <input
                      type="number"
                      value={taxCalc.grossSalary}
                      onChange={(e) => setTaxCalc({ ...taxCalc, grossSalary: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Total gross salary for all employees"
                    />
                  </div>
                )}

                {taxCalc.type === 'pph25' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Net Income Before Tax (Rp)</label>
                    <input
                      type="number"
                      value={taxCalc.netIncome}
                      onChange={(e) => setTaxCalc({ ...taxCalc, netIncome: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Net income before tax"
                    />
                  </div>
                )}

                {calcResult.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-blue-900">Calculation Result</h4>
                    {calcResult.map((r, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-blue-700">{r.label}</span>
                        <span className="font-medium text-blue-900">{formatCurrency(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => { setShowCalcModal(false); setCalcResult([]); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    let results: { label: string; amount: number }[] = [];
                    if (taxCalc.type === 'ppn') {
                      const outputVat = taxCalc.revenue * 0.11;
                      const inputVat = taxCalc.purchases * 0.11;
                      const netVat = outputVat - inputVat;
                      results = [
                        { label: 'PPN Keluaran (11%)', amount: outputVat },
                        { label: 'PPN Masukan (11%)', amount: inputVat },
                        { label: 'PPN Terutang', amount: netVat > 0 ? netVat : 0 },
                        { label: 'Lebih Bayar', amount: netVat < 0 ? Math.abs(netVat) : 0 }
                      ];
                    } else if (taxCalc.type === 'pph21') {
                      const avgRate = 0.15; // Simplified average rate
                      const pph21 = taxCalc.grossSalary * avgRate;
                      results = [
                        { label: 'Total Gaji Bruto', amount: taxCalc.grossSalary },
                        { label: 'Estimasi PPh 21 (avg 15%)', amount: pph21 }
                      ];
                    } else if (taxCalc.type === 'pph25') {
                      const annualTax = taxCalc.netIncome * 0.22; // 22% corporate tax
                      const monthlyInstallment = annualTax / 12;
                      results = [
                        { label: 'Laba Bersih', amount: taxCalc.netIncome },
                        { label: 'PPh Badan (22%)', amount: annualTax },
                        { label: 'Angsuran Bulanan (PPh 25)', amount: monthlyInstallment }
                      ];
                    }
                    setCalcResult(results);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Calculate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
