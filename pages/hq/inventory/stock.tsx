import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { useRouter } from 'next/router';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Package,
  RefreshCw,
  Download,
  Search,
  Filter,
  ChevronLeft,
  Building2,
  Warehouse,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  ArrowRightLeft,
  Plus,
  X,
  Check,
  ChevronDown
} from 'lucide-react';

interface ProductStock {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: string;
  totalStock: number;
  minStock: number;
  maxStock: number;
  avgCost: number;
  stockValue: number;
  movement: 'fast' | 'medium' | 'slow';
  branches: BranchStockDetail[];
}

interface BranchStockDetail {
  branchId: string;
  branchName: string;
  branchCode: string;
  stock: number;
  minStock: number;
  maxStock: number;
  status: 'normal' | 'low' | 'out' | 'over';
  lastUpdated: string;
}

const categories = ['all', 'Bahan Pokok', 'Minuman', 'Snack', 'Frozen', 'Non-Food'];

export default function GlobalStockManagement() {
  const { t } = useTranslation();
  const router = useRouter();
  const { branch } = router.query;
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [branches, setBranches] = useState<{id: string, name: string, code: string}[]>([{id: 'all', name: '', code: 'ALL'}]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>(branch as string || 'all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'over'>('all');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedProductForTransfer, setSelectedProductForTransfer] = useState<ProductStock | null>(null);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (stockFilter !== 'all') params.append('stockFilter', stockFilter);
      
      const response = await fetch(`/api/hq/inventory/stock?${params.toString()}`);
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        if (payload.products) setProducts(payload.products);
      }
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchStock();
    if (branch) {
      setSelectedBranch(branch as string);
    }
  }, [branch]);

  if (!mounted) return null;

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}M`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)}jt`;
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const formatNumber = (value: number) => value.toLocaleString('id-ID');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{t('inventory.normal')}</span>;
      case 'low': return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">{t('inventory.lowStock')}</span>;
      case 'out': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">{t('inventory.outOfStock')}</span>;
      case 'over': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{t('inventory.overStock')}</span>;
      default: return null;
    }
  };

  const getMovementBadge = (movement: string) => {
    switch (movement) {
      case 'fast': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{t('inventory.fastMoving')}</span>;
      case 'medium': return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">{t('inventory.medium')}</span>;
      case 'slow': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">{t('inventory.slowMoving')}</span>;
      default: return null;
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    let matchesStock = true;
    if (stockFilter !== 'all') {
      const hasIssue = product.branches.some(b => b.status === stockFilter);
      matchesStock = hasIssue;
    }
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const totalStats = {
    totalProducts: filteredProducts.length,
    totalStock: filteredProducts.reduce((sum, p) => sum + p.totalStock, 0),
    totalValue: filteredProducts.reduce((sum, p) => sum + p.stockValue, 0),
    lowStockCount: filteredProducts.filter(p => p.branches.some(b => b.status === 'low')).length,
    outOfStockCount: filteredProducts.filter(p => p.branches.some(b => b.status === 'out')).length
  };

  return (
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hq/inventory" className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('inventory.stockTitle')}</h1>
              <p className="text-gray-500">{t('inventory.stockSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { fetchStock(); toast.success(t('inventory.syncStockSuccess')); }} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {t('inventory.sync')}
            </button>
            <button onClick={() => {
              const rows = filteredProducts.map(p => `${p.name},${p.sku},${p.barcode},${p.category},${p.unit},${p.totalStock},${p.minStock},${p.maxStock},${p.avgCost},${p.stockValue},${p.movement}`);
              const csv = `Name,SKU,Barcode,Category,Unit,Stock,Min,Max,AvgCost,Value,Movement\n${rows.join('\n')}`;
              const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'stock-report.csv'; a.click(); URL.revokeObjectURL(url);
              toast.success(t('inventory.exportStockSuccess'));
            }} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Download className="w-4 h-4" /> {t('inventory.export')}
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{t('inventory.totalProducts')}</p>
            <p className="text-xl font-bold text-gray-900">{formatNumber(totalStats.totalProducts)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{t('inventory.totalUnit')}</p>
            <p className="text-xl font-bold text-gray-900">{formatNumber(totalStats.totalStock)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{t('inventory.stockValue')}</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalStats.totalValue)}</p>
          </div>
          <div className="bg-white rounded-xl border border-yellow-200 p-4 bg-yellow-50">
            <p className="text-sm text-yellow-600">{t('inventory.lowStock')}</p>
            <p className="text-xl font-bold text-yellow-700">{totalStats.lowStockCount} {t('inventory.productCount')}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4 bg-red-50">
            <p className="text-sm text-red-600">{t('inventory.outOfStock')}</p>
            <p className="text-xl font-bold text-red-700">{totalStats.outOfStockCount} {t('inventory.productCount')}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('inventory.searchProductPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {branches.map(b => (
                <option key={b.id} value={b.code}>{b.id === 'all' ? t('inventory.allBranches') : b.name}</option>
              ))}
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'all' ? t('inventory.allCategories') : c}</option>
              ))}
            </select>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-3 py-2 text-sm ${stockFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {t('inventory.all')}
              </button>
              <button
                onClick={() => setStockFilter('low')}
                className={`px-3 py-2 text-sm ${stockFilter === 'low' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {t('inventory.lowStock')}
              </button>
              <button
                onClick={() => setStockFilter('out')}
                className={`px-3 py-2 text-sm ${stockFilter === 'out' ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {t('inventory.outOfStock')}
              </button>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.product')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.category')}</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.totalStock')}</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.minMax')}</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.stockValue')}</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.movement')}</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.status')}</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const hasIssue = product.branches.some(b => b.status === 'low' || b.status === 'out');
                const isExpanded = expandedProduct === product.id;
                
                return (
                  <React.Fragment key={product.id}>
                    <tr className={`hover:bg-gray-50 ${hasIssue ? 'bg-red-50/30' : ''}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.sku} • {product.barcode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600 text-sm">{product.category}</td>
                      <td className="px-5 py-4 text-right font-medium text-gray-900">{formatNumber(product.totalStock)} {product.unit}</td>
                      <td className="px-5 py-4 text-right text-gray-500 text-sm">{formatNumber(product.minStock)} / {formatNumber(product.maxStock)}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{formatCurrency(product.stockValue)}</td>
                      <td className="px-5 py-4 text-center">{getMovementBadge(product.movement)}</td>
                      <td className="px-5 py-4 text-center">
                        {product.branches.some(b => b.status === 'out') ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs flex items-center gap-1 justify-center">
                            <AlertTriangle className="w-3 h-3" /> {t('inventory.critical')}
                          </span>
                        ) : product.branches.some(b => b.status === 'low') ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">{t('inventory.lowStock')}</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{t('inventory.normal')}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { setSelectedProductForTransfer(product); setShowTransferModal(true); }}
                            className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                            title={t('inventory.transferStock')}
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="px-5 py-4 bg-gray-50">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {product.branches.map((branch) => (
                              <div
                                key={branch.branchId}
                                className={`p-3 rounded-lg border ${
                                  branch.status === 'out' ? 'bg-red-50 border-red-200' :
                                  branch.status === 'low' ? 'bg-yellow-50 border-yellow-200' :
                                  'bg-white border-gray-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  {branch.branchCode.startsWith('WH') ? (
                                    <Warehouse className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <Building2 className="w-4 h-4 text-gray-500" />
                                  )}
                                  <span className="text-xs font-medium text-gray-700">{branch.branchName}</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{formatNumber(branch.stock)}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-gray-500">Min: {branch.minStock}</span>
                                  {getStatusBadge(branch.status)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Transfer Modal */}
        {showTransferModal && selectedProductForTransfer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{t('inventory.transferStock')}</h2>
                <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-900">{selectedProductForTransfer.name}</p>
                  <p className="text-sm text-gray-500">{selectedProductForTransfer.sku}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.fromBranch')}</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      {branches.filter(b => b.id !== 'all').map(b => (
                        <option key={b.id} value={b.code}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.toBranch')}</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      {branches.filter(b => b.id !== 'all').map(b => (
                        <option key={b.id} value={b.code}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.transferQty')}</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.notes')}</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder={t('inventory.transferReasonPlaceholder')}
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('inventory.cancel')}
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {t('inventory.createTransfer')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
