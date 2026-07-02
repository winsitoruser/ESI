import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import WasteRecordModal from '@/components/inventory/WasteRecordModal';
import {
  FaIndustry, FaPlus, FaPlay, FaCheck, FaClock, FaBoxOpen,
  FaClipboardCheck, FaExclamationTriangle, FaChartLine, FaFlask,
  FaWarehouse, FaCheckCircle, FaTimes, FaArrowLeft, FaHistory,
  FaEdit, FaTrash, FaEye, FaCalendar, FaUser, FaDollarSign,
  FaRecycle, FaTools, FaShoppingCart, FaHandHoldingHeart
} from 'react-icons/fa';

interface Production {
  id: number;
  batch_number: string;
  recipe_id: number;
  planned_quantity: number;
  produced_quantity: number;
  unit: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  production_date: string;
  start_time?: string;
  completion_time?: string;
  total_cost: number;
  quality_grade?: string;
  notes?: string;
  recipe?: {
    id: number;
    code: string;
    name: string;
    batch_size: number;
    batch_unit: string;
  };
  materials?: Array<{
    id: number;
    product_id: number;
    planned_quantity: number;
    used_quantity: number;
    unit: string;
    material?: {
      id: number;
      name: string;
      sku: string;
    };
  }>;
  producer?: {
    id: number;
    name: string;
  };
}

interface Recipe {
  id: number;
  code: string;
  name: string;
  category?: string;
  description?: string;
  batch_size: number;
  batch_unit: string;
  total_cost: number;
  cost_per_unit: number;
  estimated_yield?: number;
  total_time_minutes?: number;
  status: 'active' | 'draft' | 'archived';
  created_at: string;
  version?: number;
  ingredients?: Array<{
    product_id: number;
    quantity: number;
    unit: string;
    unit_cost?: number;
    subtotal_cost?: number;
    material?: {
      id: number;
      name: string;
      sku: string;
    };
  }>;
}

interface WasteRecord {
  id: number;
  waste_number: string;
  production_id?: number;
  waste_type: string;
  waste_category: string;
  quantity: number;
  unit: string;
  cost_value: number;
  disposal_method: string;
  clearance_price: number;
  net_loss: number;
  reason?: string;
  notes?: string;
  waste_date: string;
  status: string;
  created_at: string;
  production?: {
    batch_number: string;
  };
}

const ProductionPage: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { t, formatCurrency, formatDate } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<'production' | 'recipes'>('production');
  const [productions, setProductions] = useState<Production[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [wasteSummary, setWasteSummary] = useState({ total_records: 0, total_loss: 0, total_recovery: 0, net_loss: 0 });

  useEffect(() => {
    fetchProductions();
    fetchRecipes();
    fetchWasteRecords();
  }, [filterStatus]);

  const fetchProductions = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      
      const response = await fetch(`/api/productions?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setProductions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching productions:', error);
      toast({
        title: t('inventory.production.loadFailed'),
        description: t('inventory.production.cannotLoadProduction'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes?status=active');
      const data = await response.json();
      
      if (data.success) {
        setRecipes(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  const fetchWasteRecords = async () => {
    try {
      const response = await fetch('/api/waste');
      const data = await response.json();
      
      if (data.success) {
        setWasteRecords(data.data || []);
        setWasteSummary(data.summary || { total_records: 0, total_loss: 0, total_recovery: 0, net_loss: 0 });
      }
    } catch (error) {
      console.error('Error fetching waste records:', error);
    }
  };

  const handleWasteSubmit = async (wasteData: any) => {
    try {
      const response = await fetch('/api/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...wasteData,
          recorded_by: 1,
          waste_date: new Date().toISOString()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: t('inventory.production.wasteRecorded'),
          description: `${data.data.waste_number} - ${t('inventory.production.netLoss')}: ${formatCurrency(data.data.net_loss)}`,
          className: 'bg-green-50 border-green-200'
        });
        setShowWasteModal(false);
        fetchWasteRecords();
      } else {
        toast({
          title: t('inventory.production.wasteRecordFailed'),
          description: data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error recording waste:', error);
      toast({
        title: t('inventory.production.errorOccurred'),
        description: t('inventory.production.wasteRecordError'),
        variant: 'destructive'
      });
    }
  };

  const handleStartProduction = async (recipeId: number) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    try {
      const productionData = {
        recipe_id: recipeId,
        planned_quantity: recipe.batch_size,
        production_date: new Date().toISOString(),
        unit: recipe.batch_unit,
        total_cost: recipe.total_cost,
        materials: recipe.ingredients || [],
        produced_by: 1
      };

      const response = await fetch('/api/productions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productionData)
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: t('inventory.production.productionStarted'),
          description: `Batch ${data.data.batch_number} ${t('inventory.production.successfullyCreated')}`,
          className: 'bg-green-50 border-green-200'
        });
        fetchProductions();
      } else {
        toast({
          title: t('inventory.production.startFailed'),
          description: data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error starting production:', error);
      toast({
        title: t('inventory.production.errorOccurred'),
        description: t('inventory.production.startError'),
        variant: 'destructive'
      });
    }
  };

  const handleUpdateStatus = async (productionId: number, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        changed_by: 1
      };

      if (newStatus === 'in_progress') {
        updateData.start_time = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.completion_time = new Date().toISOString();
        const production = productions.find(p => p.id === productionId);
        if (production) {
          updateData.produced_quantity = production.planned_quantity;
        }
      }

      const response = await fetch(`/api/productions/${productionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      
      if (data.success) {
        const statusLabel = newStatus === 'in_progress' ? t('inventory.production.inProgress') : 
                           newStatus === 'completed' ? t('inventory.production.completed') : newStatus;
        toast({
          title: t('inventory.production.statusUpdated'),
          description: `${t('inventory.production.statusChangedTo')} ${statusLabel}`,
          className: 'bg-green-50 border-green-200'
        });
        fetchProductions();
      } else {
        toast({
          title: t('inventory.production.updateFailed'),
          description: data.message || t('inventory.production.updateError'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: t('inventory.production.updateFailed'),
        description: t('inventory.production.updateError'),
        variant: 'destructive'
      });
    }
  };



  const getStatusBadge = (status: string) => {
    const config = {
      planned: { color: 'bg-blue-100 text-blue-700', icon: FaClock, label: t('inventory.production.planned') },
      in_progress: { color: 'bg-yellow-100 text-yellow-700', icon: FaPlay, label: t('inventory.production.inProgress') },
      completed: { color: 'bg-green-100 text-green-700', icon: FaCheckCircle, label: t('inventory.production.completed') },
      cancelled: { color: 'bg-red-100 text-red-700', icon: FaTimes, label: t('inventory.production.cancelled') }
    };
    const statusConfig = config[status as keyof typeof config] || config.planned;
    const Icon = statusConfig.icon;
    return (
      <Badge className={statusConfig.color}>
        <Icon className="mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      raw_material: 'bg-orange-100 text-orange-700',
      work_in_progress: 'bg-yellow-100 text-yellow-700',
      finished_product: 'bg-blue-100 text-blue-700',
      packaging: 'bg-purple-100 text-purple-700',
      other: 'bg-gray-100 text-gray-700'
    };
    const labels = {
      raw_material: t('inventory.production.rawMaterial'),
      work_in_progress: 'WIP',
      finished_product: t('inventory.production.finishedProduct'),
      packaging: t('inventory.production.packaging'),
      other: t('inventory.production.otherType')
    };
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100'}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      defect: 'bg-red-100 text-red-700',
      expired: 'bg-orange-100 text-orange-700',
      damaged: 'bg-yellow-100 text-yellow-700',
      overproduction: 'bg-blue-100 text-blue-700',
      spillage: 'bg-purple-100 text-purple-700',
      contamination: 'bg-pink-100 text-pink-700'
    };
    const labels = {
      defect: t('inventory.production.defect'),
      expired: t('inventory.production.expired'),
      damaged: t('inventory.production.damaged'),
      overproduction: t('inventory.production.overproduction'),
      spillage: t('inventory.production.spillage'),
      contamination: t('inventory.production.contamination')
    };
    return (
      <Badge className={colors[category as keyof typeof colors] || 'bg-gray-100'}>
        {labels[category as keyof typeof labels] || category}
      </Badge>
    );
  };

  const getMethodLabel = (method: string) => {
    const labels = {
      discard: t('inventory.production.discard'),
      recycle: t('inventory.production.recycle'),
      rework: t('inventory.production.rework'),
      clearance_sale: t('inventory.production.clearanceSale'),
      donation: t('inventory.production.donation')
    };
    return labels[method as keyof typeof labels] || method;
  };

  const filteredProductions = productions.filter(prod =>
    prod.batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prod.recipe?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWaste = wasteRecords.filter(waste =>
    waste.waste_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    waste.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    waste.production?.batch_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: productions.length,
    planned: productions.filter(p => p.status === 'planned').length,
    inProgress: productions.filter(p => p.status === 'in_progress').length,
    completed: productions.filter(p => p.status === 'completed').length,
    totalProduced: productions.reduce((sum, p) => sum + (p.produced_quantity || 0), 0)
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => router.push('/inventory')}
                  variant="outline"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <FaArrowLeft className="mr-2" />
                  {t('common.back')}
                </Button>
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <FaIndustry className="w-7 h-7" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold">{t('inventory.production.title')}</h1>
                      <p className="text-indigo-100 text-sm">{t('inventory.production.subtitle')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => router.push('/inventory/production/history')}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              >
                <FaHistory className="mr-2" />
                {t('inventory.production.productionHistory')}
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <p className="text-xs text-indigo-100">{t('inventory.production.totalBatch')}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-blue-500/30 backdrop-blur-sm rounded-lg p-3 border border-blue-400/30">
                <p className="text-xs text-blue-100">{t('inventory.production.planned')}</p>
                <p className="text-2xl font-bold">{stats.planned}</p>
              </div>
              <div className="bg-yellow-500/30 backdrop-blur-sm rounded-lg p-3 border border-yellow-400/30">
                <p className="text-xs text-yellow-100">{t('inventory.production.inProgress')}</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
              <div className="bg-green-500/30 backdrop-blur-sm rounded-lg p-3 border border-green-400/30">
                <p className="text-xs text-green-100">{t('inventory.production.completed')}</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <div className="bg-purple-500/30 backdrop-blur-sm rounded-lg p-3 border border-purple-400/30">
                <p className="text-xs text-purple-100">{t('inventory.production.totalProduced')}</p>
                <p className="text-2xl font-bold">{stats.totalProduced}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('production')}
                  className={`${
                    activeTab === 'production'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <FaIndustry />
                  <span>{t('inventory.production.productionTab')}</span>
                </button>
                <button
                  onClick={() => setActiveTab('recipes')}
                  className={`${
                    activeTab === 'recipes'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <FaFlask />
                  <span>{t('inventory.recipes.recipesFormula')}</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Production Tab Content */}
          {activeTab === 'production' && (
            <>
              {/* Filters */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder={t('inventory.production.searchBatch')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                      <FaClipboardCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">{t('inventory.production.allStatus')}</option>
                      <option value="planned">{t('inventory.production.planned')}</option>
                      <option value="in_progress">{t('inventory.production.inProgress')}</option>
                      <option value="completed">{t('inventory.production.completed')}</option>
                      <option value="cancelled">{t('inventory.production.cancelled')}</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Available Recipes */}
              {recipes.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FaFlask className="mr-2 text-indigo-600" />
                      {t('inventory.production.availableRecipes')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {recipes.slice(0, 3).map((recipe) => (
                        <div key={recipe.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
                          <h3 className="font-bold text-lg text-gray-900 mb-2">{recipe.name}</h3>
                          <p className="text-sm text-gray-600 mb-3">
                            Batch: {recipe.batch_size} {recipe.batch_unit}
                          </p>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-gray-500">{t('inventory.production.cost')}</span>
                            <span className="font-bold text-indigo-600">{formatCurrency(recipe.total_cost)}</span>
                          </div>
                          <Button
                            onClick={() => handleStartProduction(recipe.id)}
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                            size="sm"
                          >
                            <FaPlay className="mr-2" />
                            {t('inventory.production.startProduction')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Production List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FaClipboardCheck className="mr-2 text-indigo-600" />
                    {t('inventory.production.productionList')} ({filteredProductions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredProductions.length === 0 ? (
                    <div className="text-center py-12">
                      <FaIndustry className="text-6xl text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {t('inventory.production.noProduction')}
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {t('inventory.production.noProductionDesc')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredProductions.map((production) => (
                        <div key={production.id} className="border-2 border-gray-200 rounded-xl p-6 hover:border-indigo-300 transition-colors">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-bold text-xl text-gray-900">{production.batch_number}</h3>
                                {getStatusBadge(production.status)}
                                {production.quality_grade && (
                                  <Badge className="bg-purple-100 text-purple-700">
                                    Grade {production.quality_grade}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-600">{production.recipe?.name}</p>
                              <p className="text-sm text-gray-500">SKU: {production.recipe?.code}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500 flex items-center justify-end">
                                <FaCalendar className="mr-1" />
                                {formatDate(production.production_date)}
                              </p>
                              {production.producer && (
                                <p className="text-xs text-gray-500 flex items-center justify-end mt-1">
                                  <FaUser className="mr-1" />
                                  {production.producer.name}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-xs text-gray-500">{t('inventory.production.planLabel')}</p>
                              <p className="text-lg font-bold text-gray-900">
                                {production.planned_quantity} {production.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">{t('inventory.production.produced')}</p>
                              <p className="text-lg font-bold text-indigo-600">
                                {production.produced_quantity} {production.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">{t('inventory.production.totalCostLabel')}</p>
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrency(production.total_cost)}
                              </p>
                            </div>
                          </div>

                          {production.notes && (
                            <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded mb-4">
                              <p className="text-sm text-gray-700">{production.notes}</p>
                            </div>
                          )}

                          <div className="flex space-x-2">
                            {production.status === 'planned' && (
                              <Button
                                onClick={() => handleUpdateStatus(production.id, 'in_progress')}
                                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                                size="sm"
                              >
                                <FaPlay className="mr-2" />
                                {t('inventory.production.startProcess')}
                              </Button>
                            )}
                            {production.status === 'in_progress' && (
                              <Button
                                onClick={() => handleUpdateStatus(production.id, 'completed')}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                <FaCheck className="mr-2" />
                                {t('inventory.production.completeProduction')}
                              </Button>
                            )}
                            <Button
                              onClick={() => {
                                toast({
                                  title: t('inventory.production.productionDetail'),
                                  description: `Batch: ${production.batch_number} - ${production.recipe?.name}`,
                                  className: 'bg-blue-50 border-blue-200'
                                });
                              }}
                              variant="outline"
                              className="flex-1"
                              size="sm"
                            >
                              <FaEye className="mr-2" />
                              {t('inventory.production.viewDetail')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Recipes Tab Content */}
          {activeTab === 'recipes' && (
            <>
              {/* Recipe Actions */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-3">
                  <Button
                    onClick={() => router.push('/inventory/recipes/new')}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <FaPlus className="mr-2" />
                    {t('inventory.recipes.createNew')}
                  </Button>
                  <Button
                    onClick={() => router.push('/inventory/recipes/history')}
                    variant="outline"
                  >
                    <FaHistory className="mr-2" />
                    {t('inventory.recipes.history')}
                  </Button>
                </div>
              </div>

              {/* Recipe Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 mb-1">{t('inventory.recipes.totalRecipes')}</p>
                        <p className="text-3xl font-bold text-purple-700">{recipes.length}</p>
                      </div>
                      <FaFlask className="text-4xl text-purple-300" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 mb-1">{t('inventory.recipes.statusActive')}</p>
                        <p className="text-3xl font-bold text-green-700">
                          {recipes.filter(r => r.status === 'active').length}
                        </p>
                      </div>
                      <FaCheckCircle className="text-4xl text-green-300" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-yellow-600 mb-1">{t('inventory.recipes.statusDraft')}</p>
                        <p className="text-3xl font-bold text-yellow-700">
                          {recipes.filter(r => r.status === 'draft').length}
                        </p>
                      </div>
                      <FaClock className="text-4xl text-yellow-300" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 mb-1">{t('inventory.recipes.statusArchived')}</p>
                        <p className="text-3xl font-bold text-blue-700">
                          {recipes.filter(r => r.status === 'archived').length}
                        </p>
                      </div>
                      <FaBoxOpen className="text-4xl text-blue-300" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder={t('inventory.recipes.searchRecipe')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                    <FaFlask className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Recipes Grid */}
              {recipes.length === 0 ? (
                <Card>
                  <CardContent className="p-12">
                    <div className="text-center">
                      <FaFlask className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('inventory.production.noRecipes')}</h3>
                      <p className="text-gray-600 mb-6">
                        {t('inventory.production.noRecipesDesc')}
                      </p>
                      <Button
                        onClick={() => router.push('/inventory/recipes/new')}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <FaPlus className="mr-2" />
                        {t('inventory.recipes.createNew')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {recipes
                    .filter(recipe =>
                      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      recipe.code.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((recipe) => (
                      <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <CardTitle className="text-xl">{recipe.name}</CardTitle>
                                <Badge className={
                                  recipe.status === 'active' ? 'bg-green-100 text-green-700' :
                                  recipe.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }>
                                  {recipe.status === 'active' ? t('inventory.recipes.statusActive') :
                                   recipe.status === 'draft' ? t('inventory.recipes.statusDraft') : t('inventory.recipes.statusArchived')}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{recipe.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                SKU: {recipe.code} | {recipe.category || 'General'}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-xs text-gray-500">{t('inventory.recipes.batchSize')}</p>
                              <p className="font-semibold text-gray-900">
                                {recipe.batch_size} {recipe.batch_unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">{t('inventory.production.time')}</p>
                              <p className="font-semibold text-gray-900">
                                {recipe.total_time_minutes || 0} min
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">{t('inventory.recipes.totalCost')}</p>
                              <p className="font-semibold text-green-600">
                                {formatCurrency(recipe.total_cost)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">{t('inventory.recipes.costPerUnit')}</p>
                              <p className="font-semibold text-blue-600">
                                {formatCurrency(recipe.cost_per_unit)}
                              </p>
                            </div>
                          </div>

                          {recipe.ingredients && recipe.ingredients.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                                <FaBoxOpen className="mr-2 text-purple-600" />
                                {t('inventory.recipes.ingredients')} ({recipe.ingredients.length})
                              </h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {recipe.ingredients.slice(0, 3).map((ingredient, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded text-sm">
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900">
                                        {ingredient.material?.name || `Material ${ingredient.product_id}`}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {ingredient.quantity} {ingredient.unit}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                                {recipe.ingredients.length > 3 && (
                                  <p className="text-xs text-gray-500 text-center">
                                    +{recipe.ingredients.length - 3} {t('inventory.production.moreIngredients')}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                              onClick={() => handleStartProduction(recipe.id)}
                            >
                              <FaPlay className="mr-2" />
                              {t('inventory.production.productionTab')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/inventory/recipes/new?edit=${recipe.id}`)}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/inventory/recipes/${recipe.id}`)}
                            >
                              <FaEye />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Waste Record Modal */}
      <WasteRecordModal
        isOpen={showWasteModal}
        onClose={() => setShowWasteModal(false)}
        onSubmit={handleWasteSubmit}
        productions={productions}
      />

      <Toaster />
    </DashboardLayout>
  );
};

export default ProductionPage;
