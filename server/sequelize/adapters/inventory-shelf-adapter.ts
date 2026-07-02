/**
 * Shelf Position Adapter
 * Provides CRUD operations for warehouse shelf positions with mock fallback
 */

import { v4 as uuidv4 } from 'uuid';

interface ShelfPositionData {
  code: string;
  name: string;
  rackId?: string;
  capacity?: number;
  isActive?: boolean;
  tenantId: string;
}

const mockShelfPositions: any[] = [];

export const shelfPositionAdapter = {
  async getShelfPositionById(id: string, tenantId: string) {
    const shelf = mockShelfPositions.find(s => s.id === id && s.tenantId === tenantId);
    if (shelf) {
      return { shelf, isMock: true };
    }
    const mockShelf = {
      id,
      code: `SHELF-${id.slice(0, 4).toUpperCase()}`,
      name: `Shelf Position ${id.slice(0, 8)}`,
      rackId: 'rack-1',
      tenantId,
      capacity: 50,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return { shelf: mockShelf, isMock: true };
  },

  async updateShelfPosition(id: string, data: Partial<ShelfPositionData>, tenantId: string) {
    const index = mockShelfPositions.findIndex(s => s.id === id && s.tenantId === tenantId);
    if (index !== -1) {
      mockShelfPositions[index] = { ...mockShelfPositions[index], ...data, updatedAt: new Date().toISOString() };
      return { success: true, shelf: mockShelfPositions[index], isMock: true };
    }
    return {
      success: false,
      error: 'Shelf position not found',
      isMock: true
    };
  },

  async deleteShelfPosition(id: string, tenantId: string) {
    const index = mockShelfPositions.findIndex(s => s.id === id && s.tenantId === tenantId);
    if (index !== -1) {
      mockShelfPositions.splice(index, 1);
      return { success: true, isMock: true };
    }
    return { success: true, isMock: true };
  }
};

export default shelfPositionAdapter;
