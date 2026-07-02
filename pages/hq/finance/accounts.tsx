import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  ChevronLeft,
  Users,
  Building2,
  Calendar,
  Filter,
  Search,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Mail,
  Phone,
  Eye,
  Edit,
  MoreVertical
} from 'lucide-react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface AccountsSummary {
  totalReceivables: number;
  totalPayables: number;
  netPosition: number;
  overdueReceivables: number;
  overduePayables: number;
  dueThisWeek: number;
  collectedThisMonth: number;
  paidThisMonth: number;
}

interface Receivable {
  id: string;
  invoiceNumber: string;
  customer: string;
  customerType: 'corporate' | 'individual';
  issueDate: string;
  dueDate: string;
  amount: number;
  paid: number;
  balance: number;
  status: 'current' | 'overdue' | 'paid' | 'partial';
  daysOverdue: number;
  contact: string;
  phone: string;
}

interface Payable {
  id: string;
  invoiceNumber: string;
  supplier: string;
  category: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  paid: number;
  balance: number;
  status: 'current' | 'overdue' | 'paid' | 'partial';
  daysOverdue: number;
  priority: 'high' | 'medium' | 'low';
}

interface AgingData {
  category: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
}

const defaultSummary: AccountsSummary = {
  totalReceivables: 0,
  totalPayables: 0,
  netPosition: 0,
  overdueReceivables: 0,
  overduePayables: 0,
  dueThisWeek: 0,
  collectedThisMonth: 0,
  paidThisMonth: 0
};

const defaultAging: AgingData = { category: '', current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0 };

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) {
    return `Rp ${(value / 1000000000).toFixed(2)}M`;
  } else if (Math.abs(value) >= 1000000) {
    return `Rp ${(value / 1000000).toFixed(1)}Jt`;
  }
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const MOCK_ACCT_SUMMARY: AccountsSummary = {
  totalReceivables: 450000000, totalPayables: 320000000, netPosition: 130000000,
  overdueReceivables: 85000000, overduePayables: 42000000, dueThisWeek: 65000000,
  collectedThisMonth: 180000000, paidThisMonth: 145000000,
};

const MOCK_RECEIVABLES: Receivable[] = [
  { id: 'r1', invoiceNumber: 'INV-2026-001', customer: 'PT Maju Bersama', customerType: 'corporate', issueDate: '2026-02-15', dueDate: '2026-03-15', amount: 85000000, paid: 0, balance: 85000000, status: 'current', daysOverdue: 0, contact: 'Agus Pratama', phone: '081234567101' },
  { id: 'r2', invoiceNumber: 'INV-2026-002', customer: 'Hotel Grand Nusa', customerType: 'corporate', issueDate: '2026-01-20', dueDate: '2026-02-20', amount: 120000000, paid: 50000000, balance: 70000000, status: 'overdue', daysOverdue: 20, contact: 'Wayan Sudirta', phone: '081234567103' },
  { id: 'r3', invoiceNumber: 'INV-2026-003', customer: 'CV Sejahtera Abadi', customerType: 'corporate', issueDate: '2026-02-28', dueDate: '2026-03-28', amount: 65000000, paid: 65000000, balance: 0, status: 'paid', daysOverdue: 0, contact: 'Ratna Sari', phone: '081234567102' },
  { id: 'r4', invoiceNumber: 'INV-2026-004', customer: 'Restoran Padang Sederhana', customerType: 'individual', issueDate: '2026-03-01', dueDate: '2026-03-31', amount: 35000000, paid: 15000000, balance: 20000000, status: 'partial', daysOverdue: 0, contact: 'Hasan', phone: '081234567104' },
];

const MOCK_PAYABLES: Payable[] = [
  { id: 'p1', invoiceNumber: 'BILL-2026-001', supplier: 'PT Sumber Makmur', category: 'Bahan Baku', issueDate: '2026-02-10', dueDate: '2026-03-10', amount: 95000000, paid: 0, balance: 95000000, status: 'overdue', daysOverdue: 2, priority: 'high' },
  { id: 'p2', invoiceNumber: 'BILL-2026-002', supplier: 'CV Maju Jaya Packaging', category: 'Packaging', issueDate: '2026-02-25', dueDate: '2026-03-25', amount: 45000000, paid: 0, balance: 45000000, status: 'current', daysOverdue: 0, priority: 'medium' },
  { id: 'p3', invoiceNumber: 'BILL-2026-003', supplier: 'PT Teknologi Nusantara', category: 'IT Equipment', issueDate: '2026-03-01', dueDate: '2026-04-01', amount: 180000000, paid: 90000000, balance: 90000000, status: 'partial', daysOverdue: 0, priority: 'medium' },
];

export default function AccountsManagement() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AccountsSummary>(MOCK_ACCT_SUMMARY);
  const [receivables, setReceivables] = useState<Receivable[]>(MOCK_RECEIVABLES);
  const [payables, setPayables] = useState<Payable[]>(MOCK_PAYABLES);
  const [agingReceivables, setAgingReceivables] = useState<AgingData>({...defaultAging, category: 'Receivables'});
  const [agingPayables, setAgingPayables] = useState<AgingData>({...defaultAging, category: 'Payables'});
  const [viewMode, setViewMode] = useState<'receivables' | 'payables' | 'aging'>('receivables');
  const [filterStatus, setFilterStatus] = useState<'all' | 'current' | 'overdue' | 'partial' | 'paid'>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hq/finance/accounts');
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        if (payload.summary) setSummary(payload.summary);
        if (payload.receivables) setReceivables(payload.receivables);
        if (payload.payables) setPayables(payload.payables);
        if (payload.agingReceivables) setAgingReceivables(payload.agingReceivables);
        if (payload.agingPayables) setAgingPayables(payload.agingPayables);
      }
    } catch (error) {
      console.error('Error fetching accounts data:', error);
      setSummary(MOCK_ACCT_SUMMARY);
      setReceivables(MOCK_RECEIVABLES);
      setPayables(MOCK_PAYABLES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  if (!mounted) return null;

  const agingChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, borderRadius: 4, columnWidth: '60%' } },
    colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#7C3AED'],
    xaxis: { categories: ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'] },
    yaxis: { labels: { formatter: (val) => formatCurrency(val) } },
    legend: { position: 'top' },
    dataLabels: { enabled: false }
  };

  const agingChartSeries = [
    { name: 'Receivables', data: [agingReceivables.current, agingReceivables.days1to30, agingReceivables.days31to60, agingReceivables.days61to90, agingReceivables.over90] },
    { name: 'Payables', data: [agingPayables.current, agingPayables.days1to30, agingPayables.days31to60, agingPayables.days61to90, agingPayables.over90] }
  ];

  const trendChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
    colors: ['#10B981', '#EF4444'],
    xaxis: { categories: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'] },
    yaxis: { labels: { formatter: (val) => formatCurrency(val * 1000000) } },
    legend: { position: 'top' }
  };

  const trendChartSeries = [
    { name: 'Receivables', data: [380, 420, 450, 480, 460, 450] },
    { name: 'Payables', data: [280, 300, 320, 350, 330, 320] }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"><CheckCircle className="w-3 h-3" />Current</span>;
      case 'overdue':
        return <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs"><AlertTriangle className="w-3 h-3" />Overdue</span>;
      case 'partial':
        return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs"><Clock className="w-3 h-3" />Partial</span>;
      case 'paid':
        return <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"><CheckCircle className="w-3 h-3" />Paid</span>;
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">High</span>;
      case 'medium':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Medium</span>;
      case 'low':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">Low</span>;
      default:
        return null;
    }
  };

  const filteredReceivables = filterStatus === 'all' ? receivables : receivables.filter(r => r.status === filterStatus);
  const filteredPayables = filterStatus === 'all' ? payables : payables.filter(p => p.status === filterStatus);

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
              <h1 className="text-2xl font-bold text-gray-900">{t('finance.accTitle')}</h1>
              <p className="text-gray-500">{t('finance.accSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              {t('finance.newInvoice')}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              {t('finance.export')}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="w-5 h-5 opacity-80" />
              <p className="text-green-100 text-sm">{t('finance.totalReceivables')}</p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalReceivables)}</p>
            <p className="text-green-200 text-xs mt-1">{formatCurrency(summary.overdueReceivables)} overdue</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-5 h-5 opacity-80" />
              <p className="text-red-100 text-sm">{t('finance.totalPayables')}</p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalPayables)}</p>
            <p className="text-red-200 text-xs mt-1">{formatCurrency(summary.overduePayables)} overdue</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <p className="text-gray-500 text-sm">{t('finance.netPosition')}</p>
            <p className={`text-2xl font-bold ${summary.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.netPosition >= 0 ? '+' : ''}{formatCurrency(summary.netPosition)}
            </p>
            <p className="text-xs text-gray-500 mt-1">A/R - A/P</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <p className="text-gray-500 text-sm">{t('finance.dueThisWeek')}</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.dueThisWeek)}</p>
            <p className="text-xs text-gray-500 mt-1">Requires attention</p>
          </div>
        </div>

        {/* Activity Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('finance.collectedThisMonth')}</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(summary.collectedThisMonth)}</p>
                </div>
              </div>
              <Link href="/hq/finance/accounts?tab=collections" className="text-sm text-blue-600 hover:underline">
                {t('finance.viewDetails')}
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('finance.paidThisMonth')}</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(summary.paidThisMonth)}</p>
                </div>
              </div>
              <Link href="/hq/finance/accounts?tab=payments" className="text-sm text-blue-600 hover:underline">
                {t('finance.viewDetails')}
              </Link>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('receivables')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewMode === 'receivables' ? 'bg-green-50 text-green-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <ArrowDownRight className="w-4 h-4" />
              {t('finance.receivablesAR')}
            </button>
            <button
              onClick={() => setViewMode('payables')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewMode === 'payables' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <ArrowUpRight className="w-4 h-4" />
              {t('finance.payablesAP')}
            </button>
            <button
              onClick={() => setViewMode('aging')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewMode === 'aging' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Calendar className="w-4 h-4" />
              {t('finance.agingAnalysis')}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">{t('finance.allStatus')}</option>
              <option value="current">{t('finance.current')}</option>
              <option value="overdue">{t('finance.overdue')}</option>
              <option value="partial">{t('finance.partial')}</option>
              <option value="paid">{t('finance.paid')}</option>
            </select>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {viewMode === 'receivables' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReceivables.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{item.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">Issued: {item.issueDate}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          {item.customerType === 'corporate' ? <Building2 className="w-4 h-4 text-gray-600" /> : <Users className="w-4 h-4 text-gray-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.customer}</p>
                          <p className="text-xs text-gray-500">{item.contact}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className={`font-medium ${item.daysOverdue > 0 ? 'text-red-600' : 'text-gray-900'}`}>{item.dueDate}</p>
                      {item.daysOverdue > 0 && <p className="text-xs text-red-500">{item.daysOverdue} days overdue</p>}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                    <td className="px-5 py-4 text-right text-green-600">{formatCurrency(item.paid)}</td>
                    <td className="px-5 py-4 text-right font-bold text-gray-900">{formatCurrency(item.balance)}</td>
                    <td className="px-5 py-4 text-center">{getStatusBadge(item.status)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded" title="View">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded" title="Kirim Pengingat">
                          <Mail className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded" title="Call">
                          <Phone className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'payables' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayables.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{item.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">Issued: {item.issueDate}</p>
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900">{item.supplier}</td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{item.category}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className={`font-medium ${item.daysOverdue > 0 ? 'text-red-600' : 'text-gray-900'}`}>{item.dueDate}</p>
                      {item.daysOverdue > 0 && <p className="text-xs text-red-500">{item.daysOverdue} days overdue</p>}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                    <td className="px-5 py-4 text-right font-bold text-red-600">{formatCurrency(item.balance)}</td>
                    <td className="px-5 py-4 text-center">{getPriorityBadge(item.priority)}</td>
                    <td className="px-5 py-4 text-center">{getStatusBadge(item.status)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded" title="View">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded" title="Pay">
                          <FileText className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded" title="More">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'aging' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Aging Comparison</h3>
                <Chart options={agingChartOptions} series={agingChartSeries} type="bar" height={300} />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">A/R vs A/P Trend</h3>
                <Chart options={trendChartOptions} series={trendChartSeries} type="area" height={300} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 bg-green-50 border-b border-green-100">
                  <h3 className="font-semibold text-green-800">Receivables Aging</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Period</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr><td className="px-5 py-3">Current</td><td className="px-5 py-3 text-right font-medium">{formatCurrency(agingReceivables.current)}</td><td className="px-5 py-3 text-right text-gray-500">34%</td></tr>
                    <tr><td className="px-5 py-3">1-30 Days</td><td className="px-5 py-3 text-right font-medium">{formatCurrency(agingReceivables.days1to30)}</td><td className="px-5 py-3 text-right text-gray-500">22%</td></tr>
                    <tr><td className="px-5 py-3 text-yellow-600">31-60 Days</td><td className="px-5 py-3 text-right font-medium text-yellow-600">{formatCurrency(agingReceivables.days31to60)}</td><td className="px-5 py-3 text-right text-yellow-600">19%</td></tr>
                    <tr><td className="px-5 py-3 text-orange-600">61-90 Days</td><td className="px-5 py-3 text-right font-medium text-orange-600">{formatCurrency(agingReceivables.days61to90)}</td><td className="px-5 py-3 text-right text-orange-600">13%</td></tr>
                    <tr><td className="px-5 py-3 text-red-600">90+ Days</td><td className="px-5 py-3 text-right font-medium text-red-600">{formatCurrency(agingReceivables.over90)}</td><td className="px-5 py-3 text-right text-red-600">11%</td></tr>
                    <tr className="bg-green-50 font-bold"><td className="px-5 py-3">Total</td><td className="px-5 py-3 text-right">{formatCurrency(summary.totalReceivables)}</td><td className="px-5 py-3 text-right">100%</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 bg-red-50 border-b border-red-100">
                  <h3 className="font-semibold text-red-800">Payables Aging</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Period</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr><td className="px-5 py-3">Current</td><td className="px-5 py-3 text-right font-medium">{formatCurrency(agingPayables.current)}</td><td className="px-5 py-3 text-right text-gray-500">38%</td></tr>
                    <tr><td className="px-5 py-3">1-30 Days</td><td className="px-5 py-3 text-right font-medium">{formatCurrency(agingPayables.days1to30)}</td><td className="px-5 py-3 text-right text-gray-500">27%</td></tr>
                    <tr><td className="px-5 py-3 text-yellow-600">31-60 Days</td><td className="px-5 py-3 text-right font-medium text-yellow-600">{formatCurrency(agingPayables.days31to60)}</td><td className="px-5 py-3 text-right text-yellow-600">20%</td></tr>
                    <tr><td className="px-5 py-3 text-orange-600">61-90 Days</td><td className="px-5 py-3 text-right font-medium text-orange-600">{formatCurrency(agingPayables.days61to90)}</td><td className="px-5 py-3 text-right text-orange-600">10%</td></tr>
                    <tr><td className="px-5 py-3 text-red-600">90+ Days</td><td className="px-5 py-3 text-right font-medium text-red-600">{formatCurrency(agingPayables.over90)}</td><td className="px-5 py-3 text-right text-red-600">6%</td></tr>
                    <tr className="bg-red-50 font-bold"><td className="px-5 py-3">Total</td><td className="px-5 py-3 text-right">{formatCurrency(summary.totalPayables)}</td><td className="px-5 py-3 text-right">100%</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
