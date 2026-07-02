import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FaShoppingCart, FaExclamationTriangle, FaCheckCircle,
  FaCalculator, FaTruck, FaCalendarAlt, FaBoxOpen, FaPlus, FaMinus,
  FaBuilding, FaFileInvoice, FaArrowLeft, FaSave, FaTimes
} from 'react-icons/fa';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock?: number;
  supplier: string;
  leadTime?: number;
  avgDailySales?: number;
}

interface OrderItem {
  product: Product;
  quantity: number;
  rop: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

const CreatePurchaseOrderPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, formatCurrency } = useTranslation();
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'low' | 'normal'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('30');
  const [notes, setNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Mock products data
  const products: Product[] = [
    { id: '1', name: 'Kopi Arabica Premium 250g', sku: 'KOP-001', category: 'Minuman', price: 45000, cost: 30000, stock: 50, minStock: 10, maxStock: 100, supplier: 'PT Kopi Nusantara', leadTime: 7, avgDailySales: 8 },
    { id: '2', name: 'Teh Hijau Organik', sku: 'TEH-001', category: 'Minuman', price: 35000, cost: 22000, stock: 8, minStock: 10, maxStock: 80, supplier: 'CV Teh Sehat', leadTime: 5, avgDailySales: 6 },
    { id: '3', name: 'Gula Pasir 1kg', sku: 'GUL-001', category: 'Bahan Pokok', price: 15000, cost: 12000, stock: 100, minStock: 20, maxStock: 200, supplier: 'PT Gula Manis', leadTime: 3, avgDailySales: 15 },
    { id: '4', name: 'Minyak Goreng 2L', sku: 'MIN-001', category: 'Bahan Pokok', price: 32000, cost: 28000, stock: 2, minStock: 15, maxStock: 120, supplier: 'PT Minyak Sejahtera', leadTime: 7, avgDailySales: 10 },
    { id: '5', name: 'Beras Premium 5kg', sku: 'BER-001', category: 'Bahan Pokok', price: 85000, cost: 70000, stock: 40, minStock: 10, maxStock: 150, supplier: 'CV Beras Padi', leadTime: 5, avgDailySales: 12 },
    { id: '6', name: 'Susu UHT 1L', sku: 'SUS-001', category: 'Minuman', price: 18000, cost: 14000, stock: 0, minStock: 25, maxStock: 150, supplier: 'PT Susu Segar', leadTime: 2, avgDailySales: 20 },
    { id: '7', name: 'Roti Tawar', sku: 'ROT-001', category: 'Makanan', price: 12000, cost: 8000, stock: 5, minStock: 15, maxStock: 100, supplier: 'CV Roti Manis', leadTime: 1, avgDailySales: 18 },
    { id: '8', name: 'Telur Ayam 1kg', sku: 'TEL-001', category: 'Bahan Pokok', price: 28000, cost: 24000, stock: 15, minStock: 20, maxStock: 150, supplier: 'PT Telur Segar', leadTime: 2, avgDailySales: 12 },
  ];

  const suppliers = Array.from(new Set(products.map(p => p.supplier)));

  // Track unsaved changes
  useEffect(() => {
    if (selectedItems.length > 0 || selectedSupplier || notes) {
      setHasUnsavedChanges(true);
    }
  }, [selectedItems, selectedSupplier, notes]);

  // Warn before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const calculateROP = (product: Product) => {
    const avgDailySales = product.avgDailySales || 5;
    const leadTime = product.leadTime || 7;
    const safetyStock = product.minStock;
    return Math.ceil((avgDailySales * leadTime) + safetyStock);
  };

  const calculateEOQ = (product: Product) => {
    const annualDemand = (product.avgDailySales || 5) * 365;
    const orderingCost = 50000;
    const holdingCost = product.cost * 0.2;
    return Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / holdingCost));
  };

  const getUrgency = (product: Product): 'critical' | 'high' | 'medium' | 'low' => {
    const rop = calculateROP(product);
    if (product.stock === 0) return 'critical';
    if (product.stock <= product.minStock) return 'critical';
    if (product.stock <= rop) return 'high';
    if (product.stock <= rop * 1.5) return 'medium';
    return 'low';
  };

  const getFilteredProducts = () => {
    let filtered = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const urgency = getUrgency(p);
      if (filterStatus === 'all') return true;
      if (filterStatus === 'critical') return urgency === 'critical';
      if (filterStatus === 'low') return urgency === 'high' || urgency === 'critical';
      if (filterStatus === 'normal') return urgency === 'medium' || urgency === 'low';
      return true;
    });

    return filtered.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return urgencyOrder[getUrgency(a)] - urgencyOrder[getUrgency(b)];
    });
  };

  const addToOrder = (product: Product) => {
    const rop = calculateROP(product);
    const urgency = getUrgency(product);
    const suggestedQty = Math.max(rop - product.stock, calculateEOQ(product));

    const existingItem = selectedItems.find(item => item.product.id === product.id);
    if (existingItem) {
      setSelectedItems(selectedItems.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + suggestedQty }
          : item
      ));
    } else {
      setSelectedItems([...selectedItems, {
        product,
        quantity: suggestedQty,
        rop,
        urgency
      }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedItems(selectedItems.filter(item => item.product.id !== productId));
    } else {
      setSelectedItems(selectedItems.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const getTotalCost = () => {
    return selectedItems.reduce((sum, item) => sum + (item.product.cost * item.quantity), 0);
  };


  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowExitWarning(true);
    } else {
      router.push('/inventory');
    }
  };

  const handleCreateOrder = () => {
    setHasUnsavedChanges(false);
    alert('Purchase Order created successfully!\nRedirecting to PO Management...');
    router.push('/inventory/purchase-orders');
  };

  const filteredProducts = getFilteredProducts();
  const criticalCount = products.filter(p => getUrgency(p) === 'critical').length;
  const lowStockCount = products.filter(p => getUrgency(p) === 'high').length;

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Create Purchase Order | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleBack}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              >
                <FaArrowLeft className="mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center space-x-3">
                  <FaShoppingCart className="text-3xl" />
                  <span>Create Purchase Order</span>
                </h1>
                <p className="text-blue-100 text-sm">Sistem pemesanan otomatis dengan ROP & EOQ calculation</p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/inventory/purchase-orders')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
            >
              <FaFileInvoice className="mr-2" />
              View All Orders
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-xs text-blue-100">Total Produk</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
            <div className="bg-red-500/30 backdrop-blur-sm rounded-lg p-3">
              <p className="text-xs text-red-100">Critical</p>
              <p className="text-2xl font-bold">{criticalCount}</p>
            </div>
            <div className="bg-yellow-500/30 backdrop-blur-sm rounded-lg p-3">
              <p className="text-xs text-yellow-100">Low Stock</p>
              <p className="text-2xl font-bold">{lowStockCount}</p>
            </div>
            <div className="bg-green-500/30 backdrop-blur-sm rounded-lg p-3">
              <p className="text-xs text-green-100">Items Selected</p>
              <p className="text-2xl font-bold">{selectedItems.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Product List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Input
                    placeholder="Cari produk atau SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('all')}
                    className="flex-1"
                  >
                    Semua
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === 'critical' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('critical')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    Critical
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === 'low' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('low')}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    Low Stock
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === 'normal' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('normal')}
                    className="flex-1"
                  >
                    Normal
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Product List */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Available Products ({filteredProducts.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredProducts.map((product) => {
                  const rop = calculateROP(product);
                  const eoq = calculateEOQ(product);
                  const urgency = getUrgency(product);
                  const stockPercentage = (product.stock / (product.minStock * 3)) * 100;
                  const suggestedQty = Math.max(rop - product.stock, eoq);

                  return (
                    <div
                      key={product.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{product.name}</h3>
                            <Badge
                              className={
                                urgency === 'critical' ? 'bg-red-100 text-red-700' :
                                urgency === 'high' ? 'bg-yellow-100 text-yellow-700' :
                                urgency === 'medium' ? 'bg-blue-100 text-blue-700' :
                                'bg-green-100 text-green-700'
                              }
                            >
                              {urgency === 'critical' ? 'CRITICAL' :
                               urgency === 'high' ? 'LOW STOCK' :
                               urgency === 'medium' ? 'MEDIUM' : 'NORMAL'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">SKU: {product.sku} | Supplier: {product.supplier}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addToOrder(product)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <FaPlus className="mr-1" />
                          Add
                        </Button>
                      </div>

                      <div className="grid grid-cols-4 gap-3 mb-3 p-3 bg-gray-50 rounded-lg text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Current Stock</p>
                          <p className="font-bold text-gray-900">{product.stock}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">ROP</p>
                          <p className="font-bold text-blue-600">{rop}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">EOQ</p>
                          <p className="font-bold text-green-600">{eoq}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Suggested</p>
                          <p className="font-bold text-orange-600">{suggestedQty}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Stock Level</span>
                          <span className="font-bold">{stockPercentage.toFixed(0)}%</span>
                        </div>
                        <Progress
                          value={stockPercentage}
                          className={`h-2 ${
                            urgency === 'critical' ? 'bg-red-100' :
                            urgency === 'high' ? 'bg-yellow-100' : 'bg-green-100'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Order Summary */}
          <div className="space-y-4">
            <Card className="shadow-lg border-0 sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FaSave className="text-blue-600" />
                  <span>Order Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <FaCalendarAlt className="text-gray-400" />
                    <Input
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <FaTruck className="text-gray-400" />
                    <Input
                      type="date"
                      placeholder="Expected Delivery"
                      value={expectedDelivery}
                      onChange={(e) => setExpectedDelivery(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-3 border-t border-b py-3">
                  {selectedItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <FaBoxOpen className="text-4xl mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Belum ada produk dipilih</p>
                    </div>
                  ) : (
                    selectedItems.map((item) => (
                      <div key={item.product.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-gray-900">{item.product.name}</h4>
                            <p className="text-xs text-gray-500">{item.product.sku}</p>
                          </div>
                          <button
                            onClick={() => updateQuantity(item.product.id, 0)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTimes />
                          </button>
                        </div>

                        <div className="flex items-center space-x-2 mb-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 10)}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                          >
                            <FaMinus className="text-xs" />
                          </button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                            className="flex-1 text-center"
                          />
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 10)}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                          >
                            <FaPlus className="text-xs" />
                          </button>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-bold text-gray-900">
                            {formatCurrency(item.product.cost * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-600 font-semibold mb-1 block">Supplier *</label>
                    <select
                      value={selectedSupplier}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Pilih Supplier</option>
                      {suppliers.map((supplier, idx) => (
                        <option key={idx} value={supplier}>{supplier}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 font-semibold mb-1 block">Payment Terms</label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="0">Cash on Delivery</option>
                      <option value="7">7 Days</option>
                      <option value="14">14 Days</option>
                      <option value="30">30 Days</option>
                      <option value="45">45 Days</option>
                      <option value="60">60 Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 font-semibold mb-1 block">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Catatan tambahan untuk order ini..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Items:</span>
                    <span className="font-semibold">{selectedItems.reduce((sum, item) => sum + item.quantity, 0)} units</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Cost:</span>
                    <span className="text-blue-600">{formatCurrency(getTotalCost())}</span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowConfirmation(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 text-lg font-bold"
                  disabled={selectedItems.length === 0 || !selectedSupplier}
                >
                  <FaCheckCircle className="mr-2 text-xl" />
                  Create Purchase Order
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <FaCheckCircle className="text-green-600 mr-3" />
              Konfirmasi Purchase Order
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600">Supplier</p>
                  <p className="font-semibold text-gray-900">{selectedSupplier}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Order Date</p>
                  <p className="font-semibold text-gray-900">{orderDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Expected Delivery</p>
                  <p className="font-semibold text-gray-900">{expectedDelivery || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Payment Terms</p>
                  <p className="font-semibold text-gray-900">{paymentTerms === '0' ? 'COD' : `${paymentTerms} Days`}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-2">Product</th>
                      <th className="text-center p-2">Qty</th>
                      <th className="text-right p-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{item.product.name}</td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-right font-semibold">
                          {formatCurrency(item.product.cost * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                <span className="text-lg font-bold text-gray-900">Total Amount:</span>
                <span className="text-2xl font-bold text-blue-600">{formatCurrency(getTotalCost())}</span>
              </div>

              {notes && (
                <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                  <p className="text-xs text-gray-600 font-semibold">Notes:</p>
                  <p className="text-sm text-gray-700">{notes}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => setShowConfirmation(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateOrder}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <FaCheckCircle className="mr-2" />
                Confirm & Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Warning Modal */}
      {showExitWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center">
              <FaExclamationTriangle className="text-yellow-600 mr-3" />
              Unsaved Changes
            </h3>
            <p className="text-gray-600 mb-6">
              Anda memiliki perubahan yang belum disimpan. Apakah Anda yakin ingin keluar? Semua data yang belum disimpan akan hilang.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowExitWarning(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setHasUnsavedChanges(false);
                  router.push('/inventory');
                }}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Yes, Exit
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CreatePurchaseOrderPage;
