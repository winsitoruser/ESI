import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { CanAccess, PageGuard } from '../../../components/permissions';
import TransactionFormModal from '../../../components/hq/finance/TransactionFormModal';
import Link from 'next/link';
import { useFinancePeriod, PeriodSelector } from '../../../contexts/FinancePeriodContext';
import { FinancePageSkeleton } from '../../../components/finance/FinanceSkeleton';
import FinanceErrorModal from '../../../components/finance/FinanceErrorModal';
import { rowsOr, MOCK_HQ_BRANCHES, MOCK_HQ_ACCOUNTS } from '@/lib/hq/mock-data';
import {
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Calendar,
  Building2,
  ShoppingCart,
  Users,
  Zap,
  Truck,
  Megaphone,
  Wrench,
  Filter,
  Search,
  ChevronLeft,
  Plus,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  X
} from 'lucide-react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ExpenseSummary {
  totalExpenses: number;
  previousExpenses: number;
  growth: number;
  cogs: number;
  payroll: number;
  utilities: number;
  marketing: number;
  logistics: number;
  maintenance: number;
  other: number;
  pendingApprovals: number;
  budgetUsed: number;
  budgetTotal: number;
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  amount: number;
  budget: number;
  percentage: number;
  trend: number;
  color: string;
}

interface ExpenseItem {
  id: string;
  date: string;
  description: string;
  category: string;
  branch: string;
  amount: number;
  status: 'approved' | 'pending' | 'rejected';
  approver: string;
  vendor: string;
}

interface BranchExpense {
  id: string;
  name: string;
  code: string;
  totalExpenses: number;
  cogs: number;
  payroll: number;
  utilities: number;
  other: number;
  budgetUsed: number;
}

const defaultExpSummary: ExpenseSummary = { totalExpenses: 0, previousExpenses: 0, growth: 0, cogs: 0, payroll: 0, utilities: 0, marketing: 0, logistics: 0, maintenance: 0, other: 0, pendingApprovals: 0, budgetUsed: 0, budgetTotal: 0 };

const formatCurrency = (value: number) => {
  if (value >= 1000000000) {
    return `Rp ${(value / 1000000000).toFixed(1)}M`;
  } else if (value >= 1000000) {
    return `Rp ${(value / 1000000).toFixed(1)}Jt`;
  }
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const getCategoryIcon = (icon: string) => {
  switch (icon) {
    case 'shopping-cart': return ShoppingCart;
    case 'users': return Users;
    case 'zap': return Zap;
    case 'megaphone': return Megaphone;
    case 'truck': return Truck;
    case 'wrench': return Wrench;
    default: return FileText;
  }
};

const MOCK_EXP_SUMMARY: ExpenseSummary = {
  totalExpenses: 1650000000, previousExpenses: 1520000000, growth: 8.6,
  cogs: 580000000, payroll: 520000000, utilities: 145000000, marketing: 185000000,
  logistics: 120000000, maintenance: 65000000, other: 35000000,
  pendingApprovals: 4, budgetUsed: 1650000000, budgetTotal: 2500000000,
};

const MOCK_EXP_CATEGORIES: ExpenseCategory[] = [
  { id: '1', name: 'COGS', icon: 'shopping-cart', amount: 580000000, budget: 800000000, percentage: 35, trend: 3.2, color: '#3B82F6' },
  { id: '2', name: 'Payroll', icon: 'users', amount: 520000000, budget: 650000000, percentage: 32, trend: 2.0, color: '#10B981' },
  { id: '3', name: 'Utilities', icon: 'zap', amount: 145000000, budget: 180000000, percentage: 9, trend: 8.5, color: '#F59E0B' },
  { id: '4', name: 'Marketing', icon: 'megaphone', amount: 185000000, budget: 250000000, percentage: 11, trend: -2.6, color: '#EF4444' },
  { id: '5', name: 'Logistics', icon: 'truck', amount: 120000000, budget: 200000000, percentage: 7, trend: -14.3, color: '#8B5CF6' },
  { id: '6', name: 'Maintenance', icon: 'wrench', amount: 65000000, budget: 100000000, percentage: 4, trend: 5.0, color: '#EC4899' },
];

const MOCK_EXP_ITEMS: ExpenseItem[] = [
  { id: 'e1', date: '2026-03-12', description: 'Pembelian Bahan Baku Kopi', category: 'COGS', branch: 'Gudang Pusat Bekasi', amount: 15200000, status: 'approved', approver: 'Ahmad Wijaya', vendor: 'PT Sumber Makmur' },
  { id: 'e2', date: '2026-03-11', description: 'Gaji Karyawan Maret 2026', category: 'Payroll', branch: 'All', amount: 125000000, status: 'pending', approver: '-', vendor: '-' },
  { id: 'e3', date: '2026-03-10', description: 'Biaya Listrik & Air Maret', category: 'Utilities', branch: 'All', amount: 18500000, status: 'approved', approver: 'Ahmad Wijaya', vendor: 'PLN & PDAM' },
  { id: 'e4', date: '2026-03-10', description: 'Campaign Google Ads Maret', category: 'Marketing', branch: 'HQ Jakarta', amount: 8500000, status: 'approved', approver: 'Siti Rahayu', vendor: 'Google' },
  { id: 'e5', date: '2026-03-09', description: 'Servis AC Cabang Bandung', category: 'Maintenance', branch: 'Cabang Bandung', amount: 3200000, status: 'approved', approver: 'Siti Rahayu', vendor: 'CV Teknik Sejuk' },
  { id: 'e6', date: '2026-03-08', description: 'Pengiriman ke Cabang Bali', category: 'Logistics', branch: 'Cabang Bali', amount: 4800000, status: 'pending', approver: '-', vendor: 'JNE Cargo' },
];

const MOCK_BRANCH_EXP: BranchExpense[] = [
  { id: 'b1', name: 'Kantor Pusat Jakarta', code: 'HQ-001', totalExpenses: 420000000, cogs: 150000000, payroll: 180000000, utilities: 45000000, other: 45000000, budgetUsed: 65 },
  { id: 'b2', name: 'Cabang Bandung', code: 'BR-002', totalExpenses: 290000000, cogs: 105000000, payroll: 120000000, utilities: 32000000, other: 33000000, budgetUsed: 76 },
  { id: 'b3', name: 'Cabang Surabaya', code: 'BR-003', totalExpenses: 310000000, cogs: 115000000, payroll: 110000000, utilities: 38000000, other: 47000000, budgetUsed: 89 },
  { id: 'b5', name: 'Cabang Bali', code: 'BR-005', totalExpenses: 195000000, cogs: 80000000, payroll: 75000000, utilities: 22000000, other: 18000000, budgetUsed: 65 },
];

export default function ExpenseManagement() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { period } = useFinancePeriod();
  const [apiError, setApiError] = useState<{ show: boolean; message: string; details?: string }>({ show: false, message: '' });
  const [summary, setSummary] = useState<ExpenseSummary>(MOCK_EXP_SUMMARY);
  const [categories, setCategories] = useState<ExpenseCategory[]>(MOCK_EXP_CATEGORIES);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(MOCK_EXP_ITEMS);
  const [branchExpenses, setBranchExpenses] = useState<BranchExpense[]>(MOCK_BRANCH_EXP);
  const [viewMode, setViewMode] = useState<'list' | 'category' | 'branch'>('list');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [branches, setBranches] = useState<any[]>(MOCK_HQ_BRANCHES);
  const [accounts, setAccounts] = useState<any[]>(MOCK_HQ_ACCOUNTS);
  
  // Fetch branches and accounts for modal
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
      // Try the expenses API first (has categories + summary)
      const expApiRes = await fetch(`/api/hq/finance/expenses?period=${period}`);
      if (expApiRes.ok) {
        const expJson = await expApiRes.json();
        const expPayload = expJson.data || expJson;
        if (expPayload.summary) setSummary(expPayload.summary);
        if (expPayload.categories) setCategories(expPayload.categories);
        if (expPayload.branches) setBranchExpenses(expPayload.branches);
        if (expPayload.expenses && expPayload.expenses.length > 0) {
          setExpenses(expPayload.expenses);
          setLoading(false);
          return;
        }
      }

      // Fallback: fetch from transactions API
      const response = await fetch(`/api/hq/finance/transactions?type=expense&limit=100&page=1`);
      if (response.ok) {
        const result = await response.json();
        const rawData = result.data || result;
        const transactions = (Array.isArray(rawData) ? rawData : []).map((t: any) => ({
          ...t,
          type: t.type || t.transactionType || '',
          amount: parseFloat(t.amount || 0),
        }));
        
        const totalExpenses = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
        
        const categoryMap: { [key: string]: number } = {};
        transactions.forEach((t: any) => {
          const cat = t.category || 'Other';
          categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
        });
        
        setSummary({
          ...defaultExpSummary,
          totalExpenses,
          cogs: categoryMap['COGS'] || 0,
          payroll: categoryMap['Payroll'] || 0,
          utilities: categoryMap['Utilities'] || 0,
          marketing: categoryMap['Marketing'] || 0,
          logistics: categoryMap['Logistics'] || 0,
          maintenance: categoryMap['Maintenance'] || 0,
          other: categoryMap['Other'] || 0
        });

        // Build categories from data
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
        const builtCategories = Object.entries(categoryMap).map(([name, amount], i) => ({
          id: String(i + 1), name, icon: 'circle', amount,
          budget: 0, percentage: totalExpenses > 0 ? Math.round(amount / totalExpenses * 100) : 0,
          trend: 0, color: colors[i % colors.length]
        }));
        if (builtCategories.length > 0) setCategories(builtCategories);
        
        const mappedExpenses: ExpenseItem[] = transactions.map((t: any) => ({
          id: t.id,
          date: t.transactionDate,
          description: t.description,
          category: t.category,
          branch: t.account_code || 'N/A',
          amount: parseFloat(t.amount),
          status: (t.status === 'completed' ? 'approved' : t.status === 'pending' ? 'pending' : 'rejected') as 'approved' | 'pending' | 'rejected',
          approver: '-',
          vendor: t.contactName || '-'
        }));
        
        setExpenses(mappedExpenses);
      }
    } catch (error) {
      console.error('Error fetching expense data:', error);
      setSummary(MOCK_EXP_SUMMARY);
      setCategories(MOCK_EXP_CATEGORIES);
      setExpenses(MOCK_EXP_ITEMS);
      setBranchExpenses(MOCK_BRANCH_EXP);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [period]);

  if (!mounted) return null;

  const expenseTrendOptions: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
    colors: ['#EF4444'],
    xaxis: { categories: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'] },
    yaxis: { labels: { formatter: (val) => formatCurrency(val * 1000000) } }
  };

  const expenseTrendSeries = [{ name: 'Expenses', data: [2200, 2350, 2480, 2650, 2750, 2884] }];

  const categoryPieOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut' },
    labels: categories.map(c => c.name),
    colors: categories.map(c => c.color),
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: true, formatter: (val: number) => `${val.toFixed(1)}%` }
  };

  const categoryPieSeries = categories.map(c => c.percentage);

  const monthlyCompareOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, stacked: true },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
    xaxis: { categories: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'] },
    yaxis: { labels: { formatter: (val) => formatCurrency(val * 1000000) } },
    legend: { position: 'top' }
  };

  const monthlyCompareSeries = [
    { name: 'COGS', data: [1200, 1280, 1350, 1450, 1520, 1586] },
    { name: 'Payroll', data: [650, 665, 680, 695, 708, 721] },
    { name: 'Utilities', data: [180, 190, 200, 210, 220, 231] },
    { name: 'Marketing', data: [150, 165, 180, 195, 198, 202] },
    { name: 'Logistics', data: [60, 65, 70, 75, 80, 87] },
    { name: 'Maintenance', data: [40, 45, 50, 52, 55, 58] }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"><CheckCircle className="w-3 h-3" />Approved</span>;
      case 'pending':
        return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs"><Clock className="w-3 h-3" />Pending</span>;
      case 'rejected':
        return <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs"><AlertTriangle className="w-3 h-3" />Rejected</span>;
      default:
        return null;
    }
  };

  const filteredExpenses = filterStatus === 'all' 
    ? expenses 
    : expenses.filter(e => e.status === filterStatus);

  return (
    <PageGuard
      anyPermission={['finance.view', 'finance.*', 'finance_expenses.view']}
      title="Manajemen Pengeluaran"
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
              <h1 className="text-2xl font-bold text-gray-900">{t('finance.expTitle')}</h1>
              <p className="text-gray-500">{t('finance.expSubtitle')}</p>
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
            <CanAccess anyPermission={['finance_expenses.create', 'finance.*']}>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                {t('finance.add')} {t('finance.expenses')}
              </button>
            </CanAccess>
            
            {/* Transaction Form Modal */}
            <TransactionFormModal
              isOpen={showAddModal}
              onClose={() => setShowAddModal(false)}
              onSubmit={async (data) => {
                try {
                  const response = await fetch('/api/hq/finance/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      transactionType: 'expense',
                      accountId: data.accountId || null,
                      category: data.category || null,
                      amount: data.amount,
                      description: data.description,
                      paymentMethod: data.paymentMethod || null,
                      contactName: data.contactName || null,
                    })
                  });
                  
                  if (response.ok) {
                    setShowAddModal(false);
                    fetchData();
                  }
                } catch (error) {
                  console.error('Error creating expense:', error);
                }
              }}
              transaction={null}
              branches={branches}
              accounts={accounts}
            />
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              {t('finance.export')}
            </button>
          </div>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <TrendingDown className="w-8 h-8 opacity-80" />
              <span className={`flex items-center text-sm px-2 py-1 rounded-full ${summary.growth <= 0 ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
                {summary.growth <= 0 ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
                {Math.abs(summary.growth)}%
              </span>
            </div>
            <p className="text-red-100 text-sm">{t('finance.totalExpenses')}</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalExpenses)}</p>
            <p className="text-red-200 text-xs mt-1">vs {formatCurrency(summary.previousExpenses)} prev</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm">COGS</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.cogs)}</p>
            <p className="text-xs text-gray-500 mt-1">{summary.totalExpenses > 0 ? ((summary.cogs / summary.totalExpenses) * 100).toFixed(1) : '0.0'}% of total</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm">Payroll</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.payroll)}</p>
            <p className="text-xs text-gray-500 mt-1">{summary.totalExpenses > 0 ? ((summary.payroll / summary.totalExpenses) * 100).toFixed(1) : '0.0'}% of total</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              {summary.pendingApprovals > 0 && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                  {summary.pendingApprovals} pending
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">{t('finance.budgetUsed')}</p>
            <p className="text-2xl font-bold text-gray-900">{summary.budgetUsed}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${summary.budgetUsed > 90 ? 'bg-red-500' : summary.budgetUsed > 75 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                style={{ width: `${summary.budgetUsed}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-6 gap-4">
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            return (
              <div key={cat.id} className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                    <Icon className="w-5 h-5" style={{ color: cat.color }} />
                  </div>
                  <span className={`flex items-center text-xs ${cat.trend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {cat.trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(cat.trend)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{cat.name}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(cat.amount)}</p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div className="h-1.5 rounded-full" style={{ width: `${(cat.amount / cat.budget) * 100}%`, backgroundColor: cat.color }}></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{((cat.amount / cat.budget) * 100).toFixed(0)}% of budget</p>
              </div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">{t('finance.expenseTrend')}</h3>
            <Chart options={expenseTrendOptions} series={expenseTrendSeries} type="area" height={280} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">{t('finance.expenseByCategory')}</h3>
            <Chart options={categoryPieOptions} series={categoryPieSeries} type="donut" height={280} />
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">{t('finance.monthlyExpenseComparison')}</h3>
          <Chart options={monthlyCompareOptions} series={monthlyCompareSeries} type="bar" height={320} />
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg font-medium ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {t('finance.allExpenses')}
                </button>
                <button
                  onClick={() => setViewMode('branch')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewMode === 'branch' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Building2 className="w-4 h-4" />
                  {t('finance.byBranch')}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">{t('finance.allStatus')}</option>
                  <option value="approved">{t('finance.approved')}</option>
                  <option value="pending">{t('finance.pending')}</option>
                  <option value="rejected">{t('finance.rejected')}</option>
                </select>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('finance.search')}
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {viewMode === 'list' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.date')}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.description')}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.category')}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.branch')}</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('finance.amount')}</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('finance.status')}</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('finance.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-sm text-gray-600">{expense.date}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{expense.description}</p>
                        <p className="text-xs text-gray-500">{expense.vendor}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{expense.category}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{expense.branch}</td>
                      <td className="px-5 py-4 text-right font-medium text-red-600">{formatCurrency(expense.amount)}</td>
                      <td className="px-5 py-4 text-center">{getStatusBadge(expense.status)}</td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button className="p-1.5 hover:bg-gray-100 rounded">
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                          <button className="p-1.5 hover:bg-gray-100 rounded">
                            <Edit className="w-4 h-4 text-gray-500" />
                          </button>
                          <button className="p-1.5 hover:bg-gray-100 rounded">
                            <Trash2 className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === 'branch' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.branch')}</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('finance.totalExpenses')}</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">COGS</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payroll</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('finance.utilities')}</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('finance.other')}</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('finance.budgetUsed')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {branchExpenses.map((branch) => (
                    <tr key={branch.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{branch.name}</p>
                        <p className="text-xs text-gray-500">{branch.code}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-red-600">{formatCurrency(branch.totalExpenses)}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{formatCurrency(branch.cogs)}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{formatCurrency(branch.payroll)}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{formatCurrency(branch.utilities)}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{formatCurrency(branch.other)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${branch.budgetUsed > 90 ? 'bg-red-500' : branch.budgetUsed > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${branch.budgetUsed}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{branch.budgetUsed}%</span>
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
    </PageGuard>
  );
}
