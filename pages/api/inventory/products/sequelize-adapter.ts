/**
 * Sequelize adapter untuk produk inventaris
 * Mengikuti pola "Data Mock First" dengan fallback ke data mock jika operasi database gagal
 * Konsisten dengan skema warna merah-oranye yang digunakan di seluruh aplikasi
 */

import { Op, Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/lib/logger';

// Import database dari models
const db = require('../../../../models');

// Type definitions untuk data produk
export interface ProductData {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  category: string;
  categoryColor?: string;
  price: number;
  stock: number;
  unit?: string;
  location?: string;
  expiry?: string;
  supplier?: string;
  reorderPoint?: number;
  image?: string;
  isToling?: boolean;
  composition?: string;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  [key: string]: any;
}

// Type untuk filter pencarian
export interface ProductFilters {
  search?: string;
  category?: string;
  supplierId?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isToling?: boolean;
}

// Type untuk hasil pencarian
export interface ProductSearchResult {
  products: ProductData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isFromMock: boolean;
}

/**
 * Mengambil produk dari database dengan pagination dan filter
 */
export async function getProductsFromDatabase(
  tenantId: string | undefined,
  filters: ProductFilters
): Promise<ProductSearchResult | null> {
  try {
    logger.info('Fetching products with filters', { filters });
    
    // Default nilai pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    // Default nilai pengurutan
    const sortBy = filters.sortBy || 'updatedAt';
    const sortOrder = filters.sortOrder || 'desc';
    
    // Build opsi query
    const queryOptions: any = {
      where: {
        deletedAt: null
      },
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit,
      offset
    };
    
    // Tambahkan filter tenant jika ditentukan
    if (tenantId) {
      queryOptions.where.tenantId = tenantId;
    }
    
    // Tambahkan filter isToling jika ditentukan
    if (filters.isToling !== undefined) {
      queryOptions.where.isToling = filters.isToling;
    }
    
    // Tambahkan filter pencarian
    if (filters.search) {
      queryOptions.where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { sku: { [Op.iLike]: `%${filters.search}%` } },
        { description: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }
    
    // Tambahkan filter kategori
    if (filters.category) {
      queryOptions.where.category = { [Op.iLike]: `%${filters.category}%` };
    }
    
    // Tambahkan filter supplier
    if (filters.supplierId) {
      queryOptions.where.supplierId = filters.supplierId;
    }
    
    // Tambahkan filter stok rendah
    if (filters.lowStock) {
      queryOptions.where[Op.and] = [
        { stock: { [Op.not]: null } },
        { reorderPoint: { [Op.not]: null } },
        Sequelize.literal('stock <= "reorderPoint"')
      ];
    }

    // Hitung total produk yang cocok dengan kriteria
    const { count, rows } = await db.Product.findAndCountAll(queryOptions);
    
    // Hitung total halaman
    const totalPages = Math.ceil(count / limit);
    
    // Map produk ke format yang diharapkan
    const products = rows.map((product: any) => {
      const plainProduct = product.get ? product.get({ plain: true }) : product;
      return {
        ...plainProduct,
        createdAt: plainProduct.createdAt?.toISOString(),
        updatedAt: plainProduct.updatedAt?.toISOString(),
        deletedAt: plainProduct.deletedAt?.toISOString()
      };
    });
    
    return {
      products,
      total: count,
      page,
      limit,
      totalPages,
      isFromMock: false
    };
  } catch (err) {
    logger.error('Error fetching products from database', { error: err });
    return null;
  }
}

/**
 * Mendapatkan produk mock dengan filter yang diterapkan
 */
export function getMockProducts(
  tenantId: string = 'default-tenant',
  filters: ProductFilters = {}
): ProductSearchResult {
  logger.info('Getting mock products with filters', { filters });
  
  // Data produk contoh dengan indikator kategori merah-oranye
  const staticMockProducts: ProductData[] = [
    {
      id: 'P001',
      name: 'Paracetamol 500mg',
      description: 'Obat pereda nyeri dan penurun demam',
      sku: 'PAR500MG',
      category: 'Obat Bebas',
      categoryColor: '#ef4444', // Red color for this category
      price: 5000,
      stock: 145,
      unit: 'Strip',
      location: 'Rak A-01',
      expiry: '2026-06-30',
      supplier: 'PT Kimia Farma',
      tenantId: tenantId || 'default-tenant',
      reorderPoint: 20,
      isToling: false
    },
    {
      id: 'P002',
      name: 'Amoxicillin 500mg',
      description: 'Antibiotik untuk infeksi bakteri',
      sku: 'AMX500MG',
      category: 'Obat Keras',
      categoryColor: '#f97316', // Orange color for this category
      price: 15000,
      stock: 78,
      unit: 'Strip',
      location: 'Rak B-03',
      expiry: '2025-12-31',
      supplier: 'PT Indofarma',
      tenantId: tenantId || 'default-tenant',
      reorderPoint: 25,
      isToling: false
    },
    {
      id: 'P003',
      name: 'Vitamin C 1000mg',
      description: 'Suplemen daya tahan tubuh',
      sku: 'VITC1000',
      category: 'Vitamin',
      categoryColor: '#ef4444', // Red color for this category
      price: 25000,
      stock: 120,
      unit: 'Botol',
      location: 'Rak C-02',
      expiry: '2027-01-15',
      supplier: 'PT Kalbe Farma',
      tenantId: tenantId || 'default-tenant',
      reorderPoint: 30,
      isToling: false
    },
    {
      id: 'P004',
      name: 'Toling - Bahan Paracetamol',
      description: 'Bahan baku untuk pembuatan paracetamol',
      sku: 'TPAR001',
      category: 'Bahan Baku',
      categoryColor: '#f97316', // Orange color for this category
      price: 800000,
      stock: 5,
      unit: 'Kg',
      location: 'Gudang B-01',
      expiry: '2028-05-20',
      supplier: 'PT Kimia Farma',
      tenantId: tenantId || 'default-tenant',
      reorderPoint: 2,
      isToling: true
    }
  ];
  
  // Terapkan filter pada data mock
  let filteredProducts = [...staticMockProducts];
  
  // Filter by isToling
  if (filters.isToling !== undefined) {
    filteredProducts = filteredProducts.filter(p => p.isToling === filters.isToling);
  }
  
  // Filter by search
  if (filters.search) {
    const search = filters.search.toLowerCase();
    filteredProducts = filteredProducts.filter(p => 
      p.name.toLowerCase().includes(search) || 
      p.sku?.toLowerCase().includes(search) || 
      p.description?.toLowerCase().includes(search)
    );
  }
  
  // Filter by category
  if (filters.category) {
    filteredProducts = filteredProducts.filter(p => 
      p.category.toLowerCase().includes(filters.category!.toLowerCase())
    );
  }
  
  // Filter by supplier
  if (filters.supplierId) {
    filteredProducts = filteredProducts.filter(p => p.supplierId === filters.supplierId);
  }
  
  // Filter by low stock
  if (filters.lowStock) {
    filteredProducts = filteredProducts.filter(p => 
      p.reorderPoint !== undefined && p.stock <= p.reorderPoint
    );
  }
  
  // Apply sorting
  const sortBy = filters.sortBy || 'updatedAt';
  const sortOrder = filters.sortOrder || 'desc';
  
  filteredProducts.sort((a, b) => {
    const aValue = a[sortBy] || '';
    const bValue = b[sortBy] || '';
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }
    
    return sortOrder === 'asc' 
      ? (aValue as any) - (bValue as any) 
      : (bValue as any) - (aValue as any);
  });
  
  // Apply pagination
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;
  
  const pagedProducts = filteredProducts.slice(offset, offset + limit);
  
  return {
    products: pagedProducts,
    total: filteredProducts.length,
    page,
    limit,
    totalPages: Math.ceil(filteredProducts.length / limit),
    isFromMock: true
  };
}

/**
 * Membuat produk baru di database
 */
export async function createProductInDatabase(
  tenantId: string | undefined,
  productData: ProductData
): Promise<ProductData | null> {
  try {
    logger.info('Creating new product', { product: productData });
    
    // Generate UUID jika tidak disediakan
    if (!productData.id) {
      productData.id = uuidv4();
    }
    
    // Tambahkan tenantId jika ditentukan
    if (tenantId) {
      productData.tenantId = tenantId;
    }
    
    // Set timestamp default
    productData.createdAt = new Date();
    productData.updatedAt = new Date();
    productData.deletedAt = null;
    
    // Buat produk baru di database
    const newProduct = await db.Product.create(productData);
    
    // Dapatkan data produk yang simple
    const plainProduct = newProduct.get ? newProduct.get({ plain: true }) : newProduct;
    
    return plainProduct;
  } catch (err) {
    logger.error('Error creating product in database', { error: err });
    return null;
  }
}

/**
 * Memperbarui produk yang ada di database
 */
export async function updateProductInDatabase(
  id: string,
  productData: ProductData
): Promise<ProductData | null> {
  try {
    logger.info('Updating product', { id, product: productData });
    
    // Set waktu update
    productData.updatedAt = new Date();
    
    // Temukan produk
    const product = await db.Product.findOne({
      where: {
        id: id,
        deletedAt: null
      }
    });
    
    if (!product) {
      logger.warn('Product not found for update', { id });
      return null;
    }
    
    // Update field produk
    await product.update(productData);
    
    // Return produk yang diperbarui
    return product.get({ plain: true });
  } catch (err) {
    logger.error('Error updating product in database', { error: err });
    return null;
  }
}

/**
 * Menghapus (soft delete) produk dari database
 */
export async function deleteProductFromDatabase(id: string): Promise<boolean> {
  try {
    logger.info('Deleting product', { id });
    
    // Temukan produk
    const product = await db.Product.findOne({
      where: {
        id: id,
        deletedAt: null
      }
    });
    
    if (!product) {
      logger.warn('Product not found for deletion', { id });
      return false;
    }
    
    // Soft delete dengan mengatur deletedAt
    await product.update({
      deletedAt: new Date()
    });
    
    return true;
  } catch (err) {
    logger.error('Error deleting product from database', { error: err });
    return false;
  }
}
