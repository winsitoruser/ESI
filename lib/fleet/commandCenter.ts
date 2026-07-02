/**
 * Fleet Command Center - Unified Service Layer
 * Menggabungkan FMS (Fleet Mgmt System), TMS (Transport Mgmt System),
 * dan Fleet Legacy menjadi satu super module dengan integrasi cross-module
 * ke Driver App, HRIS, Finance, dan Inventory.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FleetCommandKPI {
  // Fleet (Vehicles & Drivers)
  totalVehicles: number;
  activeVehicles: number;
  inMaintenance: number;
  retiredVehicles: number;
  fleetUtilization: number; // %
  totalDrivers: number;
  activeDrivers: number;
  onDutyDrivers: number;
  availableDrivers: number;
  avgDriverScore: number;

  // Transport (Shipments & Trips)
  totalShipments: number;
  pendingShipments: number;
  inTransitShipments: number;
  deliveredToday: number;
  activeTrips: number;
  completedTripsMonth: number;
  avgDeliveryTimeHours: number;
  onTimeDeliveryRate: number; // %

  // Financial
  fuelCostMTD: number;
  maintenanceCostMTD: number;
  totalOperationalCostMTD: number;
  freightRevenueMTD: number;
  outstandingFreightBills: number;
  avgFuelEfficiency: number; // km/l

  // Compliance / Alerts
  expiringDocs: number; // <= 30d
  overdueInspections: number;
  openIncidents: number;
  overdueMaintenance: number;
  activeViolations: number;
}

export interface FleetAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'doc_expiring' | 'maintenance_due' | 'inspection_due' | 'incident_open' | 'violation' | 'sla_breach' | 'fuel_anomaly';
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  entityCode?: string;
  dueDate?: string;
  actionUrl?: string;
}

export interface IntegrationStatus {
  module: 'driver_app' | 'hris' | 'finance' | 'inventory' | 'pos' | 'procurement' | 'manufacturing';
  label: string;
  connected: boolean;
  linkedCount: number; // berapa entity yang terhubung
  pendingSyncCount?: number;
  lastSyncAt?: string | null;
  healthScore: number; // 0-100
}

/**
 * KPI Supply Chain gabungan (Inventory + Manufacturing + Fleet)
 * Merepresentasikan alur barang end-to-end:
 *   Supplier → Gudang Bahan Baku → Pabrik → Gudang FG → Outlet/Customer
 */
export interface SupplyChainKPI {
  // Inventory
  totalWarehouses: number;
  totalStockValue: number;
  inventoryTurnover: number;   // rasio outflow30d / stock
  daysOfInventory: number;     // DOI
  onShelfAvailability: number; // %
  pendingTransfers: number;    // transfer antar gudang menunggu armada
  pendingReceipts: number;     // PO menunggu pickup supplier

  // Manufacturing
  activeBatches: number;
  producedQtyMTD: number;
  fgReadyToDispatch: number;
  materialSupplyRequests: number;

  // Fleet ↔ Supply Chain
  productionShipmentsMTD: number;  // TMS shipments terkait produksi
  fleetFillRate: number;           // % delivered dari total shipments
}

// ============================================================================
// QUERY HELPERS (dipakai oleh API routes)
// ============================================================================

/**
 * Helper aman untuk menjalankan raw SQL. Jika sequelize tidak tersedia
 * (env dev tanpa db) atau query error, return default value.
 */
export async function safeQuery<T = any>(
  sequelize: any,
  sql: string,
  replacements?: Record<string, any>,
  defaultValue: T = [] as any
): Promise<T> {
  if (!sequelize) return defaultValue;
  try {
    const [rows] = await sequelize.query(sql, { replacements });
    return rows as T;
  } catch (e: any) {
    console.error('[FleetCC] Query error:', e?.message || e);
    return defaultValue;
  }
}

export async function safeQueryOne<T = any>(
  sequelize: any,
  sql: string,
  replacements?: Record<string, any>,
  defaultValue: T | null = null
): Promise<T | null> {
  const rows = await safeQuery<any[]>(sequelize, sql, replacements, []);
  return (rows && rows[0]) || defaultValue;
}

/**
 * Cek apakah tabel ada di database.
 */
export async function tableExists(sequelize: any, tableName: string): Promise<boolean> {
  if (!sequelize) return false;
  try {
    const [rows]: any = await sequelize.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = :name) AS ex`,
      { replacements: { name: tableName } }
    );
    return !!rows?.[0]?.ex;
  } catch {
    return false;
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const FLEET_MODULES = {
  FLEET: 'fleet',
  FMS: 'fms',
  TMS: 'tms',
} as const;

export const INTEGRATION_MODULES: Array<IntegrationStatus['module']> = [
  'driver_app',
  'hris',
  'finance',
  'inventory',
  'manufacturing',
  'pos',
  'procurement',
];

export const ALERT_SEVERITY_COLOR: Record<FleetAlert['severity'], string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
};

// ============================================================================
// MOCK DATA (fallback saat DB kosong / dev)
// ============================================================================

export const MOCK_KPI: FleetCommandKPI = {
  totalVehicles: 28,
  activeVehicles: 22,
  inMaintenance: 3,
  retiredVehicles: 3,
  fleetUtilization: 78,
  totalDrivers: 35,
  activeDrivers: 30,
  onDutyDrivers: 18,
  availableDrivers: 12,
  avgDriverScore: 85,
  totalShipments: 142,
  pendingShipments: 18,
  inTransitShipments: 24,
  deliveredToday: 36,
  activeTrips: 12,
  completedTripsMonth: 187,
  avgDeliveryTimeHours: 5.4,
  onTimeDeliveryRate: 91.2,
  fuelCostMTD: 85_000_000,
  maintenanceCostMTD: 42_000_000,
  totalOperationalCostMTD: 165_000_000,
  freightRevenueMTD: 320_000_000,
  outstandingFreightBills: 48_500_000,
  avgFuelEfficiency: 12.5,
  expiringDocs: 5,
  overdueInspections: 2,
  openIncidents: 1,
  overdueMaintenance: 3,
  activeViolations: 4,
};

export const MOCK_INTEGRATIONS: IntegrationStatus[] = [
  { module: 'driver_app', label: 'Aplikasi Driver', connected: true, linkedCount: 28, pendingSyncCount: 2, lastSyncAt: new Date().toISOString(), healthScore: 94 },
  { module: 'hris', label: 'HRIS & Kepegawaian', connected: true, linkedCount: 35, lastSyncAt: new Date().toISOString(), healthScore: 98 },
  { module: 'finance', label: 'Finance & Akuntansi', connected: true, linkedCount: 186, pendingSyncCount: 4, lastSyncAt: new Date().toISOString(), healthScore: 89 },
  { module: 'inventory', label: 'Inventory & Spare Part', connected: true, linkedCount: 312, lastSyncAt: new Date().toISOString(), healthScore: 91 },
  { module: 'manufacturing', label: 'Manufaktur & Produksi', connected: true, linkedCount: 24, lastSyncAt: new Date().toISOString(), healthScore: 87 },
  { module: 'pos', label: 'POS & Pesanan Outlet', connected: true, linkedCount: 24, lastSyncAt: new Date().toISOString(), healthScore: 85 },
  { module: 'procurement', label: 'Procurement & Supplier', connected: false, linkedCount: 0, healthScore: 0 },
];

export const MOCK_SUPPLY_CHAIN: SupplyChainKPI = {
  totalWarehouses: 4,
  totalStockValue: 1_250_000_000,
  inventoryTurnover: 2.3,
  daysOfInventory: 45.2,
  onShelfAvailability: 92,
  pendingTransfers: 6,
  pendingReceipts: 8,
  activeBatches: 5,
  producedQtyMTD: 1_820,
  fgReadyToDispatch: 3,
  materialSupplyRequests: 4,
  productionShipmentsMTD: 18,
  fleetFillRate: 94,
};
