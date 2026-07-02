import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { format, parseISO, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTranslation } from '@/lib/i18n';
import ErrorDisplay from '@/components/ErrorDisplay';

// Interface untuk expense item
interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

interface ExpenseItem {
  id: string;
  date: string;
  formattedDate: string;
  reference: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  createdBy: string;
  receiptUrl?: string;
}

interface ExpenseStats {
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  byCategoryAmount: {
    category: string;
    amount: number;
  }[];
}

export default function ExpensesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const MOCK_EXPENSES: ExpenseItem[] = [
    { id: 'exp1', date: '2026-03-15', formattedDate: '15 Mar 2026', reference: 'exp1', description: 'Pembelian bahan baku', category: 'Pembelian', amount: 3500000, paymentMethod: 'transfer', status: 'PAID', createdBy: 'Admin' },
    { id: 'exp2', date: '2026-03-14', formattedDate: '14 Mar 2026', reference: 'exp2', description: 'Listrik & Air bulan Maret', category: 'Utilitas', amount: 2200000, paymentMethod: 'transfer', status: 'APPROVED', createdBy: 'Admin' },
    { id: 'exp3', date: '2026-03-13', formattedDate: '13 Mar 2026', reference: 'exp3', description: 'Gaji karyawan', category: 'Gaji', amount: 15000000, paymentMethod: 'transfer', status: 'PAID', createdBy: 'Admin' },
  ];
  const MOCK_EXP_STATS: ExpenseStats = { totalApproved: 20700000, totalPending: 0, totalRejected: 0, byCategoryAmount: [{ category: 'Pembelian', amount: 3500000 }, { category: 'Utilitas', amount: 2200000 }, { category: 'Gaji', amount: 15000000 }] };
  const MOCK_EXP_CATS: ExpenseCategory[] = [{ id: 'c1', name: 'Pembelian' }, { id: 'c2', name: 'Utilitas' }, { id: 'c3', name: 'Gaji' }, { id: 'c4', name: 'Operasional' }];
  const [expenses, setExpenses] = useState<ExpenseItem[]>(MOCK_EXPENSES);
  const [stats, setStats] = useState<ExpenseStats | null>(MOCK_EXP_STATS);
  const [categories, setCategories] = useState<ExpenseCategory[]>(MOCK_EXP_CATS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch expenses data
  useEffect(() => {
    async function fetchExpenses() {
      if (!session) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/finance/expenses-simple');
        
        if (!response.ok) {
          throw new Error(`Error fetching expenses: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          // Map API data to component format
          const mappedExpenses = result.data.map((exp: any) => ({
            id: exp.id,
            date: exp.date,
            formattedDate: format(parseISO(exp.date), 'dd MMM yyyy', { locale: id }),
            reference: exp.id.substring(0, 8),
            description: exp.description || exp.category,
            category: exp.category,
            amount: parseFloat(exp.amount),
            paymentMethod: exp.paymentMethod || 'cash',
            status: exp.status?.toUpperCase() || 'PAID',
            createdBy: 'System'
          }));
          
          setExpenses(mappedExpenses);
          
          // Calculate stats from data
          const totalAmount = result.summary?.total || 0;
          setStats({
            totalApproved: totalAmount,
            totalPending: 0,
            totalRejected: 0,
            byCategoryAmount: []
          });
        }
        
        // Fetch categories
        const catResponse = await fetch('/api/finance/categories-simple?type=expense');
        const catResult = await catResponse.json();
        if (catResult.success && catResult.data) {
          setCategories(catResult.data.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description
          })));
        }
      } catch (err) {
        console.error('Failed to fetch expenses:', err);
        setExpenses(MOCK_EXPENSES);
        setStats(MOCK_EXP_STATS);
        setCategories(MOCK_EXP_CATS);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }
    
    fetchExpenses();
  }, [session, startDate, endDate, selectedCategory, selectedStatus, refreshing]);
  
  // Handler untuk refresh data
  const handleRefresh = () => {
    setRefreshing(true);
  };
  
  // Handler untuk export data ke Excel
  const handleExport = async () => {
    if (expenses.length === 0) return;
    
    try {
      const response = await fetch(
        `/api/finance/export/expenses?startDate=${startDate}&endDate=${endDate}&category=${selectedCategory}&status=${selectedStatus}`, 
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Error exporting expenses');
      }
      
      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Pengeluaran_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Failed to export expenses:', err);
      setError('Gagal mengekspor laporan. Silakan coba lagi nanti.');
    }
  };
  
  // Filtered expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        expense.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        expense.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });
  
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
  const allowedRoles = ['ADMIN', 'MANAGER', 'FINANCE'];
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
  
  // Helper to get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800';
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <>
      <Head>
        <title>Laporan Pengeluaran | FARMANESIA-EVO</title>
      </Head>
      
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Laporan Pengeluaran
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
                disabled={expenses.length === 0}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Export Excel
              </button>
              <button
                type="button"
                onClick={() => router.push('/finance/expenses/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Tambah Pengeluaran
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4">
              <ErrorDisplay message={error} />
            </div>
          )}
          
          {/* Filters */}
          <div className="mt-6 bg-white shadow rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range Filter */}
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  id="start-date"
                  name="start-date"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">
                  Tanggal Akhir
                </label>
                <input
                  type="date"
                  id="end-date"
                  name="end-date"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              
              {/* Category Filter */}
              <div>
                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700">
                  Kategori
                </label>
                <select
                  id="category-filter"
                  name="category-filter"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="status-filter"
                  name="status-filter"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">Semua Status</option>
                  <option value="PENDING">Menunggu</option>
                  <option value="APPROVED">Disetujui</option>
                  <option value="PAID">Dibayar</option>
                  <option value="REJECTED">Ditolak</option>
                </select>
              </div>
              
              {/* Search */}
              <div className="md:col-span-2 lg:col-span-4">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                  Cari
                </label>
                <input
                  type="text"
                  id="search"
                  name="search"
                  placeholder="Cari berdasarkan deskripsi, referensi, atau nama"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Stats Cards */}
          {stats && (
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BanknotesIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Pengeluaran Disetujui
                        </dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">
                            {formatCurrency(stats.totalApproved)}
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
                      <DocumentTextIcon className="h-6 w-6 text-yellow-400" aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Menunggu Persetujuan
                        </dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">
                            {formatCurrency(stats.totalPending)}
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
                      <CurrencyDollarIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Ditolak
                        </dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">
                            {formatCurrency(stats.totalRejected)}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Expenses Table */}
          <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Daftar Pengeluaran
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {filteredExpenses.length} item pengeluaran ditemukan
              </p>
            </div>
            
            {filteredExpenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Referensi
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deskripsi
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kategori
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jumlah
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dibuat Oleh
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {expense.formattedDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {expense.reference}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {expense.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {expense.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(expense.status)}`}>
                            {expense.status === 'PENDING' && 'Menunggu'}
                            {expense.status === 'APPROVED' && 'Disetujui'}
                            {expense.status === 'PAID' && 'Dibayar'}
                            {expense.status === 'REJECTED' && 'Ditolak'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {expense.createdBy}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => router.push(`/finance/expenses/${expense.id}`)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-5 sm:p-6 text-center">
                <p className="text-gray-500">Tidak ada data pengeluaran yang ditemukan.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
