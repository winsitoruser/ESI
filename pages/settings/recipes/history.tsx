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
  FaUser, FaFlask, FaEdit, FaArchive, FaUndo, FaPlus, FaTimes
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const { recipe_id } = router.query;
  
  const MOCK_HISTORY: HistoryEntry[] = [
    { id: 1, recipe_id: 1, version: 3, change_type: 'updated', changed_by: 1, changes_summary: 'Ubah bahan tepung dari 5kg ke 4.5kg', created_at: '2026-03-15T10:00:00', recipe: { id: 1, code: 'RCP-001', name: 'Roti Tawar', status: 'active', category: 'Roti' }, changedBy: { id: 1, name: 'Admin', email: 'admin@bedagang.com' } },
    { id: 2, recipe_id: 1, version: 2, change_type: 'updated', changed_by: 1, changes_summary: 'Tambah bahan vanili', created_at: '2026-03-10T14:00:00', recipe: { id: 1, code: 'RCP-001', name: 'Roti Tawar', status: 'active', category: 'Roti' }, changedBy: { id: 1, name: 'Admin', email: 'admin@bedagang.com' } },
    { id: 3, recipe_id: 1, version: 1, change_type: 'created', changed_by: 1, changes_summary: 'Resep baru dibuat', created_at: '2026-01-15T09:00:00', recipe: { id: 1, code: 'RCP-001', name: 'Roti Tawar', status: 'active', category: 'Roti' }, changedBy: { id: 1, name: 'Admin', email: 'admin@bedagang.com' } },
  ];
  const [history, setHistory] = useState<HistoryEntry[]>(MOCK_HISTORY);
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
      setHistory(MOCK_HISTORY);
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
      created: 'Dibuat',
      updated: 'Diperbarui',
      archived: 'Diarsipkan',
      restored: 'Dikembalikan'
    };
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100'}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays < 7) return `${diffDays} hari yang lalu`;

    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Elegant Header with Gradient */}
          <div className="relative mb-8 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5"></div>
            
            <div className="relative px-8 py-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <Button
                    onClick={() => router.push('/settings/recipes')}
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm transition-all"
                  >
                    <FaArrowLeft className="mr-2" />
                    <span>Kembali</span>
                  </Button>
                  
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <FaHistory className="text-3xl text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                        Riwayat Perubahan
                      </h1>
                      <p className="text-purple-100 text-sm flex items-center space-x-2">
                        <span>Timeline lengkap semua perubahan resep</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <Badge className="bg-white/20 text-white border-white/30 text-lg px-6 py-2 backdrop-blur-sm">
                    <FaFlask className="mr-2" />
                    {filteredHistory.length} Entri
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Filters */}
          <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <FaSearch className="text-purple-400 text-lg" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Cari resep atau perubahan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 py-6 text-base border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 rounded-xl"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>

                {/* Type Filter */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                    <FaFilter className="text-purple-400 text-lg" />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full pl-12 pr-4 py-6 text-base border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 bg-white appearance-none cursor-pointer"
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
            <div className="relative space-y-6">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-200 via-purple-300 to-transparent"></div>
              
              {filteredHistory.map((entry, index) => (
                <Card key={entry.id} className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white ml-20 relative">
                  {/* Timeline Connector */}
                  <div className="absolute -left-[4.5rem] top-8 flex items-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      {getChangeTypeIcon(entry.change_type)}
                    </div>
                    <div className="w-8 h-0.5 bg-gradient-to-r from-purple-400 to-transparent"></div>
                  </div>

                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center">
                            <FaFlask className="text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                              {entry.recipe.name}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              {getChangeTypeBadge(entry.change_type)}
                              <Badge className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5">
                                v{entry.version}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-purple-200 text-purple-600">
                                {entry.recipe.category}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 font-mono bg-gray-50 inline-block px-2 py-1 rounded ml-12">
                          SKU: {entry.recipe.code}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/settings/recipes?id=${entry.recipe_id}`)}
                        className="border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all duration-300 rounded-lg px-4 py-2"
                      >
                        <FaFlask className="mr-2 text-purple-600" />
                        <span className="font-semibold">Lihat Resep</span>
                      </Button>
                    </div>

                    {/* Changes Summary */}
                    {entry.changes_summary && (
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-4 mb-4">
                        <div className="flex items-start space-x-2">
                          <FaEdit className="text-purple-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {entry.changes_summary}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center space-x-6 pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <FaCalendar className="text-purple-600 text-xs" />
                        </div>
                        <span className="font-medium">{formatDate(entry.created_at)}</span>
                      </div>
                      {entry.changedBy && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <FaUser className="text-indigo-600 text-xs" />
                          </div>
                          <span className="font-medium">{entry.changedBy.name}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Modern Pagination */}
              {totalPages > 1 && (
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mt-8">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center space-x-4">
                      <Button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        variant="outline"
                        className="border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold transition-all"
                      >
                        <FaArrowLeft className="mr-2" />
                        Sebelumnya
                      </Button>
                      <div className="px-6 py-3 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl border-2 border-purple-200">
                        <span className="text-sm font-bold text-purple-700">
                          Halaman {page} dari {totalPages}
                        </span>
                      </div>
                      <Button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        variant="outline"
                        className="border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold transition-all"
                      >
                        Selanjutnya
                        <FaArrowLeft className="ml-2 rotate-180" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
