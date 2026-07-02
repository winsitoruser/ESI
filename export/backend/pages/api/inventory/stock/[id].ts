/**
 * API Detail Stok Inventaris
 * Menggunakan Sequelize adapter untuk operasi database
 * Operasi dengan timeout protection untuk database produksi
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { withApiHandler, success, error, ApiContext } from '@/utils/api-utils';
import logger from '@/lib/logger';
import stockAdapter, { StockItem } from '@/server/sequelize/adapters/inventory-stock-adapter';
import cacheManager from '@/lib/cache-manager';

// Konstanta untuk optimasi
const STOCK_ITEM_CACHE_KEY = '/api/inventory/stock/item';

/**
 * Handle stock item detail requests
 */
export default withApiHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  context: ApiContext
) {
  // Validate method
  if (req.method !== 'GET') {
    logger.warn('Method not allowed', {
      endpoint: '/api/inventory/stock/[id]',
      method: req.method
    });
    return error(res, 'Method not allowed', 405);
  }
  
  try {
    // Get authenticated session
    const session = await getServerSession(req, res, authOptions);
    
    // Allow anonymous access in development
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!session?.user && isProduction) {
      logger.warn('Unauthorized access attempt', {
        endpoint: '/api/inventory/stock/[id]'
      });
      return error(res, 'Unauthorized access', 401);
    }
    
    // Extract user info from session
    const user = session?.user;
    
    // Get stock item ID from query
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      logger.warn('Invalid stock item ID', {
        endpoint: '/api/inventory/stock/[id]'
      });
      return error(res, 'Invalid stock item ID', 400);
    }
    
    // Create cache key
    const tenantId = user?.tenantId;
    const cacheKey = `${STOCK_ITEM_CACHE_KEY}:${tenantId || 'global'}:${id}`;
    
    // Check cache first for optimized performance
    const cachedData = await cacheManager.getCachedData<{ item: StockItem | null } | null>(STOCK_ITEM_CACHE_KEY, {
      cacheKey
    }, async () => null);
    
    if (cachedData && cachedData.data) {
      logger.info('Returning cached stock item details', {
        endpoint: '/api/inventory/stock/[id]',
        id
      });
      return success(res, {
        message: 'Cached stock item details retrieved successfully',
        data: cachedData.data.item
      });
    }
    
    // Setup timeout protection - increased for production environment
    const TIMEOUT_MS = 10000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );
    
    // Get stock item details with timeout protection
    const getItemPromise = stockAdapter.getStockItemById(id, tenantId);
    
    try {
      // Provide explicit typing for the Promise.race result
      const result = await Promise.race([getItemPromise, timeoutPromise]) as { item: StockItem | null };
      
      if (!result.item) {
        logger.warn('Stock item not found', {
          endpoint: '/api/inventory/stock/[id]',
          id
        });
        return error(res, 'Stock item not found', 404);
      }
      
      // Store in cache for future requests
      await cacheManager.getCachedData(STOCK_ITEM_CACHE_KEY, {
        cacheKey
      }, async () => result);
      
      logger.info('Stock item details retrieved successfully', { 
        endpoint: '/api/inventory/stock/[id]',
        id
      });
      
      return success(res, {
        message: 'Stock item details retrieved successfully',
        data: result.item
      });
    } catch (dbErr) {
      logger.error('Error getting stock item details:', { 
        endpoint: '/api/inventory/stock/[id]',
        id,
        error: String(dbErr) 
      });
      return error(res, 'Database error getting stock item details', 500);
    }
  } catch (err: any) {
    logger.error('Error in stock item handler:', { 
      endpoint: '/api/inventory/stock/[id]',
      error: String(err) 
    });
    return error(res, err.message || 'Error getting stock item details', err.statusCode || 500);
  }
});
