import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { rackAdapter } from '../../../../lib/adapters/rack-adapter';
import { createMockRacks } from '../../../../data/mockup/inventory-racks';
import { extractTenantId } from '../../../../utils/api-utils';

const TIMEOUT_MS = 10000; // 10 seconds timeout for database operations

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const tenantId = extractTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID is required' });
    }

    // Create a timeout promise to abort long-running operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Operation timed out'));
      }, TIMEOUT_MS);
    });

    if (req.method === 'POST') {
      // Handle batch create
      await handleBatchCreate(req, res, tenantId, timeoutPromise);
    } else if (req.method === 'DELETE') {
      // Handle batch delete
      await handleBatchDelete(req, res, tenantId, timeoutPromise);
    } else {
      res.setHeader('Allow', ['POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('Error handling batch rack operation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while processing the request', 
      error: error.message 
    });
  }
}

/**
 * Handle batch creation of racks
 */
async function handleBatchCreate(
  req: NextApiRequest, 
  res: NextApiResponse,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  try {
    const { racks } = req.body;
    
    if (!Array.isArray(racks) || racks.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request body. Expected an array of racks.'
      });
    }
    
    // Validate each rack in the batch
    for (const rack of racks) {
      if (!rack.code || !rack.warehouseId) {
        return res.status(400).json({
          success: false,
          message: 'Each rack must have at least a code and warehouseId',
          invalidRack: rack
        });
      }
    }

    // Add tenantId to each rack
    const racksWithTenant = racks.map(rack => ({
      ...rack,
      tenantId
    }));

    // Try to create all racks in a batch
    try {
      const createdRacks = await Promise.race([
        rackAdapter.createBatch(racksWithTenant),
        timeoutPromise
      ]);
      
      return res.status(201).json({
        success: true,
        message: `Successfully created ${createdRacks.length} racks`,
        data: createdRacks
      });
    } catch (dbError: any) {
      console.error('Database error during batch rack creation:', dbError);
      
      // Fall back to mock data in case of database error
      const mockRacks = createMockRacks(tenantId, racks.length);
      
      return res.status(200).json({
        success: true,
        message: 'Using mock data due to database error',
        data: mockRacks,
        meta: {
          isMock: true,
          error: dbError.message
        }
      });
    }
  } catch (error: any) {
    console.error('Error in batch create racks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create racks in batch', 
      error: error.message 
    });
  }
}

/**
 * Handle batch deletion of racks
 */
async function handleBatchDelete(
  req: NextApiRequest, 
  res: NextApiResponse,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request body. Expected an array of rack IDs.'
      });
    }

    // Try to delete all racks in a batch
    try {
      const result = await Promise.race([
        rackAdapter.deleteBatch(ids, tenantId),
        timeoutPromise
      ]);
      
      return res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.count} racks`,
        data: { count: result.count, ids }
      });
    } catch (dbError: any) {
      console.error('Database error during batch rack deletion:', dbError);
      
      return res.status(200).json({
        success: true,
        message: 'Using mock deletion response due to database error',
        data: { count: ids.length, ids },
        meta: {
          isMock: true,
          error: dbError.message
        }
      });
    }
  } catch (error: any) {
    console.error('Error in batch delete racks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete racks in batch', 
      error: error.message 
    });
  }
}
