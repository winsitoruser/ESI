import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from '@/lib/i18n';
import {
  FaTimes, FaShoppingCart, FaExclamationTriangle, FaCheckCircle,
  FaCalculator, FaTruck, FaCalendarAlt, FaBoxOpen, FaPlus, FaMinus,
  FaBuilding, FaFileInvoice
} from 'react-icons/fa';
import { useRouter } from 'next/router';

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
  leadTime?: number; // days
  avgDailySales?: number;
}

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

interface OrderItem {
  product: Product;
  quantity: number;
  rop: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ isOpen, onClose, products }) => {
  const router = useRouter();
  const { formatCurrency } = useTranslation();
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'low' | 'normal'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('30');
  const [notes, setNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Get unique suppliers from products
  const suppliers = Array.from(new Set(products.map(p => p.supplier)));

  if (!isOpen) return null;

  // Calculate ROP (Reorder Point) = (Average Daily Sales × Lead Time) + Safety Stock
  const calculateROP = (product: Product) => {
    const avgDailySales = product.avgDailySales || 5;
    const leadTime = product.leadTime || 7;
    const safetyStock = product.minStock;
    return Math.ceil((avgDailySales * leadTime) + safetyStock);
  };

  // Calculate EOQ (Economic Order Quantity) - simplified
  const calculateEOQ = (product: Product) => {
    const annualDemand = (product.avgDailySales || 5) * 365;
    const orderingCost = 50000; // IDR per order
    const holdingCost = product.cost * 0.2; // 20% of cost per year
    return Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / holdingCost));
  };

  // Determine urgency level
  const getUrgency = (product: Product): 'critical' | 'high' | 'medium' | 'low' => {
    const rop = calculateROP(product);
    if (product.stock === 0) return 'critical';
    if (product.stock <= product.minStock) return 'critical';
    if (product.stock <= rop) return 'high';
    if (product.stock <= rop * 1.5) return 'medium';
    return 'low';
  };

  // Filter products based on stock status
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

    // Sort by urgency
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


  const filteredProducts = getFilteredProducts();
  const criticalCount = products.filter(p => getUrgency(p) === 'critical').length;
  const lowStockCount = products.filter(p => getUrgency(p) === 'high').length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-3">
                <FaShoppingCart className="text-3xl" />
                <span>Purchase Order & Reorder Management</span>
              </h2>
              <p className="text-blue-100 mt-1">Sistem pemesanan otomatis dengan ROP & EOQ calculation</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
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

        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Product List */}
          <div className="flex-1 flex flex-col border-r border-gray-200">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
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
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Critical
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === 'low' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('low')}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700"
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
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
            </div>
          </div>

          {/* Right Panel - Order Summary */}
          <div className="w-96 flex flex-col bg-gray-50">
            <div className="p-4 border-b border-gray-200 bg-white">
              <h3 className="font-bold text-lg text-gray-900 mb-2">Order Summary</h3>
              <div className="space-y-2">
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
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FaBoxOpen className="text-5xl mx-auto mb-3 opacity-30" />
                  <p>Belum ada produk dipilih</p>
                  <p className="text-sm">Klik "Add" untuk menambah produk</p>
                </div>
              ) : (
                selectedItems.map((item) => (
                  <div key={item.product.id} className="bg-white border border-gray-200 rounded-lg p-3">
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

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-white space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Items:</span>
                  <span className="font-semibold">{selectedItems.reduce((sum, item) => sum + item.quantity, 0)} units</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Cost:</span>
                  <span className="text-blue-600">{formatCurrency(getTotalCost())}</span>
                </div>
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

              <Button
                onClick={() => setShowConfirmation(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 text-lg font-bold"
                disabled={selectedItems.length === 0 || !selectedSupplier}
              >
                <FaCheckCircle className="mr-2 text-xl" />
                Create Purchase Order
              </Button>
              <Button
                onClick={() => router.push('/inventory/purchase-orders')}
                variant="outline"
                className="w-full py-3"
              >
                <FaFileInvoice className="mr-2" />
                View All Orders
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-10 flex items-center justify-center p-4">
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
                onClick={() => {
                  // In real app, save to database and redirect
                  alert('Purchase Order created successfully!\nRedirecting to PO Management...');
                  router.push('/inventory/purchase-orders');
                  onClose();
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <FaCheckCircle className="mr-2" />
                Confirm & Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderModal;
