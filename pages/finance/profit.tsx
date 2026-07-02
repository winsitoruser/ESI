import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { 
  FaChartLine, FaBoxOpen, FaCalendarAlt, FaArrowUp, 
  FaArrowDown, FaSearch, FaFilter, FaDollarSign,
  FaPercentage, FaShoppingCart
} from 'react-icons/fa';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';

interface ProductProfit {
  productId: string;
  productName: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  profitMargin: number;
  profitAmount: number;
  quantitySold: number;
  totalRevenue: number;
  totalProfit: number;
}

interface ProfitTrend {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

const ProfitPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '3m'>('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Mock data
  const [profitData, setProfitData] = useState({
    totalRevenue: 45000000,
    totalCost: 30000000,
    totalProfit: 15000000,
    profitMargin: 33.33,
    avgTransactionProfit: 125000,
    topProduct: 'Kopi Arabica 250g'
  });

  const [productProfits, setProductProfits] = useState<ProductProfit[]>([
    {
      productId: '1',
      productName: 'Kopi Arabica 250g',
      category: 'Minuman',
      costPrice: 30000,
      sellingPrice: 45000,
      profitMargin: 33.33,
      profitAmount: 15000,
      quantitySold: 120,
      totalRevenue: 5400000,
      totalProfit: 1800000
    },
    {
      productId: '2',
      productName: 'Teh Hijau Premium',
      category: 'Minuman',
      costPrice: 25000,
      sellingPrice: 35000,
      profitMargin: 28.57,
      profitAmount: 10000,
      quantitySold: 80,
      totalRevenue: 2800000,
      totalProfit: 800000
    },
    {
      productId: '3',
      productName: 'Beras Premium 5kg',
      category: 'Bahan Pokok',
      costPrice: 65000,
      sellingPrice: 85000,
      profitMargin: 23.53,
      profitAmount: 20000,
      quantitySold: 60,
      totalRevenue: 5100000,
      totalProfit: 1200000
    }
  ]);

  const [profitTrend, setProfitTrend] = useState<ProfitTrend[]>([
    { date: '1 Feb', revenue: 1500000, cost: 1000000, profit: 500000 },
    { date: '2 Feb', revenue: 1800000, cost: 1200000, profit: 600000 },
    { date: '3 Feb', revenue: 2000000, cost: 1300000, profit: 700000 },
    { date: '4 Feb', revenue: 1700000, cost: 1100000, profit: 600000 },
    { date: '5 Feb', revenue: 2200000, cost: 1400000, profit: 800000 },
    { date: '6 Feb', revenue: 1900000, cost: 1250000, profit: 650000 },
    { date: '7 Feb', revenue: 2100000, cost: 1350000, profit: 750000 }
  ]);

  useEffect(() => {
    setLoading(false);
  }, [period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredProducts = productProfits.filter(product => {
    const matchesSearch = product.productName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(productProfits.map(p => p.category)))];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const categoryData = categories
    .filter(cat => cat !== 'all')
    .map(category => {
      const categoryProducts = productProfits.filter(p => p.category === category);
      const totalProfit = categoryProducts.reduce((sum, p) => sum + p.totalProfit, 0);
      return {
        name: category,
        value: totalProfit
      };
    });

  return (
    <DashboardLayout>
      <Head>
        <title>Analisa Keuntungan | BEDAGANG</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <FaChartLine className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Analisa Keuntungan</h1>
                <p className="text-green-100 mt-1">Pantau profit dan margin penjualan</p>
              </div>
            </div>
            <div className="flex gap-2">
              {['7d', '30d', '3m'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    period === p
                      ? 'bg-white text-green-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {p === '7d' ? '7 Hari' : p === '30d' ? '30 Hari' : '3 Bulan'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Pendapatan</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(profitData.totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaDollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Modal</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(profitData.totalCost)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FaShoppingCart className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Keuntungan</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(profitData.totalProfit)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FaArrowUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Margin Keuntungan</p>
                <p className="text-2xl font-bold text-purple-600">{profitData.profitMargin.toFixed(2)}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FaPercentage className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profit Trend */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Trend Keuntungan</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={profitTrend}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value / 1000000).toFixed(1)}Jt`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  fill="url(#colorProfit)" 
                  name="Keuntungan"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Profit by Category */}
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Profit per Kategori</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">Semua Kategori</option>
              {categories.filter(c => c !== 'all').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Profit Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Profit per Produk</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga Modal
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga Jual
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margin
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Terjual
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Profit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.productId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.productName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(product.costPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(product.sellingPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-semibold ${
                        product.profitMargin >= 30 ? 'text-green-600' : 
                        product.profitMargin >= 20 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {product.profitMargin.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {product.quantitySold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                      {formatCurrency(product.totalProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfitPage;
