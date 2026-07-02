import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import {
  FleetCommandKPI,
  FleetAlert,
  IntegrationStatus,
  MOCK_KPI,
  MOCK_INTEGRATIONS,
  safeQuery,
  safeQueryOne,
  tableExists,
} from '../../../../lib/fleet/commandCenter';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch {}

const ok = (res: NextApiResponse, data: any, extras: any = {}) =>
  res.json({ success: true, data, ...extras });
const err = (res: NextApiResponse, msg: string, code = 400) =>
  res.status(code).json({ success: false, error: msg });

/**
 * GET /api/hq/fleet/command-center?action=kpi
 *                                 ?action=alerts
 *                                 ?action=integrations
 *                                 ?action=overview   (all in one)
 *                                 ?action=cost-breakdown
 *                                 ?action=delivery-trend
 *                                 ?action=top-drivers
 *                                 ?action=top-vehicles
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return err(res, 'Unauthorized', 401);
    const tid = (session.user as any).tenantId || null;

    const action = (req.query.action as string) || 'overview';

    switch (action) {
      case 'overview': {
        const [kpi, alerts, integrations] = await Promise.all([
          buildKPI(tid),
          buildAlerts(tid),
          buildIntegrations(tid),
        ]);
        return ok(res, { kpi, alerts, integrations });
      }
      case 'kpi': return ok(res, await buildKPI(tid));
      case 'alerts': return ok(res, await buildAlerts(tid));
      case 'integrations': return ok(res, await buildIntegrations(tid));
      case 'cost-breakdown': return ok(res, await buildCostBreakdown(tid));
      case 'delivery-trend': return ok(res, await buildDeliveryTrend(tid));
      case 'top-drivers': return ok(res, await buildTopDrivers(tid));
      case 'top-vehicles': return ok(res, await buildTopVehicles(tid));
      case 'module-links': return ok(res, buildModuleLinks());
      case 'supply-chain-kpi': return ok(res, await buildSupplyChainKPI(tid));
      case 'production-flow': return ok(res, await buildProductionFlow(tid));
      case 'warehouse-network': return ok(res, await buildWarehouseNetwork(tid));
      default:
        return err(res, `Unknown action: ${action}`);
    }
  } catch (e: any) {
    console.error('[fleet/command-center] error:', e);
    return err(res, e?.message || 'Internal error', 500);
  }
}

// ============================================================================
// KPI AGGREGATION (FMS + TMS + Fleet legacy fallback)
// ============================================================================

async function buildKPI(tid: any): Promise<FleetCommandKPI> {
  if (!sequelize) return MOCK_KPI;

  const hasFmsVehicles = await tableExists(sequelize, 'fms_vehicles');
  const hasFleetVehicles = !hasFmsVehicles && (await tableExists(sequelize, 'fleet_vehicles'));
  const hasFmsDrivers = await tableExists(sequelize, 'fms_drivers');
  const hasFleetDrivers = !hasFmsDrivers && (await tableExists(sequelize, 'fleet_drivers'));
  const hasTmsShipments = await tableExists(sequelize, 'tms_shipments');
  const hasTmsTrips = await tableExists(sequelize, 'tms_trips');

  // --- Vehicles ---
  let vehicles: any = { total: 0, active: 0, maintenance: 0, retired: 0 };
  if (hasFmsVehicles) {
    vehicles = await safeQueryOne(
      sequelize,
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('active','available','in_use'))::int AS active,
         COUNT(*) FILTER (WHERE status = 'maintenance')::int AS maintenance,
         COUNT(*) FILTER (WHERE status = 'retired')::int AS retired
       FROM fms_vehicles WHERE tenant_id = :tid AND is_active = true`,
      { tid }, vehicles
    );
  } else if (hasFleetVehicles) {
    vehicles = await safeQueryOne(
      sequelize,
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'maintenance')::int AS maintenance,
         COUNT(*) FILTER (WHERE status = 'retired')::int AS retired
       FROM fleet_vehicles WHERE tenant_id = :tid`,
      { tid }, vehicles
    );
  }

  // --- Drivers ---
  let drivers: any = { total: 0, active: 0, on_duty: 0, available: 0, avg_score: 0 };
  if (hasFmsDrivers) {
    drivers = await safeQueryOne(
      sequelize,
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE availability = 'on_trip')::int AS on_duty,
         COUNT(*) FILTER (WHERE availability = 'available')::int AS available,
         COALESCE(AVG(safety_score), 0)::numeric(5,2) AS avg_score
       FROM fms_drivers WHERE tenant_id = :tid AND is_active = true`,
      { tid }, drivers
    );
  } else if (hasFleetDrivers) {
    drivers = await safeQueryOne(
      sequelize,
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE availability_status = 'on_duty')::int AS on_duty,
         COUNT(*) FILTER (WHERE availability_status = 'available')::int AS available,
         COALESCE(AVG(safety_score), 0)::numeric(5,2) AS avg_score
       FROM fleet_drivers WHERE tenant_id = :tid`,
      { tid }, drivers
    );
  }

  // --- Shipments (TMS) ---
  let ship: any = { total: 0, pending: 0, in_transit: 0, delivered_today: 0 };
  if (hasTmsShipments) {
    ship = await safeQueryOne(
      sequelize,
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('draft','confirmed'))::int AS pending,
         COUNT(*) FILTER (WHERE status IN ('picked_up','in_transit','arrived'))::int AS in_transit,
         COUNT(*) FILTER (WHERE status IN ('delivered','pod_received')
                          AND delivered_at::date = CURRENT_DATE)::int AS delivered_today
       FROM tms_shipments WHERE tenant_id = :tid`,
      { tid }, ship
    );
  }

  let trips: any = { active: 0, completed_month: 0, avg_delivery_hours: 0, on_time_rate: 0 };
  if (hasTmsTrips) {
    trips = await safeQueryOne(
      sequelize,
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('dispatched','in_progress'))::int AS active,
         COUNT(*) FILTER (WHERE status = 'completed'
                          AND completed_at >= date_trunc('month', CURRENT_DATE))::int AS completed_month,
         COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600.0)
                  FILTER (WHERE status = 'completed'), 0)::numeric(5,2) AS avg_delivery_hours
       FROM tms_trips WHERE tenant_id = :tid`,
      { tid }, trips
    );
    const otd = await safeQueryOne<any>(
      sequelize,
      `SELECT
         COALESCE(
           100.0 * COUNT(*) FILTER (WHERE status = 'completed' AND completed_at <= planned_end_at)
                / NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0), 0
         )::numeric(5,2) AS rate
       FROM tms_trips
       WHERE tenant_id = :tid AND completed_at >= CURRENT_DATE - INTERVAL '30 days'`,
      { tid }, null
    );
    trips.on_time_rate = Number(otd?.rate || 0);
  }

  // --- Financial ---
  let fuel: any = { cost_mtd: 0, efficiency: 0 };
  if (await tableExists(sequelize, 'fms_fuel_records')) {
    fuel = await safeQueryOne(
      sequelize,
      `SELECT
         COALESCE(SUM(total_cost), 0)::numeric AS cost_mtd,
         COALESCE(AVG(NULLIF(efficiency_km_per_liter, 0)), 0)::numeric(5,2) AS efficiency
       FROM fms_fuel_records
       WHERE tenant_id = :tid AND fill_date >= date_trunc('month', CURRENT_DATE)`,
      { tid }, fuel
    );
  }

  let maint: any = { cost_mtd: 0, overdue: 0 };
  if (await tableExists(sequelize, 'fms_maintenance_records')) {
    maint = await safeQueryOne(
      sequelize,
      `SELECT
         COALESCE(SUM(total_cost) FILTER (WHERE status = 'completed'
                 AND created_at >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS cost_mtd,
         COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_date < CURRENT_DATE)::int AS overdue
       FROM fms_maintenance_records WHERE tenant_id = :tid`,
      { tid }, maint
    );
  }

  let revenue: any = { mtd: 0, outstanding: 0 };
  if (await tableExists(sequelize, 'tms_freight_bills')) {
    revenue = await safeQueryOne(
      sequelize,
      `SELECT
         COALESCE(SUM(total_amount) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS mtd,
         COALESCE(SUM(balance_due) FILTER (WHERE payment_status IN ('unpaid','partial','overdue')), 0)::numeric AS outstanding
       FROM tms_freight_bills WHERE tenant_id = :tid`,
      { tid }, revenue
    );
  }

  // --- Compliance / Alerts Count ---
  const expDocs = await safeQueryOne<any>(
    sequelize,
    `SELECT COUNT(*)::int AS c FROM fms_documents
     WHERE tenant_id = :tid AND status = 'active'
       AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'`,
    { tid }, { c: 0 }
  );
  const overdueIns = await safeQueryOne<any>(
    sequelize,
    `SELECT COUNT(*)::int AS c FROM fms_inspections
     WHERE tenant_id = :tid AND status = 'scheduled' AND scheduled_date < CURRENT_DATE`,
    { tid }, { c: 0 }
  );
  const openInc = await safeQueryOne<any>(
    sequelize,
    `SELECT COUNT(*)::int AS c FROM fms_incidents WHERE tenant_id = :tid AND status = 'open'`,
    { tid }, { c: 0 }
  );
  const activeViol = await safeQueryOne<any>(
    sequelize,
    `SELECT COUNT(*)::int AS c FROM fms_incidents
     WHERE tenant_id = :tid AND incident_type IN ('speeding','harsh_braking','traffic_violation')
       AND incident_date >= CURRENT_DATE - INTERVAL '30 days'`,
    { tid }, { c: 0 }
  );

  const utilization = vehicles.total > 0
    ? Math.round(((vehicles.active || 0) / vehicles.total) * 100)
    : 0;
  const totalOpex = Number(fuel.cost_mtd || 0) + Number(maint.cost_mtd || 0);

  return {
    totalVehicles: Number(vehicles.total || 0),
    activeVehicles: Number(vehicles.active || 0),
    inMaintenance: Number(vehicles.maintenance || 0),
    retiredVehicles: Number(vehicles.retired || 0),
    fleetUtilization: utilization,
    totalDrivers: Number(drivers.total || 0),
    activeDrivers: Number(drivers.active || 0),
    onDutyDrivers: Number(drivers.on_duty || 0),
    availableDrivers: Number(drivers.available || 0),
    avgDriverScore: Number(drivers.avg_score || 0),
    totalShipments: Number(ship.total || 0),
    pendingShipments: Number(ship.pending || 0),
    inTransitShipments: Number(ship.in_transit || 0),
    deliveredToday: Number(ship.delivered_today || 0),
    activeTrips: Number(trips.active || 0),
    completedTripsMonth: Number(trips.completed_month || 0),
    avgDeliveryTimeHours: Number(trips.avg_delivery_hours || 0),
    onTimeDeliveryRate: Number(trips.on_time_rate || 0),
    fuelCostMTD: Number(fuel.cost_mtd || 0),
    maintenanceCostMTD: Number(maint.cost_mtd || 0),
    totalOperationalCostMTD: totalOpex,
    freightRevenueMTD: Number(revenue.mtd || 0),
    outstandingFreightBills: Number(revenue.outstanding || 0),
    avgFuelEfficiency: Number(fuel.efficiency || 0),
    expiringDocs: Number(expDocs?.c || 0),
    overdueInspections: Number(overdueIns?.c || 0),
    openIncidents: Number(openInc?.c || 0),
    overdueMaintenance: Number(maint.overdue || 0),
    activeViolations: Number(activeViol?.c || 0),
  };
}

// ============================================================================
// ALERTS
// ============================================================================

async function buildAlerts(tid: any): Promise<FleetAlert[]> {
  if (!sequelize) return [];
  const alerts: FleetAlert[] = [];

  if (await tableExists(sequelize, 'fms_documents')) {
    const docs = await safeQuery<any[]>(
      sequelize,
      `SELECT d.id, d.document_type, d.document_number, d.expiry_date, d.entity_type, d.entity_id,
              CASE WHEN d.entity_type='vehicle' THEN v.license_plate ELSE dr.full_name END AS entity_code
         FROM fms_documents d
         LEFT JOIN fms_vehicles v ON d.entity_type='vehicle' AND d.entity_id=v.id
         LEFT JOIN fms_drivers dr ON d.entity_type='driver' AND d.entity_id=dr.id
        WHERE d.tenant_id = :tid AND d.status='active'
          AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY d.expiry_date ASC LIMIT 20`,
      { tid }, []
    );
    for (const d of docs) {
      const days = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / 86400000);
      alerts.push({
        id: `doc-${d.id}`,
        severity: days < 0 ? 'critical' : days <= 7 ? 'critical' : 'warning',
        type: 'doc_expiring',
        title: `Dokumen ${d.document_type} akan/telah expired`,
        description: `${d.entity_code || '-'} · ${d.document_number || ''} ${days < 0 ? `(lewat ${Math.abs(days)} hari)` : `(${days} hari lagi)`}`,
        entityType: d.entity_type,
        entityId: d.entity_id,
        entityCode: d.entity_code,
        dueDate: d.expiry_date,
        actionUrl: `/hq/fms?tab=documents`,
      });
    }
  }

  if (await tableExists(sequelize, 'fms_maintenance_records')) {
    const m = await safeQuery<any[]>(
      sequelize,
      `SELECT mr.id, mr.work_order_number, mr.maintenance_type, mr.scheduled_date, v.license_plate
         FROM fms_maintenance_records mr
         LEFT JOIN fms_vehicles v ON v.id = mr.vehicle_id
        WHERE mr.tenant_id = :tid AND mr.status = 'scheduled'
          AND mr.scheduled_date <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY mr.scheduled_date ASC LIMIT 15`,
      { tid }, []
    );
    for (const r of m) {
      const days = Math.ceil((new Date(r.scheduled_date).getTime() - Date.now()) / 86400000);
      alerts.push({
        id: `maint-${r.id}`,
        severity: days < 0 ? 'critical' : days <= 2 ? 'warning' : 'info',
        type: 'maintenance_due',
        title: `Perawatan ${r.maintenance_type} terjadwal`,
        description: `${r.license_plate || '-'} · WO ${r.work_order_number || '-'} ${days < 0 ? `(telat ${Math.abs(days)} hari)` : `(${days} hari lagi)`}`,
        dueDate: r.scheduled_date,
        actionUrl: `/hq/fms?tab=maintenance`,
      });
    }
  }

  if (await tableExists(sequelize, 'fms_incidents')) {
    const inc = await safeQuery<any[]>(
      sequelize,
      `SELECT i.id, i.incident_number, i.incident_type, i.severity, i.incident_date, v.license_plate
         FROM fms_incidents i LEFT JOIN fms_vehicles v ON v.id = i.vehicle_id
        WHERE i.tenant_id = :tid AND i.status = 'open'
        ORDER BY i.incident_date DESC LIMIT 10`,
      { tid }, []
    );
    for (const r of inc) {
      alerts.push({
        id: `inc-${r.id}`,
        severity: r.severity === 'high' ? 'critical' : 'warning',
        type: 'incident_open',
        title: `Insiden terbuka: ${r.incident_type}`,
        description: `${r.license_plate || '-'} · ${r.incident_number || ''}`,
        dueDate: r.incident_date,
        actionUrl: `/hq/fms?tab=incidents`,
      });
    }
  }

  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 } as const;
    return order[a.severity] - order[b.severity];
  });
}

// ============================================================================
// INTEGRATIONS STATUS
// ============================================================================

async function buildIntegrations(tid: any): Promise<IntegrationStatus[]> {
  if (!sequelize) return MOCK_INTEGRATIONS;
  const list: IntegrationStatus[] = [];

  // --- Driver App ---
  const hasDriverAccounts = await tableExists(sequelize, 'driver_accounts');
  const driverLinked = hasDriverAccounts
    ? Number((await safeQueryOne<any>(sequelize,
        `SELECT COUNT(*)::int c FROM driver_accounts WHERE tenant_id = :tid AND is_active = true`,
        { tid }, { c: 0 }))?.c || 0)
    : 0;
  list.push({
    module: 'driver_app',
    label: 'Aplikasi Driver',
    connected: hasDriverAccounts && driverLinked > 0,
    linkedCount: driverLinked,
    pendingSyncCount: 0,
    lastSyncAt: new Date().toISOString(),
    healthScore: hasDriverAccounts ? Math.min(100, driverLinked * 4 + 60) : 0,
  });

  // --- HRIS (employees linked to drivers) ---
  const hasEmployees = await tableExists(sequelize, 'employees');
  const hasFmsDrivers = await tableExists(sequelize, 'fms_drivers');
  let empLinked = 0;
  if (hasEmployees && hasFmsDrivers) {
    const r = await safeQueryOne<any>(
      sequelize,
      `SELECT COUNT(*)::int c FROM fms_drivers
        WHERE tenant_id = :tid AND employee_id IS NOT NULL`,
      { tid }, { c: 0 }
    );
    empLinked = Number(r?.c || 0);
  }
  list.push({
    module: 'hris',
    label: 'HRIS & Kepegawaian',
    connected: hasEmployees,
    linkedCount: empLinked,
    lastSyncAt: new Date().toISOString(),
    healthScore: hasEmployees ? 95 : 0,
  });

  // --- Finance (journal entries from fuel/maintenance cost records) ---
  const hasJournal = await tableExists(sequelize, 'finance_journal_entries');
  const hasCostRecords = await tableExists(sequelize, 'fms_cost_records');
  const costCount = hasCostRecords
    ? Number((await safeQueryOne<any>(sequelize,
        `SELECT COUNT(*)::int c FROM fms_cost_records WHERE tenant_id = :tid`,
        { tid }, { c: 0 }))?.c || 0)
    : 0;
  list.push({
    module: 'finance',
    label: 'Finance & Akuntansi',
    connected: hasJournal,
    linkedCount: costCount,
    pendingSyncCount: 0,
    lastSyncAt: new Date().toISOString(),
    healthScore: hasJournal ? 90 : 0,
  });

  // --- Inventory (spare parts via products / stock_movements) ---
  const hasInv = await tableExists(sequelize, 'inventory_stock');
  const hasProducts = await tableExists(sequelize, 'products');
  let spareParts = 0;
  if (hasProducts) {
    const r = await safeQueryOne<any>(
      sequelize,
      `SELECT COUNT(*)::int c FROM products
        WHERE tenant_id = :tid AND LOWER(COALESCE(category_path,'') || ' ' || COALESCE(name,'')) ~ 'spare|oli|ban|tire|filter'`,
      { tid }, { c: 0 }
    );
    spareParts = Number(r?.c || 0);
  }
  list.push({
    module: 'inventory',
    label: 'Inventory & Spare Part',
    connected: hasInv && hasProducts,
    linkedCount: spareParts,
    lastSyncAt: new Date().toISOString(),
    healthScore: (hasInv && hasProducts) ? 88 : 0,
  });

  // --- POS (shipments linked to outlet orders) ---
  const hasShipments = await tableExists(sequelize, 'tms_shipments');
  let shipLinked = 0;
  if (hasShipments) {
    const r = await safeQueryOne<any>(
      sequelize,
      `SELECT COUNT(*)::int c FROM tms_shipments
        WHERE tenant_id = :tid AND source_order_id IS NOT NULL`,
      { tid }, { c: 0 }
    );
    shipLinked = Number(r?.c || 0);
  }
  list.push({
    module: 'pos',
    label: 'POS & Pesanan Outlet',
    connected: hasShipments,
    linkedCount: shipLinked,
    lastSyncAt: new Date().toISOString(),
    healthScore: hasShipments ? 82 : 0,
  });

  // --- Manufacturing (production batches linked to fleet shipments) ---
  const hasProd = await tableExists(sequelize, 'productions');
  let mfgLinked = 0;
  let mfgPending = 0;
  if (hasProd) {
    const r = await safeQueryOne<any>(
      sequelize,
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('planned','in_progress'))::int AS pending
         FROM productions`,
      {}, { total: 0, pending: 0 }
    );
    mfgLinked = Number(r?.total || 0);
    mfgPending = Number(r?.pending || 0);
  }
  list.push({
    module: 'manufacturing',
    label: 'Manufaktur & Produksi',
    connected: hasProd,
    linkedCount: mfgLinked,
    pendingSyncCount: mfgPending,
    lastSyncAt: new Date().toISOString(),
    healthScore: hasProd ? (mfgLinked > 0 ? 88 : 70) : 0,
  });

  // --- Procurement (PO for fleet assets) ---
  const hasPO = await tableExists(sequelize, 'purchase_orders');
  let poCount = 0;
  if (hasPO) {
    const r = await safeQueryOne<any>(
      sequelize,
      `SELECT COUNT(*)::int c FROM purchase_orders WHERE tenant_id = :tid`,
      { tid }, { c: 0 }
    );
    poCount = Number(r?.c || 0);
  }
  list.push({
    module: 'procurement',
    label: 'Procurement & Supplier',
    connected: hasPO,
    linkedCount: poCount,
    lastSyncAt: hasPO ? new Date().toISOString() : null,
    healthScore: hasPO ? 72 : 0,
  });

  return list;
}

// ============================================================================
// SUPPLY CHAIN KPI (Inventory + Manufacturing + Fleet)
// ============================================================================

async function buildSupplyChainKPI(tid: any) {
  if (!sequelize) {
    const { MOCK_SUPPLY_CHAIN } = await import('../../../../lib/fleet/commandCenter');
    return MOCK_SUPPLY_CHAIN;
  }

  const hasWh = await tableExists(sequelize, 'warehouses');
  const hasStock = await tableExists(sequelize, 'inventory_stock');
  const hasProd = await tableExists(sequelize, 'productions');
  const hasMat = await tableExists(sequelize, 'production_materials');
  const hasShip = await tableExists(sequelize, 'tms_shipments');
  const hasTransfer = await tableExists(sequelize, 'inventory_transfers');
  const hasPO = await tableExists(sequelize, 'purchase_orders');
  const hasMovements = await tableExists(sequelize, 'stock_movements');

  // Warehouse + stock value
  let totalWarehouses = 0;
  let totalStockValue = 0;
  if (hasWh) {
    const r: any = await safeQueryOne(sequelize,
      `SELECT COUNT(*)::int c FROM warehouses WHERE tenant_id = :tid AND is_active = true`,
      { tid }, { c: 0 });
    totalWarehouses = Number(r?.c || 0);
  }
  if (hasStock) {
    const r: any = await safeQueryOne(sequelize,
      `SELECT COALESCE(SUM(s.quantity * COALESCE(p.cost_price, 0)), 0)::numeric AS v
         FROM inventory_stock s LEFT JOIN products p ON p.id = s.product_id
        WHERE s.tenant_id = :tid`, { tid }, { v: 0 });
    totalStockValue = Number(r?.v || 0);
  }

  // Turnover / DOI
  let turnover = 0;
  let doi = 0;
  if (hasStock && hasMovements) {
    const r: any = await safeQueryOne(sequelize,
      `SELECT
         (SELECT COALESCE(SUM(quantity),0) FROM stock_movements
           WHERE tenant_id = :tid AND movement_type = 'out'
             AND created_at >= CURRENT_DATE - INTERVAL '30 days')::numeric AS outflow,
         (SELECT COALESCE(SUM(quantity),0) FROM inventory_stock WHERE tenant_id = :tid)::numeric AS stock`,
      { tid }, { outflow: 0, stock: 0 });
    const outflow = Number(r?.outflow || 0);
    const stock = Number(r?.stock || 0);
    turnover = stock > 0 ? Number((outflow / stock).toFixed(2)) : 0;
    doi = outflow > 0 ? Number((stock / (outflow / 30)).toFixed(1)) : 0;
  }

  // Availability
  let availability = 0;
  if (hasStock) {
    const r: any = await safeQueryOne(sequelize,
      `SELECT
         COUNT(*) FILTER (WHERE inner_stock > COALESCE(rp, 0))::int AS ok,
         COUNT(*)::int AS total
       FROM (
         SELECT p.id, COALESCE(SUM(s.quantity),0) AS inner_stock, p.reorder_point AS rp
           FROM products p LEFT JOIN inventory_stock s ON s.product_id = p.id
          WHERE p.tenant_id = :tid AND p.is_active = true
          GROUP BY p.id, p.reorder_point
       ) x`, { tid }, { ok: 0, total: 0 });
    availability = r?.total > 0 ? Math.round((r.ok / r.total) * 100) : 0;
  }

  const pendingTransfers = hasTransfer
    ? Number((await safeQueryOne<any>(sequelize,
        `SELECT COUNT(*)::int c FROM inventory_transfers
          WHERE tenant_id = :tid AND status IN ('draft','pending','approved','in_transit')`,
        { tid }, { c: 0 }))?.c || 0)
    : 0;

  const pendingReceipts = hasPO
    ? Number((await safeQueryOne<any>(sequelize,
        `SELECT COUNT(*)::int c FROM purchase_orders
          WHERE tenant_id = :tid AND status IN ('draft','approved','sent','partial_received')`,
        { tid }, { c: 0 }))?.c || 0)
    : 0;

  // Manufacturing
  let activeBatches = 0, producedQty = 0, fgReady = 0, matReq = 0;
  if (hasProd) {
    const r: any = await safeQueryOne(sequelize,
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('planned','in_progress'))::int AS active,
         COALESCE(SUM(produced_quantity) FILTER (WHERE completion_time >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS qty
       FROM productions`, {}, { active: 0, qty: 0 });
    activeBatches = Number(r?.active || 0);
    producedQty = Number(r?.qty || 0);

    fgReady = hasShip
      ? Number((await safeQueryOne<any>(sequelize,
          `SELECT COUNT(*)::int c FROM productions
            WHERE status = 'completed'
              AND completion_time >= CURRENT_DATE - INTERVAL '7 days'
              AND NOT EXISTS (SELECT 1 FROM tms_shipments s WHERE s.source_order_id = 'mfg-' || productions.id::text)`,
          {}, { c: 0 }))?.c || 0)
      : 0;

    matReq = hasMat
      ? Number((await safeQueryOne<any>(sequelize,
          `SELECT COUNT(*)::int c FROM production_materials pm
             JOIN productions p ON p.id = pm.production_id
            WHERE p.status IN ('planned','in_progress') AND pm.used_quantity < pm.planned_quantity`,
          {}, { c: 0 }))?.c || 0)
      : 0;
  }

  // Fleet supply chain metrics
  let prodShipments = 0;
  let fillRate = 0;
  if (hasShip) {
    prodShipments = Number((await safeQueryOne<any>(sequelize,
      `SELECT COUNT(*)::int c FROM tms_shipments
        WHERE tenant_id = :tid
          AND (source_order_id LIKE 'mfg-%' OR source_order_id LIKE 'inv-trf-%' OR source_order_id LIKE 'po-%')
          AND created_at >= date_trunc('month', CURRENT_DATE)`,
      { tid }, { c: 0 }))?.c || 0);

    const r: any = await safeQueryOne(sequelize,
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('delivered','pod_received'))::int AS delivered,
         COUNT(*)::int AS total
       FROM tms_shipments
      WHERE tenant_id = :tid AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
      { tid }, { delivered: 0, total: 0 });
    fillRate = r?.total > 0 ? Math.round((r.delivered / r.total) * 100) : 0;
  }

  return {
    totalWarehouses,
    totalStockValue,
    inventoryTurnover: turnover,
    daysOfInventory: doi,
    onShelfAvailability: availability,
    pendingTransfers,
    pendingReceipts,
    activeBatches,
    producedQtyMTD: producedQty,
    fgReadyToDispatch: fgReady,
    materialSupplyRequests: matReq,
    productionShipmentsMTD: prodShipments,
    fleetFillRate: fillRate,
  };
}

// ============================================================================
// PRODUCTION FLOW (Raw → Batch → FG → Shipment)
// ============================================================================

async function buildProductionFlow(_tid: any) {
  if (!sequelize || !(await tableExists(sequelize, 'productions'))) {
    return {
      rawMaterialRequests: 4,
      batchesInProgress: 5,
      fgReadyToShip: 3,
      shipmentsInTransit: 2,
      completedThisWeek: 12,
    };
  }

  const raw: any = await safeQueryOne(sequelize,
    `SELECT COUNT(*)::int c FROM production_materials pm
       JOIN productions p ON p.id = pm.production_id
      WHERE p.status IN ('planned','in_progress') AND pm.used_quantity < pm.planned_quantity`,
    {}, { c: 0 });

  const batch: any = await safeQueryOne(sequelize,
    `SELECT COUNT(*)::int c FROM productions WHERE status = 'in_progress'`,
    {}, { c: 0 });

  const fg: any = await safeQueryOne(sequelize,
    `SELECT COUNT(*)::int c FROM productions
      WHERE status = 'completed'
        AND completion_time >= CURRENT_DATE - INTERVAL '7 days'`,
    {}, { c: 0 });

  const transit: any = (await tableExists(sequelize, 'tms_shipments'))
    ? await safeQueryOne(sequelize,
        `SELECT COUNT(*)::int c FROM tms_shipments
          WHERE source_order_id LIKE 'mfg-%'
            AND status IN ('picked_up','in_transit','arrived')`,
        {}, { c: 0 })
    : { c: 0 };

  const done: any = await safeQueryOne(sequelize,
    `SELECT COUNT(*)::int c FROM productions
      WHERE status = 'completed' AND completion_time >= CURRENT_DATE - INTERVAL '7 days'`,
    {}, { c: 0 });

  return {
    rawMaterialRequests: Number(raw?.c || 0),
    batchesInProgress: Number(batch?.c || 0),
    fgReadyToShip: Number(fg?.c || 0),
    shipmentsInTransit: Number(transit?.c || 0),
    completedThisWeek: Number(done?.c || 0),
  };
}

// ============================================================================
// WAREHOUSE NETWORK (gudang + kaitan transfer antar cabang)
// ============================================================================

async function buildWarehouseNetwork(tid: any) {
  if (!sequelize || !(await tableExists(sequelize, 'warehouses'))) {
    return { nodes: [], edges: [] };
  }

  const nodes = await safeQuery<any[]>(sequelize,
    `SELECT w.id, w.name, w.code, w.city, w.address,
            COALESCE(SUM(s.quantity), 0)::numeric AS stock_qty,
            COALESCE(SUM(s.quantity * COALESCE(p.cost_price, 0)), 0)::numeric AS stock_value
       FROM warehouses w
       LEFT JOIN inventory_stock s ON s.location_id = w.id
       LEFT JOIN products p ON p.id = s.product_id
      WHERE w.tenant_id = :tid AND w.is_active = true
      GROUP BY w.id ORDER BY w.name`,
    { tid }, []);

  const edges = (await tableExists(sequelize, 'inventory_transfers'))
    ? await safeQuery<any[]>(sequelize,
        `SELECT from_warehouse_id AS source, to_warehouse_id AS target,
                COUNT(*)::int AS transfer_count
           FROM inventory_transfers
          WHERE tenant_id = :tid AND created_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY from_warehouse_id, to_warehouse_id`,
        { tid }, [])
    : [];

  return { nodes, edges };
}

// ============================================================================
// CHART DATA
// ============================================================================

async function buildCostBreakdown(tid: any) {
  if (!sequelize) {
    return [
      { category: 'Bahan Bakar', amount: 85_000_000 },
      { category: 'Pemeliharaan', amount: 42_000_000 },
      { category: 'Ban', amount: 12_000_000 },
      { category: 'Asuransi', amount: 8_000_000 },
      { category: 'Pajak/STNK', amount: 5_500_000 },
      { category: 'Parkir/Tol', amount: 4_200_000 },
      { category: 'Lainnya', amount: 8_300_000 },
    ];
  }
  const rows = await safeQuery<any[]>(
    sequelize,
    `SELECT cost_category AS category, COALESCE(SUM(amount), 0)::numeric AS amount
       FROM fms_cost_records
      WHERE tenant_id = :tid AND cost_date >= date_trunc('month', CURRENT_DATE)
      GROUP BY cost_category ORDER BY amount DESC`,
    { tid }, []
  );
  return rows.map(r => ({ category: r.category, amount: Number(r.amount) }));
}

async function buildDeliveryTrend(tid: any) {
  if (!sequelize || !(await tableExists(sequelize, 'tms_shipments'))) {
    return Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10),
      delivered: Math.floor(Math.random() * 30) + 20,
      pending: Math.floor(Math.random() * 12),
    }));
  }
  const rows = await safeQuery<any[]>(
    sequelize,
    `SELECT to_char(created_at::date, 'YYYY-MM-DD') AS date,
            COUNT(*) FILTER (WHERE status IN ('delivered','pod_received'))::int AS delivered,
            COUNT(*) FILTER (WHERE status IN ('draft','confirmed','assigned'))::int AS pending
       FROM tms_shipments
      WHERE tenant_id = :tid AND created_at >= CURRENT_DATE - INTERVAL '14 days'
      GROUP BY date ORDER BY date`,
    { tid }, []
  );
  return rows;
}

async function buildTopDrivers(tid: any) {
  if (!sequelize || !(await tableExists(sequelize, 'fms_drivers'))) {
    return [
      { name: 'Agus Setiawan', score: 95, trips: 142, onTimeRate: 96 },
      { name: 'Bambang Suryadi', score: 92, trips: 128, onTimeRate: 93 },
      { name: 'Galih Permana', score: 90, trips: 115, onTimeRate: 91 },
      { name: 'Dedi Kurniawan', score: 88, trips: 108, onTimeRate: 89 },
      { name: 'Eka Pratama', score: 86, trips: 98, onTimeRate: 88 },
    ];
  }
  const rows = await safeQuery<any[]>(
    sequelize,
    `SELECT full_name AS name, safety_score AS score, total_trips AS trips,
            CASE WHEN total_trips > 0 THEN ROUND(100.0 * on_time_trips / total_trips, 1) ELSE 0 END AS "onTimeRate"
       FROM fms_drivers
      WHERE tenant_id = :tid AND is_active = true
      ORDER BY safety_score DESC NULLS LAST LIMIT 10`,
    { tid }, []
  );
  return rows;
}

async function buildTopVehicles(tid: any) {
  if (!sequelize || !(await tableExists(sequelize, 'fms_vehicles'))) {
    return [
      { plate: 'B 1234 ABC', utilization: 92, cost: 8_500_000, trips: 48 },
      { plate: 'B 5678 DEF', utilization: 89, cost: 7_200_000, trips: 42 },
      { plate: 'D 9012 GHI', utilization: 85, cost: 6_800_000, trips: 38 },
    ];
  }
  const rows = await safeQuery<any[]>(
    sequelize,
    `SELECT v.license_plate AS plate,
            COALESCE(SUM(c.amount), 0)::numeric AS cost,
            v.current_odometer_km AS odometer
       FROM fms_vehicles v
       LEFT JOIN fms_cost_records c
         ON c.vehicle_id = v.id
        AND c.cost_date >= date_trunc('month', CURRENT_DATE)
      WHERE v.tenant_id = :tid AND v.is_active = true
      GROUP BY v.id, v.license_plate, v.current_odometer_km
      ORDER BY cost DESC LIMIT 10`,
    { tid }, []
  );
  return rows;
}

// ============================================================================
// MODULE LINKS (quick-access shortcut tiles)
// ============================================================================

function buildModuleLinks() {
  return {
    operations: [
      { id: 'vehicles', label: 'Kendaraan', href: '/hq/fms?tab=vehicles', icon: 'Truck' },
      { id: 'drivers', label: 'Pengemudi', href: '/hq/fms?tab=drivers', icon: 'Users' },
      { id: 'maintenance', label: 'Pemeliharaan', href: '/hq/fms?tab=maintenance', icon: 'Wrench' },
      { id: 'fuel', label: 'BBM', href: '/hq/fms?tab=fuel', icon: 'Fuel' },
      { id: 'inspections', label: 'Inspeksi', href: '/hq/fms?tab=inspections', icon: 'ClipboardList' },
      { id: 'incidents', label: 'Insiden', href: '/hq/fms?tab=incidents', icon: 'AlertTriangle' },
    ],
    tracking: [
      { id: 'gps', label: 'GPS Live', href: '/hq/fms?tab=gps', icon: 'Navigation' },
      { id: 'live', label: 'Peta Live', href: '/hq/fleet/live', icon: 'Zap' },
      { id: 'tracking', label: 'Pelacakan Pengiriman', href: '/hq/tms?tab=tracking', icon: 'Activity' },
      { id: 'geofences', label: 'Geofence', href: '/hq/fms?tab=geofences', icon: 'Crosshair' },
      { id: 'violations', label: 'Pelanggaran', href: '/hq/fms?tab=violations', icon: 'Zap' },
    ],
    transport: [
      { id: 'shipments', label: 'Pengiriman', href: '/hq/tms?tab=shipments', icon: 'Package' },
      { id: 'trips', label: 'Perjalanan', href: '/hq/tms?tab=trips', icon: 'Navigation' },
      { id: 'dispatch', label: 'Dispatch', href: '/hq/tms?tab=dispatch', icon: 'Send' },
      { id: 'carriers', label: 'Pengangkut', href: '/hq/tms?tab=carriers', icon: 'Building2' },
      { id: 'routes', label: 'Rute', href: '/hq/tms?tab=routes', icon: 'MapPin' },
      { id: 'sla', label: 'SLA', href: '/hq/tms?tab=delivery-sla', icon: 'Timer' },
    ],
    analytics: [
      { id: 'fleet-analytics', label: 'Analitik Armada', href: '/hq/fms?tab=analytics', icon: 'BarChart3' },
      { id: 'kpi-legacy', label: 'KPI Armada', href: '/hq/fleet/kpi', icon: 'Target' },
      { id: 'leaderboard', label: 'Leaderboard Driver', href: '/hq/fleet/leaderboard', icon: 'Award' },
      { id: 'carrier-scores', label: 'Skor Pengangkut', href: '/hq/tms?tab=carrier-scores', icon: 'Star' },
      { id: 'logistics-kpi', label: 'KPI Logistik', href: '/hq/tms?tab=logistics-analytics', icon: 'BarChart3' },
      { id: 'tires', label: 'Manajemen Ban', href: '/hq/fms?tab=tires', icon: 'Disc' },
    ],
    financial: [
      { id: 'costs', label: 'Biaya Armada', href: '/hq/fms?tab=costs', icon: 'DollarSign' },
      { id: 'expenses', label: 'Reimbursement Driver', href: '/hq/fleet/expenses', icon: 'Wallet' },
      { id: 'billing', label: 'Freight Billing', href: '/hq/tms?tab=billing', icon: 'Receipt' },
      { id: 'rate-cards', label: 'Tarif', href: '/hq/tms?tab=rate-cards', icon: 'CreditCard' },
      { id: 'rentals', label: 'Penyewaan', href: '/hq/fms?tab=rentals', icon: 'KeyRound' },
    ],
    admin: [
      { id: 'documents', label: 'Dokumen', href: '/hq/fms?tab=documents', icon: 'FileText' },
      { id: 'reminders', label: 'Pengingat', href: '/hq/fms?tab=reminders', icon: 'Bell' },
      { id: 'zones', label: 'Zona', href: '/hq/tms?tab=zones', icon: 'Globe' },
      { id: 'warehouses', label: 'Gudang', href: '/hq/tms?tab=warehouses', icon: 'Warehouse' },
    ],
    supplyChain: [
      { id: 'manufacturing', label: 'Manufaktur', href: '/hq/manufacturing', icon: 'Factory' },
      { id: 'inventory', label: 'Inventory', href: '/hq/inventory', icon: 'Package' },
      { id: 'warehouses-inv', label: 'Gudang', href: '/hq/inventory/warehouses', icon: 'Warehouse' },
      { id: 'procurement', label: 'Procurement', href: '/hq/procurement', icon: 'ShoppingCart' },
      { id: 'transfers', label: 'Transfer Stok', href: '/hq/inventory/transfers', icon: 'ArrowRightLeft' },
      { id: 'receipts', label: 'Penerimaan', href: '/hq/procurement/receipts', icon: 'Inbox' },
    ],
  };
}
