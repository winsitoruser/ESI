import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import {
  Package, Search, Zap, Layers, Trash2, CheckCircle, CheckCircle2, XCircle,
  Loader2, ArrowUpDown, Box, DollarSign, AlertTriangle, Upload, Download,
  Filter, ChevronDown, RefreshCw, Eye, ArrowRight, Tag, BarChart3,
  Warehouse, Shield, AlertCircle, MapPin, Settings, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

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
function timeAgo(d: string | null): string {
  if (!d) return '-';
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return 'Baru saja';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m lalu`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}j lalu`;
  return `${Math.floor(diff / 86400000)}h lalu`;
}

const STATUS_COLORS: Record<string, string> = {
  synced: 'bg-green-100 text-green-700', error: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700', mapped: 'bg-blue-100 text-blue-700',
};

function ProductsContent() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'mapping' | 'price' | 'category' | 'sync' | 'validation'>('mapping');
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchChannels = useCallback(async () => {
    try {
      const json = await api('dashboard');
      const chs = (json.data?.channels || []).filter((c: any) => c.status === 'connected');
      setChannels(chs);
      if (chs.length && !selectedChannel) setSelectedChannel(chs[0].id.toString());
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { setMounted(true); fetchChannels(); }, [fetchChannels]);
  if (!mounted) return null;

  const tabs = [
    { id: 'mapping' as const, label: 'Product Mapping', icon: Layers },
    { id: 'price' as const, label: 'Harga Marketplace', icon: DollarSign },
    { id: 'category' as const, label: 'Kategori', icon: Tag },
    { id: 'sync' as const, label: 'Sync Monitor', icon: ArrowUpDown },
    { id: 'validation' as const, label: 'Validasi', icon: Shield },
  ];

  return (
    <HQLayout title="Sync Produk" subtitle="Mapping, harga, kategori, dan validasi produk marketplace">
      {/* Channel Selector + Tabs */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 flex-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
        <select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)} className="text-sm border rounded-lg px-3 py-2">
          {channels.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.shopName ? `(${c.shopName})` : ''}</option>)}
          {channels.length === 0 && <option value="">Tidak ada channel</option>}
        </select>
      </div>

      {activeTab === 'mapping' && <MappingTab channelId={selectedChannel} onRefresh={fetchChannels} />}
      {activeTab === 'price' && <PriceTab channelId={selectedChannel} />}
      {activeTab === 'category' && <CategoryTab channelId={selectedChannel} />}
      {activeTab === 'sync' && <SyncMonitorTab />}
      {activeTab === 'validation' && <ValidationTab channelId={selectedChannel} />}
    </HQLayout>
  );
}

// ═══════════════════════════════════════════════
// MAPPING TAB — Dual-panel with bulk operations
// ═══════════════════════════════════════════════
function MappingTab({ channelId, onRefresh }: { channelId: string; onRefresh: () => void }) {
  const [mappings, setMappings] = useState<any[]>([]);
  const [unmapped, setUnmapped] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [autoMapping, setAutoMapping] = useState(false);
  const [selectedUnmapped, setSelectedUnmapped] = useState<Set<number>>(new Set());
  const [bulkMapping, setBulkMapping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [conflicts, setConflicts] = useState<any>({ conflicts: [], summary: { price: 0, stock: 0, sync: 0 } });

  const fetchData = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const [mapJson, unmapJson, conflictJson] = await Promise.all([
        api('mappings', 'GET', null, { channelId, search }),
        api('unmapped-products', 'GET', null, { channelId }),
        api('conflicts'),
      ]);
      setMappings(mapJson.mappings || []);
      setUnmapped(unmapJson.products || []);
      setConflicts(conflictJson);
    } catch { } finally { setLoading(false); }
  }, [channelId, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAutoMap = async () => {
    setAutoMapping(true);
    try {
      const json = await api('auto-map', 'POST', { channelId });
      toast.success(json.message || `${json.mapped} produk di-map`);
      fetchData(); onRefresh();
    } catch (e: any) { toast.error(e.message); } finally { setAutoMapping(false); }
  };

  const handleBulkMap = async () => {
    if (selectedUnmapped.size === 0) { toast.error('Pilih produk terlebih dahulu'); return; }
    setBulkMapping(true);
    try {
      const json = await api('bulk-map', 'POST', { channelId, productIds: Array.from(selectedUnmapped) });
      toast.success(json.message);
      setSelectedUnmapped(new Set());
      fetchData(); onRefresh();
    } catch (e: any) { toast.error(e.message); } finally { setBulkMapping(false); }
  };

  const handleBulkUpload = async () => {
    setUploading(true);
    try {
      const json = await api('bulk-upload', 'POST', { channelId });
      toast.success(json.message);
      fetchData();
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  };

  const handleUnmap = async (mappingId: number) => {
    try { await api('unmap', 'POST', { mappingId }); toast.success('Mapping dihapus'); fetchData(); }
    catch (e: any) { toast.error(e.message); }
  };

  const toggleSelectAll = () => {
    if (selectedUnmapped.size === unmapped.length) setSelectedUnmapped(new Set());
    else setSelectedUnmapped(new Set(unmapped.map(p => p.id)));
  };

  const totalConflicts = conflicts.summary.price + conflicts.summary.stock + conflicts.summary.sync;

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm" />
        </div>
        <button onClick={handleAutoMap} disabled={autoMapping || !channelId} className="text-sm px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
          {autoMapping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Auto-Map SKU
        </button>
        <button onClick={handleBulkUpload} disabled={uploading || !channelId} className="text-sm px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Upload ke Marketplace
        </button>
      </div>

      {/* Conflict Banner */}
      {totalConflicts > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-amber-800">{totalConflicts} konflik terdeteksi: </span>
            {conflicts.summary.price > 0 && <span className="text-amber-700">{conflicts.summary.price} harga di bawah modal · </span>}
            {conflicts.summary.stock > 0 && <span className="text-amber-700">{conflicts.summary.stock} stok kosong · </span>}
            {conflicts.summary.sync > 0 && <span className="text-amber-700">{conflicts.summary.sync} sync error</span>}
          </div>
        </div>
      )}

      {/* Dual Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Unmapped ERP Products */}
        <div className="bg-white rounded-xl border">
          <div className="p-3 border-b bg-orange-50 flex items-center justify-between">
            <h4 className="font-semibold text-orange-800 text-sm flex items-center gap-1">
              <Box className="w-4 h-4" /> Produk ERP Belum Map ({unmapped.length})
            </h4>
            <div className="flex items-center gap-2">
              {unmapped.length > 0 && (
                <>
                  <label className="text-xs text-orange-600 flex items-center gap-1">
                    <input type="checkbox" checked={selectedUnmapped.size === unmapped.length && unmapped.length > 0} onChange={toggleSelectAll} className="rounded" /> Semua
                  </label>
                  <button onClick={handleBulkMap} disabled={selectedUnmapped.size === 0 || bulkMapping}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
                    {bulkMapping ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                    Map ({selectedUnmapped.size})
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y">
            {unmapped.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                <CheckCircle className="w-8 h-8 mx-auto text-green-300 mb-2" />
                Semua produk sudah di-map!
              </div>
            ) : unmapped.map(p => (
              <div key={p.id} className="p-3 hover:bg-gray-50 flex items-center gap-3 text-sm">
                <input type="checkbox" checked={selectedUnmapped.has(p.id)}
                  onChange={e => { const s = new Set(selectedUnmapped); e.target.checked ? s.add(p.id) : s.delete(p.id); setSelectedUnmapped(s); }} className="rounded" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">SKU: {p.sku || '-'} · {formatRp(p.sell_price)} · Stok: {p.total_stock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Mapped Products */}
        <div className="bg-white rounded-xl border">
          <div className="p-3 border-b bg-green-50 flex items-center justify-between">
            <h4 className="font-semibold text-green-800 text-sm flex items-center gap-1">
              <Layers className="w-4 h-4" /> Produk Terhubung ({mappings.length})
            </h4>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y">
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
            ) : mappings.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                <Layers className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                Belum ada mapping. Gunakan Auto-Map atau pilih produk dari panel kiri.
              </div>
            ) : mappings.map(m => (
              <div key={m.id} className="p-3 hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{m.erp_product_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span>SKU: {m.erp_sku || '-'}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>MP: {m.marketplace_sku || m.marketplace_product_id || '-'}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[m.sync_status] || 'bg-gray-100 text-gray-500'}`}>{m.sync_status}</span>
                    </div>
                    {m.last_sync_error && <p className="text-[10px] text-red-500 mt-0.5 truncate">{m.last_sync_error}</p>}
                  </div>
                  <span className="text-xs text-gray-400">{timeAgo(m.last_synced_at)}</span>
                  <button onClick={() => handleUnmap(m.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// PRICE TAB — Marketplace pricing with markup
// ═══════════════════════════════════════════════
function PriceTab({ channelId }: { channelId: string }) {
  const [products, setProducts] = useState<any[]>([]);
  const [priceRules, setPriceRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [markup, setMarkup] = useState(0);
  const [roundTo, setRoundTo] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editingPrice, setEditingPrice] = useState<Record<number, number>>({});

  const fetchPrices = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const json = await api('price-rules', 'GET', null, { channelId });
      setProducts(json.products || []);
      setPriceRules(json.priceRules || []);
      const rule = json.priceRules?.find((r: any) => r.channelId.toString() === channelId);
      if (rule) { setMarkup(rule.markup || 0); setRoundTo(rule.roundTo || 0); }
    } catch { } finally { setLoading(false); }
  }, [channelId]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  const handleSaveRules = async () => {
    setSaving(true);
    try {
      const overrides = Object.entries(editingPrice).map(([mid, price]) => ({ mappingId: parseInt(mid), price }));
      await api('price-rules', 'POST', { channelId, markupPercent: markup, roundTo, overrides });
      toast.success('Aturan harga tersimpan');
      setEditingPrice({});
      fetchPrices();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Price Rule Settings */}
      <div className="bg-white rounded-xl border p-5">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-gray-500" /> Aturan Harga Global untuk Channel Ini</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Markup dari Harga ERP (%)</label>
            <input type="number" min={0} max={200} value={markup} onChange={e => setMarkup(parseFloat(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <p className="text-[10px] text-gray-400 mt-1">Harga marketplace = ERP × (1 + markup%)</p>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Bulatkan ke (Rp)</label>
            <input type="number" min={0} value={roundTo} onChange={e => setRoundTo(parseInt(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="1000" />
            <p className="text-[10px] text-gray-400 mt-1">0 = tanpa pembulatan</p>
          </div>
          <div className="flex items-end">
            <button onClick={handleSaveRules} disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Simpan & Terapkan
            </button>
          </div>
        </div>
      </div>

      {/* Price Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Produk</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Harga Modal</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Harga ERP</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Harga Marketplace</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Margin</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p: any) => {
                const isBelow = p.cost_price > 0 && (editingPrice[p.mapping_id] || p.final_price) < p.cost_price;
                return (
                  <tr key={p.mapping_id} className={`hover:bg-gray-50 ${isBelow ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.erp_name}</p>
                      <p className="text-xs text-gray-400">SKU: {p.sku || '-'} · {p.platform}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">{p.cost_price ? formatRp(p.cost_price) : '-'}</td>
                    <td className="px-4 py-3 text-right">{formatRp(p.erp_price)}</td>
                    <td className="px-4 py-3 text-right">
                      <input type="number" className={`w-28 border rounded px-2 py-1 text-sm text-right ${isBelow ? 'border-red-300 bg-red-50' : ''}`}
                        value={editingPrice[p.mapping_id] ?? p.final_price ?? p.erp_price}
                        onChange={e => setEditingPrice(prev => ({ ...prev, [p.mapping_id]: parseInt(e.target.value) || 0 }))} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium ${parseFloat(p.margin_percent) < 0 ? 'text-red-600' : parseFloat(p.margin_percent) > 30 ? 'text-green-600' : 'text-gray-600'}`}>
                        {p.margin_percent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isBelow ? (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full flex items-center gap-1 justify-center">
                          <AlertTriangle className="w-3 h-3" /> Di bawah modal
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {products.length === 0 && <div className="p-8 text-center text-sm text-gray-400">Tidak ada produk ter-mapping</div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// CATEGORY TAB
// ═══════════════════════════════════════════════
function CategoryTab({ channelId }: { channelId: string }) {
  const [erpCategories, setErpCategories] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMap, setEditMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!channelId) return;
    setLoading(true);
    api('category-map', 'GET', null, { channelId }).then(json => {
      setErpCategories(json.erpCategories || []);
      setMappings(json.mappings || []);
      const map: Record<string, string> = {};
      (json.mappings || []).forEach((m: any) => { map[m.erpCategoryId] = m.marketplaceCategory; });
      setEditMap(map);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [channelId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const mappingsArr = Object.entries(editMap).filter(([_, v]) => v).map(([k, v]) => ({ erpCategoryId: k, marketplaceCategory: v }));
      await api('category-map', 'POST', { channelId, mappings: mappingsArr });
      toast.success('Kategori tersimpan');
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-gray-900">Pemetaan Kategori</h4>
          <p className="text-xs text-gray-500">Petakan kategori ERP ke kategori marketplace (misal: ERP "Baju" → Shopee "Pakaian Pria &gt; Atasan")</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Simpan
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori ERP</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600 w-12"><ArrowRight className="w-4 h-4 mx-auto" /></th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori Marketplace</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {erpCategories.length === 0 ? (
              <tr><td colSpan={3} className="p-8 text-center text-gray-400">Tidak ada kategori produk</td></tr>
            ) : erpCategories.map((cat: any) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                <td className="px-4 py-3 text-center"><ArrowRight className="w-4 h-4 text-gray-400 mx-auto" /></td>
                <td className="px-4 py-3">
                  <input value={editMap[cat.id] || ''} onChange={e => setEditMap(p => ({ ...p, [cat.id]: e.target.value }))}
                    placeholder="Ketik kategori marketplace..." className="w-full border rounded-lg px-3 py-1.5 text-sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// SYNC MONITOR TAB — Cross-module integration
// ═══════════════════════════════════════════════
function SyncMonitorTab() {
  const [data, setData] = useState<any>({ channels: [], failures: [], stats24h: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('sync-monitor').then(json => setData(json)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4">
      {/* Per-Channel Sync Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(data.channels || []).map((ch: any) => (
          <div key={ch.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full ${ch.status === 'connected' ? 'bg-green-500' : 'bg-gray-300'}`} />
              <h4 className="font-semibold text-gray-900 text-sm">{ch.platform} — {ch.shop_name || 'Toko'}</h4>
            </div>
            <div className="space-y-1.5 text-xs">
              {[
                { label: 'Stok', time: ch.last_sync_stock_at, auto: ch.auto_sync_stock },
                { label: 'Harga', time: ch.last_sync_price_at, auto: ch.auto_sync_price },
                { label: 'Order', time: ch.last_sync_orders_at, auto: ch.auto_sync_order },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
                  <span className="text-gray-600">{s.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 font-medium">{timeAgo(s.time)}</span>
                    <span className={`px-1 py-0.5 rounded text-[9px] ${s.auto ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{s.auto ? 'AUTO' : 'MANUAL'}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 rounded p-1.5"><span className="text-sm font-bold text-green-700">{ch.synced_count}</span><br /><span className="text-[10px] text-green-600">Synced</span></div>
              <div className="bg-yellow-50 rounded p-1.5"><span className="text-sm font-bold text-yellow-700">{ch.pending_count}</span><br /><span className="text-[10px] text-yellow-600">Pending</span></div>
              <div className="bg-red-50 rounded p-1.5"><span className="text-sm font-bold text-red-700">{ch.error_count}</span><br /><span className="text-[10px] text-red-600">Error</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* 24h Stats */}
      {(data.stats24h || []).length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-gray-500" /> Statistik 24 Jam Terakhir</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(data.stats24h as any[]).map((s: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs font-medium text-gray-700">{s.sync_type?.replace(/_/g, ' ')}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{s.success}/{s.total}</p>
                <p className="text-[10px] text-gray-400">{s.failed} gagal · avg {s.avg_duration}ms</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Failures */}
      {(data.failures || []).length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h4 className="font-semibold text-red-800 mb-3 text-sm flex items-center gap-2"><XCircle className="w-4 h-4" /> Sync Gagal Terbaru</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(data.failures as any[]).map((f: any) => (
              <div key={f.id} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg text-xs">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-red-800">{f.sync_type} — {f.platform}</span>
                  <p className="text-red-600 truncate">{f.error_message}</p>
                </div>
                <span className="text-red-400 whitespace-nowrap">{timeAgo(f.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// VALIDATION TAB — Field validation per platform
// ═══════════════════════════════════════════════
function ValidationTab({ channelId }: { channelId: string }) {
  const [unmapped, setUnmapped] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [results, setResults] = useState<Record<number, any>>({});
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!channelId) return;
    Promise.all([
      api('unmapped-products', 'GET', null, { channelId }),
      api('mappings', 'GET', null, { channelId }),
    ]).then(([u, m]) => {
      setUnmapped(u.products || []);
      setMappings(m.mappings || []);
    }).catch(() => {});
  }, [channelId]);

  const allProducts = [...mappings.map((m: any) => ({ id: m.product_id, name: m.erp_product_name, sku: m.erp_sku, mapped: true })), ...unmapped.map(p => ({ id: p.id, name: p.name, sku: p.sku, mapped: false }))];

  const handleValidateAll = async () => {
    setValidating(true);
    const newResults: Record<number, any> = {};
    for (const p of allProducts) {
      try {
        const json = await api('validate-product', 'POST', { productId: p.id, channelId });
        newResults[p.id] = json;
      } catch (e: any) { newResults[p.id] = { valid: false, errors: [e.message], warnings: [] }; }
    }
    setResults(newResults);
    setValidating(false);
    const passed = Object.values(newResults).filter(r => r.valid).length;
    toast.success(`Validasi selesai: ${passed}/${allProducts.length} produk lolos`);
  };

  const totalErrors = Object.values(results).reduce((s, r) => s + (r.errors?.length || 0), 0);
  const totalWarnings = Object.values(results).reduce((s, r) => s + (r.warnings?.length || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-gray-900">Validasi Produk untuk Marketplace</h4>
          <p className="text-xs text-gray-500">Pastikan nama, deskripsi, harga, berat, dan gambar sesuai aturan marketplace sebelum di-sync</p>
        </div>
        <button onClick={handleValidateAll} disabled={validating || allProducts.length === 0}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
          {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />} Validasi Semua ({allProducts.length})
        </button>
      </div>

      {Object.keys(results).length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="w-4 h-4" /> {Object.values(results).filter(r => r.valid).length} Lolos</span>
          <span className="flex items-center gap-1 text-red-700"><XCircle className="w-4 h-4" /> {totalErrors} Error</span>
          <span className="flex items-center gap-1 text-amber-700"><AlertTriangle className="w-4 h-4" /> {totalWarnings} Warning</span>
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Produk</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Mapped</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {allProducts.map(p => {
              const r = results[p.id];
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-medium text-gray-900">{p.name}</p><p className="text-xs text-gray-400">SKU: {p.sku || '-'}</p></td>
                  <td className="px-4 py-3 text-center">{p.mapped ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <span className="text-xs text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 text-center">
                    {!r ? <span className="text-xs text-gray-400">Belum divalidasi</span> :
                      r.valid ? <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Lolos</span> :
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">{r.errors?.length} Error</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r?.errors?.map((e: string, i: number) => <p key={i} className="text-red-600">❌ {e}</p>)}
                    {r?.warnings?.map((w: string, i: number) => <p key={i} className="text-amber-600">⚠️ {w}</p>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {allProducts.length === 0 && <div className="p-8 text-center text-sm text-gray-400">Tidak ada produk</div>}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <ModuleGuard moduleCode="marketplace_integration">
      <ProductsContent />
    </ModuleGuard>
  );
}
