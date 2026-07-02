import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Package, Plus, Edit, Users, TrendingUp, CheckCircle, XCircle,
  Search, Filter, LayoutGrid, List, RefreshCw, Shield, Zap,
  ArrowUpDown, ChevronDown, ChevronRight, ExternalLink, Eye,
  ToggleLeft, ToggleRight, Layers, Globe, Settings, Wallet,
  BarChart3, Briefcase, Factory, Truck, MessageCircle, Target,
  ShoppingCart, UserCheck, Award, Megaphone, Send, Plug, Clock
} from 'lucide-react';

interface ModuleData {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  sortOrder: number;
  isCore: boolean;
  isActive: boolean;
  category: string;
  pricingTier: string;
  setupComplexity: string;
  color: string;
  version: string;
  features: string[];
  tags: string[];
  stats: { enabledTenants: number };
  dependencies: Array<{ moduleCode: string; moduleName: string; type: string }>;
  dependedBy: Array<{ moduleCode: string; moduleName: string; type: string }>;
  businessTypeModules: Array<{
    businessType: { id: string; code: string; name: string };
    isDefault: boolean;
    isOptional: boolean;
  }>;
}

interface AggregateStats {
  total: number;
  core: number;
  active: number;
  inactive: number;
  byCategory: Record<string, number>;
  byTier: Record<string, number>;
}

const ICON_MAP: Record<string, any> = {
  LayoutDashboard: BarChart3, ShoppingCart, Package, Users, Wallet, BarChart3,
  Building2: Layers, Truck, UserCheck, Settings, MessageCircle, Globe,
  Briefcase, Megaphone, Layers, Send, Shield, Target, Award, Factory, Plug,
  ChefHat: Clock, Utensils: Clock, Calendar: Clock, Ticket: Award
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  core: { label: 'Sistem Inti', icon: Shield, color: 'text-blue-600 bg-blue-50' },
  operations: { label: 'Operasional', icon: Package, color: 'text-emerald-600 bg-emerald-50' },
  finance: { label: 'Keuangan', icon: Wallet, color: 'text-amber-600 bg-amber-50' },
  hr: { label: 'SDM & HR', icon: UserCheck, color: 'text-purple-600 bg-purple-50' },
  crm: { label: 'CRM', icon: Users, color: 'text-pink-600 bg-pink-50' },
  sales: { label: 'Sales & Marketing', icon: Briefcase, color: 'text-rose-600 bg-rose-50' },
  marketing: { label: 'Marketing', icon: Megaphone, color: 'text-red-600 bg-red-50' },
  analytics: { label: 'Analitik', icon: BarChart3, color: 'text-sky-600 bg-sky-50' },
  integration: { label: 'Integrasi', icon: Globe, color: 'text-indigo-600 bg-indigo-50' },
  system: { label: 'Sistem', icon: Settings, color: 'text-gray-600 bg-gray-50' },
};

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  basic: { label: 'Basic', color: 'text-green-700', bg: 'bg-green-100' },
  professional: { label: 'Pro', color: 'text-blue-700', bg: 'bg-blue-100' },
  enterprise: { label: 'Enterprise', color: 'text-purple-700', bg: 'bg-purple-100' },
};

const CATEGORY_ORDER = ['core', 'operations', 'finance', 'hr', 'sales', 'marketing', 'analytics', 'integration', 'system'];

export default function ModulesManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [stats, setStats] = useState<AggregateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORY_ORDER));
  const [toggling, setToggling] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
      return;
    }
    const userRole = (session?.user?.role as string)?.toLowerCase();
    if (session && !['admin', 'super_admin', 'superadmin'].includes(userRole)) {
      router.push('/admin/dashboard');
      return;
    }
    if (status === 'authenticated') fetchModules();
  }, [status, session, router]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (filterTier !== 'all') params.set('pricingTier', filterTier);
      if (filterStatus === 'active') params.set('isActive', 'true');
      if (filterStatus === 'inactive') params.set('isActive', 'false');

      const response = await fetch(`/api/admin/modules?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch modules');
      const data = await response.json();
      setModules(data.data || []);
      setStats(data.stats || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategory, filterTier, filterStatus]);

  useEffect(() => {
    if (status === 'authenticated') {
      const debounce = setTimeout(() => fetchModules(), 300);
      return () => clearTimeout(debounce);
    }
  }, [searchQuery, filterCategory, filterTier, filterStatus]);

  const toggleModuleActive = async (mod: ModuleData) => {
    if (mod.isCore) return;
    try {
      setToggling(mod.id);
      const res = await fetch(`/api/admin/modules/${mod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !mod.isActive })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to toggle');
      }
      setModules(prev => prev.map(m => m.id === mod.id ? { ...m, isActive: !m.isActive } : m));
      setToast({ message: `${mod.name} ${!mod.isActive ? 'diaktifkan' : 'dinonaktifkan'}`, type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setToggling(null);
    }
  };

  const getModuleIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName] || Package;
    return Icon;
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // Group modules by category
  const groupedModules = CATEGORY_ORDER.reduce((acc, cat) => {
    const catModules = modules.filter(m => m.category === cat);
    if (catModules.length > 0) acc[cat] = catModules;
    return acc;
  }, {} as Record<string, ModuleData[]>);
  // Add uncategorized
  const knownCats = new Set(CATEGORY_ORDER);
  const uncategorized = modules.filter(m => !knownCats.has(m.category));
  if (uncategorized.length > 0) groupedModules['other'] = uncategorized;

  if (loading && modules.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat modul...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Manajemen Modul - Panel Admin Bedagang</title>
      </Head>

      <AdminLayout>
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manajemen Modul</h1>
              <p className="mt-1 text-sm text-gray-500">
                Kelola {stats?.total || 0} modul platform — konfigurasi, aktivasi, dan penugasan ke bisnis
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchModules()}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/admin/modules/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Buat Modul
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-500 font-medium">Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-indigo-500" />
                <span className="text-xs text-gray-500 font-medium">Core</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.core}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-500 font-medium">Aktif</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs text-gray-500 font-medium">Nonaktif</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-500 font-medium">Basic</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.byTier?.basic || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-gray-500 font-medium">Pro/Enterprise</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{(stats.byTier?.professional || 0) + (stats.byTier?.enterprise || 0)}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari modul (nama, kode, deskripsi)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {/* Category */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Kategori</option>
              {CATEGORY_ORDER.map(cat => (
                <option key={cat} value={cat}>{CATEGORY_CONFIG[cat]?.label || cat}</option>
              ))}
            </select>
            {/* Tier */}
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Tier</option>
              <option value="basic">Basic (Free)</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
            {/* Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
            {/* View toggle */}
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={fetchModules} className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium">Coba lagi</button>
          </div>
        )}

        {/* GRID VIEW */}
        {viewMode === 'grid' && (
          <div className="space-y-6 pb-8">
            {Object.entries(groupedModules).map(([cat, catModules]) => {
              const catConfig = CATEGORY_CONFIG[cat] || { label: cat, icon: Package, color: 'text-gray-600 bg-gray-50' };
              const CatIcon = catConfig.icon;
              const isExpanded = expandedCategories.has(cat);

              return (
                <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${catConfig.color}`}>
                        <CatIcon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-semibold text-gray-900">{catConfig.label}</h3>
                        <p className="text-xs text-gray-500">{catModules.length} modul</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {catModules.map((mod) => {
                          const ModIcon = getModuleIcon(mod.icon);
                          const tierCfg = TIER_CONFIG[mod.pricingTier] || TIER_CONFIG.basic;
                          return (
                            <div
                              key={mod.id}
                              className={`relative rounded-xl border p-5 transition-all hover:shadow-md ${
                                mod.isActive
                                  ? 'border-gray-200 bg-white'
                                  : 'border-gray-100 bg-gray-50 opacity-75'
                              }`}
                            >
                              {/* Top row */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: mod.color + '20' }}
                                  >
                                    <ModIcon className="w-5 h-5" style={{ color: mod.color }} />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900 text-sm">{mod.name}</h4>
                                    <p className="text-xs text-gray-400 font-mono">{mod.code}</p>
                                  </div>
                                </div>
                                {/* Toggle */}
                                <button
                                  onClick={() => toggleModuleActive(mod)}
                                  disabled={mod.isCore || toggling === mod.id}
                                  className={`flex-shrink-0 ${mod.isCore ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                  title={mod.isCore ? 'Modul inti tidak bisa dinonaktifkan' : (mod.isActive ? 'Nonaktifkan' : 'Aktifkan')}
                                >
                                  {toggling === mod.id ? (
                                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                  ) : mod.isActive ? (
                                    <ToggleRight className="w-6 h-6 text-green-500" />
                                  ) : (
                                    <ToggleLeft className="w-6 h-6 text-gray-300" />
                                  )}
                                </button>
                              </div>

                              {/* Description */}
                              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{mod.description || '—'}</p>

                              {/* Badges */}
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {mod.isCore && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700 uppercase">Core</span>
                                )}
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${tierCfg.bg} ${tierCfg.color} uppercase`}>
                                  {tierCfg.label}
                                </span>
                                <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500">
                                  v{mod.version || '1.0.0'}
                                </span>
                              </div>

                              {/* Features preview */}
                              {mod.features && mod.features.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Fitur</p>
                                  <div className="flex flex-wrap gap-1">
                                    {mod.features.slice(0, 4).map((f, i) => (
                                      <span key={i} className="px-1.5 py-0.5 text-[10px] bg-gray-50 text-gray-600 rounded border border-gray-100">
                                        {f}
                                      </span>
                                    ))}
                                    {mod.features.length > 4 && (
                                      <span className="px-1.5 py-0.5 text-[10px] text-gray-400">+{mod.features.length - 4}</span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Dependencies */}
                              {mod.dependencies && mod.dependencies.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Dependensi</p>
                                  <div className="flex flex-wrap gap-1">
                                    {mod.dependencies.map((d, i) => (
                                      <span key={i} className={`px-1.5 py-0.5 text-[10px] rounded border ${
                                        d.type === 'required' ? 'bg-red-50 text-red-600 border-red-100' :
                                        d.type === 'recommended' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                        'bg-gray-50 text-gray-500 border-gray-100'
                                      }`}>
                                        {d.moduleCode}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Footer */}
                              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {mod.stats?.enabledTenants || 0}
                                  </span>
                                  {mod.route && (
                                    <code className="bg-gray-50 px-1 py-0.5 rounded text-[10px]">{mod.route}</code>
                                  )}
                                </div>
                                <Link
                                  href={`/admin/modules/${mod.id}`}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  <Edit className="w-3 h-3" />
                                  Edit
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TABLE VIEW */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Modul</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kategori</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tier</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Tenants</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Deps</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Route</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {modules.map((mod) => {
                    const ModIcon = getModuleIcon(mod.icon);
                    const tierCfg = TIER_CONFIG[mod.pricingTier] || TIER_CONFIG.basic;
                    const catCfg = CATEGORY_CONFIG[mod.category] || CATEGORY_CONFIG.system;
                    return (
                      <tr key={mod.id} className={`hover:bg-gray-50 transition-colors ${!mod.isActive ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: mod.color + '20' }}>
                              <ModIcon className="w-4 h-4" style={{ color: mod.color }} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{mod.name}</p>
                              <p className="text-xs text-gray-400 font-mono">{mod.code}</p>
                            </div>
                            {mod.isCore && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-700">CORE</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${catCfg.color}`}>
                            {catCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${tierCfg.bg} ${tierCfg.color}`}>
                            {tierCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleModuleActive(mod)}
                            disabled={mod.isCore || toggling === mod.id}
                            className={mod.isCore ? 'cursor-not-allowed' : 'cursor-pointer'}
                          >
                            {toggling === mod.id ? (
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            ) : mod.isActive ? (
                              <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{mod.stats?.enabledTenants || 0}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{mod.dependencies?.length || 0}</td>
                        <td className="px-4 py-3">
                          {mod.route && <code className="text-xs bg-gray-50 px-1.5 py-0.5 rounded text-gray-500">{mod.route}</code>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/modules/${mod.id}`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {modules.length === 0 && (
              <div className="text-center py-12">
                <Package className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">Tidak ada modul ditemukan</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state (no modules at all) */}
        {modules.length === 0 && !loading && !error && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-lg font-medium text-gray-900">Belum ada modul</h3>
            <p className="mt-1 text-sm text-gray-500">Jalankan seed script atau buat modul baru.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link
                href="/admin/modules/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Buat Modul
              </Link>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
