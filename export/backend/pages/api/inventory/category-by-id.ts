import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';
import categoryAdapter from '@/server/sequelize/adapters/inventory-category-adapter';

const apiLogger = logger.child({ service: 'category-by-id-api' });

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
      return res.status(400).json({ success: false, message: 'Category ID is required' });
    }

    if (req.method === 'GET') {
      await handleGetCategory(id, req, res, tenantId, timeoutPromise);
    } else if (req.method === 'PUT') {
      await handleUpdateCategory(id, req, res, tenantId, timeoutPromise);
    } else if (req.method === 'DELETE') {
      await handleDeleteCategory(id, req, res, tenantId, timeoutPromise);
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    apiLogger.error('API Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function handleGetCategory(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  apiLogger.info('Getting category by ID', { id, tenantId });

  try {
    // Use the adapter with timeout protection
    const getCategoryPromise = categoryAdapter.getCategoryById(id, tenantId);
    
    const result = await Promise.race([getCategoryPromise, timeoutPromise]) as any;
    
    if (!result.category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    apiLogger.info('Retrieved category', { id, isMock: result.isMock });
    
    res.status(200).json({
      success: true,
      data: result.category,
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error fetching category:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category' });
  }
}

async function handleUpdateCategory(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  const { name, description, color, isActive } = req.body;

  // Basic validation
  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  apiLogger.info('Updating category', { id, tenantId });

  try {
    // Use the adapter with timeout protection
    const updateCategoryPromise = categoryAdapter.updateCategory(id, {
      name,
      description,
      color,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined
    }, tenantId);
    
    const result = await Promise.race([updateCategoryPromise, timeoutPromise]) as any;
    
    if (!result.success) {
      apiLogger.warn('Failed to update category', { error: result.error });
      return res.status(409).json({
        success: false,
        message: result.error || 'Failed to update category'
      });
    }
    
    apiLogger.info('Category updated successfully', { id, isMock: result.isMock });
    
    res.status(200).json({
      success: true,
      data: result.category,
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
}

async function handleDeleteCategory(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  apiLogger.info('Deleting category', { id, tenantId });

  try {
    // Use the adapter with timeout protection
    const deleteCategoryPromise = categoryAdapter.deleteCategory(id, tenantId);
    
    const result = await Promise.race([deleteCategoryPromise, timeoutPromise]) as any;
    
    if (!result.success) {
      apiLogger.warn('Failed to delete category', { error: result.error });
      return res.status(409).json({
        success: false,
        message: result.error || 'Failed to delete category'
      });
    }
    
    apiLogger.info('Category deleted successfully', { id, isMock: result.isMock });
    
    res.status(200).json({
      success: true,
      data: { id },
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
}
