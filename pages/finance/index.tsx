import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaWallet, FaCalendarAlt, FaArrowUp, FaArrowDown, 
  FaBuilding, FaChartPie, FaTags, FaTruckLoading,
  FaFileInvoiceDollar, FaMoneyBillWave, FaExclamationTriangle, FaCreditCard,
  FaFileExport, FaFilePdf, FaFileExcel, FaFileCsv, FaFilter, FaSearch,
  FaArrowRight, FaChartBar
} from 'react-icons/fa';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import FinanceLayout from '@/components/layouts/finance-layout';
import { formatRupiah, exportToExcel, exportToCSV, exportToPDF } from '@/utils/exportUtils';
import axios from 'axios';
import dynamic from 'next/dynamic';
import ErrorBoundary from '@/components/errorBoundary/ErrorBoundary';

// Import ApexCharts secara dinamis karena ini adalah library client-side
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Import Chart.js components with required registration
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
);

// Import chart components dari react-chartjs-2
const Pie = dynamic(() => import('react-chartjs-2').then(mod => mod.Pie), {
  ssr: false,
  loading: () => <div className="h-48 w-48 flex items-center justify-center">Loading chart...</div>
});

// Import komponen BillingDashboardWidget
import { BillingDashboardWidget } from '@/modules/finance/components/BillingDashboardWidget';

// Definisi data chart
interface ChartData {
  labels: string[];
  series: number[];
}

// Definisi warna untuk red-orange theme yang konsisten
const chartColors = {
  primary: '#ef4444',  // Red-500
  secondary: '#f97316',  // Orange-500
  tertiary: '#fb923c',  // Orange-400
  quaternary: '#fca5a5', // Red-300
  background: '#fee2e2', // Red-100
  gradient: ['#ef4444', '#f97316']
};

// Type definitions
interface FinancialData {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  cashOnHand: number;
  accountsReceivable: number;
  accountsPayable: number;
  assetValue: number;
  inventoryValue: number;
}

interface InvoiceDebtData {
  totalUnpaid: number;
  overdueInvoices: number;
  upcomingDue: number;
  totalInvoices: number;
  overdueCount: number;
  criticalOverdue: number;
}

interface PartialPayment {
  id: string;
  supplier: string;
  total: number;
  paid: number;
  percentage: number;
  dueDate: string;
}

interface Branch {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
}

interface UnpaidInvoice {
  id: string;
  supplier: string;
  total: number;
  paid: number;
  percentage: number;
  dueDate: string;
}

interface IncomeVsExpenseMonthly {
  months: string[];
  income: number[];
  expense: number[];
}

// Custom UI Components - PENTING: Didefinisikan sebelum komponen utama Finance
const Modal: React.FC<{
  show: boolean;
  onHide: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}> = ({ show, onHide, title, children, footer }) => {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500">
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>
        <div className="p-4">
          {children}
        </div>
        <div className="px-4 py-3 flex justify-end space-x-2 border-t border-gray-200">
          {footer}
        </div>
      </div>
    </div>
  );
};

const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  className = ''
}) => {
  const baseClasses = "px-4 py-2 rounded-md text-white font-medium flex items-center justify-center";
  const variantClasses = variant === 'primary' 
    ? "bg-gradient-to-r from-red-500 to-orange-500" 
    : "bg-gray-500";
  
  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const Finance = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');
  const [branch, setBranch] = useState('all');
  const [branches, setBranches] = useState<Branch[]>([
    { id: 'all', name: 'Semua Cabang' },
    { id: 'branch-1', name: 'Cabang Pusat' },
    { id: 'branch-2', name: 'Cabang Utara' }
  ]);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // State data untuk halaman dashboard
  const MOCK_FIN: FinancialData = { totalIncome: 125000000, totalExpenses: 85000000, netProfit: 40000000, cashOnHand: 65000000, accountsReceivable: 18500000, accountsPayable: 12000000, assetValue: 350000000, inventoryValue: 45000000 };
  const MOCK_DEBT: InvoiceDebtData = { totalUnpaid: 12000000, overdueInvoices: 3500000, upcomingDue: 8500000, totalInvoices: 15, overdueCount: 3, criticalOverdue: 1 };
  const MOCK_PARTIAL: PartialPayment[] = [{ id: 'pp1', supplier: 'PT Supplier A', total: 5000000, paid: 3000000, percentage: 60, dueDate: '20/03/2026' }];
  const MOCK_UNPAID: UnpaidInvoice[] = [{ id: 'ui1', supplier: 'PT Vendor B', total: 8500000, paid: 0, percentage: 0, dueDate: '25/03/2026' }];
  const MOCK_RECENT_TX: Transaction[] = [{ id: 'tx1', date: '15/03/2026', description: 'Penjualan harian', amount: 4500000, type: 'income', category: 'Penjualan' }, { id: 'tx2', date: '15/03/2026', description: 'Pembelian bahan baku', amount: 2800000, type: 'expense', category: 'Pembelian' }];
  const [financialData, setFinancialData] = useState<FinancialData>(MOCK_FIN);
  
  const [invoiceDebtData, setInvoiceDebtData] = useState<InvoiceDebtData>(MOCK_DEBT);
  
  const [partialPayments, setPartialPayments] = useState<PartialPayment[]>(MOCK_PARTIAL);
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>(MOCK_UNPAID);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(MOCK_RECENT_TX);
  
  // State untuk data perbandingan pendapatan vs pengeluaran bulanan
  const [incomeVsExpenseMonthly, setIncomeVsExpenseMonthly] = useState<IncomeVsExpenseMonthly>({
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    income: [0, 0, 0, 0, 0, 0],
    expense: [0, 0, 0, 0, 0, 0]
  });
  
  // Chart data from backend
  const [monthlySummaryData, setMonthlySummaryData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Pendapatan',
        data: [],
        borderColor: chartColors.primary,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Pengeluaran',
        data: [],
        borderColor: chartColors.secondary,
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  });
  
  const [invoiceDebtChartData, setInvoiceDebtChartData] = useState({
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)',  // Green
          'rgba(239, 68, 68, 0.7)',   // Red
          'rgba(249, 115, 22, 0.7)',  // Orange
        ],
        borderColor: [
          '#10b981',  // Green
          '#ef4444',  // Red
          '#f97316',  // Orange
        ],
        borderWidth: 1,
      },
    ],
  });
  
  const [revenueByCategory, setRevenueByCategory] = useState<any>({
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',   // Red
          'rgba(249, 115, 22, 0.7)',  // Orange
          'rgba(251, 146, 60, 0.7)',  // Light Orange
          'rgba(252, 165, 165, 0.7)', // Light Red
          'rgba(254, 226, 226, 0.7)', // Lightest Red
        ],
        borderColor: [
          '#ef4444',
          '#f97316',
          '#fb923c',
          '#fca5a5',
          '#fee2e2',
        ],
        borderWidth: 1,
      },
    ],
  });

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch real data from backend API
      const statsResponse = await fetch(`/api/finance/dashboard-stats?period=${period}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });
      
      // Process API response
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Finance stats from backend:', statsData);
        
        if (statsData.success && statsData.data) {
          const apiData = statsData.data;
          
          // Update financial data from overview
          if (apiData.overview) {
            setFinancialData({
              totalIncome: apiData.overview.totalIncome || 0,
              totalExpenses: apiData.overview.totalExpenses || 0,
              netProfit: apiData.overview.netProfit || 0,
              cashOnHand: apiData.overview.cashOnHand || 0,
              accountsReceivable: apiData.overview.accountsReceivable || 0,
              accountsPayable: apiData.overview.accountsPayable || 0,
              assetValue: apiData.overview.totalAssets || 0,
              inventoryValue: 0
            });
          }
          
          console.log('Financial data updated:', {
            totalIncome: apiData.totalIncome,
            totalExpenses: apiData.totalExpenses,
            netProfit: apiData.netProfit
          });
          
          // Update invoice debt data from overview
          if (apiData.overview) {
            setInvoiceDebtData({
              totalUnpaid: apiData.overview.accountsPayable || 0,
              overdueInvoices: 0,
              upcomingDue: 0,
              totalInvoices: 0,
              overdueCount: 0,
              criticalOverdue: 0
            });
          }
          
          // Update revenue by category from breakdown
          if (apiData.breakdown && apiData.breakdown.incomeByCategory) {
            const categories = Object.keys(apiData.breakdown.incomeByCategory);
            const values = Object.values(apiData.breakdown.incomeByCategory) as number[];
            
            setRevenueByCategory({
              labels: categories,
              datasets: [
                {
                  data: values,
                  backgroundColor: [
                    'rgba(239, 68, 68, 0.7)',
                    'rgba(249, 115, 22, 0.7)',
                    'rgba(251, 146, 60, 0.7)',
                    'rgba(252, 165, 165, 0.7)',
                    'rgba(254, 226, 226, 0.7)',
                  ],
                  borderColor: [
                    '#ef4444',
                    '#f97316',
                    '#fb923c',
                    '#fca5a5',
                    '#fee2e2',
                  ],
                  borderWidth: 1,
                },
              ],
            });
          }
          
          // Update income vs expense monthly data and chart
          if (apiData.trends && apiData.trends.monthly) {
            const monthlyData = apiData.trends.monthly;
            const months = monthlyData.map((m: any) => m.month);
            const income = monthlyData.map((m: any) => m.income);
            const expense = monthlyData.map((m: any) => m.expense);
            
            setIncomeVsExpenseMonthly({
              months,
              income,
              expense
            });
            
            setMonthlySummaryData({
              labels: months,
              datasets: [
                {
                  label: 'Pendapatan',
                  data: income,
                  borderColor: chartColors.primary,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  tension: 0.3,
                  fill: true,
                },
                {
                  label: 'Pengeluaran',
                  data: expense,
                  borderColor: chartColors.secondary,
                  backgroundColor: 'rgba(249, 115, 22, 0.1)',
                  tension: 0.3,
                  fill: true,
                },
              ],
            });
            console.log('Monthly trends updated:', monthlyData);
          }
          
          // Set transactions - always use API data, even if empty
          if (apiData.recentTransactions) {
            const formattedTransactions = apiData.recentTransactions.map((tx: any) => ({
              id: tx.id,
              date: new Date(tx.transaction_date || tx.date).toLocaleDateString('id-ID'),
              description: tx.description,
              amount: parseFloat(tx.amount),
              type: tx.type,
              category: tx.category,
              source: tx.source || 'manual'
            }));
            setRecentTransactions(formattedTransactions);
            console.log('Recent transactions updated:', formattedTransactions.length, 'items');
          } else {
            setRecentTransactions([]);
          }
          
          // Set unpaid invoices - always use API data
          if (apiData.unpaidInvoices) {
            const formattedUnpaid = apiData.unpaidInvoices.map((inv: any) => ({
              id: inv.id,
              supplier: inv.customer_name || inv.supplier_name || 'Unknown',
              total: parseFloat(inv.total_amount),
              paid: parseFloat(inv.paid_amount || 0),
              percentage: inv.total_amount > 0 ? Math.round((parseFloat(inv.paid_amount || 0) / parseFloat(inv.total_amount)) * 100) : 0,
              dueDate: new Date(inv.due_date).toLocaleDateString('id-ID')
            }));
            setUnpaidInvoices(formattedUnpaid);
            console.log('Unpaid invoices updated:', formattedUnpaid.length, 'items');
          } else {
            setUnpaidInvoices([]);
          }
          
          // Set partial payments - always use API data
          if (apiData.partialPayments) {
            const formattedPartial = apiData.partialPayments.map((pay: any) => ({
              id: pay.id,
              supplier: pay.customer_name || pay.supplier_name || 'Unknown',
              total: parseFloat(pay.total_amount),
              paid: parseFloat(pay.paid_amount),
              percentage: pay.total_amount > 0 ? Math.round((parseFloat(pay.paid_amount) / parseFloat(pay.total_amount)) * 100) : 0,
              dueDate: new Date(pay.due_date).toLocaleDateString('id-ID')
            }));
            setPartialPayments(formattedPartial);
            console.log('Partial payments updated:', formattedPartial.length, 'items');
          } else {
            setPartialPayments([]);
          }
          
          // Update subscription status if available
          if (apiData.subscriptionStatus) {
            console.log('Subscription status:', apiData.subscriptionStatus);
          }
          
        } else {
          console.warn('No data in API response');
        }
      } else {
        console.error("Error fetching finance data:", statsResponse.statusText);
        setError('Failed to load finance data from backend');
      }
    } catch (err) {
      console.error("Error in fetchData:", err);
      setFinancialData(MOCK_FIN);
      setInvoiceDebtData(MOCK_DEBT);
      setRecentTransactions(MOCK_RECENT_TX);
      setUnpaidInvoices(MOCK_UNPAID);
      setPartialPayments(MOCK_PARTIAL);
    } finally {
      setLoading(false);
    }
  }, [period, branch]);

  // Initial data fetch on component mount and when period/branch changes
  useEffect(() => {
    console.log("Finance component mounted or dependencies changed");
    fetchData();
  }, [fetchData]);

  // Handle filter changes  
  const handleBranchChange = (e: any) => {
    setBranch(e.target.value);
  };
  
  const handlePeriodChange = (e: any) => {
    setPeriod(e.target.value);
  };
  
  const handleApplyFilter = () => {
    fetchData();
  };

  return (
    <ErrorBoundary>
      <FinanceLayout>
        {/* Export Modal */}
        <Modal 
          show={showExportModal} 
          onHide={() => setShowExportModal(false)}
          title="Konfirmasi Export Data"
          footer={
            <>
              <Button 
                variant="secondary" 
                onClick={() => setShowExportModal(false)}
              >
                Batal
              </Button>
              <Button 
                onClick={() => {
                  // Implementasi export data
                  setShowExportModal(false);
                }}
              >
                Export
              </Button>
            </>
          }
        >
          <p>Anda akan mengekspor data dashboard keuangan dalam format <strong>Excel</strong>.</p>
          <p>Pastikan data yang ditampilkan sudah sesuai dengan periode dan cabang yang dipilih.</p>
        </Modal>
        
        {/* Loading state */}
        {loading && !error && (
          <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[70vh]">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-medium text-gray-700 mb-2">{t('finance.loadingData')}</h2>
            <p className="text-gray-500">{t('finance.pleaseWait')}</p>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[70vh]">
            <div className="bg-white p-8 rounded-lg shadow-md border border-red-100 max-w-lg w-full text-center">
              <div className="w-16 h-16 mx-auto bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">{t('finance.loadFailed')}</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button 
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  fetchData();
                }}
                className="bg-gradient-to-r from-red-600 to-orange-500 text-white px-6 py-2 rounded-md font-medium hover:from-red-700 hover:to-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              >
                {t('finance.refreshPage')}
              </button>
            </div>
          </div>
        )}
        
        {/* Content when not loading or error */}
        {!loading && !error && (
          <div className="px-6 py-6">
            {/* Header Card - Professional & Elegant */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-6 md:p-8 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <FaWallet className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">{t('finance.title')}</h1>
                    <p className="text-green-100 mt-1">{t('finance.subtitle')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all backdrop-blur"
                  >
                    <FaFileExport className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="text-red-500" />
                  <div className="w-full">
                    <label htmlFor="period-filter" className="block text-xs font-medium text-gray-600 mb-1">
                      {t('finance.period')}
                    </label>
                    <div className="relative">
                      <select
                        id="period-filter"
                        value={period}
                        onChange={handlePeriodChange}
                        className="block w-full py-2 pl-3 pr-10 text-base border border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 rounded-md"
                      >
                        <option value="week">{t('common.thisWeek')}</option>
                        <option value="month">{t('common.thisMonth')}</option>
                        <option value="quarter">{t('finance.thisQuarter')}</option>
                        <option value="year">{t('finance.thisYear')}</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <FaBuilding className="text-red-500" />
                  <div className="w-full">
                    <label htmlFor="branch-filter" className="block text-xs font-medium text-gray-600 mb-1">
                      {t('finance.branch')}
                    </label>
                    <div className="relative">
                      <select
                        id="branch-filter"
                        value={branch}
                        onChange={handleBranchChange}
                        className="block w-full py-2 pl-3 pr-10 text-base border border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 rounded-md"
                      >
                        {branches.map((branchItem) => (
                          <option key={branchItem.id} value={branchItem.id}>
                            {branchItem.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-end lg:justify-start">
                  <button
                    onClick={handleApplyFilter}
                    className="bg-gradient-to-r from-red-600 to-orange-500 text-white px-4 py-2 rounded-md font-medium hover:from-red-700 hover:to-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center"
                  >
                    <FaFilter className="mr-2" />
                    <span>{t('finance.applyFilter')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Total Income */}
              <div className="bg-white p-5 rounded-lg shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('finance.incomeThisMonth')}</span>
                  <div className="bg-red-100 p-2.5 rounded-lg">
                    <FaArrowUp className="text-red-500 text-lg" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatRupiah(financialData.totalIncome)}
                </div>
                <div className="flex items-center text-green-600 text-sm">
                  <FaArrowUp className="mr-1 text-xs" />
                  <span className="font-medium">+15.3%</span>
                  <span className="text-gray-500 ml-1">dari bulan lalu</span>
                </div>
              </div>
              
              {/* Total Expenses */}
              <div className="bg-white p-5 rounded-lg shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('finance.expensesThisMonth')}</span>
                  <div className="bg-orange-100 p-2.5 rounded-lg">
                    <FaArrowDown className="text-orange-500 text-lg" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatRupiah(financialData.totalExpenses)}
                </div>
                <div className="flex items-center text-red-600 text-sm">
                  <FaArrowUp className="mr-1 text-xs" />
                  <span className="font-medium">+7.8%</span>
                  <span className="text-gray-500 ml-1">dari bulan lalu</span>
                </div>
              </div>
              
              {/* Net Profit */}
              <div className="bg-white p-5 rounded-lg shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('finance.transactionsThisWeek')}</span>
                  <div className="bg-green-100 p-2.5 rounded-lg">
                    <FaWallet className="text-green-500 text-lg" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatRupiah(financialData.netProfit)}
                </div>
                <div className="flex items-center text-green-600 text-sm">
                  <FaArrowUp className="mr-1 text-xs" />
                  <span className="font-medium">+15.3%</span>
                  <span className="text-gray-500 ml-1">dari minggu lalu</span>
                </div>
              </div>
            </div>

            {/* Quick Access Menu */}
            <div className="mb-6">
              <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide mb-5">{t('finance.financeMenu')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/finance/piutang" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all border-l-4 border-blue-500 group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-blue-100 p-2.5 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <FaFileInvoiceDollar className="text-blue-600 text-lg" />
                    </div>
                    <FaArrowRight className="text-gray-400 text-sm group-hover:text-blue-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1 text-sm">{t('finance.receivables')}</h3>
                  <p className="text-xs text-gray-600">{t('finance.manageCustomerBills')}</p>
                </Link>

                <Link href="/finance/hutang" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all border-l-4 border-red-500 group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-red-100 p-2.5 rounded-lg group-hover:bg-red-200 transition-colors">
                      <FaMoneyBillWave className="text-red-600 text-lg" />
                    </div>
                    <FaArrowRight className="text-gray-400 text-sm group-hover:text-red-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1 text-sm">{t('finance.payables')}</h3>
                  <p className="text-xs text-gray-600">{t('finance.manageSupplierDebt')}</p>
                </Link>

                <Link href="/finance/profit" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all border-l-4 border-green-500 group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-green-100 p-2.5 rounded-lg group-hover:bg-green-200 transition-colors">
                      <FaChartPie className="text-green-600 text-lg" />
                    </div>
                    <FaArrowRight className="text-gray-400 text-sm group-hover:text-green-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1 text-sm">{t('finance.profitAnalysis')}</h3>
                  <p className="text-xs text-gray-600">{t('finance.monitorProfit')}</p>
                </Link>

                <Link href="/finance/invoices" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all border-l-4 border-purple-500 group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-purple-100 p-2.5 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <FaFileInvoiceDollar className="text-purple-600 text-lg" />
                    </div>
                    <FaArrowRight className="text-gray-400 text-sm group-hover:text-purple-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1 text-sm">{t('finance.invoice')}</h3>
                  <p className="text-xs text-gray-600">{t('finance.manageSalesInvoice')}</p>
                </Link>

                <Link href="/finance/expenses" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all border-l-4 border-orange-500 group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-orange-100 p-2.5 rounded-lg group-hover:bg-orange-200 transition-colors">
                      <FaTruckLoading className="text-orange-600 text-lg" />
                    </div>
                    <FaArrowRight className="text-gray-400 text-sm group-hover:text-orange-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1 text-sm">{t('finance.expenses')}</h3>
                  <p className="text-xs text-gray-600">{t('finance.recordOperationalCosts')}</p>
                </Link>

                <Link href="/finance/income" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all border-l-4 border-teal-500 group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-teal-100 p-2.5 rounded-lg group-hover:bg-teal-200 transition-colors">
                      <FaWallet className="text-teal-600 text-lg" />
                    </div>
                    <FaArrowRight className="text-gray-400 text-sm group-hover:text-teal-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1 text-sm">{t('finance.income')}</h3>
                  <p className="text-xs text-gray-600">{t('finance.recordIncome')}</p>
                </Link>

                <Link href="/finance/profit-loss" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all border-l-4 border-indigo-500 group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-indigo-100 p-2.5 rounded-lg group-hover:bg-indigo-200 transition-colors">
                      <FaChartBar className="text-indigo-600 text-lg" />
                    </div>
                    <FaArrowRight className="text-gray-400 text-sm group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1 text-sm">{t('finance.profitLoss')}</h3>
                  <p className="text-xs text-gray-600">{t('finance.financialReport')}</p>
                </Link>

                <Link href="/finance/transactions" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all border-l-4 border-pink-500 group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-pink-100 p-2.5 rounded-lg group-hover:bg-pink-200 transition-colors">
                      <FaCreditCard className="text-pink-600 text-lg" />
                    </div>
                    <FaArrowRight className="text-gray-400 text-sm group-hover:text-pink-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1 text-sm">{t('finance.transactionsMenu')}</h3>
                  <p className="text-xs text-gray-600">{t('finance.transactionHistory')}</p>
                </Link>
              </div>
            </div>

            {/* Invoice Status & Income vs Expense - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Invoice Debt Status - Left Side (1/2) */}
              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">{t('finance.invoiceStatus')}</h2>
                  <Link href="/finance/invoices" className="text-red-500 hover:text-red-700 font-semibold flex items-center text-xs">
                    <span>Lihat Semua</span>
                    <FaArrowRight className="ml-1.5 text-xs" />
                  </Link>
                </div>
                
                {/* Doughnut Chart */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribusi Status Faktur</h3>
                  <div className="flex items-center justify-center gap-6">
                    <div className="w-40 h-40">
                      {typeof window !== 'undefined' && (
                        <Pie 
                          data={invoiceDebtChartData}
                          options={{
                            plugins: {
                              legend: {
                                display: false
                              },
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    return `${label}: ${value}`;
                                  }
                                }
                              }
                            },
                            maintainAspectRatio: false,
                            cutout: '65%'
                          }}
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                        <span className="text-sm font-medium text-gray-700">Lunas: <span className="font-bold">{invoiceDebtChartData.datasets[0].data[0]}</span></span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                        <span className="text-sm font-medium text-gray-700">Belum Lunas: <span className="font-bold">{invoiceDebtChartData.datasets[0].data[1]}</span></span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                        <span className="text-sm font-medium text-gray-700">Jatuh Tempo: <span className="font-bold">{invoiceDebtChartData.datasets[0].data[2]}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pendapatan vs Pengeluaran - Right Side (1/2) */}
              <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-bold text-gray-800 uppercase tracking-wide">Pendapatan vs Pengeluaran</h3>
                <div className="flex gap-2">
                  <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-1.5 px-3 rounded-md transition-colors">
                    <FaFileCsv className="inline mr-1 text-xs" /> CSV
                  </button>
                  <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-1.5 px-3 rounded-md transition-colors">
                    <FaFilePdf className="inline mr-1 text-xs" /> PDF
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">6 Bulan Terakhir</p>
              
              <div className="h-64">
                {typeof window !== 'undefined' && (
                  <ErrorBoundary fallback={<div className="h-full flex items-center justify-center text-red-500">Error loading chart</div>}>
                    <Chart
                      type="bar"
                      height="100%"
                      options={{
                        chart: {
                          type: 'bar',
                          stacked: false,
                          toolbar: {
                            show: false
                          }
                        },
                        colors: [chartColors.secondary, chartColors.primary],
                        plotOptions: {
                          bar: {
                            horizontal: false,
                            columnWidth: '55%',
                            borderRadius: 5
                          },
                        },
                        dataLabels: {
                          enabled: false
                        },
                        stroke: {
                          show: true,
                          width: 2,
                          colors: ['transparent']
                        },
                        xaxis: {
                          categories: incomeVsExpenseMonthly.months,
                        },
                        yaxis: {
                          title: {
                            text: 'Nominal (Rp)'
                          },
                          labels: {
                            formatter: function (value) {
                              // Format untuk jutaan rupiah
                              return (value / 1000000).toFixed(0) + ' Jt';
                            }
                          }
                        },
                        tooltip: {
                          y: {
                            formatter: function (val) {
                              return formatRupiah(val);
                            }
                          }
                        },
                        fill: {
                          opacity: 1
                        },
                        legend: {
                          position: 'top',
                          horizontalAlign: 'right',
                        }
                      }}
                      series={[
                        {
                          name: "Pendapatan",
                          data: incomeVsExpenseMonthly.income
                        },
                        {
                          name: "Pengeluaran",
                          data: incomeVsExpenseMonthly.expense
                        }
                      ]}
                    />
                  </ErrorBoundary>
                )}
              </div>
              </div>
            </div>
            
            {/* Billing Subscription Status Widget */}
            <div className="mb-6">
              <BillingDashboardWidget />
            </div>
            
            {/* Partial Payments */}
            <div className="bg-white rounded-lg shadow-md p-5 mb-6">
              <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide mb-5">Faktur Pembayaran Cicilan</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Faktur ID</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Supplier</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Dibayar</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Progress</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Jatuh Tempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partialPayments && partialPayments.length > 0 ? (
                      partialPayments.map((payment) => (
                        <tr key={payment.id} className="border-t hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">{payment.id}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{payment.supplier}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-gray-900">{formatRupiah(payment.total)}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-green-600">{formatRupiah(payment.paid)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all" 
                                  style={{ width: `${payment.percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{payment.percentage}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">{payment.dueDate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-sm text-gray-500">Tidak ada faktur pembayaran cicilan</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Unpaid Invoices */}
            <div className="bg-white rounded-lg shadow-md p-5 mb-6">
              <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide mb-5">Faktur Belum Lunas</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Faktur</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Jatuh Tempo</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Dibayar</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpaidInvoices && unpaidInvoices.length > 0 ? (
                      unpaidInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-t hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{invoice.supplier}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{invoice.dueDate}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900">{formatRupiah(invoice.total)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-green-600">{formatRupiah(invoice.paid)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all" style={{ width: `${invoice.percentage}%` }}></div>
                              </div>
                              <span className="text-xs font-semibold text-gray-700">{invoice.percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                          Tidak ada faktur yang belum lunas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Recent Transactions */}
            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">Transaksi Terbaru</h2>
                <Link href="/finance/transactions" className="text-red-500 hover:text-red-700 font-semibold flex items-center text-xs">
                  <span>Lihat Semua</span>
                  <FaArrowRight className="ml-1.5 text-xs" />
                </Link>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tanggal</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Deskripsi</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Kategori</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tipe</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions && recentTransactions.length > 0 ? (
                      recentTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-t hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm text-gray-700">{transaction.date}</td>
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">{transaction.description}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{transaction.category}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${transaction.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {transaction.type === 'income' ? 'Pendapatan' : 'Pengeluaran'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`text-sm font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.type === 'income' ? '+' : '-'} {formatRupiah(transaction.amount)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-sm text-gray-500">Tidak ada transaksi terbaru</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </FinanceLayout>
    </ErrorBoundary>
  );
};

export default Finance;
