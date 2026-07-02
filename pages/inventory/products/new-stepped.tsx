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
  FaShoppingCart, FaTruck, FaWarehouse, FaInfoCircle, FaPlus, FaTrash,
  FaCheck, FaArrowRight, FaArrowLeft, FaRandom, FaDollarSign, FaChartLine
} from 'react-icons/fa';
import { generateSKU, validateSKU, generateSKUSuggestions, checkSKUAvailability } from '@/utils/skuGenerator';
import { calculateProfit, calculateSellingPriceFromMarkup, formatCurrency, getProfitStatus } from '@/utils/profitCalculator';

type ProductType = 'finished' | 'raw_material' | 'manufactured';

interface Supplier {
  id: number;
  code: string;
  name: string;
}

interface Recipe {
  id: number;
  code: string;
  name: string;
  total_cost: number;
}

interface RecipeIngredient {
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  subtotal: number;
}

const SteppedProductForm: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [skuMode, setSkuMode] = useState<'auto' | 'manual'>('auto');
  const [skuSuggestions, setSkuSuggestions] = useState<string[]>([]);
  const [skuAvailable, setSkuAvailable] = useState<boolean | null>(null);
  
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    sku: '',
    barcode: '',
    category: '',
    description: '',
    unit: 'pcs',
    product_type: 'finished' as ProductType,
    
    // Step 2: Pricing & Profit
    purchase_price: '',
    production_cost: '',
    markup_percentage: '30',
    price: '',
    profit_amount: '',
    profit_margin: '',
    
    // Step 3: Supplier/Recipe
    supplier_id: '',
    recipe_id: '',
    lead_time_days: '',
    production_time_minutes: '',
    batch_size: '1',
    
    // Step 4: Stock Management
    stock: '',
    min_stock: '',
    max_stock: '',
    reorder_point: '',
    quality_grade: '',
    shelf_life_days: '',
    storage_temperature: '',
    requires_batch_tracking: false,
    requires_expiry_tracking: false,
    
    // Capabilities
    can_be_sold: true,
    can_be_purchased: true,
    can_be_produced: false,
    is_active: true
  });

  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  const steps = [
    { number: 1, title: 'Informasi Dasar', icon: FaInfoCircle },
    { number: 2, title: 'Harga & Profit', icon: FaDollarSign },
    { number: 3, title: 'Supplier/Produksi', icon: FaTruck },
    { number: 4, title: 'Stok & Kualitas', icon: FaWarehouse }
  ];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    loadSuppliers();
    loadRecipes();
    loadRawMaterials();
  }, []);

  // Auto-generate SKU when product name or type changes
  useEffect(() => {
    if (skuMode === 'auto' && formData.name && formData.product_type) {
      const autoSKU = generateSKU({
        productType: formData.product_type,
        category: formData.category || 'GENERAL'
      });
      setFormData(prev => ({ ...prev, sku: autoSKU }));
    }
  }, [formData.name, formData.product_type, formData.category, skuMode]);

  // Generate SKU suggestions when name changes
  useEffect(() => {
    if (formData.name.length >= 3) {
      const suggestions = generateSKUSuggestions(formData.name);
      setSkuSuggestions(suggestions);
    }
  }, [formData.name]);

  // Check SKU availability
  useEffect(() => {
    const checkSKU = async () => {
      if (formData.sku && validateSKU(formData.sku)) {
        const available = await checkSKUAvailability(formData.sku);
        setSkuAvailable(available);
      }
    };
    
    const debounce = setTimeout(checkSKU, 500);
    return () => clearTimeout(debounce);
  }, [formData.sku]);

  // Auto-calculate pricing and profit
  useEffect(() => {
    const cost = formData.product_type === 'manufactured' 
      ? parseFloat(formData.production_cost) || 0
      : parseFloat(formData.purchase_price) || 0;
    
    const markup = parseFloat(formData.markup_percentage) || 0;
    
    if (cost > 0 && markup > 0) {
      const sellingPrice = calculateSellingPriceFromMarkup(cost, markup);
      const profitCalc = calculateProfit(cost, sellingPrice);
      
      setFormData(prev => ({
        ...prev,
        price: sellingPrice.toFixed(2),
        profit_amount: profitCalc.profitAmount.toFixed(2),
        profit_margin: profitCalc.profitMargin.toFixed(2)
      }));
    }
  }, [formData.purchase_price, formData.production_cost, formData.markup_percentage, formData.product_type]);

  // Auto-set capabilities based on product type
  useEffect(() => {
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

  const handleGenerateSKU = () => {
    const newSKU = generateSKU({
      productType: formData.product_type,
      category: formData.category || 'GENERAL'
    });
    setFormData(prev => ({ ...prev, sku: newSKU }));
  };

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
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

  const profitStatus = formData.profit_margin ? getProfitStatus(parseFloat(formData.profit_margin)) : null;

  return (
    <DashboardLayout>
      <Head>
        <title>Tambah Produk Baru | BEDAGANG Cloud POS</title>
      </Head>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Tambah Produk Baru</h1>
              <p className="text-indigo-100">
                Form wizard untuk menambahkan produk dengan mudah dan terstruktur
              </p>
            </div>
            <FaBox className="w-16 h-16 text-white/30" />
          </div>
        </div>

        {/* Progress Steps */}
        <Card className="border-2 border-indigo-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                
                return (
                  <React.Fragment key={step.number}>
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                        isActive 
                          ? 'bg-indigo-600 text-white scale-110 shadow-lg' 
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {isCompleted ? <FaCheck /> : <Icon />}
                      </div>
                      <span className={`text-sm font-medium text-center ${
                        isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-4 rounded transition-all ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle className="flex items-center text-indigo-900">
                  <FaInfoCircle className="mr-3" />
                  Step 1: Informasi Dasar Produk
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {/* Product Type Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Tipe Produk <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: 'finished', label: 'Produk Jadi', icon: FaShoppingCart, color: 'blue' },
                      { value: 'raw_material', label: 'Bahan Baku', icon: FaBox, color: 'green' },
                      { value: 'manufactured', label: 'Produk Manufaktur', icon: FaIndustry, color: 'purple' }
                    ].map((type) => {
                      const Icon = type.icon;
                      const isSelected = formData.product_type === type.value;
                      
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, product_type: type.value as ProductType })}
                          className={`p-6 rounded-xl border-2 transition-all ${
                            isSelected 
                              ? `border-${type.color}-500 bg-${type.color}-50 shadow-lg scale-105` 
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <Icon className={`w-10 h-10 mx-auto mb-3 ${isSelected ? `text-${type.color}-600` : 'text-gray-400'}`} />
                          <p className={`font-semibold ${isSelected ? `text-${type.color}-900` : 'text-gray-700'}`}>
                            {type.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Product Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nama Produk <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder="Masukkan nama produk"
                  />
                </div>

                {/* SKU Generator */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      SKU <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setSkuMode('auto')}
                        className={`px-3 py-1 text-xs rounded-full transition-all ${
                          skuMode === 'auto' 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        Auto
                      </button>
                      <button
                        type="button"
                        onClick={() => setSkuMode('manual')}
                        className={`px-3 py-1 text-xs rounded-full transition-all ${
                          skuMode === 'manual' 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        Manual
                      </button>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        name="sku"
                        value={formData.sku}
                        onChange={handleInputChange}
                        required
                        readOnly={skuMode === 'auto'}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all ${
                          skuAvailable === false 
                            ? 'border-red-500' 
                            : skuAvailable === true 
                            ? 'border-green-500' 
                            : 'border-gray-300'
                        } ${skuMode === 'auto' ? 'bg-gray-50' : ''}`}
                        placeholder="SKU akan digenerate otomatis"
                      />
                      {skuAvailable !== null && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {skuAvailable ? (
                            <FaCheck className="text-green-500" />
                          ) : (
                            <FaTimes className="text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {skuMode === 'auto' && (
                      <Button
                        type="button"
                        onClick={handleGenerateSKU}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <FaRandom className="mr-2" />
                        Generate
                      </Button>
                    )}
                  </div>
                  {skuSuggestions.length > 0 && skuMode === 'manual' && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500">Saran:</span>
                      {skuSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setFormData({ ...formData, sku: suggestion })}
                          className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category & Unit */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Kategori <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Deskripsi
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Masukkan deskripsi produk"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Pricing & Profit */}
          {currentStep === 2 && (
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center text-green-900">
                  <FaDollarSign className="mr-3" />
                  Step 2: Harga & Analisis Profit
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {/* Cost Input */}
                {(formData.product_type === 'finished' || formData.product_type === 'raw_material') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Harga Beli (Cost) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                        Rp
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        name="purchase_price"
                        value={formData.purchase_price}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                {formData.product_type === 'manufactured' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Biaya Produksi (Cost) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                        Rp
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        name="production_cost"
                        value={formData.production_cost}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                {/* Markup Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Markup <span className="text-red-500">*</span>
                    </label>
                    <span className="text-2xl font-bold text-indigo-600">
                      {formData.markup_percentage}%
                    </span>
                  </div>
                  <input
                    type="range"
                    name="markup_percentage"
                    value={formData.markup_percentage}
                    onChange={handleInputChange}
                    min="0"
                    max="200"
                    step="5"
                    className="w-full h-3 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                    <span>150%</span>
                    <span>200%</span>
                  </div>
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Harga Jual <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                      Rp
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-12 pr-4 py-3 border-2 border-green-500 rounded-lg focus:ring-2 focus:ring-green-500 bg-green-50 text-lg font-bold text-green-700"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Profit Display */}
                {formData.profit_amount && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-indigo-900 flex items-center">
                        <FaChartLine className="mr-2" />
                        Analisis Profit
                      </h3>
                      {profitStatus && (
                        <Badge className={`${profitStatus.color} px-3 py-1`}>
                          {profitStatus.label}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Profit Amount</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(parseFloat(formData.profit_amount))}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Profit Margin</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formData.profit_margin}%
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Markup</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formData.markup_percentage}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-white rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cost:</span>
                        <span className="font-semibold">
                          {formatCurrency(parseFloat(formData.purchase_price || formData.production_cost || '0'))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Selling Price:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(parseFloat(formData.price || '0'))}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
                        <span className="font-bold text-gray-900">Net Profit:</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(parseFloat(formData.profit_amount))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  onClick={handlePrevStep}
                  variant="outline"
                  className="px-6 py-3"
                >
                  <FaArrowLeft className="mr-2" />
                  Sebelumnya
                </Button>
              )}
            </div>
            
            <div className="flex space-x-4">
              <Button
                type="button"
                onClick={handleCancel}
                variant="outline"
                className="px-6 py-3"
              >
                <FaTimes className="mr-2" />
                Batal
              </Button>
              
              {currentStep < steps.length ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700"
                >
                  Selanjutnya
                  <FaArrowRight className="ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700"
                >
                  <FaSave className="mr-2" />
                  {loading ? 'Menyimpan...' : 'Simpan Produk'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default SteppedProductForm;
