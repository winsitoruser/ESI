import { Check, Package, Crown, Zap, Coffee, ChefHat, ArrowRight } from 'lucide-react';

interface PackageModule {
  id: string;
  code: string;
  name: string;
  icon: string;
  isRequired: boolean;
  isDefaultEnabled: boolean;
}

interface PackageFeature {
  code: string;
  name: string;
}

interface PackageCardProps {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  pricingTier: string;
  basePrice: number;
  isFeatured: boolean;
  moduleCount: number;
  featureCount: number;
  modules: PackageModule[];
  features: PackageFeature[];
  metadata?: any;
  onSelect: (packageId: string) => void;
  isSelected?: boolean;
}

const iconMap: Record<string, any> = {
  Crown,
  ChefHat,
  Zap,
  Coffee,
  Package
};

export default function PackageCard({
  id,
  name,
  description,
  category,
  icon,
  color,
  pricingTier,
  basePrice,
  isFeatured,
  moduleCount,
  featureCount,
  modules,
  features,
  metadata,
  onSelect,
  isSelected = false
}: PackageCardProps) {
  const Icon = iconMap[icon] || Package;
  const highlights = metadata?.highlights || [];
  const recommendedFor = metadata?.recommended_for || '';
  const setupTime = metadata?.setup_time || '';
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };
  
  const getCategoryBadge = () => {
    const badges = {
      starter: { label: 'Starter', color: 'bg-green-100 text-green-700' },
      professional: { label: 'Professional', color: 'bg-blue-100 text-blue-700' },
      enterprise: { label: 'Enterprise', color: 'bg-purple-100 text-purple-700' }
    };
    return badges[category as keyof typeof badges] || badges.starter;
  };
  
  const badge = getCategoryBadge();
  
  return (
    <div
      className={`relative bg-white rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${
        isSelected
          ? 'border-blue-500 shadow-lg ring-4 ring-blue-100'
          : 'border-gray-200 hover:border-blue-300'
      } ${isFeatured ? 'ring-2 ring-yellow-400' : ''}`}
    >
      {/* Featured Badge */}
      {isFeatured && (
        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
          <Crown className="w-3 h-3" />
          Popular
        </div>
      )}
      
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ backgroundColor: color }}
          >
            <Icon className="w-7 h-7" />
          </div>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badge.color}`}>
            {badge.label}
          </span>
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold text-gray-900">
            {formatPrice(basePrice)}
          </span>
          <span className="text-sm text-gray-500">/bulan</span>
        </div>
        
        {recommendedFor && (
          <p className="text-xs text-gray-500 italic">
            Cocok untuk: {recommendedFor}
          </p>
        )}
      </div>
      
      {/* Features */}
      <div className="p-6 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Fitur Utama:</h4>
        <ul className="space-y-2">
          {highlights.slice(0, 5).map((highlight: string, index: number) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Modules & Stats */}
      <div className="p-6 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{moduleCount}</div>
            <div className="text-xs text-gray-600">Modul</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{featureCount}</div>
            <div className="text-xs text-gray-600">Fitur</div>
          </div>
        </div>
        
        {setupTime && (
          <div className="text-center text-xs text-gray-500 mb-4">
            Setup time: {setupTime}
          </div>
        )}
        
        <button
          onClick={() => onSelect(id)}
          className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
            isSelected
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="w-5 h-5" />
              Terpilih
            </>
          ) : (
            <>
              Pilih Paket
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
