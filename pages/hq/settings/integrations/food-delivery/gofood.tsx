import React, { useState, useEffect } from 'react';
import HQLayout from '../../../../../components/hq/HQLayout';
import {
  ArrowLeft, Store, CheckCircle, XCircle, Clock, AlertCircle, ChevronRight, ExternalLink,
  RefreshCw, Plus, TrendingUp, Activity, ShoppingBag, Package, DollarSign, BarChart3,
  Settings, Search, Edit, Trash2, Copy, Eye, EyeOff, Key, Save, Zap, Bell, Link2, Unlink,
  PlayCircle, PauseCircle, MapPin, Phone, User, Star, Percent, Calendar, Menu, Image
} from 'lucide-react';

interface BranchStore {
  id: string; branchId: string; branchName: string; branchCode: string;
  storeId: string; storeName: string; status: 'active' | 'pending' | 'suspended' | 'inactive';
  isOpen: boolean; autoAccept: boolean; avgPrepTime: number;
  stats: { orders: number; revenue: number; rating: number; completionRate: number; todayOrders: number; };
  menuSynced: boolean; lastSyncAt?: string;
}

interface MenuCategory { id: string; name: string; itemCount: number; enabled: boolean; }

const menuCategories: MenuCategory[] = [
  { id: 'cat-1', name: 'Makanan Utama', itemCount: 24, enabled: true },
  { id: 'cat-2', name: 'Minuman', itemCount: 18, enabled: true },
  { id: 'cat-3', name: 'Snack & Camilan', itemCount: 12, enabled: true },
  { id: 'cat-4', name: 'Paket Hemat', itemCount: 8, enabled: true },
  { id: 'cat-5', name: 'Dessert', itemCount: 6, enabled: false },
];

const formatCurrency = (v: number) => v >= 1e9 ? `Rp ${(v/1e9).toFixed(2)}M` : v >= 1e6 ? `Rp ${(v/1e6).toFixed(0)}Jt` : `Rp ${v.toLocaleString('id-ID')}`;

export default function GoFoodIntegrationPage() {
  const [mounted, setMounted] = useState(false);
  const [stores, setStores] = useState<BranchStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<BranchStore | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'stores' | 'menu' | 'promos' | 'settings'>('overview');
  const [loading, setLoading] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const totalStats = stores.reduce((a, s) => ({ orders: a.orders + s.stats.orders, revenue: a.revenue + s.stats.revenue, todayOrders: a.todayOrders + s.stats.todayOrders }), { orders: 0, revenue: 0, todayOrders: 0 });
  const avgRating = (stores.filter(s => s.stats.rating > 0).reduce((a, s) => a + s.stats.rating, 0) / stores.filter(s => s.stats.rating > 0).length).toFixed(1);

  const handleToggleStore = (storeId: string) => {
    setStores(prev => prev.map(s => s.id === storeId ? { ...s, isOpen: !s.isOpen } : s));
    if (selectedStore?.id === storeId) setSelectedStore(prev => prev ? { ...prev, isOpen: !prev.isOpen } : null);
  };

  const handleSyncMenu = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/food-delivery/gofood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_menu' })
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformData = async () => {
    try {
      const response = await fetch('/api/integrations/food-delivery/gofood?type=stats');
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        if (payload.stores) {
          setStores(payload.stores);
          if (payload.stores.length > 0) setSelectedStore(payload.stores[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching GoFood data:', error);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, []);

  if (!mounted) return null;

  return (
    <HQLayout title="GoFood Integration" subtitle="Kelola integrasi dengan GoFood per cabang">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => window.location.href = '/hq/settings/integrations/food-delivery'} className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4" />Kembali</button>
          <div className="flex items-center gap-3">
            <a href="https://partner.gojek.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">Partner Dashboard<ExternalLink className="w-3 h-3" /></a>
            <button onClick={() => setShowConnectModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"><Plus className="w-4 h-4" />Hubungkan Cabang</button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl font-bold text-green-600">G</div>
              <div>
                <h1 className="text-2xl font-bold">GoFood</h1>
                <p className="text-white/80 mt-1">Gojek Food Delivery Platform</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{stores.filter(s => s.status === 'active').length} Toko Aktif</span>
                  <span className="px-3 py-1 bg-emerald-400/30 rounded-full text-sm flex items-center gap-1"><Star className="w-3 h-3" />{avgRating} Rating</span>
                </div>
              </div>
            </div>
            <div className="text-right grid grid-cols-3 gap-6">
              <div><p className="text-white/60 text-sm">Total Orders</p><p className="text-2xl font-bold">{totalStats.orders.toLocaleString()}</p></div>
              <div><p className="text-white/60 text-sm">Revenue</p><p className="text-2xl font-bold">{formatCurrency(totalStats.revenue)}</p></div>
              <div><p className="text-white/60 text-sm">Hari Ini</p><p className="text-2xl font-bold">{totalStats.todayOrders}</p></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Toko Aktif', value: stores.filter(s => s.status === 'active').length, icon: Store, color: 'bg-green-100 text-green-600' },
            { label: 'Sedang Buka', value: stores.filter(s => s.isOpen).length, icon: PlayCircle, color: 'bg-emerald-100 text-emerald-600' },
            { label: 'Orders Hari Ini', value: totalStats.todayOrders, icon: ShoppingBag, color: 'bg-orange-100 text-orange-600' },
            { label: 'Avg Prep Time', value: '15 min', icon: Clock, color: 'bg-blue-100 text-blue-600' },
            { label: 'Menu Synced', value: stores.filter(s => s.menuSynced).length, icon: RefreshCw, color: 'bg-purple-100 text-purple-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between"><p className="text-xs text-gray-500">{stat.label}</p><div className={`p-2 rounded-lg ${stat.color}`}><stat.icon className="w-4 h-4" /></div></div>
              <p className="text-xl font-bold text-gray-900 mt-2">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 flex items-center gap-1 overflow-x-auto">
            {[{ id: 'overview', label: 'Overview', icon: BarChart3 }, { id: 'stores', label: 'Toko', icon: Store }, { id: 'menu', label: 'Menu', icon: Menu }, { id: 'promos', label: 'Promo', icon: Percent }, { id: 'settings', label: 'Settings', icon: Settings }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-4 border-b-2 whitespace-nowrap text-sm ${activeTab === tab.id ? 'border-green-500 text-green-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Performa Toko</h3>
                <div className="space-y-3">
                  {stores.filter(s => s.status === 'active').map(store => (
                    <div key={store.id} onClick={() => { setSelectedStore(store); setActiveTab('stores'); }} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${store.isOpen ? 'bg-green-100' : 'bg-gray-200'}`}><Store className={`w-6 h-6 ${store.isOpen ? 'text-green-600' : 'text-gray-500'}`} /></div>
                        <div>
                          <div className="flex items-center gap-2"><p className="font-medium text-gray-900">{store.branchName}</p>{store.isOpen ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Buka</span> : <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">Tutup</span>}</div>
                          <p className="text-sm text-gray-500">{store.storeId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="grid grid-cols-4 gap-6 text-center">
                          <div><p className="text-xs text-gray-500">Orders</p><p className="font-semibold text-gray-900">{store.stats.orders.toLocaleString()}</p></div>
                          <div><p className="text-xs text-gray-500">Revenue</p><p className="font-semibold text-gray-900">{formatCurrency(store.stats.revenue)}</p></div>
                          <div><p className="text-xs text-gray-500">Rating</p><p className="font-semibold text-amber-600">⭐ {store.stats.rating}</p></div>
                          <div><p className="text-xs text-gray-500">Completion</p><p className="font-semibold text-emerald-600">{store.stats.completionRate}%</p></div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'stores' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 font-medium">Pilih Toko</p>
                  {stores.map(store => (
                    <div key={store.id} onClick={() => setSelectedStore(store)} className={`p-4 rounded-xl cursor-pointer transition-all ${selectedStore?.id === store.id ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2"><span className="font-medium text-gray-900">{store.branchName}</span>{store.status === 'active' && (store.isOpen ? <span className="w-2 h-2 bg-green-500 rounded-full"></span> : <span className="w-2 h-2 bg-gray-400 rounded-full"></span>)}</div>
                      <p className="text-sm text-gray-500">{store.storeId || 'Belum terhubung'}</p>
                      <div className="flex items-center gap-2 mt-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${store.status === 'active' ? 'bg-green-100 text-green-700' : store.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{store.status}</span></div>
                    </div>
                  ))}
                </div>
                {selectedStore && (
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div><h3 className="text-xl font-semibold text-gray-900">{selectedStore.branchName}</h3><p className="text-gray-500">{selectedStore.storeName || 'Belum dikonfigurasi'}</p></div>
                        <div className="flex items-center gap-2">
                          {selectedStore.status === 'active' && <button onClick={() => handleToggleStore(selectedStore.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${selectedStore.isOpen ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>{selectedStore.isOpen ? <><PauseCircle className="w-4 h-4" />Tutup Toko</> : <><PlayCircle className="w-4 h-4" />Buka Toko</>}</button>}
                        </div>
                      </div>
                      {selectedStore.status === 'active' ? (
                        <div className="grid grid-cols-4 gap-4">
                          <div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Orders</p><p className="text-lg font-bold text-gray-900">{selectedStore.stats.orders.toLocaleString()}</p></div>
                          <div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Revenue</p><p className="text-lg font-bold text-gray-900">{formatCurrency(selectedStore.stats.revenue)}</p></div>
                          <div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Rating</p><p className="text-lg font-bold text-amber-600">⭐ {selectedStore.stats.rating}</p></div>
                          <div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Hari Ini</p><p className="text-lg font-bold text-gray-900">{selectedStore.stats.todayOrders}</p></div>
                        </div>
                      ) : (
                        <div className="text-center py-8"><AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" /><p className="text-gray-600">Toko belum terhubung dengan GoFood</p><button onClick={() => setShowConnectModal(true)} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">Hubungkan Sekarang</button></div>
                      )}
                    </div>
                    {selectedStore.status === 'active' && (
                      <>
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Key className="w-4 h-4" />Store Credentials</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-500">Store ID</span><code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{selectedStore.storeId}</code></div>
                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-500">Branch Code</span><code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{selectedStore.branchCode}</code></div>
                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-500">Prep Time</span><span className="font-medium">{selectedStore.avgPrepTime} menit</span></div>
                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-500">Auto Accept</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedStore.autoAccept ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{selectedStore.autoAccept ? 'Aktif' : 'Nonaktif'}</span></div>
                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-500">Menu Synced</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedStore.menuSynced ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{selectedStore.menuSynced ? 'Synced' : 'Perlu Sync'}</span></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={handleSyncMenu} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50">{loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Sync Menu</button>
                          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"><Settings className="w-4 h-4" />Pengaturan</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'menu' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between"><div><h3 className="text-lg font-semibold text-gray-900">Sinkronisasi Menu</h3><p className="text-sm text-gray-500">Kelola menu yang ditampilkan di GoFood</p></div><button onClick={handleSyncMenu} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">{loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Sync Semua Menu</button></div>
                <div className="space-y-3">
                  {menuCategories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4"><div className="p-3 bg-white rounded-xl"><Menu className="w-5 h-5 text-gray-600" /></div><div><p className="font-medium text-gray-900">{cat.name}</p><p className="text-sm text-gray-500">{cat.itemCount} item</p></div></div>
                      <div className="flex items-center gap-4">
                        <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={cat.enabled} onChange={() => {}} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div></label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'promos' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between"><div><h3 className="text-lg font-semibold text-gray-900">Promo & Diskon</h3><p className="text-sm text-gray-500">Kelola promo yang berjalan di GoFood</p></div><button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"><Plus className="w-4 h-4" />Buat Promo</button></div>
                <div className="space-y-3">
                  {[
                    { id: 1, name: 'Diskon 20% Menu Utama', type: 'percentage', value: 20, minOrder: 50000, maxDisc: 25000, status: 'active', endDate: '2026-02-28' },
                    { id: 2, name: 'Free Delivery', type: 'free_delivery', value: 0, minOrder: 75000, maxDisc: 15000, status: 'active', endDate: '2026-03-15' },
                    { id: 3, name: 'Buy 1 Get 1 Minuman', type: 'bogo', value: 0, minOrder: 0, maxDisc: 0, status: 'scheduled', endDate: '2026-03-01' },
                  ].map(promo => (
                    <div key={promo.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4"><div className="p-3 bg-green-100 rounded-xl"><Percent className="w-5 h-5 text-green-600" /></div><div><p className="font-medium text-gray-900">{promo.name}</p><p className="text-sm text-gray-500">Min. order {formatCurrency(promo.minOrder)} • Berlaku s.d. {promo.endDate}</p></div></div>
                      <div className="flex items-center gap-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${promo.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{promo.status === 'active' ? 'Aktif' : 'Terjadwal'}</span><button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"><Edit className="w-4 h-4" /></button></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6 max-w-2xl">
                <div className="bg-white border border-gray-200 rounded-xl p-6"><h4 className="font-semibold text-gray-900 mb-4">Pengaturan Umum</h4><div className="space-y-4">
                  {[{ label: 'Auto Accept Orders', desc: 'Otomatis terima order baru', enabled: true }, { label: 'Order Notifications', desc: 'Kirim notifikasi untuk order baru', enabled: true }, { label: 'Menu Auto Sync', desc: 'Sinkronisasi menu otomatis setiap hari', enabled: true }, { label: 'Price Sync', desc: 'Sinkronisasi harga dengan POS', enabled: false }].map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"><div><p className="font-medium text-gray-900">{s.label}</p><p className="text-sm text-gray-500">{s.desc}</p></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" defaultChecked={s.enabled} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div></label></div>
                  ))}
                </div></div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-6"><h4 className="font-semibold text-red-900 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Danger Zone</h4><div className="flex items-center justify-between"><div><p className="font-medium text-red-900">Disconnect GoFood</p><p className="text-sm text-red-700">Hapus semua koneksi GoFood</p></div><button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Disconnect</button></div></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4"><h3 className="text-xl font-semibold text-gray-900 mb-4">Hubungkan Cabang ke GoFood</h3>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Pilih Cabang</label><select className="w-full px-4 py-2 border border-gray-200 rounded-lg"><option>Pilih cabang...</option>{stores.filter(s => s.status !== 'active').map(s => <option key={s.id} value={s.branchId}>{s.branchName}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">GoFood Store ID</label><input type="text" placeholder="Masukkan Store ID dari GoFood Partner" className="w-full px-4 py-2 border border-gray-200 rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">API Key</label><input type="password" placeholder="Masukkan API Key" className="w-full px-4 py-2 border border-gray-200 rounded-lg" /></div>
          </div>
          <div className="flex items-center gap-3 mt-6"><button onClick={() => setShowConnectModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button><button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Hubungkan</button></div>
        </div></div>
      )}
    </HQLayout>
  );
}
