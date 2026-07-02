import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';
import categoryAdapter from '@/server/sequelize/adapters/inventory-category-adapter';

const apiLogger = logger.child({ service: 'category-detail-api' });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.query;

  try {
    // Get tenant ID from session
    const tenantId = (session?.user as any)?.tenantId || 'default';
    
    // Setup timeout protection
    const TIMEOUT_MS = 5000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );

    apiLogger.info('Handling request', { method: req.method, id, tenantId });

    switch (req.method) {
      case 'GET':
        await handleGetCategory(id as string, res, tenantId, timeoutPromise);
        break;
      case 'PATCH':
        await handleUpdateCategory(id as string, req, res, tenantId, timeoutPromise);
        break;
      case 'DELETE':
        await handleDeleteCategory(id as string, res, tenantId, timeoutPromise);
        break;
      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    apiLogger.error('API Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function handleGetCategory(
  id: string,
  res: NextApiResponse,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  try {
    apiLogger.info('Getting category by ID', { id, tenantId });
    
    // Use the adapter with timeout protection
    const getCategoryPromise = categoryAdapter.getCategoryById(id, tenantId);
    const result = await Promise.race([getCategoryPromise, timeoutPromise]) as any;
    
    if (!result.category) {
      apiLogger.warn('Category not found', { id, tenantId });
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    apiLogger.info('Category retrieved successfully', { id, isMock: result.isMock });
    
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

  try {
    apiLogger.info('Updating category', { id, name, tenantId });
    
    // Use the adapter with timeout protection
    const updateCategoryPromise = categoryAdapter.updateCategory(id, {
      name,
      description,
      color,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined
    }, tenantId);
    
    const result = await Promise.race([updateCategoryPromise, timeoutPromise]) as any;
    
    if (!result.success) {
      // Check if category not found or name conflict
      if (result.error === 'Category not found') {
        apiLogger.warn('Category not found for update', { id });
        return res.status(404).json({ success: false, message: result.error });
      } else if (result.error.includes('name already exists')) {
        apiLogger.warn('Category name conflict', { id, name });
        return res.status(409).json({ success: false, message: result.error });
      }
      
      // Other errors
      apiLogger.warn('Failed to update category', { id, error: result.error });
      return res.status(400).json({ success: false, message: result.error });
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
  res: NextApiResponse,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  try {
    apiLogger.info('Deleting category', { id, tenantId });
    
    // Use the adapter with timeout protection
    const deleteCategoryPromise = categoryAdapter.deleteCategory(id, tenantId);
    const result = await Promise.race([deleteCategoryPromise, timeoutPromise]) as any;
    
    if (!result.success) {
      // Check if category not found or has products
      if (result.error === 'Category not found') {
        apiLogger.warn('Category not found for deletion', { id });
        return res.status(404).json({ success: false, message: result.error });
      } else if (result.error.includes('associated products')) {
        apiLogger.warn('Cannot delete category with products', { id });
        return res.status(400).json({ success: false, message: result.error });
      }
      
      // Other errors
      apiLogger.warn('Failed to delete category', { id, error: result.error });
      return res.status(400).json({ success: false, message: result.error });
    }
    
    apiLogger.info('Category deleted successfully', { id, isMock: result.isMock });
    
    res.status(204).end();
  } catch (error) {
    apiLogger.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
}
