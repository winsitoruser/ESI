import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { 
  FaFileInvoiceDollar, FaCalendarAlt, FaExclamationTriangle, 
  FaCheckCircle, FaClock, FaSearch, FaFilter, FaPlus,
  FaMoneyBillWave, FaUser, FaPhone, FaEnvelope
} from 'react-icons/fa';
import Link from 'next/link';

interface AccountReceivable {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  daysPastDue: number;
}

const PiutangPage: React.FC = () => {
  const { t } = useTranslation();
  const MOCK_PIUTANG: AccountReceivable[] = [
    { id: 'p1', customerId: 'c1', customerName: 'Toko Sejahtera', customerPhone: '021-5551111', invoiceNumber: 'INV-2026-045', invoiceDate: '2026-03-01', dueDate: '2026-03-31', totalAmount: 12000000, paidAmount: 4000000, remainingAmount: 8000000, status: 'partial', daysPastDue: 0 },
    { id: 'p2', customerId: 'c2', customerName: 'PT Maju Bersama', customerPhone: '021-5552222', invoiceNumber: 'INV-2026-038', invoiceDate: '2026-02-10', dueDate: '2026-03-10', totalAmount: 6500000, paidAmount: 0, remainingAmount: 6500000, status: 'overdue', daysPastDue: 5 },
    { id: 'p3', customerId: 'c3', customerName: 'CV Abadi Jaya', customerPhone: '021-5553333', invoiceNumber: 'INV-2026-050', invoiceDate: '2026-03-10', dueDate: '2026-04-10', totalAmount: 9800000, paidAmount: 0, remainingAmount: 9800000, status: 'unpaid', daysPastDue: 0 },
  ];
  const [piutangList, setPiutangList] = useState<AccountReceivable[]>(MOCK_PIUTANG);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPiutang, setSelectedPiutang] = useState<AccountReceivable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    fetchPiutangData();
  }, [statusFilter, searchQuery]);

  const fetchPiutangData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/finance/receivables?status=${statusFilter}&search=${searchQuery}`);
      const data = await response.json();
      
      if (data.success) {
        setPiutangList(data.data);
        console.log('Piutang data loaded from backend:', data.data.length, 'items');
      } else {
        console.error('Failed to fetch receivables:', data.error);
        setPiutangList([]);
      }
    } catch (error) {
      console.error('Error fetching piutang data:', error);
      setPiutangList(MOCK_PIUTANG);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      unpaid: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      unpaid: 'Belum Dibayar',
      partial: 'Dibayar Sebagian',
      paid: 'Lunas',
      overdue: 'Terlambat'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const filteredPiutang = piutangList.filter(item => {
    const matchesSearch = item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPiutang = piutangList.reduce((sum, item) => sum + item.remainingAmount, 0);
  const overdueCount = piutangList.filter(item => item.status === 'overdue').length;
  const unpaidCount = piutangList.filter(item => item.status === 'unpaid').length;

  const handlePayment = async () => {
    if (!selectedPiutang || !paymentAmount) return;
    
    try {
      const response = await fetch('/api/finance/receivables/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receivableId: selectedPiutang.id,
          amount: parseFloat(paymentAmount),
          paymentDate: new Date().toISOString(),
          paymentMethod: 'transfer',
          receivedBy: 'Admin',
          notes: `Pembayaran untuk ${selectedPiutang.invoiceNumber}`
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Pembayaran ${formatCurrency(Number(paymentAmount))} untuk ${selectedPiutang.invoiceNumber} berhasil dicatat!`);
        setShowPaymentModal(false);
        setPaymentAmount('');
        fetchPiutangData();
      } else {
        alert(`Gagal mencatat pembayaran: ${data.error}`);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Terjadi kesalahan saat mencatat pembayaran');
    }
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Piutang Pelanggan | BEDAGANG</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <FaFileInvoiceDollar className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Piutang Pelanggan</h1>
                <p className="text-blue-100 mt-1">Kelola tagihan dan pembayaran pelanggan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Piutang</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalPiutang)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaMoneyBillWave className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Belum Dibayar</p>
                <p className="text-2xl font-bold text-gray-800">{unpaidCount} Invoice</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FaClock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Terlambat</p>
                <p className="text-2xl font-bold text-red-600">{overdueCount} Invoice</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <FaExclamationTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari pelanggan atau nomor invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Semua Status</option>
                <option value="unpaid">Belum Dibayar</option>
                <option value="partial">Dibayar Sebagian</option>
                <option value="overdue">Terlambat</option>
                <option value="paid">Lunas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Piutang List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pelanggan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jatuh Tempo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sisa
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Memuat data...
                    </td>
                  </tr>
                ) : filteredPiutang.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Tidak ada data piutang
                    </td>
                  </tr>
                ) : (
                  filteredPiutang.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.invoiceNumber}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.customerName}</div>
                        <div className="text-sm text-gray-500">{item.customerPhone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.invoiceDate).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(item.dueDate).toLocaleDateString('id-ID')}
                        </div>
                        {item.daysPastDue > 0 && (
                          <div className="text-xs text-red-600">
                            Terlambat {item.daysPastDue} hari
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {formatCurrency(item.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-blue-600">
                        {formatCurrency(item.remainingAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        {item.status !== 'paid' && (
                          <button
                            onClick={() => {
                              setSelectedPiutang(item);
                              setShowPaymentModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Catat Pembayaran
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPiutang && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Catat Pembayaran</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice
                </label>
                <p className="text-gray-900 font-semibold">{selectedPiutang.invoiceNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pelanggan
                </label>
                <p className="text-gray-900">{selectedPiutang.customerName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sisa Tagihan
                </label>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(selectedPiutang.remainingAmount)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jumlah Pembayaran
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Masukkan jumlah pembayaran"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentAmount('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handlePayment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Simpan Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PiutangPage;
