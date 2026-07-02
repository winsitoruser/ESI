import React, { useState, useEffect, useMemo } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Package,
  RefreshCw,
  Download,
  Search,
  Filter,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Building2,
  Box,
  FileText,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface StockData {
  branchId: string;
  branchName: string;
  branchCode: string;
  type?: string;
  totalProducts: number;
  totalStock: number;
  stockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  overStockItems: number;
  normalStockItems: number;
  lastUpdated: string;
}

interface LowStockProduct {
  productId: number | string;
  productName: string;
  sku: string;
  quantity: number;
  minStock: number;
  unitCost: number;
  stockValue: number;
  status: 'out_of_stock' | 'low_stock' | 'normal' | 'over_stock';
}

interface InventorySummary {
  branches: number;
  totalStock: number;
  totalValue: number;
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  overStock: number;
  normal: number;
}

type StatusFilter = 'all' | 'normal' | 'low_stock' | 'out_of_stock' | 'over_stock';

const STATUS_COLORS: Record<string, string> = {
  normal: '#10B981',
  low_stock: '#F59E0B',
  out_of_stock: '#EF4444',
  over_stock: '#3B82F6',
};

export default function InventoryReport() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [stockData, setStockData] = useState<StockData[]>([]);
  const [topLowStock, setTopLowStock] = useState<LowStockProduct[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');

  const fetchStockData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', filterStatus);
      if (warehouseFilter !== 'all') params.set('warehouseId', warehouseFilter);
      if (productSearch) params.set('search', productSearch);
      const res = await fetch(`/api/hq/reports/inventory?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const d = json.data || json;
        setStockData(d.stockData || []);
        setTopLowStock(d.topLowStock || []);
        setSummary(d.summary || null);
      } else {
        toast.error('Gagal memuat laporan inventori');
      }
    } catch (error) {
      console.error('Error fetching inventory report:', error);
      toast.error('Koneksi gagal saat memuat data inventori');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchStockData();
  }, [filterStatus, warehouseFilter]);

  const formatCurrency = (value: number) => {
    if (!value && value !== 0) return 'Rp 0';
    if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(0)}Jt`;
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const handleExport = (mode: 'summary' | 'lowstock') => {
    let filename = '';
    let csv = '';
    if (mode === 'summary') {
      filename = 'inventory-summary';
      csv = [
        ['Gudang/Cabang', 'Kode', 'Tipe', 'Produk', 'Total Stok', 'Nilai Stok', 'Normal', 'Low Stock', 'Out of Stock', 'Over Stock'].join(','),
        ...stockData.map(s => [
          s.branchName,
          s.branchCode,
          s.type || '',
          s.totalProducts,
          s.totalStock,
          s.stockValue,
          s.normalStockItems,
          s.lowStockItems,
          s.outOfStockItems,
          s.overStockItems,
        ].join(',')),
      ].join('\n');
    } else {
      filename = 'inventory-low-stock';
      csv = [
        ['Produk', 'SKU', 'Qty', 'Min Stock', 'Unit Cost', 'Stock Value', 'Status'].join(','),
        ...topLowStock.map(p => [
          `"${p.productName}"`,
          p.sku,
          p.quantity,
          p.minStock,
          p.unitCost,
          p.stockValue,
          p.status,
        ].join(',')),
      ].join('\n');
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Export ${filename} berhasil`);
  };

  const stockDistributionData = useMemo(
    () =>
      stockData.map(s => ({
        name: s.branchName.replace('Cabang ', '').replace('Gudang ', ''),
        value: +(s.stockValue / 1_000_000).toFixed(1),
      })),
    [stockData]
  );

  const stockStatusData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: 'Normal', value: summary.normal, color: STATUS_COLORS.normal },
      { name: 'Low Stock', value: summary.lowStock, color: STATUS_COLORS.low_stock },
      { name: 'Out of Stock', value: summary.outOfStock, color: STATUS_COLORS.out_of_stock },
      { name: 'Over Stock', value: summary.overStock, color: STATUS_COLORS.over_stock },
    ].filter(d => d.value > 0);
  }, [summary]);

  const filteredStockData = useMemo(
    () =>
      stockData.filter(s =>
        searchTerm === '' ||
        s.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.branchCode.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [stockData, searchTerm]
  );

  if (!mounted) {
    return (
      <HQLayout title="Laporan Inventori" subtitle="Pantau stok di seluruh gudang / cabang">
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        </div>
      </HQLayout>
    );
  }

  return (
    <HQLayout title="Laporan Inventori" subtitle="Pantau stok di seluruh gudang / cabang">
      <div className="space-y-6">
        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center gap-2 text-gray-500">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filter</span>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">Semua Status</option>
                <option value="normal">Normal Saja</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="over_stock">Over Stock</option>
              </select>
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">Semua Gudang/Cabang</option>
                {stockData.map(s => (
                  <option key={s.branchId} value={s.branchId}>
                    {s.branchName}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari gudang/cabang..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchStockData}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <div className="hidden group-hover:block absolute right-0 top-full pt-1 w-56 z-10">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-lg py-1">
                    <button onClick={() => handleExport('summary')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" /> Ringkasan per gudang (CSV)
                    </button>
                    <button onClick={() => handleExport('lowstock')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-gray-500" /> Low / Out of stock (CSV)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard icon={Box} bg="bg-blue-100" color="text-blue-600" label="Total Stok" value={summary.totalStock.toLocaleString('id-ID')} />
            <StatCard icon={Package} bg="bg-green-100" color="text-green-600" label="Nilai Stok" value={formatCurrency(summary.totalValue)} />
            <StatCard icon={Layers} bg="bg-indigo-100" color="text-indigo-600" label="Total Produk" value={summary.totalProducts.toLocaleString('id-ID')} />
            <StatCard icon={AlertTriangle} bg="bg-yellow-100" color="text-yellow-600" label="Low Stock" value={summary.lowStock.toString()} />
            <StatCard icon={TrendingDown} bg="bg-red-100" color="text-red-600" label="Out of Stock" value={summary.outOfStock.toString()} />
            <StatCard icon={TrendingUp} bg="bg-purple-100" color="text-purple-600" label="Over Stock" value={summary.overStock.toString()} />
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard title="Distribusi Nilai Stok per Lokasi (Juta)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}Jt`} />
                <Tooltip formatter={(value: number) => [`Rp ${value.toFixed(1)} Jt`, 'Nilai']} />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Status Stok (Agregat)">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stockStatusData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Branches Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Ringkasan per Gudang / Cabang</h3>
          </div>
          <div className="overflow-x-auto">
            {loading && filteredStockData.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Lokasi</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs uppercase">Tipe</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs uppercase">Produk</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs uppercase">Total Stok</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Nilai Stok</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs uppercase">Normal</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs uppercase">Low</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs uppercase">Out</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs uppercase">Over</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs uppercase">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStockData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-400">Tidak ada data inventori yang cocok</td>
                    </tr>
                  ) : (
                    filteredStockData.map((stock) => (
                      <tr key={stock.branchId} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <Building2 className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{stock.branchName}</p>
                              <p className="text-sm text-gray-500">{stock.branchCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700 capitalize">{stock.type || '-'}</span>
                        </td>
                        <td className="py-3 px-4 text-center">{stock.totalProducts}</td>
                        <td className="py-3 px-4 text-center font-medium">{stock.totalStock.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatCurrency(stock.stockValue)}</td>
                        <td className="py-3 px-4 text-center text-green-600">{stock.normalStockItems}</td>
                        <td className="py-3 px-4 text-center">
                          {stock.lowStockItems > 0 ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">{stock.lowStockItems}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {stock.outOfStockItems > 0 ? (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">{stock.outOfStockItems}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {stock.overStockItems > 0 ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{stock.overStockItems}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-500">
                          {new Date(stock.lastUpdated).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {summary && filteredStockData.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td className="py-3 px-4">Total ({summary.branches} lokasi)</td>
                      <td className="py-3 px-4 text-center">-</td>
                      <td className="py-3 px-4 text-center">{summary.totalProducts}</td>
                      <td className="py-3 px-4 text-center">{summary.totalStock.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(summary.totalValue)}</td>
                      <td className="py-3 px-4 text-center text-green-600">{summary.normal}</td>
                      <td className="py-3 px-4 text-center text-yellow-700">{summary.lowStock}</td>
                      <td className="py-3 px-4 text-center text-red-700">{summary.outOfStock}</td>
                      <td className="py-3 px-4 text-center text-blue-700">{summary.overStock}</td>
                      <td className="py-3 px-4" />
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Produk Perlu Restock
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Cari nama/SKU produk..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm w-72"
              />
              <button onClick={fetchStockData} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                Cari
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Min Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nilai</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topLowStock.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">Tidak ada produk low/out of stock</td>
                  </tr>
                ) : (
                  topLowStock.map((p) => (
                    <tr key={p.productId} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{p.productName}</td>
                      <td className="px-6 py-3 text-sm text-gray-500 font-mono">{p.sku}</td>
                      <td className="px-6 py-3 text-right font-medium">{p.quantity.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{p.minStock}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(p.unitCost)}</td>
                      <td className="px-6 py-3 text-right font-medium">{formatCurrency(p.stockValue)}</td>
                      <td className="px-6 py-3 text-center">
                        {p.status === 'out_of_stock' ? (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Out of Stock</span>
                        ) : p.status === 'low_stock' ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Low Stock</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{p.status}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </HQLayout>
  );
}

function StatCard({ icon: Icon, bg, color, label, value }: { icon: any; bg: string; color: string; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-3 ${bg} rounded-xl`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-80">{children}</div>
    </div>
  );
}
