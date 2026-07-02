/**
 * Mock Data for Fleet Management System
 * Used for development and testing before database migration
 */

export interface MockVehicle {
  id: string;
  tenantId: string;
  vehicleNumber: string;
  licensePlate: string;
  vehicleType: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  ownershipType: string;
  purchaseDate: string | null;
  purchasePrice: number | null;
  maxWeightKg: number;
  maxVolumeM3: number;
  fuelTankCapacity: number;
  registrationNumber: string;
  registrationExpiry: string;
  insurancePolicyNumber: string;
  insuranceProvider: string;
  insuranceExpiry: string;
  status: string;
  currentLocation: string;
  currentOdometerKm: number;
  lastServiceDate: string | null;
  nextServiceDueKm: number;
  assignedBranchId: string | null;
  assignedDriverId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockDriver {
  id: string;
  tenantId: string;
  driverNumber: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  dateOfBirth: string;
  licenseNumber: string;
  licenseType: string;
  licenseIssueDate: string;
  licenseExpiryDate: string;
  employmentType: string;
  hireDate: string;
  assignedBranchId: string | null;
  totalDeliveries: number;
  onTimeDeliveries: number;
  totalDistanceKm: number;
  safetyScore: number;
  customerRating: number;
  status: string;
  availabilityStatus: string;
  photoUrl: string | null;
  licensePhotoUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const mockVehicles: MockVehicle[] = [
  {
    id: 'veh-001',
    tenantId: 'tenant-1',
    vehicleNumber: 'VH-001',
    licensePlate: 'B 1234 XYZ',
    vehicleType: 'truck',
    brand: 'Mitsubishi',
    model: 'Colt Diesel FE 74',
    year: 2022,
    color: 'Putih',
    ownershipType: 'owned',
    purchaseDate: '2022-01-15',
    purchasePrice: 350000000,
    maxWeightKg: 5000,
    maxVolumeM3: 15,
    fuelTankCapacity: 100,
    registrationNumber: 'STNK-001-2022',
    registrationExpiry: '2027-01-15',
    insurancePolicyNumber: 'INS-VH-001-2024',
    insuranceProvider: 'Asuransi Sinar Mas',
    insuranceExpiry: '2026-12-31',
    status: 'active',
    currentLocation: 'Gudang Pusat Cikarang',
    currentOdometerKm: 45230,
    lastServiceDate: '2026-02-20',
    nextServiceDueKm: 50000,
    assignedBranchId: '6',
    assignedDriverId: 'drv-001',
    notes: 'Kondisi baik, rutin service',
    createdAt: '2022-01-15T08:00:00Z',
    updatedAt: '2026-02-25T10:00:00Z'
  },
  {
    id: 'veh-002',
    tenantId: 'tenant-1',
    vehicleNumber: 'VH-002',
    licensePlate: 'B 5678 ABC',
    vehicleType: 'van',
    brand: 'Daihatsu',
    model: 'Gran Max Blind Van',
    year: 2023,
    color: 'Silver',
    ownershipType: 'owned',
    purchaseDate: '2023-03-10',
    purchasePrice: 185000000,
    maxWeightKg: 1200,
    maxVolumeM3: 6,
    fuelTankCapacity: 43,
    registrationNumber: 'STNK-002-2023',
    registrationExpiry: '2028-03-10',
    insurancePolicyNumber: 'INS-VH-002-2024',
    insuranceProvider: 'Asuransi Sinar Mas',
    insuranceExpiry: '2026-12-31',
    status: 'active',
    currentLocation: 'Cabang Bandung',
    currentOdometerKm: 28500,
    lastServiceDate: '2026-02-15',
    nextServiceDueKm: 30000,
    assignedBranchId: '2',
    assignedDriverId: 'drv-002',
    notes: null,
    createdAt: '2023-03-10T08:00:00Z',
    updatedAt: '2026-02-25T10:00:00Z'
  },
  {
    id: 'veh-003',
    tenantId: 'tenant-1',
    vehicleNumber: 'VH-003',
    licensePlate: 'B 9999 DEF',
    vehicleType: 'truck',
    brand: 'Isuzu',
    model: 'Elf NMR 71',
    year: 2021,
    color: 'Biru',
    ownershipType: 'leased',
    purchaseDate: null,
    purchasePrice: null,
    maxWeightKg: 4000,
    maxVolumeM3: 12,
    fuelTankCapacity: 80,
    registrationNumber: 'STNK-003-2021',
    registrationExpiry: '2026-06-15',
    insurancePolicyNumber: 'INS-VH-003-2024',
    insuranceProvider: 'Asuransi Sinar Mas',
    insuranceExpiry: '2026-12-31',
    status: 'maintenance',
    currentLocation: 'Bengkel Cikarang',
    currentOdometerKm: 62000,
    lastServiceDate: '2026-02-22',
    nextServiceDueKm: 65000,
    assignedBranchId: '6',
    assignedDriverId: null,
    notes: 'Sedang service rutin, estimasi selesai 3 hari',
    createdAt: '2021-06-15T08:00:00Z',
    updatedAt: '2026-02-25T10:00:00Z'
  },
  {
    id: 'veh-004',
    tenantId: 'tenant-1',
    vehicleNumber: 'VH-004',
    licensePlate: 'B 2468 GHI',
    vehicleType: 'motorcycle',
    brand: 'Honda',
    model: 'Vario 125',
    year: 2024,
    color: 'Merah',
    ownershipType: 'owned',
    purchaseDate: '2024-01-20',
    purchasePrice: 22000000,
    maxWeightKg: 150,
    maxVolumeM3: 0.5,
    fuelTankCapacity: 5.5,
    registrationNumber: 'STNK-004-2024',
    registrationExpiry: '2029-01-20',
    insurancePolicyNumber: 'INS-VH-004-2024',
    insuranceProvider: 'Asuransi Sinar Mas',
    insuranceExpiry: '2026-12-31',
    status: 'active',
    currentLocation: 'Cabang Surabaya',
    currentOdometerKm: 8500,
    lastServiceDate: '2026-02-10',
    nextServiceDueKm: 10000,
    assignedBranchId: '3',
    assignedDriverId: 'drv-003',
    notes: 'Untuk pengiriman express area kota',
    createdAt: '2024-01-20T08:00:00Z',
    updatedAt: '2026-02-25T10:00:00Z'
  },
  {
    id: 'veh-005',
    tenantId: 'tenant-1',
    vehicleNumber: 'VH-005',
    licensePlate: 'B 1357 JKL',
    vehicleType: 'van',
    brand: 'Suzuki',
    model: 'Carry Pick Up',
    year: 2023,
    color: 'Hitam',
    ownershipType: 'owned',
    purchaseDate: '2023-08-05',
    purchasePrice: 145000000,
    maxWeightKg: 800,
    maxVolumeM3: 4,
    fuelTankCapacity: 40,
    registrationNumber: 'STNK-005-2023',
    registrationExpiry: '2028-08-05',
    insurancePolicyNumber: 'INS-VH-005-2024',
    insuranceProvider: 'Asuransi Sinar Mas',
    insuranceExpiry: '2026-12-31',
    status: 'active',
    currentLocation: 'Cabang Medan',
    currentOdometerKm: 15200,
    lastServiceDate: '2026-02-18',
    nextServiceDueKm: 20000,
    assignedBranchId: '4',
    assignedDriverId: 'drv-004',
    notes: null,
    createdAt: '2023-08-05T08:00:00Z',
    updatedAt: '2026-02-25T10:00:00Z'
  }
];

export const mockDrivers: MockDriver[] = [
  {
    id: 'drv-001',
    tenantId: 'tenant-1',
    driverNumber: 'DRV-001',
    fullName: 'Budi Santoso',
    phone: '0812-3456-7890',
    email: 'budi.santoso@example.com',
    address: 'Jl. Raya Cikarang No. 123, Bekasi',
    dateOfBirth: '1985-05-15',
    licenseNumber: 'SIM-B1-001-2020',
    licenseType: 'SIM B1',
    licenseIssueDate: '2020-03-10',
    licenseExpiryDate: '2025-03-10',
    employmentType: 'permanent',
    hireDate: '2020-06-01',
    assignedBranchId: '6',
    totalDeliveries: 1250,
    onTimeDeliveries: 1188,
    totalDistanceKm: 125000,
    safetyScore: 98.5,
    customerRating: 4.8,
    status: 'active',
    availabilityStatus: 'on_duty',
    photoUrl: null,
    licensePhotoUrl: null,
    notes: 'Driver terbaik bulan ini',
    createdAt: '2020-06-01T08:00:00Z',
    updatedAt: '2026-02-25T10:00:00Z'
  },
  {
    id: 'drv-002',
    tenantId: 'tenant-1',
    driverNumber: 'DRV-002',
    fullName: 'Ahmad Hidayat',
    phone: '0813-9876-5432',
    email: 'ahmad.hidayat@example.com',
    address: 'Jl. Soekarno Hatta No. 45, Bandung',
    dateOfBirth: '1990-08-22',
    licenseNumber: 'SIM-B1-002-2021',
    licenseType: 'SIM B1',
    licenseIssueDate: '2021-01-15',
    licenseExpiryDate: '2026-01-15',
    employmentType: 'permanent',
    hireDate: '2021-02-01',
    assignedBranchId: '2',
    totalDeliveries: 890,
    onTimeDeliveries: 845,
    totalDistanceKm: 89000,
    safetyScore: 96.2,
    customerRating: 4.7,
    status: 'active',
    availabilityStatus: 'on_duty',
    photoUrl: null,
    licensePhotoUrl: null,
    notes: null,
    createdAt: '2021-02-01T08:00:00Z',
    updatedAt: '2026-02-25T10:00:00Z'
  },
  {
    id: 'drv-003',
    tenantId: 'tenant-1',
    driverNumber: 'DRV-003',
    fullName: 'Dewi Lestari',
    phone: '0821-1234-5678',
    email: 'dewi.lestari@example.com',
    address: 'Jl. Basuki Rahmat No. 78, Surabaya',
    dateOfBirth: '1992-03-10',
    licenseNumber: 'SIM-C-003-2022',
    licenseType: 'SIM C',
    licenseIssueDate: '2022-05-20',
    licenseExpiryDate: '2027-05-20',
    employmentType: 'permanent',
    hireDate: '2022-06-15',
    assignedBranchId: '3',
    totalDeliveries: 650,
    onTimeDeliveries: 630,
    totalDistanceKm: 32500,
    safetyScore: 99.1,
    customerRating: 4.9,
    status: 'active',
    availabilityStatus: 'available',
    photoUrl: null,
    licensePhotoUrl: null,
    notes: 'Spesialis pengiriman express',
    createdAt: '2022-06-15T08:00:00Z',
    updatedAt: '2026-02-25T10:00:00Z'
  },
  {
    id: 'drv-004',
    tenantId: 'tenant-1',
    driverNumber: 'DRV-004',
    fullName: 'Eko Prasetyo',
    phone: '0822-8765-4321',
    email: 'eko.prasetyo@example.com',
    address: 'Jl. Gatot Subroto No. 234, Medan',
    dateOfBirth: '1988-11-30',
    licenseNumber: 'SIM-B1-004-2019',
    licenseType: 'SIM B1',
    licenseIssueDate: '2019-09-12',
    licenseExpiryDate: '2024-09-12',
    employmentType: 'permanent',
    hireDate: '2019-10-01',
    assignedBranchId: '4',
    totalDeliveries: 1450,
    onTimeDeliveries: 1350,
    totalDistanceKm: 145000,
    safetyScore: 94.8,
    customerRating: 4.6,
    status: 'active',
    availabilityStatus: 'on_duty',
    photoUrl: null,
    licensePhotoUrl: null,
    notes: 'Perlu renewal SIM segera',
    createdAt: '2019-10-01T08:00:00Z',
    updatedAt: '2026-02-25T10:00:00Z'
  },
  {
    id: 'drv-005',
    tenantId: 'tenant-1',
    driverNumber: 'DRV-005',
    fullName: 'Siti Rahayu',
    phone: '0823-5555-6666',
    email: 'siti.rahayu@example.com',
    address: 'Jl. Malioboro No. 56, Yogyakarta',
    dateOfBirth: '1995-07-18',
    licenseNumber: 'SIM-B1-005-2023',
    licenseType: 'SIM B1',
    licenseIssueDate: '2023-02-28',
    licenseExpiryDate: '2028-02-28',
    employmentType: 'contract',
    hireDate: '2023-03-15',
    assignedBranchId: '5',
    totalDeliveries: 420,
    onTimeDeliveries: 405,
    totalDistanceKm: 42000,
    safetyScore: 97.5,
    customerRating: 4.8,
    status: 'active',
    availabilityStatus: 'available',
    photoUrl: null,
    licensePhotoUrl: null,
    notes: null,
    createdAt: '2023-03-15T08:00:00Z',
    updatedAt: '2026-02-25T10:00:00Z'
  }
];

// Helper functions
export function getMockVehicleById(id: string): MockVehicle | null {
  return mockVehicles.find(v => v.id === id) || null;
}

export function getMockVehicleByPlate(plate: string): MockVehicle | null {
  return mockVehicles.find(v => v.licensePlate === plate) || null;
}

export function getMockDriverById(id: string): MockDriver | null {
  return mockDrivers.find(d => d.id === id) || null;
}

export function getMockDriverByNumber(number: string): MockDriver | null {
  return mockDrivers.find(d => d.driverNumber === number) || null;
}

export function getAvailableDrivers(): MockDriver[] {
  return mockDrivers.filter(d => d.status === 'active' && d.availabilityStatus === 'available');
}

export function getActiveVehicles(): MockVehicle[] {
  return mockVehicles.filter(v => v.status === 'active');
}

export function createMockVehicle(data: Partial<MockVehicle>): MockVehicle {
  const newVehicle: MockVehicle = {
    id: `veh-${Date.now()}`,
    tenantId: data.tenantId || 'tenant-1',
    vehicleNumber: data.vehicleNumber || `VH-${Date.now()}`,
    licensePlate: data.licensePlate || '',
    vehicleType: data.vehicleType || 'van',
    brand: data.brand || '',
    model: data.model || '',
    year: data.year || new Date().getFullYear(),
    color: data.color || '',
    ownershipType: data.ownershipType || 'owned',
    purchaseDate: data.purchaseDate || null,
    purchasePrice: data.purchasePrice || null,
    maxWeightKg: data.maxWeightKg || 1000,
    maxVolumeM3: data.maxVolumeM3 || 5,
    fuelTankCapacity: data.fuelTankCapacity || 50,
    registrationNumber: data.registrationNumber || '',
    registrationExpiry: data.registrationExpiry || '',
    insurancePolicyNumber: data.insurancePolicyNumber || '',
    insuranceProvider: data.insuranceProvider || '',
    insuranceExpiry: data.insuranceExpiry || '',
    status: 'active',
    currentLocation: data.currentLocation || '',
    currentOdometerKm: data.currentOdometerKm || 0,
    lastServiceDate: data.lastServiceDate || null,
    nextServiceDueKm: data.nextServiceDueKm || 5000,
    assignedBranchId: data.assignedBranchId || null,
    assignedDriverId: data.assignedDriverId || null,
    notes: data.notes || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockVehicles.push(newVehicle);
  return newVehicle;
}

export function createMockDriver(data: Partial<MockDriver>): MockDriver {
  const newDriver: MockDriver = {
    id: `drv-${Date.now()}`,
    tenantId: data.tenantId || 'tenant-1',
    driverNumber: data.driverNumber || `DRV-${Date.now()}`,
    fullName: data.fullName || '',
    phone: data.phone || '',
    email: data.email || '',
    address: data.address || '',
    dateOfBirth: data.dateOfBirth || '',
    licenseNumber: data.licenseNumber || '',
    licenseType: data.licenseType || 'SIM B1',
    licenseIssueDate: data.licenseIssueDate || '',
    licenseExpiryDate: data.licenseExpiryDate || '',
    employmentType: data.employmentType || 'permanent',
    hireDate: data.hireDate || new Date().toISOString().split('T')[0],
    assignedBranchId: data.assignedBranchId || null,
    totalDeliveries: 0,
    onTimeDeliveries: 0,
    totalDistanceKm: 0,
    safetyScore: 100,
    customerRating: 0,
    status: 'active',
    availabilityStatus: 'available',
    photoUrl: data.photoUrl || null,
    licensePhotoUrl: data.licensePhotoUrl || null,
    notes: data.notes || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockDrivers.push(newDriver);
  return newDriver;
}

export function updateMockVehicle(id: string, updates: Partial<MockVehicle>): MockVehicle | null {
  const index = mockVehicles.findIndex(v => v.id === id);
  if (index === -1) return null;

  mockVehicles[index] = {
    ...mockVehicles[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return mockVehicles[index];
}

export function updateMockDriver(id: string, updates: Partial<MockDriver>): MockDriver | null {
  const index = mockDrivers.findIndex(d => d.id === id);
  if (index === -1) return null;

  mockDrivers[index] = {
    ...mockDrivers[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return mockDrivers[index];
}
