import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n';
import { format, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';

// Interface untuk data laporan pendapatan harian
interface PaymentMethod {
  method: string;
  amount: number;
  count: number;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  time: string;
  patientName: string;
  prescriptionId?: string;
  paymentMethod: string;
  amount: number;
}

interface DailyIncomeData {
  date: string;
  totalAmount: number;
  invoiceCount: number;
  paymentMethods: PaymentMethod[];
  invoices: InvoiceItem[];
  topItems?: { name: string; count: number; amount: number }[];
}

export default function DailyIncomeReport() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const MOCK_DAILY_INCOME: DailyIncomeData = { date: new Date().toISOString().split('T')[0], totalAmount: 8500000, invoiceCount: 42, paymentMethods: [{ method: 'Cash', amount: 4200000, count: 22 }, { method: 'QRIS', amount: 2800000, count: 14 }, { method: 'Transfer', amount: 1500000, count: 6 }], invoices: [{ id: 'di1', invoiceNumber: 'INV-20260315-001', time: '09:15', patientName: 'Budi S.', paymentMethod: 'Cash', amount: 185000 }, { id: 'di2', invoiceNumber: 'INV-20260315-002', time: '09:45', patientName: 'Siti R.', paymentMethod: 'QRIS', amount: 250000 }], topItems: [{ name: 'Paracetamol 500mg', count: 28, amount: 560000 }, { name: 'Amoxicillin 500mg', count: 15, amount: 450000 }] };
  const [reportData, setReportData] = useState<DailyIncomeData | null>(MOCK_DAILY_INCOME);
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch daily income data
  useEffect(() => {
    async function fetchDailyIncomeData() {
      if (!session) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/finance/reports/daily-income?date=${selectedDate}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching daily income data: ${response.status}`);
        }
        
        const data = await response.json();
        setReportData(data);
      } catch (err) {
        console.error('Failed to fetch daily income data:', err);
        setReportData(MOCK_DAILY_INCOME);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }
    
    fetchDailyIncomeData();
  }, [session, selectedDate, refreshing]);
  
  // Handler untuk refresh data
  const handleRefresh = () => {
    setRefreshing(true);
  };
  
  // Handler untuk export data ke CSV/Excel
  const handleExport = async () => {
    if (!reportData) return;
    
    try {
      const response = await fetch(`/api/finance/export/daily-income?date=${selectedDate}`, {
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
      a.download = `Laporan-Pendapatan-${selectedDate}.xlsx`;
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
  const allowedRoles = ['ADMIN', 'CASHIER', 'MANAGER'];
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
        <title>Laporan Pendapatan Harian | FARMANESIA-EVO</title>
      </Head>
      
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Laporan Pendapatan Harian
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
                Export
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4">
              <ErrorDisplay message={error} />
            </div>
          )}
          
          {/* Date Selector */}
          <div className="mt-6 bg-white shadow rounded-lg p-4">
            <label htmlFor="date-select" className="block text-sm font-medium text-gray-700">
              Pilih Tanggal
            </label>
            <div className="mt-1 flex">
              <div className="relative flex items-center w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="date"
                  id="date-select"
                  name="date-select"
                  className="pl-10 focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>
          </div>
          
          {/* Report Summary */}
          {reportData ? (
            <div className="mt-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                              {formatCurrency(reportData.totalAmount)}
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
                            Jumlah Transaksi
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {reportData.invoiceCount} transaksi
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
                        <CurrencyDollarIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Rata-rata per Transaksi
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {reportData.invoiceCount > 0
                                ? formatCurrency(reportData.totalAmount / reportData.invoiceCount)
                                : formatCurrency(0)}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Payment Methods Breakdown */}
              <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Metode Pembayaran
                  </h3>
                </div>
                <div className="border-t border-gray-200">
                  <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Metode</dt>
                    <dt className="text-sm font-medium text-gray-500">Jumlah Transaksi</dt>
                    <dt className="text-sm font-medium text-gray-500">Total</dt>
                  </div>
                  {reportData.paymentMethods.map((method, index) => (
                    <div key={method.method} className={`px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <dd className="text-sm text-gray-900">
                        {method.method === 'CASH' && 'Tunai'}
                        {method.method === 'CARD' && 'Kartu Debit/Kredit'}
                        {method.method === 'TRANSFER' && 'Transfer Bank'}
                        {method.method === 'QRIS' && 'QRIS'}
                      </dd>
                      <dd className="text-sm text-gray-900 mt-1 sm:mt-0">{method.count} transaksi</dd>
                      <dd className="text-sm text-gray-900 mt-1 sm:mt-0">{formatCurrency(method.amount)}</dd>
                    </div>
                  ))}
                  <div className="bg-gray-100 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 font-medium">
                    <dd className="text-sm text-gray-900">Total</dd>
                    <dd className="text-sm text-gray-900 mt-1 sm:mt-0">{reportData.invoiceCount} transaksi</dd>
                    <dd className="text-sm text-gray-900 mt-1 sm:mt-0">{formatCurrency(reportData.totalAmount)}</dd>
                  </div>
                </div>
              </div>
              
              {/* Top Items */}
              {reportData.topItems && reportData.topItems.length > 0 && (
                <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Item Terlaris
                    </h3>
                  </div>
                  <div className="border-t border-gray-200">
                    <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Nama Item</dt>
                      <dt className="text-sm font-medium text-gray-500">Jumlah</dt>
                      <dt className="text-sm font-medium text-gray-500">Total</dt>
                    </div>
                    {reportData.topItems.map((item, index) => (
                      <div key={item.name} className={`px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <dd className="text-sm text-gray-900">{item.name}</dd>
                        <dd className="text-sm text-gray-900 mt-1 sm:mt-0">{item.count}</dd>
                        <dd className="text-sm text-gray-900 mt-1 sm:mt-0">{formatCurrency(item.amount)}</dd>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Transaction List */}
              <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Daftar Transaksi
                  </h3>
                </div>
                <div className="flex flex-col">
                  <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                      <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Waktu
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                No. Invoice
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Pasien
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Metode Pembayaran
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Jumlah
                              </th>
                              <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Lihat</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.invoices.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                  Tidak ada transaksi pada tanggal ini.
                                </td>
                              </tr>
                            ) : (
                              reportData.invoices.map((invoice) => (
                                <tr key={invoice.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {invoice.time}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {invoice.invoiceNumber}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                        <UserIcon className="h-4 w-4 text-gray-400" />
                                      </div>
                                      <div className="ml-3">
                                        <div className="text-sm font-medium text-gray-900">
                                          {invoice.patientName}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {invoice.paymentMethod === 'CASH' && 'Tunai'}
                                    {invoice.paymentMethod === 'CARD' && 'Kartu Debit/Kredit'}
                                    {invoice.paymentMethod === 'TRANSFER' && 'Transfer Bank'}
                                    {invoice.paymentMethod === 'QRIS' && 'QRIS'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatCurrency(invoice.amount)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      type="button"
                                      onClick={() => router.push(`/pos/cashier/invoice/${invoice.id}`)}
                                      className="text-orange-600 hover:text-orange-900"
                                    >
                                      Detail
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            !loading && !error && (
              <div className="mt-6 bg-white shadow rounded-lg p-6 text-center">
                <p className="text-gray-500">
                  Pilih tanggal untuk melihat laporan pendapatan harian.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
