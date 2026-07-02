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
import {
  FaTrash, FaArrowLeft, FaSearch, FaFilter, FaCalendar,
  FaUser, FaDollarSign, FaBoxOpen, FaRecycle, FaTools,
  FaShoppingCart, FaHandHoldingHeart, FaExclamationTriangle
} from 'react-icons/fa';

interface WasteRecord {
  id: number;
  waste_number: string;
  production_id?: number;
  product_id?: number;
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
    id: number;
    batch_number: string;
    status: string;
  };
  product?: {
    id: number;
    name: string;
    sku: string;
  };
  recorder?: {
    id: number;
    name: string;
    email: string;
  };
}

const WasteHistoryPage: React.FC = () => {
  const router = useRouter();
  const { t, formatCurrency, formatDate } = useTranslation();
  const { toast } = useToast();
  
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [summary, setSummary] = useState({
    total_records: 0,
    total_loss: 0,
    total_recovery: 0,
    net_loss: 0
  });

  useEffect(() => {
    fetchWasteRecords();
  }, [filterType, filterCategory, filterMethod]);

  const fetchWasteRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('waste_type', filterType);
      if (filterCategory !== 'all') params.append('waste_category', filterCategory);

      const response = await fetch(`/api/waste?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setWasteRecords(data.data || []);
        setSummary(data.summary || { total_records: 0, total_loss: 0, total_recovery: 0, net_loss: 0 });
      }
    } catch (error) {
      console.error('Error fetching waste records:', error);
      toast({
        title: t('inventory.production.wasteHistoryLoadFailed'),
        description: t('inventory.production.wasteHistoryLoadError'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };



  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'raw_material': return <FaBoxOpen className="text-orange-500" />;
      case 'finished_product': return <FaShoppingCart className="text-blue-500" />;
      case 'work_in_progress': return <FaTools className="text-yellow-500" />;
      default: return <FaTrash className="text-gray-400" />;
    }
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

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'recycle': return <FaRecycle className="text-green-500" />;
      case 'rework': return <FaTools className="text-blue-500" />;
      case 'clearance_sale': return <FaShoppingCart className="text-purple-500" />;
      case 'donation': return <FaHandHoldingHeart className="text-pink-500" />;
      default: return <FaTrash className="text-red-500" />;
    }
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

  const filteredRecords = wasteRecords.filter(record => {
    const matchSearch = 
      record.waste_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.production?.batch_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchMethod = filterMethod === 'all' || record.disposal_method === filterMethod;
    
    return matchSearch && matchMethod;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">{t('inventory.production.loadingWasteHistory')}</p>
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
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => router.push('/inventory/production')}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <FaArrowLeft />
                  <span>{t('common.back')}</span>
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                    <FaTrash className="text-red-600" />
                    <span>{t('inventory.production.wasteHistoryTitle')}</span>
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {t('inventory.production.wasteHistorySubtitle')}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {filteredRecords.length} Record
              </Badge>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 mb-1">{t('inventory.production.totalWaste')}</p>
                    <p className="text-3xl font-bold text-red-700">{summary.total_records}</p>
                    <p className="text-xs text-gray-600 mt-1">Record</p>
                  </div>
                  <FaTrash className="text-4xl text-red-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 mb-1">{t('inventory.production.totalLoss')}</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {formatCurrency(summary.total_loss)}
                    </p>
                  </div>
                  <FaDollarSign className="text-4xl text-orange-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 mb-1">{t('inventory.production.recovery')}</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(summary.total_recovery)}
                    </p>
                  </div>
                  <FaShoppingCart className="text-4xl text-green-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-pink-100 border-red-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 mb-1">{t('inventory.production.netLossLabel')}</p>
                    <p className="text-2xl font-bold text-red-700">
                      {formatCurrency(summary.net_loss)}
                    </p>
                  </div>
                  <FaExclamationTriangle className="text-4xl text-red-300" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('inventory.production.searchWaste')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">{t('inventory.production.allTypes')}</option>
                  <option value="raw_material">{t('inventory.production.rawMaterial')}</option>
                  <option value="work_in_progress">WIP</option>
                  <option value="finished_product">{t('inventory.production.finishedProduct')}</option>
                  <option value="packaging">{t('inventory.production.packaging')}</option>
                  <option value="other">{t('inventory.production.otherType')}</option>
                </select>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">{t('inventory.production.allCategories')}</option>
                  <option value="defect">{t('inventory.production.defect')}</option>
                  <option value="expired">{t('inventory.production.expired')}</option>
                  <option value="damaged">{t('inventory.production.damaged')}</option>
                  <option value="overproduction">{t('inventory.production.overproduction')}</option>
                  <option value="spillage">{t('inventory.production.spillage')}</option>
                  <option value="contamination">{t('inventory.production.contamination')}</option>
                </select>

                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">{t('inventory.production.allMethods')}</option>
                  <option value="discard">{t('inventory.production.discard')}</option>
                  <option value="recycle">{t('inventory.production.recycle')}</option>
                  <option value="rework">{t('inventory.production.rework')}</option>
                  <option value="clearance_sale">{t('inventory.production.clearanceSale')}</option>
                  <option value="donation">{t('inventory.production.donation')}</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Waste Records */}
          {filteredRecords.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <FaTrash className="text-6xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {t('inventory.production.noWasteHistory')}
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery
                      ? t('inventory.production.noWasteSearch')
                      : t('inventory.production.noWasteYet')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((waste) => (
                <Card key={waste.id} className="hover:shadow-lg transition-shadow border-l-4 border-red-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            {getTypeIcon(waste.waste_type)}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{waste.waste_number}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              {getTypeBadge(waste.waste_type)}
                              {getCategoryBadge(waste.waste_category)}
                              {waste.production && (
                                <Badge className="bg-indigo-100 text-indigo-700">
                                  {waste.production.batch_number}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(waste.net_loss)}
                        </p>
                        <p className="text-xs text-gray-500">{t('inventory.production.netLossLabel')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{t('inventory.production.quantity')}</p>
                        <p className="text-lg font-bold text-gray-900">
                          {waste.quantity} {waste.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{t('inventory.production.lossValue')}</p>
                        <p className="text-lg font-bold text-orange-600">
                          {formatCurrency(waste.cost_value)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{t('inventory.production.recovery')}</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(waste.clearance_price)}
                        </p>
                      </div>
                    </div>

                    {waste.reason && (
                      <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded mb-3">
                        <p className="text-sm font-semibold text-gray-700 mb-1">{t('inventory.production.reason')}:</p>
                        <p className="text-sm text-gray-600">{waste.reason}</p>
                      </div>
                    )}

                    {waste.notes && (
                      <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded mb-3">
                        <p className="text-sm font-semibold text-gray-700 mb-1">{t('inventory.production.notes')}:</p>
                        <p className="text-sm text-gray-600">{waste.notes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          {getMethodIcon(waste.disposal_method)}
                          <span>{getMethodLabel(waste.disposal_method)}</span>
                        </div>
                        <div className="flex items-center">
                          <FaCalendar className="mr-1" />
                          {formatDate(waste.waste_date)}
                        </div>
                        {waste.recorder && (
                          <div className="flex items-center">
                            <FaUser className="mr-1" />
                            {waste.recorder.name}
                          </div>
                        )}
                      </div>
                      <Badge className={
                        waste.status === 'recovered' ? 'bg-green-100 text-green-700' :
                        waste.status === 'disposed' ? 'bg-gray-100 text-gray-700' :
                        'bg-blue-100 text-blue-700'
                      }>
                        {waste.status === 'recovered' ? t('inventory.production.statusRecovered') :
                         waste.status === 'disposed' ? t('inventory.production.statusDisposed') : t('inventory.production.statusRecorded')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </DashboardLayout>
  );
};

export default WasteHistoryPage;
