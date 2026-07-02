/**
 * Mock Inventory Racks Data
 */

export const mockRacks = [
  {
    id: '1',
    code: 'R-A1',
    name: 'Rack A1',
    warehouseId: 'WH-001',
    capacity: 100,
    currentLoad: 75,
    isActive: true
  },
  {
    id: '2',
    code: 'R-A2',
    name: 'Rack A2',
    warehouseId: 'WH-001',
    capacity: 100,
    currentLoad: 50,
    isActive: true
  },
  {
    id: '3',
    code: 'R-B1',
    name: 'Rack B1',
    warehouseId: 'WH-001',
    capacity: 150,
    currentLoad: 120,
    isActive: true
  }
];

export default mockRacks;
