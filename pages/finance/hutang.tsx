import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { 
  FaFileInvoiceDollar, FaCalendarAlt, FaExclamationTriangle, 
  FaCheckCircle, FaClock, FaSearch, FaFilter, FaPlus,
  FaMoneyBillWave, FaBuilding, FaPhone, FaEnvelope
} from 'react-icons/fa';
import Link from 'next/link';

interface AccountPayable {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  invoiceNumber: string;
  purchaseOrderNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  paymentTerms: string;
  daysPastDue: number;
}

const HutangPage: React.FC = () => {
  const { t } = useTranslation();
  const MOCK_HUTANG: AccountPayable[] = [
    { id: 'h1', supplierId: 's1', supplierName: 'PT Supplier Utama', supplierPhone: '021-5551234', invoiceNumber: 'INV-SUP-001', purchaseOrderNumber: 'PO-2026-001', invoiceDate: '2026-03-01', dueDate: '2026-03-31', totalAmount: 15000000, paidAmount: 5000000, remainingAmount: 10000000, status: 'partial', paymentTerms: 'Net 30', daysPastDue: 0 },
    { id: 'h2', supplierId: 's2', supplierName: 'CV Bahan Baku Jaya', supplierPhone: '021-5554567', invoiceNumber: 'INV-SUP-002', purchaseOrderNumber: 'PO-2026-002', invoiceDate: '2026-02-15', dueDate: '2026-03-15', totalAmount: 8500000, paidAmount: 0, remainingAmount: 8500000, status: 'unpaid', paymentTerms: 'Net 30', daysPastDue: 0 },
    { id: 'h3', supplierId: 's3', supplierName: 'PT Distribusi Nusantara', supplierPhone: '021-5557890', invoiceNumber: 'INV-SUP-003', purchaseOrderNumber: 'PO-2026-003', invoiceDate: '2026-01-20', dueDate: '2026-02-20', totalAmount: 5000000, paidAmount: 0, remainingAmount: 5000000, status: 'overdue', paymentTerms: 'Net 30', daysPastDue: 23 },
  ];
  const [hutangList, setHutangList] = useState<AccountPayable[]>(MOCK_HUTANG);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedHutang, setSelectedHutang] = useState<AccountPayable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    fetchHutangData();
  }, [statusFilter, searchQuery]);

  const fetchHutangData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/finance/payables?status=${statusFilter}&search=${searchQuery}`);
      const data = await response.json();
      
      if (data.success) {
        setHutangList(data.data);
        console.log('Hutang data loaded from backend:', data.data.length, 'items');
      } else {
        console.error('Failed to fetch payables:', data.error);
        setHutangList([]);
      }
    } catch (error) {
      console.error('Error fetching hutang data:', error);
      setHutangList(MOCK_HUTANG);
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

  const filteredHutang = hutangList.filter(item => {
    const matchesSearch = item.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalHutang = hutangList.reduce((sum, item) => sum + item.remainingAmount, 0);
  const overdueCount = hutangList.filter(item => item.status === 'overdue').length;
  const unpaidCount = hutangList.filter(item => item.status === 'unpaid').length;
  const dueThisWeek = hutangList.filter(item => {
    const dueDate = new Date(item.dueDate);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= weekFromNow && item.status !== 'paid';
  }).length;

  const handlePayment = async () => {
    if (!selectedHutang || !paymentAmount) return;
    
    try {
      const response = await fetch('/api/finance/payables/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payableId: selectedHutang.id,
          amount: parseFloat(paymentAmount),
          paymentDate: new Date().toISOString(),
          paymentMethod: 'transfer',
          paidBy: 'Admin',
          notes: `Pembayaran untuk ${selectedHutang.invoiceNumber}`
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Pembayaran ${formatCurrency(Number(paymentAmount))} untuk ${selectedHutang.invoiceNumber} berhasil dicatat!`);
        setShowPaymentModal(false);
        setPaymentAmount('');
        fetchHutangData();
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
        <title>Hutang Supplier | BEDAGANG</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <FaFileInvoiceDollar className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Hutang Supplier</h1>
                <p className="text-red-100 mt-1">Kelola hutang dan pembayaran ke supplier</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Hutang</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalHutang)}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <FaMoneyBillWave className="w-6 h-6 text-red-600" />
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
                <p className="text-sm text-gray-500 mb-1">Jatuh Tempo Minggu Ini</p>
                <p className="text-2xl font-bold text-orange-600">{dueThisWeek} Invoice</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FaCalendarAlt className="w-6 h-6 text-orange-600" />
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
                placeholder="Cari supplier atau nomor invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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

        {/* Hutang List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO Number
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
                ) : filteredHutang.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Tidak ada data hutang
                    </td>
                  </tr>
                ) : (
                  filteredHutang.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">{item.paymentTerms}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.supplierName}</div>
                        <div className="text-sm text-gray-500">{item.supplierPhone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.purchaseOrderNumber}
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-red-600">
                        {formatCurrency(item.remainingAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        {item.status !== 'paid' && (
                          <button
                            onClick={() => {
                              setSelectedHutang(item);
                              setShowPaymentModal(true);
                            }}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Bayar
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
      {showPaymentModal && selectedHutang && (
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
                <p className="text-gray-900 font-semibold">{selectedHutang.invoiceNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <p className="text-gray-900">{selectedHutang.supplierName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sisa Hutang
                </label>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(selectedHutang.remainingAmount)}
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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

export default HutangPage;
