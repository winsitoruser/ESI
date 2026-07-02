/**
 * API endpoint untuk detail produk kadaluarsa dan aksi
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
const EXPIRY_ITEM_CACHE_KEY = '/api/inventory/expiry/item';
const EXPIRY_HISTORY_CACHE_KEY = '/api/inventory/expiry/history';

async function handler(req: NextApiRequest, res: NextApiResponse, context: ApiContext) {
  try {
    // Get authenticated session
    const session = await getServerSession(req, res, authOptions);
    
    // Validate authentication in production
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!session?.user && isProduction) {
      logger.warn('Unauthorized access attempt', {
        endpoint: '/api/inventory/expiry/[id]'
      });
      return error(res, 'Unauthorized access', 401);
    }
    
    // Extract user info from session
    const user = session?.user;
    const tenantId = user?.tenantId || 'default-tenant';
    
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return error(res, 'ID produk kadaluarsa diperlukan', 400);
    }
    
    // GET - mengambil detail item kadaluarsa
    if (req.method === 'GET') {
      // Create cache key
      const cacheKey = `${EXPIRY_ITEM_CACHE_KEY}:${tenantId}:${id}`;
      
      // Check cache first for optimized performance
      const cachedData = await cacheManager.getCachedData<{ item: any; isMock: boolean }>(EXPIRY_ITEM_CACHE_KEY, {
        cacheKey
      }, async () => ({ item: null, isMock: false }));
      
      if (cachedData && cachedData.data && cachedData.data.item) {
        logger.info('Returning cached expiry item details', {
          endpoint: '/api/inventory/expiry/[id]',
          id
        });
        
        // If history is requested, fetch that separately
        if (req.query.includeHistory === 'true') {
          const historyKey = `${EXPIRY_HISTORY_CACHE_KEY}:${tenantId}:${id}`;
          
          const cachedHistory = await cacheManager.getCachedData<{ history: any[]; isMock: boolean }>(EXPIRY_HISTORY_CACHE_KEY, {
            cacheKey: historyKey
          }, async () => {
            const historyResult = await expiryAdapter.getOrderHistory(
              cachedData.data.item.productId || id, 
              tenantId
            );
            return historyResult;
          });
          
          return success(res, {
            message: 'Detail produk kadaluarsa dengan riwayat pemesanan',
            data: {
              item: cachedData.data.item,
              orderHistory: cachedHistory.data.history
            },
            meta: {
              isMock: cachedData.data.isMock || cachedHistory.data.isMock
            }
          });
        }
        
        return success(res, {
          message: 'Detail produk kadaluarsa',
          data: cachedData.data.item,
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
      
      // Get expiry item with timeout protection
      const getExpiryItemPromise = expiryAdapter.getExpiryItemById(id as string, tenantId);
      
      try {
        const result = await Promise.race([getExpiryItemPromise, timeoutPromise]) as { item: any; isMock: boolean };
        
        if (!result.item) {
          return error(res, 'Item kadaluarsa tidak ditemukan', 404);
        }
        
        // Store in cache for future requests
        await cacheManager.getCachedData(EXPIRY_ITEM_CACHE_KEY, {
          cacheKey
        }, async () => result);
        
        logger.info('Expiry item details retrieved successfully', { 
          endpoint: '/api/inventory/expiry/[id]',
          id,
          isMock: result.isMock
        });
        
        // If history is requested, fetch that too
        if (req.query.includeHistory === 'true') {
          const historyKey = `${EXPIRY_HISTORY_CACHE_KEY}:${tenantId}:${id}`;
          
          const historyResult = await cacheManager.getCachedData<{ history: any[]; isMock: boolean }>(EXPIRY_HISTORY_CACHE_KEY, {
            cacheKey: historyKey
          }, async () => {
            const historyData = await expiryAdapter.getOrderHistory(
              result.item?.productId || id, 
              tenantId
            );
            return historyData;
          });
          
          return success(res, {
            message: result.isMock
              ? 'Detail produk kadaluarsa dengan riwayat pemesanan (data simulasi)'
              : 'Detail produk kadaluarsa dengan riwayat pemesanan',
            data: {
              item: result.item,
              orderHistory: historyResult.data.history
            },
            meta: {
              isMock: result.isMock || historyResult.data.isMock
            }
          });
        }
        
        return success(res, {
          message: result.isMock
            ? 'Detail produk kadaluarsa (data simulasi)'
            : 'Detail produk kadaluarsa',
          data: result.item,
          meta: {
            isMock: result.isMock
          }
        });
      } catch (dbErr) {
        logger.error('Error getting expiry item details:', { 
          endpoint: '/api/inventory/expiry/[id]',
          id,
          error: String(dbErr) 
        });
        return error(res, 'Terjadi kesalahan saat mengambil detail item kadaluarsa', 500);
      }
    }
    // PATCH - mengupdate status item kadaluarsa
    else if (req.method === 'PATCH') {
      const { actionTaken, notes } = req.body;
      
      if (!actionTaken) {
        return error(res, 'Aksi yang akan diambil harus disertakan', 400);
      }
      
      try {
        // Validasi aksi yang dibolehkan
        const validActions = ['none', 'discard', 'defecta', 'salesPromotion'];
        if (!validActions.includes(actionTaken)) {
          return error(res, 'Aksi tidak valid', 400);
        }
        
        // Setup timeout protection
        const TIMEOUT_MS = 5000;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Database operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
        );
        
        // Update expiry action with timeout protection
        const updateActionPromise = expiryAdapter.updateExpiryAction(
          id,
          actionTaken,
          notes || '',
          user?.name || 'Unknown User',
          tenantId
        );
        
        const result = await Promise.race([updateActionPromise, timeoutPromise]) as { item: any; isMock: boolean; success: boolean };
        
        if (!result.success) {
          return error(res, 'Gagal mengupdate status item kadaluarsa', 500);
        }
        
        // Invalidate caches
        await cacheManager.invalidateCache(EXPIRY_ITEM_CACHE_KEY, { 
          cacheKey: `${EXPIRY_ITEM_CACHE_KEY}:${tenantId}:${id}` 
        });
        await cacheManager.invalidateEndpointCache(EXPIRY_ITEM_CACHE_KEY);
        await cacheManager.invalidateEndpointCache('/api/inventory/expiry');
        
        logger.info('Expiry action updated successfully', { 
          endpoint: '/api/inventory/expiry/[id]',
          id,
          action: actionTaken,
          isMock: result.isMock
        });
        
        return success(res, {
          message: 'Status item kadaluarsa berhasil diperbarui',
          data: result.item,
          meta: {
            isMock: result.isMock
          }
        });
      } catch (updateErr) {
        logger.error('Error updating expiry action:', { 
          endpoint: '/api/inventory/expiry/[id]',
          id,
          action: actionTaken,
          error: String(updateErr) 
        });
        return error(res, 'Terjadi kesalahan saat mengupdate status item kadaluarsa', 500);
      }
    } else {
      res.setHeader('Allow', ['GET', 'PATCH']);
      return error(res, 'Method Not Allowed', 405);
    }
  } catch (err: any) {
    logger.error('Error pada API item kadaluarsa:', { 
      endpoint: '/api/inventory/expiry/[id]',
      error: String(err) 
    });
    return error(res, err.message || 'Terjadi kesalahan pada server', err.statusCode || 500);
  }
}

export default withApiHandler(handler);
