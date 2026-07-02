/**
 * API endpoint untuk tracking produk kadaluarsa
 * Menggunakan Sequelize adapter untuk operasi database
 * Dengan timeout protection dan fallback ke mock data
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { withApiHandler, success, error, ApiContext } from '@/utils/api-utils';
import logger from '@/lib/logger';
import expiryAdapter from '@/server/sequelize/adapters/inventory-expiry-adapter';
import cacheManager from '@/lib/cache-manager';

// Konstanta untuk optimasi
const EXPIRY_CACHE_KEY = '/api/inventory/expiry';

async function handler(req: NextApiRequest, res: NextApiResponse, context: ApiContext) {
  try {
    // Get authenticated session
    const session = await getServerSession(req, res, authOptions);
    
    // Validate authentication in production
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!session?.user && isProduction) {
      logger.warn('Unauthorized access attempt', {
        endpoint: '/api/inventory/expiry'
      });
      return error(res, 'Unauthorized access', 401);
    }
    
    // Extract user info from session
    const user = session?.user;
    const tenantId = user?.tenantId || 'default-tenant';
    
    // GET request untuk mendapatkan daftar item kadaluarsa
    if (req.method === 'GET') {
      const { status, category } = req.query;
      
      // Create cache key
      const cacheKey = `${EXPIRY_CACHE_KEY}:${tenantId}:${status || ''}:${category || ''}`;
      
      // Check cache first for optimized performance
      const cachedData = await cacheManager.getCachedData<{ items: any[]; isMock: boolean } | null>(EXPIRY_CACHE_KEY, {
        cacheKey
      }, async () => null);
      
      if (cachedData && cachedData.data) {
        logger.info('Returning cached expiry items', {
          endpoint: '/api/inventory/expiry',
          count: cachedData.data.items.length
        });
        return success(res, {
          message: 'Cached data produk kadaluarsa',
          data: cachedData.data.items,
          meta: {
            isMock: cachedData.data.isMock
          }
        });
      }
      
      // Setup timeout protection
      const TIMEOUT_MS = 5000;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Database operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
      );
      
      // Get expiry items with timeout protection
      const getExpiryItemsPromise = expiryAdapter.getExpiryItems({
        status: status as string,
        category: category as string,
        tenantId
      });
      
      try {
        const result = await Promise.race([getExpiryItemsPromise, timeoutPromise]) as { items: any[]; isMock: boolean };
        
        // Store in cache for future requests
        await cacheManager.getCachedData(EXPIRY_CACHE_KEY, {
          cacheKey
        }, async () => result);
        
        logger.info('Expiry items retrieved successfully', { 
          endpoint: '/api/inventory/expiry',
          count: result.items.length,
          isMock: result.isMock
        });
        
        return success(res, {
          message: result.isMock
            ? 'Data produk kadaluarsa (data simulasi)'
            : 'Data produk kadaluarsa',
          data: result.items,
          meta: {
            isMock: result.isMock
          }
        });
      } catch (dbErr) {
        logger.error('Error getting expiry items:', { 
          endpoint: '/api/inventory/expiry',
          error: String(dbErr) 
        });
        return error(res, 'Terjadi kesalahan saat mengambil data produk kadaluarsa', 500);
      }
    }
    // Handle POST request untuk aksi kadaluarsa
    else if (req.method === 'POST') {
      const { action, items } = req.body;
      
      if (!action || !items || !Array.isArray(items) || items.length === 0) {
        return error(res, 'Data yang dikirimkan tidak valid', 400);
      }
      
      // Validasi aksi yang dibolehkan
      const validActions = ['discard', 'defecta', 'salesPromotion'];
      if (!validActions.includes(action)) {
        return error(res, 'Aksi tidak valid', 400);
      }
      
      try {
        // Process each item
        const processPromises = items.map(async (itemId) => {
          try {
            const actionResult = await expiryAdapter.updateExpiryAction(
              itemId,
              action,
              `Processed via batch ${action} action`,
              user?.name || 'Unknown User',
              tenantId
            );
            
            return {
              id: itemId,
              success: true,
              isMock: actionResult.isMock
            };
          } catch (itemError) {
            logger.error(`Error processing action for item ${itemId}:`, {
              error: String(itemError),
              action,
              itemId
            });
            
            return {
              id: itemId,
              success: false,
              error: String(itemError)
            };
          }
        });
        
        const results = await Promise.all(processPromises);
        
        // Invalidate cache
        await cacheManager.invalidateEndpointCache(EXPIRY_CACHE_KEY);
        
        logger.info(`Processed ${action} action for ${items.length} items`, {
          action,
          totalItems: items.length,
          successCount: results.filter(r => r.success).length
        });
        
        // Berikan respons yang berbeda berdasarkan aksi
        let message = '';
        switch (action) {
          case 'discard':
            message = 'Produk berhasil dibuang dari inventori';
            break;
          case 'defecta':
            message = 'Defecta berhasil dibuat';
            break;
          case 'salesPromotion':
            message = 'Produk berhasil ditandai untuk promosi penjualan';
            break;
        }
        
        return success(res, {
          message,
          data: results,
          meta: {
            total: items.length,
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          }
        });
      } catch (processError) {
        logger.error('Error memproses aksi kadaluarsa:', { 
          error: String(processError),
          action,
          itemCount: items.length
        });
        return error(res, 'Terjadi kesalahan saat memproses aksi', 500);
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return error(res, 'Method Not Allowed', 405);
    }
  } catch (err: any) {
    logger.error('Error pada API kadaluarsa:', { 
      endpoint: '/api/inventory/expiry',
      error: String(err) 
    });
    return error(res, err.message || 'Terjadi kesalahan pada server', err.statusCode || 500);
  }
}

export default withApiHandler(handler);
