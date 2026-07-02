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

interface PriceTier {
  id: string;
  tier_name: string;
  price_type: string;
  tier_id?: string | null;
  price: string;
  discount_percentage: string;
  min_quantity: string;
}

const EditProductPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [loyaltyTiers, setLoyaltyTiers] = useState<any[]>([]);
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
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([
    {
      id: '1',
      tier_name: 'Regular (Non-Member)',
      price_type: 'regular',
      price: '',
      discount_percentage: '0',
      min_quantity: '1'
    }
  ]);
  const [variants, setVariants] = useState<any[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [detailedInfo, setDetailedInfo] = useState({
    long_description: '',
    ingredients: '',
    usage_instructions: '',
    warnings: '',
    internal_notes: '',
    weight: '',
    weight_unit: 'kg',
    length: '',
    width: '',
    height: '',
    dimension_unit: 'cm',
    volume: '',
    volume_unit: 'liter',
    brand: '',
    manufacturer: '',
    country_of_origin: '',
    tags: ''
  });

  const steps = [
    { number: 1, title: 'Informasi Dasar', icon: FaInfoCircle },
    { number: 2, title: 'Harga & Profit', icon: FaDollarSign },
    { number: 3, title: 'Supplier/Produksi', icon: FaTruck },
    { number: 4, title: 'Stok & Kualitas', icon: FaWarehouse },
    { number: 5, title: 'Detail & Media', icon: FaBox }
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
    loadLoyaltyTiers();
  }, []);

  useEffect(() => {
    if (id) {
      fetchProductData();
    }
  }, [id]);

  const fetchProductData = async () => {
    setLoadingProduct(true);
    try {
      const response = await fetch(`/api/products/${id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const product = data.data;
        
        // Pre-fill basic info
        setFormData({
          name: product.name || '',
          sku: product.sku || '',
          barcode: product.barcode || '',
          category: product.category || '',
          description: product.description || '',
          unit: product.unit || 'pcs',
          product_type: product.product_type || 'finished',
          purchase_price: product.purchase_price || '',
          production_cost: product.production_cost || '',
          markup_percentage: product.markup_percentage || '30',
          price: product.price || '',
          profit_amount: product.profit_amount || '',
          profit_margin: product.profit_margin || '',
          supplier_id: product.supplier_id || '',
          recipe_id: product.recipe_id || '',
          lead_time_days: product.lead_time_days || '',
          production_time_minutes: product.production_time_minutes || '',
          batch_size: product.batch_size || '1',
          stock: product.stock || '',
          min_stock: product.min_stock || '',
          max_stock: product.max_stock || '',
          reorder_point: product.reorder_point || '',
          quality_grade: product.quality_grade || '',
          shelf_life_days: product.shelf_life_days || '',
          storage_temperature: product.storage_temperature || '',
          requires_batch_tracking: product.requires_batch_tracking || false,
          requires_expiry_tracking: product.requires_expiry_tracking || false,
          can_be_sold: product.can_be_sold !== undefined ? product.can_be_sold : true,
          can_be_purchased: product.can_be_purchased !== undefined ? product.can_be_purchased : true,
          can_be_produced: product.can_be_produced || false,
          is_active: product.is_active !== undefined ? product.is_active : true
        });
        
        // Pre-fill detailed info
        if (product.long_description || product.weight || product.brand) {
          setDetailedInfo({
            long_description: product.long_description || '',
            ingredients: product.ingredients || '',
            usage_instructions: product.usage_instructions || '',
            warnings: product.warnings || '',
            internal_notes: product.internal_notes || '',
            weight: product.weight || '',
            weight_unit: product.weight_unit || 'kg',
            length: product.length || '',
            width: product.width || '',
            height: product.height || '',
            dimension_unit: product.dimension_unit || 'cm',
            volume: product.volume || '',
            volume_unit: product.volume_unit || 'liter',
            brand: product.brand || '',
            manufacturer: product.manufacturer || '',
            country_of_origin: product.country_of_origin || '',
            tags: product.tags ? (Array.isArray(product.tags) ? product.tags.join(', ') : product.tags) : ''
          });
        }
        
        // Pre-fill images
        if (product.images && Array.isArray(product.images)) {
          setImages(product.images);
        }
        
        // Pre-fill variants
        if (product.variants && Array.isArray(product.variants)) {
          setVariants(product.variants.map((v: any, idx: number) => ({
            id: v.id || Date.now().toString() + idx,
            variant_name: v.variant_name || '',
            variant_type: v.variant_type || 'size',
            sku: v.sku || '',
            price: v.price || '',
            stock: v.stock || '',
            weight: v.weight || ''
          })));
        }
        
        // Pre-fill tiered prices
        if (product.prices && Array.isArray(product.prices) && product.prices.length > 0) {
          setPriceTiers(product.prices.map((p: any, idx: number) => ({
            id: p.id || Date.now().toString() + idx,
            tier_name: p.notes || p.tier_name || '',
            price_type: p.price_type || 'custom',
            tier_id: p.tier_id || null,
            price: p.price || '',
            discount_percentage: p.discount_percentage || '0',
            min_quantity: p.min_quantity || '1'
          })));
        }
      } else {
        alert('Produk tidak ditemukan');
        router.push('/inventory');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Gagal memuat data produk');
    } finally {
      setLoadingProduct(false);
    }
  };

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

  const loadLoyaltyTiers = async () => {
    try {
      const response = await fetch('/api/loyalty/tiers');
      const result = await response.json();
      if (result.success) {
        setLoyaltyTiers(result.data);
      }
    } catch (error) {
      console.error('Error loading loyalty tiers:', error);
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

  const handleAddPriceTier = () => {
    const newTier: PriceTier = {
      id: Date.now().toString(),
      tier_name: '',
      price_type: 'custom',
      price: '',
      discount_percentage: '0',
      min_quantity: '1'
    };
    setPriceTiers([...priceTiers, newTier]);
  };

  const handleRemovePriceTier = (id: string) => {
    if (priceTiers.length > 1) {
      setPriceTiers(priceTiers.filter(tier => tier.id !== id));
    }
  };

  const handlePriceTierChange = (id: string, field: keyof PriceTier, value: string) => {
    setPriceTiers(priceTiers.map(tier => {
      if (tier.id === id) {
        const updated = { ...tier, [field]: value };
        
        // Handle membership tier selection
        if (field === 'price_type' && value.startsWith('tier_')) {
          const tierId = value.replace('tier_', '');
          const selectedTier = loyaltyTiers.find(lt => lt.id === tierId);
          if (selectedTier) {
            updated.tier_id = tierId;
            updated.tier_name = selectedTier.tierName;
            updated.discount_percentage = selectedTier.discountPercentage.toString();
            
            // Auto-calculate price from tier discount
            if (formData.price) {
              const basePrice = parseFloat(formData.price);
              const discount = parseFloat(selectedTier.discountPercentage) || 0;
              const discountedPrice = basePrice * (1 - discount / 100);
              updated.price = discountedPrice.toFixed(2);
            }
          }
        } else if (field === 'price_type') {
          // Clear tier_id for manual input types
          updated.tier_id = null;
        }
        
        // Auto-calculate price from discount if base price exists
        if (field === 'discount_percentage' && formData.price) {
          const basePrice = parseFloat(formData.price);
          const discount = parseFloat(value) || 0;
          const discountedPrice = basePrice * (1 - discount / 100);
          updated.price = discountedPrice.toFixed(2);
        }
        
        return updated;
      }
      return tier;
    }));
  };

  const handleAddVariant = () => {
    const newVariant = {
      id: Date.now().toString(),
      variant_name: '',
      variant_type: 'size',
      sku: '',
      price: '',
      stock: '',
      weight: ''
    };
    setVariants([...variants, newVariant]);
  };

  const handleRemoveVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const handleVariantChange = (id: string, field: string, value: string) => {
    setVariants(variants.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('file', files[i]);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        const newImages = result.data.map((file: any) => file.url);
        setImages([...images, ...newImages]);
      } else {
        alert('Gagal upload gambar: ' + result.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Terjadi kesalahan saat upload gambar');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleDetailedInfoChange = (field: string, value: string) => {
    setDetailedInfo(prev => ({ ...prev, [field]: value }));
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
      // Prepare tiered prices for submission
      const tiered_prices = priceTiers
        .filter(tier => tier.price && parseFloat(tier.price) > 0)
        .map(tier => ({
          price_type: tier.price_type,
          tier_name: tier.tier_name,
          price: parseFloat(tier.price),
          discount_percentage: parseFloat(tier.discount_percentage) || 0,
          min_quantity: parseInt(tier.min_quantity) || 1
        }));

      // Prepare variants
      const product_variants = variants
        .filter(v => v.variant_name && v.variant_type)
        .map(v => ({
          variant_name: v.variant_name,
          variant_type: v.variant_type,
          sku: v.sku || null,
          price: v.price ? parseFloat(v.price) : null,
          stock: v.stock ? parseFloat(v.stock) : 0,
          weight: v.weight ? parseFloat(v.weight) : null
        }));

      const payload = {
        ...formData,
        ...detailedInfo,
        tags: detailedInfo.tags ? detailedInfo.tags.split(',').map(t => t.trim()) : [],
        images: images.length > 0 ? images : null,
        thumbnail: images.length > 0 ? images[0] : null,
        recipe_ingredients: formData.product_type === 'manufactured' && !formData.recipe_id ? recipeIngredients : undefined,
        tiered_prices: tiered_prices.length > 0 ? tiered_prices : undefined,
        variants: product_variants.length > 0 ? product_variants : undefined
      };

      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Produk berhasil diupdate!');
        router.push('/inventory');
      } else {
        alert('❌ Gagal mengupdate produk: ' + result.message);
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

  if (status === "loading" || loadingProduct) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">{loadingProduct ? 'Memuat data produk...' : 'Memuat...'}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const profitStatus = formData.profit_margin ? getProfitStatus(parseFloat(formData.profit_margin)) : null;

  return (
    <DashboardLayout>
      <Head>
        <title>Edit Produk | BEDAGANG Cloud POS</title>
      </Head>

      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Edit Produk</h1>
              <p className="text-indigo-100 text-sm">
                Form wizard untuk mengedit produk dengan mudah dan terstruktur
              </p>
            </div>
            <FaBox className="w-12 h-12 text-white/30" />
          </div>
        </div>

        {/* Progress Steps */}
        <Card className="border border-indigo-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                
                return (
                  <React.Fragment key={step.number}>
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 transition-all ${
                        isActive 
                          ? 'bg-indigo-600 text-white scale-110 shadow-md' 
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {isCompleted ? <FaCheck className="text-sm" /> : <Icon className="text-sm" />}
                      </div>
                      <span className={`text-xs font-medium text-center ${
                        isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-3 rounded transition-all ${
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
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 py-4 px-6">
                <CardTitle className="flex items-center text-indigo-900 text-lg">
                  <FaInfoCircle className="mr-2 text-base" />
                  Step 1: Informasi Dasar Produk
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Product Type Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipe Produk <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
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
                          className={`p-4 rounded-lg border-2 transition-all ${
                            isSelected 
                              ? `border-${type.color}-500 bg-${type.color}-50 shadow-md scale-105` 
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <Icon className={`w-7 h-7 mx-auto mb-2 ${isSelected ? `text-${type.color}-600` : 'text-gray-400'}`} />
                          <p className={`text-sm font-semibold ${isSelected ? `text-${type.color}-900` : 'text-gray-700'}`}>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
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
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all text-sm ${
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="Masukkan deskripsi produk"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Pricing & Profit */}
          {currentStep === 2 && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 py-4 px-6">
                <CardTitle className="flex items-center text-green-900 text-lg">
                  <FaDollarSign className="mr-2 text-base" />
                  Step 2: Harga & Analisis Profit
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
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
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Profit Amount</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(parseFloat(formData.profit_amount))}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Profit Margin</p>
                        <p className="text-xl font-bold text-blue-600">
                          {formData.profit_margin}%
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Markup</p>
                        <p className="text-xl font-bold text-purple-600">
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

                {/* Tiered Pricing Section */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-purple-900 flex items-center">
                        <FaDollarSign className="mr-2" />
                        Harga Bertingkat (Tiered Pricing)
                      </h3>
                      <Button
                        type="button"
                        onClick={handleAddPriceTier}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <FaPlus className="mr-2" />
                        Tambah Tier
                      </Button>
                    </div>
                    <p className="text-xs text-purple-700">
                      💡 Pilih <strong>Manual Input</strong> untuk harga custom, atau pilih <strong>Membership Tier</strong> untuk otomatis menggunakan diskon dari database loyalty program
                    </p>
                  </div>

                  <div className="space-y-3">
                    {priceTiers.map((tier, index) => (
                      <div key={tier.id} className="bg-white rounded-lg p-4 border-2 border-purple-100">
                        <div className="flex items-start space-x-3">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nama Tier
                              </label>
                              <input
                                type="text"
                                value={tier.tier_name}
                                onChange={(e) => handlePriceTierChange(tier.id, 'tier_name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                                placeholder="e.g., Member Gold"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Tipe
                              </label>
                              <select
                                value={tier.price_type}
                                onChange={(e) => handlePriceTierChange(tier.id, 'price_type', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="">Pilih Tipe</option>
                                <optgroup label="Manual Input">
                                  <option value="regular">Regular</option>
                                  <option value="wholesale">Grosir</option>
                                  <option value="bulk">Bulk Order</option>
                                  <option value="custom">Custom</option>
                                </optgroup>
                                {loyaltyTiers.length > 0 && (
                                  <optgroup label="Membership Tiers">
                                    {loyaltyTiers.map(lt => (
                                      <option key={lt.id} value={`tier_${lt.id}`}>
                                        {lt.tierName} (Diskon {lt.discountPercentage}%)
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Diskon (%)
                                {tier.tier_id && (
                                  <span className="ml-1 text-xs text-green-600">✓ Auto</span>
                                )}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={tier.discount_percentage}
                                onChange={(e) => handlePriceTierChange(tier.id, 'discount_percentage', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 ${
                                  tier.tier_id ? 'bg-green-50 border-green-300' : 'border-gray-300'
                                }`}
                                placeholder="0"
                                readOnly={!!tier.tier_id}
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Harga
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={tier.price}
                                onChange={(e) => handlePriceTierChange(tier.id, 'price', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-purple-700 focus:ring-2 focus:ring-purple-500"
                                placeholder="0"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Min Qty
                              </label>
                              <input
                                type="number"
                                value={tier.min_quantity}
                                onChange={(e) => handlePriceTierChange(tier.id, 'min_quantity', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                                placeholder="1"
                              />
                            </div>
                          </div>

                          {priceTiers.length > 1 && (
                            <Button
                              type="button"
                              onClick={() => handleRemovePriceTier(tier.id)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50 mt-6"
                            >
                              <FaTrash />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-white rounded-lg">
                    <p className="text-xs text-gray-600">
                      💡 <strong>Tips:</strong> Harga akan otomatis dihitung berdasarkan diskon dari harga jual utama. 
                      Anda juga bisa input harga manual untuk setiap tier.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Supplier/Production */}
          {currentStep === 3 && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 py-4 px-6">
                <CardTitle className="flex items-center text-blue-900 text-lg">
                  <FaTruck className="mr-2 text-base" />
                  Step 3: Supplier & Produksi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {(formData.product_type === 'finished' || formData.product_type === 'raw_material') && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Supplier <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="supplier_id"
                        value={formData.supplier_id}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Lead Time (hari)
                      </label>
                      <input
                        type="number"
                        name="lead_time_days"
                        value={formData.lead_time_days}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="0"
                      />
                    </div>
                  </>
                )}

                {formData.product_type === 'manufactured' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Recipe
                      </label>
                      <select
                        name="recipe_id"
                        value={formData.recipe_id}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                      >
                        <option value="">Pilih Recipe (Optional)</option>
                        {recipes.map(recipe => (
                          <option key={recipe.id} value={recipe.id}>
                            {recipe.name} ({recipe.code}) - Rp {recipe.total_cost.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Waktu Produksi (menit)
                        </label>
                        <input
                          type="number"
                          name="production_time_minutes"
                          value={formData.production_time_minutes}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Batch Size
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="batch_size"
                          value={formData.batch_size}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                          placeholder="1"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Stock & Quality */}
          {currentStep === 4 && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 py-4 px-6">
                <CardTitle className="flex items-center text-amber-900 text-lg">
                  <FaWarehouse className="mr-2 text-base" />
                  Step 4: Stok & Kualitas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Stok Awal
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Stok Minimum
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="min_stock"
                      value={formData.min_stock}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Stok Maksimum
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="max_stock"
                      value={formData.max_stock}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reorder Point
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="reorder_point"
                      value={formData.reorder_point}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Grade Kualitas
                    </label>
                    <select
                      name="quality_grade"
                      value={formData.quality_grade}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                    >
                      <option value="">Pilih Grade</option>
                      <option value="A">A - Premium</option>
                      <option value="B">B - Standard</option>
                      <option value="C">C - Economy</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Umur Simpan (hari)
                    </label>
                    <input
                      type="number"
                      name="shelf_life_days"
                      value={formData.shelf_life_days}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Suhu Penyimpanan
                    </label>
                    <input
                      type="text"
                      name="storage_temperature"
                      value={formData.storage_temperature}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                      placeholder="e.g., 2-8°C"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-4">Opsi Tracking</h4>
                  <div className="space-y-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="requires_batch_tracking"
                        checked={formData.requires_batch_tracking}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        Memerlukan tracking batch/lot number
                      </span>
                    </label>

                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="requires_expiry_tracking"
                        checked={formData.requires_expiry_tracking}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        Memerlukan tracking tanggal kadaluarsa
                      </span>
                    </label>

                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        Produk aktif
                      </span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Detail & Media */}
          {currentStep === 5 && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 py-4 px-6">
                <CardTitle className="flex items-center text-pink-900 text-lg">
                  <FaBox className="mr-2 text-base" />
                  Step 5: Detail Produk & Media
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Image Upload Section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-blue-900">
                      📸 Gambar Produk
                    </h3>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-sm"
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? 'Mengunggah...' : '+ Upload Gambar'}
                      </Button>
                    </label>
                  </div>

                  {images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {images.map((img, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={img}
                            alt={`Product ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <FaTimes />
                          </button>
                          {index === 0 && (
                            <Badge className="absolute bottom-2 left-2 bg-blue-600">
                              Thumbnail
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Belum ada gambar. Upload gambar produk untuk tampilan yang lebih menarik.
                    </div>
                  )}
                </div>

                {/* Product Variants Section */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-green-900">
                      🎨 Varian Produk
                    </h3>
                    <Button
                      type="button"
                      onClick={handleAddVariant}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <FaPlus className="mr-2" />
                      Tambah Varian
                    </Button>
                  </div>

                  {variants.length > 0 ? (
                    <div className="space-y-3">
                      {variants.map((variant) => (
                        <div key={variant.id} className="bg-white rounded-lg p-4 border-2 border-green-100">
                          <div className="flex items-start space-x-3">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Nama Varian
                                </label>
                                <input
                                  type="text"
                                  value={variant.variant_name}
                                  onChange={(e) => handleVariantChange(variant.id, 'variant_name', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  placeholder="e.g., Small, Red, 250ml"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Tipe Varian
                                </label>
                                <select
                                  value={variant.variant_type}
                                  onChange={(e) => handleVariantChange(variant.id, 'variant_type', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                  <option value="size">Size (Ukuran)</option>
                                  <option value="color">Color (Warna)</option>
                                  <option value="flavor">Flavor (Rasa)</option>
                                  <option value="material">Material (Bahan)</option>
                                  <option value="volume">Volume</option>
                                  <option value="weight">Weight (Berat)</option>
                                  <option value="custom">Custom</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  SKU Varian
                                </label>
                                <input
                                  type="text"
                                  value={variant.sku}
                                  onChange={(e) => handleVariantChange(variant.id, 'sku', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  placeholder="Optional"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Harga
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variant.price}
                                  onChange={(e) => handleVariantChange(variant.id, 'price', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  placeholder="Override"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Stok
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variant.stock}
                                  onChange={(e) => handleVariantChange(variant.id, 'stock', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  placeholder="0"
                                />
                              </div>
                            </div>

                            <Button
                              type="button"
                              onClick={() => handleRemoveVariant(variant.id)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50 mt-6"
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Tidak ada varian. Tambahkan varian jika produk memiliki ukuran, warna, atau tipe berbeda.
                    </div>
                  )}
                </div>

                {/* Detailed Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Deskripsi Lengkap
                  </label>
                  <textarea
                    value={detailedInfo.long_description}
                    onChange={(e) => handleDetailedInfoChange('long_description', e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                    placeholder="Deskripsi detail tentang produk, keunggulan, manfaat, dll."
                  />
                </div>

                {/* Dimensions & Weight */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Dimensi & Berat</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Berat
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={detailedInfo.weight}
                          onChange={(e) => handleDetailedInfoChange('weight', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Unit
                        </label>
                        <select
                          value={detailedInfo.weight_unit}
                          onChange={(e) => handleDetailedInfoChange('weight_unit', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="kg">Kg</option>
                          <option value="gram">Gram</option>
                          <option value="lb">Lb</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Panjang
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={detailedInfo.length}
                          onChange={(e) => handleDetailedInfoChange('length', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Lebar
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={detailedInfo.width}
                          onChange={(e) => handleDetailedInfoChange('width', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Tinggi
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={detailedInfo.height}
                          onChange={(e) => handleDetailedInfoChange('height', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Informasi Tambahan</h4>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Brand/Merek
                      </label>
                      <input
                        type="text"
                        value={detailedInfo.brand}
                        onChange={(e) => handleDetailedInfoChange('brand', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Nama brand"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Produsen
                      </label>
                      <input
                        type="text"
                        value={detailedInfo.manufacturer}
                        onChange={(e) => handleDetailedInfoChange('manufacturer', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Nama produsen"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Negara Asal
                      </label>
                      <input
                        type="text"
                        value={detailedInfo.country_of_origin}
                        onChange={(e) => handleDetailedInfoChange('country_of_origin', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="e.g., Indonesia"
                      />
                    </div>
                  </div>
                </div>

                {/* Ingredients & Instructions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Komposisi/Bahan
                    </label>
                    <textarea
                      value={detailedInfo.ingredients}
                      onChange={(e) => handleDetailedInfoChange('ingredients', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                      placeholder="Daftar bahan/komposisi produk"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cara Penggunaan
                    </label>
                    <textarea
                      value={detailedInfo.usage_instructions}
                      onChange={(e) => handleDetailedInfoChange('usage_instructions', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                      placeholder="Instruksi penggunaan produk"
                    />
                  </div>
                </div>

                {/* Warnings & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Peringatan
                    </label>
                    <textarea
                      value={detailedInfo.warnings}
                      onChange={(e) => handleDetailedInfoChange('warnings', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                      placeholder="Peringatan atau perhatian khusus"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Catatan Internal
                    </label>
                    <textarea
                      value={detailedInfo.internal_notes}
                      onChange={(e) => handleDetailedInfoChange('internal_notes', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                      placeholder="Catatan internal (tidak tampil ke customer)"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tags (pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    value={detailedInfo.tags}
                    onChange={(e) => handleDetailedInfoChange('tags', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                    placeholder="e.g., premium, organic, best-seller"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
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

export default EditProductPage;
