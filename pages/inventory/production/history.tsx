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
  FaHistory, FaArrowLeft, FaSearch, FaFilter, FaCalendar,
  FaUser, FaIndustry, FaPlay, FaCheck, FaTimes, FaEdit
} from 'react-icons/fa';

interface HistoryEntry {
  id: number;
  production_id: number;
  action_type: 'created' | 'started' | 'updated' | 'completed' | 'cancelled' | 'quality_checked';
  previous_status?: string;
  new_status?: string;
  changes_summary?: string;
  created_at: string;
  production?: {
    id: number;
    batch_number: string;
    status: string;
    planned_quantity: number;
    produced_quantity: number;
    unit: string;
    recipe?: {
      id: number;
      code: string;
      name: string;
    };
  };
  changedBy?: {
    id: number;
    name: string;
    email: string;
  };
}

const ProductionHistoryPage: React.FC = () => {
  const router = useRouter();
  const { t, formatDate } = useTranslation();
  const { toast } = useToast();
  
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchHistory();
  }, [filterType, page]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('action_type', filterType);
      params.append('limit', '20');
      params.append('offset', String((page - 1) * 20));

      const response = await fetch(`/api/productions/history?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setHistory(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: t('inventory.production.historyLoadFailed'),
        description: t('inventory.production.historyLoadError'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'created': return <FaEdit className="text-blue-500" />;
      case 'started': return <FaPlay className="text-yellow-500" />;
      case 'completed': return <FaCheck className="text-green-500" />;
      case 'cancelled': return <FaTimes className="text-red-500" />;
      default: return <FaHistory className="text-gray-400" />;
    }
  };

  const getActionBadge = (type: string) => {
    const colors = {
      created: 'bg-blue-100 text-blue-700',
      started: 'bg-yellow-100 text-yellow-700',
      updated: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      quality_checked: 'bg-indigo-100 text-indigo-700'
    };
    const labels = {
      created: t('inventory.production.historyCreated'),
      started: t('inventory.production.historyStarted'),
      updated: t('inventory.production.historyUpdated'),
      completed: t('inventory.production.historyCompleted'),
      cancelled: t('inventory.production.historyCancelled'),
      quality_checked: t('inventory.production.historyQCCheck')
    };
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100'}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('inventory.production.justNow');
    if (diffMins < 60) return `${diffMins} ${t('inventory.production.minutesAgo')}`;
    if (diffHours < 24) return `${diffHours} ${t('inventory.production.hoursAgo')}`;
    if (diffDays < 7) return `${diffDays} ${t('inventory.production.daysAgo')}`;

    return formatDate(date, 'datetime');
  };

  const filteredHistory = history.filter(entry =>
    entry.production?.batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.production?.recipe?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.changes_summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">{t('inventory.production.loadingHistory')}</p>
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
                    <FaHistory className="text-indigo-600" />
                    <span>{t('inventory.production.productionHistory')}</span>
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {t('inventory.production.historySubtitle')}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {filteredHistory.length} {t('inventory.production.entries')}
              </Badge>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('inventory.production.searchHistory')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">{t('inventory.production.allActivities')}</option>
                    <option value="created">{t('inventory.production.historyCreated')}</option>
                    <option value="started">{t('inventory.production.historyStarted')}</option>
                    <option value="updated">{t('inventory.production.historyUpdated')}</option>
                    <option value="completed">{t('inventory.production.historyCompleted')}</option>
                    <option value="cancelled">{t('inventory.production.historyCancelled')}</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          {filteredHistory.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <FaHistory className="text-6xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {t('inventory.production.noHistory')}
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery
                      ? t('inventory.production.noHistorySearch')
                      : t('inventory.production.noHistoryYet')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((entry, index) => (
                <Card key={entry.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Timeline Dot */}
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          {getActionIcon(entry.action_type)}
                        </div>
                        {index < filteredHistory.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {entry.production?.batch_number}
                              </h3>
                              {getActionBadge(entry.action_type)}
                            </div>
                            <p className="text-sm text-gray-600">
                              {entry.production?.recipe?.name}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/inventory/production/${entry.production_id}`)}
                          >
                            <FaIndustry className="mr-2" />
                            {t('inventory.production.viewProduction')}
                          </Button>
                        </div>

                        {/* Changes Summary */}
                        {entry.changes_summary && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-sm text-gray-700">
                              {entry.changes_summary}
                            </p>
                          </div>
                        )}

                        {/* Status Change */}
                        {entry.previous_status && entry.new_status && (
                          <div className="flex items-center space-x-2 mb-3 text-sm">
                            <Badge className="bg-gray-100 text-gray-700">
                              {entry.previous_status}
                            </Badge>
                            <span className="text-gray-400">→</span>
                            <Badge className="bg-indigo-100 text-indigo-700">
                              {entry.new_status}
                            </Badge>
                          </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <FaCalendar className="mr-1" />
                            {formatRelativeDate(entry.created_at)}
                          </div>
                          {entry.changedBy && (
                            <div className="flex items-center">
                              <FaUser className="mr-1" />
                              {entry.changedBy.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-6">
                  <Button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="outline"
                  >
                    {t('common.previous')}
                  </Button>
                  <span className="text-sm text-gray-600">
                    {t('common.page')} {page} {t('common.of')} {totalPages}
                  </span>
                  <Button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    variant="outline"
                  >
                    {t('common.next')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </DashboardLayout>
  );
};

export default ProductionHistoryPage;
