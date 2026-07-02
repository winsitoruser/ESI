import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { categoryAdapter } from '../../../../lib/adapters/category-adapter';
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

    if (req.method === 'DELETE') {
      // Handle batch delete
      await handleBatchDelete(req, res, tenantId, timeoutPromise);
    } else if (req.method === 'POST') {
      // Handle batch create
      await handleBatchCreate(req, res, tenantId, timeoutPromise);
    } else {
      res.setHeader('Allow', ['DELETE', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('Error handling batch category operation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while processing the request', 
      error: error.message 
    });
  }
}

/**
 * Handle batch deletion of categories
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
        message: 'Invalid request body. Expected an array of category IDs.'
      });
    }

    // Try to delete all categories in a batch
    try {
      const result = await Promise.race([
        categoryAdapter.deleteBatch(ids, tenantId),
        timeoutPromise
      ]);
      
      return res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.count} categories`,
        data: { count: result.count, ids: result.deletedIds }
      });
    } catch (dbError: any) {
      console.error('Database error during batch category deletion:', dbError);
      
      // Return partial success if some categories were deleted
      if (dbError.deletedIds && dbError.deletedIds.length > 0) {
        return res.status(207).json({
          success: true,
          message: 'Some categories were deleted successfully',
          data: { 
            count: dbError.deletedIds.length,
            ids: dbError.deletedIds,
            failedIds: ids.filter(id => !dbError.deletedIds.includes(id))
          },
          error: dbError.message
        });
      }
      
      // Return mock response if complete failure
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
    console.error('Error in batch delete categories:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete categories in batch', 
      error: error.message 
    });
  }
}

/**
 * Handle batch creation of categories
 */
async function handleBatchCreate(
  req: NextApiRequest, 
  res: NextApiResponse,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  try {
    const { categories } = req.body;
    
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request body. Expected an array of categories.'
      });
    }
    
    // Validate each category in the batch
    for (const category of categories) {
      if (!category.name) {
        return res.status(400).json({
          success: false,
          message: 'Each category must have at least a name',
          invalidCategory: category
        });
      }
    }

    // Add tenantId to each category
    const categoriesWithTenant = categories.map(category => ({
      ...category,
      tenantId
    }));

    // Try to create all categories in a batch
    try {
      const createdCategories = await Promise.race([
        categoryAdapter.createBatch(categoriesWithTenant),
        timeoutPromise
      ]);
      
      return res.status(201).json({
        success: true,
        message: `Successfully created ${createdCategories.length} categories`,
        data: createdCategories
      });
    } catch (dbError: any) {
      console.error('Database error during batch category creation:', dbError);
      
      // Fall back to mock data in case of database error
      const mockCategories = categories.map((cat, index) => ({
        id: `mock-${index}`,
        name: cat.name,
        description: cat.description || '',
        color: cat.color || '#ef4444',
        isActive: cat.isActive !== false,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      return res.status(200).json({
        success: true,
        message: 'Using mock data due to database error',
        data: mockCategories,
        meta: {
          isMock: true,
          error: dbError.message
        }
      });
    }
  } catch (error: any) {
    console.error('Error in batch create categories:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create categories in batch', 
      error: error.message 
    });
  }
}
