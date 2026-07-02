import { prisma } from '../prisma';
import { Rack } from '@prisma/client';

interface RackData {
  id?: string;
  code: string;
  name: string;
  warehouseId: string;
  floor?: number;
  capacity?: number;
  description?: string;
  isActive?: boolean;
  tenantId: string;
}

export const rackAdapter = {
  /**
   * Get all racks for a tenant
   */
  getAll: async (tenantId: string) => {
    return await prisma.rack.findMany({
      where: {
        tenantId
      },
      include: {
        warehouse: true
      }
    });
  },

  /**
   * Get a rack by ID
   */
  getById: async (id: string, tenantId: string) => {
    return await prisma.rack.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        warehouse: true
      }
    });
  },

  /**
   * Create a new rack
   */
  create: async (data: RackData) => {
    return await prisma.rack.create({
      data: {
        code: data.code,
        name: data.name,
        warehouseId: data.warehouseId,
        floor: data.floor || 1,
        capacity: data.capacity,
        description: data.description,
        isActive: data.isActive !== false,
        tenantId: data.tenantId
      }
    });
  },

  /**
   * Create multiple racks in a batch
   */
  createBatch: async (racks: RackData[]) => {
    return await prisma.$transaction(
      racks.map(rack => 
        prisma.rack.create({
          data: {
            code: rack.code,
            name: rack.name,
            warehouseId: rack.warehouseId,
            floor: rack.floor || 1,
            capacity: rack.capacity,
            description: rack.description,
            isActive: rack.isActive !== false,
            tenantId: rack.tenantId
          }
        })
      )
    );
  },

  /**
   * Update a rack
   */
  update: async (id: string, data: Partial<RackData>, tenantId: string) => {
    return await prisma.rack.updateMany({
      where: {
        id,
        tenantId
      },
      data: {
        code: data.code,
        name: data.name,
        warehouseId: data.warehouseId,
        floor: data.floor,
        capacity: data.capacity,
        description: data.description,
        isActive: data.isActive
      }
    }).then(async () => {
      return await prisma.rack.findFirst({
        where: { id, tenantId },
        include: { warehouse: true }
      });
    });
  },

  /**
   * Delete a rack
   */
  delete: async (id: string, tenantId: string) => {
    const rack = await prisma.rack.findFirst({
      where: { id, tenantId }
    });

    if (!rack) {
      return null;
    }

    return await prisma.rack.delete({
      where: { id }
    });
  },

  /**
   * Delete multiple racks in a batch
   */
  deleteBatch: async (ids: string[], tenantId: string) => {
    // First verify that all racks belong to the tenant
    const racks = await prisma.rack.findMany({
      where: {
        id: { in: ids },
        tenantId
      },
      select: { id: true }
    });

    const foundIds = racks.map(rack => rack.id);

    // Only delete racks that belong to the tenant
    const result = await prisma.rack.deleteMany({
      where: {
        id: { in: foundIds }
      }
    });

    return { count: result.count };
  },

  /**
   * Get racks by warehouse ID
   */
  getByWarehouseId: async (warehouseId: string, tenantId: string) => {
    return await prisma.rack.findMany({
      where: {
        warehouseId,
        tenantId
      }
    });
  }
};
