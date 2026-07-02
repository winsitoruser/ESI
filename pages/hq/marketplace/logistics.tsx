import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import HQLayout from '@/components/hq/HQLayout';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import {
  Truck, Package, Printer, MapPin, RefreshCw, Loader2, Search, Filter,
  ChevronDown, ChevronRight, CheckCircle, Clock, AlertTriangle, X,
  ArrowRight, Eye, Box, Download, Navigation, Shield, ExternalLink,
  ArrowLeft, Zap, Settings, Calendar, Phone, MapPinOff, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
const api = async (action: string, method = 'GET', body?: any, params?: Record<string, string>) => {
  const url = new URL('/api/hq/marketplace/logistics', window.location.origin);
  url.searchParams.set('action', action);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(url.toString(), opts);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json;
};

function timeAgo(d: string | null): string {
  if (!d) return '-';
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return 'Baru saja';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m lalu`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}j lalu`;
  return `${Math.floor(diff / 86400000)}h lalu`;
}
function formatRp(n: number) { return `Rp ${(n || 0).toLocaleString('id-ID')}`; }

const STATE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending:          { label: 'Menunggu',         color: 'bg-gray-100 text-gray-700',    icon: Clock },
  param_checked:    { label: 'Parameter Dicek',  color: 'bg-blue-100 text-blue-700',    icon: CheckCircle },
  arranged:         { label: 'Diatur',           color: 'bg-indigo-100 text-indigo-700', icon: Calendar },
  label_ready:      { label: 'Label Siap',       color: 'bg-purple-100 text-purple-700', icon: Printer },
  picked_up:        { label: 'Dijemput',         color: 'bg-cyan-100 text-cyan-700',     icon: Truck },
  in_transit:       { label: 'Dalam Perjalanan', color: 'bg-blue-100 text-blue-700',     icon: Navigation },
  out_for_delivery: { label: 'Sedang Diantar',   color: 'bg-amber-100 text-amber-700',   icon: MapPin },
  delivered:        { label: 'Terkirim',         color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  returned:         { label: 'Dikembalikan',     color: 'bg-red-100 text-red-700',       icon: ArrowLeft },
  cancelled:        { label: 'Dibatalkan',       color: 'bg-red-100 text-red-700',       icon: X },
};

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════
function LogisticsContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'print' | 'tracking' | 'settings'>('orders');

  // Overview stats
  const [stats, setStats] = useState<any>({ pendingShipment: 0, overdue: 0, todayShipped: 0, awbReady: 0 });
  const [stateBreakdown, setStateBreakdown] = useState<any[]>([]);
  const [courierBreakdown, setCourierBreakdown] = useState<any[]>([]);

  // Orders list
  const [orders, setOrders] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [filterState, setFilterState] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterCourier, setFilterCourier] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Arrange shipment modal
  const [arrangeModal, setArrangeModal] = useState<any>(null);
  const [shippingParams, setShippingParams] = useState<any>(null);
  const [arranging, setArranging] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<any>(null);
  const [selectedCounter, setSelectedCounter] = useState('');

  // Tracking modal
  const [trackingModal, setTrackingModal] = useState<any>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [syncingTracking, setSyncingTracking] = useState(false);

  // Bulk print
  const [selectedForPrint, setSelectedForPrint] = useState<number[]>([]);
  const [printLoading, setPrintLoading] = useState(false);
  const [printResult, setPrintResult] = useState<any>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const json = await api('overview');
      setStats(json.stats || {});
      setStateBreakdown(json.stateBreakdown || []);
      setCourierBreakdown(json.courierBreakdown || []);
    } catch { }
  }, []);

  const fetchOrders = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const p: Record<string, string> = { page: page.toString(), limit: '25' };
      if (filterState) p.shippingState = filterState;
      if (filterPlatform) p.platform = filterPlatform;
      if (filterCourier) p.courier = filterCourier;
      if (searchTerm) p.search = searchTerm;
      const json = await api('logistics-orders', 'GET', null, p);
      setOrders(json.orders || []);
      setPagination(json.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch { } finally { setLoading(false); }
  }, [filterState, filterPlatform, filterCourier, searchTerm]);

  useEffect(() => { setMounted(true); fetchOverview(); fetchOrders(); }, []);
  useEffect(() => { if (mounted) fetchOrders(); }, [filterState, filterPlatform, filterCourier]);

  // ── Arrange Shipment ──
  const openArrangeModal = async (order: any) => {
    setArrangeModal(order);
    setShippingParams(null);
    setSelectedMethod('');
    setSelectedTimeSlot(null);
    setSelectedCounter('');
    try {
      const json = await api('shipping-params', 'GET', null, { orderId: order.id.toString() });
      setShippingParams(json.params);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleArrangeShipment = async () => {
    if (!arrangeModal || !selectedMethod) return;
    setArranging(true);
    try {
      const json = await api('arrange-shipment', 'POST', {
        orderId: arrangeModal.id,
        method: selectedMethod,
        timeSlot: selectedTimeSlot,
        dropoffCounterId: selectedCounter,
      });
      toast.success(json.message);
      setArrangeModal(null);
      fetchOrders();
      fetchOverview();
    } catch (e: any) { toast.error(e.message); } finally { setArranging(false); }
  };

  // ── Tracking ──
  const openTrackingModal = async (order: any) => {
    setTrackingModal(order);
    setTrackingData(null);
    try {
      const json = await api('tracking', 'GET', null, { orderId: order.id.toString() });
      setTrackingData(json);
    } catch (e: any) { toast.error(e.message); }
  };

  const syncTracking = async (orderId: number) => {
    setSyncingTracking(true);
    try {
      const json = await api('sync-tracking', 'GET', null, { orderId: orderId.toString() });
      toast.success(json.message);
      setTrackingData(json);
    } catch (e: any) { toast.error(e.message); } finally { setSyncingTracking(false); }
  };

  // ── Bulk Print ──
  const togglePrintSelect = (id: number) => {
    setSelectedForPrint(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectAllForPrint = () => {
    const printable = orders.filter(o => o.tracking_number || o.booking_code).map(o => o.id);
    setSelectedForPrint(prev => prev.length === printable.length ? [] : printable);
  };

  const handleBulkPrint = async () => {
    if (selectedForPrint.length === 0) return toast.error('Pilih pesanan yang akan dicetak');
    setPrintLoading(true);
    try {
      const json = await api('bulk-awb', 'POST', { orderIds: selectedForPrint });
      setPrintResult(json);
      if (json.combinedHtml) {
        // Open print window
        const printWin = window.open('', '_blank', 'width=420,height=650');
        if (printWin) {
          printWin.document.write(json.combinedHtml);
          printWin.document.close();
          setTimeout(() => printWin.print(), 500);
        }
      }
      toast.success(`${json.success} label siap cetak`);
    } catch (e: any) { toast.error(e.message); } finally { setPrintLoading(false); }
  };

  const handleSinglePrint = async (orderId: number) => {
    try {
      const json = await api('get-awb', 'GET', null, { orderId: orderId.toString() });
      if (!json.available) return toast.error('Label belum tersedia');
      const html = json.documentHtml || (json.documentBase64 ? atob(json.documentBase64) : null);
      if (html) {
        const printWin = window.open('', '_blank', 'width=420,height=650');
        if (printWin) { printWin.document.write(html); printWin.document.close(); setTimeout(() => printWin.print(), 500); }
      } else if (json.documentUrl) {
        window.open(json.documentUrl, '_blank');
      }
    } catch (e: any) { toast.error(e.message); }
  };

  if (!mounted) return null;

  const tabs = [
    { id: 'orders' as const, label: 'Pesanan & Pengiriman', icon: Truck },
    { id: 'print' as const, label: 'Cetak Label (Bulk)', icon: Printer },
    { id: 'tracking' as const, label: 'Live Tracking', icon: Navigation },
    { id: 'settings' as const, label: 'Pengaturan', icon: Settings },
  ];

  return (
    <HQLayout title="Logistik Marketplace" subtitle="Atur pengiriman, cetak resi, & lacak paket — terintegrasi semua marketplace">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Perlu Diproses', value: stats.pendingShipment, icon: Package, color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { label: 'Overdue (Lewat Batas)', value: stats.overdue, icon: AlertTriangle, color: stats.overdue > 0 ? 'text-red-600 bg-red-50 border-red-200' : 'text-gray-600 bg-gray-50 border-gray-200' },
          { label: 'Dikirim Hari Ini', value: stats.todayShipped, icon: Truck, color: 'text-green-600 bg-green-50 border-green-200' },
          { label: 'Label Siap Cetak', value: stats.awbReady, icon: Printer, color: 'text-purple-600 bg-purple-50 border-purple-200' },
        ].map((s, i) => (
          <div key={i} className={`bg-white rounded-xl p-4 border shadow-sm ${s.color.split(' ').pop()}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${s.color.split(' ').slice(0, 2).join(' ')}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════ TAB: ORDERS ══════════════════ */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchOrders()}
                placeholder="Cari no. pesanan, resi, nama pembeli..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
            </div>
            <select value={filterState} onChange={e => setFilterState(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Semua Status Kirim</option>
              <option value="pending">Menunggu</option>
              <option value="param_checked">Parameter Dicek</option>
              <option value="arranged">Diatur</option>
              <option value="label_ready">Label Siap</option>
              <option value="picked_up">Dijemput</option>
              <option value="in_transit">Dalam Perjalanan</option>
              <option value="delivered">Terkirim</option>
            </select>
            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Semua Platform</option>
              <option value="shopee">Shopee</option>
              <option value="tokopedia">Tokopedia</option>
              <option value="lazada">Lazada</option>
              <option value="tiktok_shop">TikTok Shop</option>
            </select>
            <button onClick={() => fetchOrders()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {/* Courier Tags (quick filter) */}
          {courierBreakdown.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 py-1">Kurir:</span>
              {courierBreakdown.map((c: any, i: number) => (
                <button key={i} onClick={() => setFilterCourier(filterCourier === c.courier ? '' : c.courier)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filterCourier === c.courier ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                  }`} style={filterCourier === c.courier ? { backgroundColor: c.color } : {}}>
                  {c.tag || c.courier} ({c.count})
                </button>
              ))}
              {filterCourier && <button onClick={() => setFilterCourier('')} className="text-xs text-red-500 hover:underline ml-1">Reset</button>}
            </div>
          )}

          {/* Orders Table */}
          <div className="bg-white rounded-xl border overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">Tidak ada pesanan ditemukan</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-3 font-medium text-gray-600">Pesanan</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600">Sumber</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600">Pembeli</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600">Kurir</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600">Status Kirim</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600">No. Resi</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600">Batas Kirim</th>
                    <th className="text-right px-3 py-3 font-medium text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((o: any) => {
                    const stateInfo = STATE_LABELS[o.shipping_state] || STATE_LABELS.pending;
                    const StateIcon = stateInfo.icon;
                    return (
                      <tr key={o.id} className={`hover:bg-gray-50 ${o.isOverdue ? 'bg-red-50/50' : ''}`}>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-gray-900">{o.marketplace_order_id}</div>
                          <div className="text-gray-400">{o.item_count} item · {formatRp(o.total_amount)}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${o.courierColor}15`, color: o.courierColor }}>
                            {o.platform?.charAt(0).toUpperCase()}{o.platform?.slice(1)} {o.courierTag && o.courierTag !== o.platform ? `· ${o.courierTag}` : ''}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-900">{o.buyer_name || '-'}</span>
                            {o.isMaskedAddress && <MapPinOff className="w-3 h-3 text-amber-500" title="Alamat tersamarkan" />}
                            {o.isMaskedPhone && <Phone className="w-3 h-3 text-amber-500" title="Telepon tersamarkan" />}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-medium" style={{ color: o.courierColor }}>{o.courierTag || '-'}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${stateInfo.color}`}>
                            <StateIcon className="w-3 h-3" /> {stateInfo.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-gray-700">{o.tracking_number || <span className="text-gray-300">-</span>}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {o.ship_by_deadline ? (
                            <span className={`text-xs ${o.isOverdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                              {o.isOverdue && '⚠ '}{new Date(o.ship_by_deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {['pending', 'param_checked'].includes(o.shipping_state) && (
                              <button onClick={() => openArrangeModal(o)} className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700">
                                Atur Kirim
                              </button>
                            )}
                            {['arranged', 'label_ready'].includes(o.shipping_state) && (
                              <button onClick={() => handleSinglePrint(o.id)} className="px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-medium hover:bg-purple-700 flex items-center gap-0.5">
                                <Printer className="w-3 h-3" /> Cetak
                              </button>
                            )}
                            {o.tracking_number && (
                              <button onClick={() => openTrackingModal(o)} className="px-2 py-1 border border-gray-300 rounded text-[10px] font-medium hover:bg-gray-100 flex items-center gap-0.5">
                                <Navigation className="w-3 h-3" /> Lacak
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Menampilkan {orders.length} dari {pagination.total} pesanan</span>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(pagination.totalPages, 10) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => fetchOrders(p)}
                    className={`px-2.5 py-1 rounded ${p === pagination.page ? 'bg-blue-600 text-white' : 'border hover:bg-gray-100'}`}>{p}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ TAB: BULK PRINT ══════════════════ */}
      {activeTab === 'print' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><Printer className="w-5 h-5 text-purple-500" /> Cetak Label Massal (Thermal 10×15cm)</h3>
                <p className="text-xs text-gray-500 mt-1">Pilih pesanan yang sudah memiliki resi, lalu cetak semua sekaligus ke printer thermal</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={selectAllForPrint} className="text-xs text-blue-600 hover:underline">
                  {selectedForPrint.length > 0 ? 'Batal Pilih' : 'Pilih Semua'}
                </button>
                <button onClick={handleBulkPrint} disabled={printLoading || selectedForPrint.length === 0}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                  {printLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  Cetak {selectedForPrint.length > 0 ? `(${selectedForPrint.length})` : ''} Label
                </button>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 text-xs text-purple-800">
              <strong>Tips:</strong> Pastikan printer thermal diatur ke ukuran kertas 100mm × 150mm (4×6 inch). Cocok untuk SPX, JNE, J&T, SiCepat, dan kurir lainnya.
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {orders.filter(o => o.tracking_number || o.booking_code).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Tidak ada pesanan dengan resi yang siap dicetak. Atur pengiriman terlebih dahulu.</p>
              ) : (
                orders.filter(o => o.tracking_number || o.booking_code).map((o: any) => (
                  <label key={o.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedForPrint.includes(o.id) ? 'bg-purple-50 border-purple-300' : 'hover:bg-gray-50 border-gray-200'
                  }`}>
                    <input type="checkbox" checked={selectedForPrint.includes(o.id)} onChange={() => togglePrintSelect(o.id)} className="rounded text-purple-600" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{o.marketplace_order_id}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${o.courierColor}15`, color: o.courierColor }}>
                          {o.courierTag}
                        </span>
                        <span className="text-xs text-gray-500">{o.platform}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Resi: <span className="font-mono">{o.tracking_number || o.booking_code}</span> · {o.buyer_name}
                        {o.isMaskedAddress && <span className="ml-1 text-amber-500">(alamat sensor)</span>}
                      </div>
                    </div>
                    <button onClick={(e) => { e.preventDefault(); handleSinglePrint(o.id); }}
                      className="px-2 py-1 border rounded text-[10px] font-medium hover:bg-gray-100 flex items-center gap-0.5">
                      <Eye className="w-3 h-3" /> Preview
                    </button>
                  </label>
                ))
              )}
            </div>
          </div>

          {printResult && (
            <div className="bg-white rounded-xl border p-4">
              <h4 className="font-semibold text-sm mb-2">Hasil Cetak</h4>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">✓ {printResult.success} berhasil</span>
                {printResult.failed > 0 && <span className="text-red-600">✗ {printResult.failed} gagal</span>}
              </div>
              {printResult.errors?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {printResult.errors.map((e: any, i: number) => (
                    <div key={i} className="text-xs text-red-500">Order #{e.orderId}: {e.error}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ TAB: LIVE TRACKING ══════════════════ */}
      {activeTab === 'tracking' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Live Tracking</h3>
              <p className="text-xs text-gray-500">Lacak posisi paket langsung dari ERP tanpa buka aplikasi marketplace</p>
            </div>
            <button onClick={async () => {
              try {
                const json = await api('bulk-sync-tracking', 'POST', {});
                toast.success(json.message);
                fetchOrders();
              } catch (e: any) { toast.error(e.message); }
            }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Sync Semua Tracking
            </button>
          </div>

          <div className="space-y-3">
            {orders.filter(o => o.tracking_number && ['picked_up', 'in_transit', 'out_for_delivery', 'arranged', 'label_ready'].includes(o.shipping_state)).length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">Tidak ada paket yang sedang dalam perjalanan</div>
            ) : (
              orders.filter(o => o.tracking_number && ['picked_up', 'in_transit', 'out_for_delivery', 'arranged', 'label_ready'].includes(o.shipping_state)).map((o: any) => {
                const stateInfo = STATE_LABELS[o.shipping_state] || STATE_LABELS.pending;
                const StateIcon = stateInfo.icon;
                return (
                  <div key={o.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${o.courierColor}15` }}>
                          <Truck className="w-5 h-5" style={{ color: o.courierColor }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm">{o.marketplace_order_id}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${stateInfo.color}`}>
                              <StateIcon className="w-3 h-3" /> {stateInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <span className="font-mono">{o.tracking_number}</span>
                            <span>·</span>
                            <span style={{ color: o.courierColor, fontWeight: 600 }}>{o.courierTag}</span>
                            <span>·</span>
                            <span>{o.buyer_name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {o.last_event_description && (
                          <div className="text-right mr-3 max-w-[250px]">
                            <p className="text-xs text-gray-700 truncate">{o.last_event_description}</p>
                            <p className="text-[10px] text-gray-400">{timeAgo(o.last_event_time)}</p>
                          </div>
                        )}
                        <button onClick={() => openTrackingModal(o)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 flex items-center gap-1">
                          <Navigation className="w-3.5 h-3.5" /> Detail
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ TAB: SETTINGS ══════════════════ */}
      {activeTab === 'settings' && <LogisticsSettings />}

      {/* ══════════════════ ARRANGE SHIPMENT MODAL ══════════════════ */}
      {arrangeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setArrangeModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Atur Pengiriman</h3>
                <p className="text-xs text-gray-500 mt-0.5">Pesanan: {arrangeModal.marketplace_order_id}</p>
              </div>
              <button onClick={() => setArrangeModal(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              {!shippingParams ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /><span className="ml-2 text-sm text-gray-500">Mengecek parameter pengiriman...</span></div>
              ) : (
                <>
                  {/* Platform notes */}
                  {shippingParams.notes?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      {shippingParams.notes.join(' · ')}
                    </div>
                  )}

                  <div className="text-sm text-gray-700">
                    <strong>Kurir:</strong> {shippingParams.courier} ({arrangeModal.platform})
                  </div>

                  {/* Method selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 block">Pilih Metode Pengiriman</label>
                    {shippingParams.methods?.map((m: any) => (
                      <button key={m.method} disabled={!m.available} onClick={() => { setSelectedMethod(m.method); setSelectedTimeSlot(null); setSelectedCounter(''); }}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                          selectedMethod === m.method ? 'border-blue-600 bg-blue-50' : m.available ? 'border-gray-200 hover:border-gray-400' : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        }`}>
                        <div className="flex items-center gap-2">
                          {m.method === 'pickup' ? <Truck className="w-4 h-4 text-blue-600" /> : <MapPin className="w-4 h-4 text-green-600" />}
                          <span className="font-medium text-sm">{m.label}</span>
                          {!m.available && <span className="text-[10px] text-red-500 ml-auto">{m.reason || 'Tidak tersedia'}</span>}
                        </div>
                        {m.method === 'pickup' && m.address && <p className="text-xs text-gray-500 mt-1 ml-6">{m.address}</p>}
                      </button>
                    ))}
                  </div>

                  {/* Time slot for pickup */}
                  {selectedMethod === 'pickup' && shippingParams.methods?.find((m: any) => m.method === 'pickup')?.timeSlots?.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700 block">Jadwal Penjemputan</label>
                      <div className="grid grid-cols-2 gap-2">
                        {shippingParams.methods.find((m: any) => m.method === 'pickup').timeSlots.map((ts: any, i: number) => (
                          <button key={i} onClick={() => setSelectedTimeSlot(ts)}
                            className={`p-2 rounded-lg border text-xs text-left ${
                              selectedTimeSlot === ts ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-400 text-gray-700'
                            }`}>
                            <Calendar className="w-3 h-3 inline mr-1" /> {ts.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Counter selection for dropoff */}
                  {selectedMethod === 'dropoff' && shippingParams.methods?.find((m: any) => m.method === 'dropoff')?.counters?.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700 block">Pilih Counter / Agen</label>
                      {shippingParams.methods.find((m: any) => m.method === 'dropoff').counters.map((c: any) => (
                        <button key={c.id} onClick={() => setSelectedCounter(c.id)}
                          className={`w-full text-left p-3 rounded-lg border ${
                            selectedCounter === c.id ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-400'
                          }`}>
                          <div className="font-medium text-sm">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.address}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-5 border-t flex justify-end gap-2">
              <button onClick={() => setArrangeModal(null)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={handleArrangeShipment} disabled={!selectedMethod || arranging}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {arranging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                {selectedMethod === 'pickup' ? 'Jadwalkan Pickup' : selectedMethod === 'dropoff' ? 'Konfirmasi Drop-off' : 'Atur Pengiriman'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ TRACKING DETAIL MODAL ══════════════════ */}
      {trackingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setTrackingModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Detail Tracking</h3>
                <p className="text-xs text-gray-500 mt-0.5">{trackingModal.marketplace_order_id} · Resi: <span className="font-mono">{trackingModal.tracking_number}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => syncTracking(trackingModal.id)} disabled={syncingTracking}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 flex items-center gap-1">
                  {syncingTracking ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Sync
                </button>
                <button onClick={() => setTrackingModal(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="p-5">
              {!trackingData ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : (
                <div className="space-y-4">
                  {/* Status summary */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${STATE_LABELS[trackingData.logisticsStatus]?.color || 'bg-gray-100'}`}>
                      {(() => { const I = STATE_LABELS[trackingData.logisticsStatus]?.icon || Clock; return <I className="w-5 h-5" />; })()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{STATE_LABELS[trackingData.logisticsStatus]?.label || trackingData.logisticsStatus}</p>
                      <p className="text-xs text-gray-500">{trackingData.courier} · {trackingData.platform}</p>
                    </div>
                  </div>

                  {/* Data redaction warning */}
                  {(trackingData.isAddressMasked || trackingData.isPhoneMasked) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-center gap-2">
                      <Shield className="w-4 h-4 flex-shrink-0" />
                      <div>
                        <strong>Data Tersamarkan:</strong>
                        {trackingData.isAddressMasked && ' Alamat'}
                        {trackingData.isAddressMasked && trackingData.isPhoneMasked && ' &'}
                        {trackingData.isPhoneMasked && ' No. telepon'}
                        {' '}pembeli disamarkan oleh platform (kebijakan privasi marketplace).
                      </div>
                    </div>
                  )}

                  {/* Tracking timeline */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase">Riwayat Perjalanan</h4>
                    {(trackingData.events || []).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">Belum ada data tracking</p>
                    ) : (
                      <div className="relative pl-6">
                        <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200" />
                        {[...(trackingData.events || [])].reverse().map((ev: any, i: number) => (
                          <div key={i} className="relative mb-4 last:mb-0">
                            <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 ${
                              i === 0 ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                            }`} />
                            <div className="ml-2">
                              <p className={`text-sm ${i === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{ev.description}</p>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                <span>{new Date(ev.time).toLocaleString('id-ID')}</span>
                                {ev.location && <><span>·</span><span>{ev.location}</span></>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {trackingData.lastSyncAt && (
                    <p className="text-[10px] text-gray-400 text-center">Terakhir sync: {new Date(trackingData.lastSyncAt).toLocaleString('id-ID')} ({trackingData.syncCount}x)</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}

// ═══════════════════════════════════════════════
// LOGISTICS SETTINGS SUB-COMPONENT
// ═══════════════════════════════════════════════
function LogisticsSettings() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('logistics-settings').then(json => setSettings(json.settings || {})).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api('logistics-settings', 'PUT', settings);
      toast.success('Pengaturan logistik tersimpan');
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const update = (key: string, value: any) => setSettings((p: any) => ({ ...p, [key]: value }));

  if (loading) return <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-5">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-gray-400" /> Pengiriman</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Default Metode Kirim</label>
            <select value={settings.default_shipping_method || 'pickup'} onChange={e => update('default_shipping_method', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="pickup">Pickup (Dijemput Kurir)</option>
              <option value="dropoff">Drop-off (Antar ke Counter)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Auto Arrange Shipment</label>
            <p className="text-[10px] text-gray-400 mb-1">Otomatis atur pengiriman saat order masuk</p>
            <Toggle checked={settings.auto_arrange_shipment ?? false} onChange={v => update('auto_arrange_shipment', v)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Alamat Pickup Default</label>
            <textarea value={settings.pickup_address_default || ''} onChange={e => update('pickup_address_default', e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Alamat gudang / toko..." />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Printer className="w-5 h-5 text-gray-400" /> Label / Resi</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Ukuran Label</label>
            <select value={settings.awb_label_size || '10x15'} onChange={e => update('awb_label_size', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="10x15">10 × 15 cm (Thermal Standard)</option>
              <option value="A6">A6 (10.5 × 14.8 cm)</option>
              <option value="A5">A5 (14.8 × 21 cm)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Format Label</label>
            <select value={settings.awb_label_format || 'thermal'} onChange={e => update('awb_label_format', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="thermal">Thermal Printer</option>
              <option value="a4">A4 Inkjet/Laser</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Auto Print AWB</label>
            <p className="text-[10px] text-gray-400 mb-1">Otomatis cetak setelah arrange shipment</p>
            <Toggle checked={settings.auto_print_awb ?? false} onChange={v => update('auto_print_awb', v)} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Navigation className="w-5 h-5 text-gray-400" /> Tracking & Integrasi</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Interval Sync Tracking (menit)</label>
            <input type="number" min={5} max={1440} value={settings.tracking_sync_interval_minutes || 30}
              onChange={e => update('tracking_sync_interval_minutes', parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Auto Update ERP saat Delivered</label>
            <p className="text-[10px] text-gray-400 mb-1">Otomatis ubah status order ERP saat paket terkirim</p>
            <Toggle checked={settings.auto_update_erp_on_delivered ?? true} onChange={v => update('auto_update_erp_on_delivered', v)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Tampilkan Data Tersamarkan</label>
            <p className="text-[10px] text-gray-400 mb-1">Tunjukkan indikator alamat/telepon yang disensor platform</p>
            <Toggle checked={settings.enable_data_redaction_display ?? true} onChange={v => update('enable_data_redaction_display', v)} />
          </div>
        </div>
      </div>

      {/* Reference Table */}
      <div className="bg-white rounded-xl border p-5">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-gray-400" /> Referensi API Logistik per Marketplace</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Marketplace</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Endpoint Utama</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Format Resi</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Hal Unik</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium">🟠 Shopee</td>
                <td className="px-4 py-2.5 font-mono text-[10px]">v2.logistics.ship_order</td>
                <td className="px-4 py-2.5">PDF / Thermal</td>
                <td className="px-4 py-2.5 text-gray-500">Butuh shipping_parameter di awal</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium">🟢 Tokopedia</td>
                <td className="px-4 py-2.5 font-mono text-[10px]">Arrange Shipment</td>
                <td className="px-4 py-2.5">PDF</td>
                <td className="px-4 py-2.5 text-gray-500">Integrasi ketat dengan TikTok Shop</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium">🔵 Lazada</td>
                <td className="px-4 py-2.5 font-mono text-[10px]">/order/package/document/get</td>
                <td className="px-4 py-2.5">HTML / Base64</td>
                <td className="px-4 py-2.5 text-gray-500">Harus lewat status Pack dulu</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium">⚫ TikTok Shop</td>
                <td className="px-4 py-2.5 font-mono text-[10px]">/fulfillment/ship_order</td>
                <td className="px-4 py-2.5">PDF</td>
                <td className="px-4 py-2.5 text-gray-500">Instant/Same Day = Pickup only</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />} Simpan Pengaturan
        </button>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function LogisticsPage() {
  return (
    <ModuleGuard moduleCode="marketplace_integration">
      <LogisticsContent />
    </ModuleGuard>
  );
}
