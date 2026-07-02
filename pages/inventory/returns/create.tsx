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
import { Label } from '@/components/ui/label';
import {
  FaArrowLeft, FaSave, FaUndo, FaExclamationTriangle,
  FaCheckCircle, FaBox, FaUser, FaPhone, FaDollarSign, FaFileInvoice,
  FaClipboardList
} from 'react-icons/fa';

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
}

const CreateReturnPage: React.FC = () => {
  const router = useRouter();
  const { t, formatCurrency, formatDate } = useTranslation();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Return number mode
  const [returnNumberMode, setReturnNumberMode] = useState<'auto' | 'manual'>('auto');
  const [customReturnNumber, setCustomReturnNumber] = useState('');
  
  // Stock Opname integration
  const [showStockOpnameModal, setShowStockOpnameModal] = useState(false);
  const [stockOpnameItems, setStockOpnameItems] = useState<any[]>([]);
  const [loadingStockOpname, setLoadingStockOpname] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    transactionId: '',
    customerName: '',
    customerPhone: '',
    productId: '',
    productName: '',
    productSku: '',
    quantity: '',
    unit: 'pcs',
    returnReason: 'defective',
    returnType: 'refund',
    condition: 'unopened',
    originalPrice: '',
    refundAmount: '',
    restockingFee: '0',
    returnDate: new Date().toISOString().split('T')[0],
    notes: '',
    invoiceNumber: '',
    invoiceDate: '',
    distributorName: '',
    distributorPhone: '',
    purchaseDate: '',
    customReturnNumber: '',
    stockOpnameId: '',
    stockOpnameItemId: '',
    sourceType: 'manual'
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Fetch products for dropdown
  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch stock opname returnable items
  const fetchStockOpnameItems = async () => {
    setLoadingStockOpname(true);
    try {
      const response = await axios.get('/api/stock-opname/returnable-items');
      if (response.data.success) {
        setStockOpnameItems(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stock opname items:', error);
      toast.error('Gagal memuat data stock opname');
    } finally {
      setLoadingStockOpname(false);
    }
  };

  // Handle import from stock opname
  const handleImportFromStockOpname = (item: any) => {
    setFormData(prev => ({
      ...prev,
      productId: item.product_id?.toString() || '',
      productName: item.product_name,
      productSku: item.product_sku || '',
      quantity: Math.abs(item.difference || item.actual_qty).toString(),
      originalPrice: (item.unit_cost || item.product_price || 0).toString(),
      returnReason: item.discrepancy_reason || 'defective',
      condition: item.condition || 'damaged',
      notes: `Stock Opname: ${item.opname_number}\n${item.notes || ''}`,
      stockOpnameId: item.stock_opname_id?.toString() || '',
      stockOpnameItemId: item.item_id?.toString() || '',
      sourceType: 'stock_opname'
    }));
    
    setSearchQuery(item.product_name);
    setShowStockOpnameModal(false);
    toast.success(`Data dari Stock Opname ${item.opname_number} berhasil dimuat`);
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products?limit=100');
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleProductSelect = (product: Product) => {
    setFormData(prev => ({
      ...prev,
      productId: product.id.toString(),
      productName: product.name,
      productSku: product.sku,
      originalPrice: product.price.toString()
    }));
    setSearchQuery(product.name);
    setShowSuggestions(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length > 0) {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.sku.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredProducts([]);
      setShowSuggestions(false);
    }
  };

  const calculateRefundAmount = () => {
    const quantity = parseFloat(formData.quantity) || 0;
    const originalPrice = parseFloat(formData.originalPrice) || 0;
    const restockingFee = parseFloat(formData.restockingFee) || 0;
    
    const subtotal = quantity * originalPrice;
    const refund = subtotal - restockingFee;
    
    setFormData(prev => ({
      ...prev,
      refundAmount: refund.toString()
    }));
  };

  useEffect(() => {
    if (formData.quantity && formData.originalPrice) {
      calculateRefundAmount();
    }
  }, [formData.quantity, formData.originalPrice, formData.restockingFee]);

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Validate custom return number if manual mode
    if (returnNumberMode === 'manual') {
      if (!customReturnNumber.trim()) {
        newErrors.customReturnNumber = 'Nomor retur wajib diisi untuk mode manual';
      } else if (customReturnNumber.length < 5) {
        newErrors.customReturnNumber = 'Nomor retur minimal 5 karakter';
      }
    }

    if (!formData.productName) {
      newErrors.productName = 'Nama produk wajib diisi';
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Jumlah harus lebih dari 0';
    }

    if (!formData.originalPrice || parseFloat(formData.originalPrice) <= 0) {
      newErrors.originalPrice = 'Harga original harus lebih dari 0';
    }

    if (!formData.returnDate) {
      newErrors.returnDate = 'Tanggal retur wajib diisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Mohon lengkapi semua field yang wajib diisi', { duration: 4000 });
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        transactionId: formData.transactionId ? parseInt(formData.transactionId) : null,
        customerName: formData.customerName || null,
        customerPhone: formData.customerPhone || null,
        productId: formData.productId ? parseInt(formData.productId) : null,
        productName: formData.productName,
        productSku: formData.productSku || null,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        returnReason: formData.returnReason,
        returnType: formData.returnType,
        condition: formData.condition,
        originalPrice: parseFloat(formData.originalPrice),
        refundAmount: parseFloat(formData.refundAmount),
        restockingFee: parseFloat(formData.restockingFee),
        returnDate: formData.returnDate,
        notes: formData.notes || null,
        invoiceNumber: formData.invoiceNumber || null,
        invoiceDate: formData.invoiceDate || null,
        distributorName: formData.distributorName || null,
        distributorPhone: formData.distributorPhone || null,
        purchaseDate: formData.purchaseDate || null,
        customReturnNumber: returnNumberMode === 'manual' ? customReturnNumber.trim() : null,
        stockOpnameId: formData.stockOpnameId ? parseInt(formData.stockOpnameId) : null,
        stockOpnameItemId: formData.stockOpnameItemId ? parseInt(formData.stockOpnameItemId) : null,
        sourceType: formData.sourceType
      };

      const response = await axios.post('/api/returns', submitData);

      if (response.data.success) {
        toast.success(
          `Return berhasil dibuat! Nomor: ${response.data.data.return_number}`,
          { duration: 5000 }
        );
        
        // Redirect to returns list after 2 seconds
        setTimeout(() => {
          router.push('/inventory/returns');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error creating return:', error);
      toast.error(
        error.response?.data?.message || 'Gagal membuat return. Silakan coba lagi.',
        { duration: 4000 }
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <DashboardLayout>
      <Head>
        <title>Buat Retur Baru | BEDAGANG Cloud POS</title>
      </Head>

      <Toaster position="top-right" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <FaArrowLeft />
              <span>Kembali</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Buat Retur Baru</h1>
              <p className="text-sm text-gray-600">Isi form di bawah untuk membuat retur produk</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Nomor Dokumen Retur - Mode Selection */}
              <Card className="border-2 border-purple-200 bg-purple-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <FaFileInvoice className="mr-2 text-purple-600" />
                    Nomor Dokumen Retur
                  </CardTitle>
                  <p className="text-xs text-gray-600 mt-1">Pilih mode penomoran dokumen retur</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mode Selection */}
                  <div>
                    <Label className="mb-3 block font-semibold">Mode Penomoran</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="returnNumberMode"
                          value="auto"
                          checked={returnNumberMode === 'auto'}
                          onChange={(e) => {
                            setReturnNumberMode('auto');
                            setCustomReturnNumber('');
                            setErrors(prev => ({ ...prev, customReturnNumber: '' }));
                          }}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span className="text-sm font-medium">
                          🤖 Generate Otomatis
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="returnNumberMode"
                          value="manual"
                          checked={returnNumberMode === 'manual'}
                          onChange={(e) => setReturnNumberMode('manual')}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span className="text-sm font-medium">
                          ✍️ Input Manual
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Auto Mode Info */}
                  {returnNumberMode === 'auto' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✓ Nomor retur akan di-generate otomatis oleh sistem dengan format: <strong>RET-YYYY-####</strong>
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Contoh: RET-2026-0001, RET-2026-0002, dst.
                      </p>
                    </div>
                  )}

                  {/* Manual Mode Input */}
                  {returnNumberMode === 'manual' && (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="customReturnNumber">
                          Nomor Retur Custom *
                        </Label>
                        <Input
                          id="customReturnNumber"
                          type="text"
                          placeholder="Contoh: RET-CUSTOM-001 atau format bebas"
                          value={customReturnNumber}
                          onChange={(e) => {
                            setCustomReturnNumber(e.target.value);
                            if (errors.customReturnNumber) {
                              setErrors(prev => ({ ...prev, customReturnNumber: '' }));
                            }
                          }}
                          className={`font-mono ${errors.customReturnNumber ? 'border-red-500' : ''}`}
                        />
                        {errors.customReturnNumber && (
                          <p className="text-red-600 text-sm mt-1">{errors.customReturnNumber}</p>
                        )}
                      </div>
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          ⚠️ <strong>Perhatian:</strong> Pastikan nomor yang Anda masukkan unik dan belum pernah digunakan.
                        </p>
                        <p className="text-xs text-yellow-600 mt-1">
                          Minimal 5 karakter. Format bebas sesuai kebutuhan Anda.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Invoice/Faktur Distributor - SOP */}
              <Card className="border-2 border-blue-200 bg-blue-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <FaFileInvoice className="mr-2 text-blue-600" />
                    Informasi Faktur/Invoice Distributor
                  </CardTitle>
                  <p className="text-xs text-gray-600 mt-1">Sesuai SOP: Wajib mencantumkan nomor faktur dari distributor</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="invoiceNumber">No. Faktur/Invoice *</Label>
                      <Input
                        id="invoiceNumber"
                        name="invoiceNumber"
                        placeholder="INV-2024-001"
                        value={formData.invoiceNumber}
                        onChange={handleInputChange}
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="invoiceDate">Tanggal Faktur</Label>
                      <Input
                        id="invoiceDate"
                        name="invoiceDate"
                        type="date"
                        value={formData.invoiceDate}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="distributorName">Nama Distributor/Supplier</Label>
                      <Input
                        id="distributorName"
                        name="distributorName"
                        placeholder="PT. Distributor ABC"
                        value={formData.distributorName}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="distributorPhone">No. Telepon Distributor</Label>
                      <Input
                        id="distributorPhone"
                        name="distributorPhone"
                        type="tel"
                        placeholder="021-1234567"
                        value={formData.distributorPhone}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="purchaseDate">Tanggal Pembelian</Label>
                    <Input
                      id="purchaseDate"
                      name="purchaseDate"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <FaUser className="mr-2 text-blue-600" />
                    Informasi Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="transactionId">ID Transaksi (Optional)</Label>
                      <Input
                        id="transactionId"
                        name="transactionId"
                        type="number"
                        placeholder="Masukkan ID transaksi"
                        value={formData.transactionId}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone">No. Telepon</Label>
                      <div className="relative">
                        <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          id="customerPhone"
                          name="customerPhone"
                          type="tel"
                          placeholder="08123456789"
                          value={formData.customerPhone}
                          onChange={handleInputChange}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customerName">Nama Customer</Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      placeholder="Masukkan nama customer"
                      value={formData.customerName}
                      onChange={handleInputChange}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Product Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center">
                      <FaBox className="mr-2 text-green-600" />
                      Informasi Produk
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        fetchStockOpnameItems();
                        setShowStockOpnameModal(true);
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white text-sm"
                      size="sm"
                    >
                      <FaClipboardList className="mr-2" />
                      Import dari Stock Opname
                    </Button>
                  </CardTitle>
                  <p className="text-xs text-gray-600 mt-1">
                    Pilih produk manual atau import dari hasil stock opname (barang expired/rusak)
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Label htmlFor="productSearch">Cari Produk *</Label>
                    <Input
                      id="productSearch"
                      type="text"
                      placeholder="Ketik nama produk atau SKU..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => {
                        if (searchQuery && filteredProducts.length > 0) {
                          setShowSuggestions(true);
                        }
                      }}
                      className={errors.productName ? 'border-red-500' : ''}
                    />
                    {errors.productName && (
                      <p className="text-red-600 text-sm mt-1">{errors.productName}</p>
                    )}
                    
                    {/* Suggestions Dropdown */}
                    {showSuggestions && filteredProducts.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredProducts.map(product => (
                          <div
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{product.name}</p>
                                <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-red-600">{formatCurrency(product.price)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* No Results */}
                    {showSuggestions && searchQuery && filteredProducts.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                        <p className="text-sm text-gray-500 text-center">Produk tidak ditemukan</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="productName">Nama Produk *</Label>
                      <Input
                        id="productName"
                        name="productName"
                        placeholder="Nama produk"
                        value={formData.productName}
                        onChange={handleInputChange}
                        className={errors.productName ? 'border-red-500' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="productSku">SKU</Label>
                      <Input
                        id="productSku"
                        name="productSku"
                        placeholder="SKU produk"
                        value={formData.productSku}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="quantity">Jumlah *</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        className={errors.quantity ? 'border-red-500' : ''}
                      />
                      {errors.quantity && (
                        <p className="text-red-600 text-sm mt-1">{errors.quantity}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="unit">Satuan</Label>
                      <select
                        id="unit"
                        name="unit"
                        value={formData.unit}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="pcs">Pcs</option>
                        <option value="kg">Kg</option>
                        <option value="liter">Liter</option>
                        <option value="box">Box</option>
                        <option value="pack">Pack</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="condition">Kondisi *</Label>
                      <select
                        id="condition"
                        name="condition"
                        value={formData.condition}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="unopened">Belum Dibuka</option>
                        <option value="opened">Sudah Dibuka</option>
                        <option value="damaged">Rusak</option>
                        <option value="expired">Kadaluarsa</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Return Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <FaUndo className="mr-2 text-red-600" />
                    Detail Retur
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="returnReason">Alasan Retur *</Label>
                      <select
                        id="returnReason"
                        name="returnReason"
                        value={formData.returnReason}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="defective">Produk Cacat</option>
                        <option value="expired">Kadaluarsa</option>
                        <option value="wrong_item">Salah Item</option>
                        <option value="customer_request">Permintaan Customer</option>
                        <option value="damaged">Rusak</option>
                        <option value="other">Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="returnType">Tipe Retur *</Label>
                      <select
                        id="returnType"
                        name="returnType"
                        value={formData.returnType}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="refund">Refund (Pengembalian Uang)</option>
                        <option value="exchange">Exchange (Tukar Barang)</option>
                        <option value="store_credit">Store Credit</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="returnDate">Tanggal Retur *</Label>
                    <Input
                      id="returnDate"
                      name="returnDate"
                      type="date"
                      value={formData.returnDate}
                      onChange={handleInputChange}
                      className={errors.returnDate ? 'border-red-500' : ''}
                    />
                    {errors.returnDate && (
                      <p className="text-red-600 text-sm mt-1">{errors.returnDate}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="notes">Catatan</Label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      placeholder="Tambahkan catatan tambahan..."
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <FaDollarSign className="mr-2 text-green-600" />
                    Ringkasan Biaya
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="originalPrice">Harga Original *</Label>
                    <Input
                      id="originalPrice"
                      name="originalPrice"
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={formData.originalPrice}
                      onChange={handleInputChange}
                      className={errors.originalPrice ? 'border-red-500' : ''}
                    />
                    {errors.originalPrice && (
                      <p className="text-red-600 text-sm mt-1">{errors.originalPrice}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="restockingFee">Biaya Restocking</Label>
                    <Input
                      id="restockingFee"
                      name="restockingFee"
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={formData.restockingFee}
                      onChange={handleInputChange}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Biaya yang dipotong dari refund
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-semibold">
                          {formatCurrency(
                            (parseFloat(formData.quantity) || 0) * (parseFloat(formData.originalPrice) || 0)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Restocking Fee:</span>
                        <span className="font-semibold text-red-600">
                          - {formatCurrency(parseFloat(formData.restockingFee) || 0)}
                        </span>
                      </div>
                      <div className="border-t pt-2 flex justify-between">
                        <span className="font-bold text-lg">Total Refund:</span>
                        <span className="font-bold text-lg text-green-600">
                          {formatCurrency(parseFloat(formData.refundAmount) || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      {loading ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <FaSave className="mr-2" />
                          Simpan Retur
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      className="w-full"
                      disabled={loading}
                    >
                      Batal
                    </Button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <FaCheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-800">
                        <p className="font-semibold mb-1">Informasi:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Return akan berstatus "Pending"</li>
                          <li>Perlu approval dari manager</li>
                          <li>Nomor return akan di-generate otomatis</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>

        {/* Stock Opname Modal */}
        {showStockOpnameModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Import dari Stock Opname</h2>
                    <p className="text-orange-100 text-sm mt-1">
                      Pilih barang expired/rusak dari hasil stock opname
                    </p>
                  </div>
                  <button
                    onClick={() => setShowStockOpnameModal(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    <FaExclamationTriangle className="text-xl" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {loadingStockOpname ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Memuat data stock opname...</p>
                  </div>
                ) : stockOpnameItems.length === 0 ? (
                  <div className="text-center py-12">
                    <FaBox className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">Tidak ada barang yang perlu di-retur</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Semua item dari stock opname sudah dalam kondisi baik atau sudah di-retur
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800">
                        <strong>Ditemukan {stockOpnameItems.length} item</strong> yang perlu di-retur
                        (expired, rusak, atau hilang)
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                          <tr>
                            <th className="text-left p-3 text-sm font-semibold">No. Opname</th>
                            <th className="text-left p-3 text-sm font-semibold">Produk</th>
                            <th className="text-center p-3 text-sm font-semibold">Qty</th>
                            <th className="text-center p-3 text-sm font-semibold">Kondisi</th>
                            <th className="text-left p-3 text-sm font-semibold">Alasan</th>
                            <th className="text-center p-3 text-sm font-semibold">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockOpnameItems.map((item, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="p-3">
                                <p className="font-mono text-sm font-semibold">{item.opname_number}</p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(item.opname_date)}
                                </p>
                              </td>
                              <td className="p-3">
                                <p className="font-semibold">{item.product_name}</p>
                                <p className="text-xs text-gray-500">SKU: {item.product_sku || '-'}</p>
                              </td>
                              <td className="p-3 text-center">
                                <span className="font-bold text-red-600">
                                  {Math.abs(item.difference || item.actual_qty)}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  item.condition === 'expired' ? 'bg-yellow-100 text-yellow-800' :
                                  item.condition === 'damaged' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {item.condition || 'Unknown'}
                                </span>
                              </td>
                              <td className="p-3">
                                <p className="text-sm">{item.discrepancy_reason || '-'}</p>
                                {item.notes && (
                                  <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <Button
                                  type="button"
                                  onClick={() => handleImportFromStockOpname(item)}
                                  className="bg-orange-600 hover:bg-orange-700 text-white text-sm"
                                  size="sm"
                                >
                                  <FaCheckCircle className="mr-1" />
                                  Pilih
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CreateReturnPage;
