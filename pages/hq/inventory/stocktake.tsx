import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import HQLayout from '../../../components/hq/HQLayout';
import {
  ClipboardList,
  RefreshCw,
  Download,
  Search,
  ChevronLeft,
  Building2,
  Warehouse,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  X,
  Calendar,
  User,
  FileText,
  BarChart3,
  AlertTriangle,
  Play,
  Pause
} from 'lucide-react';

interface StocktakeItem {
  productId: string;
  productName: string;
  sku: string;
  systemStock: number;
  countedStock: number;
  variance: number;
  status: 'pending' | 'counted' | 'verified';
}

interface Stocktake {
  id: string;
  stocktakeNumber: string;
  branch: { id: string; name: string; code: string };
  type: 'full' | 'partial' | 'cycle';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  totalItems: number;
  countedItems: number;
  varianceCount: number;
  varianceValue: number;
  assignedTo: string[];
  createdBy: string;
  notes?: string;
}


export default function StocktakeManagement() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stocktakes, setStocktakes] = useState<Stocktake[]>([]);
  const [branches, setBranches] = useState<{id: string, name: string, code: string}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStocktake, setSelectedStocktake] = useState<Stocktake | null>(null);
  const [newStocktake, setNewStocktake] = useState({
    branch: '',
    type: 'full' as 'full' | 'partial' | 'cycle',
    scheduledDate: '',
    assignedTo: '',
    notes: ''
  });

  const fetchStocktakes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/hq/inventory/stocktake?${params.toString()}`);
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        if (payload.stocktakes) setStocktakes(payload.stocktakes);
      }
    } catch (error) {
      console.error('Error fetching stocktakes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchStocktakes();
  }, []);

  if (!mounted) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"><Calendar className="w-3 h-3" />{t('inventory.stBadgeScheduled')}</span>;
      case 'in_progress': return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs"><Play className="w-3 h-3" />{t('inventory.stBadgeInProgress')}</span>;
      case 'completed': return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"><CheckCircle className="w-3 h-3" />{t('inventory.stBadgeCompleted')}</span>;
      case 'cancelled': return <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs"><XCircle className="w-3 h-3" />{t('inventory.stBadgeCancelled')}</span>;
      default: return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'full': return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">{t('inventory.stTypeFull')}</span>;
      case 'partial': return <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">{t('inventory.stTypePartial')}</span>;
      case 'cycle': return <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-xs">{t('inventory.stTypeCycle')}</span>;
      default: return null;
    }
  };

  const filteredStocktakes = stocktakes.filter(s => {
    const matchesSearch = s.stocktakeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.branch.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    scheduled: stocktakes.filter(s => s.status === 'scheduled').length,
    inProgress: stocktakes.filter(s => s.status === 'in_progress').length,
    completed: stocktakes.filter(s => s.status === 'completed').length,
    totalVariance: stocktakes.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.varianceValue, 0)
  };

  return (
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hq/inventory" className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('inventory.stTitle')}</h1>
              <p className="text-gray-500">{t('inventory.stSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              {t('inventory.stExport')}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              {t('inventory.stSchedule')}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.scheduled}</p>
                <p className="text-sm text-blue-600">{t('inventory.stStatScheduled')}</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-700">{stats.inProgress}</p>
                <p className="text-sm text-yellow-600">{t('inventory.stStatInProgress')}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
                <p className="text-sm text-green-600">{t('inventory.stStatCompleted')}</p>
              </div>
            </div>
          </div>
          <div className={`border rounded-xl p-4 ${stats.totalVariance < 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.totalVariance < 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <BarChart3 className={`w-5 h-5 ${stats.totalVariance < 0 ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className={`text-lg font-bold ${stats.totalVariance < 0 ? 'text-red-700' : 'text-gray-700'}`}>{formatCurrency(stats.totalVariance)}</p>
                <p className={`text-sm ${stats.totalVariance < 0 ? 'text-red-600' : 'text-gray-600'}`}>{t('inventory.stStatVariance')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('inventory.stSearchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">{t('inventory.stAllStatus')}</option>
              <option value="scheduled">{t('inventory.stStatusScheduled')}</option>
              <option value="in_progress">{t('inventory.stStatusInProgress')}</option>
              <option value="completed">{t('inventory.stStatusCompleted')}</option>
              <option value="cancelled">{t('inventory.stStatusCancelled')}</option>
            </select>
          </div>
        </div>

        {/* Stocktake Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.stThNumber')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.stThBranch')}</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.stThType')}</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.stThProgress')}</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.stThVariance')}</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.stThStatus')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.stThDate')}</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.stThAction')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStocktakes.map((stocktake) => (
                <tr key={stocktake.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-blue-600">{stocktake.stocktakeNumber}</p>
                    <p className="text-xs text-gray-500">{t('inventory.stBy')} {stocktake.createdBy}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {stocktake.branch.code.startsWith('WH') ? (
                        <Warehouse className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Building2 className="w-4 h-4 text-gray-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{stocktake.branch.name}</p>
                        <p className="text-xs text-gray-500">{stocktake.branch.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">{getTypeBadge(stocktake.type)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${stocktake.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${(stocktake.countedItems / stocktake.totalItems) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">{stocktake.countedItems}/{stocktake.totalItems}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {stocktake.varianceCount > 0 ? (
                      <div>
                        <p className={`font-medium ${stocktake.varianceValue < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(stocktake.varianceValue)}
                        </p>
                        <p className="text-xs text-gray-500">{stocktake.varianceCount} {t('inventory.stItems')}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">{getStatusBadge(stocktake.status)}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{formatDate(stocktake.scheduledDate)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setSelectedStocktake(stocktake); setShowDetailModal(true); }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {stocktake.status === 'scheduled' && (
                        <button className="p-2 hover:bg-green-100 rounded-lg text-green-600" title={t('inventory.stStart')}>
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{t('inventory.stCreateTitle')}</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.stBranchLabel')}</label>
                  <select
                    value={newStocktake.branch}
                    onChange={(e) => setNewStocktake({ ...newStocktake, branch: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">{t('inventory.stBranchPlaceholder')}</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.stTypeLabel')}</label>
                    <select
                      value={newStocktake.type}
                      onChange={(e) => setNewStocktake({ ...newStocktake, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="full">{t('inventory.stTypeFull')}</option>
                      <option value="partial">{t('inventory.stTypePartial')}</option>
                      <option value="cycle">{t('inventory.stTypeCycle')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.stDateLabel')}</label>
                    <input
                      type="date"
                      value={newStocktake.scheduledDate}
                      onChange={(e) => setNewStocktake({ ...newStocktake, scheduledDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.stAssignLabel')}</label>
                  <input
                    type="text"
                    value={newStocktake.assignedTo}
                    onChange={(e) => setNewStocktake({ ...newStocktake, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={t('inventory.stAssignPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.stNotesLabel')}</label>
                  <textarea
                    value={newStocktake.notes}
                    onChange={(e) => setNewStocktake({ ...newStocktake, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder={t('inventory.stNotesPlaceholder')}
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('inventory.stCancel')}
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {t('inventory.stScheduleBtn')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedStocktake && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedStocktake.stocktakeNumber}</h2>
                  <p className="text-sm text-gray-500">{selectedStocktake.branch.name}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  {getStatusBadge(selectedStocktake.status)}
                  {getTypeBadge(selectedStocktake.type)}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">{t('inventory.stDetailProgress')}</p>
                    <p className="text-xl font-bold text-gray-900">{selectedStocktake.countedItems} / {selectedStocktake.totalItems}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${(selectedStocktake.countedItems / selectedStocktake.totalItems) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className={`rounded-lg p-4 ${selectedStocktake.varianceValue < 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500 mb-1">{t('inventory.stDetailVariance')}</p>
                    <p className={`text-xl font-bold ${selectedStocktake.varianceValue < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(selectedStocktake.varianceValue)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{t('inventory.stItemsWithVariance').replace('{count}', String(selectedStocktake.varianceCount))}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">{t('inventory.stScheduledDate')}</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedStocktake.scheduledDate)}</p>
                  </div>
                  {selectedStocktake.startedAt && (
                    <div>
                      <p className="text-gray-500">{t('inventory.stStartedAt')}</p>
                      <p className="font-medium text-gray-900">{formatDateTime(selectedStocktake.startedAt)}</p>
                    </div>
                  )}
                  {selectedStocktake.completedAt && (
                    <div>
                      <p className="text-gray-500">{t('inventory.stCompletedAt')}</p>
                      <p className="font-medium text-gray-900">{formatDateTime(selectedStocktake.completedAt)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">{t('inventory.stCreatedBy')}</p>
                    <p className="font-medium text-gray-900">{selectedStocktake.createdBy}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">{t('inventory.stAssignedTo')}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedStocktake.assignedTo.map((person, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                        {person}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedStocktake.notes && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">{t('inventory.stNotes')}</p>
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{selectedStocktake.notes}</p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('inventory.stClose')}
                </button>
                {selectedStocktake.status === 'completed' && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {t('inventory.stDownloadReport')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
