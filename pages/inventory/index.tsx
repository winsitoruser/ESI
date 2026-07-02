import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import BranchSelector from '@/components/settings/BranchSelector';
import { useBranches } from '@/hooks/useBranches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ProductDetailModal, { ProductDetail } from '@/components/inventory/ProductDetailModal';
import InventoryAlerts from '@/components/inventory/InventoryAlerts';
import {
  FaBoxOpen, FaLayerGroup, FaExclamationTriangle, FaChartBar,
  FaArrowRight, FaDollarSign, FaShoppingCart, FaCoins,
  FaPlus, FaSearch, FaFilter, FaDownload, FaUpload,
  FaWarehouse, FaTruck, FaClipboardList, FaChartLine,
  FaList, FaTh, FaTable, FaUndo, FaExchangeAlt
} from 'react-icons/fa';

const InventoryPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, formatCurrency } = useTranslation();
  const { branches, selectedBranch, setSelectedBranch } = useBranches();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [displayedItems, setDisplayedItems] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const MOCK_INV_STATS = { totalProducts: 320, totalValue: 450000000, lowStockCount: 12, outOfStockCount: 3, categories: 18, recentActivity: 45 };
  const MOCK_INV_PRODUCTS = [
    { id: 'p1', name: 'Paracetamol 500mg', sku: 'PCM-500', category: 'Obat Bebas', stock: 245, unit: 'strip', price: 15000, purchasePrice: 10000, status: 'active' },
    { id: 'p2', name: 'Amoxicillin 500mg', sku: 'AMX-500', category: 'Antibiotik', stock: 8, unit: 'strip', price: 35000, purchasePrice: 25000, status: 'low_stock' },
    { id: 'p3', name: 'Vitamin C 1000mg', sku: 'VTC-1000', category: 'Vitamin', stock: 180, unit: 'tablet', price: 5000, purchasePrice: 3000, status: 'active' },
  ];
  const MOCK_INV_ACTIVITIES = [
    { id: 'a1', type: 'stock_in', description: 'Penerimaan barang dari PT Supplier A', quantity: 500, date: new Date().toISOString() },
    { id: 'a2', type: 'stock_out', description: 'Penjualan harian', quantity: 45, date: new Date().toISOString() },
  ];
  const [stats, setStats] = useState<any>(MOCK_INV_STATS);
  const [products, setProducts] = useState<any[]>(MOCK_INV_PRODUCTS);
  const [totalProducts, setTotalProducts] = useState(320);
  const [activities, setActivities] = useState<any[]>(MOCK_INV_ACTIVITIES);
  const [liveUpdates, setLiveUpdates] = useState<any[]>([]);

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBranch) {
        params.append('branchId', selectedBranch.id);
      }
      const response = await fetch(`/api/inventory/stats?${params}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(MOCK_INV_STATS);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (selectedBranch) {
        params.append('branchId', selectedBranch.id);
      }

      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();
      if (data.success) {
        setProducts(data.data || []);
        setTotalProducts(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts(MOCK_INV_PRODUCTS);
      setTotalProducts(MOCK_INV_PRODUCTS.length);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/inventory/activities?limit=10');
      const data = await response.json();
      if (data.success) {
        setActivities(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities(MOCK_INV_ACTIVITIES);
    }
  };

  const fetchLiveUpdates = async () => {
    try {
      const response = await fetch('/api/inventory/live-updates');
      const data = await response.json();
      if (data.success && data.data) {
        setLiveUpdates(data.data);
      }
    } catch (error) {
      console.error('Error fetching live updates:', error);
      // Keep existing updates if fetch fails
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  // Fetch stats on mount and when branch changes
  useEffect(() => {
    fetchStats();
    fetchActivities();
    fetchLiveUpdates();
    
    // Refresh live updates every 30 seconds
    const interval = setInterval(() => {
      fetchLiveUpdates();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [selectedBranch]);

  // Fetch products when page, search, or branch changes
  useEffect(() => {
    fetchProducts();
  }, [currentPage, itemsPerPage, searchQuery, selectedBranch]);

  // Use real stats from API or fallback to loading state
  const statsData = stats || {
    totalProducts: 0,
    totalValue: 0,
    lowStock: 0,
    outOfStock: 0,
    categories: 0,
    suppliers: 0
  };

  // Products now come from API

  // Activities now come from API


  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  // Pagination logic - now handled by API
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalProducts);
  const paginatedProducts = products;

  // Load more logic (for infinite scroll) - now handled by pagination

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedItems(prev => Math.min(prev + 12, totalProducts));
      setIsLoadingMore(false);
    }, 500);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-sky-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">{t('inventory.loading')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>{t('inventory.pageTitle')}</title>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            display: inline-block;
            animation: marquee 40s linear infinite;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
        `}</style>
      </Head>

      <div className="space-y-6">
        {/* Header - Enhanced */}
        <div className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <FaBoxOpen className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">{t('inventory.title')}</h1>
                    <p className="text-green-100 text-sm">{t('inventory.subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="hidden lg:flex items-center space-x-4">
                <div className="text-right bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
                  <p className="text-xs text-green-100">{t('inventory.lastUpdate')}</p>
                  <p className="text-sm font-bold">{t('inventory.todayTime')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Branch Selector */}
        {branches.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <BranchSelector
              branches={branches}
              selectedBranch={selectedBranch}
              onSelect={setSelectedBranch}
            />
          </div>
        )}

        {/* Marquee Ticker - Stock Alerts & Updates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2">
            <div className="flex items-center space-x-2">
              <FaExclamationTriangle className="text-white animate-pulse" />
              <span className="text-white font-semibold text-sm">{t('inventory.liveUpdates')}</span>
              <span className="text-xs text-white/80 ml-2">({liveUpdates.length} {t('inventory.alertsCount')})</span>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 py-3">
            {liveUpdates.length === 0 ? (
              <div className="text-center py-2">
                <span className="text-sm text-gray-600">{t('inventory.loadingLiveUpdates')}</span>
              </div>
            ) : (
              <div className="animate-marquee whitespace-nowrap">
                {liveUpdates.map((update, index) => {
                  const iconColor = update.severity === 'critical' ? 'text-red-600' : 
                                   update.severity === 'warning' ? 'text-yellow-600' : 
                                   update.severity === 'info' ? 'text-green-600' : 'text-blue-600';
                  
                  const Icon = update.type === 'fast_moving' ? FaChartLine :
                              update.type === 'purchase_suggestion' ? FaTruck :
                              FaExclamationTriangle;
                  
                  return (
                    <span key={index} className="inline-flex items-center mx-8">
                      <Icon className={`${iconColor} mr-2`} />
                      <span className="text-sm font-medium text-gray-900">
                        {update.icon} {update.message}
                      </span>
                    </span>
                  );
                })}
                {/* Duplicate for seamless loop */}
                {liveUpdates.map((update, index) => {
                  const iconColor = update.severity === 'critical' ? 'text-red-600' : 
                                   update.severity === 'warning' ? 'text-yellow-600' : 
                                   update.severity === 'info' ? 'text-green-600' : 'text-blue-600';
                  
                  const Icon = update.type === 'fast_moving' ? FaChartLine :
                              update.type === 'purchase_suggestion' ? FaTruck :
                              FaExclamationTriangle;
                  
                  return (
                    <span key={`dup-${index}`} className="inline-flex items-center mx-8">
                      <Icon className={`${iconColor} mr-2`} />
                      <span className="text-sm font-medium text-gray-900">
                        {update.icon} {update.message}
                      </span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid - Elegant 2x3 Layout */}
        <div className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('inventory.totalProducts')}</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">{statsData.totalProducts}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                    <FaBoxOpen className="text-white text-xl" />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-2 border-t border-blue-100">
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    {stats?.recentChanges?.products ? `+${stats.recentChanges.products} ${t('inventory.thisMonthShort')}` : t('common.loading')}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('inventory.stockValue')}</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">{formatCurrency(statsData.totalValue)}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                    <FaDollarSign className="text-white text-xl" />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-2 border-t border-green-100">
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    {stats?.recentChanges?.valuePercentage ? `+${stats.recentChanges.valuePercentage}% ${t('inventory.fromLastMonth')}` : t('common.loading')}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('inventory.lowStock')}</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">{statsData.lowStock}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                    <FaExclamationTriangle className="text-white text-xl" />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-2 border-t border-yellow-100">
                  <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">⚠️ {t('inventory.needsAttention')}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-red-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('inventory.outOfStock')}</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">{statsData.outOfStock}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform animate-pulse">
                    <FaExclamationTriangle className="text-white text-xl" />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-2 border-t border-red-100">
                  <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded-full">🚨 {t('inventory.restockNow')}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('inventory.categories')}</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">{statsData.categories}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                    <FaLayerGroup className="text-white text-xl" />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-2 border-t border-purple-100">
                  <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">✓ {t('inventory.active')}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('inventory.suppliers')}</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">{statsData.suppliers}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                    <FaTruck className="text-white text-xl" />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-2 border-t border-indigo-100">
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">✓ {t('inventory.registered')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions - Enhanced */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{t('dashboard.quickActions')}</CardTitle>
              <Link href="/inventory/master">
                <Button className="h-8 px-4 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white text-sm">
                  <FaLayerGroup className="mr-2 text-xs" />
                  {t('inventory.masterInventory')}
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Row 1 - 5 cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Link href="/inventory/products/new">
                <div className="group relative overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 rounded-lg p-4 transition-all duration-300 hover:shadow-md cursor-pointer border border-blue-200">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-blue-300 rounded-lg flex items-center justify-center mb-2">
                      <FaPlus className="text-lg text-blue-700" />
                    </div>
                    <span className="text-xs font-medium text-center text-blue-900">{t('inventory.addProduct')}</span>
                  </div>
                </div>
              </Link>
              <Link href="/inventory/alerts">
                <div className="group relative overflow-hidden bg-gradient-to-br from-amber-100 to-orange-200 hover:from-amber-200 hover:to-orange-300 rounded-lg p-4 transition-all duration-300 hover:shadow-md cursor-pointer border border-amber-200">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-amber-300 rounded-lg flex items-center justify-center mb-2">
                      <FaExclamationTriangle className="text-lg text-amber-700" />
                    </div>
                    <span className="text-xs font-medium text-center text-amber-900">{t('inventory.alertsSuggestions')}</span>
                  </div>
                </div>
              </Link>
              <Link href="/inventory/stock-opname">
                <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-100 to-indigo-200 hover:from-indigo-200 hover:to-indigo-300 rounded-lg p-4 transition-all duration-300 hover:shadow-md cursor-pointer border border-indigo-200">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-indigo-300 rounded-lg flex items-center justify-center mb-2">
                      <FaClipboardList className="text-lg text-indigo-700" />
                    </div>
                    <span className="text-xs font-medium text-center text-indigo-900">{t('inventory.stockOpnameLabel')}</span>
                  </div>
                </div>
              </Link>
              <Link href="/inventory/create-purchase-order">
                <div className="group relative overflow-hidden bg-gradient-to-br from-green-100 to-emerald-200 hover:from-green-200 hover:to-emerald-300 rounded-lg p-4 transition-all duration-300 hover:shadow-md cursor-pointer border border-green-200">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-green-300 rounded-lg flex items-center justify-center mb-2">
                      <FaShoppingCart className="text-lg text-green-700" />
                    </div>
                    <span className="text-xs font-medium text-center text-green-900">{t('inventory.purchaseOrder')}</span>
                  </div>
                </div>
              </Link>
              <Link href="/inventory/receive">
                <div className="group relative overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 rounded-lg p-4 transition-all duration-300 hover:shadow-md cursor-pointer border border-purple-200">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-purple-300 rounded-lg flex items-center justify-center mb-2">
                      <FaTruck className="text-lg text-purple-700" />
                    </div>
                    <span className="text-xs font-medium text-center text-purple-900">{t('inventory.receiveProduct')}</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Row 2 - 5 cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Link href="/inventory/production">
                <div className="group relative overflow-hidden bg-gradient-to-br from-pink-100 to-rose-200 hover:from-pink-200 hover:to-rose-300 rounded-lg p-4 transition-all duration-300 hover:shadow-md cursor-pointer border border-pink-200">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-pink-300 rounded-lg flex items-center justify-center mb-2">
                      <FaWarehouse className="text-lg text-pink-700" />
                    </div>
                    <span className="text-xs font-medium text-center text-pink-900">{t('inventory.productionLabel')}</span>
                  </div>
                </div>
              </Link>
              <Link href="/inventory/reports">
                <div className="group relative overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200 hover:from-orange-200 hover:to-orange-300 rounded-lg p-4 transition-all duration-300 hover:shadow-md cursor-pointer border border-orange-200">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-orange-300 rounded-lg flex items-center justify-center mb-2">
                      <FaChartBar className="text-lg text-orange-700" />
                    </div>
                    <span className="text-xs font-medium text-center text-orange-900">{t('inventory.reportsLabel')}</span>
                  </div>
                </div>
              </Link>
              <Link href="/inventory/returns">
                <div className="group relative overflow-hidden bg-gradient-to-br from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 rounded-lg p-4 transition-all duration-300 hover:shadow-md cursor-pointer border border-red-200">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-red-300 rounded-lg flex items-center justify-center mb-2">
                      <FaUndo className="text-lg text-red-700" />
                    </div>
                    <span className="text-xs font-medium text-center text-red-900">{t('inventory.returnsLabel')}</span>
                  </div>
                </div>
              </Link>
              <Link href="/inventory/transfers">
                <div className="group relative overflow-hidden bg-gradient-to-br from-cyan-100 to-cyan-200 hover:from-cyan-200 hover:to-cyan-300 rounded-lg p-4 transition-all duration-300 hover:shadow-md cursor-pointer border border-cyan-200">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-cyan-300 rounded-lg flex items-center justify-center mb-2">
                      <FaExchangeAlt className="text-lg text-cyan-700" />
                    </div>
                    <span className="text-xs font-medium text-center text-cyan-900">{t('inventory.transfer')}</span>
                  </div>
                </div>
              </Link>
              <Link href="/inventory/rac">
                <div className="group relative overflow-hidden bg-gradient-to-br from-violet-100 to-violet-200 hover:from-violet-200 hover:to-violet-300 rounded-lg p-4 transition-all duration-300 hover:shadow-md cursor-pointer border border-violet-200">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-violet-300 rounded-lg flex items-center justify-center mb-2">
                      <FaClipboardList className="text-lg text-violet-700" />
                    </div>
                    <span className="text-xs font-medium text-center text-violet-900">{t('inventory.stockRequest')}</span>
                  </div>
                </div>
              </Link>
            </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Recommendations Dashboard */}
        <InventoryAlerts showInDashboard={true} />

        <div className="grid grid-cols-1 gap-6">
          {/* Products List - Enhanced - Full Width */}
          <div>
            <Card className="shadow-lg border-0">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <CardTitle className="text-xl">{t('inventory.productList')}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{totalProducts} {t('inventory.productsFound')}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* View Mode Toggle */}
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-2 text-sm transition-colors ${
                          viewMode === 'list' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                        title={t('inventory.viewList')}
                      >
                        <FaList />
                      </button>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-2 text-sm transition-colors border-l border-r border-gray-300 ${
                          viewMode === 'grid' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                        title={t('inventory.viewGrid')}
                      >
                        <FaTh />
                      </button>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-2 text-sm transition-colors ${
                          viewMode === 'table' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                        title={t('inventory.viewTable')}
                      >
                        <FaTable />
                      </button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hover:bg-gray-50"
                      onClick={() => alert(t('inventory.filterComingSoon'))}
                    >
                      <FaFilter className="mr-2" />
                      {t('common.filter')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hover:bg-gray-50"
                      onClick={() => alert(t('inventory.exportComingSoon'))}
                    >
                      <FaDownload className="mr-2" />
                      {t('inventory.reports.export')}
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="bg-cyan-600 hover:bg-cyan-700 text-white"
                      onClick={() => router.push('/products/hpp-analysis')}
                    >
                      <FaChartLine className="mr-2" />
                      {t('inventory.hppAnalysis')}
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder={t('inventory.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-gray-300 focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin h-12 w-12 mx-auto border-4 border-green-600 border-t-transparent rounded-full mb-4"></div>
                      <p className="text-gray-600">{t('inventory.loadingProducts')}</p>
                    </div>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12">
                    <FaBoxOpen className="mx-auto text-6xl text-gray-300 mb-4" />
                    <p className="text-gray-600 text-lg">{t('inventory.noProducts')}</p>
                    <p className="text-gray-500 text-sm mt-2">{t('inventory.tryChangeFilter')}</p>
                  </div>
                ) : (
                  <>
                {/* List View */}
                {viewMode === 'list' && (
                  <div className="space-y-3">
                    {paginatedProducts.map((product) => {
                      const stockPercentage = (product.stock / (product.minStock * 3)) * 100;
                      const isLowStock = product.stock <= product.minStock;
                      const isOutOfStock = product.stock === 0;

                      return (
                        <div
                          key={product.id}
                          onClick={() => handleProductClick(product)}
                          className="p-5 border border-gray-200 rounded-xl hover:shadow-lg hover:border-green-300 transition-all duration-300 cursor-pointer bg-white"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FaBoxOpen className="text-gray-600 text-lg" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                                <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                              </div>
                            </div>
                            <Badge 
                              variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'default'}
                              className={isOutOfStock ? 'bg-red-100 text-red-700' : isLowStock ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}
                            >
                              {isOutOfStock ? t('inventory.statusOutOfStock') : isLowStock ? t('inventory.statusLow') : t('inventory.statusNormal')}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">{t('inventory.category')}</p>
                              <p className="text-sm font-semibold text-gray-900">{product.category}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">{t('inventory.sellingPrice')}</p>
                              <p className="text-sm font-semibold text-green-600">
                                {formatCurrency(product.price)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">{t('inventory.stock')}</p>
                              <p className="text-sm font-semibold text-gray-900">{product.stock} unit</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600 font-medium">{t('inventory.stockLevel')}: {product.stock}/{product.minStock * 3}</span>
                              <span className="font-bold text-gray-900">{stockPercentage.toFixed(0)}%</span>
                            </div>
                            <div className="relative">
                              <Progress 
                                value={stockPercentage} 
                                className={`h-2 ${isOutOfStock ? 'bg-red-100' : isLowStock ? 'bg-yellow-100' : 'bg-green-100'}`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Grid View */}
                {viewMode === 'grid' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {paginatedProducts.map((product) => {
                      const stockPercentage = (product.stock / (product.minStock * 3)) * 100;
                      const isLowStock = product.stock <= product.minStock;
                      const isOutOfStock = product.stock === 0;

                      return (
                        <div
                          key={product.id}
                          onClick={() => handleProductClick(product)}
                          className="p-4 border border-gray-200 rounded-xl hover:shadow-lg hover:border-green-300 transition-all duration-300 cursor-pointer bg-white"
                        >
                          <div className="flex flex-col items-center text-center mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mb-3">
                              <FaBoxOpen className="text-gray-600 text-2xl" />
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                            <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                            <Badge 
                              variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'default'}
                              className={`mt-2 ${isOutOfStock ? 'bg-red-100 text-red-700' : isLowStock ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}
                            >
                              {isOutOfStock ? t('inventory.statusOutOfStock') : isLowStock ? t('inventory.statusLow') : t('inventory.statusNormal')}
                            </Badge>
                          </div>

                          <div className="space-y-3 mb-4">
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                              <span className="text-xs text-gray-500">{t('inventory.category')}</span>
                              <span className="text-sm font-semibold text-gray-900">{product.category}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                              <span className="text-xs text-gray-500">{t('inventory.price')}</span>
                              <span className="text-sm font-semibold text-green-600">{formatCurrency(product.price)}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                              <span className="text-xs text-gray-500">{t('inventory.stock')}</span>
                              <span className="text-sm font-semibold text-gray-900">{product.stock} unit</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">{t('inventory.stockLevel')}</span>
                              <span className="font-bold text-gray-900">{stockPercentage.toFixed(0)}%</span>
                            </div>
                            <Progress 
                              value={stockPercentage} 
                              className={`h-2 ${isOutOfStock ? 'bg-red-100' : isLowStock ? 'bg-yellow-100' : 'bg-green-100'}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Table View */}
                {viewMode === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left p-4 text-sm font-semibold text-gray-700">{t('inventory.productCol')}</th>
                          <th className="text-left p-4 text-sm font-semibold text-gray-700">SKU</th>
                          <th className="text-left p-4 text-sm font-semibold text-gray-700">{t('inventory.category')}</th>
                          <th className="text-right p-4 text-sm font-semibold text-gray-700">HPP</th>
                          <th className="text-right p-4 text-sm font-semibold text-gray-700">{t('inventory.sellingPrice')}</th>
                          <th className="text-right p-4 text-sm font-semibold text-gray-700">Margin</th>
                          <th className="text-center p-4 text-sm font-semibold text-gray-700">{t('inventory.stock')}</th>
                          <th className="text-center p-4 text-sm font-semibold text-gray-700">Level</th>
                          <th className="text-center p-4 text-sm font-semibold text-gray-700">{t('common.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedProducts.map((product) => {
                          const stockPercentage = (product.stock / (product.minStock * 3)) * 100;
                          const isLowStock = product.stock <= product.minStock;
                          const isOutOfStock = product.stock === 0;
                          
                          // HPP Calculations
                          const hpp = product.hpp || 0;
                          const sellingPrice = product.price || 0;
                          const marginAmount = sellingPrice - hpp;
                          const marginPercentage = hpp > 0 ? ((marginAmount / sellingPrice) * 100) : 0;
                          const minMarginPercentage = product.minMarginPercentage || 20;
                          
                          // HPP Status
                          const hppStatus = marginPercentage >= minMarginPercentage ? 'healthy' : 
                                           marginPercentage >= 0 ? 'warning' : 'critical';

                          return (
                            <tr 
                              key={product.id}
                              onClick={() => handleProductClick(product)}
                              className="border-b border-gray-100 hover:bg-green-50 transition-colors cursor-pointer"
                            >
                              <td className="p-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FaBoxOpen className="text-gray-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <p className="text-sm text-gray-600">{product.sku}</p>
                              </td>
                              <td className="p-4">
                                <p className="text-sm text-gray-900">{product.category}</p>
                              </td>
                              <td className="p-4 text-right">
                                {hpp > 0 ? (
                                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(hpp)}</p>
                                ) : (
                                  <p className="text-xs text-gray-400">-</p>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <p className="text-sm font-semibold text-green-600">{formatCurrency(sellingPrice)}</p>
                              </td>
                              <td className="p-4 text-right">
                                {hpp > 0 ? (
                                  <div>
                                    <p className={`text-sm font-semibold ${
                                      marginAmount >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {formatCurrency(marginAmount)}
                                    </p>
                                    <p className={`text-xs font-bold ${
                                      hppStatus === 'healthy' ? 'text-green-600' : 
                                      hppStatus === 'warning' ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {marginPercentage.toFixed(1)}%
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400">-</p>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <p className="text-sm font-semibold text-gray-900">{product.stock} unit</p>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center space-x-2">
                                  <div className="flex-1">
                                    <Progress 
                                      value={stockPercentage} 
                                      className={`h-2 ${isOutOfStock ? 'bg-red-100' : isLowStock ? 'bg-yellow-100' : 'bg-green-100'}`}
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-gray-900 w-10 text-right">{stockPercentage.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Badge 
                                    variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'default'}
                                    className={isOutOfStock ? 'bg-red-100 text-red-700' : isLowStock ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}
                                  >
                                    {isOutOfStock ? t('inventory.statusOutOfStock') : isLowStock ? t('inventory.statusLow') : t('inventory.statusNormal')}
                                  </Badge>
                                  {hpp > 0 && (
                                    <Badge 
                                      className={`text-xs ${
                                        hppStatus === 'healthy' ? 'bg-green-100 text-green-700' : 
                                        hppStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' : 
                                        'bg-red-100 text-red-700'
                                      }`}
                                    >
                                      {hppStatus === 'healthy' ? '✓ HPP' : hppStatus === 'warning' ? '⚠ HPP' : '✗ HPP'}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                  </>
                )}
              </CardContent>
              
              {/* Pagination Controls */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{t('inventory.show')}:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value={12}>12 {t('inventory.perPage')}</option>
                      <option value={24}>24 {t('inventory.perPage')}</option>
                      <option value={48}>48 {t('inventory.perPage')}</option>
                      <option value={100}>100 {t('inventory.perPage')}</option>
                    </select>
                    <span className="text-sm text-gray-600">
                      {t('inventory.showing')} {startIndex + 1}-{endIndex} {t('inventory.of')} {totalProducts} {t('inventory.productsLabel')}
                    </span>
                  </div>

                  {/* Pagination Buttons */}
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="px-3"
                    >
                      {t('inventory.first')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3"
                    >
                      {t('common.previous')}
                    </Button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            size="sm"
                            variant={currentPage === pageNum ? "default" : "outline"}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 ${currentPage === pageNum ? 'bg-green-600 hover:bg-green-700' : ''}`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3"
                    >
                      {t('common.next')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3"
                    >
                      {t('inventory.last')}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onEdit={(product) => {
          setShowProductModal(false);
          router.push(`/inventory/products/${product.id}/edit`);
        }}
        onDelete={async (productId) => {
          if (confirm(t('inventory.confirmDelete'))) {
            try {
              const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
              });
              if (response.ok) {
                alert(t('inventory.deleteSuccess'));
                setShowProductModal(false);
                window.location.reload();
              } else {
                alert(t('inventory.deleteFailed'));
              }
            } catch (error) {
              console.error('Error deleting product:', error);
              alert(t('inventory.deleteError'));
            }
          }
        }}
      />

    </DashboardLayout>
  );
};

export default InventoryPage;
