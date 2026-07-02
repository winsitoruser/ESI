import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FaBox, FaSave, FaTimes, FaBarcode, FaFlask, FaIndustry,
  FaShoppingCart, FaTruck, FaWarehouse, FaInfoCircle, FaPlus, FaTrash
} from 'react-icons/fa';

type ProductType = 'finished' | 'raw_material' | 'manufactured';

interface Supplier {
  id: number;
  code: string;
  name: string;
  company_name: string;
  supplier_type: string;
}

interface Recipe {
  id: number;
  code: string;
  name: string;
  total_cost: number;
  cost_per_unit: number;
}

interface RecipeIngredient {
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  subtotal: number;
}

const NewProductEnhancedPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [showRecipeBuilder, setShowRecipeBuilder] = useState(false);
  
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    sku: '',
    barcode: '',
    category: '',
    description: '',
    unit: 'pcs',
    
    // Product Type
    product_type: 'finished' as ProductType,
    
    // Pricing
    purchase_price: '',
    production_cost: '',
    price: '',
    markup_percentage: '',
    
    // Stock
    stock: '',
    min_stock: '',
    max_stock: '',
    reorder_point: '',
    
    // Supplier & Recipe
    supplier_id: '',
    recipe_id: '',
    
    // Product Capabilities
    can_be_sold: true,
    can_be_purchased: true,
    can_be_produced: false,
    
    // Additional Info
    lead_time_days: '',
    production_time_minutes: '',
    batch_size: '1',
    quality_grade: '',
    shelf_life_days: '',
    storage_temperature: '',
    requires_batch_tracking: false,
    requires_expiry_tracking: false,
    
    is_active: true
  });

  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    loadSuppliers();
    loadRecipes();
    loadRawMaterials();
  }, []);

  useEffect(() => {
    // Auto-set capabilities based on product type
    if (formData.product_type === 'finished') {
      setFormData(prev => ({
        ...prev,
        can_be_sold: true,
        can_be_purchased: true,
        can_be_produced: false
      }));
    } else if (formData.product_type === 'raw_material') {
      setFormData(prev => ({
        ...prev,
        can_be_sold: false,
        can_be_purchased: true,
        can_be_produced: false
      }));
    } else if (formData.product_type === 'manufactured') {
      setFormData(prev => ({
        ...prev,
        can_be_sold: true,
        can_be_purchased: false,
        can_be_produced: true
      }));
    }
  }, [formData.product_type]);

  useEffect(() => {
    // Auto-calculate price based on markup
    if (formData.product_type === 'finished' && formData.purchase_price && formData.markup_percentage) {
      const purchasePrice = parseFloat(formData.purchase_price);
      const markup = parseFloat(formData.markup_percentage);
      const calculatedPrice = purchasePrice * (1 + markup / 100);
      setFormData(prev => ({
        ...prev,
        price: calculatedPrice.toFixed(2)
      }));
    } else if (formData.product_type === 'manufactured' && formData.production_cost && formData.markup_percentage) {
      const productionCost = parseFloat(formData.production_cost);
      const markup = parseFloat(formData.markup_percentage);
      const calculatedPrice = productionCost * (1 + markup / 100);
      setFormData(prev => ({
        ...prev,
        price: calculatedPrice.toFixed(2)
      }));
    }
  }, [formData.purchase_price, formData.production_cost, formData.markup_percentage, formData.product_type]);

  const loadSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers');
      const result = await response.json();
      if (result.success) {
        setSuppliers(result.data);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadRecipes = async () => {
    try {
      const response = await fetch('/api/recipes');
      const result = await response.json();
      if (result.success) {
        setRecipes(result.data);
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  };

  const loadRawMaterials = async () => {
    try {
      const response = await fetch('/api/products?type=raw_material');
      const result = await response.json();
      if (result.success) {
        setRawMaterials(result.data);
      }
    } catch (error) {
      console.error('Error loading raw materials:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleRecipeSelect = (recipeId: string) => {
    const recipe = recipes.find(r => r.id.toString() === recipeId);
    if (recipe) {
      setFormData(prev => ({
        ...prev,
        recipe_id: recipeId,
        production_cost: recipe.total_cost.toString(),
        batch_size: '1'
      }));
    }
  };

  const handleAddIngredient = () => {
    setRecipeIngredients([...recipeIngredients, {
      product_id: '',
      product_name: '',
      quantity: 0,
      unit: 'kg',
      unit_cost: 0,
      subtotal: 0
    }]);
  };

  const handleRemoveIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    const updated = [...recipeIngredients];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate subtotal
    if (field === 'quantity' || field === 'unit_cost') {
      updated[index].subtotal = updated[index].quantity * updated[index].unit_cost;
    }
    
    // Update product name if product_id changes
    if (field === 'product_id') {
      const material = rawMaterials.find(m => m.id.toString() === value);
      if (material) {
        updated[index].product_name = material.name;
        updated[index].unit = material.unit;
        updated[index].unit_cost = material.price || 0;
      }
    }
    
    setRecipeIngredients(updated);
    
    // Calculate total production cost
    const totalCost = updated.reduce((sum, ing) => sum + ing.subtotal, 0);
    setFormData(prev => ({
      ...prev,
      production_cost: totalCost.toFixed(2)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        recipe_ingredients: formData.product_type === 'manufactured' && !formData.recipe_id ? recipeIngredients : undefined
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Produk berhasil ditambahkan!');
        router.push('/inventory');
      } else {
        alert('❌ Gagal menambahkan produk: ' + result.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/inventory');
  };

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const getProductTypeInfo = (type: ProductType) => {
    const info = {
      finished: {
        icon: FaShoppingCart,
        color: 'bg-blue-100 text-blue-700 border-blue-300',
        title: 'Produk Jadi',
        description: 'Produk yang dibeli dari supplier dan siap dijual'
      },
      raw_material: {
        icon: FaBox,
        color: 'bg-green-100 text-green-700 border-green-300',
        title: 'Bahan Baku',
        description: 'Bahan mentah untuk produksi, tidak dijual langsung'
      },
      manufactured: {
        icon: FaIndustry,
        color: 'bg-purple-100 text-purple-700 border-purple-300',
        title: 'Produk Manufaktur',
        description: 'Produk hasil produksi/racikan dari bahan baku'
      }
    };
    return info[type];
  };

  const currentTypeInfo = getProductTypeInfo(formData.product_type);
  const TypeIcon = currentTypeInfo.icon;

  return (
    <DashboardLayout>
      <Head>
        <title>Tambah Produk Baru (Enhanced) | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Tambah Produk Baru</h1>
              <p className="text-indigo-100">
                Sistem manajemen produk terintegrasi dengan production, recipe, supplier & stock
              </p>
            </div>
            <TypeIcon className="w-16 h-16 text-white/30" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Type Selection */}
          <Card className="border-2 border-indigo-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FaInfoCircle className="mr-2 text-indigo-600" />
                Pilih Tipe Produk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['finished', 'raw_material', 'manufactured'] as ProductType[]).map((type) => {
                  const info = getProductTypeInfo(type);
                  const Icon = info.icon;
                  const isSelected = formData.product_type === type;
                  
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, product_type: type })}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? `${info.color} border-current shadow-lg scale-105` 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-12 h-12 mx-auto mb-3 ${isSelected ? '' : 'text-gray-400'}`} />
                      <h3 className={`font-bold text-lg mb-2 ${isSelected ? '' : 'text-gray-700'}`}>
                        {info.title}
                      </h3>
                      <p className={`text-sm ${isSelected ? '' : 'text-gray-500'}`}>
                        {info.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Type-specific info */}
              <div className={`mt-6 p-4 rounded-lg border-2 ${currentTypeInfo.color}`}>
                <div className="flex items-start space-x-3">
                  <FaInfoCircle className="mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-2">Karakteristik {currentTypeInfo.title}:</p>
                    <ul className="text-sm space-y-1">
                      {formData.product_type === 'finished' && (
                        <>
                          <li>✓ Dapat dijual ke customer</li>
                          <li>✓ Dibeli dari supplier</li>
                          <li>✓ Memerlukan informasi supplier & harga beli</li>
                        </>
                      )}
                      {formData.product_type === 'raw_material' && (
                        <>
                          <li>✓ Tidak dijual langsung ke customer</li>
                          <li>✓ Digunakan sebagai bahan produksi</li>
                          <li>✓ Dibeli dari supplier</li>
                        </>
                      )}
                      {formData.product_type === 'manufactured' && (
                        <>
                          <li>✓ Dapat dijual ke customer</li>
                          <li>✓ Diproduksi dari bahan baku</li>
                          <li>✓ Memerlukan recipe/formula produksi</li>
                          <li>✓ Biaya dihitung dari bahan baku + overhead</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Dasar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Produk <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Masukkan nama produk"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Masukkan SKU"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barcode
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Masukkan barcode"
                    />
                    <FaBarcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Pilih Kategori</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Pastry">Pastry</option>
                    <option value="Raw Material">Raw Material</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Other">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pcs">Pcs</option>
                    <option value="kg">Kg</option>
                    <option value="gram">Gram</option>
                    <option value="liter">Liter</option>
                    <option value="ml">ML</option>
                    <option value="box">Box</option>
                    <option value="pack">Pack</option>
                    <option value="loaf">Loaf</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="batch_size"
                    value={formData.batch_size}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="1"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Masukkan deskripsi produk"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Section - For Finished & Raw Material */}
          {(formData.product_type === 'finished' || formData.product_type === 'raw_material') && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FaTruck className="mr-2 text-green-600" />
                  Informasi Supplier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="supplier_id"
                      value={formData.supplier_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Pilih Supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name} ({supplier.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Harga Beli <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="purchase_price"
                      value={formData.purchase_price}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lead Time (hari)
                    </label>
                    <input
                      type="number"
                      name="lead_time_days"
                      value={formData.lead_time_days}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Markup (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="markup_percentage"
                      value={formData.markup_percentage}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recipe/Production Section - For Manufactured */}
          {formData.product_type === 'manufactured' && (
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FaFlask className="mr-2 text-purple-600" />
                    Recipe & Produksi
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRecipeBuilder(!showRecipeBuilder)}
                  >
                    {showRecipeBuilder ? 'Pilih Recipe Existing' : 'Buat Recipe Baru'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showRecipeBuilder ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pilih Recipe
                      </label>
                      <select
                        name="recipe_id"
                        value={formData.recipe_id}
                        onChange={(e) => handleRecipeSelect(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Pilih Recipe</option>
                        {recipes.map(recipe => (
                          <option key={recipe.id} value={recipe.id}>
                            {recipe.name} ({recipe.code}) - Biaya: Rp {recipe.total_cost.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Biaya Produksi
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="production_cost"
                          value={formData.production_cost}
                          onChange={handleInputChange}
                          readOnly={!!formData.recipe_id}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Waktu Produksi (menit)
                        </label>
                        <input
                          type="number"
                          name="production_time_minutes"
                          value={formData.production_time_minutes}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Markup (%) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="markup_percentage"
                          value={formData.markup_percentage}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Bahan Baku</h4>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddIngredient}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <FaPlus className="mr-2" />
                        Tambah Bahan
                      </Button>
                    </div>

                    {recipeIngredients.map((ingredient, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg">
                        <div className="col-span-4">
                          <select
                            value={ingredient.product_id}
                            onChange={(e) => handleIngredientChange(index, 'product_id', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">Pilih Bahan</option>
                            {rawMaterials.map(material => (
                              <option key={material.id} value={material.id}>
                                {material.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            value={ingredient.quantity}
                            onChange={(e) => handleIngredientChange(index, 'quantity', parseFloat(e.target.value))}
                            placeholder="Qty"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={ingredient.unit}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            value={ingredient.unit_cost}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                          />
                        </div>
                        <div className="col-span-1">
                          <input
                            type="number"
                            value={ingredient.subtotal}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 font-semibold"
                          />
                        </div>
                        <div className="col-span-1 flex items-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveIngredient(index)}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {recipeIngredients.length > 0 && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-900">Total Biaya Produksi:</span>
                          <span className="text-2xl font-bold text-indigo-600">
                            Rp {parseFloat(formData.production_cost || '0').toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Harga Jual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga Jual <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.markup_percentage && (
                      <>Markup {formData.markup_percentage}% dari {formData.product_type === 'manufactured' ? 'biaya produksi' : 'harga beli'}</>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FaWarehouse className="mr-2 text-indigo-600" />
                Manajemen Stok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stok Awal
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stok Minimum
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="min_stock"
                    value={formData.min_stock}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stok Maksimum
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="max_stock"
                    value={formData.max_stock}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reorder Point
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="reorder_point"
                    value={formData.reorder_point}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade Kualitas
                  </label>
                  <select
                    name="quality_grade"
                    value={formData.quality_grade}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Pilih Grade</option>
                    <option value="A">A - Premium</option>
                    <option value="B">B - Standard</option>
                    <option value="C">C - Economy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Umur Simpan (hari)
                  </label>
                  <input
                    type="number"
                    name="shelf_life_days"
                    value={formData.shelf_life_days}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suhu Penyimpanan
                  </label>
                  <input
                    type="text"
                    name="storage_temperature"
                    value={formData.storage_temperature}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 2-8°C, Room Temp"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="requires_batch_tracking"
                    checked={formData.requires_batch_tracking}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Memerlukan tracking batch/lot number</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="requires_expiry_tracking"
                    checked={formData.requires_expiry_tracking}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Memerlukan tracking tanggal kadaluarsa</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Produk aktif</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outline"
              className="px-6 py-3"
            >
              <FaTimes className="mr-2" />
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700"
            >
              <FaSave className="mr-2" />
              {loading ? 'Menyimpan...' : 'Simpan Produk'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default NewProductEnhancedPage;
