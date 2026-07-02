import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FaChartLine, FaFilter, FaDownload, FaExclamationTriangle,
  FaCheckCircle, FaTimesCircle, FaSearch, FaDollarSign,
  FaBoxOpen, FaPercentage, FaArrowUp, FaArrowDown,
  FaList, FaTh, FaTable
} from 'react-icons/fa';

interface ProductHpp {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  hpp: number;
  sellingPrice: number;
  marginAmount: number;
  marginPercentage: number;
  minMarginPercentage: number;
  status: 'healthy' | 'warning' | 'critical';
}

const HppAnalysisPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  
  const [products, setProducts] = useState<ProductHpp[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductHpp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    averageMargin: 0,
    lowMarginCount: 0,
    negativeMarginCount: 0,
    healthyCount: 0
  });
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [minMargin, setMinMargin] = useState<string>('');
  const [maxMargin, setMaxMargin] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [liveUpdates, setLiveUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchAnalysis();
      fetchLiveUpdates();
    }
  }, [session, sortBy]);

  const fetchLiveUpdates = async () => {
    try {
      const response = await fetch('/api/products/hpp/analysis');
      const data = await response.json();
      if (data.success && data.data) {
        const updates = [];
        if (data.summary.negativeMarginCount > 0) {
          updates.push({
            icon: '🚨',
            message: `${data.summary.negativeMarginCount} produk dengan margin negatif - Segera review pricing!`,
            severity: 'critical',
            type: 'negative_margin'
          });
        }
        if (data.summary.lowMarginCount > 0) {
          updates.push({
            icon: '⚠️',
            message: `${data.summary.lowMarginCount} produk dengan margin rendah - Perlu perhatian`,
            severity: 'warning',
            type: 'low_margin'
          });
        }
        if (data.summary.averageMargin > 0) {
          updates.push({
            icon: '📊',
            message: `Rata-rata margin: ${data.summary.averageMargin.toFixed(2)}% - ${data.summary.averageMargin >= 30 ? 'Sangat baik!' : 'Perlu optimasi'}`,
            severity: 'info',
            type: 'avg_margin'
          });
        }
        setLiveUpdates(updates);
      }
    } catch (error) {
      console.error('Error fetching live updates:', error);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [products, searchQuery, filterStatus, minMargin, maxMargin]);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (sortBy) params.append('sortBy', sortBy);
      
      const response = await fetch(`/api/products/hpp/analysis?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data);
        setSummary(data.summary);
      } else {
        console.error('Failed to fetch HPP analysis:', data.error);
      }
    } catch (error) {
      console.error('Error fetching HPP analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.productName.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }
    
    if (minMargin) {
      filtered = filtered.filter(p => p.marginPercentage >= parseFloat(minMargin));
    }
    
    if (maxMargin) {
      filtered = filtered.filter(p => p.marginPercentage <= parseFloat(maxMargin));
    }
    
    setFilteredProducts(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <FaCheckCircle className="text-green-500" />;
      case 'warning': return <FaExclamationTriangle className="text-yellow-500" />;
      case 'critical': return <FaTimesCircle className="text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const exportToCSV = () => {
    const headers = ['Product Name', 'SKU', 'Category', 'HPP', 'Selling Price', 'Margin Amount', 'Margin %', 'Status'];
    const rows = filteredProducts.map(p => [
      p.productName,
      p.sku,
      p.category,
      p.hpp,
      p.sellingPrice,
      p.marginAmount,
      p.marginPercentage,
      p.status
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hpp-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredProducts.length);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-sky-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Loading HPP analysis...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Analisa HPP | BEDAGANG Cloud POS</title>
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
        {/* Header - Enhanced with Gradient */}
        <div className="bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <FaChartLine className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Analisa HPP (Harga Pokok Penjualan)</h1>
                    <p className="text-cyan-100 text-sm">Analisa biaya produk dan margin keuntungan untuk optimasi pricing</p>
                  </div>
                </div>
              </div>
              <div className="hidden lg:flex items-center space-x-4">
                <div className="text-right bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
                  <p className="text-xs text-cyan-100">Update Terakhir</p>
                  <p className="text-sm font-bold">Hari ini, {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Marquee Ticker - HPP Alerts & Updates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2">
            <div className="flex items-center space-x-2">
              <FaExclamationTriangle className="text-white animate-pulse" />
              <span className="text-white font-semibold text-sm">Live Updates</span>
              <span className="text-xs text-white/80 ml-2">({liveUpdates.length} alerts)</span>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-r from-orange-50 to-red-50 py-3">
            {liveUpdates.length === 0 ? (
              <div className="text-center py-2">
                <span className="text-sm text-gray-600">Memuat live updates...</span>
              </div>
            ) : (
              <div className="animate-marquee whitespace-nowrap">
                {liveUpdates.map((update, index) => {
                  const iconColor = update.severity === 'critical' ? 'text-red-600' : 
                                   update.severity === 'warning' ? 'text-yellow-600' : 
                                   'text-blue-600';
                  
                  return (
                    <span key={index} className="inline-flex items-center mx-8">
                      <span className="text-sm font-medium text-gray-900">
                        {update.icon} {update.message}
                      </span>
                    </span>
                  );
                })}
                {liveUpdates.map((update, index) => (
                  <span key={`dup-${index}`} className="inline-flex items-center mx-8">
                    <span className="text-sm font-medium text-gray-900">
                      {update.icon} {update.message}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid - Enhanced with Gradient Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Produk</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">{summary.totalProducts}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                  <FaBoxOpen className="text-white text-xl" />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2 border-t border-blue-100">
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Dengan HPP</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Rata-rata Margin</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-800 bg-clip-text text-transparent">{summary.averageMargin.toFixed(2)}%</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                  <FaPercentage className="text-white text-xl" />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2 border-t border-cyan-100">
                <span className="text-xs font-semibold text-cyan-600 bg-cyan-50 px-2 py-1 rounded-full">
                  {summary.averageMargin >= 30 ? '✓ Sangat Baik' : summary.averageMargin >= 20 ? '✓ Baik' : '⚠️ Perlu Optimasi'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Margin Sehat</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">{summary.healthyCount}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                  <FaCheckCircle className="text-white text-xl" />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2 border-t border-green-100">
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ Di atas minimum</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Margin Rendah</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">{summary.lowMarginCount}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                  <FaExclamationTriangle className="text-white text-xl" />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2 border-t border-yellow-100">
                <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">⚠️ Perlu perhatian</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-red-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Margin Negatif</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">{summary.negativeMarginCount}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform animate-pulse">
                  <FaTimesCircle className="text-white text-xl" />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2 border-t border-red-100">
                <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded-full">🚨 Segera review</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products List - Enhanced */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle className="text-xl">Daftar Produk & Analisa HPP</CardTitle>
                <p className="text-sm text-gray-500 mt-1">{filteredProducts.length} produk ditemukan</p>
              </div>
              <div className="flex items-center space-x-2">
                {/* View Mode Toggle */}
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-2 text-sm transition-colors ${
                      viewMode === 'table' 
                        ? 'bg-cyan-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Table View"
                  >
                    <FaTable />
                  </button>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="hover:bg-gray-50"
                  onClick={exportToCSV}
                >
                  <FaDownload className="mr-2" />
                  Export
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari produk, SKU, atau kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-300 focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="healthy">Margin Sehat</option>
                  <option value="warning">Margin Rendah</option>
                  <option value="critical">Margin Negatif</option>
                </select>

                <input
                  type="number"
                  value={minMargin}
                  onChange={(e) => setMinMargin(e.target.value)}
                  placeholder="Min Margin %"
                  className="border border-gray-300 rounded-lg px-3 py-2 w-32 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />

                <input
                  type="number"
                  value={maxMargin}
                  onChange={(e) => setMaxMargin(e.target.value)}
                  placeholder="Max Margin %"
                  className="border border-gray-300 rounded-lg px-3 py-2 w-32 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="name">Urutkan: Nama</option>
                  <option value="margin">Urutkan: Margin</option>
                  <option value="hpp">Urutkan: HPP</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin h-12 w-12 mx-auto border-4 border-cyan-600 border-t-transparent rounded-full mb-4"></div>
                  <p className="text-gray-600">Memuat analisa HPP...</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <FaChartLine className="mx-auto text-6xl text-gray-300 mb-4" />
                <p className="text-gray-600 text-lg">Tidak ada produk ditemukan</p>
                <p className="text-gray-500 text-sm mt-2">Coba ubah filter atau tambah produk baru</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Produk</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">SKU</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Kategori</th>
                      <th className="text-right p-4 text-sm font-semibold text-gray-700">HPP</th>
                      <th className="text-right p-4 text-sm font-semibold text-gray-700">Harga Jual</th>
                      <th className="text-right p-4 text-sm font-semibold text-gray-700">Margin</th>
                      <th className="text-right p-4 text-sm font-semibold text-gray-700">Margin %</th>
                      <th className="text-center p-4 text-sm font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((product) => (
                      <tr 
                        key={product.productId}
                        onClick={() => router.push(`/inventory?productId=${product.productId}`)}
                        className="border-b border-gray-100 hover:bg-cyan-50 transition-colors cursor-pointer"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(product.status)}
                            <Badge className={getStatusColor(product.status)}>
                              {product.status === 'healthy' ? 'Sehat' : product.status === 'warning' ? 'Rendah' : 'Kritis'}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FaBoxOpen className="text-gray-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{product.productName}</p>
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
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(product.hpp)}</p>
                        </td>
                        <td className="p-4 text-right">
                          <p className="text-sm font-semibold text-cyan-600">{formatCurrency(product.sellingPrice)}</p>
                        </td>
                        <td className="p-4 text-right">
                          <p className={`text-sm font-semibold ${product.marginAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(product.marginAmount)}
                          </p>
                        </td>
                        <td className="p-4 text-right">
                          <div>
                            <p className={`text-sm font-bold ${
                              product.marginPercentage >= product.minMarginPercentage 
                                ? 'text-green-600' 
                                : product.marginPercentage >= 0 
                                ? 'text-yellow-600' 
                                : 'text-red-600'
                            }`}>
                              {product.marginPercentage.toFixed(2)}%
                            </p>
                            <p className="text-xs text-gray-500">Min: {product.minMarginPercentage}%</p>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/inventory?productId=${product.productId}`);
                            }}
                            className="text-cyan-600 hover:text-cyan-800 text-sm font-medium"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
          
          {/* Pagination Controls */}
          {!isLoading && filteredProducts.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Tampilkan:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value={10}>10 per halaman</option>
                    <option value={20}>20 per halaman</option>
                    <option value={50}>50 per halaman</option>
                    <option value={100}>100 per halaman</option>
                  </select>
                  <span className="text-sm text-gray-600">
                    Menampilkan {startIndex + 1}-{endIndex} dari {filteredProducts.length} produk
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
                    Pertama
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3"
                  >
                    Sebelumnya
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
                          className={`px-3 ${currentPage === pageNum ? 'bg-cyan-600 hover:bg-cyan-700' : ''}`}
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
                    Berikutnya
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3"
                  >
                    Terakhir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default function HppAnalysisPageWithGuard() {
  return (
    <ModuleGuard moduleCode="hpp">
      <HppAnalysisPage />
    </ModuleGuard>
  );
}
