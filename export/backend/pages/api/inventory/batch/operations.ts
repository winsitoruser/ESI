import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import batchAdapter from '@/server/sequelize/adapters/inventory-batch-adapter';
import { logger } from '@/server/monitoring';

// Create a child logger for this API endpoint
const apiLogger = logger.child({
  endpoint: 'api/inventory/batch/operations',
});





export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  apiLogger.info('Batch operations API called', { method: req.method });
  
  // Verify authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    apiLogger.warn('Unauthorized access attempt');
    return res.status(401).json({ 
      success: false,
      message: 'Unauthorized',
      meta: { authenticated: false } 
    });
  }

  // Get tenant ID from session
  const tenantId = session.user?.tenantId;
  if (!tenantId) {
    apiLogger.warn('Missing tenant ID in authenticated session');
    return res.status(400).json({ 
      success: false,
      message: 'Missing tenant information',
      meta: { authenticated: true } 
    });
  }

  // Check if user has permission
  const allowedRoles = ['ADMIN', 'MANAGER', 'PHARMACIST'];
  if (!allowedRoles.includes(session.user.role)) {
    apiLogger.warn(`Forbidden access attempt by user with role ${session.user.role}`);
    return res.status(403).json({ 
      success: false,
      message: 'Forbidden: Insufficient permissions',
      meta: { authenticated: true } 
    });
  }

  // Only POST method is allowed
  if (req.method !== 'POST') {
    apiLogger.warn(`Method not allowed: ${req.method}`);
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed',
      meta: { allowedMethods: ['POST'] } 
    });
  }

  try {
    // Extract request data
    const { operation, items } = req.body;
    
    // Validate required fields
    if (!operation || !items || !Array.isArray(items) || items.length === 0) {
      apiLogger.warn('Invalid request - missing required fields');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid request. Required: operation and items array',
        meta: { received: { hasOperation: !!operation, hasItems: !!items, isItemsArray: Array.isArray(items) } } 
      });
    }
    
    // Validate operation type
    const validOperations = ['STOCK_ADJUSTMENT', 'STATUS_CHANGE', 'PRICE_UPDATE'];
    if (!validOperations.includes(operation)) {
      apiLogger.warn(`Invalid operation type: ${operation}`);
      return res.status(400).json({ 
        success: false,
        message: `Invalid operation. Must be one of: ${validOperations.join(', ')}`,
        meta: { validOperations } 
      });
    }
    
    apiLogger.info(`Processing ${operation} for ${items.length} items`, { tenantId });
    
    // Set timeout promise (10 seconds for batch operations)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database timeout')), 10000)
    );
    
    // Process based on operation type
    let dataPromise;
    
    if (operation === 'STOCK_ADJUSTMENT') {
      // Validate item format for stock adjustment
      for (const item of items) {
        if (!item.productId || typeof item.adjustment !== 'number' || !item.reason) {
          apiLogger.warn('Invalid item format for stock adjustment');
          return res.status(400).json({
            success: false,
            message: 'Invalid item format. Required for each item: productId, adjustment, reason',
            meta: { operation }
          });
        }
      }
      
      dataPromise = batchAdapter.processBatchStockAdjustment(session.user.id, tenantId, items);
    } 
    else if (operation === 'STATUS_CHANGE') {
      // Validate item format for status change
      for (const item of items) {
        if (!item.productId || !item.newStatus || !item.reason) {
          apiLogger.warn('Invalid item format for status change');
          return res.status(400).json({
            success: false,
            message: 'Invalid item format. Required for each item: productId, newStatus, reason',
            meta: { operation }
          });
        }
      }
      
      dataPromise = batchAdapter.processBatchStatusChange(session.user.id, tenantId, items);
    } 
    else if (operation === 'PRICE_UPDATE') {
      // Validate item format for price update
      for (const item of items) {
        if (!item.productId || typeof item.newPrice !== 'number' || !item.reason) {
          apiLogger.warn('Invalid item format for price update');
          return res.status(400).json({
            success: false,
            message: 'Invalid item format. Required for each item: productId, newPrice, reason',
            meta: { operation }
          });
        }
      }
      
      dataPromise = batchAdapter.processBatchPriceUpdate(session.user.id, tenantId, items);
    }
    
    // Process with timeout
    let result;
    try {
      result = await Promise.race([dataPromise, timeoutPromise]);
      apiLogger.info(`${operation} completed successfully`, { 
        operation,
        itemCount: items.length,
        successfulItems: result.operationSummary.successfulItems,
        failedItems: result.operationSummary.failedItems,
      });
    } catch (error) {
      apiLogger.error(`Error or timeout in ${operation}:`, error);
      
      // Determine the appropriate mock response based on operation
      if (operation === 'STOCK_ADJUSTMENT') {
        result = await batchAdapter.processBatchStockAdjustment(session.user.id, tenantId, []);
      } else if (operation === 'STATUS_CHANGE') {
        result = await batchAdapter.processBatchStatusChange(session.user.id, tenantId, []);
      } else {
        result = await batchAdapter.processBatchPriceUpdate(session.user.id, tenantId, []);
      }
      
      // Add metadata for error tracking
      result.meta = { 
        isMock: true, 
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
    
    return res.status(200).json(result);
  } catch (error) {
    apiLogger.error('Unhandled error in batch operations:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to process batch operation', 
      meta: { error: error.message } 
    });
  }
}
