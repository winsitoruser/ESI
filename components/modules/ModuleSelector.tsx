import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Package, Check, AlertCircle, Info, Zap, Lock,
  ChevronRight, DollarSign, Users, TrendingUp
} from 'lucide-react';

interface CatalogModule {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'core' | 'fnb' | 'optional' | 'addon';
  dependencies: string[];
  optionalDependencies: string[];
  businessTypeConfig: any;
  stats?: {
    tenantCount: number;
    isPopular: boolean;
  };
}

interface ModuleSelectorProps {
  businessType: string;
  onModulesSelected: (moduleIds: string[]) => void;
  preSelectedModules?: string[];
}

export default function ModuleSelector({
  businessType,
  onModulesSelected,
  preSelectedModules = []
}: ModuleSelectorProps) {
  const [modules, setModules] = useState<CatalogModule[]>([]);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set(preSelectedModules));
  const [category, setCategory] = useState<'all' | 'core' | 'fnb' | 'optional' | 'addon'>('all');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchModules();
  }, [businessType]);
  
  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/modules/catalog?businessType=${businessType}&includeOptional=true`);
      const data = await res.json();
      
      if (data.success) {
        setModules(data.data.modules);
        
        // Auto-select required modules
        const required = data.data.modules
          .filter((m: CatalogModule) => {
            const config = m.businessTypeConfig[businessType];
            return config?.isRequired;
          })
          .map((m: CatalogModule) => m.code);
        
        setSelectedModules(new Set([...preSelectedModules, ...required]));
      } else {
        toast.error(data.error || 'Failed to load modules');
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleModule = (moduleCode: string) => {
    const module = modules.find(m => m.code === moduleCode);
    if (!module) return;
    
    const config = module.businessTypeConfig[businessType];
    
    // Cannot deselect required modules
    if (config?.isRequired) {
      toast.error('This module is required for your business type');
      return;
    }
    
    const newSelected = new Set(selectedModules);
    
    if (newSelected.has(moduleCode)) {
      // Check if other modules depend on this
      const dependents = modules.filter(m => 
        m.dependencies?.includes(moduleCode) && newSelected.has(m.code)
      );
      
      if (dependents.length > 0) {
        toast.error(`Cannot deselect: ${dependents.map(d => d.name).join(', ')} depends on this module`);
        return;
      }
      
      newSelected.delete(moduleCode);
    } else {
      newSelected.add(moduleCode);
      
      // Auto-select dependencies
      if (module.dependencies) {
        module.dependencies.forEach(dep => newSelected.add(dep));
      }
    }
    
    setSelectedModules(newSelected);
  };
  
  const filteredModules = modules.filter(m => {
    if (category === 'all') return true;
    return m.category === category;
  });
  
  const calculateTotalCost = () => {
    // Mock pricing - in real implementation, get from module pricing data
    return Array.from(selectedModules).length * 29;
  };
  
  const getModulesByCategory = (cat: string) => {
    return modules.filter(m => m.category === cat);
  };
  
  const handleContinue = () => {
    if (selectedModules.size === 0) {
      toast.error('Please select at least one module');
      return;
    }
    onModulesSelected(Array.from(selectedModules));
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading modules...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Modules</h2>
        <p className="text-gray-600">
          Choose the modules you want to enable for your {businessType} business
        </p>
      </div>
      
      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'all', label: 'All Modules', count: modules.length },
          { key: 'core', label: 'Core', count: getModulesByCategory('core').length },
          { key: 'fnb', label: 'F&B Specific', count: getModulesByCategory('fnb').length },
          { key: 'optional', label: 'Optional', count: getModulesByCategory('optional').length },
          { key: 'addon', label: 'Add-ons', count: getModulesByCategory('addon').length }
        ].map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key as any)}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              category === cat.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>
      
      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModules.map(module => {
          const config = module.businessTypeConfig[businessType];
          const isSelected = selectedModules.has(module.code);
          const isRequired = config?.isRequired;
          const isRecommended = config?.isRecommended;
          
          return (
            <ModuleCard
              key={module.code}
              module={module}
              isSelected={isSelected}
              isRequired={isRequired}
              isRecommended={isRecommended}
              onToggle={() => toggleModule(module.code)}
            />
          );
        })}
      </div>
      
      {filteredModules.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No modules in this category</p>
        </div>
      )}
      
      {/* Summary Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 -mx-6 -mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Selected Modules</p>
            <p className="text-2xl font-bold text-gray-900">{selectedModules.size}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Estimated Monthly Cost</p>
            <p className="text-2xl font-bold text-blue-600">${calculateTotalCost()}</p>
          </div>
          <button
            onClick={handleContinue}
            disabled={selectedModules.size === 0}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ModuleCardProps {
  module: CatalogModule;
  isSelected: boolean;
  isRequired: boolean;
  isRecommended: boolean;
  onToggle: () => void;
}

function ModuleCard({ module, isSelected, isRequired, isRecommended, onToggle }: ModuleCardProps) {
  return (
    <div
      onClick={!isRequired ? onToggle : undefined}
      className={`relative border-2 rounded-xl p-4 transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      } ${isRequired ? 'cursor-not-allowed opacity-75' : ''}`}
    >
      {/* Selection Indicator */}
      <div className="absolute top-4 right-4">
        {isSelected ? (
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        ) : (
          <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
        )}
      </div>
      
      {/* Module Info */}
      <div className="pr-8">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">{module.name}</h3>
            <p className="text-xs text-gray-500 line-clamp-2">{module.description}</p>
          </div>
        </div>
        
        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {isRequired && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
              <Lock className="w-3 h-3" />
              Required
            </span>
          )}
          {isRecommended && !isRequired && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
              <Zap className="w-3 h-3" />
              Recommended
            </span>
          )}
          {module.stats?.isPopular && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
              <TrendingUp className="w-3 h-3" />
              Popular
            </span>
          )}
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded capitalize">
            {module.category}
          </span>
        </div>
        
        {/* Dependencies */}
        {module.dependencies && module.dependencies.length > 0 && (
          <div className="text-xs text-gray-500">
            <span className="font-medium">Requires:</span> {module.dependencies.join(', ')}
          </div>
        )}
        
        {/* Stats */}
        {module.stats && module.stats.tenantCount > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <Users className="w-3 h-3" />
            <span>{module.stats.tenantCount} businesses using this</span>
          </div>
        )}
      </div>
    </div>
  );
}
