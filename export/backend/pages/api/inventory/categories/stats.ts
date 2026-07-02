import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';
import categoryAdapter from '@/server/sequelize/adapters/inventory-category-adapter';

const apiLogger = logger.child({ service: 'category-stats-api' });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Get tenant ID from session
    const tenantId = (session?.user as any)?.tenantId || 'default';
    
    // Setup timeout protection
    const TIMEOUT_MS = 5000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );
    
    apiLogger.info('Fetching category stats', { tenantId });
    
    // Use the adapter with timeout protection
    const statsPromise = categoryAdapter.getCategoryStats(tenantId);
    const result = await Promise.race([statsPromise, timeoutPromise]) as any;
    
    if (!result.success) {
      apiLogger.warn('Failed to fetch category stats', { error: result.error });
      return res.status(500).json({ 
        success: false, 
        message: result.error || 'Failed to fetch category stats',
        meta: { isMock: result.isMock || false }
      });
    }
    
    apiLogger.info('Category stats fetched successfully', { isMock: result.isMock });
    
    res.status(200).json({
      success: true,
      data: {
        total: result.total,
        active: result.active,
        inactive: result.total - result.active
      },
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error fetching category stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch category stats',
      meta: { isMock: false }
    });
  }
}
