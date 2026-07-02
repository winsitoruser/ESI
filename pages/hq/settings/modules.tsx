import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import HQLayout from '@/components/hq/HQLayout';
import { useBusinessType } from '@/contexts/BusinessTypeContext';
import { toast } from 'react-hot-toast';
import {
  Package, Search, Filter, Grid3X3, List, Check, X, AlertTriangle,
  ChevronDown, ChevronRight, Info, Zap, Shield, Lock, Unlock,
  Settings, LayoutDashboard, ShoppingCart, Users, Truck, Target,
  Wallet, BarChart3, Award, Utensils, Calendar, Ticket, Building2,
  UserCheck, MapPin, Plug, Layers, Star, ArrowRight, RefreshCw,
  MessageCircle, Globe, ChefHat, Crown, Sparkles, Lightbulb, Store,
  Heart, Briefcase, Megaphone, Code2
} from 'lucide-react';
import ModuleRecommendations, { CategoryInfoCard } from '@/components/modules/ModuleRecommendations';
import ModuleAnalytics from '@/components/modules/ModuleAnalytics';
import ModuleMarketplace from '@/components/modules/ModuleMarketplace';
import ModuleConfigPanel from '@/components/modules/ModuleConfigPanel';

interface ModuleDep {
  moduleCode: string;
  moduleName: string;
  moduleIcon: string;
  type: 'required' | 'optional' | 'recommended';
}

interface ModuleItem {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  category: string;
  features: string[];
  pricingTier: string;
  setupComplexity: string;
  color: string;
  version: string;
  tags: string[];
  isCore: boolean;
  sortOrder: number;
  isEnabled: boolean;
  enabledAt: string | null;
  disabledAt: string | null;
  configuredAt: string | null;
  dependencies: ModuleDep[];
  dependedBy: ModuleDep[];
}

interface ModuleData {
  modules: ModuleItem[];
  categories: Record<string, ModuleItem[]>;
  summary: {
    total: number;
    enabled: number;
    disabled: number;
    core: number;
  };
  categoryLabels: Record<string, string>;
}

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, ShoppingCart, Package, Users, Award, Utensils, Calendar,
  Ticket, Wallet, BarChart3, Settings, UserCheck, Building2, Truck,
  Layers, Target, MapPin, Plug, Shield, Star, Grid3X3,
  MessageCircle, Globe, ChefHat, Crown, Sparkles,
  Heart, Briefcase, Megaphone, Code2,
};

const CATEGORY_ORDER = ['core', 'fnb', 'optional', 'addon', 'operations', 'finance', 'hr', 'crm', 'marketing', 'analytics', 'integration', 'system'];

const TIER_BADGES: Record<string, { tKey: string; color: string; bg: string }> = {
  basic: { tKey: 'tierFree', color: 'text-green-700', bg: 'bg-green-100' },
  professional: { tKey: 'tierPro', color: 'text-blue-700', bg: 'bg-blue-100' },
  enterprise: { tKey: 'tierEnterprise', color: 'text-purple-700', bg: 'bg-purple-100' }
};

const COMPLEXITY_TKEYS: Record<string, string> = {
  simple: 'complexitySimple',
  moderate: 'complexityModerate',
  complex: 'complexityComplex'
};

export default function ModuleManagement() {
  const { t } = useTranslation();
  const { refreshConfig } = useBusinessType();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ModuleData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [togglingModule, setTogglingModule] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    moduleId: string;
    moduleName: string;
    action: 'enable' | 'disable';
    dependencies?: any[];
  } | null>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [activeTab, setActiveTab] = useState<'modules' | 'analytics' | 'marketplace'>('modules');
  const [configModule, setConfigModule] = useState<ModuleItem | null>(null);
  const { businessType } = useBusinessType();

  useEffect(() => {
    setMounted(true);
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/modules');
      if (!res.ok) {
        console.error('Failed to fetch modules: HTTP', res.status);
        toast.error(t('moduleManagement.loadFailed'));
        setLoading(false);
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        console.error('Modules API error:', json.error);
        toast.error(json.error || t('moduleManagement.loadFailed'));
      }
    } catch (error) {
      console.error('Failed to fetch modules:', error);
      toast.error(t('moduleManagement.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (mod: ModuleItem) => {
    const newState = !mod.isEnabled;

    // Core modules can't be disabled
    if (!newState && mod.isCore) {
      toast.error(`'${mod.name}' ${t('moduleManagement.coreCannotDisable')}`);
      return;
    }

    // If disabling, check dependents
    if (!newState && mod.dependedBy.length > 0) {
      const enabledDependents = mod.dependedBy.filter(d =>
        d.type === 'required' && data?.modules.find(m => m.code === d.moduleCode)?.isEnabled
      );
      if (enabledDependents.length > 0) {
        setConfirmDialog({
          moduleId: mod.id,
          moduleName: mod.name,
          action: 'disable',
          dependencies: enabledDependents
        });
        return;
      }
    }

    // If enabling, check required dependencies
    if (newState && mod.dependencies.length > 0) {
      const missingDeps = mod.dependencies.filter(d =>
        d.type === 'required' && !data?.modules.find(m => m.code === d.moduleCode)?.isEnabled
      );
      if (missingDeps.length > 0) {
        setConfirmDialog({
          moduleId: mod.id,
          moduleName: mod.name,
          action: 'enable',
          dependencies: missingDeps
        });
        return;
      }
    }

    await executeToggle(mod.id, newState);
  };

  const executeToggle = async (moduleId: string, isEnabled: boolean) => {
    setTogglingModule(moduleId);
    setConfirmDialog(null);
    try {
      const res = await fetch('/api/hq/modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, isEnabled })
      });
      if (!res.ok) {
        const errData = await res.json();
        if (errData.error === 'MISSING_DEPENDENCIES') {
          toast.error(`${errData.message} ${errData.missingDependencies.map((d: any) => d.name).join(', ')}`);
        } else if (errData.error === 'HAS_DEPENDENTS') {
          toast.error(`${errData.message} ${errData.dependentModules.map((d: any) => d.name).join(', ')}`);
        } else {
          toast.error(errData.message || t('moduleManagement.statusChangeFailed'));
        }
        return;
      }
      const json = await res.json();
      toast.success(json.message);
      await fetchModules();
      await refreshConfig();
    } catch (error) {
      toast.error(t('moduleManagement.statusChangeError'));
    } finally {
      setTogglingModule(null);
    }
  };

  const handleBulkEnable = async () => {
    if (selectedModules.size === 0) return;
    
    const modulesToEnable = Array.from(selectedModules);
    let successCount = 0;
    let failCount = 0;

    for (const moduleId of modulesToEnable) {
      try {
        const res = await fetch('/api/hq/modules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleId, isEnabled: true })
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} ${t('moduleManagement.bulkSuccess')}`);
      await fetchModules();
      await refreshConfig();
    }
    if (failCount > 0) {
      toast.error(`${failCount} ${t('moduleManagement.bulkFailed')}`);
    }
    
    setSelectedModules(new Set());
    setBulkActionMode(false);
  };

  const toggleModuleSelection = (moduleId: string) => {
    const newSelected = new Set(selectedModules);
    if (newSelected.has(moduleId)) {
      newSelected.delete(moduleId);
    } else {
      newSelected.add(moduleId);
    }
    setSelectedModules(newSelected);
  };

  // Filter modules
  const filteredModules = useMemo(() => {
    if (!data) return [];
    return data.modules.filter(mod => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !mod.name.toLowerCase().includes(q) &&
          !mod.description?.toLowerCase().includes(q) &&
          !mod.code.toLowerCase().includes(q)
        ) return false;
      }
      if (categoryFilter !== 'all' && mod.category !== categoryFilter) return false;
      if (tierFilter !== 'all' && mod.pricingTier !== tierFilter) return false;
      if (statusFilter === 'enabled' && !mod.isEnabled) return false;
      if (statusFilter === 'disabled' && mod.isEnabled) return false;
      return true;
    });
  }, [data, searchQuery, categoryFilter, tierFilter, statusFilter]);

  // Group filtered modules by category
  const groupedModules = useMemo(() => {
    const groups: Record<string, ModuleItem[]> = {};
    filteredModules.forEach(mod => {
      const cat = mod.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(mod);
    });
    return groups;
  }, [filteredModules]);

  const getModuleIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName];
    return Icon ? <Icon className="w-5 h-5" /> : <Package className="w-5 h-5" />;
  };

  if (!mounted) return null;

  const handleSaveConfig = async (config: any) => {
    if (!configModule) return;
    
    try {
      const res = await fetch('/api/hq/modules/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: configModule.id,
          config
        })
      });
      
      if (!res.ok) throw new Error('Failed to save config');
      
      toast.success(t('moduleManagement.configSaved'));
      await fetchModules();
    } catch (error) {
      throw error;
    }
  };

  return (
    <HQLayout title={t('moduleManagement.title')} subtitle={t('moduleManagement.subtitleFull')}>
      <div className="space-y-6">

        {/* Subscribe Add-on Banner */}
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            <div>
              <p className="font-semibold text-sm">Aktifkan modul lebih lengkap</p>
              <p className="text-xs text-white/80">Tambahkan modul HRIS, SFA, Manufaktur, Fleet, dan lain-lain sesuai kebutuhan bisnis Anda.</p>
            </div>
          </div>
          <a href="/hq/billing-info/plans" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-purple-700 rounded-xl font-semibold text-sm hover:bg-purple-50">
            Berlangganan Modul <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 p-1">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('modules')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'modules'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Package className="w-4 h-4" />
              {t('moduleManagement.tabMyModules')}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              {t('moduleManagement.tabAnalytics')}
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'marketplace'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Store className="w-4 h-4" />
              {t('moduleManagement.tabMarketplace')}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'analytics' && (
          <ModuleAnalytics tenantId={''} />
        )}

        {activeTab === 'marketplace' && (
          <ModuleMarketplace />
        )}

        {activeTab === 'modules' && (
          <div className="space-y-6">

        {/* Enhanced Summary Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{data.summary.total}</p>
                  <p className="text-xs text-gray-500">{t('moduleManagement.totalModules')}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{data.summary.enabled}</p>
                  <p className="text-xs text-gray-500">{t('moduleManagement.enabled')}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <X className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-500">{data.summary.disabled}</p>
                  <p className="text-xs text-gray-500">{t('moduleManagement.disabled')}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{data.summary.core}</p>
                  <p className="text-xs text-gray-500">{t('moduleManagement.coreModules')}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {data.modules.filter(m => m.category === 'fnb').length}
                  </p>
                  <p className="text-xs text-gray-500">{t('moduleManagement.fnbModules')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Bar */}
        {data && data.modules.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">{t('moduleManagement.quickActions')}</h3>
                  <p className="text-xs text-gray-600">{t('moduleManagement.quickActionsDesc')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showRecommendations
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Lightbulb className="w-4 h-4 inline mr-1" />
                  {showRecommendations ? t('moduleManagement.hideRecommendations') : t('moduleManagement.showRecommendationsBtn')}
                </button>
                <button
                  onClick={() => setBulkActionMode(!bulkActionMode)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    bulkActionMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {bulkActionMode ? t('moduleManagement.bulkDone') : t('moduleManagement.bulkAction')}
                </button>
                {bulkActionMode && selectedModules.size > 0 && (
                  <>
                    <button
                      onClick={() => handleBulkEnable()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                      {t('moduleManagement.activateCount')} {selectedModules.size} {t('moduleManagement.modulesCount')}
                    </button>
                    <button
                      onClick={() => setSelectedModules(new Set())}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
                    >
                      {t('moduleManagement.clear')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Module Recommendations */}
        {showRecommendations && data && (
          <ModuleRecommendations
            businessType={businessType || undefined}
            currentModules={data.modules.filter(m => m.isEnabled).map(m => m.code)}
            onModuleClick={(moduleCode) => {
              const module = data.modules.find(m => m.code === moduleCode);
              if (module && !module.isEnabled) {
                handleToggle(module);
              }
            }}
          />
        )}

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('moduleManagement.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('moduleManagement.allCategories')}</option>
                {data && Object.entries(data.categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <select
                value={tierFilter}
                onChange={e => setTierFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('moduleManagement.allTiers')}</option>
                <option value="basic">Basic</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('moduleManagement.allStatus')}</option>
                <option value="enabled">{t('moduleManagement.enabled')}</option>
                <option value="disabled">{t('moduleManagement.disabled')}</option>
              </select>

              {/* View mode toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={fetchModules}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-gray-500">{t('moduleManagement.loadingModules')}</p>
          </div>
        )}

        {/* ===== BASIC MODULES SECTION ===== */}
        {!loading && (() => {
          const basicMods = filteredModules.filter(m => m.pricingTier === 'basic' || m.isCore);
          const addonMods = filteredModules.filter(m => m.pricingTier !== 'basic' && !m.isCore);

          return (
            <>
              {/* Basic Section Header */}
              {basicMods.length > 0 && (
                <div className="space-y-4">
                  {categoryFilter === 'all' && <CategoryInfoCard category="core" />}
                  <div className="flex items-center gap-3 pb-2 border-b-2 border-green-200">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{t('moduleManagement.basicModules')}</h2>
                      <p className="text-xs text-gray-500">{t('moduleManagement.basicModulesDesc')}</p>
                    </div>
                    <span className="ml-auto px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      {basicMods.length} {t('moduleManagement.modulesCount')}
                    </span>
                  </div>

                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {basicMods.map(mod => (
                        <ModuleCard
                          key={mod.id}
                          mod={mod}
                          isExpanded={expandedModule === mod.id}
                          isToggling={togglingModule === mod.id}
                          onToggle={() => handleToggle(mod)}
                          onExpand={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                          getIcon={getModuleIcon}
                          bulkMode={bulkActionMode}
                          isSelected={selectedModules.has(mod.id)}
                          onSelect={() => toggleModuleSelection(mod.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {basicMods.map(mod => (
                        <ModuleListItem
                          key={mod.id}
                          mod={mod}
                          isToggling={togglingModule === mod.id}
                          onToggle={() => handleToggle(mod)}
                          getIcon={getModuleIcon}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ===== ADD-ON / PRO MODULES SECTION ===== */}
              {addonMods.length > 0 && (
                <div className="space-y-4">
                  {categoryFilter === 'all' && <CategoryInfoCard category="addon" />}
                  {categoryFilter === 'fnb' && <CategoryInfoCard category="fnb" />}
                  {categoryFilter === 'optional' && <CategoryInfoCard category="optional" />}
                  {categoryFilter === 'operations' && <CategoryInfoCard category="operations" />}
                  {categoryFilter === 'finance' && <CategoryInfoCard category="finance" />}
                  {categoryFilter === 'hr' && <CategoryInfoCard category="hr" />}
                  {categoryFilter === 'crm' && <CategoryInfoCard category="crm" />}
                  <div className="flex items-center gap-3 pb-2 border-b-2 border-blue-200">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Crown className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{t('moduleManagement.addonModules')}</h2>
                      <p className="text-xs text-gray-500">{t('moduleManagement.addonModulesDesc')}</p>
                    </div>
                    <span className="ml-auto px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                      {addonMods.length} {t('moduleManagement.modulesCount')}
                    </span>
                  </div>

                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {addonMods.map(mod => (
                        <ModuleCard
                          key={mod.id}
                          mod={mod}
                          isExpanded={expandedModule === mod.id}
                          isToggling={togglingModule === mod.id}
                          onToggle={() => handleToggle(mod)}
                          onExpand={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                          getIcon={getModuleIcon}
                          bulkMode={bulkActionMode}
                          isSelected={selectedModules.has(mod.id)}
                          onSelect={() => toggleModuleSelection(mod.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {addonMods.map(mod => (
                        <ModuleListItem
                          key={mod.id}
                          mod={mod}
                          isToggling={togglingModule === mod.id}
                          onToggle={() => handleToggle(mod)}
                          getIcon={getModuleIcon}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}

        {/* Empty state */}
        {!loading && filteredModules.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{t('moduleManagement.noMatchFilter')}</p>
          </div>
        )}

        {/* Confirm Dialog */}
        {confirmDialog && (
          <ConfirmDialog
            dialog={confirmDialog}
            onConfirm={() => executeToggle(confirmDialog.moduleId, confirmDialog.action === 'enable')}
            onCancel={() => setConfirmDialog(null)}
          />
        )}
          </div>
        )}

        {/* Config Panel */}
        {configModule && (
          <ModuleConfigPanel
            moduleId={configModule.id}
            moduleCode={configModule.code}
            moduleName={configModule.name}
            currentConfig={{}}
            onClose={() => setConfigModule(null)}
            onSave={handleSaveConfig}
          />
        )}
      </div>
    </HQLayout>
  );
}

// =============================
// Module Card (Grid View)
// =============================
function ModuleCard({
  mod, isExpanded, isToggling, onToggle, onExpand, getIcon, bulkMode, isSelected, onSelect
}: {
  mod: ModuleItem;
  isExpanded: boolean;
  isToggling: boolean;
  onToggle: () => void;
  onExpand: () => void;
  getIcon: (name: string) => JSX.Element;
  bulkMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const { t } = useTranslation();
  const tier = TIER_BADGES[mod.pricingTier] || TIER_BADGES.basic;

  return (
    <div className={`bg-white rounded-xl border-2 transition-all duration-200 shadow-sm hover:shadow-md ${
      mod.isEnabled ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: mod.color }}
            >
              {getIcon(mod.icon)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{mod.name}</h3>
                {mod.isCore && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                    CORE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${tier.bg} ${tier.color}`}>
                  {t(`moduleManagement.${tier.tKey}`)}
                </span>
                <span className="text-[10px] text-gray-400">v{mod.version}</span>
              </div>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={onToggle}
            disabled={isToggling || mod.isCore}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              mod.isEnabled
                ? 'bg-green-500 focus:ring-green-500'
                : 'bg-gray-300 focus:ring-gray-400'
            } ${(isToggling || mod.isCore) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
              mod.isEnabled ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{mod.description}</p>

        {/* Dependencies indicator */}
        {mod.dependencies.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-2">
            <ArrowRight className="w-3 h-3" />
            {t('moduleManagement.needs')}: {mod.dependencies.filter(d => d.type === 'required').map(d => d.moduleName).join(', ')}
          </div>
        )}

        {/* Status bar */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${mod.isEnabled ? 'text-green-600' : 'text-gray-400'}`}>
            {mod.isEnabled ? t('moduleManagement.activeStatus') : t('moduleManagement.inactiveStatus')}
          </span>
          <button
            onClick={onExpand}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {t('moduleManagement.detail')} {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expanded Detail */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-3">
          {/* Features */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1.5">{t('moduleManagement.featuresLabel')}</p>
            <div className="flex flex-wrap gap-1">
              {mod.features.map((f, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-600">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Complexity */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{t('moduleManagement.complexity')}: <strong>{t(`moduleManagement.${COMPLEXITY_TKEYS[mod.setupComplexity]}`) || mod.setupComplexity}</strong></span>
            <span>{t('moduleManagement.category')}: <strong>{mod.category}</strong></span>
          </div>

          {/* Dependencies detail */}
          {mod.dependencies.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">{t('moduleManagement.dependenciesLabel')}</p>
              {mod.dependencies.map((dep, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className={`w-1.5 h-1.5 rounded-full ${dep.type === 'required' ? 'bg-red-500' : dep.type === 'recommended' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                  {dep.moduleName}
                  <span className="text-[10px] text-gray-400">({dep.type})</span>
                </div>
              ))}
            </div>
          )}

          {/* Depended by */}
          {mod.dependedBy.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">{t('moduleManagement.dependedByLabel')}</p>
              {mod.dependedBy.map((dep, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {dep.moduleName}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================
// Module List Item (List View)
// =============================
function ModuleListItem({
  mod, isToggling, onToggle, getIcon
}: {
  mod: ModuleItem;
  isToggling: boolean;
  onToggle: () => void;
  getIcon: (name: string) => JSX.Element;
}) {
  const { t } = useTranslation();
  const tier = TIER_BADGES[mod.pricingTier] || TIER_BADGES.basic;

  return (
    <div className={`bg-white rounded-lg border p-4 flex items-center gap-4 transition-all ${
      mod.isEnabled ? 'border-green-200' : 'border-gray-200'
    }`}>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
        style={{ backgroundColor: mod.color }}
      >
        {getIcon(mod.icon)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900 text-sm">{mod.name}</h3>
          {mod.isCore && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">CORE</span>
          )}
          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${tier.bg} ${tier.color}`}>
            {t(`moduleManagement.${tier.tKey}`)}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate">{mod.description}</p>
        {mod.dependencies.filter(d => d.type === 'required').length > 0 && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            {t('moduleManagement.needs')}: {mod.dependencies.filter(d => d.type === 'required').map(d => d.moduleName).join(', ')}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-xs font-medium ${mod.isEnabled ? 'text-green-600' : 'text-gray-400'}`}>
          {mod.isEnabled ? t('moduleManagement.enabled') : t('moduleManagement.off')}
        </span>
        <button
          onClick={onToggle}
          disabled={isToggling || mod.isCore}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
            mod.isEnabled ? 'bg-green-500' : 'bg-gray-300'
          } ${(isToggling || mod.isCore) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            mod.isEnabled ? 'translate-x-6' : 'translate-x-0'
          }`} />
        </button>
      </div>
    </div>
  );
}

// =============================
// Confirm Dialog
// =============================
function ConfirmDialog({
  dialog, onConfirm, onCancel
}: {
  dialog: { moduleId: string; moduleName: string; action: string; dependencies?: any[] };
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const isEnable = dialog.action === 'enable';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isEnable ? 'bg-amber-100' : 'bg-red-100'
          }`}>
            <AlertTriangle className={`w-5 h-5 ${isEnable ? 'text-amber-600' : 'text-red-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {isEnable ? t('moduleManagement.depRequired') : t('moduleManagement.depStillUsed')}
            </h3>
            <p className="text-sm text-gray-500">
              {isEnable
                ? `'${dialog.moduleName}' ${t('moduleManagement.depRequiredDesc')}`
                : `${t('moduleManagement.depStillUsedDesc')} '${dialog.moduleName}':`
              }
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1">
          {dialog.dependencies?.map((dep, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
              <span className={`w-2 h-2 rounded-full ${isEnable ? 'bg-amber-500' : 'bg-red-500'}`} />
              {dep.moduleName || dep.name}
            </div>
          ))}
        </div>

        {isEnable ? (
          <p className="text-sm text-gray-600 mb-4">
            {t('moduleManagement.enableDepsFirst')} &apos;{dialog.moduleName}&apos;.
          </p>
        ) : (
          <p className="text-sm text-gray-600 mb-4">
            {t('moduleManagement.disableDepsFirst')} &apos;{dialog.moduleName}&apos;.
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {t('moduleManagement.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
