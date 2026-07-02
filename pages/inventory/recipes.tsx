import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FaFlask, FaPlus, FaEdit, FaTrash, FaSearch, FaBoxOpen,
  FaCalculator, FaBalanceScale, FaClipboardList, FaSave,
  FaTimes, FaCheckCircle, FaExclamationTriangle, FaCopy,
  FaFileInvoice
} from 'react-icons/fa';
// RecipeBuilderModal removed - now using dedicated page at /inventory/recipes/new

interface RawMaterial {
  id: string;
  name: string;
  sku: string;
  unit: string;
  costPerUnit: number;
  stock: number;
  minStock: number;
  category: string;
}

interface RecipeIngredient {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  subtotal: number;
}

interface Recipe {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  batchSize: number;
  batchUnit: string;
  ingredients: RecipeIngredient[];
  totalCost: number;
  costPerUnit: number;
  estimatedYield: number;
  preparationTime: number;
  status: 'active' | 'draft' | 'archived';
  createdBy: string;
  createdAt: string;
  version?: number;
}

const RecipesManagementPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, formatCurrency } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'recipes' | 'materials'>('recipes');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

  // Fetch recipes from API
  useEffect(() => {
    fetchRecipes();
    fetchRawMaterials();
  }, []);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/recipes');
      const data = await response.json();
      if (data.success) {
        const transformedRecipes = data.data.map((r: any) => ({
          id: r.id.toString(),
          name: r.name,
          sku: r.code,
          category: r.category || 'General',
          description: r.description || '',
          batchSize: parseFloat(r.batch_size) || 1,
          batchUnit: r.batch_unit || 'pcs',
          ingredients: (r.ingredients || []).map((ing: any) => ({
            materialId: ing.product_id?.toString() || '',
            materialName: ing.material?.name || '',
            quantity: parseFloat(ing.quantity) || 0,
            unit: ing.unit || '',
            costPerUnit: parseFloat(ing.unit_cost) || 0,
            subtotal: parseFloat(ing.subtotal_cost) || 0
          })),
          totalCost: parseFloat(r.total_cost) || 0,
          costPerUnit: parseFloat(r.cost_per_unit) || 0,
          estimatedYield: parseFloat(r.estimated_yield) || 0,
          preparationTime: r.total_time_minutes || 0,
          status: r.status || 'draft',
          createdBy: r.created_by?.toString() || 'System',
          createdAt: r.created_at || new Date().toISOString()
        }));
        setRecipes(transformedRecipes);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRawMaterials = async () => {
    try {
      const response = await fetch('/api/products?product_type=raw_material&limit=100');
      const data = await response.json();
      if (data.success) {
        const transformed = (data.data || []).map((p: any) => ({
          id: p.id.toString(),
          name: p.name,
          sku: p.sku,
          unit: p.unit || 'pcs',
          costPerUnit: parseFloat(p.cost) || parseFloat(p.price) || 0,
          stock: parseFloat(p.stock) || 0,
          minStock: parseFloat(p.min_stock) || 10,
          category: p.category || 'General'
        }));
        setRawMaterials(transformed);
      }
    } catch (error) {
      console.error('Error fetching raw materials:', error);
    }
  };

  // Mock raw materials data (fallback)
  const mockRawMaterials: RawMaterial[] = [
    { id: 'RM001', name: 'Tepung Terigu Premium', sku: 'RM-TERIGU-001', unit: 'kg', costPerUnit: 12000, stock: 500, minStock: 100, category: 'Tepung' },
    { id: 'RM002', name: 'Gula Pasir Halus', sku: 'RM-GULA-001', unit: 'kg', costPerUnit: 15000, stock: 300, minStock: 50, category: 'Pemanis' },
    { id: 'RM003', name: 'Mentega', sku: 'RM-MENTEGA-001', unit: 'kg', costPerUnit: 45000, stock: 100, minStock: 20, category: 'Lemak' },
    { id: 'RM004', name: 'Telur Ayam', sku: 'RM-TELUR-001', unit: 'kg', costPerUnit: 28000, stock: 80, minStock: 30, category: 'Protein' },
    { id: 'RM005', name: 'Susu Bubuk', sku: 'RM-SUSU-001', unit: 'kg', costPerUnit: 85000, stock: 50, minStock: 10, category: 'Susu' },
    { id: 'RM006', name: 'Coklat Bubuk', sku: 'RM-COKLAT-001', unit: 'kg', costPerUnit: 95000, stock: 40, minStock: 10, category: 'Perasa' },
    { id: 'RM007', name: 'Vanili Extract', sku: 'RM-VANILI-001', unit: 'ml', costPerUnit: 150, stock: 2000, minStock: 500, category: 'Perasa' },
    { id: 'RM008', name: 'Baking Powder', sku: 'RM-BP-001', unit: 'gram', costPerUnit: 50, stock: 5000, minStock: 1000, category: 'Pengembang' },
  ];

  // Use mock data as fallback if API fails
  if (rawMaterials.length === 0) {
    // Will use mockRawMaterials defined above
  }


  const getStatusBadge = (status: string) => {
    const config = {
      active: { color: 'bg-green-100 text-green-700', label: t('inventory.recipes.statusActive') },
      draft: { color: 'bg-yellow-100 text-yellow-700', label: t('inventory.recipes.statusDraft') },
      archived: { color: 'bg-gray-100 text-gray-700', label: t('inventory.recipes.statusArchived') }
    };
    const statusConfig = config[status as keyof typeof config] || config.draft;
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>;
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMaterials = rawMaterials.filter(material =>
    material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveRecipe = async (recipeData: any) => {
    setSaving(true);
    try {
      const payload = {
        code: recipeData.sku,
        name: recipeData.name,
        description: recipeData.description,
        category: recipeData.category,
        batch_size: recipeData.batchSize,
        batch_unit: recipeData.batchUnit,
        total_time_minutes: recipeData.preparationTime,
        status: 'active',
        total_cost: recipeData.totalCost,
        cost_per_unit: recipeData.costPerUnit,
        estimated_yield: recipeData.estimatedYield,
        ingredients: recipeData.ingredients.map((ing: any) => ({
          product_id: parseInt(ing.materialId),
          quantity: ing.quantity,
          unit: ing.unit,
          unit_cost: ing.costPerUnit,
          subtotal: ing.subtotal
        }))
      };

      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        alert('✅ Resep berhasil dibuat!');
        fetchRecipes();
        setShowRecipeModal(false);
        setSelectedRecipe(null);
      } else {
        alert(`❌ Gagal membuat resep: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('❌ Terjadi kesalahan saat menyimpan resep');
    } finally {
      setSaving(false);
    }
  };

  const handleEditRecipe = async (recipeData: any) => {
    if (!selectedRecipe) return;
    
    setSaving(true);
    try {
      const payload = {
        code: recipeData.sku,
        name: recipeData.name,
        description: recipeData.description,
        category: recipeData.category,
        batch_size: recipeData.batchSize,
        batch_unit: recipeData.batchUnit,
        total_time_minutes: recipeData.preparationTime,
        status: 'active',
        total_cost: recipeData.totalCost,
        cost_per_unit: recipeData.costPerUnit,
        estimated_yield: recipeData.estimatedYield,
        ingredients: recipeData.ingredients.map((ing: any) => ({
          product_id: parseInt(ing.materialId),
          quantity: ing.quantity,
          unit: ing.unit,
          unit_cost: ing.costPerUnit,
          subtotal: ing.subtotal
        }))
      };

      const response = await fetch(`/api/recipes/${selectedRecipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        alert('✅ Resep berhasil diupdate!');
        fetchRecipes();
        setShowRecipeModal(false);
        setSelectedRecipe(null);
      } else {
        alert(`❌ Gagal mengupdate resep: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating recipe:', error);
      alert('❌ Terjadi kesalahan saat mengupdate resep');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus resep ini?')) return;

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        alert('✅ Resep berhasil dihapus!');
        fetchRecipes();
      } else {
        alert(`❌ Gagal menghapus resep: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('❌ Terjadi kesalahan saat menghapus resep');
    }
  };

  const handleExportPDF = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/export-pdf`);
      const result = await response.json();
      
      if (result.success) {
        // Open HTML in new window for printing
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(result.data.html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 500);
        }
      } else {
        alert(`❌ Gagal export PDF: ${result.message}`);
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('❌ Terjadi kesalahan saat export PDF');
    }
  };

  const handleViewHistory = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/history`);
      const result = await response.json();
      
      if (result.success) {
        const history = result.data;
        let message = `Riwayat Resep (${history.length} versi):\n\n`;
        history.forEach((h: any) => {
          message += `Version ${h.version} - ${h.change_type}\n`;
          message += `Tanggal: ${new Date(h.created_at).toLocaleString('id-ID')}\n`;
          message += `Oleh: ${h.changedBy?.name || 'System'}\n`;
          if (h.changes_summary) message += `${h.changes_summary}\n`;
          message += '\n';
        });
        alert(message);
      } else {
        alert(`❌ Gagal load history: ${result.message}`);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      alert('❌ Terjadi kesalahan saat load history');
    }
  };

  const stats = {
    totalRecipes: recipes.length,
    activeRecipes: recipes.filter(r => r.status === 'active').length,
    totalMaterials: rawMaterials.length,
    lowStockMaterials: rawMaterials.filter(m => m.stock <= m.minStock).length
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-purple-600 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-600">{t('inventory.recipes.loading')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>{t('inventory.recipes.pageTitle')}</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <FaFlask className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">{t('inventory.recipes.title')}</h1>
                    <p className="text-purple-100 text-sm">{t('inventory.recipes.subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => router.push('/inventory/recipes/history')}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                >
                  <FaClipboardList className="mr-2" />
                  {t('inventory.recipes.history')}
                </Button>
                <Button
                  onClick={() => router.push('/inventory/recipes/archived')}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                >
                  <FaBoxOpen className="mr-2" />
                  {t('inventory.recipes.archive')}
                </Button>
                <Button
                  onClick={() => router.push('/inventory/recipes/new')}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                >
                  <FaPlus className="mr-2" />
                  {t('inventory.recipes.createNew')}
                </Button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <p className="text-xs text-purple-100">{t('inventory.recipes.totalRecipes')}</p>
                <p className="text-2xl font-bold">{stats.totalRecipes}</p>
              </div>
              <div className="bg-green-500/30 backdrop-blur-sm rounded-lg p-3 border border-green-400/30">
                <p className="text-xs text-green-100">{t('inventory.recipes.statusActive')}</p>
                <p className="text-2xl font-bold">{stats.activeRecipes}</p>
              </div>
              <div className="bg-blue-500/30 backdrop-blur-sm rounded-lg p-3 border border-blue-400/30">
                <p className="text-xs text-blue-100">{t('inventory.recipes.rawMaterials')}</p>
                <p className="text-2xl font-bold">{stats.totalMaterials}</p>
              </div>
              <div className="bg-red-500/30 backdrop-blur-sm rounded-lg p-3 border border-red-400/30">
                <p className="text-xs text-red-100">{t('inventory.recipes.lowStockLabel')}</p>
                <p className="text-2xl font-bold">{stats.lowStockMaterials}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'recipes'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaFlask className="inline mr-2" />
            {t('inventory.recipes.recipesFormula')}
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'materials'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaBoxOpen className="inline mr-2" />
            {t('inventory.recipes.rawMaterials')}
          </button>
        </div>

        {/* Search Bar */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={activeTab === 'recipes' ? t('inventory.recipes.searchRecipe') : t('inventory.recipes.searchMaterial')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {activeTab === 'recipes' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRecipes.map((recipe) => (
              <Card key={recipe.id} className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <CardTitle className="text-xl">{recipe.name}</CardTitle>
                        {getStatusBadge(recipe.status)}
                      </div>
                      <p className="text-sm text-gray-600">{recipe.description}</p>
                      <p className="text-xs text-gray-500 mt-1">SKU: {recipe.sku} | Category: {recipe.category}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Recipe Info */}
                  <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">{t('inventory.recipes.batchSize')}</p>
                      <p className="font-semibold text-gray-900">{recipe.batchSize} {recipe.batchUnit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t('inventory.recipes.prepTime')}</p>
                      <p className="font-semibold text-gray-900">{recipe.preparationTime} min</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t('inventory.recipes.totalCost')}</p>
                      <p className="font-semibold text-green-600">{formatCurrency(recipe.totalCost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t('inventory.recipes.costPerUnit')}</p>
                      <p className="font-semibold text-blue-600">{formatCurrency(recipe.costPerUnit)}</p>
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <FaClipboardList className="mr-2 text-purple-600" />
                      {t('inventory.recipes.ingredients')} ({recipe.ingredients.length})
                    </h4>
                    <div className="space-y-2">
                      {recipe.ingredients.map((ingredient, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded text-sm">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{ingredient.materialName}</p>
                            <p className="text-xs text-gray-500">
                              {ingredient.quantity} {ingredient.unit} × {formatCurrency(ingredient.costPerUnit)}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">{formatCurrency(ingredient.subtotal)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                        onClick={() => {
                          setSelectedRecipe(recipe);
                          setShowRecipeModal(true);
                        }}
                      >
                        <FaEdit className="mr-2" />
                        {t('common.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleExportPDF(recipe.id)}
                      >
                        <FaFileInvoice className="mr-2" />
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRecipe(recipe.id);
                        }}
                      >
                        <FaTrash />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => handleViewHistory(recipe.id)}
                    >
                      <FaClipboardList className="mr-2" />
                      {t('inventory.recipes.history')} (v{recipe.version || 1})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('inventory.recipes.materialName')}</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">SKU</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('inventory.recipes.categoryLabel')}</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">{t('inventory.recipes.stockLabel')}</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">{t('inventory.recipes.costPerUnit')}</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">{t('common.status')}</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">{t('inventory.recipes.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterials.map((material) => {
                      const isLowStock = material.stock <= material.minStock;
                      return (
                        <tr key={material.id} className="border-b border-gray-100 hover:bg-purple-50 transition-colors">
                          <td className="p-3">
                            <p className="font-semibold text-gray-900">{material.name}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-sm text-gray-600">{material.sku}</p>
                          </td>
                          <td className="p-3">
                            <Badge className="bg-purple-100 text-purple-700">{material.category}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <p className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                              {material.stock} {material.unit}
                            </p>
                            <p className="text-xs text-gray-500">Min: {material.minStock}</p>
                          </td>
                          <td className="p-3 text-right">
                            <p className="font-semibold text-gray-900">{formatCurrency(material.costPerUnit)}</p>
                            <p className="text-xs text-gray-500">per {material.unit}</p>
                          </td>
                          <td className="p-3 text-center">
                            {isLowStock ? (
                              <Badge className="bg-red-100 text-red-700">
                                <FaExclamationTriangle className="mr-1" />
                                {t('inventory.recipes.lowStockLabel')}
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700">
                                <FaCheckCircle className="mr-1" />
                                {t('inventory.recipes.available')}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center space-x-2">
                              <Button size="sm" variant="outline">
                                <FaEdit />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                                <FaTrash />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RecipesManagementPage;
