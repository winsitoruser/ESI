import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FaFileInvoice, FaSearch, FaFilter, FaPlus, FaEye, FaPrint,
  FaCheckCircle, FaClock, FaTruck, FaTimesCircle, FaMoneyBillWave,
  FaCalendarAlt, FaBuilding, FaBox, FaChartLine, FaExclamationTriangle
} from 'react-icons/fa';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: {
    id: string;
    name: string;
    contact: string;
    address: string;
  };
  orderDate: string;
  expectedDelivery: string;
  actualDelivery?: string;
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'partial' | 'received' | 'cancelled';
  items: {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    receivedQty: number;
    unitCost: number;
    subtotal: number;
  }[];
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overdue';
  notes?: string;
  createdBy: string;
  approvedBy?: string;
}

const PurchaseOrdersPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, formatCurrency } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Mock data
  const purchaseOrders: PurchaseOrder[] = [
    {
      id: '1',
      poNumber: 'PO-2024-001',
      supplier: {
        id: 'SUP-001',
        name: 'PT Kopi Nusantara',
        contact: '021-12345678',
        address: 'Jl. Kopi No. 123, Jakarta'
      },
      orderDate: '2024-01-20',
      expectedDelivery: '2024-01-27',
      actualDelivery: '2024-01-26',
      status: 'received',
      items: [
        {
          productId: '1',
          productName: 'Kopi Arabica Premium 250g',
          sku: 'KOP-001',
          quantity: 100,
          receivedQty: 100,
          unitCost: 30000,
          subtotal: 3000000
        }
      ],
      totalAmount: 3000000,
      paidAmount: 3000000,
      dueDate: '2024-02-20',
      paymentStatus: 'paid',
      notes: 'Pengiriman tepat waktu',
      createdBy: 'Admin',
      approvedBy: 'Manager'
    },
    {
      id: '2',
      poNumber: 'PO-2024-002',
      supplier: {
        id: 'SUP-002',
        name: 'PT Susu Segar',
        contact: '021-87654321',
        address: 'Jl. Susu No. 456, Bogor'
      },
      orderDate: '2024-01-22',
      expectedDelivery: '2024-01-24',
      actualDelivery: '2024-01-24',
      status: 'partial',
      items: [
        {
          productId: '6',
          productName: 'Susu UHT 1L',
          sku: 'SUS-001',
          quantity: 200,
          receivedQty: 150,
          unitCost: 14000,
          subtotal: 2800000
        }
      ],
      totalAmount: 2800000,
      paidAmount: 1400000,
      dueDate: '2024-02-22',
      paymentStatus: 'partial',
      notes: 'Pengiriman sebagian, sisa 50 unit menyusul',
      createdBy: 'Admin'
    },
    {
      id: '3',
      poNumber: 'PO-2024-003',
      supplier: {
        id: 'SUP-003',
        name: 'PT Minyak Sejahtera',
        contact: '021-11223344',
        address: 'Jl. Minyak No. 789, Tangerang'
      },
      orderDate: '2024-01-23',
      expectedDelivery: '2024-01-30',
      status: 'ordered',
      items: [
        {
          productId: '4',
          productName: 'Minyak Goreng 2L',
          sku: 'MIN-001',
          quantity: 150,
          receivedQty: 0,
          unitCost: 28000,
          subtotal: 4200000
        }
      ],
      totalAmount: 4200000,
      paidAmount: 0,
      dueDate: '2024-02-23',
      paymentStatus: 'unpaid',
      notes: 'Menunggu pengiriman dari supplier',
      createdBy: 'Admin',
      approvedBy: 'Manager'
    },
    {
      id: '4',
      poNumber: 'PO-2024-004',
      supplier: {
        id: 'SUP-004',
        name: 'CV Roti Manis',
        contact: '021-99887766',
        address: 'Jl. Roti No. 321, Bekasi'
      },
      orderDate: '2024-01-24',
      expectedDelivery: '2024-01-25',
      status: 'pending',
      items: [
        {
          productId: '7',
          productName: 'Roti Tawar',
          sku: 'ROT-001',
          quantity: 100,
          receivedQty: 0,
          unitCost: 8000,
          subtotal: 800000
        }
      ],
      totalAmount: 800000,
      paidAmount: 0,
      dueDate: '2024-02-24',
      paymentStatus: 'unpaid',
      notes: 'Menunggu approval',
      createdBy: 'Admin'
    },
    {
      id: '5',
      poNumber: 'PO-2024-005',
      supplier: {
        id: 'SUP-005',
        name: 'PT Telur Segar',
        contact: '021-55443322',
        address: 'Jl. Telur No. 654, Depok'
      },
      orderDate: '2024-01-15',
      expectedDelivery: '2024-01-17',
      status: 'received',
      items: [
        {
          productId: '8',
          productName: 'Telur Ayam 1kg',
          sku: 'TEL-001',
          quantity: 80,
          receivedQty: 80,
          unitCost: 24000,
          subtotal: 1920000
        }
      ],
      totalAmount: 1920000,
      paidAmount: 0,
      dueDate: '2024-01-25',
      paymentStatus: 'overdue',
      notes: 'Pembayaran terlambat',
      createdBy: 'Admin',
      approvedBy: 'Manager'
    }
  ];


  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-700', label: 'Draf' },
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Menunggu Persetujuan' },
      approved: { color: 'bg-blue-100 text-blue-700', label: 'Disetujui' },
      ordered: { color: 'bg-indigo-100 text-indigo-700', label: 'Dipesan' },
      partial: { color: 'bg-orange-100 text-orange-700', label: 'Diterima Sebagian' },
      received: { color: 'bg-green-100 text-green-700', label: 'Diterima' },
      cancelled: { color: 'bg-red-100 text-red-700', label: 'Dibatalkan' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const statusConfig = {
      unpaid: { color: 'bg-red-100 text-red-700', label: 'Belum Dibayar' },
      partial: { color: 'bg-yellow-100 text-yellow-700', label: 'Sebagian' },
      paid: { color: 'bg-green-100 text-green-700', label: 'Lunas' },
      overdue: { color: 'bg-red-100 text-red-700 animate-pulse', label: 'Jatuh Tempo' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unpaid;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredOrders = purchaseOrders.filter(order => {
    const matchesSearch = order.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.supplier.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesPayment = filterPayment === 'all' || order.paymentStatus === filterPayment;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const stats = {
    total: purchaseOrders.length,
    pending: purchaseOrders.filter(o => o.status === 'pending').length,
    ordered: purchaseOrders.filter(o => o.status === 'ordered').length,
    received: purchaseOrders.filter(o => o.status === 'received').length,
    totalValue: purchaseOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    unpaidValue: purchaseOrders.reduce((sum, o) => sum + (o.totalAmount - o.paidAmount), 0),
    overdue: purchaseOrders.filter(o => o.paymentStatus === 'overdue').length
  };

  const handlePrintOrder = (order: PurchaseOrder) => {
    // Open print view
    router.push(`/inventory/purchase-orders/print/${order.id}`);
  };

  const handleViewDetail = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  return (
    <DashboardLayout>
      <Head>
        <title>{t('inventory.purchaseOrders.title')} | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <FaFileInvoice className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">{t('inventory.purchaseOrders.title')}</h1>
                    <p className="text-blue-100 text-sm">{t('inventory.purchaseOrders.subtitle')}</p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => router.push('/inventory')}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              >
                <FaPlus className="mr-2" />
                {t('inventory.purchaseOrders.createNew')}
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <p className="text-xs text-blue-100">{t('inventory.purchaseOrders.totalPO')}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-yellow-500/30 backdrop-blur-sm rounded-lg p-3 border border-yellow-400/30">
                <p className="text-xs text-yellow-100">{t('inventory.purchaseOrders.pending')}</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <div className="bg-indigo-500/30 backdrop-blur-sm rounded-lg p-3 border border-indigo-400/30">
                <p className="text-xs text-indigo-100">{t('inventory.purchaseOrders.ordered')}</p>
                <p className="text-2xl font-bold">{stats.ordered}</p>
              </div>
              <div className="bg-green-500/30 backdrop-blur-sm rounded-lg p-3 border border-green-400/30">
                <p className="text-xs text-green-100">{t('inventory.purchaseOrders.received')}</p>
                <p className="text-2xl font-bold">{stats.received}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <p className="text-xs text-blue-100">{t('inventory.purchaseOrders.totalValue')}</p>
                <p className="text-lg font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
              <div className="bg-orange-500/30 backdrop-blur-sm rounded-lg p-3 border border-orange-400/30">
                <p className="text-xs text-orange-100">{t('inventory.purchaseOrders.unpaid')}</p>
                <p className="text-lg font-bold">{formatCurrency(stats.unpaidValue)}</p>
              </div>
              <div className="bg-red-500/30 backdrop-blur-sm rounded-lg p-3 border border-red-400/30">
                <p className="text-xs text-red-100">{t('inventory.purchaseOrders.overdue')}</p>
                <p className="text-2xl font-bold">{stats.overdue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder={t('inventory.purchaseOrders.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('inventory.purchaseOrders.allStatus')}</option>
                  <option value="pending">{t('inventory.purchaseOrders.pending')}</option>
                  <option value="approved">{t('inventory.purchaseOrders.approved')}</option>
                  <option value="ordered">{t('inventory.purchaseOrders.ordered')}</option>
                  <option value="partial">{t('inventory.purchaseOrders.partial')}</option>
                  <option value="received">{t('inventory.purchaseOrders.received')}</option>
                </select>
                <select
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('inventory.purchaseOrders.allPayment')}</option>
                  <option value="unpaid">{t('inventory.purchaseOrders.unpaid')}</option>
                  <option value="partial">{t('inventory.purchaseOrders.partial')}</option>
                  <option value="paid">{t('inventory.purchaseOrders.paid')}</option>
                  <option value="overdue">{t('inventory.purchaseOrders.overdue')}</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-xl">{t('inventory.purchaseOrders.list')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">{t('inventory.purchaseOrders.poNumber')}</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">{t('inventory.purchaseOrders.supplier')}</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">{t('inventory.purchaseOrders.orderDate')}</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">{t('inventory.purchaseOrders.expected')}</th>
                    <th className="text-center p-4 text-sm font-semibold text-gray-700">{t('inventory.purchaseOrders.status')}</th>
                    <th className="text-right p-4 text-sm font-semibold text-gray-700">{t('inventory.purchaseOrders.total')}</th>
                    <th className="text-right p-4 text-sm font-semibold text-gray-700">{t('inventory.purchaseOrders.paid')}</th>
                    <th className="text-center p-4 text-sm font-semibold text-gray-700">{t('inventory.purchaseOrders.payment')}</th>
                    <th className="text-center p-4 text-sm font-semibold text-gray-700">{t('inventory.purchaseOrders.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-100 hover:bg-blue-50 transition-colors"
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-gray-900">{order.poNumber}</p>
                          <p className="text-xs text-gray-500">{order.items.length} {t('inventory.purchaseOrders.items')}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900">{order.supplier.name}</p>
                          <p className="text-xs text-gray-500">{order.supplier.contact}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-900">{order.orderDate}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-900">{order.expectedDelivery}</p>
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="p-4 text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                      </td>
                      <td className="p-4 text-right">
                        <p className="font-semibold text-green-600">{formatCurrency(order.paidAmount)}</p>
                        {order.paidAmount < order.totalAmount && (
                          <p className="text-xs text-gray-500">
                            {t('inventory.purchaseOrders.remaining')}: {formatCurrency(order.totalAmount - order.paidAmount)}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {getPaymentBadge(order.paymentStatus)}
                        {order.paymentStatus === 'overdue' && (
                          <p className="text-xs text-red-600 mt-1">{t('inventory.purchaseOrders.dueDate')}: {order.dueDate}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetail(order)}
                            className="hover:bg-blue-50"
                          >
                            <FaEye />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintOrder(order)}
                            className="hover:bg-green-50"
                          >
                            <FaPrint />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal - Simplified for now */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{t('inventory.purchaseOrders.orderDetails')} - {selectedOrder.poNumber}</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">{t('inventory.purchaseOrders.supplierInfo')}</h3>
                  <p className="text-lg font-bold">{selectedOrder.supplier.name}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.supplier.contact}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.supplier.address}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">{t('inventory.purchaseOrders.orderInfo')}</h3>
                  <div className="space-y-1">
                    <p className="text-sm"><span className="text-gray-600">{t('inventory.purchaseOrders.orderDate')}:</span> {selectedOrder.orderDate}</p>
                    <p className="text-sm"><span className="text-gray-600">{t('inventory.purchaseOrders.expected')}:</span> {selectedOrder.expectedDelivery}</p>
                    <p className="text-sm"><span className="text-gray-600">{t('inventory.purchaseOrders.dueDate')}:</span> {selectedOrder.dueDate}</p>
                    <p className="text-sm"><span className="text-gray-600">{t('inventory.purchaseOrders.status')}:</span> {getStatusBadge(selectedOrder.status)}</p>
                  </div>
                </div>
              </div>

              <h3 className="font-semibold text-gray-700 mb-3">{t('inventory.purchaseOrders.orderItems')}</h3>
              <table className="w-full mb-6">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm">{t('inventory.purchaseOrders.product')}</th>
                    <th className="text-center p-3 text-sm">{t('inventory.purchaseOrders.qty')}</th>
                    <th className="text-center p-3 text-sm">{t('inventory.purchaseOrders.received')}</th>
                    <th className="text-right p-3 text-sm">{t('inventory.purchaseOrders.unitCost')}</th>
                    <th className="text-right p-3 text-sm">{t('inventory.purchaseOrders.subtotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-3">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-gray-500">{item.sku}</p>
                      </td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-center">
                        <span className={item.receivedQty === item.quantity ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                          {item.receivedQty}
                        </span>
                      </td>
                      <td className="p-3 text-right">{formatCurrency(item.unitCost)}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">{t('inventory.purchaseOrders.totalAmount')}:</span>
                  <span className="font-bold">{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-lg text-green-600">
                  <span className="font-semibold">{t('inventory.purchaseOrders.paidAmount')}:</span>
                  <span className="font-bold">{formatCurrency(selectedOrder.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-lg text-red-600">
                  <span className="font-semibold">{t('inventory.purchaseOrders.outstanding')}:</span>
                  <span className="font-bold">{formatCurrency(selectedOrder.totalAmount - selectedOrder.paidAmount)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600"><span className="font-semibold">{t('inventory.purchaseOrders.notes')}:</span> {selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PurchaseOrdersPage;
