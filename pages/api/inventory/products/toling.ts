import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { withApiHandler, success, error, parseQueryParams, ApiContext } from '@/utils/api-utils';
import { ApiError } from '@/middleware/error-handler';
import sequelize from '@/lib/db';
import logger from '@/lib/logger';
import productAdapter from '@/server/sequelize/adapters/inventory-product-adapter';
import cacheManager from '@/lib/cache-manager';

// Using Sequelize product adapter for consistent backend-frontend integration

// Konstanta untuk optimasi
const TOLING_PRODUCTS_CACHE_KEY = '/api/inventory/products/toling';
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100; // Batasi ukuran halaman untuk mencegah overload

// Interface untuk parameter query
interface TolingProductQueryParams {
  search?: string;
  category?: string;
  lowStock?: string | boolean;
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: string;
}

// Interface untuk query parameters dari request
interface ParsedQueryParams {
  search?: string;
  category?: string;
  lowStock?: string | boolean;
  page: string;
  limit: string;
  sortBy?: string;
  sortOrder?: string;
  [key: string]: any;
}

// Import Sequelize operators
let Sequelize: any;
let Op: any;
try {
  const sequelizeImport = require('sequelize');
  Sequelize = sequelizeImport.Sequelize;
  Op = sequelizeImport.Op;
} catch (err) {
  logger.warn('Failed to import Sequelize library:', { error: String(err) });
  Op = {
    or: 'or',
    iLike: 'iLike',
    lte: 'lte',
    gt: 'gt'
  };
}

// Sample mock data for fallback
const staticMockTolingProducts = [
  {
    id: 'TL001',
    name: 'Toling Paracetamol Bubuk',
    sku: 'TL-PAR-BUK',
    category: 'Bahan Baku',
    categoryColor: '#ef4444',
    price: 150000,
    stock: 3500,
    unit: 'Gram',
    reorderPoint: 1000,
    isToling: true,
    composition: '100% Paracetamol',
    purity: '99.5%',
    updatedAt: new Date(),
    createdAt: new Date()
  },
  {
    id: 'TL002',
    name: 'Toling Salbutamol',
    sku: 'TL-SLB-BUK',
    category: 'Bahan Baku',
    categoryColor: '#f97316',
    price: 275000,
    stock: 1200,
    unit: 'Gram',
    reorderPoint: 500,
    isToling: true,
    composition: '100% Salbutamol',
    purity: '98.7%',
    updatedAt: new Date(),
    createdAt: new Date()
  },
  {
    id: 'TL003',
    name: 'Toling Amoksisilin',
    sku: 'TL-AMX-BUK',
    category: 'Bahan Baku',
    categoryColor: '#ef4444',
    price: 320000,
    stock: 2000,
    unit: 'Gram',
    reorderPoint: 750,
    isToling: true,
    composition: '100% Amoksisilin',
    purity: '99.2%',
    updatedAt: new Date(),
    createdAt: new Date()
  }
];

// Helper function to enhance mock data
function enhanceStaticMockData(data: any[]) {
  return data.map(item => ({
    ...item,
    id: item.id || `TL${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    categoryColor: item.categoryColor || '#ef4444',
    updatedAt: item.updatedAt || new Date(),
    createdAt: item.createdAt || new Date(),
    isToling: true
  }));
}

// Define query parameters schema
const querySchema = {
  search: { type: 'string' as const },
  category: { type: 'string' as const },
  lowStock: { type: 'boolean' as const },
  page: { type: 'number' as const },
  limit: { type: 'number' as const },
  sortBy: { type: 'string' as const },
  sortOrder: { type: 'string' as const }
};

/**
 * Main API handler for toling products
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  context: ApiContext
) {
  // Create child logger for this endpoint
  const childLogger = logger.child({
    endpoint: '/api/inventory/products/toling',
    method: req.method,
    requestId: context.requestId
  });

  try {
    // Get authenticated session with improved security
    const session = await getServerSession(req, res, authOptions);
    
    // Allow anonymous access in development
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!session?.user && isProduction && req.method !== 'GET') {
      childLogger.warn('Unauthorized access attempt');
      return error(res, 'Unauthorized access to toling products', 401);
    }
    
    // Extract user from session
    const user = session?.user;
    
    // Extract product ID from query if present
    const id = req.query.id as string;
    const tenantId = session?.user?.tenantId;
    
    // Setup timeout promise to prevent blocking operations (10 seconds)
    const TIMEOUT_MS = 10000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );
    
    try {
      // Handle different HTTP methods
      let methodPromise: Promise<any>;
      switch (req.method) {
        case 'GET':
          methodPromise = getTolingProducts(req, res, context, user);
          break;
        case 'POST':
          methodPromise = createTolingProduct(req, res, context, user);
          break;
        case 'PUT':
          methodPromise = updateTolingProduct(req, res, context, user);
          break;
        case 'DELETE':
          methodPromise = deleteTolingProduct(req, res, context, user);
          break;
        default:
          return error(res, 'Method not allowed for toling products', 405);
      }
      
      // Race between method handler and timeout
      const result = await Promise.race([methodPromise, timeoutPromise]);
      
      // Invalidate cache on successful mutations
      if (req.method !== 'GET' && result && result.statusCode === 200) {
        await cacheManager.invalidateEndpointCache(TOLING_PRODUCTS_CACHE_KEY);
      }
      
      return result;
    } catch (methodError) {
      // Log operation-specific error but continue to default error handler
      logger.error('Error executing toling products operation:', { 
        error: methodError instanceof Error ? methodError.message : String(methodError),
        method: req.method,
        path: req.url
      });
      throw methodError; // Let the outer catch handle the response
    }
  } catch (err: any) {
    logger.error('Error in toling products handler:', { 
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
    return error(res, 'Internal server error processing toling products request', 500);
  }
}

/**
 * GET - Retrieves toling products with optimization, caching and pagination
 * Using Sequelize product adapter for consistency and fallback to mock data
 */
async function getTolingProducts(req: NextApiRequest, res: NextApiResponse, context: ApiContext, user: any) {
  // Create child logger for this specific operation
  const childLogger = logger.child({
    endpoint: '/api/inventory/products/toling',
    method: 'GET',
    requestId: context.requestId
  });
  try {
    logger.info('Getting toling products with query parameters');
    
    // Parse and sanitize query parameters
    const parsedQuery = parseQueryParams(req.query, querySchema) as ParsedQueryParams;
    
    // Setup pagination defaults
    const page = parseInt(parsedQuery.page || '1');
    const limit = Math.min(
      parseInt(parsedQuery.limit || DEFAULT_PAGE_SIZE.toString()),
      MAX_PAGE_SIZE
    );
    
    // Extract search terms
    const search = parsedQuery.search;
    const category = parsedQuery.category;
    const lowStock = parsedQuery.lowStock === 'true' || parsedQuery.lowStock === true;
    
    // Extract sorting options
    const sortBy = parsedQuery.sortBy || 'createdAt';
    const sortOrder = parsedQuery.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC' as 'ASC' | 'DESC';
    
    // Extract tenant ID from session for multi-tenant support
    const tenantId = user?.tenantId;
    
    // Cache key based on query parameters
    const cacheKey = `${TOLING_PRODUCTS_CACHE_KEY}:${tenantId || 'global'}:${page}:${limit}:${search || ''}:${category || ''}:${lowStock}:${sortBy}:${sortOrder}`;
    
    // Check cache first for optimized performance
    const cachedData = await cacheManager.get(cacheKey);
    if (cachedData) {
      childLogger.info('Returning cached toling products');
      return success(res, {
        message: 'Cached toling products retrieved successfully',
        data: cachedData.data,
        meta: cachedData.meta
      });
    }
    
    // Setup timeout race to prevent blocking operations
    const TIMEOUT_MS = 5000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );

    // Use adapter with built-in fallback to mock data and race with timeout
    const productPromise = productAdapter.getTolingProducts({
      search,
      category,
      lowStock,
      page,
      limit,
      sortBy,
      sortOrder,
      tenantId
    });

    const result = await Promise.race([productPromise, timeoutPromise]);
    
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
    
    childLogger.info('Retrieved toling products', { 
      count: products.length,
      isMock: isMock || false,
      page,
      limit
    });
    
    // Cache result for future requests
    await cacheManager.set(cacheKey, responseData);
    
    return success(res, {
      message: isMock 
        ? 'Mock toling products retrieved successfully (fallback mode)' 
        : 'Toling products retrieved successfully',
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages,
        isMock: isMock || false
      }
    });
  } catch (err: any) {
    // Enhanced error logging
    const errorDetails = {
      error: String(err),
      stack: err.stack,
      message: err.message,
      name: err.name,
      status: err.status,
      code: err.code,
      sql: err.sql,
      original: err.original,
      fields: err.fields,
      parent: err.parent ? {
        code: err.parent.code,
        errno: err.parent.errno,
        sqlState: err.parent.sqlState,
        sqlMessage: err.parent.sqlMessage
      } : undefined
    };
    
    logger.error('Error retrieving toling products:', { 
      error: errorDetails,
      context: {
        query: req.query,
        user: user ? { id: user.id, tenantId: user.tenantId } : 'no user session'
      }
    });
    
    // Return more detailed error information in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    return error(res, 
      isDevelopment 
        ? `Error retrieving toling products: ${err.message}` 
        : 'Internal server error retrieving toling products', 
      500,
      isDevelopment ? errorDetails : undefined
    );
  }
}

/**
 * POST - Create a new toling product
 */
async function createTolingProduct(req: NextApiRequest, res: NextApiResponse, context: ApiContext, user: any) {
  // Create child logger for this specific operation
  const childLogger = logger.child({
    endpoint: '/api/inventory/products/toling',
    method: 'POST',
    requestId: context.requestId
  });
  try {
    // Get product data from request body
    const productData = req.body;
    
    // Set isToling flag
    productData.isToling = true;
    
    // Set categoryColor based on product category with red-orange theme
    const categoryColors: Record<string, string> = {
      'Bahan Baku': '#ef4444',
      'Bahan Aktif': '#f97316',
      'Bahan Tambahan': '#f59e0b'
    };
    
    // Default to red if category doesn't match
    productData.categoryColor = productData.category && categoryColors[productData.category]
      ? categoryColors[productData.category]
      : '#ef4444';
    
    // Setup timeout race to prevent blocking operations
    const TIMEOUT_MS = 5000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );

    // Create in database using adapter
    try {
      // Create product with timeout protection
      const createPromise = productAdapter.createProduct(productData, user?.tenantId);
      const result = await Promise.race([createPromise, timeoutPromise]);
      
      childLogger.info('Created new toling product', { id: result.product.id });
      
      return success(res, {
        message: 'Toling product created successfully',
        data: result.product
      });
    } catch (dbError) {
      childLogger.error('Error creating toling product in database:', { error: String(dbError) });
      throw new ApiError(500, 'Failed to create toling product', 'DATABASE_ERROR');
    }
  } catch (err: any) {
    logger.error('Error in createTolingProduct:', { error: String(err) });
    return error(res, err.message || 'Error creating toling product', err.statusCode || 500);
  }
}

/**
 * PUT - Update an existing toling product
 */
async function updateTolingProduct(req: NextApiRequest, res: NextApiResponse, context: ApiContext, user: any) {
  // Create child logger for this specific operation
  const childLogger = logger.child({
    endpoint: '/api/inventory/products/toling',
    method: 'PUT',
    requestId: context.requestId
  });
  try {
    // Get ID from query parameters
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return error(res, 'Product ID is required', 400);
    }
    
    // Get product data from request body
    const productData = req.body;
    
    // Ensure ID matches
    if (productData.id !== id) {
      return error(res, 'Product ID in body does not match query parameter', 400);
    }
    
    // Ensure this is a toling product
    productData.isToling = true;
    
    // Setup timeout race to prevent blocking operations
    const TIMEOUT_MS = 5000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );

    // Update in database using adapter
    try {
      // Check if product exists first
      const getProductPromise = productAdapter.getProductById(id, user?.tenantId);
      const existingResult = await Promise.race([getProductPromise, timeoutPromise]);
      
      if (!existingResult.product) {
        childLogger.warn('Attempted to update non-existent toling product', { id });
        return error(res, 'Toling product not found', 404);
      }
      
      // Ensure this is a toling product
      productData.isToling = true;
      
      // Update product with timeout protection
      const updatePromise = productAdapter.updateProduct(id, productData, user?.tenantId);
      const result = await Promise.race([updatePromise, timeoutPromise]);
      
      if (!result.success) {
        return error(res, 'Failed to update toling product', 500);
      }
      
      childLogger.info('Updated toling product', { id });
      
      return success(res, {
        message: 'Toling product updated successfully',
        data: result.product
      });
    } catch (dbError) {
      childLogger.error('Error updating toling product in database:', { error: String(dbError) });
      throw new ApiError(500, 'Failed to update toling product', 'DATABASE_ERROR');
    }
  } catch (err: any) {
    childLogger.error('Error in updateTolingProduct handler:', { error: String(err) });
    return error(res, err.message || 'Error updating toling product', err.statusCode || 500);
  }
}

/**
 * DELETE - Delete a toling product (soft delete)
 */
async function deleteTolingProduct(req: NextApiRequest, res: NextApiResponse, context: ApiContext, user: any) {
  // Create child logger for this specific operation
  const childLogger = logger.child({
    endpoint: '/api/inventory/products/toling',
    method: 'DELETE',
    requestId: context.requestId
  });
  try {
    // Get ID from query parameters
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return error(res, 'Product ID is required', 400);
    }
    
    // Setup timeout race to prevent blocking operations
    const TIMEOUT_MS = 5000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );

    // Delete from database using adapter
    try {
      // Check if product exists first
      const getProductPromise = productAdapter.getProductById(id, user?.tenantId);
      const existingResult = await Promise.race([getProductPromise, timeoutPromise]);
      
      if (!existingResult.product) {
        childLogger.warn('Attempted to delete non-existent toling product', { id });
        return error(res, 'Toling product not found', 404);
      }
      
      // Ensure this is a toling product
      if (!existingResult.product.isToling) {
        childLogger.warn('Attempted to delete non-toling product through toling endpoint', { id });
        return error(res, 'Product is not a toling product', 400);
      }
      
      // Delete product with timeout protection
      const deletePromise = productAdapter.deleteProduct(id, user?.tenantId);
      const result = await Promise.race([deletePromise, timeoutPromise]);
      
      if (!result.success) {
        return error(res, 'Failed to delete toling product', 500);
      }
      
      childLogger.info('Deleted toling product', { id });
      
      return success(res, {
        message: 'Toling product deleted successfully',
        data: { id }
      });
    } catch (dbError) {
      childLogger.error('Error deleting toling product from database:', { error: String(dbError) });
      throw new ApiError(500, 'Failed to delete toling product', 'DATABASE_ERROR');
    }
  } catch (err: any) {
    childLogger.error('Error in deleteTolingProduct handler:', { error: String(err) });
    return error(res, err.message || 'Error deleting toling product', err.statusCode || 500);
  }
}

// Export the handler with API utilities
export default withApiHandler(handler);
