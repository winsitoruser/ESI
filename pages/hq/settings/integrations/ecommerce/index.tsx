import React, { useState, useEffect } from 'react';
import HQLayout from '../../../../../components/hq/HQLayout';
import {
  ArrowLeft, ShoppingCart, Store, CheckCircle, XCircle, Clock, ChevronRight,
  Plus, TrendingUp, Activity, ShoppingBag, Package, DollarSign, BarChart3,
  Settings, Search, Truck, Box, Star, Users
} from 'lucide-react';

interface EcommercePlatform {
  id: string; name: string; slug: string; logo: string; color: string; bgColor: string;
  status: 'active' | 'pending' | 'inactive'; connectedStores: number; totalBranches: number;
  stats: { orders: number; revenue: number; products: number; avgRating: number };
  features: string[];
}

interface StoreConnection {
  branchId: string; branchName: string; branchCode: string;
  platforms: { platformId: string; status: 'active' | 'pending' | 'inactive'; shopId?: string; shopName?: string; }[];
}

const platforms: EcommercePlatform[] = [
  { id: 'tokopedia', name: 'Tokopedia', slug: 'tokopedia', logo: '🟢', color: 'text-green-600', bgColor: 'bg-green-500',
    status: 'active', connectedStores: 5, totalBranches: 12,
    stats: { orders: 8450, revenue: 1250000000, products: 324, avgRating: 4.9 },
    features: ['Product Sync', 'Order Sync', 'Stock Sync', 'Auto Reply Chat'] },
  { id: 'shopee', name: 'Shopee', slug: 'shopee', logo: '🟠', color: 'text-orange-500', bgColor: 'bg-orange-500',
    status: 'active', connectedStores: 4, totalBranches: 12,
    stats: { orders: 12850, revenue: 1850000000, products: 298, avgRating: 4.8 },
    features: ['Product Sync', 'Order Sync', 'Flash Sale', 'Voucher Sync'] },
  { id: 'lazada', name: 'Lazada', slug: 'lazada', logo: '🔵', color: 'text-blue-600', bgColor: 'bg-blue-600',
    status: 'active', connectedStores: 3, totalBranches: 12,
    stats: { orders: 4250, revenue: 680000000, products: 256, avgRating: 4.7 },
    features: ['Product Sync', 'Order Sync', 'Sponsored Ads', 'Flexi Combo'] },
  { id: 'blibli', name: 'Blibli', slug: 'blibli', logo: '🔵', color: 'text-blue-500', bgColor: 'bg-blue-500',
    status: 'pending', connectedStores: 1, totalBranches: 12,
    stats: { orders: 850, revenue: 125000000, products: 180, avgRating: 4.6 },
    features: ['Product Sync', 'Order Sync', 'Official Store'] },
  { id: 'bukalapak', name: 'Bukalapak', slug: 'bukalapak', logo: '🔴', color: 'text-red-500', bgColor: 'bg-red-500',
    status: 'inactive', connectedStores: 0, totalBranches: 12,
    stats: { orders: 0, revenue: 0, products: 0, avgRating: 0 },
    features: ['Product Sync', 'Order Sync', 'BukaMall'] },
];

const storeConnections: StoreConnection[] = [
  { branchId: 'hq', branchName: 'HQ Jakarta', branchCode: 'HQ-001', platforms: [
    { platformId: 'tokopedia', status: 'active', shopId: 'bedagang-official', shopName: 'Bedagang Official Store' },
    { platformId: 'shopee', status: 'active', shopId: 'bedagang.id', shopName: 'Bedagang.ID' },
    { platformId: 'lazada', status: 'active', shopId: 'bedagang-lzd', shopName: 'Bedagang Lazada' },
  ]},
  { branchId: 'branch-001', branchName: 'Cabang Sudirman', branchCode: 'JKT-001', platforms: [
    { platformId: 'tokopedia', status: 'active', shopId: 'bedagang-sudirman', shopName: 'Bedagang Sudirman' },
    { platformId: 'shopee', status: 'active', shopId: 'bedagang.sudirman', shopName: 'Bedagang Sudirman' },
    { platformId: 'lazada', status: 'pending' },
  ]},
  { branchId: 'branch-002', branchName: 'Cabang Bandung', branchCode: 'BDG-001', platforms: [
    { platformId: 'tokopedia', status: 'active', shopId: 'bedagang-bdg', shopName: 'Bedagang Bandung' },
    { platformId: 'shopee', status: 'pending' },
    { platformId: 'lazada', status: 'inactive' },
  ]},
];

const formatCurrency = (v: number) => v >= 1e9 ? `Rp ${(v/1e9).toFixed(2)}M` : v >= 1e6 ? `Rp ${(v/1e6).toFixed(0)}Jt` : `Rp ${v.toLocaleString('id-ID')}`;

export default function EcommerceIntegrationsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'platforms' | 'stores' | 'orders' | 'products'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { setMounted(true); }, []);

  const totalStats = {
    orders: platforms.reduce((a, p) => a + p.stats.orders, 0),
    revenue: platforms.reduce((a, p) => a + p.stats.revenue, 0),
    products: platforms.reduce((a, p) => a + p.stats.products, 0),
    stores: platforms.reduce((a, p) => a + p.connectedStores, 0)
  };

  if (!mounted) return null;

  return (
    <HQLayout title="E-Commerce Integration" subtitle="Kelola integrasi dengan marketplace e-commerce">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => window.location.href = '/hq/settings/integrations'} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /><span>Kembali</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            <Plus className="w-4 h-4" />Tambah Platform
          </button>
        </div>

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl"><ShoppingCart className="w-10 h-10" /></div>
              <div>
                <h1 className="text-2xl font-bold">E-Commerce</h1>
                <p className="text-white/80 mt-1">Tokopedia, Shopee, Lazada, Blibli</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{platforms.filter(p => p.status === 'active').length} Platform Aktif</span>
                  <span className="px-3 py-1 bg-emerald-500/30 rounded-full text-sm flex items-center gap-1"><CheckCircle className="w-3 h-3" />{totalStats.stores} Toko Terhubung</span>
                </div>
              </div>
            </div>
            <div className="text-right grid grid-cols-2 gap-6">
              <div><p className="text-white/60 text-sm">Total Orders</p><p className="text-2xl font-bold">{totalStats.orders.toLocaleString()}</p></div>
              <div><p className="text-white/60 text-sm">Revenue</p><p className="text-2xl font-bold">{formatCurrency(totalStats.revenue)}</p></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between"><div><p className="text-gray-500 text-sm">Total Orders</p><p className="text-2xl font-bold text-gray-900 mt-1">{totalStats.orders.toLocaleString()}</p></div><div className="p-3 bg-indigo-100 rounded-xl"><ShoppingBag className="w-6 h-6 text-indigo-600" /></div></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between"><div><p className="text-gray-500 text-sm">Revenue</p><p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalStats.revenue)}</p></div><div className="p-3 bg-emerald-100 rounded-xl"><DollarSign className="w-6 h-6 text-emerald-600" /></div></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between"><div><p className="text-gray-500 text-sm">Products Listed</p><p className="text-2xl font-bold text-gray-900 mt-1">{totalStats.products}</p></div><div className="p-3 bg-purple-100 rounded-xl"><Box className="w-6 h-6 text-purple-600" /></div></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between"><div><p className="text-gray-500 text-sm">Pending Shipment</p><p className="text-2xl font-bold text-amber-600 mt-1">45</p></div><div className="p-3 bg-amber-100 rounded-xl"><Truck className="w-6 h-6 text-amber-600" /></div></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'platforms', label: 'Platform', icon: ShoppingCart },
              { id: 'stores', label: 'Toko', icon: Store },
              { id: 'orders', label: 'Orders', icon: Package },
              { id: 'products', label: 'Produk', icon: Box }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-4 border-b-2 whitespace-nowrap text-sm ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <tab.icon className="w-4 h-4" />{tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Platform Terintegrasi</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {platforms.filter(p => p.status !== 'inactive').map(platform => (
                    <div key={platform.id} onClick={() => window.location.href = `/hq/settings/integrations/ecommerce/${platform.slug}`} className="bg-gray-50 rounded-xl p-5 hover:bg-gray-100 cursor-pointer group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 ${platform.bgColor} rounded-xl flex items-center justify-center text-white text-xl font-bold`}>{platform.name.charAt(0)}</div>
                          <div><h4 className="font-semibold text-gray-900">{platform.name}</h4><p className="text-sm text-gray-500">{platform.connectedStores} toko</p></div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Orders</p><p className="font-bold text-gray-900">{platform.stats.orders.toLocaleString()}</p></div>
                        <div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Revenue</p><p className="font-bold text-gray-900">{formatCurrency(platform.stats.revenue)}</p></div>
                        <div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Products</p><p className="font-bold text-gray-900">{platform.stats.products}</p></div>
                        <div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Rating</p><p className="font-bold text-gray-900">⭐ {platform.stats.avgRating}</p></div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {platform.features.slice(0, 2).map((f, i) => <span key={i} className="px-2 py-0.5 bg-white text-gray-600 text-xs rounded-full">{f}</span>)}
                        {platform.features.length > 2 && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-xs rounded-full">+{platform.features.length - 2}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'platforms' && (
              <div className="space-y-4">
                {platforms.map(platform => (
                  <div key={platform.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 ${platform.bgColor} rounded-xl flex items-center justify-center text-white text-2xl font-bold`}>{platform.name.charAt(0)}</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{platform.name}</h4>
                        <p className="text-sm text-gray-500">{platform.connectedStores} toko terhubung</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs mt-1 inline-block ${platform.status === 'active' ? 'bg-green-100 text-green-700' : platform.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{platform.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right"><p className="font-semibold text-gray-900">{platform.stats.orders.toLocaleString()} orders</p><p className="text-sm text-gray-500">{formatCurrency(platform.stats.revenue)}</p></div>
                      <button onClick={() => window.location.href = `/hq/settings/integrations/ecommerce/${platform.slug}`} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"><Settings className="w-4 h-4" />Kelola</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'stores' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Cari toko..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg" /></div></div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="bg-gray-50"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Cabang</th><th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Tokopedia</th><th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Shopee</th><th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Lazada</th><th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Aksi</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {storeConnections.filter(b => b.branchName.toLowerCase().includes(searchQuery.toLowerCase())).map(branch => (
                        <tr key={branch.branchId} className="hover:bg-gray-50">
                          <td className="px-4 py-3"><div className="flex items-center gap-3"><Store className="w-5 h-5 text-gray-400" /><div><p className="font-medium text-gray-900">{branch.branchName}</p><p className="text-xs text-gray-500">{branch.branchCode}</p></div></div></td>
                          {['tokopedia', 'shopee', 'lazada'].map(pId => {
                            const conn = branch.platforms.find(p => p.platformId === pId);
                            return <td key={pId} className="px-4 py-3 text-center">{conn?.status === 'active' ? <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" /> : conn?.status === 'pending' ? <Clock className="w-5 h-5 text-amber-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />}</td>;
                          })}
                          <td className="px-4 py-3 text-center"><button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">Kelola</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><p className="text-gray-500">Orders terbaru dari semua platform</p><button className="text-sm text-indigo-600 hover:text-indigo-700">Lihat Semua</button></div>
                <div className="space-y-3">
                  {[
                    { id: 'ORD-TKP-001', platform: 'Tokopedia', shop: 'Bedagang Official', customer: 'John D.', items: 3, total: 450000, status: 'pending', time: '10 menit lalu' },
                    { id: 'ORD-SHP-002', platform: 'Shopee', shop: 'Bedagang.ID', customer: 'Jane S.', items: 2, total: 285000, status: 'processing', time: '25 menit lalu' },
                    { id: 'ORD-LZD-003', platform: 'Lazada', shop: 'Bedagang Lazada', customer: 'Ahmad', items: 1, total: 125000, status: 'shipped', time: '1 jam lalu' },
                    { id: 'ORD-TKP-004', platform: 'Tokopedia', shop: 'Bedagang Bandung', customer: 'Siti', items: 4, total: 680000, status: 'delivered', time: '2 jam lalu' },
                  ].map(order => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${order.platform === 'Tokopedia' ? 'bg-green-500' : order.platform === 'Shopee' ? 'bg-orange-500' : 'bg-blue-600'}`}>{order.platform.charAt(0)}</div>
                        <div><div className="flex items-center gap-2"><p className="font-medium text-gray-900">{order.id}</p><span className="text-xs text-gray-500">• {order.platform}</span></div><p className="text-sm text-gray-500">{order.customer} • {order.items} item • {order.shop}</p></div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right"><p className="font-semibold text-gray-900">{formatCurrency(order.total)}</p><p className="text-xs text-gray-500">{order.time}</p></div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : order.status === 'processing' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                          {order.status === 'delivered' ? 'Diterima' : order.status === 'shipped' ? 'Dikirim' : order.status === 'processing' ? 'Diproses' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><div><h3 className="text-lg font-semibold text-gray-900">Sinkronisasi Produk</h3><p className="text-sm text-gray-500">Kelola produk di semua marketplace</p></div><button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" />Upload Produk</button></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {platforms.filter(p => p.status === 'active').map(platform => (
                    <div key={platform.id} className="bg-gray-50 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4"><div className={`w-10 h-10 ${platform.bgColor} rounded-lg flex items-center justify-center text-white font-bold`}>{platform.name.charAt(0)}</div><div><h4 className="font-semibold">{platform.name}</h4><p className="text-xs text-gray-500">{platform.stats.products} produk</p></div></div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Aktif</span><span className="font-medium text-emerald-600">{Math.floor(platform.stats.products * 0.9)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Draft</span><span className="font-medium text-amber-600">{Math.floor(platform.stats.products * 0.08)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Habis</span><span className="font-medium text-red-600">{Math.floor(platform.stats.products * 0.02)}</span></div>
                      </div>
                      <button className="w-full mt-4 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Sync Produk</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
