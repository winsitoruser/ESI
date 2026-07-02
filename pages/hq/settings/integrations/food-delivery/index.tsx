import React, { useState, useEffect } from 'react';
import HQLayout from '../../../../../components/hq/HQLayout';
import {
  ArrowLeft, UtensilsCrossed, Store, CheckCircle, XCircle, Clock, AlertCircle, ChevronRight,
  ExternalLink, RefreshCw, Plus, TrendingUp, Activity, ShoppingBag, Bike, Package,
  DollarSign, BarChart3, Settings, Search, Filter, MoreVertical, Zap, Users, MapPin
} from 'lucide-react';

interface FoodDeliveryPlatform {
  id: string;
  name: string;
  slug: string;
  logo: string;
  color: string;
  bgColor: string;
  status: 'active' | 'pending' | 'inactive';
  connectedBranches: number;
  totalBranches: number;
  stats: { orders: number; revenue: number; avgRating: number; completionRate: number };
  features: string[];
}

interface BranchConnection {
  branchId: string;
  branchName: string;
  branchCode: string;
  platforms: { platformId: string; status: 'active' | 'pending' | 'inactive'; storeId?: string; }[];
}

const platforms: FoodDeliveryPlatform[] = [
  {
    id: 'gofood', name: 'GoFood', slug: 'gofood', logo: '🟢', color: 'text-green-600', bgColor: 'bg-green-500',
    status: 'active', connectedBranches: 8, totalBranches: 12,
    stats: { orders: 12450, revenue: 875000000, avgRating: 4.8, completionRate: 96.5 },
    features: ['Auto Accept Order', 'Menu Sync', 'Promo Integration', 'Real-time Status']
  },
  {
    id: 'grabfood', name: 'GrabFood', slug: 'grabfood', logo: '🟢', color: 'text-green-500', bgColor: 'bg-green-600',
    status: 'active', connectedBranches: 6, totalBranches: 12,
    stats: { orders: 8750, revenue: 625000000, avgRating: 4.7, completionRate: 95.2 },
    features: ['Auto Accept Order', 'Menu Sync', 'Ads Integration', 'Analytics Dashboard']
  },
  {
    id: 'shopeefood', name: 'ShopeeFood', slug: 'shopeefood', logo: '🟠', color: 'text-orange-500', bgColor: 'bg-orange-500',
    status: 'active', connectedBranches: 4, totalBranches: 12,
    stats: { orders: 3250, revenue: 245000000, avgRating: 4.6, completionRate: 94.8 },
    features: ['Auto Accept Order', 'Menu Sync', 'Voucher Sync', 'Flash Sale']
  }
];

const branchConnections: BranchConnection[] = [
  { branchId: 'hq', branchName: 'HQ Jakarta', branchCode: 'HQ-001', platforms: [
    { platformId: 'gofood', status: 'active', storeId: 'GFOOD-HQ-001' },
    { platformId: 'grabfood', status: 'active', storeId: 'GRAB-HQ-001' },
    { platformId: 'shopeefood', status: 'active', storeId: 'SFOOD-HQ-001' }
  ]},
  { branchId: 'branch-001', branchName: 'Cabang Sudirman', branchCode: 'JKT-001', platforms: [
    { platformId: 'gofood', status: 'active', storeId: 'GFOOD-JKT-001' },
    { platformId: 'grabfood', status: 'active', storeId: 'GRAB-JKT-001' },
    { platformId: 'shopeefood', status: 'pending' }
  ]},
  { branchId: 'branch-002', branchName: 'Cabang Bandung', branchCode: 'BDG-001', platforms: [
    { platformId: 'gofood', status: 'active', storeId: 'GFOOD-BDG-001' },
    { platformId: 'grabfood', status: 'pending' },
    { platformId: 'shopeefood', status: 'inactive' }
  ]},
  { branchId: 'branch-003', branchName: 'Cabang Surabaya', branchCode: 'SBY-001', platforms: [
    { platformId: 'gofood', status: 'active', storeId: 'GFOOD-SBY-001' },
    { platformId: 'grabfood', status: 'active', storeId: 'GRAB-SBY-001' },
    { platformId: 'shopeefood', status: 'active', storeId: 'SFOOD-SBY-001' }
  ]}
];

const formatCurrency = (v: number) => v >= 1e9 ? `Rp ${(v/1e9).toFixed(2)}M` : v >= 1e6 ? `Rp ${(v/1e6).toFixed(0)}Jt` : `Rp ${v.toLocaleString('id-ID')}`;

export default function FoodDeliveryIntegrationsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'platforms' | 'branches' | 'orders'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { setMounted(true); }, []);

  const totalStats = {
    orders: platforms.reduce((a, p) => a + p.stats.orders, 0),
    revenue: platforms.reduce((a, p) => a + p.stats.revenue, 0),
    avgRating: (platforms.reduce((a, p) => a + p.stats.avgRating, 0) / platforms.length).toFixed(1),
    connectedBranches: new Set(branchConnections.flatMap(b => b.platforms.filter(p => p.status === 'active').map(() => b.branchId))).size
  };

  if (!mounted) return null;

  return (
    <HQLayout title="Food Delivery Integration" subtitle="Kelola integrasi dengan platform food delivery">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => window.location.href = '/hq/settings/integrations'} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /><span>Kembali</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            <Plus className="w-4 h-4" />Tambah Platform
          </button>
        </div>

        {/* Hero Stats */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl"><UtensilsCrossed className="w-10 h-10" /></div>
              <div>
                <h1 className="text-2xl font-bold">Food Delivery</h1>
                <p className="text-white/80 mt-1">GoFood, GrabFood, ShopeeFood</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{platforms.filter(p => p.status === 'active').length} Platform Aktif</span>
                  <span className="px-3 py-1 bg-emerald-500/30 rounded-full text-sm flex items-center gap-1"><CheckCircle className="w-3 h-3" />{totalStats.connectedBranches} Cabang Terhubung</span>
                </div>
              </div>
            </div>
            <div className="text-right grid grid-cols-2 gap-6">
              <div><p className="text-white/60 text-sm">Total Orders</p><p className="text-2xl font-bold">{totalStats.orders.toLocaleString()}</p></div>
              <div><p className="text-white/60 text-sm">Revenue</p><p className="text-2xl font-bold">{formatCurrency(totalStats.revenue)}</p></div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-gray-500 text-sm">Total Orders</p><p className="text-2xl font-bold text-gray-900 mt-1">{totalStats.orders.toLocaleString()}</p></div>
              <div className="p-3 bg-orange-100 rounded-xl"><ShoppingBag className="w-6 h-6 text-orange-600" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-gray-500 text-sm">Revenue</p><p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalStats.revenue)}</p></div>
              <div className="p-3 bg-emerald-100 rounded-xl"><DollarSign className="w-6 h-6 text-emerald-600" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-gray-500 text-sm">Avg Rating</p><p className="text-2xl font-bold text-gray-900 mt-1">⭐ {totalStats.avgRating}</p></div>
              <div className="p-3 bg-amber-100 rounded-xl"><TrendingUp className="w-6 h-6 text-amber-600" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-gray-500 text-sm">Active Drivers</p><p className="text-2xl font-bold text-gray-900 mt-1">24</p></div>
              <div className="p-3 bg-blue-100 rounded-xl"><Bike className="w-6 h-6 text-blue-600" /></div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'platforms', label: 'Platform', icon: UtensilsCrossed },
              { id: 'branches', label: 'Cabang', icon: Store },
              { id: 'orders', label: 'Orders', icon: Package }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-4 border-b-2 whitespace-nowrap text-sm ${activeTab === tab.id ? 'border-orange-500 text-orange-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <tab.icon className="w-4 h-4" />{tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Platform Terintegrasi</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {platforms.map(platform => (
                    <div key={platform.id} onClick={() => window.location.href = `/hq/settings/integrations/food-delivery/${platform.slug}`} className="bg-gray-50 rounded-xl p-5 hover:bg-gray-100 cursor-pointer group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 ${platform.bgColor} rounded-xl flex items-center justify-center text-white text-2xl`}>
                            {platform.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{platform.name}</h4>
                            <p className="text-sm text-gray-500">{platform.connectedBranches}/{platform.totalBranches} cabang</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-500">Orders</p>
                          <p className="font-bold text-gray-900">{platform.stats.orders.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-500">Revenue</p>
                          <p className="font-bold text-gray-900">{formatCurrency(platform.stats.revenue)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-500">Rating</p>
                          <p className="font-bold text-gray-900">⭐ {platform.stats.avgRating}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-500">Completion</p>
                          <p className="font-bold text-emerald-600">{platform.stats.completionRate}%</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {platform.features.slice(0, 2).map((f, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white text-gray-600 text-xs rounded-full">{f}</span>
                        ))}
                        {platform.features.length > 2 && <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">+{platform.features.length - 2}</span>}
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
                      <div className={`w-14 h-14 ${platform.bgColor} rounded-xl flex items-center justify-center text-white text-2xl font-bold`}>
                        {platform.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{platform.name}</h4>
                        <p className="text-sm text-gray-500">{platform.connectedBranches} cabang terhubung</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${platform.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{platform.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{platform.stats.orders.toLocaleString()} orders</p>
                        <p className="text-sm text-gray-500">{formatCurrency(platform.stats.revenue)}</p>
                      </div>
                      <button onClick={() => window.location.href = `/hq/settings/integrations/food-delivery/${platform.slug}`} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm">
                        <Settings className="w-4 h-4" />Kelola
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'branches' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Cari cabang..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg" /></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="bg-gray-50"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Cabang</th><th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">GoFood</th><th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">GrabFood</th><th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">ShopeeFood</th><th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Aksi</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {branchConnections.filter(b => b.branchName.toLowerCase().includes(searchQuery.toLowerCase())).map(branch => (
                        <tr key={branch.branchId} className="hover:bg-gray-50">
                          <td className="px-4 py-3"><div className="flex items-center gap-3"><Store className="w-5 h-5 text-gray-400" /><div><p className="font-medium text-gray-900">{branch.branchName}</p><p className="text-xs text-gray-500">{branch.branchCode}</p></div></div></td>
                          {['gofood', 'grabfood', 'shopeefood'].map(pId => {
                            const conn = branch.platforms.find(p => p.platformId === pId);
                            return (
                              <td key={pId} className="px-4 py-3 text-center">
                                {conn?.status === 'active' ? <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" /> : conn?.status === 'pending' ? <Clock className="w-5 h-5 text-amber-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />}
                              </td>
                            );
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
                <div className="flex items-center justify-between">
                  <p className="text-gray-500">Orders terbaru dari semua platform</p>
                  <button className="text-sm text-orange-600 hover:text-orange-700">Lihat Semua</button>
                </div>
                <div className="space-y-3">
                  {[
                    { id: 'ORD-001', platform: 'GoFood', branch: 'HQ Jakarta', customer: 'John D.', items: 3, total: 125000, status: 'completed', time: '10 menit lalu' },
                    { id: 'ORD-002', platform: 'GrabFood', branch: 'Cabang Sudirman', customer: 'Jane S.', items: 2, total: 85000, status: 'preparing', time: '15 menit lalu' },
                    { id: 'ORD-003', platform: 'ShopeeFood', branch: 'Cabang Bandung', customer: 'Ahmad', items: 5, total: 245000, status: 'on_delivery', time: '20 menit lalu' },
                    { id: 'ORD-004', platform: 'GoFood', branch: 'Cabang Surabaya', customer: 'Siti', items: 1, total: 45000, status: 'completed', time: '25 menit lalu' },
                  ].map(order => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${order.platform === 'GoFood' ? 'bg-green-500' : order.platform === 'GrabFood' ? 'bg-green-600' : 'bg-orange-500'}`}>
                          {order.platform.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2"><p className="font-medium text-gray-900">{order.id}</p><span className="text-xs text-gray-500">• {order.platform}</span></div>
                          <p className="text-sm text-gray-500">{order.customer} • {order.items} item • {order.branch}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(order.total)}</p>
                          <p className="text-xs text-gray-500">{order.time}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : order.status === 'preparing' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {order.status === 'completed' ? 'Selesai' : order.status === 'preparing' ? 'Diproses' : 'Dalam Perjalanan'}
                        </span>
                      </div>
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
