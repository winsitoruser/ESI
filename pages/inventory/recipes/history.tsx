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
  FaUser, FaFlask, FaEdit, FaArchive, FaUndo, FaPlus
} from 'react-icons/fa';

interface HistoryEntry {
  id: number;
  recipe_id: number;
  version: number;
  change_type: 'created' | 'updated' | 'archived' | 'restored';
  changed_by: number;
  changes_summary: string;
  created_at: string;
  recipe: {
    id: number;
    code: string;
    name: string;
    status: string;
    category: string;
  };
  changedBy?: {
    id: number;
    name: string;
    email: string;
  };
}

const RecipeHistoryPage: React.FC = () => {
  const router = useRouter();
  const { t, formatDate } = useTranslation();
  const { toast } = useToast();
  const { recipe_id } = router.query;
  
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchHistory();
  }, [recipe_id, filterType, page]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (recipe_id) params.append('recipe_id', recipe_id as string);
      if (filterType !== 'all') params.append('change_type', filterType);
      params.append('limit', '20');
      params.append('offset', String((page - 1) * 20));

      const response = await fetch(`/api/recipes/history?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setHistory(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: '❌ Gagal Memuat Riwayat',
        description: 'Terjadi kesalahan saat memuat riwayat resep',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'created': return <FaPlus className="text-blue-500" />;
      case 'updated': return <FaEdit className="text-purple-500" />;
      case 'archived': return <FaArchive className="text-gray-500" />;
      case 'restored': return <FaUndo className="text-green-500" />;
      default: return <FaHistory className="text-gray-400" />;
    }
  };

  const getChangeTypeBadge = (type: string) => {
    const colors = {
      created: 'bg-blue-100 text-blue-700',
      updated: 'bg-purple-100 text-purple-700',
      archived: 'bg-gray-100 text-gray-700',
      restored: 'bg-green-100 text-green-700'
    };
    const labels = {
      created: t('inventory.recipes.historyCreated'),
      updated: t('inventory.recipes.historyUpdated'),
      archived: t('inventory.recipes.historyArchived'),
      restored: t('inventory.recipes.historyRestored')
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
    entry.recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.recipe.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.changes_summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat riwayat...</p>
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
                  onClick={() => router.push('/inventory/recipes')}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <FaArrowLeft />
                  <span>Kembali</span>
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                    <FaHistory className="text-purple-600" />
                    <span>Riwayat Perubahan Resep</span>
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Timeline lengkap semua perubahan resep
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {filteredHistory.length} Entri
              </Badge>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search */}
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Cari resep atau perubahan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Type Filter */}
                <div className="relative">
                  <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">Semua Jenis Perubahan</option>
                    <option value="created">Dibuat</option>
                    <option value="updated">Diperbarui</option>
                    <option value="archived">Diarsipkan</option>
                    <option value="restored">Dikembalikan</option>
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
                    Tidak Ada Riwayat
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery
                      ? 'Tidak ada riwayat yang cocok dengan pencarian Anda'
                      : 'Belum ada perubahan pada resep'}
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
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          {getChangeTypeIcon(entry.change_type)}
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
                                {entry.recipe.name}
                              </h3>
                              {getChangeTypeBadge(entry.change_type)}
                              <Badge variant="outline" className="text-xs">
                                v{entry.version}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {entry.recipe.code} • {entry.recipe.category}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/inventory/recipes?id=${entry.recipe_id}`)}
                          >
                            <FaFlask className="mr-2" />
                            Lihat Resep
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
                    Sebelumnya
                  </Button>
                  <span className="text-sm text-gray-600">
                    Halaman {page} dari {totalPages}
                  </span>
                  <Button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    variant="outline"
                  >
                    Selanjutnya
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

export default RecipeHistoryPage;
