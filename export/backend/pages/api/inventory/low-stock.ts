import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler, success, error, ApiContext, parseQueryParams } from '@/utils/api-utils';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import logger from '@/lib/logger';
import productAdapter from '@/server/sequelize/adapters/inventory-product-adapter';
import cacheManager from '@/lib/cache-manager';

// Konstanta untuk optimasi
const LOW_STOCK_CACHE_KEY = '/api/inventory/low-stock';
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Mock data untuk fallback jika database gagal
const mockLowStockItems = [
  {
    id: '1',
    name: 'Paracetamol 500mg',
    sku: 'PAR500',
    category: {
      id: 'cat1',
      name: 'Analgesik',
      color: '#ef4444'
    },
    stock: 8,
    reorderPoint: 10,
    unit: 'Tablet',
    supplier: {
      id: 'sup1',
      name: 'PT Kimia Farma'
    },
    price: 1500,
    costPrice: 1200,
    stockStatus: 'low',
    percentStock: 80
  },
  {
    id: '2',
    name: 'Amoxicillin 500mg',
    sku: 'AMOX500',
    category: {
      id: 'cat2',
      name: 'Antibiotik',
      color: '#f97316'
    },
    stock: 5,
    reorderPoint: 15,
    unit: 'Tablet',
    supplier: {
      id: 'sup2',
      name: 'PT Phapros'
    },
    price: 2500,
    costPrice: 2000,
    stockStatus: 'low',
    percentStock: 33
  },
  {
    id: '3',
    name: 'Omeprazole 20mg',
    sku: 'OME20',
    category: {
      id: 'cat3',
      name: 'Antiulcer',
      color: '#eab308'
    },
    stock: 3,
    reorderPoint: 10,
    unit: 'Kapsul',
    supplier: {
      id: 'sup3',
      name: 'PT Dexa Medica'
    },
    price: 3000,
    costPrice: 2400,
    stockStatus: 'low',
    percentStock: 30
  }
];

// Define allowed query params and their types
const querySchema = {
  search: { type: "string" },
  page: { type: "number", default: 1 },
  limit: { type: "number", default: 20 },
  sortBy: { type: "string", default: "stock" },
  sortOrder: { type: "string", default: "asc" },
};

/**
 * Handler untuk API endpoint low stock inventory
 * Mengembalikan daftar produk dengan stok di bawah reorder point
 */
async function handler(req: NextApiRequest, res: NextApiResponse, context: ApiContext) {
  // Hanya izinkan metode GET
  if (req.method !== 'GET') {
    logger.warn('Method not allowed', { method: req.method, endpoint: '/api/inventory/low-stock' });
    return error(res, 'Method Not Allowed', 405);
  }

  try {
    // Verifikasi autentikasi
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      logger.warn('Unauthorized access attempt', { endpoint: '/api/inventory/low-stock' });
      return error(res, 'Unauthorized Access', 401);
    }

    // Parse query parameters
    const filters = parseQueryParams(req.query, querySchema) as Record<string, any>;
    
    // Sanitasi parameter pagination untuk mencegah overload
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit || DEFAULT_PAGE_SIZE));
    const search = filters.search || '';
    const sortBy = filters.sortBy || 'stock';
    const sortOrder = filters.sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // Get tenant ID from session for multi-tenant support
    const tenantId = context.tenant?.id || session?.user?.tenantId;
    if (!tenantId) {
      logger.warn('Missing tenant ID', { endpoint: '/api/inventory/low-stock' });
      return error(res, 'Tenant ID not found', 400);
    }

    // Create cache key based on all parameters
    const cacheKey = `${LOW_STOCK_CACHE_KEY}:${tenantId}:${page}:${limit}:${search}:${sortBy}:${sortOrder}`;
    
    // Check cache first for optimized performance
    const cachedData = await cacheManager.getCachedData(LOW_STOCK_CACHE_KEY, {
      cacheKey
    }, async () => null);
    
    if (cachedData && cachedData.data) {
      logger.info('Returning cached low stock products', {
        endpoint: '/api/inventory/low-stock',
      });
      return success(res, {
        message: 'Cached low stock products retrieved successfully',
        data: cachedData.data.data,
        meta: cachedData.data.meta
      });
    }

    // Setup timeout protection
    const TIMEOUT_MS = 5000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );
    
    try {
      // Use adapter with built-in fallback to mock data and race with timeout
      const lowStockPromise = productAdapter.getLowStockProducts({
        search,
        page,
        limit,
        sortBy,
        sortOrder,
        tenantId
      });
      
      const result = await Promise.race([lowStockPromise, timeoutPromise]) as any;
      const { products, total, totalPages, isMock } = result;
      
      // Prepare response data
      const responseData = {
        data: products,
        meta: {
          total,
          page,
          limit,
          totalPages,
          isMock: isMock || false
        }
      };
      
      // Store in cache for future requests
      await cacheManager.getCachedData(LOW_STOCK_CACHE_KEY, {
        cacheKey
      }, async () => responseData);
      
      logger.info('Retrieved low stock products', { 
        endpoint: '/api/inventory/low-stock',
        count: products.length,
        isMock: isMock || false
      });
      
      return success(res, {
        message: isMock 
          ? 'Mock low stock products retrieved successfully (fallback mode)' 
          : 'Low stock products retrieved successfully',
        data: products,
        meta: {
          total,
          page,
          limit,
          totalPages,
          isMock: isMock || false
        }
      });
    } catch (dbErr) {
      logger.error('Error fetching low stock products:', { 
        endpoint: '/api/inventory/low-stock',
        error: String(dbErr) 
      });
      
      // Fallback to mock data if database query fails
      logger.info('Using mock data for low stock items', {
        endpoint: '/api/inventory/low-stock'
      });
      
      return success(res, {
        message: 'Mock low stock products retrieved successfully (fallback mode)',
        data: mockLowStockItems,
        meta: {
          total: mockLowStockItems.length,
          page: 1,
          limit: mockLowStockItems.length,
          totalPages: 1,
          isMock: true
        }
      });
    }
  } catch (err: any) {
    logger.error('Error handling low stock request:', { 
      endpoint: '/api/inventory/low-stock',
      error: String(err) 
    });
    return error(res, err.message || 'Internal Server Error', 500);
  }
}

export default withApiHandler(handler);
