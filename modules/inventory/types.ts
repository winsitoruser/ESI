export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  categoryId?: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock?: number;
  unit: string;
  supplier?: string;
  supplierId?: string;
  description?: string;
  barcode?: string;
  image?: string;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Stock {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  lastUpdated?: Date;
}

export interface StockMovement {
  id: string;
  productId: string;
  warehouseId: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  reference?: string;
  notes?: string;
  userId?: string;
  createdAt: Date;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  warehouseId: string;
  quantityBefore: number;
  quantityAfter: number;
  difference: number;
  reason: string;
  notes?: string;
  userId: string;
  createdAt: Date;
}

// Mock Data
export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Kopi Arabica Premium 250g',
    sku: 'KOP-001',
    category: 'Minuman',
    categoryId: 'cat-1',
    price: 45000,
    cost: 30000,
    stock: 50,
    minStock: 10,
    maxStock: 100,
    unit: 'pcs',
    supplier: 'PT Kopi Nusantara',
    supplierId: 'sup-1',
    status: 'active',
    barcode: '8991234567890'
  },
  {
    id: '2',
    name: 'Teh Hijau Organik',
    sku: 'TEH-001',
    category: 'Minuman',
    categoryId: 'cat-1',
    price: 35000,
    cost: 22000,
    stock: 8,
    minStock: 10,
    maxStock: 80,
    unit: 'pcs',
    supplier: 'CV Teh Sehat',
    supplierId: 'sup-2',
    status: 'active',
    barcode: '8991234567891'
  },
  {
    id: '3',
    name: 'Gula Pasir 1kg',
    sku: 'GUL-001',
    category: 'Bahan Pokok',
    categoryId: 'cat-2',
    price: 15000,
    cost: 12000,
    stock: 100,
    minStock: 20,
    maxStock: 200,
    unit: 'kg',
    supplier: 'PT Gula Manis',
    supplierId: 'sup-3',
    status: 'active',
    barcode: '8991234567892'
  },
  {
    id: '4',
    name: 'Minyak Goreng 2L',
    sku: 'MIN-001',
    category: 'Bahan Pokok',
    categoryId: 'cat-2',
    price: 32000,
    cost: 28000,
    stock: 2,
    minStock: 15,
    maxStock: 100,
    unit: 'liter',
    supplier: 'PT Minyak Sejahtera',
    supplierId: 'sup-4',
    status: 'active',
    barcode: '8991234567893'
  },
  {
    id: '5',
    name: 'Beras Premium 5kg',
    sku: 'BER-001',
    category: 'Bahan Pokok',
    categoryId: 'cat-2',
    price: 85000,
    cost: 70000,
    stock: 40,
    minStock: 10,
    maxStock: 80,
    unit: 'kg',
    supplier: 'CV Beras Padi',
    supplierId: 'sup-5',
    status: 'active',
    barcode: '8991234567894'
  },
  {
    id: '6',
    name: 'Susu UHT 1L',
    sku: 'SUS-001',
    category: 'Minuman',
    categoryId: 'cat-1',
    price: 18000,
    cost: 15000,
    stock: 60,
    minStock: 20,
    maxStock: 120,
    unit: 'liter',
    supplier: 'PT Susu Segar',
    supplierId: 'sup-6',
    status: 'active',
    barcode: '8991234567895'
  },
  {
    id: '7',
    name: 'Telur Ayam 1kg',
    sku: 'TEL-001',
    category: 'Protein',
    categoryId: 'cat-3',
    price: 28000,
    cost: 24000,
    stock: 45,
    minStock: 15,
    maxStock: 100,
    unit: 'kg',
    supplier: 'CV Peternakan Jaya',
    supplierId: 'sup-7',
    status: 'active',
    barcode: '8991234567896'
  },
  {
    id: '8',
    name: 'Daging Ayam 1kg',
    sku: 'DAG-001',
    category: 'Protein',
    categoryId: 'cat-3',
    price: 42000,
    cost: 38000,
    stock: 25,
    minStock: 10,
    maxStock: 60,
    unit: 'kg',
    supplier: 'CV Peternakan Jaya',
    supplierId: 'sup-7',
    status: 'active',
    barcode: '8991234567897'
  }
];

export const mockStocks: Stock[] = mockProducts.map(product => ({
  id: `stock-${product.id}`,
  productId: product.id,
  warehouseId: 'warehouse-1',
  quantity: product.stock,
  reservedQuantity: 0,
  availableQuantity: product.stock,
  lastUpdated: new Date()
}));

export const mockCategories = [
  { id: 'cat-1', name: 'Minuman', productCount: 3 },
  { id: 'cat-2', name: 'Bahan Pokok', productCount: 3 },
  { id: 'cat-3', name: 'Protein', productCount: 2 }
];

export const mockSuppliers = [
  { id: 'sup-1', name: 'PT Kopi Nusantara', phone: '021-1234567', email: 'info@kopinusantara.com' },
  { id: 'sup-2', name: 'CV Teh Sehat', phone: '021-1234568', email: 'info@tehsehat.com' },
  { id: 'sup-3', name: 'PT Gula Manis', phone: '021-1234569', email: 'info@gulamanis.com' },
  { id: 'sup-4', name: 'PT Minyak Sejahtera', phone: '021-1234570', email: 'info@minyaksejahtera.com' },
  { id: 'sup-5', name: 'CV Beras Padi', phone: '021-1234571', email: 'info@beraspadi.com' },
  { id: 'sup-6', name: 'PT Susu Segar', phone: '021-1234572', email: 'info@sususegar.com' },
  { id: 'sup-7', name: 'CV Peternakan Jaya', phone: '021-1234573', email: 'info@peternakanjaya.com' }
];
