import React, { useState, useEffect } from 'react';
import HQLayout from '../../../../../components/hq/HQLayout';
import {
  ArrowLeft, Store, CheckCircle, Clock, AlertCircle, ChevronRight, ExternalLink,
  RefreshCw, Plus, ShoppingBag, Package, BarChart3, Settings, Key, Star, Box, Truck,
  MessageSquare, PlayCircle, PauseCircle, Zap, Percent
} from 'lucide-react';

interface ShopStore {
  id: string; branchId: string; branchName: string; branchCode: string;
  shopId: string; shopName: string; shopUrl: string; status: 'active' | 'pending' | 'suspended';
  isOpen: boolean; autoReply: boolean;
  stats: { orders: number; revenue: number; products: number; rating: number; followers: number; chatResponseRate: number; };
  productSynced: boolean; lastSyncAt?: string;
}

const formatCurrency = (v: number) => v >= 1e9 ? `Rp ${(v/1e9).toFixed(2)}M` : v >= 1e6 ? `Rp ${(v/1e6).toFixed(0)}Jt` : `Rp ${v.toLocaleString('id-ID')}`;

export default function ShopeeIntegrationPage() {
  const [mounted, setMounted] = useState(false);
  const [stores, setStores] = useState<ShopStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<ShopStore | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'stores' | 'products' | 'orders' | 'promos' | 'settings'>('overview');
  const [loading, setLoading] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const fetchPlatformData = async () => {
    try {
      const response = await fetch('/api/integrations/ecommerce?platform=shopee');
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        if (payload.stores) {
          setStores(payload.stores);
          if (payload.stores.length > 0) setSelectedStore(payload.stores[0]);
        }
      }
    } catch { }
  };

  useEffect(() => { setMounted(true); fetchPlatformData(); }, []);

  const totalStats = stores.reduce((a, s) => ({ orders: a.orders + s.stats.orders, revenue: a.revenue + s.stats.revenue, products: a.products + s.stats.products }), { orders: 0, revenue: 0, products: 0 });
  const avgRating = (stores.filter(s => s.stats.rating > 0).reduce((a, s) => a + s.stats.rating, 0) / stores.filter(s => s.stats.rating > 0).length).toFixed(1);

  const handleToggleStore = (storeId: string) => { setStores(prev => prev.map(s => s.id === storeId ? { ...s, isOpen: !s.isOpen } : s)); if (selectedStore?.id === storeId) setSelectedStore(prev => prev ? { ...prev, isOpen: !prev.isOpen } : null); };
  const handleSyncProducts = async () => { setLoading(true); await new Promise(r => setTimeout(r, 2000)); setLoading(false); alert('✅ Produk berhasil disinkronkan!'); };

  if (!mounted) return null;

  return (
    <HQLayout title="Shopee Integration" subtitle="Kelola integrasi dengan Shopee per cabang">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => window.location.href = '/hq/settings/integrations/ecommerce'} className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4" />Kembali</button>
          <div className="flex items-center gap-3">
            <a href="https://seller.shopee.co.id" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">Seller Centre<ExternalLink className="w-3 h-3" /></a>
            <button onClick={() => setShowConnectModal(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"><Plus className="w-4 h-4" />Hubungkan Toko</button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl font-bold text-orange-500">S</div>
              <div>
                <h1 className="text-2xl font-bold">Shopee</h1>
                <p className="text-white/80 mt-1">Southeast Asia's Leading E-commerce</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{stores.filter(s => s.status === 'active').length} Toko Aktif</span>
                  <span className="px-3 py-1 bg-amber-400/30 rounded-full text-sm flex items-center gap-1"><Star className="w-3 h-3" />{avgRating} Rating</span>
                </div>
              </div>
            </div>
            <div className="text-right grid grid-cols-3 gap-6">
              <div><p className="text-white/60 text-sm">Total Orders</p><p className="text-2xl font-bold">{totalStats.orders.toLocaleString()}</p></div>
              <div><p className="text-white/60 text-sm">Revenue</p><p className="text-2xl font-bold">{formatCurrency(totalStats.revenue)}</p></div>
              <div><p className="text-white/60 text-sm">Products</p><p className="text-2xl font-bold">{totalStats.products}</p></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: 'Toko Aktif', value: stores.filter(s => s.status === 'active').length, icon: Store, color: 'bg-orange-100 text-orange-600' },
            { label: 'Total Orders', value: totalStats.orders.toLocaleString(), icon: ShoppingBag, color: 'bg-red-100 text-red-600' },
            { label: 'Products', value: totalStats.products, icon: Box, color: 'bg-purple-100 text-purple-600' },
            { label: 'Perlu Kirim', value: 35, icon: Truck, color: 'bg-amber-100 text-amber-600' },
            { label: 'Chat Baru', value: 18, icon: MessageSquare, color: 'bg-blue-100 text-blue-600' },
            { label: 'Flash Sale', value: 3, icon: Zap, color: 'bg-pink-100 text-pink-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between"><p className="text-xs text-gray-500">{stat.label}</p><div className={`p-2 rounded-lg ${stat.color}`}><stat.icon className="w-4 h-4" /></div></div>
              <p className="text-xl font-bold text-gray-900 mt-2">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 flex items-center gap-1 overflow-x-auto">
            {[{ id: 'overview', label: 'Overview', icon: BarChart3 }, { id: 'stores', label: 'Toko', icon: Store }, { id: 'products', label: 'Produk', icon: Box }, { id: 'orders', label: 'Orders', icon: Package }, { id: 'promos', label: 'Promo', icon: Percent }, { id: 'settings', label: 'Settings', icon: Settings }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-4 border-b-2 whitespace-nowrap text-sm ${activeTab === tab.id ? 'border-orange-500 text-orange-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
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
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${store.isOpen ? 'bg-orange-100' : 'bg-gray-200'}`}><Store className={`w-6 h-6 ${store.isOpen ? 'text-orange-600' : 'text-gray-500'}`} /></div>
                        <div>
                          <div className="flex items-center gap-2"><p className="font-medium text-gray-900">{store.shopName}</p>{store.isOpen ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Buka</span> : <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">Tutup</span>}</div>
                          <p className="text-sm text-gray-500">{store.branchName} • {store.shopUrl}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="grid grid-cols-4 gap-6 text-center">
                          <div><p className="text-xs text-gray-500">Orders</p><p className="font-semibold text-gray-900">{store.stats.orders.toLocaleString()}</p></div>
                          <div><p className="text-xs text-gray-500">Revenue</p><p className="font-semibold text-gray-900">{formatCurrency(store.stats.revenue)}</p></div>
                          <div><p className="text-xs text-gray-500">Rating</p><p className="font-semibold text-amber-600">⭐ {store.stats.rating}</p></div>
                          <div><p className="text-xs text-gray-500">Followers</p><p className="font-semibold text-gray-900">{store.stats.followers.toLocaleString()}</p></div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4"><div className="flex items-center gap-3"><Zap className="w-5 h-5 text-orange-600" /><div><p className="font-medium text-orange-900">Flash Sale & Voucher</p><p className="text-sm text-orange-700">3 Flash Sale aktif dan 5 voucher tersedia untuk pelanggan</p></div></div></div>
              </div>
            )}

            {activeTab === 'stores' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 font-medium">Pilih Toko</p>
                  {stores.map(store => (
                    <div key={store.id} onClick={() => setSelectedStore(store)} className={`p-4 rounded-xl cursor-pointer ${selectedStore?.id === store.id ? 'bg-orange-50 border-2 border-orange-300' : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2"><span className="font-medium text-gray-900">{store.branchName}</span>{store.status === 'active' && (store.isOpen ? <span className="w-2 h-2 bg-green-500 rounded-full"></span> : <span className="w-2 h-2 bg-gray-400 rounded-full"></span>)}</div>
                      <p className="text-sm text-gray-500">{store.shopName || 'Belum terhubung'}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs mt-2 inline-block ${store.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{store.status}</span>
                    </div>
                  ))}
                </div>
                {selectedStore && (
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div><h3 className="text-xl font-semibold text-gray-900">{selectedStore.shopName || selectedStore.branchName}</h3><p className="text-gray-500">{selectedStore.shopUrl || 'Belum dikonfigurasi'}</p></div>
                        {selectedStore.status === 'active' && <button onClick={() => handleToggleStore(selectedStore.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${selectedStore.isOpen ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{selectedStore.isOpen ? <><PauseCircle className="w-4 h-4" />Tutup</> : <><PlayCircle className="w-4 h-4" />Buka</>}</button>}
                      </div>
                      {selectedStore.status === 'active' ? (
                        <div className="grid grid-cols-4 gap-4">
                          <div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Orders</p><p className="text-lg font-bold">{selectedStore.stats.orders.toLocaleString()}</p></div>
                          <div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Revenue</p><p className="text-lg font-bold">{formatCurrency(selectedStore.stats.revenue)}</p></div>
                          <div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Rating</p><p className="text-lg font-bold text-amber-600">⭐ {selectedStore.stats.rating}</p></div>
                          <div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Followers</p><p className="text-lg font-bold">{selectedStore.stats.followers.toLocaleString()}</p></div>
                        </div>
                      ) : (
                        <div className="text-center py-8"><AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" /><p className="text-gray-600">Belum terhubung dengan Shopee</p><button onClick={() => setShowConnectModal(true)} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg">Hubungkan</button></div>
                      )}
                    </div>
                    {selectedStore.status === 'active' && (
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Key className="w-4 h-4" />Shop Info</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-500">Shop ID</span><code className="font-mono text-sm">{selectedStore.shopId}</code></div>
                          <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-500">Products</span><span>{selectedStore.stats.products} produk</span></div>
                          <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-500">Chat Response</span><span className={selectedStore.stats.chatResponseRate >= 90 ? 'text-green-600' : 'text-amber-600'}>{selectedStore.stats.chatResponseRate}%</span></div>
                          <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-500">Auto Reply</span><span className={`px-2 py-0.5 rounded-full text-xs ${selectedStore.autoReply ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{selectedStore.autoReply ? 'Aktif' : 'Off'}</span></div>
                          <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-500">Product Synced</span><span className={`px-2 py-0.5 rounded-full text-xs ${selectedStore.productSynced ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{selectedStore.productSynced ? 'Synced' : 'Pending'}</span></div>
                        </div>
                        <div className="flex gap-3 mt-4">
                          <button onClick={handleSyncProducts} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm">{loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Sync Products</button>
                          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm"><Settings className="w-4 h-4" />Settings</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between"><div><h3 className="text-lg font-semibold">Produk</h3><p className="text-sm text-gray-500">Total {totalStats.products} produk</p></div><div className="flex gap-3"><button onClick={handleSyncProducts} disabled={loading} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm">{loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Sync All</button><button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm"><Plus className="w-4 h-4" />Tambah Produk</button></div></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[{ name: 'Produk Best Seller', price: 189000, stock: 85, sold: 1250, img: '🛍️' }, { name: 'Produk Flash Sale', price: 99000, stock: 42, sold: 890, img: '⚡' }, { name: 'Produk Bundle', price: 299000, stock: 35, sold: 425, img: '📦' }, { name: 'Produk New Arrival', price: 159000, stock: 100, sold: 156, img: '🆕' }].map((p, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4">
                      <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center text-4xl mb-3">{p.img}</div>
                      <h4 className="font-medium text-gray-900">{p.name}</h4>
                      <p className="text-orange-600 font-semibold">{formatCurrency(p.price)}</p>
                      <div className="flex justify-between mt-2 text-sm"><span className="text-gray-500">Stok: {p.stock}</span><span className="text-gray-500">Terjual: {p.sold}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Orders Terbaru</h3><button className="text-sm text-orange-600">Lihat Semua</button></div>
                <div className="space-y-3">
                  {[{ id: '260222ABCD001', customer: 'John D.', items: 3, total: 450000, status: 'to_ship' }, { id: '260222ABCD002', customer: 'Jane S.', items: 2, total: 285000, status: 'shipping' }, { id: '260222ABCD003', customer: 'Ahmad', items: 1, total: 125000, status: 'completed' }].map((o, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div><p className="font-medium">{o.id}</p><p className="text-sm text-gray-500">{o.customer} • {o.items} item</p></div>
                      <div className="flex items-center gap-4"><span className="font-semibold">{formatCurrency(o.total)}</span><span className={`px-3 py-1 rounded-full text-xs ${o.status === 'completed' ? 'bg-green-100 text-green-700' : o.status === 'shipping' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{o.status === 'completed' ? 'Selesai' : o.status === 'shipping' ? 'Dikirim' : 'Perlu Kirim'}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'promos' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Promo & Flash Sale</h3><button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm"><Plus className="w-4 h-4" />Buat Promo</button></div>
                <div className="space-y-3">
                  {[{ name: 'Flash Sale 12.12', type: 'flash_sale', discount: '50%', status: 'active', products: 25 }, { name: 'Voucher Gratis Ongkir', type: 'voucher', discount: 'Free Shipping', status: 'active', products: 0 }, { name: 'Diskon Bundling', type: 'bundle', discount: '30%', status: 'scheduled', products: 8 }].map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4"><div className={`p-3 rounded-xl ${p.type === 'flash_sale' ? 'bg-orange-100' : p.type === 'voucher' ? 'bg-green-100' : 'bg-purple-100'}`}>{p.type === 'flash_sale' ? <Zap className="w-5 h-5 text-orange-600" /> : <Percent className="w-5 h-5 text-purple-600" />}</div><div><p className="font-medium">{p.name}</p><p className="text-sm text-gray-500">{p.discount} {p.products > 0 && `• ${p.products} produk`}</p></div></div>
                      <span className={`px-3 py-1 rounded-full text-xs ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{p.status === 'active' ? 'Aktif' : 'Terjadwal'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6 max-w-2xl">
                <div className="bg-white border border-gray-200 rounded-xl p-6"><h4 className="font-semibold mb-4">General Settings</h4><div className="space-y-4">
                  {[{ label: 'Auto Accept Orders', desc: 'Terima order otomatis', on: true }, { label: 'Auto Reply Chat', desc: 'Balas chat otomatis', on: true }, { label: 'Product Auto Sync', desc: 'Sync produk harian', on: true }, { label: 'Flash Sale Notification', desc: 'Notifikasi flash sale', on: true }].map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"><div><p className="font-medium">{s.label}</p><p className="text-sm text-gray-500">{s.desc}</p></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" defaultChecked={s.on} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div></label></div>
                  ))}
                </div></div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-6"><h4 className="font-semibold text-red-900 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Danger Zone</h4><div className="flex items-center justify-between"><div><p className="font-medium text-red-900">Disconnect Shopee</p><p className="text-sm text-red-700">Hapus semua koneksi</p></div><button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Disconnect</button></div></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4"><h3 className="text-xl font-semibold mb-4">Hubungkan Toko Shopee</h3>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Cabang</label><select className="w-full px-4 py-2 border border-gray-200 rounded-lg"><option>Pilih cabang...</option>{stores.filter(s => s.status !== 'active').map(s => <option key={s.id}>{s.branchName}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Shop ID / URL</label><input type="text" placeholder="shopee.co.id/nama-toko" className="w-full px-4 py-2 border border-gray-200 rounded-lg" /></div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-700">Anda akan diarahkan ke Shopee untuk otorisasi akun.</div>
          </div>
          <div className="flex gap-3 mt-6"><button onClick={() => setShowConnectModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg">Batal</button><button className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg">Hubungkan</button></div>
        </div></div>
      )}
    </HQLayout>
  );
}
