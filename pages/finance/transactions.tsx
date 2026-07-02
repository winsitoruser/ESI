import React, { useState, useEffect } from 'react';
import { 
  FaSearch, FaFilter, FaDownload, FaCalendarAlt, 
  FaArrowUp, FaArrowDown, FaFileExport, FaFilePdf, 
  FaFileExcel, FaFileCsv, FaMoneyBillWave, FaReceipt
} from 'react-icons/fa';
import FinanceLayout from '@/components/layouts/finance-layout';
import { useTranslation } from '@/lib/i18n';
import { formatRupiah } from '@/utils/exportUtils';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  source?: string;
  status?: string;
}

const TransactionsPage = () => {
  const { t } = useTranslation();
  const MOCK_TXS: Transaction[] = [
    { id: 'tx1', date: '15/03/2026', type: 'income', category: 'Penjualan', description: 'Penjualan harian', amount: 4500000, paymentMethod: 'Cash', source: 'pos', status: 'completed' },
    { id: 'tx2', date: '15/03/2026', type: 'expense', category: 'Pembelian', description: 'Bahan baku', amount: 2800000, paymentMethod: 'Transfer', source: 'manual', status: 'completed' },
    { id: 'tx3', date: '14/03/2026', type: 'income', category: 'Penjualan', description: 'Penjualan harian', amount: 3900000, paymentMethod: 'QRIS', source: 'pos', status: 'completed' },
    { id: 'tx4', date: '14/03/2026', type: 'expense', category: 'Operasional', description: 'Listrik & Air', amount: 1200000, paymentMethod: 'Transfer', source: 'manual', status: 'completed' },
  ];
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TXS);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  // Fetch transactions from API
  useEffect(() => {
    fetchTransactions();
  }, [filterType, startDate, endDate]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('type', filterType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/finance/transactions-simple?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const formattedTransactions = data.data.map((tx: any) => ({
          id: tx.id,
          date: new Date(tx.date || tx.transaction_date).toLocaleDateString('id-ID'),
          type: tx.type,
          category: tx.category,
          description: tx.description,
          amount: parseFloat(tx.amount),
          paymentMethod: tx.payment_method || tx.paymentMethod,
          source: tx.source || 'manual',
          status: tx.status
        }));
        
        setTransactions(formattedTransactions);
        setFilteredTransactions(formattedTransactions);

        // Calculate totals
        const income = formattedTransactions
          .filter((tx: Transaction) => tx.type === 'income')
          .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
        const expense = formattedTransactions
          .filter((tx: Transaction) => tx.type === 'expense')
          .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);

        setTotalIncome(income);
        setTotalExpense(expense);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions(MOCK_TXS);
      setFilteredTransactions(MOCK_TXS);
      const inc = MOCK_TXS.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
      const exp = MOCK_TXS.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
      setTotalIncome(inc);
      setTotalExpense(exp);
    } finally {
      setLoading(false);
    }
  };

  // Search filter
  useEffect(() => {
    if (searchTerm) {
      const filtered = transactions.filter(tx =>
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTransactions(filtered);
    } else {
      setFilteredTransactions(transactions);
    }
  }, [searchTerm, transactions]);

  const exportData = (format: 'excel' | 'pdf' | 'csv') => {
    console.log(`Exporting as ${format}...`);
    // TODO: Implement export functionality
  };

  return (
    <FinanceLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Transaksi Keuangan
            </h1>
            <p className="text-gray-600 mt-1">Kelola dan pantau semua transaksi keuangan</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportData('excel')}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              <FaFileExcel /> Excel
            </button>
            <button
              onClick={() => exportData('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              <FaFilePdf /> PDF
            </button>
            <button
              onClick={() => exportData('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <FaFileCsv /> CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow-md border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 text-sm font-medium">Total Pemasukan</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{formatRupiah(totalIncome)}</p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <FaArrowUp className="text-green-700 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg shadow-md border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-700 text-sm font-medium">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-red-900 mt-1">{formatRupiah(totalExpense)}</p>
              </div>
              <div className="bg-red-200 p-3 rounded-full">
                <FaArrowDown className="text-red-700 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-lg shadow-md border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-700 text-sm font-medium">Saldo Bersih</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {formatRupiah(totalIncome - totalExpense)}
                </p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <FaMoneyBillWave className="text-orange-700 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">Semua Tipe</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </select>

            {/* Start Date */}
            <div className="relative">
              <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* End Date */}
            <div className="relative">
              <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-orange-50 to-red-50/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Deskripsi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Metode
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Jumlah
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
                        <p className="text-gray-500">Memuat data transaksi...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FaReceipt className="text-gray-300 text-5xl mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum Ada Transaksi</h3>
                        <p className="text-gray-500">Belum ada transaksi yang tercatat untuk periode ini.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {transaction.type === 'income' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <FaArrowUp className="mr-1" /> Pemasukan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <FaArrowDown className="mr-1" /> Pengeluaran
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.category}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate">{transaction.description}</div>
                        {transaction.source && transaction.source !== 'manual' && (
                          <span className="text-xs text-gray-500 italic">({transaction.source})</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.paymentMethod || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                        <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.type === 'income' ? '+' : '-'} {formatRupiah(transaction.amount)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredTransactions.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Menampilkan <span className="font-medium">{filteredTransactions.length}</span> transaksi
              </div>
              <div className="text-sm text-gray-500">
                Total: {formatRupiah(totalIncome - totalExpense)}
              </div>
            </div>
          )}
        </div>
      </div>
    </FinanceLayout>
  );
};

export default TransactionsPage;
