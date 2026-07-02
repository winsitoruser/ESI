import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n';
import { format, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';

// Interface untuk data laporan bulanan
interface DailyRevenue {
  date: string;
  amount: number;
  count: number;
}

interface CategoryRevenue {
  category: string;
  amount: number;
  percentage: number;
}

interface MonthlyReportData {
  month: string;
  year: number;
  totalRevenue: number;
  totalTransactions: number;
  averageDaily: number;
  dailyRevenue: DailyRevenue[];
  categoryRevenue: CategoryRevenue[];
  paymentMethods: {
    method: string;
    amount: number;
    percentage: number;
  }[];
  comparison: {
    previousMonth: number;
    previousMonthLabel: string;
    changePercentage: number;
    trend: 'up' | 'down' | 'same';
  };
}

export default function MonthlyIncomeReport() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const MOCK_MONTHLY: MonthlyReportData = { month: 'Maret', year: 2026, totalRevenue: 125000000, totalTransactions: 1842, averageDaily: 4166667, dailyRevenue: [{ date: '2026-03-01', amount: 4500000, count: 62 }, { date: '2026-03-02', amount: 3800000, count: 48 }, { date: '2026-03-03', amount: 5200000, count: 71 }], categoryRevenue: [{ category: 'Penjualan', amount: 95000000, percentage: 76 }, { category: 'Layanan', amount: 20000000, percentage: 16 }, { category: 'Lainnya', amount: 10000000, percentage: 8 }], paymentMethods: [{ method: 'Cash', amount: 55000000, percentage: 44 }, { method: 'QRIS', amount: 38000000, percentage: 30.4 }, { method: 'Transfer', amount: 32000000, percentage: 25.6 }], comparison: { previousMonth: 118000000, previousMonthLabel: 'Februari 2026', changePercentage: 5.9, trend: 'up' } };
  const [reportData, setReportData] = useState<MonthlyReportData | null>(MOCK_MONTHLY);
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch monthly report data
  useEffect(() => {
    async function fetchMonthlyReportData() {
      if (!session) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/finance/reports/monthly-income?month=${selectedMonth}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching monthly report data: ${response.status}`);
        }
        
        const data = await response.json();
        setReportData(data);
      } catch (err) {
        console.error('Failed to fetch monthly report data:', err);
        setReportData(MOCK_MONTHLY);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }
    
    fetchMonthlyReportData();
  }, [session, selectedMonth, refreshing]);
  
  // Handler untuk refresh data
  const handleRefresh = () => {
    setRefreshing(true);
  };
  
  // Handler untuk export data ke Excel
  const handleExport = async () => {
    if (!reportData) return;
    
    try {
      const response = await fetch(`/api/finance/export/monthly-income?month=${selectedMonth}`, {
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
      a.download = `Laporan-Bulanan-${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Failed to export report:', err);
      setError('Gagal mengekspor laporan. Silakan coba lagi nanti.');
    }
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
  
  return (
    <>
      <Head>
        <title>Laporan Bulanan | FARMANESIA-EVO</title>
      </Head>
      
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Laporan Keuangan Bulanan
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
          
          {/* Month Selector */}
          <div className="mt-6 bg-white shadow rounded-lg p-4">
            <label htmlFor="month-select" className="block text-sm font-medium text-gray-700">
              Pilih Bulan
            </label>
            <div className="mt-1 flex">
              <div className="relative flex items-center w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CalendarIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="month"
                  id="month-select"
                  name="month-select"
                  className="pl-10 focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  max={format(new Date(), 'yyyy-MM')}
                />
              </div>
            </div>
          </div>
          
          {/* Report Content */}
          {reportData ? (
            <div className="mt-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CurrencyDollarIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
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
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DocumentTextIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Transaksi
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {reportData.totalTransactions} transaksi
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ChartBarIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Rata-rata Harian
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {formatCurrency(reportData.averageDaily)}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ArrowTrendingUpIcon className={`h-6 w-6 ${
                          reportData.comparison.trend === 'up' ? 'text-green-400' : 
                          reportData.comparison.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                        }`} aria-hidden="true" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Perbandingan dengan {reportData.comparison.previousMonthLabel}
                          </dt>
                          <dd>
                            <div className={`text-lg font-medium ${
                              reportData.comparison.trend === 'up' ? 'text-green-600' : 
                              reportData.comparison.trend === 'down' ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {reportData.comparison.trend === 'up' ? '+' : ''}
                              {reportData.comparison.changePercentage}%
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
                {/* Daily Revenue Chart */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Pendapatan Harian
                    </h3>
                    <div className="mt-2 h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={reportData.dailyRevenue}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Area type="monotone" dataKey="amount" name="Pendapatan" stroke="#ff7300" fill="#ff7300" fillOpacity={0.3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                {/* Category Revenue Chart */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Pendapatan per Kategori
                    </h3>
                    <div className="mt-2 h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={reportData.categoryRevenue}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="category" type="category" />
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Bar dataKey="amount" name="Pendapatan" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                {/* Payment Methods Chart */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Metode Pembayaran
                    </h3>
                    <div className="mt-2 h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={reportData.paymentMethods}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="method" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Bar dataKey="amount" name="Pendapatan" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                {/* Transaction Count Chart */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Jumlah Transaksi Harian
                    </h3>
                    <div className="mt-2 h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={reportData.dailyRevenue}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="count" name="Jumlah Transaksi" stroke="#8884d8" activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            !loading && !error && (
              <div className="mt-6 bg-white shadow rounded-lg p-6 text-center">
                <p className="text-gray-500">
                  Pilih bulan untuk melihat laporan bulanan.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
