import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import Modal, { ConfirmDialog } from '../../../components/hq/ui/Modal';
import { StatusBadge } from '../../../components/hq/ui/Badge';
import DocumentExportButton from '@/components/documents/DocumentExportButton';
import { toast } from 'react-hot-toast';
import {
  ShoppingCart, Save, RefreshCw, Plus, Edit, Trash2, Search, Eye, Truck, Package,
  Calendar, DollarSign, FileText, CheckCircle, XCircle, Clock, Send, Download,
  Filter, Building2, BarChart3, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Target, Activity, Layers, Zap, PieChart as PieChartIcon
} from 'lucide-react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });
import { rowsOr, MOCK_HQ_PURCHASE_ORDERS, MOCK_HQ_SUPPLIER_SCORECARD } from '@/lib/hq/mock-data';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: { id: string; name: string; code: string };
  status: 'draft' | 'pending' | 'approved' | 'sent' | 'partial' | 'received' | 'cancelled';
  totalItems: number;
  totalQuantity: number;
  totalAmount: number;
  expectedDelivery: string | null;
  createdBy: string;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string;
  items: POItem[];
}

interface POItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  total: number;
  status: 'pending' | 'partial' | 'received';
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: FileText },
  pending: { label: 'Menunggu Approval', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Disetujui', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  sent: { label: 'Dikirim ke Supplier', color: 'bg-purple-100 text-purple-800', icon: Send },
  partial: { label: 'Diterima Sebagian', color: 'bg-orange-100 text-orange-800', icon: Package },
  received: { label: 'Diterima Lengkap', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export default function PurchaseOrders() {
  const [mounted, setMounted] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(MOCK_HQ_PURCHASE_ORDERS as PurchaseOrder[]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);

  // Enhanced state
  const [subTab, setSubTab] = useState<'orders' | 'analytics' | 'spend' | 'scorecard'>('orders');
  const [enhancedData, setEnhancedData] = useState<any>(null);
  const [supplierScorecard, setSupplierScorecard] = useState<any[]>(MOCK_HQ_SUPPLIER_SCORECARD);
  const [poAnalytics, setPOAnalytics] = useState<any>(null);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const [poRes, enhancedRes] = await Promise.all([
        fetch('/api/hq/purchase-orders'),
        fetch('/api/hq/procurement/enhanced?action=dashboard')
      ]);
      if (poRes.ok) {
        const data = await poRes.json();
        setPurchaseOrders(rowsOr(data.purchaseOrders, MOCK_HQ_PURCHASE_ORDERS as PurchaseOrder[]));
      }
      if (enhancedRes.ok) {
        const eData = await enhancedRes.json();
        setEnhancedData(eData.data || null);
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScorecard = async () => {
    try {
      const res = await fetch('/api/hq/procurement/enhanced?action=supplier-scorecard');
      if (res.ok) { const d = await res.json(); setSupplierScorecard(rowsOr(d.data?.scorecards, MOCK_HQ_SUPPLIER_SCORECARD)); }
    } catch (e) { console.error('Error fetching scorecard:', e); }
  };

  const fetchPOAnalytics = async () => {
    try {
      const res = await fetch('/api/hq/procurement/enhanced?action=po-analytics');
      if (res.ok) { const d = await res.json(); setPOAnalytics(d.data || null); }
    } catch (e) { console.error('Error fetching PO analytics:', e); }
  };

  const handleExport = () => {
    const rows = filteredPOs.map(p => `${p.poNumber},${p.supplier.name},${p.supplier.code},${p.status},${p.totalItems},${p.totalQuantity},${p.totalAmount},${p.expectedDelivery || ''},${p.createdAt}`);
    const csv = `PONumber,Supplier,Code,Status,Items,Qty,Amount,ExpDelivery,Created\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'purchase-orders.csv'; a.click(); URL.revokeObjectURL(url);
    toast.success('Export PO berhasil');
  };

  useEffect(() => {
    setMounted(true);
    fetchPurchaseOrders();
  }, []);

  useEffect(() => {
    if (subTab === 'scorecard') fetchScorecard();
    else if (subTab === 'analytics') fetchPOAnalytics();
  }, [subTab]);

  if (!mounted) {
    return null;
  }

  const handleApprove = async (po: PurchaseOrder) => {
    setPurchaseOrders(prev => prev.map(p => 
      p.id === po.id ? { ...p, status: 'approved' as const, approvedBy: 'Admin HQ', approvedAt: new Date().toISOString() } : p
    ));
    toast.success(`PO ${po.poNumber} approved`);
  };

  const handleSendToSupplier = async (po: PurchaseOrder) => {
    setPurchaseOrders(prev => prev.map(p => 
      p.id === po.id ? { ...p, status: 'sent' as const } : p
    ));
    toast.success(`PO ${po.poNumber} sent to supplier`);
  };

  const handleDelete = async () => {
    if (!selectedPO) return;
    setPurchaseOrders(prev => prev.filter(p => p.id !== selectedPO.id));
    setShowDeleteConfirm(false);
    toast.success(`PO ${selectedPO.poNumber} deleted`);
    setSelectedPO(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: purchaseOrders.length,
    draft: purchaseOrders.filter(p => p.status === 'draft').length,
    pending: purchaseOrders.filter(p => ['pending', 'approved', 'sent'].includes(p.status)).length,
    received: purchaseOrders.filter(p => p.status === 'received').length,
    totalValue: purchaseOrders.reduce((sum, p) => sum + p.totalAmount, 0)
  };

  const fmtShort = (v: number) => {
    if (v >= 1000000000) return `Rp ${(v / 1000000000).toFixed(1)}M`;
    if (v >= 1000000) return `Rp ${(v / 1000000).toFixed(0)}jt`;
    return formatCurrency(v);
  };

  return (
    <HQLayout title="Purchase Orders" subtitle="Kelola pembelian ke supplier">
      <div className="space-y-6">
        {/* Enhanced Header Stats */}
        {enhancedData?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-500">On-Time Delivery</span></div>
              <p className="text-xl font-bold text-gray-900">{enhancedData.summary.onTimeDeliveryRate}%</p>
              <p className="text-xs text-gray-400">delivery compliance</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-500">Fulfillment Rate</span></div>
              <p className="text-xl font-bold text-gray-900">{enhancedData.summary.poFulfillmentRate}%</p>
              <p className="text-xs text-gray-400">order fulfillment</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-purple-600" /><span className="text-xs text-gray-500">Cost Savings</span></div>
              <p className="text-xl font-bold text-gray-900">{enhancedData.summary.costSavingsPct}%</p>
              <p className="text-xs text-gray-400">vs previous period</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-xs text-gray-500">Overdue</span></div>
              <p className="text-xl font-bold text-gray-900">{enhancedData.summary.overdueDeliveries}</p>
              <p className="text-xs text-gray-400">deliveries late</p>
            </div>
          </div>
        )}

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {([
            { v: 'orders' as const, l: 'Orders', icon: ShoppingCart },
            { v: 'analytics' as const, l: 'PO Analytics', icon: BarChart3 },
            { v: 'spend' as const, l: 'Spend Analysis', icon: PieChartIcon },
            { v: 'scorecard' as const, l: 'Supplier Scorecard', icon: Target },
          ]).map(t => (
            <button key={t.v} onClick={() => setSubTab(t.v)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${subTab === t.v ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="w-4 h-4" />{t.l}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {subTab === 'orders' && enhancedData?.recentAlerts && (
          <div className="space-y-2">
            {enhancedData.recentAlerts.filter((a: any) => a.severity === 'high').map((alert: any, i: number) => (
              <div key={i} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{alert.message}</p>
              </div>
            ))}
          </div>
        )}

        {subTab === 'orders' && (<>
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total PO</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
                <p className="text-sm text-gray-500">Draft</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-sm text-gray-500">Dalam Proses</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.received}</p>
                <p className="text-sm text-gray-500">Diterima</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
                <p className="text-sm text-gray-500">Total Nilai</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari PO..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Menunggu Approval</option>
                  <option value="approved">Disetujui</option>
                  <option value="sent">Dikirim</option>
                  <option value="partial">Diterima Sebagian</option>
                  <option value="received">Diterima Lengkap</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchPurchaseOrders}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <DocumentExportButton
                  documentType="purchase-order"
                  data={{ items: filteredPOs.map(p => ({ poNumber: p.poNumber, supplierName: p.supplier.name, supplierCode: p.supplier.code, status: p.status, totalItems: p.totalItems, totalQuantity: p.totalQuantity, totalAmount: p.totalAmount, expectedDelivery: p.expectedDelivery || '-', createdAt: p.createdAt })) }}
                  meta={{ documentNumber: `PO-LIST-${new Date().toISOString().slice(0,10)}` }}
                  showFormats={['excel', 'csv', 'pdf']}
                  label="Export PO"
                />
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Buat PO
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredPOs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Tidak ada purchase order ditemukan
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">No. PO</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Supplier</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Items</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Total</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Tgl Kirim</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Dibuat</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPOs.map((po) => {
                    const StatusIcon = statusConfig[po.status].icon;
                    return (
                      <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="font-mono font-medium text-blue-600">{po.poNumber}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{po.supplier.name}</p>
                            <p className="text-sm text-gray-500">{po.supplier.code}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                            {po.totalItems} items ({po.totalQuantity} qty)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{formatCurrency(po.totalAmount)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusConfig[po.status].color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[po.status].label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-600">
                          {po.expectedDelivery ? formatDate(po.expectedDelivery) : '-'}
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-600">
                          {formatDate(po.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedPO(po);
                                setShowViewModal(true);
                              }}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {po.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => handleApprove(po)}
                                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Approve"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedPO(po);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {po.status === 'approved' && (
                              <button
                                onClick={() => handleSendToSupplier(po)}
                                className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                                title="Kirim ke Supplier"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* View Modal */}
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={`Detail PO - ${selectedPO?.poNumber}`}
          size="xl"
        >
          {selectedPO && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Supplier</p>
                    <p className="font-medium text-gray-900">{selectedPO.supplier.name}</p>
                    <p className="text-sm text-gray-500">{selectedPO.supplier.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig[selectedPO.status].color}`}>
                      {statusConfig[selectedPO.status].label}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Catatan</p>
                    <p className="text-gray-900">{selectedPO.notes || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Nilai</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedPO.totalAmount)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Items</p>
                      <p className="font-medium">{selectedPO.totalItems} produk</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Quantity</p>
                      <p className="font-medium">{selectedPO.totalQuantity} unit</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Dibuat</p>
                      <p className="font-medium">{formatDate(selectedPO.createdAt)}</p>
                      <p className="text-sm text-gray-500">{selectedPO.createdBy}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Disetujui</p>
                      <p className="font-medium">{selectedPO.approvedAt ? formatDate(selectedPO.approvedAt) : '-'}</p>
                      <p className="text-sm text-gray-500">{selectedPO.approvedBy || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedPO.items.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Daftar Item</h4>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Produk</th>
                        <th className="text-center py-2 px-3 text-sm font-medium text-gray-500">Qty</th>
                        <th className="text-center py-2 px-3 text-sm font-medium text-gray-500">Diterima</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">Harga</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPO.items.map(item => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-2 px-3">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-gray-500">{item.sku}</p>
                          </td>
                          <td className="py-2 px-3 text-center">{item.quantity}</td>
                          <td className="py-2 px-3 text-center">{item.receivedQuantity}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-2 px-3 text-right font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Modal>

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Hapus Purchase Order"
          message={`Apakah Anda yakin ingin menghapus PO "${selectedPO?.poNumber}"?`}
          confirmText="Hapus"
          variant="danger"
        />
        </>)}

        {/* ─── PO Analytics Tab ─── */}
        {subTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-700"><strong>PO Analytics</strong>: Analisis cycle time, price trends, dan compliance metrics procurement.</p>
            </div>
            {poAnalytics ? (
              <>
                {/* Cycle Time */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">Draft → Approval</p>
                    <p className="text-2xl font-bold text-gray-900">{poAnalytics.cycleTime.avgDraftToApproval} hari</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">Approval → Sent</p>
                    <p className="text-2xl font-bold text-gray-900">{poAnalytics.cycleTime.avgApprovalToSent} hari</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">Sent → Delivery</p>
                    <p className="text-2xl font-bold text-gray-900">{poAnalytics.cycleTime.avgSentToDelivery} hari</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">Total Cycle</p>
                    <p className="text-2xl font-bold text-blue-600">{poAnalytics.cycleTime.avgTotal} hari</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">PO Cycle Time Trend</h3>
                  <Chart
                    options={{
                      chart: { type: 'bar', stacked: true, toolbar: { show: false } },
                      colors: ['#3B82F6', '#10B981', '#F59E0B'],
                      xaxis: { categories: poAnalytics.cycleTime.trend.map((t: any) => t.month) },
                      yaxis: { title: { text: 'Hari' } },
                      legend: { position: 'top' },
                      plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
                    }}
                    series={[
                      { name: 'Draft→Approval', data: poAnalytics.cycleTime.trend.map((t: any) => t.draftToApproval) },
                      { name: 'Approval→Sent', data: poAnalytics.cycleTime.trend.map((t: any) => t.approvalToSent) },
                      { name: 'Sent→Delivery', data: poAnalytics.cycleTime.trend.map((t: any) => t.sentToDelivery) },
                    ]}
                    type="bar"
                    height={320}
                  />
                </div>

                {/* Price Analysis */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Price Change Analysis</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">Avg price change: <span className="font-bold text-orange-600">+{poAnalytics.priceAnalysis.avgPriceChange}%</span></p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-red-600 mb-2">Top Price Increases</p>
                        {poAnalytics.priceAnalysis.topIncreases.map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-700">{item.product}</span>
                            <span className="text-sm font-medium text-red-600">+{item.change}%</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-600 mb-2">Price Decreases</p>
                        {poAnalytics.priceAnalysis.topDecreases.map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-700">{item.product}</span>
                            <span className="text-sm font-medium text-green-600">{item.change}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compliance */}
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(poAnalytics.complianceMetrics).map(([key, val]) => (
                    <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-xs text-gray-500 mb-1">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</p>
                      <p className={`text-2xl font-bold ${(val as number) >= 90 ? 'text-green-600' : (val as number) >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>{val as number}%</p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div className={`h-1.5 rounded-full ${(val as number) >= 90 ? 'bg-green-500' : (val as number) >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">Loading analytics...</div>
            )}
          </div>
        )}

        {/* ─── Spend Analysis Tab ─── */}
        {subTab === 'spend' && enhancedData && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-sm text-purple-700"><strong>Spend Analysis</strong>: Analisis pengeluaran procurement per kategori dan trend bulanan.</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Spend by Category</h3>
                <Chart
                  options={{
                    chart: { type: 'donut' },
                    labels: enhancedData.spendByCategory?.map((c: any) => c.name) || [],
                    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'],
                    legend: { position: 'bottom' },
                    dataLabels: { enabled: true, formatter: (v: number) => `${v.toFixed(0)}%` },
                  }}
                  series={enhancedData.spendByCategory?.map((c: any) => c.value) || []}
                  type="donut"
                  height={350}
                />
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Category Breakdown</h3>
                <div className="space-y-3">
                  {enhancedData.spendByCategory?.map((cat: any) => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-sm text-gray-700">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{fmtShort(cat.amount)}</p>
                        <p className="text-xs text-gray-500">{cat.value}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Monthly Spend & PO Trend</h3>
              <Chart
                options={{
                  chart: { type: 'area', toolbar: { show: false } },
                  colors: ['#3B82F6', '#10B981'],
                  stroke: { curve: 'smooth', width: 2 },
                  xaxis: { categories: enhancedData.spendTrend?.labels || [] },
                  yaxis: [
                    { title: { text: 'Spend (Rp)' }, labels: { formatter: (v: number) => fmtShort(v) } },
                    { opposite: true, title: { text: 'PO Count' } }
                  ],
                  legend: { position: 'top' },
                  fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } },
                }}
                series={[
                  { name: 'Spend', data: enhancedData.spendTrend?.spend || [] },
                  { name: 'PO Count', data: enhancedData.spendTrend?.poCount || [] },
                ]}
                type="area"
                height={350}
              />
            </div>

            {/* Savings Trend */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Cost Savings Trend</h3>
              <Chart
                options={{
                  chart: { type: 'bar', toolbar: { show: false } },
                  colors: ['#10B981'],
                  xaxis: { categories: enhancedData.spendTrend?.labels || [] },
                  yaxis: { labels: { formatter: (v: number) => fmtShort(v) } },
                  plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
                  dataLabels: { enabled: true, formatter: (v: number) => fmtShort(v) },
                }}
                series={[{ name: 'Savings', data: enhancedData.spendTrend?.savings || [] }]}
                type="bar"
                height={300}
              />
            </div>
          </div>
        )}

        {/* ─── Supplier Scorecard Tab ─── */}
        {subTab === 'scorecard' && (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <p className="text-sm text-teal-700"><strong>Supplier Scorecard</strong>: Penilaian kinerja supplier berdasarkan quality, delivery, price, responsiveness, dan compliance.</p>
            </div>
            {supplierScorecard.length > 0 ? (
              <>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quality</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Delivery</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Response</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Compliance</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Overall</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grade</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Spend</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {supplierScorecard.sort((a, b) => b.overallScore - a.overallScore).map((s: any) => (
                          <tr key={s.supplierId} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{s.name}</p>
                              <p className="text-xs text-gray-500">{s.code}</p>
                            </td>
                            <td className="px-4 py-3 text-center"><span className={`text-sm font-medium ${s.qualityScore >= 85 ? 'text-green-600' : s.qualityScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{s.qualityScore}</span></td>
                            <td className="px-4 py-3 text-center"><span className={`text-sm font-medium ${s.deliveryScore >= 85 ? 'text-green-600' : s.deliveryScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{s.deliveryScore}</span></td>
                            <td className="px-4 py-3 text-center"><span className={`text-sm font-medium ${s.priceScore >= 85 ? 'text-green-600' : s.priceScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{s.priceScore}</span></td>
                            <td className="px-4 py-3 text-center"><span className={`text-sm font-medium ${s.responsiveness >= 85 ? 'text-green-600' : s.responsiveness >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{s.responsiveness}</span></td>
                            <td className="px-4 py-3 text-center"><span className={`text-sm font-medium ${s.compliance >= 85 ? 'text-green-600' : s.compliance >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{s.compliance}</span></td>
                            <td className="px-4 py-3 text-center"><span className="text-sm font-bold text-blue-600">{s.overallScore}</span></td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.grade === 'A' ? 'bg-green-100 text-green-700' : s.grade === 'B' ? 'bg-blue-100 text-blue-700' : s.grade === 'C' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                {s.grade}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium">{fmtShort(s.totalValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Radar Chart for top supplier */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-4">Score Distribution</h3>
                    <Chart
                      options={{
                        chart: { type: 'bar', toolbar: { show: false } },
                        plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
                        colors: ['#3B82F6'],
                        xaxis: { categories: supplierScorecard.sort((a, b) => b.overallScore - a.overallScore).map(s => s.name) },
                        yaxis: { labels: { style: { fontSize: '11px' } } },
                      }}
                      series={[{ name: 'Score', data: supplierScorecard.sort((a, b) => b.overallScore - a.overallScore).map(s => s.overallScore) }]}
                      type="bar"
                      height={300}
                    />
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-4">Grade Distribution</h3>
                    <Chart
                      options={{
                        chart: { type: 'donut' },
                        labels: ['A (Excellent)', 'B (Good)', 'C (Average)', 'D/F (Poor)'],
                        colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
                        legend: { position: 'bottom' },
                      }}
                      series={[
                        supplierScorecard.filter(s => s.grade === 'A').length,
                        supplierScorecard.filter(s => s.grade === 'B').length,
                        supplierScorecard.filter(s => s.grade === 'C').length,
                        supplierScorecard.filter(s => s.grade === 'D' || s.grade === 'F').length,
                      ]}
                      type="donut"
                      height={300}
                    />
                  </div>
                </div>

                <button onClick={() => {
                  const rows = supplierScorecard.map(s => `${s.name},${s.code},${s.qualityScore},${s.deliveryScore},${s.priceScore},${s.responsiveness},${s.compliance},${s.overallScore},${s.grade},${s.totalValue}`);
                  const csv = `Name,Code,Quality,Delivery,Price,Response,Compliance,Overall,Grade,Spend\n${rows.join('\n')}`;
                  const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'supplier-scorecard.csv'; a.click(); URL.revokeObjectURL(url);
                  toast.success('Export scorecard berhasil');
                }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  <Download className="w-4 h-4" /> Export Scorecard
                </button>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">Loading supplier scorecard...</div>
            )}
          </div>
        )}
      </div>
    </HQLayout>
  );
}
