import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '../../components/ui/button';
import { useTranslation } from '@/lib/i18n';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Badge } from '../../components/ui/badge';
import ProductDetailModal, { ProductDetail } from '@/components/inventory/ProductDetailModal';
import { InventoryDefektaIntegrationService } from '@/services/integration/inventory-defekta-integration';
import { toast } from '@/components/ui/use-toast';

// Icons
import {
  FaBoxOpen,
  FaLayerGroup,
  FaExclamationTriangle,
  FaChartBar,
  FaArrowRight,
  FaDollarSign,
  FaShoppingCart,
  FaCoins,
  FaClock,
  FaCalendarAlt,
  FaExclamationCircle,
  FaShoppingBasket,
  FaBolt,
  FaTachometerAlt,
  FaSnowflake,
  FaClipboardCheck,
  FaUser,
  FaWarehouse,
  FaCheckCircle,
  FaTimesCircle,
  FaBalanceScale,
  FaTruck,
} from 'react-icons/fa';

// Componentes del módulo inventory
import InventoryPageLayout from '../../modules/inventory/components/InventoryPageLayout';
import InventoryPageHeader from '../../modules/inventory/components/InventoryPageHeader';
import InventoryStatCard from '../../modules/inventory/components/InventoryStatCard';
import LowStockWidget from '@/components/inventory/LowStockWidget';

// Datos de ejemplo
const mockCategories = [
  { id: "1", name: "Analgesik" },
  { id: "2", name: "Antibiotik" },
  { id: "3", name: "Vitamin" },
  { id: "4", name: "Antihistamin" },
  { id: "5", name: "Saluran Cerna" },
  { id: "6", name: "Kortikosteroid" },
  { id: "7", name: "Kardiovaskular" }
];

// Helper function untuk tanggal
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const today = new Date();

const mockProducts = [
  { 
    id: "1", 
    name: "Paracetamol", 
    categoryId: "1", 
    category: "Analgesik",
    minStock: 10,
    stock: 50,
    price: 10000,
    purchasePrice: 8000,
    expiryDate: addDays(today, 300),
    salesVelocity: 15, // Unit per minggu
    movingCategory: "fast"
  },
  { 
    id: "2", 
    name: "Amoxicillin", 
    categoryId: "2", 
    category: "Antibiotik",
    minStock: 15,
    stock: 8,
    price: 25000,
    purchasePrice: 20000,
    expiryDate: addDays(today, 400),
    salesVelocity: 5, // Unit per minggu
    movingCategory: "medium"
  },
  { 
    id: "3", 
    name: "Vitamin C", 
    categoryId: "3", 
    category: "Vitamin",
    minStock: 20,
    stock: 100,
    price: 5000,
    purchasePrice: 3500,
    expiryDate: addDays(today, 600),
    salesVelocity: 20, // Unit per minggu
    movingCategory: "fast"
  },
  { 
    id: "4", 
    name: "Loratadine", 
    categoryId: "4", 
    category: "Antihistamin",
    minStock: 12,
    stock: 30,
    price: 15000,
    purchasePrice: 12000,
    expiryDate: addDays(today, 90),
    salesVelocity: 4, // Unit per minggu
    movingCategory: "medium"
  },
  { 
    id: "5", 
    name: "Ibuprofen", 
    categoryId: "1", 
    category: "Analgesik",
    minStock: 15,
    stock: 40,
    price: 8000,
    purchasePrice: 6000,
    expiryDate: addDays(today, 500),
    salesVelocity: 10, // Unit per minggu
    movingCategory: "medium"
  },
  { 
    id: "6", 
    name: "Cetirizine", 
    categoryId: "4", 
    category: "Antihistamin",
    minStock: 10,
    stock: 25,
    price: 12000,
    purchasePrice: 9000,
    expiryDate: addDays(today, 30),
    salesVelocity: 2, // Unit per minggu
    movingCategory: "slow"
  },
  { 
    id: "7", 
    name: "Antasida", 
    categoryId: "5", 
    category: "Saluran Cerna",
    minStock: 8,
    stock: 12,
    price: 9000,
    purchasePrice: 7000,
    expiryDate: addDays(today, 360),
    salesVelocity: 3, // Unit per minggu
    movingCategory: "slow"
  },
  { 
    id: "8", 
    name: "Dexamethasone", 
    categoryId: "6", 
    category: "Kortikosteroid",
    minStock: 5,
    stock: 3,
    price: 18000,
    purchasePrice: 14000,
    expiryDate: addDays(today, 180),
    salesVelocity: 1, // Unit per minggu
    movingCategory: "slow"
  },
  { 
    id: "9", 
    name: "Captopril", 
    categoryId: "7", 
    category: "Kardiovaskular",
    minStock: 10,
    stock: 5,
    price: 15000,
    purchasePrice: 12000,
    expiryDate: addDays(today, 450),
    salesVelocity: 6, // Unit per minggu
    movingCategory: "medium"
  },
  { 
    id: "10", 
    name: "Amlodipine", 
    categoryId: "7", 
    category: "Kardiovaskular",
    minStock: 8,
    stock: 15,
    price: 20000,
    purchasePrice: 16000,
    expiryDate: addDays(today, 60),
    salesVelocity: 8, // Unit per minggu
    movingCategory: "medium"
  }
];

const getMenuCards = (t: any) => [
  {
    id: '1',
    title: t('inventory.products'),
    description: t('inventory.manageProductsAndStock'),
    link: '/inventory/products',
    icon: FaBoxOpen
  },
  {
    id: '2',
    title: t('inventory.categories'),
    description: t('inventory.manageProductCategories'),
    link: '/inventory/categories',
    icon: FaLayerGroup
  },
  {
    id: '3',
    title: t('inventory.lowStock'),
    description: t('inventory.viewLowStockProducts'),
    link: '/inventory/low-stock',
    icon: FaExclamationTriangle
  },
  {
    id: '4',
    title: t('common.reports'),
    description: t('inventory.viewInventoryReports'),
    link: '/inventory/reports',
    icon: FaChartBar
  },
  {
    id: '5',
    title: t('inventory.goodsReceipt'),
    description: t('inventory.manageGoodsReceipt'),
    link: '/inventory/receive',
    icon: FaTruck
  }
];

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

const InventoryPage = () => {
  const { t } = useTranslation();
  const menuCards = getMenuCards(t);
  
  // State for product detail modal
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper function untuk format Rupiah
  const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper function untuk format tanggal
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };
  
  // Helper function untuk menghitung selisih hari
  const getDayDifference = (date1: Date, date2: Date): number => {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Convert mock product to ProductDetail interface
  const convertToProductDetail = (product: any): ProductDetail => {
    const today = new Date();
    let status: 'normal' | 'low_stock' | 'out_of_stock' | 'expiring' | 'expired' = 'normal';
    
    if (product.stock === 0) {
      status = 'out_of_stock';
    } else if (product.stock < product.minStock) {
      status = 'low_stock';
    } else if (product.expiryDate) {
      const daysUntilExpiry = Math.ceil((product.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 0) {
        status = 'expired';
      } else if (daysUntilExpiry <= 90) {
        status = 'expiring';
      }
    }

    return {
      id: product.id,
      name: product.name,
      sku: `SKU-${product.id}`,
      category: product.category,
      currentStock: product.stock,
      minStock: product.minStock,
      reorderPoint: product.minStock,
      price: product.price,
      purchasePrice: product.purchasePrice,
      expiryDate: product.expiryDate,
      location: `Rak ${product.category.charAt(0)}-${product.id}`,
      shelf: `Shelf ${product.id}`,
      supplier: `PT Supplier ${product.category}`,
      unit: 'Strip',
      status,
      condition: status === 'expired' ? 'expired' : 'good',
      lastUpdated: new Date(),
      description: `${product.category} - ${product.name}`
    };
  };

  // Handle product click
  const handleProductClick = (product: any) => {
    const productDetail = convertToProductDetail(product);
    setSelectedProduct(productDetail);
    setIsModalOpen(true);
  };

  // Handle add to defekta
  const handleAddToDefekta = async (product: ProductDetail) => {
    try {
      const result = await InventoryDefektaIntegrationService.addProductToDefekta(product);
      if (result.success) {
        toast({
          title: "Berhasil",
          description: result.message,
        });
        // Navigate to defekta page
        InventoryDefektaIntegrationService.navigateToDefektaWithProduct(product.id);
      } else {
        throw new Error(result.error || 'Failed to add to defekta');
      }
    } catch (error: any) {
      toast({
        title: "Gagal",
        description: error.message || "Terjadi kesalahan saat menambahkan ke defekta",
        variant: "destructive",
      });
    }
  };

  // Hitung nilai inventory per kategori
  const calculateInventoryValueByCategory = () => {
    const categoryValues: {[key: string]: {total: number, count: number}} = {};
    
    mockProducts.forEach(product => {
      const categoryId = product.categoryId;
      const stockValue = (product.purchasePrice || 0) * product.stock;
      
      if (!categoryValues[categoryId]) {
        categoryValues[categoryId] = { total: 0, count: 0 };
      }
      
      categoryValues[categoryId].total += stockValue;
      categoryValues[categoryId].count += 1;
    });
    
    return mockCategories.map(category => ({
      id: category.id,
      name: category.name,
      value: categoryValues[category.id]?.total || 0,
      count: categoryValues[category.id]?.count || 0
    })).sort((a, b) => b.value - a.value);
  };

  const inventoryValueByCategory = calculateInventoryValueByCategory();
  const totalInventoryValue = inventoryValueByCategory.reduce((sum, category) => sum + category.value, 0);

  // Produk yang akan kadaluarsa dalam 90 hari
  const expiringProducts = mockProducts
    .filter(product => {
      const dayDiff = getDayDifference(today, product.expiryDate);
      return dayDiff <= 90 && product.stock > 0;
    })
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

  // Produk yang memerlukan order (stok di bawah minStock)
  const needOrderProducts = mockProducts
    .filter(product => (product.stock < product.minStock))
    .sort((a, b) => (a.stock / a.minStock) - (b.stock / b.minStock));

  // Kelompokkan produk berdasarkan pergerakan
  const fastMovingProducts = mockProducts.filter(p => p.movingCategory === "fast");
  const mediumMovingProducts = mockProducts.filter(p => p.movingCategory === "medium");
  const slowMovingProducts = mockProducts.filter(p => p.movingCategory === "slow");

  // Data Stock Opname - Fetch from API
  const [stockOpnameHistory, setStockOpnameHistory] = useState([]);
  const [stockOpnameLoading, setStockOpnameLoading] = useState(true);

  // Fetch stock opname history from API
  useEffect(() => {
    const fetchStockOpnameHistory = async () => {
      try {
        setStockOpnameLoading(true);
        const response = await fetch('/api/inventory/stocktake?dataType=history');
        const result = await response.json();
        
        if (result.success && result.data) {
          // Transform API data to match dashboard format
          const transformedData = result.data.map((item: any) => ({
            id: item.id,
            date: new Date(item.date),
            status: item.status === 'completed' ? 'Selesai' : 
                   item.status === 'pending' ? 'Menunggu' : 
                   item.status === 'investigation' ? 'Investigasi' : 'Dibatalkan',
            user: item.stocktakeBy,
            totalItems: item.totalItems,
            matchedItems: item.totalItems - (item.itemsWithVariance || 0),
            discrepancies: item.itemsWithVariance || 0,
            notes: item.notes || 'Tidak ada catatan',
            accuracy: item.totalItems > 0 ? 
              Math.round(((item.totalItems - (item.itemsWithVariance || 0)) / item.totalItems) * 100 * 10) / 10 : 0,
            valueDifference: (item.itemsWithVariance || 0) * -50000, // Estimated value difference
            approvedBy: item.approvedBy
          }));
          
          setStockOpnameHistory(transformedData);
        } else {
          // Fallback to mock data if API fails
          setStockOpnameHistory([
            {
              id: "SO-001",
              date: addDays(today, -15),
              status: "Selesai",
              user: "Budi Santoso",
              totalItems: 125,
              matchedItems: 119,
              discrepancies: 6,
              notes: "Kekurangan Paracetamol (-5), Kelebihan Amoxicillin (+2), Kekurangan Vitamin C (-2), Kekurangan Antasida (-1)",
              categories: ["Analgesik", "Antibiotik", "Vitamin", "Saluran Cerna"],
              accuracy: 95.2,
              valueDifference: -450000,
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching stock opname history:', error);
        // Fallback to mock data
        setStockOpnameHistory([
          {
            id: "SO-001",
            date: addDays(today, -15),
            status: "Selesai",
            user: "Budi Santoso",
            totalItems: 125,
            matchedItems: 119,
            discrepancies: 6,
            notes: "Kekurangan Paracetamol (-5), Kelebihan Amoxicillin (+2), Kekurangan Vitamin C (-2), Kekurangan Antasida (-1)",
            categories: ["Analgesik", "Antibiotik", "Vitamin", "Saluran Cerna"],
            accuracy: 95.2,
            valueDifference: -450000,
          }
        ]);
      } finally {
        setStockOpnameLoading(false);
      }
    };

    fetchStockOpnameHistory();
  }, []);

  try {
    return (
      <InventoryPageLayout title="Inventori">
        <div className="space-y-8 pb-12">
          {/* Dashboard Header */}
          <InventoryPageHeader 
            title={t('inventory.inventoryDashboard')} 
            subtitle={t('inventory.viewStockOverview')}
            gradient={true}
          />
          
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <InventoryStatCard
              title={t('inventory.totalProducts')}
              value={mockProducts.length}
              icon={<FaBoxOpen className="h-5 w-5" />}
              gradient={true}
            />
            
            <InventoryStatCard
              title={t('inventory.categories')}
              value={mockCategories.length}
              icon={<FaLayerGroup className="h-5 w-5" />}
              gradient={true}
            />
            
            <InventoryStatCard
              title={t('inventory.lowStock')}
              value={mockProducts.filter(p => (p.stock || 0) < (p.minStock || 10)).length}
              icon={<FaExclamationTriangle className="h-5 w-5" />}
              color="red"
              gradient={true}
            />
          </div>



          {/* Nilai Inventory per Kategori */}
          <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow bg-white">
            <div className="h-1.5 bg-gradient-to-r from-red-600 to-orange-500"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center">
                <div className="bg-red-100 p-2 rounded-full mr-3">
                  <FaCoins className="h-4 w-4 text-red-600" />
                </div>
                Nilai Inventory Berdasarkan Kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="flex justify-center items-center p-3 border rounded-lg border-gray-100 shadow-sm bg-white">
                  <div style={{ maxWidth: "280px", maxHeight: "280px" }}>
                    <Pie
                      data={{
                        labels: inventoryValueByCategory.map(cat => cat.name),
                        datasets: [
                          {
                            data: inventoryValueByCategory.map(cat => cat.value),
                            backgroundColor: [
                              '#DC2626', // red-600
                              '#EA580C', // orange-600
                              '#F97316', // orange-500
                              '#FB923C', // orange-400
                              '#C2410C', // orange-700
                              '#B91C1C', // red-700
                              '#EF4444', // red-500
                              '#F59E0B', // amber-500
                              '#B45309', // amber-700
                              '#FCD34D', // amber-300
                            ],
                            borderColor: [
                              '#FFFFFF',
                            ],
                            borderWidth: 2,
                          },
                        ],
                      }}
                      options={{
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              boxWidth: 12,
                              padding: 15,
                              font: {
                                size: 11
                              }
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                  label += ': ';
                                }
                                const value = context.raw as number;
                                label += formatRupiah(value);
                                return label;
                              }
                            }
                          }
                        },
                        animation: {
                          animateScale: true
                        }
                      }}
                    />
                  </div>
                </div>
                
                {/* Daftar Kategori */}
                <div className="space-y-3 max-h-[290px] overflow-y-auto">
                  {inventoryValueByCategory.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-red-50 transition-colors">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-orange-500 flex items-center justify-center mr-3 text-white">
                          <FaLayerGroup className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{category.name}</div>
                          <div className="text-xs text-gray-500">
                            {category.count} produk
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-red-600">{formatRupiah(category.value)}</div>
                        <div className="text-xs text-gray-500">{((category.value / totalInventoryValue) * 100).toFixed(1)}% dari total</div>
                        <Progress 
                          value={(category.value / totalInventoryValue) * 100} 
                          className="w-32 h-1.5 mt-1 bg-gray-200"
                          style={{ 
                            background: 'linear-gradient(to right, #dc2626, #ea580c)',
                            height: '6px',
                            borderRadius: '3px'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 mt-4 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-700 to-orange-600 flex items-center justify-center mr-3 text-white">
                      <FaDollarSign className="h-4 w-4" />
                    </div>
                    <div className="font-semibold text-gray-800">Total Nilai Inventory</div>
                  </div>
                  <div className="text-xl font-bold text-red-700">{formatRupiah(totalInventoryValue)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Klasifikasi Pergerakan Produk */}
          <Card className="overflow-hidden border-0 shadow-md bg-white lg:col-span-2">
            <div className="h-1.5 bg-gradient-to-r from-red-600 to-orange-500"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center">
                <div className="bg-red-100 p-2 rounded-full mr-3">
                  <FaTachometerAlt className="h-4 w-4 text-red-600" />
                </div>
                Klasifikasi Pergerakan Produk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fast Moving */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-white to-red-50">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-orange-500 flex items-center justify-center mr-3 text-white">
                      <FaBolt className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-red-800">Fast Moving</div>
                      <div className="text-xs text-gray-500">{fastMovingProducts.length} produk</div>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {fastMovingProducts.map(product => (
                      <div key={product.id} className="flex justify-between items-center p-2 border border-red-100 rounded bg-white">
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-red-600 flex items-center">
                          <FaArrowRight className="h-2.5 w-2.5 mr-1" />
                          {product.salesVelocity} unit/minggu
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medium Moving */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-white to-red-50">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center mr-3 text-white">
                      <FaChartBar className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-red-700">Medium Moving</div>
                      <div className="text-xs text-gray-500">{mediumMovingProducts.length} produk</div>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {mediumMovingProducts.map(product => (
                      <div key={product.id} className="flex justify-between items-center p-2 border border-red-100 rounded bg-white">
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-red-600 flex items-center">
                          <FaArrowRight className="h-2.5 w-2.5 mr-1" />
                          {product.salesVelocity} unit/minggu
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slow Moving */}
                <div className="border rounded-lg p-4 bg-gradient-to-br from-white to-blue-50">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-center mr-3 text-white">
                      <FaSnowflake className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-blue-800">Slow Moving</div>
                      <div className="text-xs text-gray-500">{slowMovingProducts.length} produk</div>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {slowMovingProducts.map(product => (
                      <div key={product.id} className="flex justify-between items-center p-2 border border-blue-100 rounded bg-white">
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-blue-600 flex items-center">
                          <FaArrowRight className="h-2.5 w-2.5 mr-1" />
                          {product.salesVelocity} unit/minggu
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Opname Terakhir */}
          <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow bg-white">
            <div className="h-1.5 bg-gradient-to-r from-red-600 to-orange-500"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center">
                <div className="bg-red-100 p-2 rounded-full mr-3">
                  <FaClipboardCheck className="h-4 w-4 text-red-600" />
                </div>
                Stock Opname Terakhir
              </CardTitle>
              <CardDescription className="text-sm">
                Hasil perhitungan stok terakhir
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stockOpnameLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  <span className="ml-2 text-gray-600">Memuat data stock opname...</span>
                </div>
              ) : stockOpnameHistory.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div>
                      <div className="flex items-center">
                        <Badge className="bg-gradient-to-r from-red-600 to-orange-500 mr-2">
                          {stockOpnameHistory[0].id}
                        </Badge>
                        <span className="text-sm font-medium">
                          {formatDate(stockOpnameHistory[0].date)}
                        </span>
                      </div>
                      <div className="flex items-center mt-1">
                        <FaUser className="text-gray-400 h-3 w-3 mr-1" />
                        <span className="text-xs text-gray-500">
                          {stockOpnameHistory[0].user}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <Badge className="bg-green-600">
                        {stockOpnameHistory[0].status}
                      </Badge>
                      <span className="text-xs text-gray-500 mt-1">
                        {getDayDifference(stockOpnameHistory[0].date, today)} hari yang lalu
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-gradient-to-br from-white to-red-50 rounded-lg border border-red-100">
                      <div className="flex items-center mb-1">
                        <FaWarehouse className="h-3 w-3 text-red-400 mr-1" />
                        <span className="text-xs font-medium text-gray-600">Total Item</span>
                      </div>
                      <div className="text-xl font-bold text-red-600">
                        {stockOpnameHistory[0].totalItems}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-gradient-to-br from-white to-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center mb-1">
                        <FaCheckCircle className="h-3 w-3 text-green-400 mr-1" />
                        <span className="text-xs font-medium text-gray-600">Sesuai</span>
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        {stockOpnameHistory[0].matchedItems}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-gradient-to-br from-white to-amber-50 rounded-lg border border-amber-100">
                      <div className="flex items-center mb-1">
                        <FaTimesCircle className="h-3 w-3 text-amber-400 mr-1" />
                        <span className="text-xs font-medium text-gray-600">Selisih</span>
                      </div>
                      <div className="text-xl font-bold text-amber-600">
                        {stockOpnameHistory[0].discrepancies}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center">
                        <FaBalanceScale className="h-3 w-3 text-gray-500 mr-1" />
                        <span className="text-sm font-medium">Tingkat Akurasi</span>
                      </div>
                      <span className="text-sm font-bold text-gray-700">
                        {stockOpnameHistory[0].accuracy}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-600 to-orange-500" 
                        style={{ width: `${stockOpnameHistory[0].accuracy}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-3 bg-gray-50 mt-3">
                    <div className="text-sm font-medium text-gray-700 mb-1">Catatan:</div>
                    <div className="text-xs text-gray-600">
                      {stockOpnameHistory[0].notes}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <div className="text-sm font-medium text-gray-700">
                      Selisih Nilai:
                    </div>
                    <div className={`text-sm font-bold ${stockOpnameHistory[0].valueDifference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatRupiah(stockOpnameHistory[0].valueDifference)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  Belum ada data stock opname
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-gray-50 border-t">
              <div className="w-full">
                <Link href="/inventory/stocktake" className="w-full">
                  <Button className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600">
                    <FaClipboardCheck className="mr-2 h-4 w-4" /> Mulai Stock Opname Baru
                  </Button>
                </Link>
              </div>
            </CardFooter>
          </Card>

          {/* Menu Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {menuCards.filter(card => card.title !== 'Penerimaan Barang').map((card) => (
              <Link href={card.link} key={card.id}>
                <div className="h-full">
                  <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow h-full group">
                    <CardContent className="pt-6 px-5 pb-5 h-full flex flex-col">
                      <div className="flex items-center mb-4">
                        <div className="bg-gradient-to-r from-red-600 to-orange-500 p-2.5 rounded-lg mr-4 transform transition-all duration-300 group-hover:scale-110 shadow-md">
                          <card.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="transform-gpu transition-all duration-300">
                          <h3 className="font-bold text-gray-800 text-lg group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-red-600 group-hover:to-orange-500 transition-all duration-300">
                            {card.title}
                          </h3>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm mt-3 min-h-[3rem] transform transition-all duration-300 group-hover:translate-y-[-2px]">
                        {card.description}
                      </p>
                      
                      <div className="mt-4 pt-3 border-t border-gray-100 group-hover:border-red-100 transition-colors duration-300 flex justify-end">
                        <div className="relative text-sm font-medium text-red-600 hover:text-orange-600 flex items-center group-hover:translate-x-1 transition-all duration-300">
                          <span>Buka</span>
                          <FaArrowRight className="ml-1.5 h-3 w-3 transform transition-transform duration-300 group-hover:translate-x-1" />
                          <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-red-600 to-orange-500 group-hover:w-full transition-all duration-300"></span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </Link>
            ))}
          </div>

          {/* Row for additional cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
            {/* Low Stock Widget */}
            <div className="lg:col-span-1">
              <LowStockWidget limit={5} showViewMore={true} compact={false} />
            </div>
            {/* Produk yang akan kadaluarsa */}
            <Card className="overflow-hidden border-0 shadow-md bg-white">
              <div className="h-1.5 bg-gradient-to-r from-red-600 to-orange-500"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center">
                  <div className="bg-red-100 p-2 rounded-full mr-3">
                    <FaCalendarAlt className="h-4 w-4 text-red-600" />
                  </div>
                  Produk yang Akan Kadaluarsa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {expiringProducts.length > 0 ? (
                    expiringProducts.map((product) => {
                      const daysLeft = getDayDifference(today, product.expiryDate);
                      let bgColor = "bg-white";
                      let textColor = "text-gray-800";
                      
                      if (daysLeft <= 30) {
                        bgColor = "bg-red-50";
                        textColor = "text-red-700";
                      } else if (daysLeft <= 60) {
                        bgColor = "bg-orange-50";
                        textColor = "text-orange-700";
                      }
                      
                      return (
                        <div 
                          key={product.id} 
                          className={`flex items-center justify-between p-3 border rounded-lg ${bgColor} cursor-pointer hover:shadow-md transition-shadow`}
                          onClick={() => handleProductClick(product)}
                        >
                          <div className="flex items-center">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-red-600 to-orange-500 flex items-center justify-center mr-3 text-white">
                              <FaBoxOpen className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className={`font-medium ${textColor}`}>{product.name}</div>
                              <div className="text-xs text-gray-500">
                                {product.category} • Stok: {product.stock}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${textColor}`}>{formatDate(product.expiryDate)}</div>
                            <div className={`text-xs ${daysLeft <= 30 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                              {daysLeft} hari lagi
                            </div>
                            <div className="text-xs text-blue-600 mt-1 flex items-center">
                              <FaArrowRight className="h-2 w-2 mr-1" />
                              Klik untuk detail
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      Tidak ada produk yang akan kadaluarsa dalam 90 hari
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Produk yang memerlukan order */}
            <Card className="overflow-hidden border-0 shadow-md bg-white">
              <div className="h-1.5 bg-gradient-to-r from-red-600 to-orange-500"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center">
                  <div className="bg-red-100 p-2 rounded-full mr-3">
                    <FaShoppingBasket className="h-4 w-4 text-red-600" />
                  </div>
                  Produk yang Memerlukan Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {needOrderProducts.length > 0 ? (
                    needOrderProducts.map((product) => {
                      const stockRatio = product.stock / product.minStock;
                      let bgColor = "bg-white";
                      let textColor = "text-gray-800";
                      
                      if (stockRatio < 0.5) {
                        bgColor = "bg-red-50";
                        textColor = "text-red-700";
                      } else if (stockRatio < 0.8) {
                        bgColor = "bg-orange-50";
                        textColor = "text-orange-700";
                      }
                      
                      return (
                        <div 
                          key={product.id} 
                          className={`flex items-center justify-between p-3 border rounded-lg ${bgColor} cursor-pointer hover:shadow-md transition-shadow`}
                          onClick={() => handleProductClick(product)}
                        >
                          <div className="flex items-center">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-red-600 to-orange-500 flex items-center justify-center mr-3 text-white">
                              <FaExclamationTriangle className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className={`font-medium ${textColor}`}>{product.name}</div>
                              <div className="text-xs text-gray-500">
                                {product.category}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <div className="text-xs text-gray-500 w-12 text-right">Min: {product.minStock}</div>
                              <div className="w-16 h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-red-600 to-orange-500" 
                                  style={{ width: `${(product.stock / product.minStock) * 100}%` }}
                                ></div>
                              </div>
                              <div className={`font-medium ${textColor}`}>{product.stock}</div>
                            </div>
                            <div className="text-xs text-red-600 font-medium mt-1">
                              Order {product.minStock - product.stock} unit
                            </div>
                            <div className="text-xs text-blue-600 mt-1 flex items-center">
                              <FaArrowRight className="h-2 w-2 mr-1" />
                              Klik untuk detail
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      Tidak ada produk yang memerlukan order
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Product Detail Modal */}
        <ProductDetailModal
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }}
          onAddToDefekta={handleAddToDefekta}
        />
      </InventoryPageLayout>
    );
  } catch (error) {
    console.error('Error rendering InventoryPage:', error);
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Terjadi kesalahan saat memuat halaman Inventori</h2>
        <p className="text-gray-600 mb-4">Silakan refresh halaman atau hubungi administrator.</p>
        <Button 
          className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
          onClick={() => window.location.reload()}
        >
          Refresh Halaman
        </Button>
      </div>
    );
  }
};

export default InventoryPage;
