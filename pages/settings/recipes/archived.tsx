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
  FaArchive, FaUndo, FaTrash, FaHistory, FaSearch,
  FaArrowLeft, FaCalendar, FaUser, FaFlask, FaTimes
} from 'react-icons/fa';

interface Recipe {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  status: string;
  version: number;
  total_cost: number;
  cost_per_unit: number;
  batch_size: number;
  batch_unit: string;
  updated_at: string;
  created_at: string;
}

const ArchivedRecipesPage: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const MOCK_ARCHIVED: Recipe[] = [
    { id: 'ar1', code: 'RCP-OLD-001', name: 'Roti Lama', description: 'Resep roti lama', category: 'Roti', status: 'archived', version: 2, total_cost: 50000, cost_per_unit: 5000, batch_size: 10, batch_unit: 'pcs', updated_at: '2026-02-01', created_at: '2025-06-15' },
  ];
  const [recipes, setRecipes] = useState<Recipe[]>(MOCK_ARCHIVED);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    fetchArchivedRecipes();
  }, []);

  const fetchArchivedRecipes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/recipes?status=archived');
      const data = await response.json();
      if (data.success) {
        setRecipes(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching archived recipes:', error);
      setRecipes(MOCK_ARCHIVED);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (recipeId: string) => {
    if (!confirm('Apakah Anda yakin ingin mengembalikan resep ini?')) {
      return;
    }

    setRestoring(recipeId);
    try {
      const response = await fetch(`/api/recipes/${recipeId}/restore`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Restored by user'
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: '✅ Berhasil!',
          description: 'Resep berhasil dikembalikan ke daftar aktif',
          className: 'bg-green-50 border-green-200'
        });
        fetchArchivedRecipes();
      } else {
        toast({
          title: '❌ Gagal Mengembalikan',
          description: data.message || 'Terjadi kesalahan saat mengembalikan resep',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error restoring recipe:', error);
      toast({
        title: '❌ Terjadi Kesalahan',
        description: 'Gagal mengembalikan resep. Silakan coba lagi.',
        variant: 'destructive'
      });
    } finally {
      setRestoring(null);
    }
  };

  const handleViewHistory = (recipeId: string) => {
    router.push(`/settings/recipes/history?recipe_id=${recipeId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-gray-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat resep yang diarsipkan...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Elegant Header with Gradient */}
          <div className="relative mb-8 bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden">
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
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <FaArchive className="text-3xl text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                        Resep Diarsipkan
                      </h1>
                      <p className="text-gray-300 text-sm flex items-center space-x-2">
                        <span>Kelola dan kembalikan resep yang tidak aktif</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <Badge className="bg-white/20 text-white border-white/30 text-lg px-6 py-2 backdrop-blur-sm">
                    <FaFlask className="mr-2" />
                    {filteredRecipes.length} Resep
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Search Bar */}
          <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <FaSearch className="text-gray-400 text-lg" />
                </div>
                <Input
                  type="text"
                  placeholder="Cari berdasarkan nama, SKU, atau kategori resep..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-6 text-base border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200 rounded-xl"
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
            </CardContent>
          </Card>

          {/* Recipes Grid */}
          {filteredRecipes.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <FaArchive className="text-6xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Tidak Ada Resep yang Diarsipkan
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchQuery
                      ? 'Tidak ada resep yang cocok dengan pencarian Anda'
                      : 'Semua resep masih aktif'}
                  </p>
                  <Button onClick={() => router.push('/settings/recipes')}>
                    Lihat Resep Aktif
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredRecipes.map((recipe) => (
                <Card key={recipe.id} className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white overflow-hidden">
                  {/* Elegant Header with Gradient Accent */}
                  <div className="relative bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-gray-400 to-gray-600"></div>
                    <CardHeader className="pl-6 pr-6 pt-6 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center shadow-md">
                              <FaFlask className="text-white text-lg" />
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                                {recipe.name}
                              </CardTitle>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5">
                                  v{recipe.version}
                                </Badge>
                                <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                                  {recipe.category}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed mb-2">
                            {recipe.description}
                          </p>
                          <p className="text-xs text-gray-500 font-mono bg-gray-100 inline-block px-2 py-1 rounded">
                            SKU: {recipe.code}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                  </div>

                  <CardContent className="p-6">
                    {/* Modern Info Grid with Icons */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <FaFlask className="text-white text-sm" />
                          </div>
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Ukuran Batch</p>
                        </div>
                        <p className="text-lg font-bold text-blue-900">
                          {recipe.batch_size} {recipe.batch_unit}
                        </p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">Rp</span>
                          </div>
                          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Biaya/Unit</p>
                        </div>
                        <p className="text-lg font-bold text-emerald-900">
                          {formatCurrency(recipe.cost_per_unit)}
                        </p>
                      </div>
                    </div>

                    {/* Archive Date Info */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                      <div className="flex items-center space-x-2 text-gray-600 mb-1">
                        <FaCalendar className="text-gray-400" />
                        <p className="text-xs font-semibold uppercase tracking-wide">Diarsipkan</p>
                      </div>
                      <p className="text-sm text-gray-800 font-medium">
                        {formatDate(recipe.updated_at)}
                      </p>
                    </div>

                    {/* Modern Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleRestore(recipe.id)}
                        disabled={restoring === recipe.id}
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 py-6 rounded-xl font-semibold"
                      >
                        {restoring === recipe.id ? (
                          <>
                            <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                            Mengembalikan...
                          </>
                        ) : (
                          <>
                            <FaUndo className="mr-2" />
                            Kembalikan
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleViewHistory(recipe.id)}
                        variant="outline"
                        className="border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 py-6 rounded-xl font-semibold transition-all duration-300"
                      >
                        <FaHistory className="mr-2" />
                        Riwayat
                      </Button>
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

export default ArchivedRecipesPage;
