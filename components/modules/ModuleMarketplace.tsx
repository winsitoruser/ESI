import { useState } from 'react';
import { 
  Search, Filter, Star, Download, TrendingUp, Award, 
  Package, ChefHat, Store, Zap, Crown, Shield, Check
} from 'lucide-react';

interface MarketplaceModule {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: 'basic' | 'professional' | 'enterprise';
  price: number;
  rating: number;
  downloads: number;
  isInstalled: boolean;
  isPopular: boolean;
  isNew: boolean;
  tags: string[];
  screenshots: string[];
  features: string[];
}

const MARKETPLACE_MODULES: MarketplaceModule[] = [
  {
    id: '1',
    code: 'ADVANCED_ANALYTICS',
    name: 'Advanced Analytics Pro',
    description: 'Dashboard analitik lengkap dengan AI insights dan predictive analytics',
    icon: 'BarChart3',
    category: 'analytics',
    tier: 'professional',
    price: 299000,
    rating: 4.8,
    downloads: 1250,
    isInstalled: false,
    isPopular: true,
    isNew: false,
    tags: ['analytics', 'AI', 'reporting'],
    screenshots: [],
    features: [
      'Real-time analytics dashboard',
      'AI-powered insights',
      'Predictive analytics',
      'Custom report builder',
      'Export to Excel/PDF'
    ]
  },
  {
    id: '2',
    code: 'MULTI_LOCATION',
    name: 'Multi-Location Manager',
    description: 'Kelola multiple cabang dengan sinkronisasi real-time',
    icon: 'Building2',
    category: 'operations',
    tier: 'enterprise',
    price: 499000,
    rating: 4.9,
    downloads: 850,
    isInstalled: false,
    isPopular: true,
    isNew: false,
    tags: ['multi-location', 'sync', 'enterprise'],
    screenshots: [],
    features: [
      'Unlimited branches',
      'Real-time sync',
      'Centralized inventory',
      'Branch performance tracking',
      'Inter-branch transfers'
    ]
  },
  {
    id: '3',
    code: 'LOYALTY_ADVANCED',
    name: 'Loyalty Program Plus',
    description: 'Program loyalitas dengan gamification dan rewards',
    icon: 'Award',
    category: 'crm',
    tier: 'professional',
    price: 199000,
    rating: 4.7,
    downloads: 2100,
    isInstalled: false,
    isPopular: true,
    isNew: false,
    tags: ['loyalty', 'rewards', 'gamification'],
    screenshots: [],
    features: [
      'Points & rewards system',
      'Tiered membership',
      'Gamification features',
      'Birthday rewards',
      'Referral program'
    ]
  },
  {
    id: '4',
    code: 'WHATSAPP_INTEGRATION',
    name: 'WhatsApp Business Integration',
    description: 'Integrasi WhatsApp Business API untuk notifikasi dan chat',
    icon: 'MessageCircle',
    category: 'integration',
    tier: 'professional',
    price: 149000,
    rating: 4.6,
    downloads: 1800,
    isInstalled: false,
    isPopular: false,
    isNew: true,
    tags: ['whatsapp', 'notification', 'chat'],
    screenshots: [],
    features: [
      'Auto notifications',
      'Order confirmations',
      'Customer chat',
      'Broadcast messages',
      'Template messages'
    ]
  }
];

export default function ModuleMarketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'price'>('popular');

  const filteredModules = MARKETPLACE_MODULES.filter(mod => {
    if (searchQuery && !mod.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !mod.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (categoryFilter !== 'all' && mod.category !== categoryFilter) return false;
    if (tierFilter !== 'all' && mod.tier !== tierFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'popular') return b.downloads - a.downloads;
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'price') return a.price - b.price;
    return 0;
  });

  const getTierBadge = (tier: string) => {
    const badges = {
      basic: { label: 'Basic', color: 'bg-green-100 text-green-700' },
      professional: { label: 'Pro', color: 'bg-blue-100 text-blue-700' },
      enterprise: { label: 'Enterprise', color: 'bg-purple-100 text-purple-700' }
    };
    return badges[tier as keyof typeof badges] || badges.basic;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Store className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">Module Marketplace</h2>
            <p className="text-blue-100">Tingkatkan bisnis Anda dengan modul premium</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5" />
              <span className="font-semibold">50+ Modules</span>
            </div>
            <p className="text-sm text-blue-100">Berbagai modul tersedia</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5" />
              <span className="font-semibold">4.8 Rating</span>
            </div>
            <p className="text-sm text-blue-100">Rata-rata kepuasan user</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5" />
              <span className="font-semibold">Verified</span>
            </div>
            <p className="text-sm text-blue-100">Semua modul terverifikasi</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari modul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Kategori</option>
            <option value="analytics">Analytics</option>
            <option value="operations">Operations</option>
            <option value="crm">CRM</option>
            <option value="integration">Integration</option>
          </select>
          
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Tier</option>
            <option value="basic">Basic</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          >
            <option value="popular">Terpopuler</option>
            <option value="rating">Rating Tertinggi</option>
            <option value="price">Harga Terendah</option>
          </select>
        </div>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.map(module => {
          const tierBadge = getTierBadge(module.tier);
          
          return (
            <div key={module.id} className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden">
              {/* Module Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{module.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${tierBadge.color}`}>
                          {tierBadge.label}
                        </span>
                        {module.isPopular && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Popular
                          </span>
                        )}
                        {module.isNew && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{module.description}</p>
                
                {/* Rating & Downloads */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-medium text-gray-900">{module.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    <span>{module.downloads.toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Features */}
                <div className="space-y-1 mb-4">
                  {module.features.slice(0, 3).map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                      <Check className="w-3 h-3 text-green-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {module.features.length > 3 && (
                    <p className="text-xs text-gray-400 ml-5">+{module.features.length - 3} fitur lainnya</p>
                  )}
                </div>
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Harga</p>
                    <p className="text-xl font-bold text-gray-900">
                      Rp {module.price.toLocaleString()}
                      <span className="text-sm font-normal text-gray-500">/bulan</span>
                    </p>
                  </div>
                  <button
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      module.isInstalled
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    disabled={module.isInstalled}
                  >
                    {module.isInstalled ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Installed
                      </span>
                    ) : (
                      'Install'
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredModules.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Tidak ada modul yang cocok dengan filter</p>
        </div>
      )}
    </div>
  );
}
