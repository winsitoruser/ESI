import React, { useState, useEffect } from 'react';
import HQLayout from '../../../../components/hq/HQLayout';
import { 
  Plug, 
  CreditCard, 
  MessageSquare, 
  Mail, 
  Truck, 
  Calculator, 
  ShoppingBag,
  Search,
  Filter,
  Plus,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Zap,
  Shield,
  Globe,
  FileText,
  Building2,
  ArrowRight,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  TestTube,
  Link2,
  Unlink
} from 'lucide-react';

interface Provider {
  id: string;
  code: string;
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  logo?: string;
  website?: string;
  features?: string[];
  requiresApproval: boolean;
  isActive: boolean;
}

interface Config {
  id: string;
  providerId: string;
  providerName: string;
  providerCategory: string;
  branchId: string | null;
  branchName: string;
  name: string;
  environment: string;
  merchantId?: string;
  status: string;
  isDefault: boolean;
  lastTestedAt?: string;
  lastTestResult?: { success: boolean };
  activatedAt?: string;
}

interface IntegrationRequest {
  id: string;
  requestNumber: string;
  providerName: string;
  providerCategory: string;
  branchName: string;
  requestType: string;
  status: string;
  submittedAt?: string;
  createdAt: string;
}

const categoryIcons: Record<string, any> = {
  payment_gateway: CreditCard,
  messaging: MessageSquare,
  email: Mail,
  delivery: Truck,
  accounting: Calculator,
  marketplace: ShoppingBag
};

const categoryLabels: Record<string, string> = {
  payment_gateway: 'Payment Gateway',
  messaging: 'Messaging',
  email: 'Email',
  delivery: 'Delivery',
  accounting: 'Accounting',
  marketplace: 'Marketplace'
};

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-700',
  rejected: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-purple-100 text-purple-700',
  pending_documents: 'bg-orange-100 text-orange-700',
  approved: 'bg-emerald-100 text-emerald-700'
};

export default function IntegrationsSettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'configs' | 'requests'>('overview');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [requests, setRequests] = useState<IntegrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [configSummary, setConfigSummary] = useState<any>(null);
  const [requestSummary, setRequestSummary] = useState<any>(null);
  const [categories, setCategories] = useState<Record<string, { label: string; count: number }>>({});

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [selectedCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [providersRes, configsRes, requestsRes] = await Promise.all([
        fetch(`/api/hq/integrations/providers?category=${selectedCategory}`),
        fetch('/api/hq/integrations/configs'),
        fetch('/api/hq/integrations/requests')
      ]);

      if (providersRes.ok) {
        const json1 = await providersRes.json();
        const p1 = json1.data || json1;
        setProviders(p1.providers || []);
        setCategories(p1.categories || {});
      }

      if (configsRes.ok) {
        const json2 = await configsRes.json();
        const p2 = json2.data || json2;
        setConfigs(p2.configs || []);
        setConfigSummary(p2.summary);
      }

      if (requestsRes.ok) {
        const json3 = await requestsRes.json();
        const p3 = json3.data || json3;
        setRequests(p3.requests || []);
        setRequestSummary(p3.summary);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = providers.filter(p => {
    if (searchQuery) {
      return p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  if (!mounted) return null;

  return (
    <HQLayout title="Integrasi Pihak Ketiga" subtitle="Kelola koneksi payment gateway, messaging, email, dan layanan lainnya">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total Integrasi Aktif</p>
                <p className="text-3xl font-bold mt-1">{configSummary?.active || 0}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Plug className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-white/80">
              <CheckCircle className="w-4 h-4" />
              <span>{configSummary?.total || 0} total konfigurasi</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Payment Gateway</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {configSummary?.byCategory?.payment_gateway || 0}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CreditCard className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">QRIS, VA, E-Wallet</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Messaging</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {configSummary?.byCategory?.messaging || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">WhatsApp, Telegram</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pengajuan Pending</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {(requestSummary?.underReview || 0) + (requestSummary?.pendingDocuments || 0)}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Menunggu proses</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex items-center gap-1 p-2">
              {[
                { id: 'overview', label: 'Overview', icon: Globe },
                { id: 'providers', label: 'Provider Tersedia', icon: Zap },
                { id: 'configs', label: 'Konfigurasi Aktif', icon: Settings },
                { id: 'requests', label: 'Pengajuan', icon: FileText }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'requests' && requestSummary?.underReview > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                      {requestSummary.underReview}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Actions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('providers')}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 hover:border-indigo-200 transition-all group"
                    >
                      <div className="p-3 bg-indigo-100 rounded-xl group-hover:bg-indigo-200 transition-colors">
                        <Plus className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Tambah Integrasi Baru</p>
                        <p className="text-sm text-gray-500">Pilih provider dan konfigurasi</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                    </button>

                    <button
                      onClick={() => window.location.href = '/hq/settings/integrations/payment-gateway'}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 hover:border-emerald-200 transition-all group"
                    >
                      <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
                        <CreditCard className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Payment Gateway</p>
                        <p className="text-sm text-gray-500">Kelola metode pembayaran</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                    </button>

                    <button
                      onClick={() => window.location.href = '/hq/settings/integrations/messaging'}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:border-blue-200 transition-all group"
                    >
                      <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Messaging</p>
                        <p className="text-sm text-gray-500">WhatsApp, Telegram</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                    </button>

                    <button
                      onClick={() => window.location.href = '/hq/settings/integrations/food-delivery'}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100 hover:border-orange-200 transition-all group"
                    >
                      <div className="p-3 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
                        <Truck className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Food Delivery</p>
                        <p className="text-sm text-gray-500">GoFood, GrabFood, ShopeeFood</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                    </button>

                    <button
                      onClick={() => window.location.href = '/hq/settings/integrations/ecommerce'}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 hover:border-purple-200 transition-all group"
                    >
                      <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                        <ShoppingBag className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">E-Commerce</p>
                        <p className="text-sm text-gray-500">Tokopedia, Shopee, Lazada</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                    </button>
                  </div>
                </div>

                {/* Active Integrations by Category */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Integrasi per Kategori</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(categoryLabels).map(([key, label]) => {
                      const Icon = categoryIcons[key];
                      const count = configSummary?.byCategory?.[key] || 0;
                      const providerCount = categories[key]?.count || 0;

                      return (
                        <div
                          key={key}
                          className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedCategory(key);
                            setActiveTab('providers');
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-lg shadow-sm">
                                <Icon className="w-5 h-5 text-gray-600" />
                              </div>
                              <span className="font-medium text-gray-900">{label}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">{providerCount} provider tersedia</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {count} aktif
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Requests */}
                {requests.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Pengajuan Terbaru</h3>
                      <button
                        onClick={() => setActiveTab('requests')}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Lihat Semua
                      </button>
                    </div>
                    <div className="space-y-3">
                      {requests.slice(0, 3).map(req => (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              {React.createElement(categoryIcons[req.providerCategory] || Plug, {
                                className: 'w-5 h-5 text-gray-600'
                              })}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{req.providerName}</p>
                              <p className="text-sm text-gray-500">{req.requestNumber} • {req.branchName}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[req.status]}`}>
                            {req.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Providers Tab */}
            {activeTab === 'providers' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari provider..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">Semua Kategori</option>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Provider Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProviders.map(provider => {
                    const Icon = categoryIcons[provider.category] || Plug;
                    const activeConfig = configs.find(c => c.providerId === provider.id && c.status === 'active');

                    return (
                      <div
                        key={provider.id}
                        className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gray-100 rounded-xl">
                              <Icon className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                              <p className="text-xs text-gray-500">{categoryLabels[provider.category]}</p>
                            </div>
                          </div>
                          {activeConfig && (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                              Aktif
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {provider.description || 'Tidak ada deskripsi'}
                        </p>

                        {provider.features && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {provider.features.slice(0, 3).map((feature, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                              >
                                {feature}
                              </span>
                            ))}
                            {provider.features.length > 3 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                +{provider.features.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {activeConfig ? (
                            <button
                              onClick={() => window.location.href = `/hq/settings/integrations/manage/${provider.code}`}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                            >
                              <Settings className="w-4 h-4" />
                              Kelola
                            </button>
                          ) : provider.requiresApproval ? (
                            <button
                              onClick={() => window.location.href = `/hq/settings/integrations/request/${provider.code}`}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                            >
                              <FileText className="w-4 h-4" />
                              Ajukan
                            </button>
                          ) : (
                            <button
                              onClick={() => window.location.href = `/hq/settings/integrations/setup/${provider.code}`}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                            >
                              <Link2 className="w-4 h-4" />
                              Hubungkan
                            </button>
                          )}
                          {provider.website && (
                            <a
                              href={provider.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-gray-500" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Configs Tab */}
            {activeTab === 'configs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-gray-500">{configs.length} konfigurasi ditemukan</p>
                  <button
                    onClick={() => setActiveTab('providers')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Integrasi
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Provider</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nama Config</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cabang</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Environment</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {configs.map(config => {
                        const Icon = categoryIcons[config.providerCategory] || Plug;
                        return (
                          <tr key={config.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                  <Icon className="w-4 h-4 text-gray-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{config.providerName}</p>
                                  {config.merchantId && (
                                    <p className="text-xs text-gray-500">ID: {config.merchantId}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-gray-900">{config.name}</p>
                              {config.isDefault && (
                                <span className="text-xs text-indigo-600 font-medium">Default</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">{config.branchName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                config.environment === 'production' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {config.environment}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[config.status]}`}>
                                {config.status}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={async () => {
                                    try {
                                      const r = await fetch(`/api/hq/integrations/configs/${config.id}/test`, { method: 'POST' });
                                      const json = await r.json();
                                      alert(json.message || (r.ok ? 'Test berhasil' : 'Test gagal'));
                                      fetchData();
                                    } catch {
                                      alert('Gagal melakukan test koneksi');
                                    }
                                  }}
                                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Test Connection"
                                >
                                  <TestTube className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    const providerObj = providers.find(p => p.id === config.providerId);
                                    if (providerObj) {
                                      window.location.href = `/hq/settings/integrations/manage/${providerObj.code}?configId=${config.id}`;
                                    }
                                  }}
                                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Hapus konfigurasi "${config.name}"?`)) return;
                                    try {
                                      const r = await fetch(`/api/hq/integrations/configs/${config.id}`, { method: 'DELETE' });
                                      if (r.ok) {
                                        alert('Konfigurasi dihapus');
                                        fetchData();
                                      } else {
                                        alert('Gagal menghapus konfigurasi');
                                      }
                                    } catch {
                                      alert('Gagal menghapus konfigurasi');
                                    }
                                  }}
                                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-gray-500">{requests.length} pengajuan</p>
                    <div className="flex items-center gap-2">
                      {requestSummary && (
                        <>
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                            {requestSummary.underReview} Review
                          </span>
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                            {requestSummary.pendingDocuments} Pending Docs
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('providers')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Pengajuan Baru
                  </button>
                </div>

                <div className="space-y-3">
                  {requests.map(req => {
                    const Icon = categoryIcons[req.providerCategory] || Plug;
                    return (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-gray-100 rounded-xl">
                            <Icon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{req.providerName}</p>
                              <span className="text-xs text-gray-400">{req.requestNumber}</span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {req.branchName} • {req.requestType.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[req.status]}`}>
                            {req.status.replace('_', ' ')}
                          </span>
                          <p className="text-xs text-gray-400">
                            {new Date(req.createdAt).toLocaleDateString('id-ID')}
                          </p>
                          <button
                            onClick={() => window.location.href = `/hq/settings/integrations/requests/${req.id}`}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
