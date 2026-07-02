import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FaArrowLeft, FaPlus, FaTimes, FaWarehouse, FaStore, FaBoxOpen,
  FaShippingFast, FaExclamationTriangle, FaSave, FaSpinner
} from 'react-icons/fa';

interface Product {
  id: number;
  name: string;
  sku: string;
  current_stock?: number;
  unit_cost?: number;
}

interface TransferItem {
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
}

interface Location {
  id: number;
  name: string;
  type: string;
}

const CreateTransferPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, formatCurrency } = useTranslation();
  
  // Form state
  const [fromLocationId, setFromLocationId] = useState<number | ''>('');
  const [toLocationId, setToLocationId] = useState<number | ''>('');
  const [priority, setPriority] = useState<string>('normal');
  const [reason, setReason] = useState<string>('');
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<TransferItem[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchLocations();
      fetchProducts();
    }
  }, [status]);

  const fetchLocations = async () => {
    try {
      const response = await axios.get('/api/locations');
      if (response.data.success) {
        setLocations(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products', {
        params: { limit: 1000 }
      });
      if (response.data.success) {
        setProducts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        product_id: 0,
        product_name: '',
        product_sku: '',
        quantity: 1,
        unit_cost: 0,
        subtotal: 0
      }
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TransferItem, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    
    // Recalculate subtotal
    if (field === 'quantity' || field === 'unit_cost') {
      newItems[index].subtotal = newItems[index].quantity * newItems[index].unit_cost;
    }
    
    setItems(newItems);
  };

  const selectProduct = (product: Product, index: number) => {
    updateItem(index, 'product_id', product.id);
    updateItem(index, 'product_name', product.name);
    updateItem(index, 'product_sku', product.sku);
    updateItem(index, 'unit_cost', product.unit_cost || 0);
    setShowProductSearch(false);
    setProductSearch('');
    setSelectedProductIndex(null);
  };

  const calculateTotals = () => {
    const itemsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const handlingFee = itemsTotal * 0.02; // 2% handling fee
    const grandTotal = itemsTotal + shippingCost + handlingFee;
    
    return {
      itemsTotal,
      handlingFee,
      grandTotal
    };
  };


  const validateForm = (): boolean => {
    if (!fromLocationId) {
      toast.error('Pilih lokasi asal');
      return false;
    }
    if (!toLocationId) {
      toast.error('Pilih lokasi tujuan');
      return false;
    }
    if (fromLocationId === toLocationId) {
      toast.error('Lokasi asal dan tujuan tidak boleh sama');
      return false;
    }
    if (!reason.trim()) {
      toast.error('Alasan transfer harus diisi');
      return false;
    }
    if (items.length === 0) {
      toast.error('Tambahkan minimal 1 produk');
      return false;
    }
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.product_id) {
        toast.error(`Pilih produk untuk item #${i + 1}`);
        return false;
      }
      if (item.quantity <= 0) {
        toast.error(`Quantity item #${i + 1} harus lebih dari 0`);
        return false;
      }
      if (item.unit_cost < 0) {
        toast.error(`Biaya unit item #${i + 1} tidak valid`);
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const payload = {
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        priority,
        reason,
        shipping_cost: shippingCost,
        notes,
        items: items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          quantity: item.quantity,
          unit_cost: item.unit_cost
        }))
      };
      
      const response = await axios.post('/api/inventory/transfers', payload);
      
      if (response.data.success) {
        toast.success(`Transfer berhasil dibuat! Nomor: ${response.data.data.transfer_number}`);
        setTimeout(() => {
          router.push('/inventory/transfers');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      toast.error(error.response?.data?.message || 'Gagal membuat transfer');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <FaSpinner className="animate-spin text-4xl text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Toaster position="top-right" />
      <Head>
        <title>Buat Transfer Baru | BEDAGANG Cloud POS</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Button
                  onClick={() => router.push('/inventory/transfers')}
                  variant="outline"
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30 text-white"
                >
                  <FaArrowLeft className="mr-2" />
                  Kembali
                </Button>
              </div>
              <h1 className="text-3xl font-bold">Buat Transfer Baru</h1>
              <p className="text-indigo-100 text-sm">Permintaan transfer stok antar lokasi</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <FaBoxOpen className="w-8 h-8" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Transfer Information */}
          <Card className="shadow-lg border-0 mb-6">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="flex items-center space-x-2">
                <FaWarehouse className="text-indigo-600" />
                <span>Informasi Transfer</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* From Location */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Dari Lokasi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fromLocationId}
                    onChange={(e) => setFromLocationId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Pilih Lokasi Asal</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* To Location */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ke Lokasi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={toLocationId}
                    onChange={(e) => setToLocationId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Pilih Lokasi Tujuan</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id} disabled={loc.id === fromLocationId}>
                        {loc.name} ({loc.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Prioritas <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                {/* Shipping Cost */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Biaya Pengiriman
                  </label>
                  <Input
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    step="1000"
                  />
                </div>

                {/* Reason */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Alasan Transfer <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={3}
                    placeholder="Jelaskan alasan transfer ini..."
                    required
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Catatan Tambahan
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={2}
                    placeholder="Catatan tambahan (opsional)..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="shadow-lg border-0 mb-6">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <FaBoxOpen className="text-purple-600" />
                  <span>Produk yang Ditransfer</span>
                </CardTitle>
                <Button
                  type="button"
                  onClick={addItem}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <FaPlus className="mr-2" />
                  Tambah Produk
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {items.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <FaBoxOpen className="mx-auto text-5xl text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Belum ada produk ditambahkan</p>
                  <Button
                    type="button"
                    onClick={addItem}
                    variant="outline"
                  >
                    <FaPlus className="mr-2" />
                    Tambah Produk Pertama
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Item #{index + 1}</h4>
                        <Button
                          type="button"
                          onClick={() => removeItem(index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                        >
                          <FaTimes />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Product Selection */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Produk <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Input
                              value={item.product_name || ''}
                              onClick={() => {
                                setSelectedProductIndex(index);
                                setShowProductSearch(true);
                              }}
                              placeholder="Klik untuk pilih produk..."
                              readOnly
                              className="cursor-pointer"
                              required
                            />
                            {item.product_sku && (
                              <p className="text-xs text-gray-500 mt-1">SKU: {item.product_sku}</p>
                            )}
                          </div>
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            min="1"
                            step="1"
                            required
                          />
                        </div>

                        {/* Unit Cost */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Biaya Unit
                          </label>
                          <Input
                            type="number"
                            value={item.unit_cost}
                            onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="1000"
                          />
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">Subtotal:</span>
                          <span className="text-lg font-bold text-indigo-600">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="shadow-lg border-0 mb-6">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center space-x-2">
                <FaShippingFast className="text-green-600" />
                <span>Ringkasan Biaya</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal Produk:</span>
                  <span className="font-semibold">{formatCurrency(totals.itemsTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Biaya Pengiriman:</span>
                  <span className="font-semibold">{formatCurrency(shippingCost)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Biaya Handling (2%):</span>
                  <span className="font-semibold">{formatCurrency(totals.handlingFee)}</span>
                </div>
                <div className="border-t-2 border-gray-300 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">TOTAL:</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {formatCurrency(totals.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              onClick={() => router.push('/inventory/transfers')}
              variant="outline"
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 px-8"
              disabled={loading || items.length === 0}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  Buat Transfer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Product Search Modal */}
      {showProductSearch && selectedProductIndex !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Pilih Produk</h2>
                <button
                  onClick={() => {
                    setShowProductSearch(false);
                    setProductSearch('');
                    setSelectedProductIndex(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Cari produk berdasarkan nama atau SKU..."
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-96 p-4">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaBoxOpen className="mx-auto text-4xl mb-2" />
                  <p>Produk tidak ditemukan</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => selectProduct(product, selectedProductIndex)}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                          {product.current_stock !== undefined && (
                            <p className="text-xs text-gray-600 mt-1">
                              Stock: {product.current_stock}
                            </p>
                          )}
                        </div>
                        {product.unit_cost && (
                          <div className="text-right">
                            <p className="text-sm font-semibold text-indigo-600">
                              {formatCurrency(product.unit_cost)}
                            </p>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CreateTransferPage;
