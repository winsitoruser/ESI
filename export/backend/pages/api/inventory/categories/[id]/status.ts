import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';
import categoryAdapter from '@/server/sequelize/adapters/inventory-category-adapter';

const apiLogger = logger.child({ service: 'category-status-api' });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.query;

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
    }
    
    // Get tenant ID from session
    const tenantId = (session?.user as any)?.tenantId || 'default';
    
    // Setup timeout protection
    const TIMEOUT_MS = 5000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );
    
    apiLogger.info('Updating category status', { id, isActive, tenantId });
    
    // Use the adapter with timeout protection
    const updateCategoryPromise = categoryAdapter.updateCategory(id as string, { isActive }, tenantId);
    const result = await Promise.race([updateCategoryPromise, timeoutPromise]) as any;
    
    if (!result.success) {
      if (result.error === 'Category not found') {
        apiLogger.warn('Category not found for status update', { id });
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      
      apiLogger.warn('Failed to update category status', { id, error: result.error });
      return res.status(400).json({ success: false, message: result.error || 'Failed to update category status' });
    }
    
    apiLogger.info('Category status updated successfully', { id, isMock: result.isMock });
    
    res.status(200).json({
      success: true,
      data: result.category,
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error updating category status:', error);
    res.status(500).json({ success: false, message: 'Failed to update category status' });
  }
}
