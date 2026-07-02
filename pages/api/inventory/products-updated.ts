import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser, isAuthorized } from '@/lib/auth';
import { withApiHandler, success, error, parseQueryParams, ApiContext } from '@/utils/api-utils';
import { ApiError } from '@/middleware/error-handler';
import DummyDataGenerator from '@/utils/dummy-data-generator';

// Sample product data with red-orange category indicators (used for fallback when database is unavailable)
const staticMockProducts = [
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
    supplier: 'PT Pharma Indonesia',
    reorderPoint: 50,
    image: '/images/products/paracetamol.jpg'
  },
  {
    id: 'P002',
    name: 'Vitamin C 1000mg',
    description: 'Suplemen vitamin untuk meningkatkan daya tahan tubuh',
    sku: 'VITC1000',
    category: 'Suplemen',
    categoryColor: '#f97316', // Orange color for this category
    price: 25000,
    stock: 76,
    unit: 'Botol',
    location: 'Rak B-03',
    expiry: '2026-05-15',
    supplier: 'PT Nutri Health',
    reorderPoint: 30,
    image: '/images/products/vitamin-c.jpg'
  },
  {
    id: 'P003',
    name: 'Antibiotik Amoxicillin',
    description: 'Antibiotik untuk pengobatan infeksi bakteri',
    sku: 'AMOX500',
    category: 'Obat Keras',
    categoryColor: '#b91c1c', // Dark red color for this category
    price: 15000,
    stock: 50,
    unit: 'Strip',
    location: 'Rak C-02',
    expiry: '2025-12-20',
    supplier: 'PT Medika Farma',
    reorderPoint: 25,
    image: '/images/products/amoxicillin.jpg'
  }
];

// Menggunakan data generator untuk konsistensi dengan skema warna red-orange (#ef4444, #f97316)
const getMockProducts = (tenantId: string = 'default-tenant') => {
  try {
    const generator = new DummyDataGenerator(tenantId);
    return generator.generateProducts(20);
  } catch (err) {
    console.error('Error generating mock products:', err);
    return staticMockProducts;
  }
};

// Define allowed query params and their types
const querySchema = {
  search: 'string',
  category: 'string',
  lowStock: 'boolean',
  page: 'number',
  limit: 'number',
  sortBy: 'string',
  sortOrder: 'string'
};

/**
 * Handle inventory products requests
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  context: ApiContext
) {
  // Authenticate user for all requests
  const user = await authenticateUser(req);
  
  // Ensure user is authorized (ADMIN, MANAGER, PHARMACIST have full access)
  // CASHIER has read-only access
  const isReadOnlyUser = user.role === 'CASHIER' || user.role === 'STAFF';
  
  if (!isAuthorized(user, ['ADMIN', 'MANAGER', 'PHARMACIST', 'CASHIER', 'STAFF'])) {
    throw new ApiError(403, 'Anda tidak memiliki akses ke modul inventory', 'FORBIDDEN');
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return await getProducts(req, res, context, user);
    case 'POST':
      if (isReadOnlyUser) {
        throw new ApiError(403, 'Anda hanya memiliki akses baca', 'FORBIDDEN');
      }
      return await createProduct(req, res, context, user);
    case 'PUT':
      if (isReadOnlyUser) {
        throw new ApiError(403, 'Anda hanya memiliki akses baca', 'FORBIDDEN');
      }
      return await updateProduct(req, res, context, user);
    case 'DELETE':
      if (isReadOnlyUser) {
        throw new ApiError(403, 'Anda hanya memiliki akses baca', 'FORBIDDEN');
      }
      return await deleteProduct(req, res, context, user);
    default:
      throw new ApiError(405, 'Metode tidak diizinkan', 'METHOD_NOT_ALLOWED');
  }
}

/**
 * GET - get all products with filtering and pagination
 */
async function getProducts(req: NextApiRequest, res: NextApiResponse, context: ApiContext, user: any) {
  try {
    // Parse query parameters from request
    const params = parseQueryParams(req, querySchema);
    const { search, category, lowStock, page = 1, limit = 20 } = params;
    
    console.log('Getting products with params:', params);
    
    // Try to fetch from database first
    let products = await fetchProductsFromDatabase(context, params);
    
    // Use mock data for development/testing or as fallback
    if (!products || products.length === 0) {
      products = getMockProducts(user?.tenantId);
    }
    
    // Apply filters if database query didn't already do so
    if (search && products === getMockProducts(user?.tenantId)) {
      const searchLower = search.toLowerCase();
      products = products.filter((p: any) => 
        p.name.toLowerCase().includes(searchLower) || 
        p.category.toLowerCase().includes(searchLower) || 
        p.sku.toLowerCase().includes(searchLower)
      );
    }
    
    if (category && products === getMockProducts(user?.tenantId)) {
      products = products.filter((p: any) => p.category === category);
    }
    
    if (lowStock && products === getMockProducts(user?.tenantId)) {
      products = products.filter((p: any) => p.stock < p.reorderPoint);
    }
    
    // Count total products before pagination
    const totalCount = products.length;
    
    // Apply pagination if needed
    if (page && limit && products.length > limit) {
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      products = products.slice(startIndex, endIndex);
    }
    
    // Return products
    return success(res, {
      data: products,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error getting products:', error);
    return error(res, 'Terjadi kesalahan saat mengambil data produk', 500);
  }
}

/**
 * POST - create a new product
 */
async function createProduct(req: NextApiRequest, res: NextApiResponse, context: ApiContext, user: any) {
  try {
    // Get product data from request body
    const productData = req.body;
    
    // Ensure required fields are present
    const requiredFields = ['name', 'category', 'price', 'stock', 'unit'];
    for (const field of requiredFields) {
      if (!productData[field]) {
        throw new ApiError(400, `Field ${field} tidak boleh kosong`, 'VALIDATION_ERROR');
      }
    }
    
    // Add tenant ID to product data (for multi-tenant systems)
    productData.tenantId = user.tenantId;
    
    // Add color for category
    const categoryColors = {
      'Obat Bebas': '#ef4444',      // Red
      'Obat Bebas Terbatas': '#f97316', // Orange
      'Obat Keras': '#b91c1c',      // Dark red
      'Suplemen': '#fb923c',        // Light orange
      'Alat Kesehatan': '#a86f3e'   // Brown orange
    };
    
    productData.categoryColor = categoryColors[productData.category] || '#ef4444';
    
    // Create the product in the database
    const newProduct = await createProductInDatabase(context, productData);
    
    return success(res, {
      message: 'Produk berhasil dibuat',
      data: newProduct || productData
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return error(res, 'Terjadi kesalahan saat membuat produk', 500);
  }
}

/**
 * PUT - update an existing product
 */
async function updateProduct(req: NextApiRequest, res: NextApiResponse, context: ApiContext, user: any) {
  try {
    // Get product ID and data from request
    const { id } = req.query;
    const productData = req.body;
    
    if (!id) {
      throw new ApiError(400, 'ID produk diperlukan', 'VALIDATION_ERROR');
    }
    
    // Update the product in the database
    // In a real implementation, you would update the product in your database
    
    return success(res, {
      message: 'Produk berhasil diperbarui',
      data: {
        id,
        ...productData
      }
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return error(res, 'Terjadi kesalahan saat memperbarui produk', 500);
  }
}

/**
 * DELETE - delete a product
 */
async function deleteProduct(req: NextApiRequest, res: NextApiResponse, context: ApiContext, user: any) {
  try {
    // Get product ID from request
    const { id } = req.query;
    
    if (!id) {
      throw new ApiError(400, 'ID produk diperlukan', 'VALIDATION_ERROR');
    }
    
    // Delete the product from the database
    // In a real implementation, you would delete the product from your database
    
    return success(res, {
      message: 'Produk berhasil dihapus',
      data: { id }
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return error(res, 'Terjadi kesalahan saat menghapus produk', 500);
  }
}

// Fetch products from database with filtering and pagination
async function fetchProductsFromDatabase(context: ApiContext, params: any) {
  try {
    // In a real implementation, you would fetch products from your database
    // with the provided filters and pagination parameters
    
    // For development/testing, we'll just return an empty array to fall back to mock data
    console.warn('Falling back to mock product data');
    
    // Filter products based on search and category
    let filteredProducts = [...getMockProducts(context.user?.tenantId)];
    
    if (params.search) {
      filteredProducts = filteredProducts.filter(product => 
        product.name.toLowerCase().includes(params.search.toLowerCase()) ||
        product.category.toLowerCase().includes(params.search.toLowerCase())
      );
    }
    
    if (params.category) {
      filteredProducts = filteredProducts.filter(product => 
        product.category === params.category
      );
    }
    
    if (params.lowStock) {
      filteredProducts = filteredProducts.filter(product => 
        product.stock < product.reorderPoint
      );
    }
    
    return filteredProducts;
  } catch (error) {
    console.error('Error fetching products from database:', error);
    return [];
  }
}

// Create a new product in the database
async function createProductInDatabase(context: ApiContext, productData: any) {
  // In a real implementation, you would add the product to your database
  // For development/testing, just return the product data with an ID
  return {
    id: `P${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    ...productData,
    createdAt: new Date().toISOString()
  };
}

// Export the handler with API utilities
export default withApiHandler(handler);
