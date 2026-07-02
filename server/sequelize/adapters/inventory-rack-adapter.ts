/**
 * Rack Adapter (Server)
 * Provides CRUD operations for racks with mock fallback
 */

import { v4 as uuidv4 } from 'uuid';

interface RackData {
  code: string;
  name: string;
  warehouseId: string;
  floor?: number;
  capacity?: number;
  isActive?: boolean;
  tenantId: string;
}

const mockRacks: any[] = [];

export const rackAdapter = {
  async getRackById(id: string, tenantId: string) {
    const rack = mockRacks.find(r => r.id === id && r.tenantId === tenantId);
    if (rack) {
      return { rack, isMock: true };
    }
    const mockRack = {
      id,
      code: `RACK-${id.slice(0, 4).toUpperCase()}`,
      name: `Rack ${id.slice(0, 8)}`,
      warehouseId: 'warehouse-1',
      tenantId,
      floor: 1,
      capacity: 100,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return { rack: mockRack, isMock: true };
  },

  async updateRack(id: string, data: Partial<RackData>, tenantId: string) {
    const index = mockRacks.findIndex(r => r.id === id && r.tenantId === tenantId);
    if (index !== -1) {
      mockRacks[index] = { ...mockRacks[index], ...data, updatedAt: new Date().toISOString() };
      return { success: true, rack: mockRacks[index], isMock: true };
    }
    return { success: false, error: 'Rack not found', isMock: true };
  },

  async deleteRack(id: string, tenantId: string) {
    const index = mockRacks.findIndex(r => r.id === id && r.tenantId === tenantId);
    if (index !== -1) {
      mockRacks.splice(index, 1);
      return { success: true, isMock: true };
    }
    return { success: true, isMock: true };
  }
};

export default rackAdapter;
