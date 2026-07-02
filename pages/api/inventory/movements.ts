/**
 * API endpoint untuk pergerakan inventory (Stock Movements)
 * Menggunakan Sequelize adapter untuk operasi database
 * Dengan timeout protection dan fallback ke mock data
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { withApiHandler, success, error, ApiContext, parseQueryParams } from '@/utils/api-utils';
import { ApiError } from '@/middleware/error-handler';
import logger from '@/lib/logger';
import movementAdapter from '@/server/sequelize/adapters/inventory-movement-adapter';
import cacheManager from '@/lib/cache-manager';

// Konstanta untuk optimasi
const MOVEMENTS_CACHE_KEY = '/api/inventory/movements';

// Define allowed query params and their types
const querySchema: Record<string, { type: "string" | "number" | "boolean" | "array"; required?: boolean; default?: any }> = {
  page: { type: "number", default: 1 },
  limit: { type: "number", default: 20 },
  type: { type: "string" },
  productId: { type: "string" },
  startDate: { type: "string" },
  endDate: { type: "string" },
  search: { type: "string" }
};

async function handler(req: NextApiRequest, res: NextApiResponse, context: ApiContext) {
  // Get authenticated session
  const session = await getServerSession(req, res, authOptions);
  
  // Validate authentication in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!session?.user && isProduction) {
    logger.warn('Unauthorized access attempt', {
      endpoint: '/api/inventory/movements'
    });
    return error(res, 'Unauthorized access', 401);
  }
  
  // Extract user info from session
  const user = session?.user;
  
  // Tentukan role yang diperbolehkan mengakses
  const authorizedRoles = ['ADMIN', 'MANAGER', 'PHARMACIST'];
  if (user && user.role && !authorizedRoles.includes(user.role)) {
    logger.warn('Permission denied for user', {
      endpoint: '/api/inventory/movements',
      userRole: user.role
    });
    throw new ApiError(403, 'Anda tidak memiliki akses untuk data pergerakan inventory', 'PERMISSION_ERROR');
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getInventoryMovements(req, res, user);
    case 'POST':
      return createInventoryMovement(req, res, user);
    default:
      logger.warn('Method not allowed', {
        endpoint: '/api/inventory/movements',
        method: req.method
      });
      throw new ApiError(405, 'Metode tidak diperbolehkan', 'METHOD_NOT_ALLOWED');
  }
}

/**
 * GET - Ambil daftar pergerakan inventory
 */
async function getInventoryMovements(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    // Parse query parameters
    const params = parseQueryParams(req.query, querySchema);
    
    // Tentukan tenant ID dari user yang login
    const tenantId = user?.tenantId || 'default-tenant';
    
    // Create cache key
    const cacheKey = `${MOVEMENTS_CACHE_KEY}:${tenantId}:${params.page || 1}:${params.limit || 20}:${params.type || ''}:${params.productId || ''}:${params.startDate || ''}:${params.endDate || ''}:${params.search || ''}`;
    
    // Check cache first for optimized performance
    const cachedData = await cacheManager.getCachedData<any>(MOVEMENTS_CACHE_KEY, {
      cacheKey
    }, async () => null);
    
    if (cachedData && cachedData.data) {
      logger.info('Returning cached inventory movements', {
        endpoint: '/api/inventory/movements',
        tenantId
      });
      return success(res, {
        message: 'Cached inventory movements retrieved successfully',
        data: cachedData.data.movements,
        pagination: {
          page: cachedData.data.page,
          limit: cachedData.data.limit,
          totalItems: cachedData.data.total,
          totalPages: cachedData.data.totalPages
        },
        stats: cachedData.data.stats,
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
    
    // Get movements with timeout protection
    const getMovementsPromise = movementAdapter.getMovements({
      type: params.type as string,
      productId: params.productId as string,
      startDate: params.startDate as string,
      endDate: params.endDate as string,
      search: params.search as string,
      page: params.page as number,
      limit: params.limit as number,
      tenantId
    });
    
    try {
      const result = await Promise.race([getMovementsPromise, timeoutPromise]);
      
      // Store in cache for future requests
      await cacheManager.getCachedData(MOVEMENTS_CACHE_KEY, {
        cacheKey
      }, async () => result);
      
      logger.info('Inventory movements retrieved successfully', { 
        endpoint: '/api/inventory/movements',
        count: result.movements.length,
        isMock: result.isMock
      });
      
      return success(res, {
        message: result.isMock
          ? 'Mock inventory movements retrieved successfully (fallback mode)'
          : 'Inventory movements retrieved successfully',
        data: result.movements,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalItems: result.total,
          totalPages: result.totalPages
        },
        stats: result.stats,
        meta: {
          isMock: result.isMock
        }
      });
    } catch (dbErr) {
      logger.error('Error getting inventory movements:', { 
        endpoint: '/api/inventory/movements',
        error: String(dbErr) 
      });
      return error(res, 'Terjadi kesalahan saat mengambil data pergerakan inventory', 500);
    }
  } catch (err: any) {
    logger.error('Error in inventory movements handler:', { 
      endpoint: '/api/inventory/movements',
      error: String(err) 
    });
    return error(res, err.message || 'Terjadi kesalahan saat mengambil data pergerakan inventory', err.statusCode || 500);
  }
}

/**
 * POST - Buat pergerakan inventory baru
 */
async function createInventoryMovement(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    // Get movement data from request body
    const movementData = req.body;
    
    // Add tenant ID to movement data
    movementData.tenantId = user?.tenantId || 'default-tenant';
    
    // Add user ID if not provided
    if (!movementData.userId && user?.id) {
      movementData.userId = user.id;
    }
    
    // Add user name if not provided
    if (!movementData.userName && user?.name) {
      movementData.userName = user.name;
    }
    
    // Setup timeout protection
    const TIMEOUT_MS = 5000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );
    
    // Create movement with timeout protection
    const createMovementPromise = movementAdapter.createMovement(movementData);
    
    try {
      const result = await Promise.race([createMovementPromise, timeoutPromise]);
      
      // Invalidate cache after creating new movement
      await cacheManager.invalidateEndpointCache(MOVEMENTS_CACHE_KEY);
      
      logger.info('Inventory movement created successfully', { 
        endpoint: '/api/inventory/movements',
        movementId: result.movement.id,
        isMock: result.isMock
      });
      
      return success(res, {
        message: result.isMock
          ? 'Mock inventory movement created successfully (fallback mode)'
          : 'Pergerakan inventory berhasil dibuat',
        data: result.movement,
        meta: {
          isMock: result.isMock
        }
      });
    } catch (dbErr) {
      logger.error('Error creating inventory movement:', { 
        endpoint: '/api/inventory/movements',
        error: String(dbErr) 
      });
      return error(res, 'Terjadi kesalahan saat membuat pergerakan inventory', 500);
    }
  } catch (err: any) {
    logger.error('Error in create inventory movement handler:', { 
      endpoint: '/api/inventory/movements',
      error: String(err) 
    });
    return error(res, err.message || 'Terjadi kesalahan saat membuat pergerakan inventory', err.statusCode || 500);
  }
}

export default withApiHandler(handler);
