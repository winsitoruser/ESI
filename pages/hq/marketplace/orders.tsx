import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import {
  ShoppingCart, Search, Download, Loader2, Package, Truck, Printer,
  CheckCircle, XCircle, Clock, Filter, RefreshCw, Eye, X, DollarSign,
  AlertTriangle, ArrowRight, FileText, ChevronDown, BarChart3,
  Ban, CheckCircle2, ArrowUpDown, ExternalLink, MapPin, User, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rowsOr, MOCK_MP_ORDERS, MOCK_MP_CHANNELS } from '@/lib/hq/mock-data';

const api = async (action: string, method = 'GET', body?: any, params?: Record<string, string>) => {
  const url = new URL('/api/hq/marketplace', window.location.origin);
  url.searchParams.set('action', action);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(url.toString(), opts);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json;
};

function formatRp(n: number): string { return `Rp ${(n || 0).toLocaleString('id-ID')}`; }

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: 'Baru', color: 'bg-blue-100 text-blue-700', icon: Clock },
  pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  paid: { label: 'Dibayar', color: 'bg-green-100 text-green-700', icon: CreditCard },
  processing: { label: 'Diproses', color: 'bg-indigo-100 text-indigo-700', icon: Package },
  ready_to_ship: { label: 'Siap Kirim', color: 'bg-purple-100 text-purple-700', icon: Package },
  shipped: { label: 'Dikirim', color: 'bg-cyan-100 text-cyan-700', icon: Truck },
  delivered: { label: 'Diterima', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  completed: { label: 'Selesai', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700', icon: Ban },
};

const PLATFORMS: Record<string, { name: string; icon: string; color: string }> = {
  tokopedia: { name: 'Tokopedia', icon: '🟢', color: '#42b549' },
  shopee: { name: 'Shopee', icon: '🟠', color: '#ee4d2d' },
  lazada: { name: 'Lazada', icon: '🔵', color: '#0f146d' },
  bukalapak: { name: 'Bukalapak', icon: '🔴', color: '#e31e52' },
  tiktok_shop: { name: 'TikTok Shop', icon: '⚫', color: '#000000' },
  blibli: { name: 'Blibli', icon: '🔷', color: '#0095da' },
};

function OrdersContent() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'shipping' | 'cancellation'>('orders');
  const [orders, setOrders] = useState<any[]>(MOCK_MP_ORDERS);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pulling, setPulling] = useState(false);
  const [channels, setChannels] = useState<any[]>(MOCK_MP_CHANNELS);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [financeBreakdown, setFinanceBreakdown] = useState<any>(null);
  const [selectedForShipping, setSelectedForShipping] = useState<Set<number>>(new Set());

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const json = await api('orders', 'GET', null, params);
      setOrders(rowsOr(json.orders, MOCK_MP_ORDERS));
    } catch { } finally { setLoading(false); }
  }, [statusFilter]);

  const fetchChannels = useCallback(async () => {
    try {
      const json = await api('dashboard');
      const ch = (json.data?.channels || []).filter((c: any) => c.status === 'connected');
      setChannels(rowsOr(ch, MOCK_MP_CHANNELS));
    } catch { }
  }, []);

  useEffect(() => { setMounted(true); fetchOrders(); fetchChannels(); }, [fetchOrders, fetchChannels]);

  const handlePullOrders = async (channelId: string | number) => {
    setPulling(true);
    try {
      const json = await api('pull-orders', 'POST', { channelId });
      toast.success(json.message);
      fetchOrders();
    } catch (e: any) { toast.error(e.message); } finally { setPulling(false); }
  };

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    try {
      await api('update-order-status', 'POST', { orderId, newStatus });
      toast.success(`Status diubah ke ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      fetchOrders();
      if (selectedOrder?.id === orderId) viewOrderDetail(orderId);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCancelOrder = async (orderId: number, reason: string) => {
    try {
      await api('cancel-order', 'POST', { orderId, reason });
      toast.success('Order dibatalkan, stok dikembalikan');
      fetchOrders();
      setSelectedOrder(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAcceptCancel = async (orderId: number) => {
    try {
      await api('accept-cancel', 'POST', { orderId });
      toast.success('Pembatalan diterima');
      fetchOrders();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleBulkShipping = async () => {
    if (selectedForShipping.size === 0) { toast.error('Pilih order terlebih dahulu'); return; }
    try {
      const json = await api('bulk-shipping', 'POST', { orderIds: Array.from(selectedForShipping) });
      toast.success(`${json.total} label resi siap`);
      // In production: open print dialog with labels
      console.log('Shipping labels:', json.labels);
    } catch (e: any) { toast.error(e.message); }
  };

  const viewOrderDetail = async (orderId: number) => {
    try {
      const [detailJson, financeJson] = await Promise.all([
        api('order-detail', 'GET', null, { orderId: orderId.toString() }),
        api('order-finance', 'GET', null, { orderId: orderId.toString() }),
      ]);
      setSelectedOrder(detailJson.order);
      setOrderDetail(detailJson);
      setFinanceBreakdown(financeJson.breakdown);
    } catch (e: any) { toast.error(e.message); }
  };

  if (!mounted) return null;

  // Filter orders
  let filteredOrders = orders;
  if (platformFilter) filteredOrders = filteredOrders.filter(o => o.platform === platformFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredOrders = filteredOrders.filter(o =>
      o.marketplace_order_id?.toLowerCase().includes(q) ||
      o.buyer_name?.toLowerCase().includes(q) ||
      o.tracking_number?.toLowerCase().includes(q)
    );
  }

  const cancelledOrders = orders.filter(o => o.order_status === 'cancelled');
  const readyToShipOrders = orders.filter(o => ['ready_to_ship', 'processing'].includes(o.order_status));

  // Status counts
  const statusCounts: Record<string, number> = {};
  orders.forEach(o => { statusCounts[o.order_status] = (statusCounts[o.order_status] || 0) + 1; });

  const tabs = [
    { id: 'orders' as const, label: 'Semua Pesanan', icon: ShoppingCart, count: orders.length },
    { id: 'shipping' as const, label: 'Cetak Resi', icon: Printer, count: readyToShipOrders.length },
    { id: 'cancellation' as const, label: 'Pembatalan', icon: Ban, count: cancelledOrders.length },
  ];

  return (
    <HQLayout title="Order Marketplace" subtitle="Kelola pesanan dari semua marketplace dalam satu tampilan">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
            {t.count > 0 && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">{t.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Status Summary Cards */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 text-xs rounded-full border whitespace-nowrap ${!statusFilter ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              Semua ({orders.length})
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = statusCounts[key] || 0;
              if (count === 0) return null;
              return (
                <button key={key} onClick={() => setStatusFilter(key)} className={`px-3 py-1.5 text-xs rounded-full border whitespace-nowrap ${statusFilter === key ? 'bg-blue-600 text-white border-blue-600' : `border-gray-300 text-gray-600 hover:bg-gray-50`}`}>
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Filters & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input placeholder="Cari order ID, pembeli, resi..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm" />
            </div>
            <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} className="text-sm border rounded-lg px-3 py-2.5">
              <option value="">Semua Platform</option>
              {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
            {channels.map(ch => (
              <button key={ch.id} onClick={() => handlePullOrders(ch.id)} disabled={pulling}
                className="text-sm px-3 py-2.5 border rounded-lg hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50">
                {pulling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Pull {ch.name}
              </button>
            ))}
          </div>

          {/* Orders Table */}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <ShoppingCart className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">Belum ada pesanan</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Sumber</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Order ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Pembeli</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Item</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Resi</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.map(o => {
                    const p = PLATFORMS[o.platform] || { name: o.platform, icon: '📦', color: '#666' };
                    const sc = STATUS_CONFIG[o.order_status] || { label: o.order_status, color: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={o.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => viewOrderDetail(o.id)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg" title={p.name}>{p.icon}</span>
                            <span className="text-xs text-gray-500">{o.shop_name || ''}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{o.marketplace_order_id}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{o.buyer_name || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatRp(o.total_amount)}</td>
                        <td className="px-4 py-3 text-center text-xs">{o.item_count || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono">{o.tracking_number || '-'}</td>
                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                          {o.order_status === 'new' || o.order_status === 'paid' ? (
                            <button onClick={() => handleStatusUpdate(o.id, 'processing')} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">Proses</button>
                          ) : o.order_status === 'processing' ? (
                            <button onClick={() => handleStatusUpdate(o.id, 'ready_to_ship')} className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700">Kemas</button>
                          ) : o.order_status === 'ready_to_ship' ? (
                            <button onClick={() => handleStatusUpdate(o.id, 'shipped')} className="text-xs px-2 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700">Kirim</button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SHIPPING TAB */}
      {activeTab === 'shipping' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Cetak Resi Massal</h3>
              <p className="text-xs text-gray-500">Pilih order yang siap kirim, lalu cetak resi sekaligus</p>
            </div>
            <button onClick={handleBulkShipping} disabled={selectedForShipping.size === 0}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
              <Printer className="w-4 h-4" /> Cetak Resi ({selectedForShipping.size})
            </button>
          </div>

          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox"
                      checked={selectedForShipping.size === readyToShipOrders.length && readyToShipOrders.length > 0}
                      onChange={() => {
                        if (selectedForShipping.size === readyToShipOrders.length) setSelectedForShipping(new Set());
                        else setSelectedForShipping(new Set(readyToShipOrders.map(o => o.id)));
                      }} className="rounded" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Platform</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Order ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Pembeli</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kurir</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">No. Resi</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {readyToShipOrders.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400 text-sm">Tidak ada order siap kirim</td></tr>
                ) : readyToShipOrders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedForShipping.has(o.id)}
                        onChange={e => { const s = new Set(selectedForShipping); e.target.checked ? s.add(o.id) : s.delete(o.id); setSelectedForShipping(s); }} className="rounded" />
                    </td>
                    <td className="px-4 py-3"><span className="text-lg">{PLATFORMS[o.platform]?.icon || '📦'}</span></td>
                    <td className="px-4 py-3 font-mono text-xs">{o.marketplace_order_id}</td>
                    <td className="px-4 py-3">{o.buyer_name || '-'}</td>
                    <td className="px-4 py-3 text-xs">{o.shipping_courier || '-'}</td>
                    <td className="px-4 py-3 text-center text-xs font-mono">{o.tracking_number || <span className="text-gray-400">PENDING</span>}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[o.order_status]?.color || 'bg-gray-100'}`}>
                        {STATUS_CONFIG[o.order_status]?.label || o.order_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CANCELLATION TAB */}
      {activeTab === 'cancellation' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Manajemen Pembatalan</h3>
          <p className="text-xs text-gray-500">Kelola permintaan pembatalan dari pembeli marketplace. Stok akan otomatis dikembalikan saat pembatalan diterima.</p>

          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Platform</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Order ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Pembeli</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Alasan</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cancelledOrders.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm">Tidak ada pembatalan</td></tr>
                ) : cancelledOrders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><span className="text-lg">{PLATFORMS[o.platform]?.icon || '📦'}</span> <span className="text-xs">{o.shop_name}</span></td>
                    <td className="px-4 py-3 font-mono text-xs">{o.marketplace_order_id}</td>
                    <td className="px-4 py-3">{o.buyer_name || '-'}</td>
                    <td className="px-4 py-3 text-right">{formatRp(o.total_amount)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{o.cancel_reason || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => viewOrderDetail(o.id)} className="text-xs text-blue-600 hover:underline">Detail</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedOrder(null); setFinanceBreakdown(null); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-xl">{PLATFORMS[selectedOrder.platform]?.icon || '📦'}</span>
                  Order #{selectedOrder.marketplace_order_id}
                </h3>
                <p className="text-xs text-gray-500">{selectedOrder.shop_name} · {new Date(selectedOrder.created_at).toLocaleString('id-ID')}</p>
              </div>
              <button onClick={() => { setSelectedOrder(null); setFinanceBreakdown(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* Status + Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1 text-sm rounded-full font-medium ${STATUS_CONFIG[selectedOrder.order_status]?.color || 'bg-gray-100'}`}>
                  {STATUS_CONFIG[selectedOrder.order_status]?.label || selectedOrder.order_status}
                </span>
                {selectedOrder.order_status !== 'cancelled' && selectedOrder.order_status !== 'completed' && (
                  <>
                    {['new', 'paid'].includes(selectedOrder.order_status) && (
                      <button onClick={() => handleStatusUpdate(selectedOrder.id, 'processing')} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg">Proses Pesanan</button>
                    )}
                    {selectedOrder.order_status === 'processing' && (
                      <button onClick={() => handleStatusUpdate(selectedOrder.id, 'ready_to_ship')} className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg">Siap Kirim</button>
                    )}
                    {selectedOrder.order_status === 'ready_to_ship' && (
                      <button onClick={() => handleStatusUpdate(selectedOrder.id, 'shipped')} className="text-xs px-3 py-1.5 bg-cyan-600 text-white rounded-lg">Kirim</button>
                    )}
                    <button onClick={() => { const reason = prompt('Alasan pembatalan:'); if (reason) handleCancelOrder(selectedOrder.id, reason); }}
                      className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 ml-auto">
                      <Ban className="w-3 h-3 inline mr-1" /> Batalkan
                    </button>
                  </>
                )}
              </div>

              {/* Buyer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><User className="w-3 h-3" /> Pembeli</h5>
                  <p className="font-medium text-gray-900">{selectedOrder.buyer_name || '-'}</p>
                  <p className="text-xs text-gray-500">{selectedOrder.buyer_phone || '-'}</p>
                  <p className="text-xs text-gray-500">{selectedOrder.buyer_email || ''}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Alamat Pengiriman</h5>
                  <p className="text-sm text-gray-700">{selectedOrder.shipping_address || '-'}</p>
                  <p className="text-xs text-gray-500 mt-1">{[selectedOrder.shipping_city, selectedOrder.shipping_province, selectedOrder.shipping_postal_code].filter(Boolean).join(', ')}</p>
                </div>
              </div>

              {/* Shipping */}
              {selectedOrder.tracking_number && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                  <h5 className="text-xs font-semibold text-cyan-800 uppercase mb-1 flex items-center gap-1"><Truck className="w-3 h-3" /> Pengiriman</h5>
                  <p className="text-sm"><span className="text-gray-600">Kurir:</span> <span className="font-medium">{selectedOrder.shipping_courier || '-'}</span></p>
                  <p className="text-sm"><span className="text-gray-600">Resi:</span> <span className="font-mono font-medium">{selectedOrder.tracking_number}</span></p>
                </div>
              )}

              {/* Items */}
              {orderDetail?.items && (
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Item Pesanan ({orderDetail.items.length})</h5>
                  <div className="bg-white border rounded-lg divide-y">
                    {orderDetail.items.map((item: any, i: number) => (
                      <div key={i} className="p-3 flex items-center gap-3 text-sm">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          <p className="text-xs text-gray-400">
                            MP SKU: {item.marketplace_sku || '-'}
                            {item.erp_product_name && <> · ERP: {item.erp_product_name} ({item.erp_sku})</>}
                          </p>
                        </div>
                        <span className="text-gray-500">×{item.quantity}</span>
                        <span className="font-medium">{formatRp(item.unit_price)}</span>
                        <span className="font-bold">{formatRp(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Finance Breakdown — Tax & Admin Fee Deduction */}
              {financeBreakdown && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Breakdown Keuangan</h5>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Subtotal Produk</span><span>{formatRp(financeBreakdown.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Ongkir</span><span>{formatRp(financeBreakdown.shippingCost)}</span></div>
                    {financeBreakdown.insuranceCost > 0 && <div className="flex justify-between"><span className="text-gray-600">Asuransi</span><span>{formatRp(financeBreakdown.insuranceCost)}</span></div>}
                    {financeBreakdown.marketplaceDiscount > 0 && <div className="flex justify-between text-green-600"><span>Diskon Marketplace</span><span>-{formatRp(financeBreakdown.marketplaceDiscount)}</span></div>}
                    {financeBreakdown.sellerDiscount > 0 && <div className="flex justify-between text-green-600"><span>Diskon Seller</span><span>-{formatRp(financeBreakdown.sellerDiscount)}</span></div>}
                    <div className="border-t pt-1.5 flex justify-between font-semibold"><span>Total Pembeli</span><span>{formatRp(financeBreakdown.totalAmount)}</span></div>
                    {financeBreakdown.platformFee > 0 && <div className="flex justify-between text-red-600"><span>Biaya Admin Marketplace</span><span>-{formatRp(financeBreakdown.platformFee)}</span></div>}
                    <div className="flex justify-between font-semibold text-blue-700"><span>Payout ke Seller</span><span>{formatRp(financeBreakdown.sellerPayout)}</span></div>
                    <div className="border-t pt-1.5">
                      <div className="flex justify-between text-gray-500"><span>HPP (COGS)</span><span>{formatRp(financeBreakdown.totalCOGS)}</span></div>
                      <div className={`flex justify-between font-bold ${financeBreakdown.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        <span>Gross Profit</span><span>{formatRp(financeBreakdown.grossProfit)} ({financeBreakdown.grossMargin}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}

export default function OrdersPage() {
  return (
    <ModuleGuard moduleCode="marketplace_integration">
      <OrdersContent />
    </ModuleGuard>
  );
}
