import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import HQLayout from '../../../components/hq/HQLayout';
import {
  Package,
  RefreshCw,
  Download,
  Search,
  ChevronLeft,
  Building2,
  Warehouse,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  X,
  Truck,
  FileText,
  Calendar,
  Check,
  AlertTriangle
} from 'lucide-react';

interface ReceiptItem {
  productId: string;
  productName: string;
  sku: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  status: 'pending' | 'partial' | 'complete' | 'rejected';
  notes?: string;
}

interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  poNumber: string;
  supplier: { id: string; name: string; code: string };
  branch: { id: string; name: string; code: string };
  status: 'pending' | 'partial' | 'complete' | 'cancelled';
  receiptDate: string;
  expectedDate: string;
  items: ReceiptItem[];
  totalItems: number;
  totalValue: number;
  receivedValue: number;
  receivedBy?: string;
  verifiedBy?: string;
  notes?: string;
}

export default function GoodsReceiptManagement() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/hq/inventory/receipts?${params.toString()}`);
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        if (payload.receipts) setReceipts(payload.receipts);
      }
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchReceipts();
  }, []);

  if (!mounted) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}jt`;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs"><Clock className="w-3 h-3" />{t('inventory.rcBadgePending')}</span>;
      case 'partial': return <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"><Package className="w-3 h-3" />{t('inventory.rcBadgePartial')}</span>;
      case 'complete': return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"><CheckCircle className="w-3 h-3" />{t('inventory.rcBadgeComplete')}</span>;
      case 'cancelled': return <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs"><XCircle className="w-3 h-3" />{t('inventory.rcBadgeCancelled')}</span>;
      case 'rejected': return <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs"><XCircle className="w-3 h-3" />{t('inventory.rcBadgeRejected')}</span>;
      default: return null;
    }
  };

  const filteredReceipts = receipts.filter(r => {
    const matchesSearch = r.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.supplier.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: receipts.filter(r => r.status === 'pending').length,
    partial: receipts.filter(r => r.status === 'partial').length,
    complete: receipts.filter(r => r.status === 'complete').length,
    totalValue: receipts.reduce((sum, r) => sum + r.totalValue, 0),
    receivedValue: receipts.reduce((sum, r) => sum + r.receivedValue, 0)
  };

  const handleReceive = (receipt: GoodsReceipt) => {
    setSelectedReceipt(receipt);
    setShowReceiveModal(true);
  };

  return (
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hq/inventory" className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('inventory.rcTitle')}</h1>
              <p className="text-gray-500">{t('inventory.rcSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              {t('inventory.rcExport')}
            </button>
            <Link
              href="/hq/purchase-orders"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FileText className="w-4 h-4" />
              {t('inventory.rcViewPO')}
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                <p className="text-sm text-yellow-600">{t('inventory.rcStatPending')}</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.partial}</p>
                <p className="text-sm text-blue-600">{t('inventory.rcStatPartial')}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{stats.complete}</p>
                <p className="text-sm text-green-600">{t('inventory.rcStatComplete')}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-purple-700">{formatCurrency(stats.receivedValue)}</p>
                <p className="text-sm text-purple-600">{t('inventory.rcStatTotalReceived')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Alert */}
        {stats.pending > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-semibold text-yellow-800">{t('inventory.rcPendingBanner').replace('{count}', String(stats.pending))}</p>
                <p className="text-sm text-yellow-600">{t('inventory.rcPendingBannerDesc')}</p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('pending')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
            >
              {t('inventory.rcViewPending')}
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('inventory.rcSearchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">{t('inventory.rcAllStatus')}</option>
              <option value="pending">{t('inventory.rcStatusPending')}</option>
              <option value="partial">{t('inventory.rcStatusPartial')}</option>
              <option value="complete">{t('inventory.rcStatusComplete')}</option>
              <option value="cancelled">{t('inventory.rcStatusCancelled')}</option>
            </select>
          </div>
        </div>

        {/* Receipts Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.rcThNumber')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.rcThSupplier')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.rcThBranch')}</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.rcThItems')}</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.rcThValue')}</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.rcThStatus')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.rcThDate')}</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.rcThAction')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-blue-600">{receipt.receiptNumber}</p>
                    <p className="text-xs text-gray-500">{receipt.poNumber}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{receipt.supplier.name}</p>
                    <p className="text-xs text-gray-500">{receipt.supplier.code}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {receipt.branch.code.startsWith('WH') ? (
                        <Warehouse className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Building2 className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-sm text-gray-600">{receipt.branch.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <p className="font-medium text-gray-900">{receipt.totalItems} {t('inventory.rcItems')}</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(receipt.totalValue)}</p>
                    {receipt.receivedValue > 0 && receipt.receivedValue < receipt.totalValue && (
                      <p className="text-xs text-green-600">{t('inventory.rcReceived')}: {formatCurrency(receipt.receivedValue)}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">{getStatusBadge(receipt.status)}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{formatDate(receipt.receiptDate)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setSelectedReceipt(receipt); setShowDetailModal(true); }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(receipt.status === 'pending' || receipt.status === 'partial') && (
                        <button
                          onClick={() => handleReceive(receipt)}
                          className="p-2 hover:bg-green-100 rounded-lg text-green-600"
                          title={t('inventory.rcReceive')}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedReceipt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedReceipt.receiptNumber}</h2>
                  <p className="text-sm text-gray-500">PO: {selectedReceipt.poNumber}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  {getStatusBadge(selectedReceipt.status)}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">{t('inventory.rcDetailSupplier')}</p>
                    <p className="font-medium text-gray-900">{selectedReceipt.supplier.name}</p>
                    <p className="text-xs text-gray-500">{selectedReceipt.supplier.code}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">{t('inventory.rcDetailBranch')}</p>
                    <p className="font-medium text-gray-900">{selectedReceipt.branch.name}</p>
                    <p className="text-xs text-gray-500">{selectedReceipt.branch.code}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">{t('inventory.rcDetailItems')} ({selectedReceipt.totalItems})</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t('inventory.rcDetailThProduct')}</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{t('inventory.rcDetailThOrdered')}</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{t('inventory.rcDetailThReceived')}</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{t('inventory.rcDetailThPrice')}</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">{t('inventory.rcDetailThStatus')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedReceipt.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{item.productName}</p>
                              <p className="text-xs text-gray-500">{item.sku}</p>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">{item.orderedQty} {item.unit}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">{item.receivedQty} {item.unit}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{formatFullCurrency(item.totalPrice)}</td>
                            <td className="px-4 py-3 text-center">{getStatusBadge(item.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-900">{t('inventory.rcDetailTotal')}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">{formatFullCurrency(selectedReceipt.totalValue)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">{t('inventory.rcExpectedDate')}</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedReceipt.expectedDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('inventory.rcReceiptDate')}</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedReceipt.receiptDate)}</p>
                  </div>
                  {selectedReceipt.receivedBy && (
                    <div>
                      <p className="text-gray-500">{t('inventory.rcReceivedBy')}</p>
                      <p className="font-medium text-gray-900">{selectedReceipt.receivedBy}</p>
                    </div>
                  )}
                  {selectedReceipt.verifiedBy && (
                    <div>
                      <p className="text-gray-500">{t('inventory.rcVerifiedBy')}</p>
                      <p className="font-medium text-gray-900">{selectedReceipt.verifiedBy}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('inventory.rcClose')}
                </button>
                {(selectedReceipt.status === 'pending' || selectedReceipt.status === 'partial') && (
                  <button
                    onClick={() => { setShowDetailModal(false); handleReceive(selectedReceipt); }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {t('inventory.rcProcessReceive')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Receive Modal */}
        {showReceiveModal && selectedReceipt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('inventory.rcReceiveTitle')}</h2>
                  <p className="text-sm text-gray-500">{selectedReceipt.receiptNumber}</p>
                </div>
                <button onClick={() => setShowReceiveModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Supplier:</span> {selectedReceipt.supplier.name}
                  </p>
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">PO:</span> {selectedReceipt.poNumber}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">{t('inventory.rcInputQty')}</h4>
                  <div className="space-y-3">
                    {selectedReceipt.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.productName}</p>
                          <p className="text-xs text-gray-500">{item.sku} • {t('inventory.rcOrdered')}: {item.orderedQty} {item.unit}</p>
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            defaultValue={item.orderedQty}
                            min="0"
                            max={item.orderedQty}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                          />
                        </div>
                        <span className="text-sm text-gray-500">{item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.rcNotesLabel')}</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder={t('inventory.rcNotesPlaceholder')}
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('inventory.rcCancel')}
                </button>
                <button
                  onClick={() => {
                    setReceipts(receipts.map(r => 
                      r.id === selectedReceipt.id 
                        ? { ...r, status: 'complete' as const, receivedValue: r.totalValue, receivedBy: 'Admin HQ' }
                        : r
                    ));
                    setShowReceiveModal(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {t('inventory.rcConfirmReceive')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
