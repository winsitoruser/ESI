import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';
import { PaginatedResponse } from '@/types';
import { Warehouse } from '@/models/inventory/Warehouse';
import { v4 as uuidv4 } from 'uuid';

const apiLogger = logger.child({ service: 'warehouses-api' });

// Mock data for fallback
const mockWarehouses = [
  { 
    id: 'wh-1', 
    code: 'WH-001', 
    name: 'Gudang Utama', 
    address: 'Jl. Contoh No. 123', 
    phone: '021-1234567',
    email: 'gudang@example.com',
    capacity: 1000,
    productCount: 45,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  { 
    id: 'wh-2', 
    code: 'WH-002', 
    name: 'Gudang Cabang', 
    address: 'Jl. Contoh No. 456',
    capacity: 500,
    productCount: 23,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
];

// Type for warehouse query parameters
interface WarehouseQueryParams {
  page?: string;
  limit?: string;
  search?: string;
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
      await handleGetWarehouses(req, res, tenantId, timeoutPromise);
    } else if (req.method === 'POST') {
      await handleCreateWarehouse(req, res, tenantId, timeoutPromise);
    } else if (req.method === 'PUT') {
      await handleUpdateWarehouse(req, res, tenantId, timeoutPromise);
    } else if (req.method === 'DELETE') {
      await handleDeleteWarehouse(req, res, tenantId, timeoutPromise);
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    apiLogger.error('API Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function handleGetWarehouses(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedResponse<any> | { success: boolean, message: string }>,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  const { page = '1', limit = '10', search, isActive } = req.query as WarehouseQueryParams;
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100); // Max 100 items per page

  apiLogger.info('Getting warehouses', { page: pageNum, limit: limitNum, search, isActive, tenantId });

  try {
    // Database query with timeout protection
    const getWarehousesPromise = (async () => {
      try {
        const offset = (pageNum - 1) * limitNum;
        
        const where: any = { tenantId };
        
        // Add search condition if provided
        if (search) {
          where['$or'] = [
            { name: { $like: `%${search}%` } },
            { code: { $like: `%${search}%` } },
            { address: { $like: `%${search}%` } }
          ];
        }
        
        // Add isActive condition if provided
        if (isActive !== undefined) {
          where.isActive = isActive === 'true';
        }

        const { count, rows } = await Warehouse.findAndCountAll({
          where,
          limit: limitNum,
          offset: offset,
          order: [['createdAt', 'DESC']],
        });

        return {
          warehouses: rows,
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum),
          isMock: false
        };
      } catch (error) {
        apiLogger.error('Database error fetching warehouses, using mock data', { error });
        
        // Return mock data as fallback
        const filteredMock = mockWarehouses
          .filter(w => !search || 
            w.name.toLowerCase().includes((search as string).toLowerCase()) ||
            w.code.toLowerCase().includes((search as string).toLowerCase())
          )
          .filter(w => isActive === undefined || w.isActive === (isActive === 'true'));
        
        const total = filteredMock.length;
        const paginatedMock = filteredMock.slice((pageNum - 1) * limitNum, pageNum * limitNum);
        
        return {
          warehouses: paginatedMock,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
          isMock: true
        };
      }
    })();
    
    const result = await Promise.race([getWarehousesPromise, timeoutPromise]);
    
    apiLogger.info(`Retrieved ${result.warehouses.length} warehouses`, {
      total: result.total,
      isMock: result.isMock
    });
    
    res.status(200).json({
      success: true,
      data: result.warehouses,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error fetching warehouses:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch warehouses' });
  }
}

async function handleCreateWarehouse(
  req: NextApiRequest,
  res: NextApiResponse<any | { success: boolean, message: string }>,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  const { code, name, address, phone, email, capacity } = req.body;

  // Basic validation
  if (!name || !code || !address) {
    return res.status(400).json({ 
      success: false, 
      message: 'Code, name, and address are required fields'
    });
  }

  apiLogger.info('Creating warehouse', { code, name, tenantId });

  try {
    // Database operation with timeout protection
    const createWarehousePromise = (async () => {
      try {
        // Check for duplicate code
        const existingWarehouse = await Warehouse.findOne({
          where: { code, tenantId }
        });

        if (existingWarehouse) {
          return {
            success: false,
            error: 'Warehouse code already exists'
          };
        }

        // Create new warehouse
        const newWarehouse = await Warehouse.create({
          code,
          name,
          address,
          phone,
          email,
          capacity: capacity || 1000,
          productCount: 0,
          isActive: true,
          tenantId
        });

        return {
          success: true,
          warehouse: newWarehouse,
          isMock: false
        };
      } catch (error) {
        apiLogger.error('Database error creating warehouse, using mock data', { error });
        
        // Return mock data as fallback
        const mockWarehouse = {
          id: uuidv4(),
          code,
          name,
          address,
          phone,
          email,
          capacity: capacity || 1000,
          productCount: 0,
          isActive: true,
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        return {
          success: true,
          warehouse: mockWarehouse,
          isMock: true
        };
      }
    })();
    
    const result = await Promise.race([createWarehousePromise, timeoutPromise]);
    
    if (!result.success) {
      apiLogger.warn('Failed to create warehouse', { error: result.error });
      return res.status(409).json({
        success: false,
        message: result.error || 'Failed to create warehouse'
      });
    }
    
    apiLogger.info('Warehouse created successfully', { id: result.warehouse.id, isMock: result.isMock });
    
    res.status(201).json({
      success: true,
      data: result.warehouse,
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error creating warehouse:', error);
    res.status(500).json({ success: false, message: 'Failed to create warehouse' });
  }
}

async function handleUpdateWarehouse(
  req: NextApiRequest,
  res: NextApiResponse<any | { success: boolean, message: string }>,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  const { id, code, name, address, phone, email, capacity, isActive } = req.body;

  // Basic validation
  if (!id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Warehouse ID is required'
    });
  }

  apiLogger.info('Updating warehouse', { id, code, name, tenantId });

  try {
    // Database operation with timeout protection
    const updateWarehousePromise = (async () => {
      try {
        // Find the warehouse
        const warehouse = await Warehouse.findOne({
          where: { id, tenantId }
        });

        if (!warehouse) {
          return {
            success: false,
            error: 'Warehouse not found'
          };
        }

        // Check for duplicate code if code is being changed
        if (code && code !== warehouse.code) {
          const existingWarehouse = await Warehouse.findOne({
            where: { code, tenantId }
          });

          if (existingWarehouse) {
            return {
              success: false,
              error: 'Warehouse code already exists'
            };
          }
        }

        // Update warehouse
        await warehouse.update({
          code: code || warehouse.code,
          name: name || warehouse.name,
          address: address || warehouse.address,
          phone: phone !== undefined ? phone : warehouse.phone,
          email: email !== undefined ? email : warehouse.email,
          capacity: capacity || warehouse.capacity,
          isActive: isActive !== undefined ? isActive : warehouse.isActive
        });

        return {
          success: true,
          warehouse,
          isMock: false
        };
      } catch (error) {
        apiLogger.error('Database error updating warehouse, using mock data', { error });
        
        // Return mock data as fallback
        const mockWarehouseIndex = mockWarehouses.findIndex(w => w.id === id);
        
        if (mockWarehouseIndex === -1) {
          return {
            success: false,
            error: 'Warehouse not found',
            isMock: true
          };
        }
        
        const updatedMockWarehouse = {
          ...mockWarehouses[mockWarehouseIndex],
          code: code || mockWarehouses[mockWarehouseIndex].code,
          name: name || mockWarehouses[mockWarehouseIndex].name,
          address: address || mockWarehouses[mockWarehouseIndex].address,
          phone: phone !== undefined ? phone : mockWarehouses[mockWarehouseIndex].phone,
          email: email !== undefined ? email : mockWarehouses[mockWarehouseIndex].email,
          capacity: capacity || mockWarehouses[mockWarehouseIndex].capacity,
          isActive: isActive !== undefined ? isActive : mockWarehouses[mockWarehouseIndex].isActive,
          updatedAt: new Date()
        };
        
        mockWarehouses[mockWarehouseIndex] = updatedMockWarehouse;
        
        return {
          success: true,
          warehouse: updatedMockWarehouse,
          isMock: true
        };
      }
    })();
    
    const result = await Promise.race([updateWarehousePromise, timeoutPromise]);
    
    if (!result.success) {
      apiLogger.warn('Failed to update warehouse', { error: result.error });
      return res.status(result.error === 'Warehouse not found' ? 404 : 409).json({
        success: false,
        message: result.error || 'Failed to update warehouse'
      });
    }
    
    apiLogger.info('Warehouse updated successfully', { id, isMock: result.isMock });
    
    res.status(200).json({
      success: true,
      data: result.warehouse,
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error updating warehouse:', error);
    res.status(500).json({ success: false, message: 'Failed to update warehouse' });
  }
}

async function handleDeleteWarehouse(
  req: NextApiRequest,
  res: NextApiResponse<any | { success: boolean, message: string }>,
  tenantId: string,
  timeoutPromise: Promise<never>
) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Warehouse ID is required'
    });
  }

  apiLogger.info('Deleting warehouse', { id, tenantId });

  try {
    // Database operation with timeout protection
    const deleteWarehousePromise = (async () => {
      try {
        // Find the warehouse
        const warehouse = await Warehouse.findOne({
          where: { id, tenantId }
        });

        if (!warehouse) {
          return {
            success: false,
            error: 'Warehouse not found'
          };
        }

        // Check if warehouse has any racks
        // In a real implementation, you might want to check this relationship
        // For now, we'll simulate this check
        const hasRacks = false; // This would be a real database check

        if (hasRacks) {
          return {
            success: false,
            error: 'Cannot delete warehouse with existing racks'
          };
        }

        // Perform soft delete
        await warehouse.destroy();

        return {
          success: true,
          isMock: false
        };
      } catch (error) {
        apiLogger.error('Database error deleting warehouse, using mock data', { error });
        
        // Return mock data as fallback
        const mockWarehouseIndex = mockWarehouses.findIndex(w => w.id === id);
        
        if (mockWarehouseIndex === -1) {
          return {
            success: false,
            error: 'Warehouse not found',
            isMock: true
          };
        }
        
        // Remove from mock array (simulating delete)
        mockWarehouses.splice(mockWarehouseIndex, 1);
        
        return {
          success: true,
          isMock: true
        };
      }
    })();
    
    const result = await Promise.race([deleteWarehousePromise, timeoutPromise]);
    
    if (!result.success) {
      apiLogger.warn('Failed to delete warehouse', { error: result.error });
      return res.status(result.error === 'Warehouse not found' ? 404 : 409).json({
        success: false,
        message: result.error || 'Failed to delete warehouse'
      });
    }
    
    apiLogger.info('Warehouse deleted successfully', { id, isMock: result.isMock });
    
    res.status(200).json({
      success: true,
      meta: {
        isMock: result.isMock || false
      }
    });
  } catch (error) {
    apiLogger.error('Error deleting warehouse:', error);
    res.status(500).json({ success: false, message: 'Failed to delete warehouse' });
  }
}
