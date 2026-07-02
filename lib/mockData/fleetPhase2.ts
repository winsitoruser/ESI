/**
 * Fleet Management Phase 2 Mock Data
 * Route Management, GPS Tracking, Maintenance, Cost Reporting
 */

// ROUTE MANAGEMENT
export interface RouteAssignment {
  id: string;
  routeId: string;
  vehicleId: string;
  driverId: string;
  scheduledDate: string;
  scheduledStartTime: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  totalDistanceKm: number | null;
  fuelConsumedLiters: number | null;
  notes: string | null;
}

export const mockRouteAssignments: RouteAssignment[] = [
  {
    id: 'assign-001',
    routeId: 'route-001',
    vehicleId: 'veh-001',
    driverId: 'drv-001',
    scheduledDate: '2026-02-26',
    scheduledStartTime: '06:00',
    actualStartTime: '2026-02-26T06:05:00Z',
    actualEndTime: '2026-02-26T10:35:00Z',
    status: 'completed',
    totalDistanceKm: 182,
    fuelConsumedLiters: 26,
    notes: 'Completed successfully, minor traffic delay'
  },
  {
    id: 'assign-002',
    routeId: 'route-002',
    vehicleId: 'veh-002',
    driverId: 'drv-002',
    scheduledDate: '2026-02-26',
    scheduledStartTime: '07:00',
    actualStartTime: '2026-02-26T07:00:00Z',
    actualEndTime: null,
    status: 'in_progress',
    totalDistanceKm: null,
    fuelConsumedLiters: null,
    notes: null
  },
  {
    id: 'assign-003',
    routeId: 'route-001',
    vehicleId: 'veh-001',
    driverId: 'drv-001',
    scheduledDate: '2026-02-27',
    scheduledStartTime: '06:00',
    actualStartTime: null,
    actualEndTime: null,
    status: 'scheduled',
    totalDistanceKm: null,
    fuelConsumedLiters: null,
    notes: null
  }
];

// GPS TRACKING
export interface GPSLocation {
  id: string;
  vehicleId: string;
  driverId: string | null;
  latitude: number;
  longitude: number;
  altitude: number;
  speedKmh: number;
  heading: number;
  accuracyMeters: number;
  timestamp: string;
  isMoving: boolean;
  isIdle: boolean;
  idleDurationMinutes: number;
}

export const mockGPSLocations: GPSLocation[] = [
  {
    id: 'gps-001',
    vehicleId: 'veh-001',
    driverId: 'drv-001',
    latitude: -6.2088,
    longitude: 106.8456,
    altitude: 15,
    speedKmh: 65,
    heading: 45,
    accuracyMeters: 5,
    timestamp: '2026-02-26T08:30:00Z',
    isMoving: true,
    isIdle: false,
    idleDurationMinutes: 0
  },
  {
    id: 'gps-002',
    vehicleId: 'veh-002',
    driverId: 'drv-002',
    latitude: -6.9175,
    longitude: 107.6191,
    altitude: 700,
    speedKmh: 0,
    heading: 0,
    accuracyMeters: 3,
    timestamp: '2026-02-26T09:15:00Z',
    isMoving: false,
    isIdle: true,
    idleDurationMinutes: 15
  },
  {
    id: 'gps-003',
    vehicleId: 'veh-004',
    driverId: 'drv-003',
    latitude: -7.2575,
    longitude: 112.7521,
    altitude: 10,
    speedKmh: 45,
    heading: 180,
    accuracyMeters: 4,
    timestamp: '2026-02-26T09:20:00Z',
    isMoving: true,
    isIdle: false,
    idleDurationMinutes: 0
  }
];

// MAINTENANCE SCHEDULES
export interface MaintenanceSchedule {
  id: string;
  vehicleId: string;
  maintenanceType: string;
  intervalType: 'kilometers' | 'months' | 'both';
  intervalKilometers: number | null;
  intervalMonths: number | null;
  lastServiceDate: string | null;
  lastServiceOdometer: number | null;
  nextServiceDate: string | null;
  nextServiceOdometer: number | null;
  status: 'active' | 'completed' | 'overdue';
}

export const mockMaintenanceSchedules: MaintenanceSchedule[] = [
  {
    id: 'sched-001',
    vehicleId: 'veh-001',
    maintenanceType: 'Routine Service',
    intervalType: 'kilometers',
    intervalKilometers: 5000,
    intervalMonths: null,
    lastServiceDate: '2026-02-20',
    lastServiceOdometer: 45000,
    nextServiceDate: null,
    nextServiceOdometer: 50000,
    status: 'active'
  },
  {
    id: 'sched-002',
    vehicleId: 'veh-001',
    maintenanceType: 'Oil Change',
    intervalType: 'both',
    intervalKilometers: 10000,
    intervalMonths: 6,
    lastServiceDate: '2026-01-15',
    lastServiceOdometer: 40000,
    nextServiceDate: '2026-07-15',
    nextServiceOdometer: 50000,
    status: 'active'
  },
  {
    id: 'sched-003',
    vehicleId: 'veh-002',
    maintenanceType: 'Tire Rotation',
    intervalType: 'kilometers',
    intervalKilometers: 10000,
    intervalMonths: null,
    lastServiceDate: '2026-02-10',
    lastServiceOdometer: 25000,
    nextServiceDate: null,
    nextServiceOdometer: 35000,
    status: 'active'
  },
  {
    id: 'sched-004',
    vehicleId: 'veh-003',
    maintenanceType: 'Routine Service',
    intervalType: 'kilometers',
    intervalKilometers: 5000,
    intervalMonths: null,
    lastServiceDate: '2026-01-10',
    lastServiceOdometer: 60000,
    nextServiceDate: null,
    nextServiceOdometer: 65000,
    status: 'overdue'
  }
];

// COST RECORDS
export interface CostRecord {
  id: string;
  vehicleId: string | null;
  driverId: string | null;
  costCategory: 'fuel' | 'maintenance' | 'salary' | 'insurance' | 'depreciation' | 'registration' | 'parking' | 'fines' | 'other';
  costType: 'fixed' | 'variable';
  amount: number;
  currency: string;
  costDate: string;
  description: string;
  vendor: string | null;
  paymentMethod: string;
  referenceNumber: string | null;
}

export const mockCostRecords: CostRecord[] = [
  {
    id: 'cost-001',
    vehicleId: 'veh-001',
    driverId: null,
    costCategory: 'fuel',
    costType: 'variable',
    amount: 544000,
    currency: 'IDR',
    costDate: '2026-02-25',
    description: 'Fuel refill - 80L diesel',
    vendor: 'Pertamina SPBU 123',
    paymentMethod: 'fuel_card',
    referenceNumber: 'RCP-2026-001'
  },
  {
    id: 'cost-002',
    vehicleId: 'veh-001',
    driverId: null,
    costCategory: 'maintenance',
    costType: 'variable',
    amount: 1300000,
    currency: 'IDR',
    costDate: '2026-02-20',
    description: 'Routine service - oil change, filter replacement',
    vendor: 'Mitsubishi Service Center',
    paymentMethod: 'bank_transfer',
    referenceNumber: 'INV-MS-001'
  },
  {
    id: 'cost-003',
    vehicleId: 'veh-001',
    driverId: null,
    costCategory: 'insurance',
    costType: 'fixed',
    amount: 3500000,
    currency: 'IDR',
    costDate: '2026-02-01',
    description: 'Monthly insurance premium',
    vendor: 'Asuransi Sinar Mas',
    paymentMethod: 'bank_transfer',
    referenceNumber: 'POL-001-2026'
  },
  {
    id: 'cost-004',
    vehicleId: null,
    driverId: 'drv-001',
    costCategory: 'salary',
    costType: 'fixed',
    amount: 5000000,
    currency: 'IDR',
    costDate: '2026-02-01',
    description: 'Monthly base salary',
    vendor: null,
    paymentMethod: 'bank_transfer',
    referenceNumber: 'SAL-DRV001-0226'
  },
  {
    id: 'cost-005',
    vehicleId: 'veh-002',
    driverId: null,
    costCategory: 'parking',
    costType: 'variable',
    amount: 150000,
    currency: 'IDR',
    costDate: '2026-02-24',
    description: 'Parking fees - monthly',
    vendor: 'Various',
    paymentMethod: 'cash',
    referenceNumber: null
  }
];

// GEOFENCES
export interface Geofence {
  id: string;
  name: string;
  description: string;
  fenceType: 'circle' | 'polygon';
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  status: 'active' | 'inactive';
}

export const mockGeofences: Geofence[] = [
  {
    id: 'fence-001',
    name: 'Gudang Pusat Cikarang',
    description: 'Main warehouse geofence',
    fenceType: 'circle',
    centerLatitude: -6.2088,
    centerLongitude: 106.8456,
    radiusMeters: 500,
    alertOnEntry: true,
    alertOnExit: true,
    status: 'active'
  },
  {
    id: 'fence-002',
    name: 'Cabang Bandung',
    description: 'Bandung branch geofence',
    fenceType: 'circle',
    centerLatitude: -6.9175,
    centerLongitude: 107.6191,
    radiusMeters: 300,
    alertOnEntry: true,
    alertOnExit: true,
    status: 'active'
  },
  {
    id: 'fence-003',
    name: 'Cabang Surabaya',
    description: 'Surabaya branch geofence',
    fenceType: 'circle',
    centerLatitude: -7.2575,
    centerLongitude: 112.7521,
    radiusMeters: 300,
    alertOnEntry: true,
    alertOnExit: true,
    status: 'active'
  }
];

// LOCATION ALERTS
export interface LocationAlert {
  id: string;
  vehicleId: string;
  geofenceId: string | null;
  alertType: 'speeding' | 'geofence_entry' | 'geofence_exit' | 'idle' | 'route_deviation';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
}

export const mockLocationAlerts: LocationAlert[] = [
  {
    id: 'alert-001',
    vehicleId: 'veh-001',
    geofenceId: 'fence-001',
    alertType: 'geofence_exit',
    severity: 'info',
    message: 'Vehicle exited Gudang Pusat Cikarang',
    latitude: -6.2088,
    longitude: 106.8456,
    speedKmh: 25,
    timestamp: '2026-02-26T06:05:00Z',
    acknowledged: true,
    acknowledgedBy: 'user-001',
    acknowledgedAt: '2026-02-26T06:10:00Z'
  },
  {
    id: 'alert-002',
    vehicleId: 'veh-001',
    geofenceId: null,
    alertType: 'speeding',
    severity: 'warning',
    message: 'Vehicle exceeding speed limit (95 km/h)',
    latitude: -6.5000,
    longitude: 107.0000,
    speedKmh: 95,
    timestamp: '2026-02-26T07:30:00Z',
    acknowledged: false,
    acknowledgedBy: null,
    acknowledgedAt: null
  },
  {
    id: 'alert-003',
    vehicleId: 'veh-002',
    geofenceId: null,
    alertType: 'idle',
    severity: 'warning',
    message: 'Vehicle idle for 20 minutes',
    latitude: -6.9175,
    longitude: 107.6191,
    speedKmh: 0,
    timestamp: '2026-02-26T09:20:00Z',
    acknowledged: false,
    acknowledgedBy: null,
    acknowledgedAt: null
  }
];

// Helper functions
export function getRouteAssignmentsByVehicle(vehicleId: string): RouteAssignment[] {
  return mockRouteAssignments.filter(a => a.vehicleId === vehicleId);
}

export function getRouteAssignmentsByDriver(driverId: string): RouteAssignment[] {
  return mockRouteAssignments.filter(a => a.driverId === driverId);
}

export function getLatestGPSLocation(vehicleId: string): GPSLocation | null {
  const locations = mockGPSLocations.filter(l => l.vehicleId === vehicleId);
  if (locations.length === 0) return null;
  return locations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
}

export function getMaintenanceSchedulesByVehicle(vehicleId: string): MaintenanceSchedule[] {
  return mockMaintenanceSchedules.filter(s => s.vehicleId === vehicleId);
}

export function getCostRecordsByVehicle(vehicleId: string): CostRecord[] {
  return mockCostRecords.filter(c => c.vehicleId === vehicleId);
}

export function getCostRecordsByDriver(driverId: string): CostRecord[] {
  return mockCostRecords.filter(c => c.driverId === driverId);
}

export function getUnacknowledgedAlerts(): LocationAlert[] {
  return mockLocationAlerts.filter(a => !a.acknowledged);
}

export function getTotalCostByCategory(category: string): number {
  return mockCostRecords
    .filter(c => c.costCategory === category)
    .reduce((sum, c) => sum + c.amount, 0);
}

export function getTotalCostByVehicle(vehicleId: string): number {
  return mockCostRecords
    .filter(c => c.vehicleId === vehicleId)
    .reduce((sum, c) => sum + c.amount, 0);
}

export function calculateMaintenanceCompliance(): number {
  const total = mockMaintenanceSchedules.length;
  const compliant = mockMaintenanceSchedules.filter(s => s.status !== 'overdue').length;
  return total > 0 ? (compliant / total) * 100 : 100;
}
