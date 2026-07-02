/**
 * Rack Model
 * Placeholder for warehouse rack/shelf management
 */

export interface Rack {
  id: string;
  code: string;
  name: string;
  warehouseId?: string;
  capacity?: number;
  currentLoad?: number;
  isActive: boolean;
}

export default Rack;
