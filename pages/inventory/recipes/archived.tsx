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
  FaArrowLeft, FaCalendar, FaUser, FaFlask
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
  const { t, formatCurrency, formatDate } = useTranslation();
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
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
      toast({
        title: '❌ Gagal Memuat Data',
        description: 'Terjadi kesalahan saat memuat resep yang diarsipkan',
        variant: 'destructive'
      });
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
    router.push(`/inventory/recipes/history?recipe_id=${recipeId}`);
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
                    <FaArchive className="text-gray-600" />
                    <span>Resep yang Diarsipkan</span>
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Kelola dan kembalikan resep yang tidak aktif
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {filteredRecipes.length} Resep
              </Badge>
            </div>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Cari resep yang diarsipkan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
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
                  <Button onClick={() => router.push('/inventory/recipes')}>
                    Lihat Resep Aktif
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredRecipes.map((recipe) => (
                <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gray-100 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <CardTitle className="text-xl">{recipe.name}</CardTitle>
                          <Badge variant="outline" className="bg-gray-200">
                            v{recipe.version}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{recipe.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          SKU: {recipe.code} | {recipe.category}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500">Ukuran Batch</p>
                        <p className="font-semibold text-gray-900">
                          {recipe.batch_size} {recipe.batch_unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Biaya per Unit</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(recipe.cost_per_unit)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 flex items-center">
                          <FaCalendar className="mr-1" />
                          Diarsipkan
                        </p>
                        <p className="text-sm text-gray-700">
                          {formatDate(recipe.updated_at)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleRestore(recipe.id)}
                        disabled={restoring === recipe.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
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
