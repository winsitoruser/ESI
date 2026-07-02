import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Package, Settings, Zap, CheckCircle, XCircle,
  ChevronRight, Search, Filter, Plus, Edit, Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ModuleSelector from '@/components/modules/ModuleSelector';

interface Module {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  version: string;
  tenantCount?: number;
}

interface TenantModuleConfig {
  tenantId: string;
  tenantName: string;
  enabledModules: string[];
  businessType: string;
}

export default function ModuleConfiguration() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [showModuleSelector, setShowModuleSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  useEffect(() => {
    fetchModules();
  }, []);
  
  const fetchModules = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/modules/catalog');
      const data = await response.json();
      
      if (data.success) {
        setModules(data.data.modules);
      } else {
        toast.error(t('mp.config.failedToLoad'));
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error(t('mp.config.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleModule = async (moduleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(!isActive ? t('mp.config.moduleActivated') : t('mp.config.moduleDeactivated'));
        fetchModules();
      } else {
        toast.error(data.error || t('mp.config.failedToUpdate'));
      }
    } catch (error) {
      console.error('Error toggling module:', error);
      toast.error(t('mp.config.failedToUpdate'));
    }
  };
  
  const filteredModules = modules.filter(module => {
    const matchesSearch = module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         module.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || module.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  
  const categories = ['all', 'core', 'fnb', 'optional', 'addon'];
  
  return (
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('mp.config.title')}</h1>
            <p className="text-gray-600 mt-1">{t('mp.config.subtitle')}</p>
          </div>
          
          <button
            onClick={() => setShowModuleSelector(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('mp.config.configureTenantModules')}
          </button>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('mp.config.searchModules')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Category Filter */}
            <div className="flex gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    categoryFilter === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Modules Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('mp.config.loadingModules')}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map(module => (
              <ModuleConfigCard
                key={module.id}
                module={module}
                onToggle={() => handleToggleModule(module.id, module.isActive)}
              />
            ))}
          </div>
        )}
        
        {filteredModules.length === 0 && !loading && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{t('mp.config.noModulesFound')}</p>
          </div>
        )}
      </div>
      
      {/* Module Selector Modal */}
      {showModuleSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{t('mp.config.configureTenantModules')}</h2>
              <button
                onClick={() => setShowModuleSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <ModuleSelector
                businessType="fine_dining"
                onModulesSelected={(moduleIds) => {
                  console.log('Selected modules:', moduleIds);
                  setShowModuleSelector(false);
                  toast.success(t('mp.config.configuredSuccess'));
                }}
              />
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}

interface ModuleConfigCardProps {
  module: Module;
  onToggle: () => void;
}

function ModuleConfigCard({ module, onToggle }: ModuleConfigCardProps) {
  const { t } = useTranslation();
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core':
        return 'from-blue-500 to-blue-600';
      case 'fnb':
        return 'from-purple-500 to-purple-600';
      case 'optional':
        return 'from-green-500 to-green-600';
      case 'addon':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryColor(module.category)} rounded-lg flex items-center justify-center`}>
          <Package className="w-6 h-6 text-white" />
        </div>
        
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            module.isActive ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              module.isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{module.name}</h3>
        <p className="text-sm text-gray-600 mb-2">{module.description}</p>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            module.category === 'core' ? 'bg-blue-100 text-blue-700' :
            module.category === 'fnb' ? 'bg-purple-100 text-purple-700' :
            module.category === 'optional' ? 'bg-green-100 text-green-700' :
            'bg-orange-100 text-orange-700'
          }`}>
            {module.category}
          </span>
          <span className="text-xs text-gray-500">v{module.version}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {module.isActive ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{t('mp.config.active')}</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-gray-400" />
              <span>{t('mp.config.inactive')}</span>
            </>
          )}
        </div>
        
        {module.tenantCount !== undefined && (
          <div className="text-sm text-gray-600">
            {module.tenantCount} {t('mp.config.tenants')}
          </div>
        )}
      </div>
      
      <div className="mt-4 flex gap-2">
        <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2">
          <Settings className="w-4 h-4" />
          {t('mp.config.configure')}
        </button>
        <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" />
          {t('mp.config.flows')}
        </button>
      </div>
    </div>
  );
}
