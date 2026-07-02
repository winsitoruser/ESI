import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n';
import {
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

export default function NewExpensePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  
  const [expenseData, setExpenseData] = useState({
    date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
    categoryId: '',
    amount: '',
    paymentMethod: 'CASH',
    notes: '',
  });
  
  const [receipt, setReceipt] = useState<File | null>(null);
  
  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      if (!session) return;
      
      try {
        setLoading(true);
        
        // Use the expenses endpoint to get categories
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        const endDate = new Date();
        
        const response = await fetch(
          `/api/finance/expenses?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`
        );
        
        if (!response.ok) {
          throw new Error(`Error fetching categories: ${response.status}`);
        }
        
        const data = await response.json();
        setCategories(data.categories);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setError('Gagal memuat kategori pengeluaran. Silakan coba lagi nanti.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchCategories();
  }, [session]);
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setExpenseData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setReceipt(e.target.files[0]);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseData.description || !expenseData.categoryId || !expenseData.amount) {
      setError('Harap isi semua field yang wajib diisi.');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Submit expense data
      const response = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });
      
      if (!response.ok) {
        throw new Error(`Error creating expense: ${response.status}`);
      }
      
      const expenseResult = await response.json();
      
      // Upload receipt if exists
      if (receipt && expenseResult.id) {
        const formData = new FormData();
        formData.append('receipt', receipt);
        
        const uploadResponse = await fetch(`/api/finance/expenses/${expenseResult.id}/receipt`, {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          console.error('Failed to upload receipt, but expense was created');
        }
      }
      
      // Redirect to expenses list
      router.push('/finance/expenses');
    } catch (err) {
      console.error('Failed to create expense:', err);
      setError('Gagal menyimpan data pengeluaran. Silakan coba lagi nanti.');
      setSubmitting(false);
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
  
  return (
    <>
      <Head>
        <title>Tambah Pengeluaran Baru | FARMANESIA-EVO</title>
      </Head>
      
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Tambah Pengeluaran Baru
              </h2>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Kembali
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4">
              <ErrorDisplay message={error} />
            </div>
          )}
          
          {/* Form */}
          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  {/* Date */}
                  <div className="sm:col-span-3">
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                      Tanggal <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                      <input
                        type="date"
                        name="date"
                        id="date"
                        required
                        className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        value={expenseData.date}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  {/* Reference */}
                  <div className="sm:col-span-3">
                    <label htmlFor="reference" className="block text-sm font-medium text-gray-700">
                      Nomor Referensi
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="reference"
                        id="reference"
                        placeholder="Opsional - Nomor kwitansi/invoice"
                        className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        value={expenseData.reference}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div className="sm:col-span-6">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Deskripsi <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="description"
                        id="description"
                        required
                        placeholder="Deskripsi pengeluaran"
                        className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        value={expenseData.description}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  {/* Category */}
                  <div className="sm:col-span-3">
                    <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                      Kategori <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                      <select
                        id="categoryId"
                        name="categoryId"
                        required
                        className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        value={expenseData.categoryId}
                        onChange={handleInputChange}
                      >
                        <option value="">-- Pilih Kategori --</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Amount */}
                  <div className="sm:col-span-3">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                      Jumlah (Rp) <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">Rp</span>
                      </div>
                      <input
                        type="number"
                        name="amount"
                        id="amount"
                        required
                        min="0"
                        placeholder="0"
                        className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-12 sm:text-sm border-gray-300 rounded-md"
                        value={expenseData.amount}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  {/* Payment Method */}
                  <div className="sm:col-span-3">
                    <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">
                      Metode Pembayaran
                    </label>
                    <div className="mt-1">
                      <select
                        id="paymentMethod"
                        name="paymentMethod"
                        className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        value={expenseData.paymentMethod}
                        onChange={handleInputChange}
                      >
                        <option value="CASH">Tunai</option>
                        <option value="TRANSFER">Transfer Bank</option>
                        <option value="CARD">Kartu Debit/Kredit</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Receipt Upload */}
                  <div className="sm:col-span-3">
                    <label htmlFor="receipt" className="block text-sm font-medium text-gray-700">
                      Bukti Pembayaran
                    </label>
                    <div className="mt-1 flex items-center">
                      <input
                        id="receipt"
                        name="receipt"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,application/pdf"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                      <label
                        htmlFor="receipt"
                        className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      >
                        <PaperClipIcon className="-ml-1 mr-2 h-5 w-5 inline-block" aria-hidden="true" />
                        {receipt ? 'Ganti File' : 'Upload File'}
                      </label>
                      {receipt && (
                        <span className="ml-3 text-sm text-gray-500">
                          {receipt.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">Foto kwitansi atau bukti pembayaran (PNG, JPG, PDF)</p>
                  </div>
                  
                  {/* Notes */}
                  <div className="sm:col-span-6">
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Catatan Tambahan
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="notes"
                        name="notes"
                        rows={3}
                        className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Catatan tambahan tentang pengeluaran ini"
                        value={expenseData.notes}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="mr-3 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-300 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
