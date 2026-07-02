/**
 * Mock data for inventory racks
 * Used as fallback when database operations fail
 */

import { v4 as uuidv4 } from 'uuid';

export function createMockRacks(tenantId: string, count: number) {
  const racks = [];
  for (let i = 0; i < count; i++) {
    racks.push({
      id: `mock-rack-${uuidv4().slice(0, 8)}`,
      code: `RACK-${String(i + 1).padStart(3, '0')}`,
      name: `Mock Rack ${i + 1}`,
      warehouseId: 'warehouse-1',
      tenantId,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  return racks;
}
