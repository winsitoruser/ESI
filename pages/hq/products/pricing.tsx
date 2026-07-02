import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import Modal, { ConfirmDialog } from '../../../components/hq/ui/Modal';
import { StatusBadge } from '../../../components/hq/ui/Badge';
import {
  DollarSign,
  Save,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Search,
  Percent,
  Tag,
  MapPin,
  Building2,
  Lock,
  Unlock,
  Eye,
  Copy,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface PriceTier {
  id: string;
  code: string;
  name: string;
  description: string;
  multiplier: number;
  markupPercent: number;
  region: string;
  appliedBranches: number;
  productCount: number;
  isActive: boolean;
  createdAt: string;
}

interface ProductPrice {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  basePrice: number;
  tierPrices: { tierId: string; tierName: string; price: number }[];
  isStandard: boolean;
  lockedBy: string | null;
}

export default function ProductPricing() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'tiers' | 'products'>('tiers');
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showCreateTierModal, setShowCreateTierModal] = useState(false);
  const [showEditTierModal, setShowEditTierModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PriceTier | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductPrice | null>(null);
  const [saving, setSaving] = useState(false);

  const [tierForm, setTierForm] = useState({
    code: '',
    name: '',
    description: '',
    multiplier: 1.0,
    markupPercent: 0,
    region: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tiersRes, pricesRes] = await Promise.all([
        fetch('/api/hq/price-tiers'),
        fetch('/api/hq/product-prices')
      ]);
      
      if (tiersRes.ok) {
        const json1 = await tiersRes.json();
        const p1 = json1.data || json1;
        if (p1.tiers) setPriceTiers(p1.tiers);
      }
      
      if (pricesRes.ok) {
        const json2 = await pricesRes.json();
        const p2 = json2.data || json2;
        if (p2.prices) setProductPrices(p2.prices);
      }
    } catch (error) {
      console.error('Error fetching pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  if (!mounted) {
    return null;
  }

  const handleCreateTier = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newTier: PriceTier = {
      id: Date.now().toString(),
      ...tierForm,
      appliedBranches: 0,
      productCount: 0,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    setPriceTiers(prev => [...prev, newTier]);
    setSaving(false);
    setShowCreateTierModal(false);
  };

  const handleDeleteTier = async () => {
    if (!selectedTier) return;
    setPriceTiers(prev => prev.filter(t => t.id !== selectedTier.id));
    setShowDeleteConfirm(false);
    setSelectedTier(null);
  };

  const handleToggleLock = (product: ProductPrice) => {
    setProductPrices(prev => prev.map(p => 
      p.id === product.id 
        ? { ...p, isStandard: !p.isStandard, lockedBy: !p.isStandard ? 'Admin HQ' : null }
        : p
    ));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const filteredTiers = priceTiers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = productPrices.filter(p =>
    p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <HQLayout title="Harga & Price Tier" subtitle="Kelola tier harga dan pricing produk">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Tag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{priceTiers.length}</p>
                <p className="text-sm text-gray-500">Price Tier</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{productPrices.length}</p>
                <p className="text-sm text-gray-500">Produk dengan Harga</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Lock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{productPrices.filter(p => p.isStandard).length}</p>
                <p className="text-sm text-gray-500">Harga Terkunci</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Building2 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{priceTiers.reduce((sum, t) => sum + t.appliedBranches, 0)}</p>
                <p className="text-sm text-gray-500">Cabang Terkait</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('tiers')}
                className={`px-6 py-4 text-sm font-medium border-b-2 -mb-px ${
                  activeTab === 'tiers' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Price Tiers
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`px-6 py-4 text-sm font-medium border-b-2 -mb-px ${
                  activeTab === 'products' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Harga Produk
              </button>
            </div>
          </div>

          <div className="p-4">
            {/* Filters */}
            <div className="flex items-center justify-between mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'tiers' ? 'Cari tier...' : 'Cari produk...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                {activeTab === 'tiers' && (
                  <button
                    onClick={() => {
                      setTierForm({ code: '', name: '', description: '', multiplier: 1.0, markupPercent: 0, region: '' });
                      setShowCreateTierModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Tier
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : activeTab === 'tiers' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Kode</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Nama Tier</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Region</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Multiplier</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Markup</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Cabang</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTiers.map((tier) => (
                      <tr key={tier.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-gray-100 rounded font-mono text-sm">{tier.code}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{tier.name}</p>
                            <p className="text-sm text-gray-500">{tier.description}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            {tier.region}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono">{tier.multiplier}x</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-medium ${tier.markupPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tier.markupPercent >= 0 ? '+' : ''}{tier.markupPercent}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">{tier.appliedBranches}</td>
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={tier.isActive ? 'active' : 'inactive'} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedTier(tier);
                                setTierForm({
                                  code: tier.code,
                                  name: tier.name,
                                  description: tier.description,
                                  multiplier: tier.multiplier,
                                  markupPercent: tier.markupPercent,
                                  region: tier.region
                                });
                                setShowEditTierModal(true);
                              }}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTier(tier);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              disabled={tier.code === 'STD'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Produk</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Kategori</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Harga Dasar</th>
                      {priceTiers.slice(0, 3).map(tier => (
                        <th key={tier.id} className="text-right py-3 px-4 font-medium text-gray-500">{tier.name}</th>
                      ))}
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Lock</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{product.productName}</p>
                            <p className="text-sm text-gray-500">{product.sku}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{product.category}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatCurrency(product.basePrice)}</td>
                        {priceTiers.slice(0, 3).map(tier => {
                          const tierPrice = product.tierPrices.find(tp => tp.tierId === tier.id);
                          return (
                            <td key={tier.id} className="py-3 px-4 text-right">
                              {tierPrice ? formatCurrency(tierPrice.price) : '-'}
                            </td>
                          );
                        })}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleLock(product)}
                            className={`p-2 rounded-lg ${product.isStandard ? 'text-purple-600 bg-purple-50' : 'text-gray-400 hover:bg-gray-100'}`}
                          >
                            {product.isStandard ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowPriceModal(true);
                              }}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit Tier Modal */}
        <Modal
          isOpen={showCreateTierModal || showEditTierModal}
          onClose={() => { setShowCreateTierModal(false); setShowEditTierModal(false); }}
          title={showCreateTierModal ? 'Tambah Price Tier' : 'Edit Price Tier'}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode</label>
                <input
                  type="text"
                  value={tierForm.code}
                  onChange={(e) => setTierForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="STD, MALL, dll"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Tier</label>
                <input
                  type="text"
                  value={tierForm.name}
                  onChange={(e) => setTierForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Harga Standar"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
              <textarea
                value={tierForm.description}
                onChange={(e) => setTierForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Multiplier</label>
                <input
                  type="number"
                  step="0.01"
                  value={tierForm.multiplier}
                  onChange={(e) => setTierForm(prev => ({ ...prev, multiplier: parseFloat(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Markup (%)</label>
                <input
                  type="number"
                  value={tierForm.markupPercent}
                  onChange={(e) => setTierForm(prev => ({ ...prev, markupPercent: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input
                type="text"
                value={tierForm.region}
                onChange={(e) => setTierForm(prev => ({ ...prev, region: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Nasional, Jakarta, dll"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => { setShowCreateTierModal(false); setShowEditTierModal(false); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleCreateTier}
                disabled={saving || !tierForm.code || !tierForm.name}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Price Edit Modal */}
        <Modal
          isOpen={showPriceModal}
          onClose={() => setShowPriceModal(false)}
          title={`Edit Harga - ${selectedProduct?.productName}`}
          size="lg"
        >
          {selectedProduct && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{selectedProduct.productName}</p>
                    <p className="text-sm text-gray-500">{selectedProduct.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Harga Dasar</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(selectedProduct.basePrice)}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {priceTiers.map(tier => {
                  const tierPrice = selectedProduct.tierPrices.find(tp => tp.tierId === tier.id);
                  return (
                    <div key={tier.id} className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">{tier.name}</p>
                        <p className="text-sm text-gray-500">{tier.markupPercent >= 0 ? '+' : ''}{tier.markupPercent}%</p>
                      </div>
                      <input
                        type="number"
                        defaultValue={tierPrice?.price || Math.round(selectedProduct.basePrice * tier.multiplier)}
                        className="w-40 px-4 py-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500"
                        disabled={selectedProduct.isStandard}
                      />
                    </div>
                  );
                })}
              </div>
              {selectedProduct.isStandard && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg text-yellow-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm">Harga terkunci oleh {selectedProduct.lockedBy}. Unlock untuk mengedit.</span>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowPriceModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Tutup
                </button>
                <button
                  disabled={selectedProduct.isStandard}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Simpan
                </button>
              </div>
            </div>
          )}
        </Modal>

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteTier}
          title="Hapus Price Tier"
          message={`Apakah Anda yakin ingin menghapus tier "${selectedTier?.name}"?`}
          confirmText="Hapus"
          variant="danger"
        />
      </div>
    </HQLayout>
  );
}
