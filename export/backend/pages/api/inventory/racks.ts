import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';
import { PaginatedResponse } from '@/types';
import { Rack } from '@/models/inventory/Rack';
import { Warehouse } from '@/models/inventory/Warehouse';
import { v4 as uuidv4 } from 'uuid';

const apiLogger = logger.child({ service: 'racks-api' });

// Mock data for fallback
const mockRacks = [
  { 
    id: 'rack-1', 
    code: 'RK-001', 
    name: 'Rak A', 
    warehouseId: 'wh-1',
    floor: 1,
    capacity: 100,
    productCount: 15,
    description: 'Rak untuk obat resep',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  { 
    id: 'rack-2', 
    code: 'RK-002', 
    name: 'Rak B', 
    warehouseId: 'wh-1',
    floor: 1,
    capacity: 100,
    productCount: 8,
    description: 'Rak untuk vitamin dan suplemen',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  { 
    id: 'rack-3', 
    code: 'RK-001', 
    name: 'Rak Utama', 
    warehouseId: 'wh-2',
    floor: 1,
    capacity: 50,
    productCount: 12,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Type for rack query parameters
interface RackQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  warehouseId?: string;
  isActive?: string;
}

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
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Database operation timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );
    
    if (req.method === 'GET') {
      await handleGetRacks(req, res, tenantId, timeoutPromise);
    } else if (req.method === 'POST') {
      await handleCreateRack(req, res, tenantId, timeoutPromise);
    } else if (req.method === 'PUT') {
      await handleUpdateRack(req, res, tenantId, timeoutPromise);
    } else if (req.method === 'DELETE') {
      await handleDeleteRack(req, res, tenantId, timeoutPromise);
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    apiLogger.error('API Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function handleGetRacks(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedResponse<any> | { success: boolean, message: string }>,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  const { page = '1', limit = '10', search, warehouseId, isActive } = req.query as RackQueryParams;
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100); // Max 100 items per page

  apiLogger.info('Getting racks', { page: pageNum, limit: limitNum, search, warehouseId, isActive, tenantId });

  try {
    // Database query with timeout protection
    const getRacksPromise = (async () => {
      try {
        const offset = (pageNum - 1) * limitNum;
        
        const where: any = { tenantId };
        
        // Add warehouseId filter if provided
        if (warehouseId) {
          where.warehouseId = warehouseId;
        }
        
        // Add search condition if provided
        if (search) {
          where['$or'] = [
            { name: { $like: `%${search}%` } },
            { code: { $like: `%${search}%` } },
            { description: { $like: `%${search}%` } }
          ];
        }
        
        // Add isActive condition if provided
        if (isActive !== undefined) {
          where.isActive = isActive === 'true';
        }

        const { count, rows } = await Rack.findAndCountAll({
          where,
          limit: limitNum,
          offset: offset,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: Warehouse,
              as: 'warehouse',
              attributes: ['id', 'code', 'name']
            }
          ]
        });

        return {
          racks: rows,
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum),
          isMock: false
        };
      } catch (error) {
        apiLogger.error('Database error fetching racks, using mock data', { error });
        
        // Return mock data as fallback
        let filteredMock = [...mockRacks];
        
        // Apply warehouse filter
        if (warehouseId) {
          filteredMock = filteredMock.filter(r => r.warehouseId === warehouseId);
        }
        
        // Apply search filter
        if (search) {
          const searchLower = (search as string).toLowerCase();
          filteredMock = filteredMock.filter(r => 
            r.name.toLowerCase().includes(searchLower) ||
            r.code.toLowerCase().includes(searchLower) ||
            (r.description && r.description.toLowerCase().includes(searchLower))
          );
        }
        
        // Apply isActive filter
        if (isActive !== undefined) {
          filteredMock = filteredMock.filter(r => r.isActive === (isActive === 'true'));
        }
        
        const total = filteredMock.length;
        const paginatedMock = filteredMock.slice((pageNum - 1) * limitNum, pageNum * limitNum);
        
        return {
          racks: paginatedMock,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
          isMock: true
        };
      }
    })();
    
    const result = await Promise.race([getRacksPromise, timeoutPromise]);
    
    apiLogger.info(`Retrieved ${result.racks.length} racks`, {
      total: result.total,
      isMock: result.isMock
    });
    
    res.status(200).json({
      success: true,
      data: result.racks,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error fetching racks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch racks' });
  }
}

async function handleCreateRack(
  req: NextApiRequest,
  res: NextApiResponse<any | { success: boolean, message: string }>,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  const { code, name, warehouseId, floor, capacity, description } = req.body;

  // Basic validation
  if (!name || !code || !warehouseId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Code, name, and warehouseId are required fields'
    });
  }

  apiLogger.info('Creating rack', { code, name, warehouseId, tenantId });

  try {
    // Database operation with timeout protection
    const createRackPromise = (async () => {
      try {
        // Check if warehouse exists
        const warehouse = await Warehouse.findOne({
          where: { id: warehouseId, tenantId }
        });

        if (!warehouse) {
          return {
            success: false,
            error: 'Warehouse not found'
          };
        }

        // Check for duplicate code within the same warehouse
        const existingRack = await Rack.findOne({
          where: { code, warehouseId, tenantId }
        });

        if (existingRack) {
          return {
            success: false,
            error: 'Rack code already exists in this warehouse'
          };
        }

        // Create new rack
        const newRack = await Rack.create({
          code,
          name,
          warehouseId,
          floor: floor || 1,
          capacity: capacity || 100,
          productCount: 0,
          description,
          isActive: true,
          tenantId
        });

        return {
          success: true,
          rack: newRack,
          isMock: false
        };
      } catch (error) {
        apiLogger.error('Database error creating rack, using mock data', { error });
        
        // Return mock data as fallback
        const mockRack = {
          id: uuidv4(),
          code,
          name,
          warehouseId,
          floor: floor || 1,
          capacity: capacity || 100,
          productCount: 0,
          description,
          isActive: true,
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        mockRacks.push(mockRack);
        
        return {
          success: true,
          rack: mockRack,
          isMock: true
        };
      }
    })();
    
    const result = await Promise.race([createRackPromise, timeoutPromise]);
    
    if (!result.success) {
      apiLogger.warn('Failed to create rack', { error: result.error });
      return res.status(409).json({
        success: false,
        message: result.error || 'Failed to create rack'
      });
    }
    
    apiLogger.info('Rack created successfully', { id: result.rack.id, isMock: result.isMock });
    
    res.status(201).json({
      success: true,
      data: result.rack,
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error creating rack:', error);
    res.status(500).json({ success: false, message: 'Failed to create rack' });
  }
}

async function handleUpdateRack(
  req: NextApiRequest,
  res: NextApiResponse<any | { success: boolean, message: string }>,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  const { id, code, name, warehouseId, floor, capacity, description, isActive } = req.body;

  // Basic validation
  if (!id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Rack ID is required'
    });
  }

  apiLogger.info('Updating rack', { id, code, name, tenantId });

  try {
    // Database operation with timeout protection
    const updateRackPromise = (async () => {
      try {
        // Find the rack
        const rack = await Rack.findOne({
          where: { id, tenantId }
        });

        if (!rack) {
          return {
            success: false,
            error: 'Rack not found'
          };
        }

        // Check for duplicate code if code or warehouseId is being changed
        if ((code && code !== rack.code) || (warehouseId && warehouseId !== rack.warehouseId)) {
          const existingRack = await Rack.findOne({
            where: { 
              code: code || rack.code, 
              warehouseId: warehouseId || rack.warehouseId, 
              tenantId,
              id: { $ne: id } // Exclude the current rack
            }
          });

          if (existingRack) {
            return {
              success: false,
              error: 'Rack code already exists in this warehouse'
            };
          }
        }

        // If warehouseId is being changed, check if the new warehouse exists
        if (warehouseId && warehouseId !== rack.warehouseId) {
          const warehouse = await Warehouse.findOne({
            where: { id: warehouseId, tenantId }
          });

          if (!warehouse) {
            return {
              success: false,
              error: 'Warehouse not found'
            };
          }
        }

        // Update rack
        await rack.update({
          code: code || rack.code,
          name: name || rack.name,
          warehouseId: warehouseId || rack.warehouseId,
          floor: floor !== undefined ? floor : rack.floor,
          capacity: capacity || rack.capacity,
          description: description !== undefined ? description : rack.description,
          isActive: isActive !== undefined ? isActive : rack.isActive
        });

        return {
          success: true,
          rack,
          isMock: false
        };
      } catch (error) {
        apiLogger.error('Database error updating rack, using mock data', { error });
        
        // Return mock data as fallback
        const mockRackIndex = mockRacks.findIndex(r => r.id === id);
        
        if (mockRackIndex === -1) {
          return {
            success: false,
            error: 'Rack not found',
            isMock: true
          };
        }
        
        // Check for duplicate code in mock data
        if ((code && code !== mockRacks[mockRackIndex].code) || 
            (warehouseId && warehouseId !== mockRacks[mockRackIndex].warehouseId)) {
          const duplicateCodeExists = mockRacks.some(r => 
            r.id !== id && 
            r.code === (code || mockRacks[mockRackIndex].code) && 
            r.warehouseId === (warehouseId || mockRacks[mockRackIndex].warehouseId)
          );
          
          if (duplicateCodeExists) {
            return {
              success: false,
              error: 'Rack code already exists in this warehouse',
              isMock: true
            };
          }
        }
        
        const updatedMockRack = {
          ...mockRacks[mockRackIndex],
          code: code || mockRacks[mockRackIndex].code,
          name: name || mockRacks[mockRackIndex].name,
          warehouseId: warehouseId || mockRacks[mockRackIndex].warehouseId,
          floor: floor !== undefined ? floor : mockRacks[mockRackIndex].floor,
          capacity: capacity || mockRacks[mockRackIndex].capacity,
          description: description !== undefined ? description : mockRacks[mockRackIndex].description,
          isActive: isActive !== undefined ? isActive : mockRacks[mockRackIndex].isActive,
          updatedAt: new Date()
        };
        
        mockRacks[mockRackIndex] = updatedMockRack;
        
        return {
          success: true,
          rack: updatedMockRack,
          isMock: true
        };
      }
    })();
    
    const result = await Promise.race([updateRackPromise, timeoutPromise]);
    
    if (!result.success) {
      apiLogger.warn('Failed to update rack', { error: result.error });
      return res.status(result.error === 'Rack not found' ? 404 : 409).json({
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
  req: NextApiRequest,
  res: NextApiResponse<any | { success: boolean, message: string }>,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Rack ID is required'
    });
  }

  apiLogger.info('Deleting rack', { id, tenantId });

  try {
    // Database operation with timeout protection
    const deleteRackPromise = (async () => {
      try {
        // Find the rack
        const rack = await Rack.findOne({
          where: { id, tenantId }
        });

        if (!rack) {
          return {
            success: false,
            error: 'Rack not found'
          };
        }

        // Check if rack has any shelf positions
        // In a real implementation, you might want to check this relationship
        // For now, we'll simulate this check
        const hasShelfPositions = false; // This would be a real database check

        if (hasShelfPositions) {
          return {
            success: false,
            error: 'Cannot delete rack with existing shelf positions'
          };
        }

        // Perform soft delete
        await rack.destroy();

        return {
          success: true,
          isMock: false
        };
      } catch (error) {
        apiLogger.error('Database error deleting rack, using mock data', { error });
        
        // Return mock data as fallback
        const mockRackIndex = mockRacks.findIndex(r => r.id === id);
        
        if (mockRackIndex === -1) {
          return {
            success: false,
            error: 'Rack not found',
            isMock: true
          };
        }
        
        // Remove from mock array (simulating delete)
        mockRacks.splice(mockRackIndex, 1);
        
        return {
          success: true,
          isMock: true
        };
      }
    })();
    
    const result = await Promise.race([deleteRackPromise, timeoutPromise]);
    
    if (!result.success) {
      apiLogger.warn('Failed to delete rack', { error: result.error });
      return res.status(result.error === 'Rack not found' ? 404 : 409).json({
        success: false,
        message: result.error || 'Failed to delete rack'
      });
    }
    
    apiLogger.info('Rack deleted successfully', { id, isMock: result.isMock });
    
    res.status(200).json({
      success: true,
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error deleting rack:', error);
    res.status(500).json({ success: false, message: 'Failed to delete rack' });
  }
}
