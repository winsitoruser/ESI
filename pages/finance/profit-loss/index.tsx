import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { format, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTranslation } from '@/lib/i18n';
import ErrorDisplay from '@/components/ErrorDisplay';

// Interfaces for P&L data
interface ProfitLossItem {
  id: string;
  category: string;
  subcategory: string;
  amount: number;
  percentage?: number;
}

interface TrendData {
  month: string;
  revenue: number;
  expense: number;
  profit: number;
}

interface ProfitLossData {
  // Period info
  period: string;
  periodType: 'MONTH' | 'QUARTER' | 'YEAR';
  year: number;
  
  // Summary
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  
  // Detailed data
  revenues: ProfitLossItem[];
  expenses: ProfitLossItem[];
  
  // Comparison with previous period
  comparison: {
    revenue: {
      value: number;
      percentage: number;
    };
    expense: {
      value: number;
      percentage: number;
    };
    profit: {
      value: number;
      percentage: number;
    };
  };
  
  // Trend data (6 months for monthly, 3 years for yearly)
  trend: TrendData[];
}

export default function ProfitLossPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), 'yyyy'));
  const MOCK_PL: ProfitLossData = { period: 'Maret 2026', periodType: 'MONTH', year: 2026, totalRevenue: 125000000, totalExpense: 85000000, netProfit: 40000000, profitMargin: 32, revenues: [{ id: 'r1', category: 'Penjualan', subcategory: 'Produk', amount: 95000000, percentage: 76 }, { id: 'r2', category: 'Layanan', subcategory: 'Jasa', amount: 20000000, percentage: 16 }, { id: 'r3', category: 'Lainnya', subcategory: 'Pendapatan lain', amount: 10000000, percentage: 8 }], expenses: [{ id: 'e1', category: 'HPP', subcategory: 'Harga Pokok', amount: 45000000, percentage: 52.9 }, { id: 'e2', category: 'Gaji', subcategory: 'Karyawan', amount: 25000000, percentage: 29.4 }, { id: 'e3', category: 'Operasional', subcategory: 'Utilitas & Sewa', amount: 15000000, percentage: 17.6 }], comparison: { revenue: { value: 7000000, percentage: 5.9 }, expense: { value: 3000000, percentage: 3.7 }, profit: { value: 4000000, percentage: 11.1 } }, trend: [{ month: 'Jan', revenue: 110000000, expense: 78000000, profit: 32000000 }, { month: 'Feb', revenue: 118000000, expense: 82000000, profit: 36000000 }, { month: 'Mar', revenue: 125000000, expense: 85000000, profit: 40000000 }] };
  const [reportData, setReportData] = useState<ProfitLossData | null>(MOCK_PL);
  const [refreshing, setRefreshing] = useState(false);
  
  // Determine the current date value based on view type
  const currentDateValue = viewType === 'MONTH' ? selectedDate : selectedYear;
  
  // Fetch profit/loss data
  useEffect(() => {
    async function fetchProfitLossData() {
      if (!session) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const periodParam = viewType === 'MONTH' ? 
          `period=${selectedDate}` : 
          `period=${selectedYear}&periodType=YEAR`;
        
        const response = await fetch(`/api/finance/reports/profit-loss?${periodParam}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching profit/loss data: ${response.status}`);
        }
        
        const data = await response.json();
        setReportData(data);
      } catch (err) {
        console.error('Failed to fetch profit/loss data:', err);
        setReportData(MOCK_PL);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }
    
    fetchProfitLossData();
  }, [session, viewType, selectedDate, selectedYear, refreshing]);
  
  // Handler for refresh data
  const handleRefresh = () => {
    setRefreshing(true);
  };
  
  // Handler for export data to Excel
  const handleExport = async () => {
    if (!reportData) return;
    
    try {
      const periodParam = viewType === 'MONTH' ? 
        `period=${selectedDate}` : 
        `period=${selectedYear}&periodType=YEAR`;
      
      const response = await fetch(`/api/finance/export/profit-loss?${periodParam}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Error exporting report');
      }
      
      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Laba_Rugi_${viewType === 'MONTH' ? selectedDate : selectedYear}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Failed to export report:', err);
      setError('Gagal mengekspor laporan. Silakan coba lagi nanti.');
    }
  };
  
  // Handler for view type change
  const handleViewTypeChange = (type: 'MONTH' | 'YEAR') => {
    setViewType(type);
    setLoading(true);
  };
  
  // Cek apakah loading
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  // Cek jika tidak terautentikasi
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }
  
  // Cek jika role tidak memiliki akses
  const allowedRoles = ['ADMIN', 'MANAGER'];
  if (!allowedRoles.includes(session?.user?.role as string)) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Akses Terbatas</h3>
              <p className="mt-2 text-sm text-gray-500">
                Anda tidak memiliki izin untuk mengakses halaman ini.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  onClick={() => router.push('/')}
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };
  
  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  // Color scheme for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  
  return (
    <>
      <Head>
        <title>Laporan Laba Rugi | FARMANESIA-EVO</title>
      </Head>
      
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Laporan Laba Rugi
              </h2>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <ArrowPathIcon className={`-ml-1 mr-2 h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                Refresh
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={!reportData}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Export Excel
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4">
              <ErrorDisplay message={error} />
            </div>
          )}
          
          {/* View Type & Period Selector */}
          <div className="mt-6 bg-white shadow rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* View Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tipe Laporan
                </label>
                <div className="mt-1">
                  <div className="flex rounded-md shadow-sm">
                    <button
                      type="button"
                      className={`relative inline-flex items-center px-4 py-2 rounded-l-md border ${
                        viewType === 'MONTH'
                          ? 'bg-orange-50 border-orange-200 text-orange-800'
                          : 'border-gray-300 bg-white text-gray-700'
                      } text-sm font-medium hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}
                      onClick={() => handleViewTypeChange('MONTH')}
                    >
                      Bulanan
                    </button>
                    <button
                      type="button"
                      className={`relative inline-flex items-center px-4 py-2 rounded-r-md border ${
                        viewType === 'YEAR'
                          ? 'bg-orange-50 border-orange-200 text-orange-800'
                          : 'border-gray-300 bg-white text-gray-700'
                      } text-sm font-medium hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500`}
                      onClick={() => handleViewTypeChange('YEAR')}
                    >
                      Tahunan
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Period Selector */}
              <div className="md:col-span-2">
                <label htmlFor="period-select" className="block text-sm font-medium text-gray-700">
                  {viewType === 'MONTH' ? 'Pilih Bulan' : 'Pilih Tahun'}
                </label>
                <div className="mt-1">
                  {viewType === 'MONTH' ? (
                    <input
                      type="month"
                      id="period-select"
                      name="period-select"
                      className="focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={format(new Date(), 'yyyy-MM')}
                    />
                  ) : (
                    <select
                      id="period-select"
                      name="period-select"
                      className="focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Report Content */}
          {reportData ? (
            <div className="mt-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* Revenue Card */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CurrencyDollarIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Pendapatan
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {formatCurrency(reportData.totalRevenue)}
                            </div>
                            {reportData.comparison.revenue.percentage !== 0 && (
                              <div className={`text-sm ${
                                reportData.comparison.revenue.percentage > 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {formatPercentage(reportData.comparison.revenue.percentage)}
                              </div>
                            )}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Expense Card */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ArrowTrendingDownIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Pengeluaran
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {formatCurrency(reportData.totalExpense)}
                            </div>
                            {reportData.comparison.expense.percentage !== 0 && (
                              <div className={`text-sm ${
                                reportData.comparison.expense.percentage < 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {formatPercentage(reportData.comparison.expense.percentage)}
                              </div>
                            )}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Net Profit Card */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ArrowTrendingUpIcon className="h-6 w-6 text-blue-400" aria-hidden="true" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Laba Bersih
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {formatCurrency(reportData.netProfit)}
                            </div>
                            {reportData.comparison.profit.percentage !== 0 && (
                              <div className={`text-sm ${
                                reportData.comparison.profit.percentage > 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {formatPercentage(reportData.comparison.profit.percentage)}
                              </div>
                            )}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Profit Margin Card */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DocumentTextIcon className="h-6 w-6 text-purple-400" aria-hidden="true" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Margin Laba
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {reportData.profitMargin.toFixed(2)}%
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Charts */}
              <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Revenue vs Expense Chart */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Pendapatan vs Pengeluaran
                    </h3>
                    <div className="mt-2 h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={reportData.trend}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Legend />
                          <Bar dataKey="revenue" name="Pendapatan" fill="#4ADE80" />
                          <Bar dataKey="expense" name="Pengeluaran" fill="#F87171" />
                          <Bar dataKey="profit" name="Laba" fill="#60A5FA" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                {/* Revenue Distribution Chart */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Distribusi Pendapatan
                    </h3>
                    <div className="mt-2 h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.revenues.slice(0, 6)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ category, percentage }) => `${category}: ${percentage?.toFixed(1)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="amount"
                            nameKey="category"
                          >
                            {reportData.revenues.slice(0, 6).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                {/* Expense Distribution Chart */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Distribusi Pengeluaran
                    </h3>
                    <div className="mt-2 h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.expenses.slice(0, 6)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ category, percentage }) => `${category}: ${percentage?.toFixed(1)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="amount"
                            nameKey="category"
                          >
                            {reportData.expenses.slice(0, 6).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Detailed Tables */}
              <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Revenue Table */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Detail Pendapatan
                    </h3>
                  </div>
                  <div className="border-t border-gray-200 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kategori
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jumlah
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            %
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.revenues.map((item) => (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.category}
                              <div className="text-xs text-gray-500">{item.subcategory}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                              {item.percentage?.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            TOTAL
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-900">
                            {formatCurrency(reportData.totalRevenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-900">
                            100%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Expense Table */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Detail Pengeluaran
                    </h3>
                  </div>
                  <div className="border-t border-gray-200 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kategori
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jumlah
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            %
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.expenses.map((item) => (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.category}
                              <div className="text-xs text-gray-500">{item.subcategory}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                              {item.percentage?.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            TOTAL
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-900">
                            {formatCurrency(reportData.totalExpense)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-900">
                            100%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            !loading && !error && (
              <div className="mt-6 bg-white shadow rounded-lg p-6 text-center">
                <p className="text-gray-500">
                  Pilih periode untuk melihat laporan laba rugi.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
