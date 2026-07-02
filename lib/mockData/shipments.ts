/**
 * Mock Data for Shipping System
 * Used for development and testing before database migration
 */

export interface MockShipment {
  id: string;
  requisitionId: string;
  shipmentNumber: string;
  trackingNumber: string | null;
  carrier: string;
  driverName: string | null;
  driverPhone: string | null;
  vehicleNumber: string | null;
  shippedFromBranch: {
    id: string;
    code: string;
    name: string;
  };
  shippedToBranch: {
    id: string;
    code: string;
    name: string;
  };
  shippedBy: string | null;
  shippedAt: string | null;
  estimatedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  deliveryInstructions: string | null;
  totalPackages: number;
  totalWeight: number;
  totalVolume: number;
  shippingCost: number;
  insuranceCost: number;
  status: string;
  packingListUrl: string | null;
  deliveryNoteUrl: string | null;
  shippingLabelUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockTrackingUpdate {
  id: string;
  shipmentId: string;
  status: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  updatedBy: string | null;
  createdAt: string;
}

export const mockShipments: MockShipment[] = [
  {
    id: 'ship-001',
    requisitionId: '1',
    shipmentNumber: 'SH-BR002-2602-0001',
    trackingNumber: 'JNE123456789',
    carrier: 'JNE',
    driverName: 'Budi Santoso',
    driverPhone: '0812-3456-7890',
    vehicleNumber: 'B 1234 XYZ',
    shippedFromBranch: {
      id: '6',
      code: 'WH-001',
      name: 'Gudang Pusat Cikarang'
    },
    shippedToBranch: {
      id: '2',
      code: 'BR-002',
      name: 'Cabang Bandung'
    },
    shippedBy: 'Admin Warehouse',
    shippedAt: '2026-02-25T10:00:00Z',
    estimatedDeliveryDate: '2026-02-26',
    actualDeliveryDate: null,
    deliveryInstructions: 'Deliver to loading dock. Call 30 mins before arrival.',
    totalPackages: 3,
    totalWeight: 45.5,
    totalVolume: 2.3,
    shippingCost: 150000,
    insuranceCost: 25000,
    status: 'in_transit',
    packingListUrl: '/documents/packing-list-001.pdf',
    deliveryNoteUrl: '/documents/delivery-note-001.pdf',
    shippingLabelUrl: '/documents/shipping-label-001.pdf',
    notes: 'Fragile items - handle with care',
    createdAt: '2026-02-25T09:00:00Z',
    updatedAt: '2026-02-25T10:00:00Z'
  },
  {
    id: 'ship-002',
    requisitionId: '2',
    shipmentNumber: 'SH-BR003-2602-0002',
    trackingNumber: 'INT456789',
    carrier: 'internal',
    driverName: 'Ahmad Hidayat',
    driverPhone: '0813-9876-5432',
    vehicleNumber: 'B 5678 ABC',
    shippedFromBranch: {
      id: '6',
      code: 'WH-001',
      name: 'Gudang Pusat Cikarang'
    },
    shippedToBranch: {
      id: '3',
      code: 'BR-003',
      name: 'Cabang Surabaya'
    },
    shippedBy: 'Admin Warehouse',
    shippedAt: '2026-02-25T08:00:00Z',
    estimatedDeliveryDate: '2026-02-26',
    actualDeliveryDate: null,
    deliveryInstructions: 'Contact branch manager upon arrival',
    totalPackages: 2,
    totalWeight: 32.0,
    totalVolume: 1.5,
    shippingCost: 200000,
    insuranceCost: 30000,
    status: 'out_for_delivery',
    packingListUrl: '/documents/packing-list-002.pdf',
    deliveryNoteUrl: '/documents/delivery-note-002.pdf',
    shippingLabelUrl: '/documents/shipping-label-002.pdf',
    notes: null,
    createdAt: '2026-02-25T07:00:00Z',
    updatedAt: '2026-02-25T14:00:00Z'
  }
];

export const mockTrackingUpdates: Record<string, MockTrackingUpdate[]> = {
  'ship-001': [
    {
      id: 'track-001-1',
      shipmentId: 'ship-001',
      status: 'picked_up',
      location: 'Gudang Pusat Cikarang',
      latitude: -6.2608,
      longitude: 107.1528,
      description: 'Package picked up from warehouse',
      updatedBy: 'Admin Warehouse',
      createdAt: '2026-02-25T10:00:00Z'
    },
    {
      id: 'track-001-2',
      shipmentId: 'ship-001',
      status: 'in_transit',
      location: 'Bekasi Sorting Facility',
      latitude: -6.2383,
      longitude: 106.9756,
      description: 'In transit to sorting facility',
      updatedBy: 'System',
      createdAt: '2026-02-25T14:30:00Z'
    },
    {
      id: 'track-001-3',
      shipmentId: 'ship-001',
      status: 'in_transit',
      location: 'Bandung Hub',
      latitude: -6.9175,
      longitude: 107.6191,
      description: 'Arrived at Bandung sorting hub',
      updatedBy: 'System',
      createdAt: '2026-02-25T18:00:00Z'
    }
  ],
  'ship-002': [
    {
      id: 'track-002-1',
      shipmentId: 'ship-002',
      status: 'picked_up',
      location: 'Gudang Pusat Cikarang',
      latitude: -6.2608,
      longitude: 107.1528,
      description: 'Package picked up from warehouse',
      updatedBy: 'Admin Warehouse',
      createdAt: '2026-02-25T08:00:00Z'
    },
    {
      id: 'track-002-2',
      shipmentId: 'ship-002',
      status: 'in_transit',
      location: 'Surabaya Hub',
      latitude: -7.2575,
      longitude: 112.7521,
      description: 'Arrived at Surabaya hub',
      updatedBy: 'System',
      createdAt: '2026-02-25T12:00:00Z'
    },
    {
      id: 'track-002-3',
      shipmentId: 'ship-002',
      status: 'out_for_delivery',
      location: 'Surabaya - On delivery vehicle',
      latitude: -7.2575,
      longitude: 112.7521,
      description: 'Out for delivery to Cabang Surabaya',
      updatedBy: 'Driver',
      createdAt: '2026-02-25T14:00:00Z'
    }
  ]
};

export function getMockShipmentById(id: string): MockShipment | null {
  return mockShipments.find(s => s.id === id) || null;
}

export function getMockShipmentByRequisitionId(requisitionId: string): MockShipment | null {
  return mockShipments.find(s => s.requisitionId === requisitionId) || null;
}

export function getMockTrackingUpdates(shipmentId: string): MockTrackingUpdate[] {
  return mockTrackingUpdates[shipmentId] || [];
}

export function createMockShipment(data: Partial<MockShipment>): MockShipment {
  const newShipment: MockShipment = {
    id: `ship-${Date.now()}`,
    requisitionId: data.requisitionId || '',
    shipmentNumber: `SH-${Date.now()}`,
    trackingNumber: data.trackingNumber || null,
    carrier: data.carrier || 'internal',
    driverName: data.driverName || null,
    driverPhone: data.driverPhone || null,
    vehicleNumber: data.vehicleNumber || null,
    shippedFromBranch: data.shippedFromBranch || { id: '', code: '', name: '' },
    shippedToBranch: data.shippedToBranch || { id: '', code: '', name: '' },
    shippedBy: data.shippedBy || null,
    shippedAt: data.shippedAt || null,
    estimatedDeliveryDate: data.estimatedDeliveryDate || null,
    actualDeliveryDate: null,
    deliveryInstructions: data.deliveryInstructions || null,
    totalPackages: data.totalPackages || 1,
    totalWeight: data.totalWeight || 0,
    totalVolume: data.totalVolume || 0,
    shippingCost: data.shippingCost || 0,
    insuranceCost: data.insuranceCost || 0,
    status: 'pending',
    packingListUrl: null,
    deliveryNoteUrl: null,
    shippingLabelUrl: null,
    notes: data.notes || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockShipments.push(newShipment);
  return newShipment;
}

export function addMockTrackingUpdate(shipmentId: string, update: Partial<MockTrackingUpdate>): MockTrackingUpdate {
  const newUpdate: MockTrackingUpdate = {
    id: `track-${Date.now()}`,
    shipmentId,
    status: update.status || 'in_transit',
    location: update.location || '',
    latitude: update.latitude || null,
    longitude: update.longitude || null,
    description: update.description || '',
    updatedBy: update.updatedBy || null,
    createdAt: new Date().toISOString()
  };

  if (!mockTrackingUpdates[shipmentId]) {
    mockTrackingUpdates[shipmentId] = [];
  }
  mockTrackingUpdates[shipmentId].push(newUpdate);

  // Update shipment status
  const shipment = getMockShipmentById(shipmentId);
  if (shipment) {
    shipment.status = newUpdate.status;
    shipment.updatedAt = new Date().toISOString();
  }

  return newUpdate;
}
