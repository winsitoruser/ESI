import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import DataTable, { Column } from '../../../components/hq/ui/DataTable';
import Modal, { ConfirmDialog } from '../../../components/hq/ui/Modal';
import { StatusBadge } from '../../../components/hq/ui';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Eye,
  Lock,
  Unlock,
  DollarSign,
  Tag,
  Layers,
  Image,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Download,
  Upload,
  BarChart3,
  Building2,
  Copy
} from 'lucide-react';
import { rowsOr, MOCK_HQ_PRODUCTS } from '@/lib/hq/mock-data';

interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  categoryId: number;
  categoryName: string;
  basePrice: number;
  costPrice: number;
  isActive: boolean;
  imageUrl: string | null;
  unit: string;
  stock: number;
  minStock: number;
  pricing: {
    isStandard: boolean;
    lockedBy: string | null;
    lockedAt: string | null;
    branchPrices: Array<{
      branchId: string;
      branchName: string;
      price: number;
      priceTier: string | null;
    }>;
  };
  createdAt: string;
}

export default function ProductManagement() {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>(MOCK_HQ_PRODUCTS as Product[]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState((MOCK_HQ_PRODUCTS as Product[]).length);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unit: '',
    description: '',
    price: 0,
    cost: 0
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hq/products?page=${page}&limit=${pageSize}`);
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        if (payload.products) {
          setProducts(rowsOr(payload.products, MOCK_HQ_PRODUCTS as Product[]));
          setTotal(payload.total && payload.total > 0 ? payload.total : (MOCK_HQ_PRODUCTS as Product[]).length);
        } else {
          setProducts(MOCK_HQ_PRODUCTS as Product[]);
          setTotal((MOCK_HQ_PRODUCTS as Product[]).length);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts(MOCK_HQ_PRODUCTS as Product[]); setTotal((MOCK_HQ_PRODUCTS as Product[]).length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchProducts();
  }, [page, pageSize]);

  if (!mounted) {
    return null;
  }

  const handleLockPrice = async () => {
    if (!selectedProduct) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/hq/products/${selectedProduct.id}/lock-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lock: !selectedProduct?.pricing?.isStandard })
      });
      if (response.ok) {
        setShowLockConfirm(false);
        fetchProducts();
      }
    } catch (error) {
      console.error('Error toggling price lock:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/hq/products/${selectedProduct.id}`, { method: 'DELETE' });
      if (response.ok) {
        setShowDeleteConfirm(false);
        fetchProducts();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const calculateMargin = (basePrice: number, costPrice: number) => {
    if (costPrice === 0) return 0;
    return ((basePrice - costPrice) / basePrice * 100).toFixed(1);
  };

  const columns: Column<Product>[] = [
    {
      key: 'sku',
      header: 'Produk',
      sortable: true,
      render: (_, product) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <Package className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">{product.name}</div>
            <div className="text-sm text-gray-500">SKU: {product.sku}</div>
          </div>
        </div>
      )
    },
    {
      key: 'categoryName',
      header: 'Kategori',
      sortable: true,
      render: (value) => (
        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
          {value}
        </span>
      )
    },
    {
      key: 'basePrice',
      header: 'Harga Dasar',
      align: 'right',
      sortable: true,
      render: (_, product) => (
        <div className="text-right">
          <div className="font-medium text-gray-900">{formatCurrency(product.basePrice)}</div>
          <div className="text-xs text-gray-500">Margin: {calculateMargin(product.basePrice, product.costPrice)}%</div>
        </div>
      )
    },
    {
      key: 'pricing',
      header: 'Status Harga',
      align: 'center',
      render: (_, product) => (
        <div className="flex flex-col items-center gap-1">
          {product.pricing?.isStandard ? (
            <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
              <Lock className="w-3 h-3" />
              Terkunci
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <Unlock className="w-3 h-3" />
              Fleksibel
            </span>
          )}
          {product.pricing?.branchPrices?.length > 0 && (
            <span className="text-xs text-gray-500">{product.pricing?.branchPrices?.length} variasi</span>
          )}
        </div>
      )
    },
    {
      key: 'isActive',
      header: 'Status',
      align: 'center',
      render: (value) => (
        <StatusBadge status={value ? 'active' : 'inactive'} />
      )
    },
    {
      key: 'stock',
      header: 'Stok',
      align: 'right',
      render: (_, product) => (
        <div className="text-right">
          <div className={`font-medium ${product.stock <= product.minStock ? 'text-red-600' : 'text-gray-900'}`}>
            {product.stock} {product.unit}
          </div>
          {product.stock <= product.minStock && (
            <div className="flex items-center justify-end gap-1 text-xs text-red-500">
              <AlertTriangle className="w-3 h-3" />
              Stok rendah
            </div>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'center',
      width: '150px',
      render: (_, product) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setShowViewModal(true); }}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            title="Lihat Detail"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setShowPricingModal(true); }}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
            title="Kelola Harga"
          >
            <DollarSign className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setShowLockConfirm(true); }}
            className={`p-2 rounded-lg ${product.pricing?.isStandard 
              ? 'text-orange-600 hover:bg-orange-50' 
              : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'}`}
            title={product.pricing?.isStandard ? 'Buka Kunci Harga' : 'Kunci Harga'}
          >
            {product.pricing?.isStandard ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setShowEditModal(true); }}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Master Produk</h1>
            <p className="text-gray-500">Kelola produk dan harga untuk semua cabang</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Tambah Produk
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Produk</p>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Aktif</p>
                <p className="text-2xl font-bold text-green-600">{products.filter(p => p.isActive).length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Harga Terkunci</p>
                <p className="text-2xl font-bold text-orange-600">{products.filter(p => p.pricing?.isStandard).length}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Lock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Stok Rendah</p>
                <p className="text-2xl font-bold text-red-600">{products.filter(p => p.stock <= p.minStock).length}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Kategori</p>
                <p className="text-2xl font-bold text-purple-600">{new Set(products.map(p => p.categoryId)).size}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Layers className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={products}
          loading={loading}
          searchPlaceholder="Cari produk..."
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
            onPageSizeChange: setPageSize
          }}
          actions={{
            onRefresh: fetchProducts
          }}
          onRowClick={(product) => { setSelectedProduct(product); setShowViewModal(true); }}
        />
      </div>

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setSelectedProduct(null); }}
        title={selectedProduct?.name || 'Detail Produk'}
        subtitle={`SKU: ${selectedProduct?.sku}`}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowViewModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Tutup
            </button>
            <button
              onClick={() => { setShowViewModal(false); setShowPricingModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <DollarSign className="w-4 h-4" />
              Kelola Harga
            </button>
          </div>
        }
      >
        {selectedProduct && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedProduct.name}</h3>
                    <p className="text-gray-500 mt-1">{selectedProduct.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">{selectedProduct.categoryName}</span>
                      <StatusBadge status={selectedProduct.isActive ? 'active' : 'inactive'} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-600">Harga Jual</p>
                  <p className="text-xl font-bold text-blue-900">{formatCurrency(selectedProduct.basePrice)}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-sm text-green-600">HPP</p>
                  <p className="text-xl font-bold text-green-900">{formatCurrency(selectedProduct.costPrice)}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-purple-600">Margin</p>
                  <p className="text-xl font-bold text-purple-900">{calculateMargin(selectedProduct.basePrice, selectedProduct.costPrice)}%</p>
                </div>
                <div className={`${selectedProduct.stock <= selectedProduct.minStock ? 'bg-red-50' : 'bg-gray-50'} rounded-xl p-4`}>
                  <p className={`text-sm ${selectedProduct.stock <= selectedProduct.minStock ? 'text-red-600' : 'text-gray-600'}`}>Stok</p>
                  <p className={`text-xl font-bold ${selectedProduct.stock <= selectedProduct.minStock ? 'text-red-900' : 'text-gray-900'}`}>
                    {selectedProduct.stock} {selectedProduct.unit}
                  </p>
                </div>
              </div>
            </div>

            {/* Price Lock Status */}
            <div className={`p-4 rounded-xl ${selectedProduct?.pricing?.isStandard ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedProduct?.pricing?.isStandard ? (
                    <Lock className="w-5 h-5 text-orange-600" />
                  ) : (
                    <Unlock className="w-5 h-5 text-green-600" />
                  )}
                  <div>
                    <p className={`font-medium ${selectedProduct?.pricing?.isStandard ? 'text-orange-800' : 'text-green-800'}`}>
                      {selectedProduct?.pricing?.isStandard ? 'Harga Terkunci (Standar Pusat)' : 'Harga Fleksibel'}
                    </p>
                    <p className={`text-sm ${selectedProduct?.pricing?.isStandard ? 'text-orange-600' : 'text-green-600'}`}>
                      {selectedProduct?.pricing?.isStandard 
                        ? `Dikunci oleh ${selectedProduct?.pricing?.lockedBy} pada ${selectedProduct?.pricing?.lockedAt ? new Date(selectedProduct.pricing.lockedAt).toLocaleDateString('id-ID') : '-'}`
                        : 'Branch Manager dapat menyesuaikan harga sesuai kebijakan cabang'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowViewModal(false); setShowLockConfirm(true); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    selectedProduct?.pricing?.isStandard 
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {selectedProduct?.pricing?.isStandard ? 'Buka Kunci' : 'Kunci Harga'}
                </button>
              </div>
            </div>

            {/* Branch Prices */}
            {selectedProduct?.pricing?.branchPrices && selectedProduct.pricing.branchPrices.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Variasi Harga per Cabang</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cabang</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Price Tier</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Harga</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Selisih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedProduct?.pricing?.branchPrices?.map((bp) => (
                        <tr key={bp.branchId}>
                          <td className="px-4 py-3 font-medium">{bp.branchName}</td>
                          <td className="px-4 py-3 text-gray-500">{bp.priceTier || 'Standar'}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(bp.price)}</td>
                          <td className="px-4 py-3 text-right">
                            {bp.price > selectedProduct.basePrice ? (
                              <span className="text-green-600">+{formatCurrency(bp.price - selectedProduct.basePrice)}</span>
                            ) : bp.price < selectedProduct.basePrice ? (
                              <span className="text-red-600">{formatCurrency(bp.price - selectedProduct.basePrice)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Pricing Modal */}
      <Modal
        isOpen={showPricingModal}
        onClose={() => { setShowPricingModal(false); setSelectedProduct(null); }}
        title="Kelola Harga Produk"
        subtitle={selectedProduct?.name}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowPricingModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Batal
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Simpan Perubahan
            </button>
          </div>
        }
      >
        {selectedProduct && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 mb-3">Harga Dasar (Standar Pusat)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                    <input
                      type="number"
                      defaultValue={selectedProduct.basePrice}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HPP (Harga Pokok)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                    <input
                      type="number"
                      defaultValue={selectedProduct.costPrice}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Harga per Price Tier</h4>
                <button className="text-sm text-blue-600 hover:text-blue-700">+ Tambah Tier</button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Harga Mall</p>
                    <p className="text-sm text-gray-500">Berlaku untuk cabang di Mall</p>
                  </div>
                  <div className="w-48">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                      <input
                        type="number"
                        defaultValue={38000}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <span className="text-green-600 text-sm font-medium">+8.6%</span>
                </div>
                <div className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Harga Mall Premium</p>
                    <p className="text-sm text-gray-500">Berlaku untuk Mall premium & Bandara</p>
                  </div>
                  <div className="w-48">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                      <input
                        type="number"
                        defaultValue={42000}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <span className="text-green-600 text-sm font-medium">+20%</span>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl ${selectedProduct?.pricing?.isStandard ? 'bg-orange-50' : 'bg-blue-50'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={selectedProduct?.pricing?.isStandard}
                  className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Kunci sebagai Harga Standar</p>
                  <p className="text-sm text-gray-600">Branch Manager tidak dapat mengubah harga produk ini</p>
                </div>
              </label>
            </div>
          </div>
        )}
      </Modal>

      {/* Lock Confirm */}
      <ConfirmDialog
        isOpen={showLockConfirm}
        onClose={() => { setShowLockConfirm(false); setSelectedProduct(null); }}
        onConfirm={handleLockPrice}
        title={selectedProduct?.pricing?.isStandard ? 'Buka Kunci Harga' : 'Kunci Harga'}
        message={selectedProduct?.pricing?.isStandard 
          ? `Apakah Anda yakin ingin membuka kunci harga "${selectedProduct?.name}"? Branch Manager akan dapat menyesuaikan harga produk ini.`
          : `Apakah Anda yakin ingin mengunci harga "${selectedProduct?.name}"? Hanya SUPER_ADMIN yang dapat mengubah harga produk ini.`
        }
        confirmText={selectedProduct?.pricing?.isStandard ? 'Buka Kunci' : 'Kunci Harga'}
        variant={selectedProduct?.pricing?.isStandard ? 'info' : 'warning'}
        loading={actionLoading}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setSelectedProduct(null); }}
        onConfirm={handleDelete}
        title="Hapus Produk"
        message={`Apakah Anda yakin ingin menghapus produk "${selectedProduct?.name}"?`}
        confirmText="Hapus"
        variant="danger"
        loading={actionLoading}
      />
    </HQLayout>
  );
}
