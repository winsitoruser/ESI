import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';
import { rackAdapter } from '@/server/sequelize/adapters';

const apiLogger = logger.child({ service: 'rack-by-id-api' });

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
      return res.status(400).json({ success: false, message: 'Rack ID is required' });
    }

    if (req.method === 'GET') {
      await handleGetRack(id, req, res, tenantId, timeoutPromise);
    } else if (req.method === 'PUT') {
      await handleUpdateRack(id, req, res, tenantId, timeoutPromise);
    } else if (req.method === 'DELETE') {
      await handleDeleteRack(id, req, res, tenantId, timeoutPromise);
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    apiLogger.error('API Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function handleGetRack(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  apiLogger.info('Getting rack by ID', { id, tenantId });

  try {
    // Use the adapter with timeout protection
    const getRackPromise = rackAdapter.getRackById(id, tenantId);
    
    const result = await Promise.race([getRackPromise, timeoutPromise]) as any;
    
    if (!result.rack) {
      return res.status(404).json({ success: false, message: 'Rack not found' });
    }
    
    apiLogger.info('Retrieved rack', { id, isMock: result.isMock });
    
    res.status(200).json({
      success: true,
      data: result.rack,
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error fetching rack:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rack' });
  }
}

async function handleUpdateRack(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  const { code, name, warehouseId, floor, capacity, isActive } = req.body;

  // Basic validation
  if (!code || !name || !warehouseId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Code, name and warehouse ID are required fields' 
    });
  }

  apiLogger.info('Updating rack', { id, tenantId });

  try {
    // Use the adapter with timeout protection
    const updateRackPromise = rackAdapter.updateRack(id, {
      code,
      name,
      warehouseId,
      floor: floor !== undefined ? parseInt(floor) : undefined,
      capacity: capacity !== undefined ? parseInt(capacity) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined
    }, tenantId);
    
    const result = await Promise.race([updateRackPromise, timeoutPromise]) as any;
    
    if (!result.success) {
      apiLogger.warn('Failed to update rack', { error: result.error });
      return res.status(409).json({
        success: false,
        message: result.error || 'Failed to update rack'
      });
    }
    
    apiLogger.info('Rack updated successfully', { id, isMock: result.isMock });
    
    res.status(200).json({
      success: true,
      data: result.rack,
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error updating rack:', error);
    res.status(500).json({ success: false, message: 'Failed to update rack' });
  }
}

async function handleDeleteRack(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  apiLogger.info('Deleting rack', { id, tenantId });

  try {
    // Use the adapter with timeout protection
    const deleteRackPromise = rackAdapter.deleteRack(id, tenantId);
    
    const result = await Promise.race([deleteRackPromise, timeoutPromise]) as any;
    
    if (!result.success) {
      apiLogger.warn('Failed to delete rack', { error: result.error });
      return res.status(409).json({
        success: false,
        message: result.error || 'Failed to delete rack'
      });
    }
    
    apiLogger.info('Rack deleted successfully', { id, isMock: result.isMock });
    
    res.status(200).json({
      success: true,
      data: { id },
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error deleting rack:', error);
    res.status(500).json({ success: false, message: 'Failed to delete rack' });
  }
}
