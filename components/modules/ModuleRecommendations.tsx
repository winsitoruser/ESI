import { Sparkles, ChefHat, Store, Coffee, Zap, TrendingUp, Target } from 'lucide-react';

interface ModuleRecommendation {
  category: string;
  modules: string[];
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface BusinessTypeRecommendations {
  [key: string]: {
    name: string;
    icon: any;
    color: string;
    recommendations: ModuleRecommendation[];
  };
}

const BUSINESS_RECOMMENDATIONS: BusinessTypeRecommendations = {
  fine_dining: {
    name: 'Fine Dining',
    icon: ChefHat,
    color: '#8B5CF6',
    recommendations: [
      {
        category: 'Essential',
        modules: ['TABLE_MANAGEMENT', 'RESERVATION', 'KITCHEN_DISPLAY'],
        reason: 'Untuk manajemen meja dan reservasi yang optimal',
        priority: 'high'
      },
      {
        category: 'Recommended',
        modules: ['RECIPE_MANAGEMENT', 'WAITER_APP'],
        reason: 'Meningkatkan efisiensi dapur dan service',
        priority: 'medium'
      },
      {
        category: 'Optional',
        modules: ['LOYALTY_PROGRAM', 'ONLINE_ORDERING'],
        reason: 'Untuk customer retention dan channel tambahan',
        priority: 'low'
      }
    ]
  },
  cloud_kitchen: {
    name: 'Cloud Kitchen',
    icon: Zap,
    color: '#F59E0B',
    recommendations: [
      {
        category: 'Essential',
        modules: ['KITCHEN_DISPLAY', 'ONLINE_ORDERING', 'DELIVERY_MANAGEMENT'],
        reason: 'Core untuk operasional cloud kitchen',
        priority: 'high'
      },
      {
        category: 'Recommended',
        modules: ['RECIPE_MANAGEMENT', 'INVENTORY_CORE'],
        reason: 'Optimasi produksi dan stok',
        priority: 'medium'
      },
      {
        category: 'Optional',
        modules: ['LOYALTY_PROGRAM'],
        reason: 'Customer retention untuk repeat orders',
        priority: 'low'
      }
    ]
  },
  qsr: {
    name: 'Quick Service Restaurant',
    icon: Zap,
    color: '#EF4444',
    recommendations: [
      {
        category: 'Essential',
        modules: ['POS_CORE', 'KITCHEN_DISPLAY', 'INVENTORY_CORE'],
        reason: 'Fast service dan inventory control',
        priority: 'high'
      },
      {
        category: 'Recommended',
        modules: ['LOYALTY_PROGRAM', 'ONLINE_ORDERING'],
        reason: 'Increase customer frequency dan convenience',
        priority: 'medium'
      },
      {
        category: 'Optional',
        modules: ['DELIVERY_MANAGEMENT'],
        reason: 'Jika ada layanan delivery',
        priority: 'low'
      }
    ]
  },
  cafe: {
    name: 'Cafe',
    icon: Coffee,
    color: '#10B981',
    recommendations: [
      {
        category: 'Essential',
        modules: ['POS_CORE', 'TABLE_MANAGEMENT', 'INVENTORY_CORE'],
        reason: 'Operasional cafe dasar',
        priority: 'high'
      },
      {
        category: 'Recommended',
        modules: ['RECIPE_MANAGEMENT', 'ONLINE_ORDERING'],
        reason: 'Konsistensi produk dan online presence',
        priority: 'medium'
      },
      {
        category: 'Optional',
        modules: ['LOYALTY_PROGRAM', 'RESERVATION'],
        reason: 'Customer engagement',
        priority: 'low'
      }
    ]
  },
  retail: {
    name: 'Retail',
    icon: Store,
    color: '#3B82F6',
    recommendations: [
      {
        category: 'Essential',
        modules: ['POS_CORE', 'INVENTORY_CORE'],
        reason: 'Core retail operations',
        priority: 'high'
      },
      {
        category: 'Recommended',
        modules: ['LOYALTY_PROGRAM', 'ONLINE_ORDERING'],
        reason: 'Omnichannel dan customer retention',
        priority: 'medium'
      },
      {
        category: 'Optional',
        modules: ['DELIVERY_MANAGEMENT'],
        reason: 'Jika ada delivery service',
        priority: 'low'
      }
    ]
  }
};

const CATEGORY_INFO = {
  core: {
    title: 'Core System',
    description: 'Modul dasar yang diperlukan untuk operasional bisnis',
    icon: '🏛️',
    color: 'blue',
    useCases: ['POS', 'Inventory', 'Basic Operations']
  },
  fnb: {
    title: 'F&B (Food & Beverage)',
    description: 'Modul khusus untuk industri makanan dan minuman',
    icon: '🍽️',
    color: 'purple',
    useCases: ['Table Management', 'Kitchen Display', 'Recipe Management', 'Reservations']
  },
  optional: {
    title: 'Modul Optional',
    description: 'Modul tambahan untuk meningkatkan efisiensi operasional',
    icon: '⚡',
    color: 'amber',
    useCases: ['Loyalty Program', 'Online Ordering', 'Delivery Management']
  },
  addon: {
    title: 'Add-on Premium',
    description: 'Modul premium untuk fitur advanced',
    icon: '👑',
    color: 'indigo',
    useCases: ['Waiter App', 'Advanced Analytics', 'Multi-location']
  },
  operations: {
    title: 'Operasional',
    description: 'Modul untuk manajemen operasional harian',
    icon: '⚙️',
    color: 'gray',
    useCases: ['Fleet Management', 'Staff Management', 'Scheduling']
  },
  finance: {
    title: 'Keuangan',
    description: 'Modul untuk manajemen keuangan dan akuntansi',
    icon: '💰',
    color: 'green',
    useCases: ['Accounting', 'Payroll', 'Financial Reports']
  },
  hr: {
    title: 'SDM & HRIS',
    description: 'Modul untuk manajemen sumber daya manusia',
    icon: '👥',
    color: 'pink',
    useCases: ['Employee Management', 'Attendance', 'Performance']
  },
  crm: {
    title: 'CRM & Pelanggan',
    description: 'Modul untuk manajemen hubungan pelanggan',
    icon: '🤝',
    color: 'rose',
    useCases: ['Customer Database', 'Marketing Campaigns', 'Feedback']
  }
};

interface ModuleRecommendationsProps {
  businessType?: string;
  currentModules: string[];
  onModuleClick?: (moduleCode: string) => void;
}

export default function ModuleRecommendations({
  businessType,
  currentModules,
  onModuleClick
}: ModuleRecommendationsProps) {
  const recommendations = businessType ? BUSINESS_RECOMMENDATIONS[businessType] : null;

  if (!recommendations) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-bold text-gray-900">Rekomendasi Modul</h3>
            <p className="text-sm text-gray-600">Pilih business type untuk melihat rekomendasi</p>
          </div>
        </div>
      </div>
    );
  }

  const Icon = recommendations.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div 
        className="rounded-xl p-6 border-2"
        style={{ 
          backgroundColor: `${recommendations.color}10`,
          borderColor: `${recommendations.color}40`
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: recommendations.color }}
          >
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">
              Rekomendasi untuk {recommendations.name}
            </h3>
            <p className="text-sm text-gray-600">
              Modul yang disarankan berdasarkan jenis bisnis Anda
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations by Priority */}
      {recommendations.recommendations.map((rec, idx) => {
        const priorityColors = {
          high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' },
          medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100' },
          low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100' }
        };
        const colors = priorityColors[rec.priority];

        return (
          <div key={idx} className={`${colors.bg} rounded-xl p-4 border ${colors.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">{rec.category}</h4>
                <span className={`px-2 py-0.5 text-xs font-medium ${colors.badge} ${colors.text} rounded-full`}>
                  {rec.priority === 'high' ? 'Prioritas Tinggi' : rec.priority === 'medium' ? 'Disarankan' : 'Opsional'}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>
            <div className="flex flex-wrap gap-2">
              {rec.modules.map(moduleCode => {
                const isActive = currentModules.includes(moduleCode);
                return (
                  <button
                    key={moduleCode}
                    onClick={() => onModuleClick?.(moduleCode)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {isActive && <span className="mr-1">✓</span>}
                    {moduleCode.replace(/_/g, ' ')}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CategoryInfoCard({ category }: { category: string }) {
  const info = CATEGORY_INFO[category as keyof typeof CATEGORY_INFO];
  if (!info) return null;

  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
    amber: 'from-amber-50 to-amber-100 border-amber-200',
    indigo: 'from-indigo-50 to-indigo-100 border-indigo-200',
    gray: 'from-gray-50 to-gray-100 border-gray-200',
    green: 'from-green-50 to-green-100 border-green-200',
    pink: 'from-pink-50 to-pink-100 border-pink-200',
    rose: 'from-rose-50 to-rose-100 border-rose-200'
  };

  return (
    <div className={`bg-gradient-to-r ${colorClasses[info.color as keyof typeof colorClasses]} rounded-xl p-4 border mb-4`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{info.icon}</span>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 mb-1">{info.title}</h3>
          <p className="text-sm text-gray-600 mb-2">{info.description}</p>
          <div className="flex flex-wrap gap-1">
            {info.useCases.map((useCase, idx) => (
              <span key={idx} className="text-xs px-2 py-0.5 bg-white/60 rounded-full text-gray-700">
                {useCase}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { BUSINESS_RECOMMENDATIONS, CATEGORY_INFO };
