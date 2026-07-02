import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { logAudit } from '@/lib/audit/auditLogger';
import { safeQuery, safeQueryOne, tableExists } from '../../../../../lib/fleet/commandCenter';

let sequelize: any = null;
try { sequelize = require('../../../../../lib/sequelize'); } catch {}

const ok = (res: NextApiResponse, data: any) => res.json({ success: true, data });
const err = (res: NextApiResponse, msg: string, code = 400) =>
  res.status(code).json({ success: false, error: msg });

/**
 * Manufacturing ↔ Fleet Integration
 *
 * Alur:
 *   [Raw Material in Warehouse]
 *           │  (TMS shipment: supply)
 *           ▼
 *   [Production Batch @ Pabrik]
 *           │  (Status → completed)
 *           ▼
 *   [Finished Goods Queue]
 *           │  (Fleet dispatch → outlet/customer)
 *           ▼
 *   [Delivery & POD]
 *
 * Actions (GET):
 *   summary               → KPI manufaktur + supply chain
 *   active-batches        → Batch produksi yg sedang berjalan
 *   fg-ready-to-dispatch  → FG selesai & siap dikirim via TMS
 *   material-supply-queue → Bahan baku yg butuh dikirim ke pabrik
 *   production-shipments  → TMS shipments yg terhubung ke production batch
 *   capacity-vs-output    → Kapasitas armada vs output produksi (7d)
 *   output-by-product     → Output per produk (30d)
 *
 * Actions (POST):
 *   create-fg-shipment    → Create TMS shipment dari batch produksi
 *   request-material-delivery → Request TMS trip utk supply bahan baku
 *   link-vehicle-to-batch → Link vehicle ke production batch (untuk inbound supply)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return err(res, 'Unauthorized', 401);
    const tid = (session.user as any).tenantId || null;
    const uid = (session.user as any).id;
    const uname = (session.user as any).name || '';
    const action = (req.query.action as string) || 'summary';

    if (req.method === 'POST') {
      if (action === 'create-fg-shipment') {
        const b = req.body || {};
        const {
          productionId, destinationWarehouseId, destinationAddress,
          customerName, assignedVehicleId, assignedDriverId, priority,
        } = b;
        if (!productionId) return err(res, 'productionId wajib');
        if (!(await tableExists(sequelize, 'tms_shipments'))) {
          return err(res, 'TMS shipments tidak tersedia', 412);
        }
        const prod = await safeQueryOne<any>(sequelize,
          `SELECT p.*, pr.name AS product_name, r.name AS recipe_name
             FROM productions p
             LEFT JOIN products pr ON pr.id = p.product_id
             LEFT JOIN recipes r ON r.id = p.recipe_id
            WHERE p.id = :pid`, { pid: productionId });
        if (!prod) return err(res, 'Production batch tidak ditemukan', 404);
        const shipmentNo = `MFG-FG-${Date.now()}`;
        const [row]: any = await sequelize.query(
          `INSERT INTO tms_shipments
             (tenant_id, shipment_number, status, priority, customer_name,
              origin_address, destination_address,
              assigned_vehicle_id, assigned_driver_id,
              total_weight_kg, source_order_id, notes, created_by, created_at, updated_at)
           VALUES (:tid, :no, 'draft', :pri, :cust,
              'Pabrik / Warehouse Produksi', :dest,
              :vid, :did,
              :qty, :src, :note, :uid, NOW(), NOW())
           RETURNING id, shipment_number`,
          { replacements: {
              tid, no: shipmentNo, pri: priority || 'normal',
              cust: customerName || '-',
              dest: destinationAddress || 'TBD',
              vid: assignedVehicleId || null,
              did: assignedDriverId || null,
              qty: prod.produced_quantity || prod.planned_quantity,
              src: `mfg-${productionId}`,
              note: `Dispatch FG dari batch ${prod.batch_number} (${prod.product_name || prod.recipe_name})`,
              uid
            } }
        );
        const shipmentId = row?.[0]?.id;
        logAudit({ tenantId: tid, userId: uid, userName: uname, action: 'create' as any,
                   entityType: 'tms_shipments', entityId: shipmentId,
                   newValues: { productionId, shipmentNo }, req }).catch(() => {});
        return ok(res, { id: shipmentId, shipmentNumber: shipmentNo });
      }

      if (action === 'request-material-delivery') {
        const b = req.body || {};
        const { productionId, fromWarehouseId, materials, assignedVehicleId, assignedDriverId } = b;
        if (!productionId || !Array.isArray(materials) || !materials.length) {
          return err(res, 'productionId dan materials wajib');
        }
        if (!(await tableExists(sequelize, 'tms_shipments'))) return err(res, 'TMS tidak tersedia', 412);
        const shipmentNo = `MFG-RM-${Date.now()}`;
        const totalWeight = materials.reduce((sum: number, m: any) =>
          sum + Number(m.quantity || 0) * Number(m.weightKg || 1), 0);
        const [row]: any = await sequelize.query(
          `INSERT INTO tms_shipments
             (tenant_id, shipment_number, status, priority, customer_name,
              origin_address, destination_address,
              assigned_vehicle_id, assigned_driver_id,
              total_weight_kg, source_order_id, notes, created_by, created_at, updated_at)
           VALUES (:tid, :no, 'draft', 'high', 'Internal — Produksi',
              'Warehouse Supply', 'Pabrik / Warehouse Produksi',
              :vid, :did, :qty, :src, :note, :uid, NOW(), NOW())
           RETURNING id`,
          { replacements: {
              tid, no: shipmentNo,
              vid: assignedVehicleId || null,
              did: assignedDriverId || null,
              qty: totalWeight,
              src: `mfg-rm-${productionId}`,
              note: `Supply bahan baku utk production batch ${productionId}`,
              uid
            } }
        );
        logAudit({ tenantId: tid, userId: uid, userName: uname, action: 'create' as any,
                   entityType: 'tms_shipments_material_supply',
                   entityId: row?.[0]?.id, newValues: b, req }).catch(() => {});
        return ok(res, { id: row?.[0]?.id, shipmentNumber: shipmentNo });
      }

      if (action === 'link-vehicle-to-batch') {
        const { productionId, vehicleId, driverId, note } = req.body || {};
        if (!productionId || !vehicleId) return err(res, 'productionId & vehicleId wajib');
        await sequelize.query(
          `INSERT INTO production_history (production_id, action_type, previous_status, new_status, changed_by, notes, created_at)
           VALUES (:pid, 'updated', NULL, NULL, :uid, :note, NOW())`,
          { replacements: { pid: productionId, uid, note: note || `Linked vehicle ${vehicleId}, driver ${driverId || '-'}` } }
        ).catch(() => {});
        logAudit({ tenantId: tid, userId: uid, userName: uname, action: 'update' as any,
                   entityType: 'production_fleet_link', entityId: productionId,
                   newValues: { vehicleId, driverId }, req }).catch(() => {});
        return ok(res, { success: true });
      }

      return err(res, `Unknown POST action: ${action}`);
    }

    switch (action) {
      // ═══════════════════════════════════════════════════════════════
      case 'summary': {
        const hasProd = await tableExists(sequelize, 'productions');
        const hasMat = await tableExists(sequelize, 'production_materials');
        const hasShip = await tableExists(sequelize, 'tms_shipments');

        if (!hasProd) {
          return ok(res, {
            totalBatches: 0, activeBatches: 0, completedToday: 0, plannedQty: 0,
            producedQty: 0, avgCompletionHours: 0, totalMaterialCost: 0,
            fgReadyToDispatch: 0, materialRequests: 0, productionShipments: 0,
            hasIntegration: false,
          });
        }

        const batches: any = await safeQueryOne(sequelize,
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status IN ('planned','in_progress'))::int AS active,
             COUNT(*) FILTER (WHERE status='completed' AND DATE(completion_time)=CURRENT_DATE)::int AS completed_today,
             COALESCE(SUM(planned_quantity) FILTER (WHERE status IN ('planned','in_progress')), 0)::numeric AS planned_qty,
             COALESCE(SUM(produced_quantity) FILTER (WHERE completion_time >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS produced_qty,
             COALESCE(AVG(EXTRACT(EPOCH FROM (completion_time - start_time))/3600.0) FILTER (WHERE status='completed'), 0)::numeric(6,2) AS avg_hours
           FROM productions`,
          {}, { total: 0, active: 0, completed_today: 0, planned_qty: 0, produced_qty: 0, avg_hours: 0 }
        );

        const materialCost: any = hasMat
          ? await safeQueryOne(sequelize,
              `SELECT COALESCE(SUM(total_cost), 0)::numeric AS s
                 FROM production_materials pm
                 JOIN productions p ON p.id = pm.production_id
                WHERE p.completion_time >= date_trunc('month', CURRENT_DATE)`,
              {}, { s: 0 })
          : { s: 0 };

        const fgReady = Number((await safeQueryOne<any>(sequelize,
          `SELECT COUNT(*)::int c FROM productions
            WHERE status = 'completed'
              AND completion_time >= CURRENT_DATE - INTERVAL '7 days'
              AND NOT EXISTS (
                SELECT 1 FROM tms_shipments s
                 WHERE s.source_order_id = 'mfg-' || productions.id::text
              )`,
          {}, { c: 0 }))?.c || 0);

        const prodShipments = hasShip
          ? Number((await safeQueryOne<any>(sequelize,
              `SELECT COUNT(*)::int c FROM tms_shipments
                WHERE tenant_id = :tid
                  AND (source_order_id LIKE 'mfg-%' OR source_order_id LIKE 'mfg-rm-%')
                  AND created_at >= date_trunc('month', CURRENT_DATE)`,
              { tid }, { c: 0 }))?.c || 0)
          : 0;

        const materialRequests = hasMat
          ? Number((await safeQueryOne<any>(sequelize,
              `SELECT COUNT(*)::int c
                 FROM production_materials pm
                 JOIN productions p ON p.id = pm.production_id
                WHERE p.status IN ('planned','in_progress')
                  AND pm.used_quantity < pm.planned_quantity`,
              {}, { c: 0 }))?.c || 0)
          : 0;

        return ok(res, {
          totalBatches: Number(batches.total || 0),
          activeBatches: Number(batches.active || 0),
          completedToday: Number(batches.completed_today || 0),
          plannedQty: Number(batches.planned_qty || 0),
          producedQty: Number(batches.produced_qty || 0),
          avgCompletionHours: Number(batches.avg_hours || 0),
          totalMaterialCost: Number(materialCost.s || 0),
          fgReadyToDispatch: fgReady,
          materialRequests,
          productionShipments: prodShipments,
          hasIntegration: true,
        });
      }

      // ═══════════════════════════════════════════════════════════════
      case 'active-batches': {
        if (!(await tableExists(sequelize, 'productions'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT p.id, p.batch_number, p.status, p.planned_quantity, p.produced_quantity, p.unit,
                  p.production_date, p.start_time, p.completion_time,
                  pr.name AS product_name, pr.sku AS product_sku,
                  r.name AS recipe_name,
                  u.name AS supervisor_name,
                  (SELECT COUNT(*) FROM production_materials WHERE production_id = p.id) AS material_count
             FROM productions p
             LEFT JOIN products pr ON pr.id = p.product_id
             LEFT JOIN recipes r ON r.id = p.recipe_id
             LEFT JOIN users u ON u.id = p.supervisor_id
            WHERE p.status IN ('planned','in_progress')
            ORDER BY p.production_date ASC LIMIT 50`,
          {}, []);
        return ok(res, rows);
      }

      // ═══════════════════════════════════════════════════════════════
      case 'fg-ready-to-dispatch': {
        if (!(await tableExists(sequelize, 'productions'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT p.id, p.batch_number, p.produced_quantity, p.unit, p.completion_time,
                  p.quality_grade, p.total_cost,
                  pr.name AS product_name, pr.sku AS product_sku,
                  pr.selling_price,
                  r.name AS recipe_name,
                  EXISTS (
                    SELECT 1 FROM tms_shipments s
                     WHERE s.tenant_id = :tid
                       AND s.source_order_id = 'mfg-' || p.id::text
                  ) AS has_shipment
             FROM productions p
             LEFT JOIN products pr ON pr.id = p.product_id
             LEFT JOIN recipes r ON r.id = p.recipe_id
            WHERE p.status = 'completed'
              AND p.completion_time >= CURRENT_DATE - INTERVAL '14 days'
            ORDER BY p.completion_time DESC LIMIT 50`,
          { tid }, []);
        return ok(res, rows);
      }

      // ═══════════════════════════════════════════════════════════════
      case 'material-supply-queue': {
        if (!(await tableExists(sequelize, 'production_materials'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT pm.id, pm.production_id, pm.planned_quantity, pm.used_quantity,
                  pm.unit, pm.unit_cost, pm.total_cost,
                  (pm.planned_quantity - pm.used_quantity) AS shortage,
                  p.batch_number, p.status AS batch_status, p.production_date,
                  pr.name AS product_name, pr.sku AS product_sku,
                  COALESCE(SUM(s.quantity), 0)::numeric AS available_stock
             FROM production_materials pm
             JOIN productions p ON p.id = pm.production_id
             LEFT JOIN products pr ON pr.id = pm.product_id
             LEFT JOIN inventory_stock s ON s.product_id = pm.product_id
            WHERE p.status IN ('planned','in_progress')
              AND pm.used_quantity < pm.planned_quantity
            GROUP BY pm.id, p.batch_number, p.status, p.production_date, pr.name, pr.sku
            ORDER BY p.production_date ASC LIMIT 100`,
          {}, []);
        return ok(res, rows);
      }

      // ═══════════════════════════════════════════════════════════════
      case 'production-shipments': {
        if (!(await tableExists(sequelize, 'tms_shipments'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT s.id, s.shipment_number, s.status, s.priority, s.customer_name,
                  s.origin_address, s.destination_address,
                  s.total_weight_kg, s.source_order_id, s.created_at, s.delivered_at,
                  v.license_plate AS vehicle_plate, d.full_name AS driver_name,
                  CASE
                    WHEN s.source_order_id LIKE 'mfg-rm-%' THEN 'material_supply'
                    WHEN s.source_order_id LIKE 'mfg-%' THEN 'finished_goods'
                    ELSE 'other'
                  END AS shipment_category
             FROM tms_shipments s
             LEFT JOIN fms_vehicles v ON v.id = s.assigned_vehicle_id
             LEFT JOIN fms_drivers d ON d.id = s.assigned_driver_id
            WHERE s.tenant_id = :tid
              AND (s.source_order_id LIKE 'mfg-%' OR s.source_order_id LIKE 'mfg-rm-%')
            ORDER BY s.created_at DESC LIMIT 50`,
          { tid }, []);
        return ok(res, rows);
      }

      // ═══════════════════════════════════════════════════════════════
      case 'capacity-vs-output': {
        if (!(await tableExists(sequelize, 'productions'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `WITH days AS (
             SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date AS d
           ),
           prod AS (
             SELECT DATE(completion_time) AS d, SUM(produced_quantity) AS qty
               FROM productions
              WHERE status = 'completed' AND completion_time >= CURRENT_DATE - INTERVAL '7 days'
              GROUP BY DATE(completion_time)
           ),
           shipments AS (
             SELECT DATE(created_at) AS d, SUM(total_weight_kg) AS weight, COUNT(*) AS count
               FROM tms_shipments
              WHERE tenant_id = :tid
                AND source_order_id LIKE 'mfg-%'
                AND created_at >= CURRENT_DATE - INTERVAL '7 days'
              GROUP BY DATE(created_at)
           )
           SELECT to_char(d.d, 'YYYY-MM-DD') AS date,
                  COALESCE(prod.qty, 0)::numeric AS production_qty,
                  COALESCE(shipments.weight, 0)::numeric AS shipped_weight,
                  COALESCE(shipments.count, 0)::int AS shipment_count
             FROM days d
             LEFT JOIN prod ON prod.d = d.d
             LEFT JOIN shipments ON shipments.d = d.d
            ORDER BY d.d`,
          { tid }, []);
        return ok(res, rows);
      }

      // ═══════════════════════════════════════════════════════════════
      case 'output-by-product': {
        if (!(await tableExists(sequelize, 'productions'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT pr.name AS product_name, pr.sku,
                  COUNT(p.id)::int AS batches,
                  COALESCE(SUM(p.produced_quantity), 0)::numeric AS total_produced,
                  COALESCE(SUM(p.total_cost), 0)::numeric AS total_cost,
                  COALESCE(AVG(p.waste_percentage), 0)::numeric(5,2) AS avg_waste
             FROM productions p
             LEFT JOIN products pr ON pr.id = p.product_id
            WHERE p.completion_time >= CURRENT_DATE - INTERVAL '30 days'
              AND p.status = 'completed'
            GROUP BY pr.name, pr.sku
            ORDER BY total_produced DESC LIMIT 15`,
          {}, []);
        return ok(res, rows);
      }

      default:
        return err(res, `Unknown action: ${action}`);
    }
  } catch (e: any) {
    console.error('[manufacturing integration]', e);
    return err(res, e?.message || 'Internal error', 500);
  }
}
