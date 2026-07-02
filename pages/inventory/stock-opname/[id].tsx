import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import VarianceResolutionModal from '@/components/inventory/VarianceResolutionModal';
import Link from 'next/link';
import { 
  FaClipboardList, FaArrowLeft, FaSave, FaPrint, FaCheck,
  FaExclamationTriangle, FaWarehouse, FaMapMarkerAlt, FaCalendar,
  FaUser, FaBarcode, FaCamera, FaFileAlt
} from 'react-icons/fa';

interface StockOpnameItem {
  id: string;
  product_id: number;
  product?: any;
  location_id: number;
  location?: any;
  system_stock: number;
  physical_stock: number | null;
  difference: number;
  variance_percentage: number;
  unit_cost: number;
  variance_value: number;
  variance_category: 'none' | 'minor' | 'moderate' | 'major';
  status: 'pending' | 'counted' | 'verified' | 'investigated' | 'approved';
  counted_by: string;
  count_date: string;
  notes: string;
}

const StockOpnameDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const { t, formatCurrency, formatDate } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [opname, setOpname] = useState<any>(null);
  const [items, setItems] = useState<StockOpnameItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showVarianceModal, setShowVarianceModal] = useState(false);
  const [selectedVarianceItem, setSelectedVarianceItem] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (id) {
      loadStockOpname();
      loadIncidents();
    }
  }, [id]);

  const loadStockOpname = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stock-opname/${id}`);
      const result = await response.json();
      
      if (result.success) {
        setOpname(result.data);
        setItems(result.data.items || []);
      }
    } catch (error) {
      console.error('Error loading stock opname:', error);
      alert(t('inventory.stockOpname.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadIncidents = async () => {
    try {
      const response = await fetch(`/api/incident-reports?stock_opname_id=${id}`);
      const result = await response.json();
      if (result.success) {
        setIncidents(result.data);
      }
    } catch (error) {
      console.error('Error loading incidents:', error);
    }
  };

  const handlePhysicalStockChange = (itemId: string, value: string) => {
    const physicalStock = parseFloat(value) || 0;
    
    setItems(items.map(item => {
      if (item.id === itemId) {
        const difference = physicalStock - item.system_stock;
        const variancePercentage = item.system_stock > 0 ? (difference / item.system_stock) * 100 : 0;
        const varianceValue = difference * item.unit_cost;
        
        let varianceCategory: 'none' | 'minor' | 'moderate' | 'major' = 'none';
        const absVariancePercentage = Math.abs(variancePercentage);
        const absVarianceValue = Math.abs(varianceValue);
        
        if (absVariancePercentage > 5 || absVarianceValue > 500000) {
          varianceCategory = 'major';
        } else if (absVariancePercentage > 2 || absVarianceValue > 100000) {
          varianceCategory = 'moderate';
        } else if (difference !== 0) {
          varianceCategory = 'minor';
        }
        
        return {
          ...item,
          physical_stock: physicalStock,
          difference,
          variance_percentage: variancePercentage,
          variance_value: varianceValue,
          variance_category: varianceCategory,
          status: physicalStock > 0 ? 'counted' as const : 'pending' as const,
          count_date: new Date().toISOString(),
          counted_by: session?.user?.name || 'Admin'
        };
      }
      return item;
    }));
  };

  const handleSaveProgress = async () => {
    setSaving(true);
    try {
      const countedItems = items.filter(item => item.physical_stock !== null);
      
      for (const item of countedItems) {
        await fetch(`/api/stock-opname/items/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            physical_stock: item.physical_stock,
            counted_by: item.counted_by,
            notes: item.notes,
            status: item.status
          })
        });
      }

      // Update opname header
      await fetch(`/api/stock-opname/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
          start_date: opname.start_date || new Date().toISOString(),
          counted_items: countedItems.length,
          items_with_variance: items.filter(i => i.variance_category !== 'none').length,
          total_variance_value: items.reduce((sum, i) => sum + i.variance_value, 0)
        })
      });

      alert(t('inventory.stockOpname.saveSuccess'));
      loadStockOpname();
    } catch (error) {
      console.error('Error saving progress:', error);
      alert(t('inventory.stockOpname.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteOpname = async () => {
    const uncountedItems = items.filter(item => item.physical_stock === null);
    
    if (uncountedItems.length > 0) {
      if (!confirm(`${t('inventory.stockOpname.uncountedItems', { count: uncountedItems.length.toString() })}`)) {
        return;
      }
    }

    setSaving(true);
    try {
      await fetch(`/api/stock-opname/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          end_date: new Date().toISOString()
        })
      });

      alert(t('inventory.stockOpname.completeSuccess'));
      router.push('/inventory/stock-opname');
    } catch (error) {
      console.error('Error completing opname:', error);
      alert(t('inventory.stockOpname.completeFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenVarianceResolution = (item: StockOpnameItem) => {
    const varianceItem = {
      id: item.id,
      productId: item.product_id.toString(),
      productName: item.product?.name || '',
      sku: item.product?.sku || '',
      category: item.product?.category || '',
      location: item.location?.name || '',
      uom: item.product?.unit || 'pcs',
      systemStock: item.system_stock,
      physicalStock: item.physical_stock || 0,
      difference: item.difference,
      variancePercentage: item.variance_percentage,
      unitCost: item.unit_cost,
      varianceValue: item.variance_value,
      status: item.status,
      varianceCategory: item.variance_category,
      countedBy: item.counted_by,
      countDate: item.count_date,
      recountRequired: false,
      rootCause: '',
      notes: item.notes || '',
      photos: []
    };
    
    setSelectedVarianceItem(varianceItem);
    setShowVarianceModal(true);
  };

  const handleIncidentSubmit = async (incidentData: any) => {
    try {
      const incidentPayload = {
        incident_number: incidentData.incidentNumber,
        stock_opname_id: parseInt(id as string),
        stock_opname_item_id: parseInt(incidentData.varianceItem.id),
        product_id: parseInt(incidentData.varianceItem.productId),
        variance_quantity: incidentData.varianceItem.difference,
        variance_value: incidentData.varianceItem.varianceValue,
        variance_category: incidentData.varianceItem.varianceCategory,
        why_1: incidentData.investigation.why1,
        why_2: incidentData.investigation.why2,
        why_3: incidentData.investigation.why3,
        why_4: incidentData.investigation.why4,
        why_5: incidentData.investigation.why5,
        root_cause: incidentData.investigation.rootCause,
        evidence_notes: incidentData.investigation.evidence,
        witness_statement: incidentData.investigation.witness,
        immediate_action: incidentData.correctiveAction.immediateAction,
        corrective_action: incidentData.correctiveAction.correctiveAction,
        preventive_action: incidentData.correctiveAction.preventiveAction,
        responsible_person: incidentData.correctiveAction.responsiblePerson,
        target_date: incidentData.correctiveAction.targetDate,
        approval_level: incidentData.approval.level,
        approver_comments: incidentData.approval.comments
      };

      const response = await fetch('/api/incident-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incidentPayload)
      });

      const result = await response.json();
      
      if (result.success) {
        alert(t('inventory.stockOpname.incidentSuccess'));
        loadIncidents();
        loadStockOpname();
      } else {
        alert(t('inventory.stockOpname.incidentFailed') + ': ' + result.message);
      }
    } catch (error) {
      console.error('Error creating incident report:', error);
      alert(t('inventory.stockOpname.incidentError'));
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: { color: 'bg-gray-100 text-gray-700', label: t('inventory.stockOpname.pending') },
      counted: { color: 'bg-blue-100 text-blue-700', label: t('inventory.stockOpname.counted') },
      verified: { color: 'bg-green-100 text-green-700', label: t('inventory.stockOpname.verified') },
      investigated: { color: 'bg-yellow-100 text-yellow-700', label: t('inventory.stockOpname.investigated') },
      approved: { color: 'bg-purple-100 text-purple-700', label: t('inventory.stockOpname.approved') }
    };
    const badge = badges[status] || badges.pending;
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  const getVarianceBadge = (category: string) => {
    const badges: any = {
      none: { color: 'bg-green-100 text-green-700', label: t('inventory.stockOpname.noVariance') },
      minor: { color: 'bg-blue-100 text-blue-700', label: t('inventory.stockOpname.minor') },
      moderate: { color: 'bg-yellow-100 text-yellow-700', label: t('inventory.stockOpname.moderate') },
      major: { color: 'bg-red-100 text-red-700', label: t('inventory.stockOpname.major') }
    };
    const badge = badges[category] || badges.none;
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };


  const filteredItems = items.filter(item =>
    item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: items.length,
    counted: items.filter(i => i.physical_stock !== null).length,
    withVariance: items.filter(i => i.variance_category !== 'none').length,
    totalVariance: items.reduce((sum, i) => sum + i.variance_value, 0)
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!opname) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaExclamationTriangle className="mx-auto text-6xl text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('inventory.stockOpname.notFound')}</h2>
            <Link href="/inventory/stock-opname">
              <Button className="mt-4">{t('inventory.stockOpname.backToList')}</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>{opname.opname_number} - Stock Opname</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/inventory/stock-opname">
                <Button variant="outline" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                  <FaArrowLeft className="mr-2" />
                  {t('common.back')}
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {opname.opname_number}
                </h1>
                <p className="text-indigo-100">
                  {opname.warehouse?.name || 'Gudang'} - {formatDate(opname.scheduled_date)}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleSaveProgress}
                disabled={saving}
                className="bg-white text-indigo-600 hover:bg-indigo-50"
              >
                <FaSave className="mr-2" />
                {t('inventory.stockOpname.saveProgress')}
              </Button>
              <Button
                onClick={handleCompleteOpname}
                disabled={saving || opname.status === 'completed'}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <FaCheck className="mr-2" />
                {t('inventory.stockOpname.complete')}
              </Button>
              <Button
                onClick={() => window.print()}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <FaPrint className="mr-2" />
                Print
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-xs text-indigo-200 mb-1">{t('inventory.stockOpname.totalItem')}</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-xs text-indigo-200 mb-1">{t('inventory.stockOpname.alreadyCounted')}</p>
              <p className="text-2xl font-bold">{stats.counted}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-xs text-indigo-200 mb-1">{t('inventory.stockOpname.hasVariance')}</p>
              <p className="text-2xl font-bold">{stats.withVariance}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-xs text-indigo-200 mb-1">{t('inventory.stockOpname.totalVariance')}</p>
              <p className={`text-2xl font-bold ${stats.totalVariance < 0 ? 'text-red-200' : 'text-green-200'}`}>
                {formatCurrency(stats.totalVariance)}
              </p>
            </div>
          </div>
        </div>

        {/* Incident Reports Section */}
        {incidents.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FaFileAlt className="mr-2" />
                {t('inventory.stockOpname.incidentReports')} ({incidents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {incidents.map((incident: any) => (
                  <div key={incident.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className="bg-yellow-100 text-yellow-700">
                            {incident.incident_number}
                          </Badge>
                          <Badge className="bg-gray-100 text-gray-700">
                            {t('inventory.stockOpname.awaitingApproval')} {incident.approval_level}
                          </Badge>
                        </div>
                        <p className="font-semibold text-gray-900 mb-1">
                          {incident.product?.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>{t('inventory.stockOpname.varianceLabel')}:</strong> {incident.variance_quantity} unit ({formatCurrency(incident.variance_value)})
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>{t('inventory.stockOpname.rootCause')}:</strong> {incident.root_cause}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        <FaPrint className="mr-2" />
                        Print
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <FaBarcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder={t('inventory.stockOpname.searchProduct')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('inventory.stockOpname.productList')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.stockOpname.product')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.stockOpname.location')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.stockOpname.systemStock')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.stockOpname.physicalStock')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.stockOpname.difference')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.stockOpname.category')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.stockOpname.statusLabel')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.stockOpname.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-900">{item.product?.name}</p>
                          <p className="text-sm text-gray-500">{item.product?.sku}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.location?.code} - {item.location?.name}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {item.system_stock} {item.product?.unit}
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.physical_stock || ''}
                          onChange={(e) => handlePhysicalStockChange(item.id, e.target.value)}
                          placeholder="0"
                          className="w-24 text-right"
                        />
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${item.difference < 0 ? 'text-red-600' : item.difference > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {item.difference !== 0 && (item.difference > 0 ? '+' : '')}{item.difference}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getVarianceBadge(item.variance_category)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.variance_category !== 'none' && item.physical_stock !== null && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenVarianceResolution(item)}
                            className="text-yellow-600 border-yellow-600"
                          >
                            <FaExclamationTriangle className="mr-1" />
                            {t('inventory.stockOpname.resolve')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variance Resolution Modal */}
      {showVarianceModal && selectedVarianceItem && (
        <VarianceResolutionModal
          isOpen={showVarianceModal}
          onClose={() => {
            setShowVarianceModal(false);
            setSelectedVarianceItem(null);
          }}
          varianceItem={selectedVarianceItem}
          onSubmit={handleIncidentSubmit}
        />
      )}
    </DashboardLayout>
  );
};

export default StockOpnameDetailPage;
