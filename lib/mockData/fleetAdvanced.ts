/**
 * Advanced Fleet Management Mock Data
 * Includes: Fuel, Trips, Routes, Maintenance, KPIs
 */

// FUEL MANAGEMENT
export interface FuelTransaction {
  id: string;
  vehicleId: string;
  driverId: string | null;
  transactionType: 'refill' | 'consumption_estimate';
  transactionDate: string;
  fuelStation: string;
  fuelType: 'diesel' | 'petrol' | 'electric';
  quantityLiters: number;
  pricePerLiter: number;
  totalCost: number;
  odometerReading: number;
  paymentMethod: 'cash' | 'card' | 'fuel_card';
  receiptNumber: string;
  notes: string | null;
}

export const mockFuelTransactions: FuelTransaction[] = [
  {
    id: 'fuel-001',
    vehicleId: 'veh-001',
    driverId: 'drv-001',
    transactionType: 'refill',
    transactionDate: '2026-02-25T08:30:00Z',
    fuelStation: 'Pertamina SPBU 123',
    fuelType: 'diesel',
    quantityLiters: 80,
    pricePerLiter: 6800,
    totalCost: 544000,
    odometerReading: 45230,
    paymentMethod: 'fuel_card',
    receiptNumber: 'RCP-2026-001',
    notes: 'Full tank'
  },
  {
    id: 'fuel-002',
    vehicleId: 'veh-002',
    driverId: 'drv-002',
    transactionType: 'refill',
    transactionDate: '2026-02-24T14:20:00Z',
    fuelStation: 'Shell SPBU 456',
    fuelType: 'petrol',
    quantityLiters: 35,
    pricePerLiter: 12500,
    totalCost: 437500,
    odometerReading: 28500,
    paymentMethod: 'cash',
    receiptNumber: 'RCP-2026-002',
    notes: null
  }
];

// TRIP MANAGEMENT
export interface Trip {
  id: string;
  vehicleId: string;
  driverId: string;
  tripNumber: string;
  startLocation: string;
  endLocation: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  distanceKm: number;
  startOdometer: number;
  endOdometer: number | null;
  fuelConsumedLiters: number | null;
  averageSpeedKmh: number | null;
  maxSpeedKmh: number | null;
  idleTimeMinutes: number | null;
  stopsCount: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  tripCost: number | null;
  revenue: number | null;
  profit: number | null;
}

export const mockTrips: Trip[] = [
  {
    id: 'trip-001',
    vehicleId: 'veh-001',
    driverId: 'drv-001',
    tripNumber: 'TRIP-2026-001',
    startLocation: 'Gudang Pusat Cikarang',
    endLocation: 'Cabang Bandung',
    startTime: '2026-02-25T06:00:00Z',
    endTime: '2026-02-25T10:30:00Z',
    durationMinutes: 270,
    distanceKm: 180,
    startOdometer: 45050,
    endOdometer: 45230,
    fuelConsumedLiters: 25,
    averageSpeedKmh: 65,
    maxSpeedKmh: 90,
    idleTimeMinutes: 15,
    stopsCount: 2,
    status: 'completed',
    tripCost: 250000,
    revenue: 500000,
    profit: 250000
  },
  {
    id: 'trip-002',
    vehicleId: 'veh-002',
    driverId: 'drv-002',
    tripNumber: 'TRIP-2026-002',
    startLocation: 'Cabang Bandung',
    endLocation: 'Cabang Surabaya',
    startTime: '2026-02-25T07:00:00Z',
    endTime: null,
    durationMinutes: null,
    distanceKm: 0,
    startOdometer: 28500,
    endOdometer: null,
    fuelConsumedLiters: null,
    averageSpeedKmh: null,
    maxSpeedKmh: null,
    idleTimeMinutes: null,
    stopsCount: 0,
    status: 'in_progress',
    tripCost: null,
    revenue: null,
    profit: null
  }
];

// ROUTE MANAGEMENT
export interface Route {
  id: string;
  routeNumber: string;
  routeName: string;
  routeType: 'delivery' | 'pickup' | 'round_trip' | 'multi_stop';
  startLocation: string;
  endLocation: string;
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  stops: RouteStop[];
  status: 'active' | 'inactive';
}

export interface RouteStop {
  sequence: number;
  locationName: string;
  locationAddress: string;
  estimatedArrivalTime: string;
}

export const mockRoutes: Route[] = [
  {
    id: 'route-001',
    routeNumber: 'RT-001',
    routeName: 'Jakarta - Bandung Express',
    routeType: 'delivery',
    startLocation: 'Gudang Pusat Cikarang',
    endLocation: 'Cabang Bandung',
    totalDistanceKm: 180,
    estimatedDurationMinutes: 240,
    stops: [
      {
        sequence: 1,
        locationName: 'Rest Area KM 72',
        locationAddress: 'Tol Cipularang KM 72',
        estimatedArrivalTime: '08:00'
      },
      {
        sequence: 2,
        locationName: 'Cabang Bandung',
        locationAddress: 'Jl. Soekarno Hatta No. 45, Bandung',
        estimatedArrivalTime: '10:00'
      }
    ],
    status: 'active'
  },
  {
    id: 'route-002',
    routeNumber: 'RT-002',
    routeName: 'Bandung - Surabaya Multi Stop',
    routeType: 'multi_stop',
    startLocation: 'Cabang Bandung',
    endLocation: 'Cabang Surabaya',
    totalDistanceKm: 720,
    estimatedDurationMinutes: 960,
    stops: [
      {
        sequence: 1,
        locationName: 'Cabang Cirebon',
        locationAddress: 'Jl. Siliwangi No. 123, Cirebon',
        estimatedArrivalTime: '10:00'
      },
      {
        sequence: 2,
        locationName: 'Cabang Semarang',
        locationAddress: 'Jl. Pemuda No. 78, Semarang',
        estimatedArrivalTime: '14:00'
      },
      {
        sequence: 3,
        locationName: 'Cabang Surabaya',
        locationAddress: 'Jl. Basuki Rahmat No. 78, Surabaya',
        estimatedArrivalTime: '19:00'
      }
    ],
    status: 'active'
  }
];

// MAINTENANCE RECORDS
export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  maintenanceType: string;
  serviceDate: string;
  odometerReading: number;
  serviceProvider: string;
  description: string;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  nextServiceDue: number;
}

export const mockMaintenanceRecords: MaintenanceRecord[] = [
  {
    id: 'maint-001',
    vehicleId: 'veh-001',
    maintenanceType: 'Routine Service',
    serviceDate: '2026-02-20',
    odometerReading: 45000,
    serviceProvider: 'Mitsubishi Service Center',
    description: 'Oil change, filter replacement, general inspection',
    laborCost: 500000,
    partsCost: 800000,
    totalCost: 1300000,
    nextServiceDue: 50000
  },
  {
    id: 'maint-002',
    vehicleId: 'veh-002',
    maintenanceType: 'Tire Rotation',
    serviceDate: '2026-02-15',
    odometerReading: 28000,
    serviceProvider: 'Ban & Velg Center',
    description: 'Tire rotation and balancing',
    laborCost: 200000,
    partsCost: 0,
    totalCost: 200000,
    nextServiceDue: 30000
  }
];

// KPI DATA
export interface FleetKPIs {
  overview: {
    totalVehicles: number;
    activeVehicles: number;
    vehiclesOnRoute: number;
    vehiclesInMaintenance: number;
    totalDrivers: number;
    availableDrivers: number;
    driversOnDuty: number;
    fleetUtilization: number;
  };
  operational: {
    totalDistanceToday: number;
    totalDistanceMonth: number;
    totalTripsToday: number;
    totalTripsMonth: number;
    averageTripDistance: number;
    averageTripDuration: number;
    onTimeDeliveryRate: number;
    routeCompletionRate: number;
  };
  efficiency: {
    averageFuelEfficiency: number;
    averageSpeed: number;
    idleTimePercentage: number;
    vehicleUtilizationRate: number;
    driverUtilizationRate: number;
    costPerKilometer: number;
    revenuePerKilometer: number;
  };
  maintenance: {
    vehiclesDueForService: number;
    overdueMainten: number;
    averageDowntimeDays: number;
    maintenanceCostMonth: number;
    maintenanceCostPerVehicle: number;
  };
  safety: {
    speedingIncidents: number;
    harshBrakingEvents: number;
    accidentsMonth: number;
    averageSafetyScore: number;
    complianceRate: number;
  };
  cost: {
    totalOperatingCost: number;
    fuelCost: number;
    maintenanceCost: number;
    driverCost: number;
    insuranceCost: number;
    costPerTrip: number;
    costPerDelivery: number;
  };
}

export const mockFleetKPIs: FleetKPIs = {
  overview: {
    totalVehicles: 5,
    activeVehicles: 4,
    vehiclesOnRoute: 2,
    vehiclesInMaintenance: 1,
    totalDrivers: 5,
    availableDrivers: 2,
    driversOnDuty: 3,
    fleetUtilization: 80
  },
  operational: {
    totalDistanceToday: 450,
    totalDistanceMonth: 12500,
    totalTripsToday: 8,
    totalTripsMonth: 245,
    averageTripDistance: 51,
    averageTripDuration: 180,
    onTimeDeliveryRate: 95,
    routeCompletionRate: 98
  },
  efficiency: {
    averageFuelEfficiency: 7.2,
    averageSpeed: 65,
    idleTimePercentage: 12,
    vehicleUtilizationRate: 85,
    driverUtilizationRate: 78,
    costPerKilometer: 3500,
    revenuePerKilometer: 5500
  },
  maintenance: {
    vehiclesDueForService: 2,
    overdueMainten: 0,
    averageDowntimeDays: 1.5,
    maintenanceCostMonth: 6500000,
    maintenanceCostPerVehicle: 1300000
  },
  safety: {
    speedingIncidents: 3,
    harshBrakingEvents: 8,
    accidentsMonth: 0,
    averageSafetyScore: 97.5,
    complianceRate: 99
  },
  cost: {
    totalOperatingCost: 45000000,
    fuelCost: 18000000,
    maintenanceCost: 6500000,
    driverCost: 15000000,
    insuranceCost: 3500000,
    costPerTrip: 183673,
    costPerDelivery: 183673
  }
};

// Helper functions
export function getFuelTransactionsByVehicle(vehicleId: string): FuelTransaction[] {
  return mockFuelTransactions.filter(t => t.vehicleId === vehicleId);
}

export function getTripsByVehicle(vehicleId: string): Trip[] {
  return mockTrips.filter(t => t.vehicleId === vehicleId);
}

export function getTripsByDriver(driverId: string): Trip[] {
  return mockTrips.filter(t => t.driverId === driverId);
}

export function getMaintenanceByVehicle(vehicleId: string): MaintenanceRecord[] {
  return mockMaintenanceRecords.filter(m => m.vehicleId === vehicleId);
}

export function calculateVehicleFuelEfficiency(vehicleId: string): number {
  const trips = getTripsByVehicle(vehicleId).filter(t => t.status === 'completed');
  if (trips.length === 0) return 0;
  
  const totalDistance = trips.reduce((sum, t) => sum + t.distanceKm, 0);
  const totalFuel = trips.reduce((sum, t) => sum + (t.fuelConsumedLiters || 0), 0);
  
  return totalFuel > 0 ? totalDistance / totalFuel : 0;
}

export function calculateDriverPerformance(driverId: string) {
  const trips = getTripsByDriver(driverId).filter(t => t.status === 'completed');
  
  return {
    totalTrips: trips.length,
    totalDistance: trips.reduce((sum, t) => sum + t.distanceKm, 0),
    totalRevenue: trips.reduce((sum, t) => sum + (t.revenue || 0), 0),
    totalProfit: trips.reduce((sum, t) => sum + (t.profit || 0), 0),
    averageSpeed: trips.reduce((sum, t) => sum + (t.averageSpeedKmh || 0), 0) / trips.length,
    totalIdleTime: trips.reduce((sum, t) => sum + (t.idleTimeMinutes || 0), 0)
  };
}
