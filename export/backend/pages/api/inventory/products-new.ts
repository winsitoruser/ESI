/**
 * API Produk Inventori (Versi Baru)
 * Implementasi yang lebih sederhana dan handal dengan koneksi langsung ke database
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler, success, error, parseQueryParams } from '@/utils/api-utils';
import logger from '@/lib/logger';
import { getProducts as fetchProductsFromDb, ProductFilter } from '@/lib/adapters/product-adapter';
import { authenticateUser } from '@/lib/auth';

// Type untuk product data
interface ProductData {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
  categoryColor?: string;
  sku?: string;
  unit?: string;
  supplierName?: string;
  expiry?: string;
  image?: string;
  reorderPoint?: number;
}

/**
 * Handler API produk
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check authentication for non-development environments
    if (process.env.NODE_ENV !== 'development') {
      const session = await authenticateUser(req, res);
      if (!session) {
        return error(res, 'Unauthorized', 401);
      }
    }

    switch (req.method) {
      case 'GET':
        return await getProducts(req, res);
      default:
        return error(res, 'Method not allowed', 405);
    }
  } catch (err: any) {
    logger.error('Error in products API:', err);
    return error(res, 'Internal server error', 500);
  }
}

/**
 * GET - Mengambil daftar produk dari database
 */
async function getProducts(req: NextApiRequest, res: NextApiResponse) {
  const requestLog = logger.child({ endpoint: 'products-new', method: 'GET' });
  requestLog.info('Fetching products from database');
  
  try {
    // Extract query parameters
    const { search, category, page, limit, lowStock } = parseQueryParams(req.query);
    
    // Create filter object for database query
    const filter: ProductFilter = {};
    
    // Apply filters if provided
    if (search) filter.search = search as string;
    if (category) filter.category = category as string;
    if (page) filter.page = parseInt(page as string);
    if (limit) filter.limit = parseInt(limit as string);
    if (lowStock === 'true') filter.lowStock = true;
    
    // Query database through product adapter
    const result = await fetchProductsFromDb(filter);
    
    requestLog.info(`Successfully fetched ${result.products.length} products`);
    
    return success(res, {
      success: true,
      data: result.products,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages
      }
    });
    
  } catch (err: any) {
    requestLog.error('Error getting products from database:', err);
    
    // Return appropriate error response
    return error(res, 'Failed to fetch products', 500);
  }
}

// Export handler dengan wrapper API
export default withApiHandler(handler);
