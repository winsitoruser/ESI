import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';
import { shelfPositionAdapter } from '@/server/sequelize/adapters';

const apiLogger = logger.child({ service: 'shelf-position-by-id-api' });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Get tenant ID from session
    const tenantId = (session?.user as any)?.tenantId || 'default';
    
    // Setup timeout protection
    const TIMEOUT_MS = 5000;
    const timeoutPromise: Promise<never> = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );
    
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Shelf position ID is required',
        error: {
          code: 'MISSING_ID',
          details: 'You must provide a valid shelf position ID in the request'
        }
      });
    }

    if (req.method === 'GET') {
      apiLogger.info('GET request for shelf position by ID', { id, tenantId });
      
      try {
        const result = await Promise.race([
          shelfPositionAdapter.getShelfPositionById(id, tenantId),
          timeoutPromise
        ]);
        
        if (!result.position) {
          return res.status(404).json({ 
            success: false, 
            message: 'Shelf position not found',
            error: {
              code: 'NOT_FOUND',
              details: `No shelf position with ID ${id} exists`
            }
          });
        }
        
        return res.status(200).json({ 
          success: true, 
          data: result.position,
          isMock: result.isMock 
        });
      } catch (error) {
        apiLogger.error('Error getting shelf position by ID', { error, id });
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to retrieve shelf position',
          error: {
            code: 'DATABASE_ERROR',
            details: 'An error occurred while fetching the shelf position from the database'
          }
        });
      }
    } 
    else if (req.method === 'PUT') {
      apiLogger.info('PUT request to update shelf position', { id, tenantId });
      
      const updateData = req.body;
      
      // Enhanced validation with specific error messages
      const validationErrors = [];
      if (updateData.code === '') {
        validationErrors.push({
          field: 'code',
          message: 'Code cannot be empty'
        });
      }
      
      if (updateData.shelfName === '') {
        validationErrors.push({
          field: 'shelfName',
          message: 'Shelf name cannot be empty'
        });
      }
      
      if (updateData.capacity !== undefined && (isNaN(updateData.capacity) || updateData.capacity < 0)) {
        validationErrors.push({
          field: 'capacity',
          message: 'Capacity must be a positive number'
        });
      }
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: {
            code: 'VALIDATION_ERROR',
            details: validationErrors
          }
        });
      }
      
      try {
        const result = await Promise.race([
          shelfPositionAdapter.updateShelfPosition(id, updateData, tenantId),
          timeoutPromise
        ]);
        
        if (!result.success) {
          return res.status(400).json({ 
            success: false, 
            message: result.error || 'Failed to update shelf position',
            error: {
              code: 'UPDATE_FAILED',
              details: result.error || 'Unknown error occurred'
            }
          });
        }
        
        return res.status(200).json({ 
          success: true, 
          data: result.position,
          isMock: result.isMock 
        });
      } catch (error) {
        apiLogger.error('Error updating shelf position', { error, id });
        return res.status(500).json({ 
          success: false, 
          message: 'Internal server error',
          error: {
            code: 'DATABASE_ERROR',
            details: 'An error occurred while updating the shelf position'
          }
        });
      }
    } 
    else if (req.method === 'DELETE') {
      apiLogger.info('DELETE request for shelf position', { id, tenantId });
      
      try {
        const result = await Promise.race([
          shelfPositionAdapter.deleteShelfPosition(id, tenantId),
          timeoutPromise
        ]);
        
        if (!result.success) {
          return res.status(400).json({ 
            success: false, 
            message: result.error || 'Failed to delete shelf position',
            error: {
              code: 'DELETE_FAILED',
              details: result.error || 'The shelf position may be in use by products'
            }
          });
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'Shelf position deleted successfully',
          isMock: result.isMock 
        });
      } catch (error) {
        apiLogger.error('Error deleting shelf position', { error, id });
        return res.status(500).json({ 
          success: false, 
          message: 'Internal server error',
          error: {
            code: 'DATABASE_ERROR',
            details: 'An error occurred while deleting the shelf position'
          }
        });
      }
    } 
    else {
      return res.status(405).json({ 
        success: false, 
        message: 'Method not allowed',
        error: {
          code: 'METHOD_NOT_ALLOWED',
          details: `The ${req.method} method is not supported for this endpoint`
        }
      });
    }
  } catch (error) {
    apiLogger.error('Unhandled error in shelf position API', { error });
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: {
        code: 'INTERNAL_ERROR',
        details: 'An unexpected error occurred while processing your request'
      }
    });
  }
}
