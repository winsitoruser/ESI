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
  FaArrowLeft, FaFlask, FaSave, FaPlus, FaTrash, FaEye,
  FaCalculator, FaBoxOpen, FaCheckCircle, FaTimes
} from 'react-icons/fa';

interface RawMaterial {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  stock: number;
}

interface RecipeIngredient {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  subtotal: number;
}

const NewRecipePage: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Form state
  const [recipeName, setRecipeName] = useState('');
  const [recipeSku, setRecipeSku] = useState('');
  const [category, setCategory] = useState('Bakery');
  const [description, setDescription] = useState('');
  const [batchSize, setBatchSize] = useState(1);
  const [batchUnit, setBatchUnit] = useState('pcs');
  const [preparationTime, setPreparationTime] = useState(0);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  
  // UI state
  const MOCK_NEW_MATERIALS: RawMaterial[] = [
    { id: 'rm1', name: 'Tepung Terigu', sku: 'RM-001', unit: 'kg', price: 12000, stock: 500 },
    { id: 'rm2', name: 'Gula Pasir', sku: 'RM-002', unit: 'kg', price: 15000, stock: 300 },
    { id: 'rm3', name: 'Mentega', sku: 'RM-003', unit: 'kg', price: 45000, stock: 100 },
    { id: 'rm4', name: 'Telur Ayam', sku: 'RM-004', unit: 'kg', price: 28000, stock: 80 },
    { id: 'rm5', name: 'Coklat Bubuk', sku: 'RM-005', unit: 'kg', price: 95000, stock: 40 },
  ];
  const [materials, setMaterials] = useState<RawMaterial[]>(MOCK_NEW_MATERIALS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Ingredient form
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      console.log('Fetching materials...');
      const response = await fetch('/api/products?product_type=raw_material');
      const data = await response.json();
      console.log('Materials response:', data);
      
      if (data.success) {
        const materialsData = data.data || [];
        console.log('Materials loaded:', materialsData.length, 'items');
        setMaterials(materialsData);
      } else {
        console.error('Failed to fetch materials:', data.message);
        toast({
          title: '❌ Gagal Memuat Data',
          description: 'Tidak dapat memuat data bahan baku',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMaterials(MOCK_NEW_MATERIALS);
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    console.log('addIngredient called', { selectedMaterialId, quantity, materialsCount: materials.length });
    
    if (!selectedMaterialId || quantity <= 0) {
      toast({
        title: '⚠️ Data Tidak Lengkap',
        description: 'Pilih bahan dan masukkan jumlah yang valid',
        variant: 'destructive'
      });
      return;
    }

    // Convert both to string for comparison since IDs might be numbers or strings
    const material = materials.find(m => String(m.id) === String(selectedMaterialId));
    console.log('Found material:', material);
    
    if (!material) {
      toast({
        title: '❌ Bahan Tidak Ditemukan',
        description: 'Silakan pilih bahan lagi dari daftar',
        variant: 'destructive'
      });
      return;
    }

    const newIngredient: RecipeIngredient = {
      materialId: String(material.id),
      materialName: material.name,
      quantity,
      unit: material.unit,
      costPerUnit: material.price,
      subtotal: quantity * material.price
    };

    console.log('Adding ingredient:', newIngredient);
    setIngredients([...ingredients, newIngredient]);
    setSelectedMaterialId('');
    setQuantity(0);
    toast({
      title: '✅ Berhasil!',
      description: `${material.name} berhasil ditambahkan ke resep`,
      className: 'bg-green-50 border-green-200'
    });
  };

  const removeIngredient = (index: number) => {
    const removedIngredient = ingredients[index];
    setIngredients(ingredients.filter((_, i) => i !== index));
    toast({
      title: '🗑️ Bahan Dihapus',
      description: `${removedIngredient.materialName} telah dihapus dari resep`,
      className: 'bg-orange-50 border-orange-200'
    });
  };

  const getTotalCost = () => {
    return ingredients.reduce((sum, ing) => sum + ing.subtotal, 0);
  };

  const getCostPerUnit = () => {
    if (batchSize <= 0) return 0;
    return getTotalCost() / batchSize;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleSave = async () => {
    if (!recipeName || !recipeSku || ingredients.length === 0) {
      toast({
        title: '❌ Data Tidak Lengkap',
        description: 'Nama resep, SKU, dan minimal 1 bahan harus diisi!',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const recipeData = {
        name: recipeName,
        code: recipeSku,
        category,
        description,
        batch_size: batchSize,
        batch_unit: batchUnit,
        preparation_time: preparationTime,
        total_cost: getTotalCost(),
        cost_per_unit: getCostPerUnit(),
        status: 'active',
        ingredients: ingredients.map(ing => ({
          product_id: ing.materialId,
          quantity: ing.quantity,
          unit: ing.unit,
          unit_cost: ing.costPerUnit,
          subtotal_cost: ing.subtotal
        }))
      };

      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData)
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Recipe saved successfully:', data);
        toast({
          title: '✅ Resep Berhasil Disimpan!',
          description: `${recipeName} telah ditambahkan ke daftar resep`,
          className: 'bg-green-50 border-green-200'
        });
        setTimeout(() => {
          router.push('/settings/recipes');
        }, 1500);
      } else {
        console.error('Failed to save recipe:', data.message);
        toast({
          title: '❌ Gagal Menyimpan',
          description: data.message || 'Terjadi kesalahan saat menyimpan resep',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast({
        title: '❌ Terjadi Kesalahan',
        description: 'Gagal menyimpan resep. Silakan coba lagi.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const categories = ['Bakery', 'Beverage', 'Main Course', 'Dessert', 'Snack', 'Other'];
  const units = ['pcs', 'kg', 'gram', 'liter', 'ml', 'box', 'pack'];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat...</p>
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
                  onClick={() => router.push('/settings/recipes')}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <FaArrowLeft />
                  <span>Kembali</span>
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                    <FaFlask className="text-blue-600" />
                    <span>Buat Resep Baru</span>
                  </h1>
                  <p className="text-gray-600 mt-1">Buat formula dan komposisi produk baru</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => setShowPreview(!showPreview)}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <FaEye />
                  <span>{showPreview ? 'Sembunyikan' : 'Preview'}</span>
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !recipeName || !recipeSku || ingredients.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2 px-6"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <FaSave />
                      <span>Simpan Resep</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Recipe Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Informasi Dasar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama Resep <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={recipeName}
                        onChange={(e) => setRecipeName(e.target.value)}
                        placeholder="Contoh: Roti Tawar Premium"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kode/SKU <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={recipeSku}
                        onChange={(e) => setRecipeSku(e.target.value)}
                        placeholder="Contoh: RCP-001"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kategori
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Waktu Persiapan (menit)
                      </label>
                      <Input
                        type="number"
                        value={preparationTime}
                        onChange={(e) => setPreparationTime(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deskripsi
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Deskripsi resep..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ukuran Batch
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={batchSize}
                        onChange={(e) => setBatchSize(parseFloat(e.target.value) || 1)}
                        placeholder="1"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Satuan
                      </label>
                      <select
                        value={batchUnit}
                        onChange={(e) => setBatchUnit(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {units.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add Ingredients */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Tambah Bahan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pilih Bahan
                      </label>
                      <select
                        value={selectedMaterialId}
                        onChange={(e) => setSelectedMaterialId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Pilih Bahan --</option>
                        {materials.map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} ({material.unit}) - {formatCurrency(material.price)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jumlah
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full"
                      />
                    </div>
                    <div className="col-span-2 flex items-end">
                      <Button
                        onClick={addIngredient}
                        disabled={!selectedMaterialId || quantity <= 0}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <FaPlus className="mr-2" />
                        Tambah
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ingredients List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                    <span>Daftar Bahan ({ingredients.length})</span>
                    <Badge variant="outline" className="text-sm">
                      Total: {formatCurrency(getTotalCost())}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ingredients.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <FaBoxOpen className="text-5xl mx-auto mb-3 opacity-30" />
                      <p>Belum ada bahan ditambahkan</p>
                      <p className="text-sm mt-1">Tambahkan bahan untuk melanjutkan</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ingredients.map((ingredient, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{ingredient.materialName}</p>
                            <p className="text-sm text-gray-600">
                              {ingredient.quantity} {ingredient.unit} × {formatCurrency(ingredient.costPerUnit)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="font-semibold text-blue-600">
                              {formatCurrency(ingredient.subtotal)}
                            </span>
                            <Button
                              onClick={() => removeIngredient(index)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50"
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary & Preview */}
            <div className="space-y-6">
              {/* Cost Summary */}
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                    <FaCalculator className="mr-2 text-blue-600" />
                    Ringkasan Biaya
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-600">Total Bahan</span>
                      <span className="font-semibold">{formatCurrency(getTotalCost())}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-600">Ukuran Batch</span>
                      <span className="font-semibold">{batchSize} {batchUnit}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-gray-900 font-medium">Biaya per Unit</span>
                      <span className="text-xl font-bold text-blue-600">
                        {formatCurrency(getCostPerUnit())}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-900 font-medium mb-2">Status Validasi</p>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {recipeName ? (
                            <FaCheckCircle className="text-green-500" />
                          ) : (
                            <FaTimes className="text-red-500" />
                          )}
                          <span className="text-sm text-gray-700">Nama Resep</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {recipeSku ? (
                            <FaCheckCircle className="text-green-500" />
                          ) : (
                            <FaTimes className="text-red-500" />
                          )}
                          <span className="text-sm text-gray-700">Kode/SKU</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {ingredients.length > 0 ? (
                            <FaCheckCircle className="text-green-500" />
                          ) : (
                            <FaTimes className="text-red-500" />
                          )}
                          <span className="text-sm text-gray-700">Minimal 1 Bahan</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              {showPreview && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                      <FaEye className="mr-2 text-blue-600" />
                      Preview Resep
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Nama</p>
                      <p className="font-medium text-gray-900">{recipeName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Kode</p>
                      <p className="font-medium text-gray-900">{recipeSku || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Kategori</p>
                      <Badge variant="outline">{category}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Waktu Persiapan</p>
                      <p className="font-medium text-gray-900">{preparationTime} menit</p>
                    </div>
                    {description && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Deskripsi</p>
                        <p className="text-sm text-gray-700">{description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </DashboardLayout>
  );
};

export default NewRecipePage;
