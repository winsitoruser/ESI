import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import {
  RefreshCw, Search, Building2, Warehouse,
  Clock, CheckCircle, XCircle, Eye, Check, X, Truck, Package, Plus,
  Send, FileText, Loader2, Save, Trash2, ChevronLeft, Download
} from 'lucide-react';

interface TransferItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
}

interface Transfer {
  id: string;
  transferNumber: string;
  fromBranch: { id: string; name: string; code: string };
  toBranch: { id: string; name: string; code: string };
  items: TransferItem[];
  totalItems: number;
  totalQuantity: number;
  status: string;
  priority: string;
  requestDate: string;
  approvedDate?: string;
  shippedDate?: string;
  receivedDate?: string;
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
}

export default function TransferManagement() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [saving, setSaving] = useState(false);

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [newTransfer, setNewTransfer] = useState({
    fromWarehouseId: '', toWarehouseId: '', notes: '',
    items: [{ productId: '', quantity: 1, unitCost: 0 }] as { productId: string; quantity: number; unitCost: number }[]
  });

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/hq/inventory/transfers?${params}`);
      const json = await res.json();
      if (json.success) {
        setTransfers(json.data?.transfers || []);
        setStats(json.data?.stats || {});
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [statusFilter]);

  const fetchMeta = useCallback(async () => {
    try {
      const [whRes, prodRes] = await Promise.all([
        fetch('/api/hq/warehouse?action=warehouses'),
        fetch('/api/hq/warehouse?action=products'),
      ]);
      const [whJson, prodJson] = await Promise.all([whRes.json(), prodRes.json()]);
      if (whJson.success) setWarehouses(whJson.data || []);
      if (prodJson.success) setProducts(prodJson.data?.products || prodJson.data || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { setMounted(true); fetchTransfers(); fetchMeta(); }, [fetchTransfers, fetchMeta]);

  if (!mounted) return null;

  const doAction = async (id: string, operation: string, body?: any) => {
    try {
      await fetch(`/api/hq/inventory/transfers?id=${id}&operation=${operation}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
      });
      fetchTransfers();
      setShowDetailModal(false);
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const validItems = newTransfer.items.filter(i => i.productId);
      if (!newTransfer.fromWarehouseId || !newTransfer.toWarehouseId || validItems.length === 0) {
        alert(t('inventory.tfValidation'));
        setSaving(false);
        return;
      }
      const res = await fetch('/api/hq/inventory/transfers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWarehouseId: parseInt(newTransfer.fromWarehouseId),
          toWarehouseId: parseInt(newTransfer.toWarehouseId),
          notes: newTransfer.notes,
          items: validItems.map(i => ({ productId: parseInt(i.productId), quantity: i.quantity, unitCost: i.unitCost }))
        })
      });
      if (res.ok) { setShowCreateModal(false); fetchTransfers(); }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
      draft: { label: t('inventory.tfBadgeDraft'), cls: 'bg-gray-100 text-gray-700', Icon: FileText },
      pending: { label: t('inventory.tfBadgePending'), cls: 'bg-yellow-100 text-yellow-700', Icon: Clock },
      approved: { label: t('inventory.tfBadgeApproved'), cls: 'bg-blue-100 text-blue-700', Icon: CheckCircle },
      in_transit: { label: t('inventory.tfBadgeTransit'), cls: 'bg-purple-100 text-purple-700', Icon: Truck },
      shipped: { label: t('inventory.tfBadgeShipped'), cls: 'bg-purple-100 text-purple-700', Icon: Truck },
      received: { label: t('inventory.tfBadgeReceived'), cls: 'bg-green-100 text-green-700', Icon: CheckCircle },
      cancelled: { label: t('inventory.tfBadgeCancelled'), cls: 'bg-red-100 text-red-700', Icon: XCircle },
      rejected: { label: t('inventory.tfBadgeRejected'), cls: 'bg-red-100 text-red-700', Icon: XCircle },
    };
    const c = cfg[status] || cfg.draft;
    return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.cls}`}><c.Icon className="w-3 h-3" />{c.label}</span>;
  };

  const filtered = transfers.filter(tr => {
    const matchSearch = !searchTerm ||
      (tr.transferNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tr.fromBranch?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tr.toBranch?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const statPending = (stats.pending || 0);
  const statApproved = (stats.approved || 0);
  const statTransit = (stats.in_transit || 0) + (stats.shipped || 0);
  const statReceived = (stats.received || 0);

  const handleApprove = (transfer: Transfer) => {
    setTransfers(transfers.map(tr => 
      tr.id === transfer.id ? { ...tr, status: 'approved' as const, approvedDate: new Date().toISOString(), approvedBy: 'Admin HQ' } : tr
    ));
    setShowDetailModal(false);
    toast.success(t('inventory.tfToastApproved').replace('{number}', transfer.transferNumber));
  };

  const handleReject = (transfer: Transfer) => {
    setTransfers(transfers.map(tr => 
      tr.id === transfer.id ? { ...tr, status: 'rejected' as const } : tr
    ));
    setShowDetailModal(false);
    toast.error(t('inventory.tfToastRejected').replace('{number}', transfer.transferNumber));
  };

  const handleShip = (transfer: Transfer) => {
    setTransfers(transfers.map(tr => 
      tr.id === transfer.id ? { ...tr, status: 'shipped' as const, shippedDate: new Date().toISOString() } : tr
    ));
    setShowDetailModal(false);
    toast.success(t('inventory.tfToastShipped').replace('{number}', transfer.transferNumber));
  };

  const handleReceive = (transfer: Transfer) => {
    setTransfers(transfers.map(tr => 
      tr.id === transfer.id ? { ...tr, status: 'received' as const, receivedDate: new Date().toISOString() } : tr
    ));
    setShowDetailModal(false);
    toast.success(t('inventory.tfToastReceived').replace('{number}', transfer.transferNumber));
  };

  return (
    <HQLayout title={t('inventory.tfLayoutTitle')} subtitle={t('inventory.tfLayoutSubtitle')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hq/inventory" className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('inventory.tfTitle')}</h1>
              <p className="text-gray-500">{t('inventory.tfSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => {
              const rows = filtered.map(tr => `${tr.transferNumber},${tr.fromBranch.name},${tr.toBranch.name},${tr.totalItems},${tr.totalQuantity},${tr.status},${tr.priority},${tr.requestDate}`);
              const csv = `TransferNo,From,To,Items,Qty,Status,Priority,Date\n${rows.join('\n')}`;
              const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'transfers-report.csv'; a.click(); URL.revokeObjectURL(url);
              toast.success(t('inventory.tfExportSuccess'));
            }} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              <Download className="w-4 h-4" /> {t('inventory.tfExport')}
            </button>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4" /> {t('inventory.tfCreate')}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t('inventory.tfStatPending'), value: statPending, icon: Clock, bg: 'yellow' },
            { label: t('inventory.tfStatApproved'), value: statApproved, icon: CheckCircle, bg: 'blue' },
            { label: t('inventory.tfStatTransit'), value: statTransit, icon: Truck, bg: 'purple' },
            { label: t('inventory.tfStatCompleted'), value: statReceived, icon: Package, bg: 'green' },
          ].map((s, i) => (
            <div key={i} className={`bg-${s.bg}-50 border border-${s.bg}-200 rounded-xl p-4`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-${s.bg}-100 rounded-lg flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 text-${s.bg}-600`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold text-${s.bg}-700`}>{s.value}</p>
                  <p className={`text-sm text-${s.bg}-600`}>{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder={t('inventory.tfSearchPlaceholder')} value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="all">{t('inventory.tfAllStatus')}</option>
                <option value="pending">{t('inventory.tfStatusPending')}</option>
                <option value="approved">{t('inventory.tfStatusApproved')}</option>
                <option value="in_transit">{t('inventory.tfStatusTransit')}</option>
                <option value="received">{t('inventory.tfStatusReceived')}</option>
                <option value="cancelled">{t('inventory.tfStatusCancelled')}</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchTransfers} disabled={loading}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {t('inventory.tfRefresh')}
              </button>
              <button onClick={() => {
                setNewTransfer({ fromWarehouseId: '', toWarehouseId: '', notes: '', items: [{ productId: '', quantity: 1, unitCost: 0 }] });
                setShowCreateModal(true);
              }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                <Plus className="w-4 h-4" /> {t('inventory.tfCreate')}
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500">{t('inventory.tfNotFound')}</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.tfThNumber')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.tfThFrom')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.tfThTo')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.tfThItems')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.tfThStatus')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.tfThDate')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.tfThAction')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((tr) => (
                  <tr key={tr.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-blue-600 font-mono">{tr.transferNumber}</p>
                      <p className="text-xs text-gray-500">{t('inventory.tfBy')} {tr.requestedBy}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{tr.fromBranch?.name || '-'}</p>
                          <p className="text-xs text-gray-500">{tr.fromBranch?.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{tr.toBranch?.name || '-'}</p>
                          <p className="text-xs text-gray-500">{tr.toBranch?.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <p className="font-medium text-sm">{tr.totalItems} {t('inventory.tfItemsUnit')}</p>
                      <p className="text-xs text-gray-500">{tr.totalQuantity} {t('inventory.tfUnit')}</p>
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(tr.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(tr.requestDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setSelectedTransfer(tr); setShowDetailModal(true); }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"><Eye className="w-4 h-4" /></button>
                        {tr.status === 'pending' && (
                          <>
                            <button onClick={() => doAction(tr.id, 'approve')}
                              className="p-1.5 hover:bg-green-100 rounded-lg text-green-600" title={t('inventory.tfApprove')}><Check className="w-4 h-4" /></button>
                            <button onClick={() => doAction(tr.id, 'cancel', { reason: 'Rejected' })}
                              className="p-1.5 hover:bg-red-100 rounded-lg text-red-600" title={t('inventory.tfReject')}><X className="w-4 h-4" /></button>
                          </>
                        )}
                        {tr.status === 'approved' && (
                          <button onClick={() => doAction(tr.id, 'ship')}
                            className="p-1.5 hover:bg-purple-100 rounded-lg text-purple-600" title={t('inventory.tfShip')}><Send className="w-4 h-4" /></button>
                        )}
                        {(tr.status === 'in_transit' || tr.status === 'shipped') && (
                          <button onClick={() => doAction(tr.id, 'receive')}
                            className="p-1.5 hover:bg-green-100 rounded-lg text-green-600" title={t('inventory.tfReceive')}><Package className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-lg font-bold text-gray-900">{t('inventory.tfCreateTitle')}</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.tfFromLabel')}</label>
                    <select value={newTransfer.fromWarehouseId}
                      onChange={(e) => setNewTransfer(p => ({ ...p, fromWarehouseId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="">{t('inventory.tfFromPlaceholder')}</option>
                      {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.tfToLabel')}</label>
                    <select value={newTransfer.toWarehouseId}
                      onChange={(e) => setNewTransfer(p => ({ ...p, toWarehouseId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="">{t('inventory.tfToPlaceholder')}</option>
                      {warehouses.filter(w => String(w.id) !== newTransfer.fromWarehouseId).map((w: any) =>
                        <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">{t('inventory.tfItemsLabel')}</label>
                    <button type="button" onClick={() => setNewTransfer(p => ({ ...p, items: [...p.items, { productId: '', quantity: 1, unitCost: 0 }] }))}
                      className="text-xs text-blue-600 hover:text-blue-700">{t('inventory.tfAddItem')}</button>
                  </div>
                  <div className="space-y-2">
                    {newTransfer.items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select value={item.productId} onChange={(e) => {
                          const items = [...newTransfer.items];
                          items[idx].productId = e.target.value;
                          setNewTransfer(p => ({ ...p, items }));
                        }} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm">
                          <option value="">{t('inventory.tfSelectProduct')}</option>
                          {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                        </select>
                        <input type="number" value={item.quantity} min={1}
                          onChange={(e) => { const items = [...newTransfer.items]; items[idx].quantity = parseInt(e.target.value) || 1; setNewTransfer(p => ({ ...p, items })); }}
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-center" placeholder="Qty" />
                        {newTransfer.items.length > 1 && (
                          <button onClick={() => setNewTransfer(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.tfNotesLabel')}</label>
                  <textarea value={newTransfer.notes}
                    onChange={(e) => setNewTransfer(p => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2}
                    placeholder={t('inventory.tfNotesPlaceholder')} />
                </div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">{t('inventory.tfCancel')}</button>
                <button onClick={handleCreate} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? t('inventory.tfSaving') : t('inventory.tfCreate')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedTransfer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedTransfer.transferNumber}</h2>
                  <p className="text-sm text-gray-500">{t('inventory.tfBy')} {selectedTransfer.requestedBy}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-5">
                <div className="flex items-center gap-3">{getStatusBadge(selectedTransfer.status)}</div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">{t('inventory.tfDetailFrom')}</p>
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-4 h-4 text-gray-500" />
                      <p className="font-medium">{selectedTransfer.fromBranch?.name}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{selectedTransfer.fromBranch?.code}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">{t('inventory.tfDetailTo')}</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <p className="font-medium">{selectedTransfer.toBranch?.name}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{selectedTransfer.toBranch?.code}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">{t('inventory.tfThItems')} ({selectedTransfer.totalItems})</h4>
                  <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                    {(selectedTransfer.items || []).map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{item.productName}</p>
                          <p className="text-xs text-gray-500">{item.sku}</p>
                        </div>
                        <p className="font-medium text-sm">{item.quantity} {item.unit}</p>
                      </div>
                    ))}
                    {(!selectedTransfer.items || selectedTransfer.items.length === 0) && (
                      <p className="p-3 text-sm text-gray-500">{t('inventory.tfNoItems')}</p>
                    )}
                  </div>
                </div>

                {selectedTransfer.notes && (
                  <div>
                    <h4 className="font-semibold mb-1">{t('inventory.tfDetailNotes')}</h4>
                    <p className="text-gray-600 bg-gray-50 rounded-lg p-3 text-sm">{selectedTransfer.notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500">{t('inventory.tfDateRequest')}</p><p className="font-medium">{formatDate(selectedTransfer.requestDate)}</p></div>
                  {selectedTransfer.approvedDate && <div><p className="text-gray-500">{t('inventory.tfDateApproved')}</p><p className="font-medium">{formatDate(selectedTransfer.approvedDate)}</p></div>}
                  {selectedTransfer.shippedDate && <div><p className="text-gray-500">{t('inventory.tfDateShipped')}</p><p className="font-medium">{formatDate(selectedTransfer.shippedDate)}</p></div>}
                  {selectedTransfer.receivedDate && <div><p className="text-gray-500">{t('inventory.tfDateReceived')}</p><p className="font-medium">{formatDate(selectedTransfer.receivedDate)}</p></div>}
                </div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">{t('inventory.tfClose')}</button>
                {selectedTransfer.status === 'pending' && (
                  <>
                    <button onClick={() => doAction(selectedTransfer.id, 'cancel', { reason: 'Rejected' })}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">{t('inventory.tfReject')}</button>
                    <button onClick={() => doAction(selectedTransfer.id, 'approve')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">{t('inventory.tfApprove')}</button>
                  </>
                )}
                {selectedTransfer.status === 'approved' && (
                  <button onClick={() => doAction(selectedTransfer.id, 'ship')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">{t('inventory.tfMarkShipped')}</button>
                )}
                {(selectedTransfer.status === 'in_transit' || selectedTransfer.status === 'shipped') && (
                  <button onClick={() => doAction(selectedTransfer.id, 'receive')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">{t('inventory.tfMarkReceived')}</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
