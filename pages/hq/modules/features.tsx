import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Sliders, Package, CheckCircle, XCircle, Settings,
  Search, Filter, Plus, Edit, Save, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ModuleFeature {
  id: string;
  moduleId: string;
  moduleName: string;
  code: string;
  name: string;
  description: string;
  isDefault: boolean;
  businessTypes: string[];
  isActive: boolean;
}

interface TenantFeatureConfig {
  tenantId: string;
  tenantName: string;
  moduleId: string;
  featureId: string;
  isEnabled: boolean;
}

export default function FeatureManagement() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<ModuleFeature[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  
  useEffect(() => {
    fetchFeatures();
  }, [selectedModule]);
  
  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/integrations/configs?category=module_features');
      if (res.ok) { const json = await res.json(); const p = json.data || json; if (p.features) { setFeatures(p.features); } }
    } catch (error) {
      console.error('Error loading features:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleFeature = async (featureId: string, isActive: boolean) => {
    try {
      // In production, call API to toggle feature
      toast.success(!isActive ? t('mp.features.featureActivated') : t('mp.features.featureDeactivated'));
      
      setFeatures(features.map(f => 
        f.id === featureId ? { ...f, isActive: !isActive } : f
      ));
    } catch (error) {
      toast.error(t('mp.features.failedToToggle'));
    }
  };
  
  const handleSaveFeature = async (featureId: string) => {
    try {
      // In production, call API to save feature
      toast.success(t('mp.features.featureUpdated'));
      setEditingFeature(null);
    } catch (error) {
      toast.error(t('mp.features.failedToUpdate'));
    }
  };
  
  const filteredFeatures = features.filter(feature => {
    const matchesModule = selectedModule === 'all' || feature.moduleId === selectedModule;
    const matchesSearch = feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         feature.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesModule && matchesSearch;
  });
  
  const modules = Array.from(new Set(features.map(f => ({ id: f.moduleId, name: f.moduleName }))));
  
  return (
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('mp.features.title')}</h1>
            <p className="text-gray-600 mt-1">{t('mp.features.subtitle')}</p>
          </div>
          
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            {t('mp.features.addFeature')}
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
                placeholder={t('mp.features.searchFeatures')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Module Filter */}
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('mp.features.allModules')}</option>
              {modules.map(module => (
                <option key={module.id} value={module.id}>{module.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Features Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('mp.features.moduleFeatures')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('mp.features.featureFlags')}</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('mp.features.colFeature')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('mp.features.colModule')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('mp.features.colBusinessTypes')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('mp.features.colDefault')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('mp.features.colStatus')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('mp.features.colActions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFeatures.map(feature => (
                  <tr key={feature.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{feature.name}</div>
                        <div className="text-xs text-gray-500">{feature.code}</div>
                        <div className="text-xs text-gray-600 mt-1">{feature.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{feature.moduleName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {feature.businessTypes.map(bt => (
                          <span
                            key={bt}
                            className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded"
                          >
                            {bt.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {feature.isDefault ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggleFeature(feature.id, feature.isActive)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          feature.isActive ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            feature.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        {editingFeature === feature.id ? (
                          <>
                            <button
                              onClick={() => handleSaveFeature(feature.id)}
                              className="p-1 text-green-600 hover:text-green-700"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingFeature(null)}
                              className="p-1 text-gray-600 hover:text-gray-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditingFeature(feature.id)}
                            className="p-1 text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {filteredFeatures.length === 0 && !loading && (
          <div className="text-center py-12">
            <Sliders className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{t('mp.features.noFeaturesFound')}</p>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
