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
 * Inventory Integration for Fleet
 *
 * GET Actions:
 *   summary                  → KPI inventory (spare parts, transfers, receipts, dispatch)
 *   spare-parts-catalog      → Katalog spare part + stok total
 *   spare-parts-movements    → Pergerakan stok spare part
 *   low-stock-spareparts     → Spare part stok menipis
 *   dispatch-shipments       → Shipment yang terhubung order outlet
 *   warehouses               → Daftar gudang + KPI stok per gudang
 *   stock-by-location        → Stock levels per warehouse (untuk picking)
 *   transfers                → Inventory transfers antar warehouse
 *   pending-transfers        → Transfer yg status draft/in_transit butuh dispatch armada
 *   purchase-receipts        → PO yg akan diterima (inbound logistics)
 *   reorder-recommendations  → Rekomendasi PO utk spare part low stock
 *   kpi-supply-chain         → KPI supply chain (turnover, DOI, fill rate)
 *
 * POST Actions:
 *   issue-sparepart          → Issue spare part untuk maintenance WO
 *   create-transfer-shipment → Buat TMS shipment dari inventory transfer
 *   create-receipt-pickup    → Buat TMS trip untuk pickup dari supplier
 *   generate-reorder-po      → Generate PO draft dari reorder recommendation
 */
const SPAREPART_REGEX = "spare|oli|ban|tire|filter|aki|kampas|lampu|busi|rem";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return err(res, 'Unauthorized', 401);
    const tid = (session.user as any).tenantId || null;
    const uid = (session.user as any).id;
    const uname = (session.user as any).name || '';
    const action = (req.query.action as string) || 'summary';

    if (req.method === 'POST') {
      if (action === 'create-transfer-shipment') {
        const { transferId, assignedVehicleId, assignedDriverId, priority, notes } = req.body || {};
        if (!transferId) return err(res, 'transferId wajib');
        if (!(await tableExists(sequelize, 'tms_shipments'))) return err(res, 'TMS tidak tersedia', 412);
        const tr = await safeQueryOne<any>(sequelize,
          `SELECT t.*,
                  fw.name AS from_name, fw.address AS from_addr,
                  tw.name AS to_name, tw.address AS to_addr
             FROM inventory_transfers t
             LEFT JOIN warehouses fw ON fw.id = t.from_warehouse_id
             LEFT JOIN warehouses tw ON tw.id = t.to_warehouse_id
            WHERE t.id = :id AND t.tenant_id = :tid`,
          { id: transferId, tid });
        if (!tr) return err(res, 'Transfer tidak ditemukan', 404);
        const shipmentNo = `INV-TRF-${Date.now()}`;
        const [row]: any = await sequelize.query(
          `INSERT INTO tms_shipments
             (tenant_id, shipment_number, status, priority, customer_name,
              origin_address, destination_address,
              assigned_vehicle_id, assigned_driver_id,
              source_order_id, notes, created_by, created_at, updated_at)
           VALUES (:tid, :no, 'draft', :pri, 'Internal — Transfer',
                   :oa, :da, :vid, :did, :src, :note, :uid, NOW(), NOW())
           RETURNING id`,
          { replacements: {
              tid, no: shipmentNo, pri: priority || 'normal',
              oa: tr.from_addr || tr.from_name || 'Gudang Asal',
              da: tr.to_addr || tr.to_name || 'Gudang Tujuan',
              vid: assignedVehicleId || null, did: assignedDriverId || null,
              src: `inv-trf-${transferId}`,
              note: notes || `Dispatch inventory transfer ${tr.transfer_number || transferId}`,
              uid,
            } }
        );
        logAudit({ tenantId: tid, userId: uid, userName: uname, action: 'create' as any,
                   entityType: 'tms_shipments_inv_transfer',
                   entityId: row?.[0]?.id, newValues: req.body, req }).catch(() => {});
        return ok(res, { id: row?.[0]?.id, shipmentNumber: shipmentNo });
      }

      if (action === 'create-receipt-pickup') {
        const { poId, assignedVehicleId, assignedDriverId, supplierAddress } = req.body || {};
        if (!poId) return err(res, 'poId wajib');
        if (!(await tableExists(sequelize, 'tms_shipments'))) return err(res, 'TMS tidak tersedia', 412);
        const shipmentNo = `PO-PICKUP-${Date.now()}`;
        const [row]: any = await sequelize.query(
          `INSERT INTO tms_shipments
             (tenant_id, shipment_number, status, priority, customer_name,
              origin_address, destination_address,
              assigned_vehicle_id, assigned_driver_id,
              source_order_id, notes, created_by, created_at, updated_at)
           VALUES (:tid, :no, 'draft', 'normal', 'Supplier Pickup',
                   :oa, 'Gudang Penerimaan', :vid, :did, :src,
                   :note, :uid, NOW(), NOW())
           RETURNING id`,
          { replacements: {
              tid, no: shipmentNo,
              oa: supplierAddress || 'Alamat Supplier',
              vid: assignedVehicleId || null, did: assignedDriverId || null,
              src: `po-${poId}`,
              note: `Pickup PO ${poId} dari supplier`,
              uid,
            } }
        );
        logAudit({ tenantId: tid, userId: uid, userName: uname, action: 'create' as any,
                   entityType: 'tms_shipments_po_pickup',
                   entityId: row?.[0]?.id, newValues: req.body, req }).catch(() => {});
        return ok(res, { id: row?.[0]?.id, shipmentNumber: shipmentNo });
      }

      if (action === 'generate-reorder-po') {
        const { items } = req.body || {};
        if (!Array.isArray(items) || !items.length) return err(res, 'items wajib');
        if (!(await tableExists(sequelize, 'purchase_orders'))) return err(res, 'Purchase orders tidak tersedia', 412);
        const poNo = `PO-FLEET-REORDER-${Date.now()}`;
        const [row]: any = await sequelize.query(
          `INSERT INTO purchase_orders
             (tenant_id, po_number, status, order_date, notes, created_by, created_at, updated_at)
           VALUES (:tid, :no, 'draft', CURRENT_DATE, 'Auto-reorder dari Fleet Command Center (low stock spare parts)', :uid, NOW(), NOW())
           RETURNING id`,
          { replacements: { tid, no: poNo, uid } }
        );
        const poId = row?.[0]?.id;
        if (await tableExists(sequelize, 'purchase_order_items')) {
          for (const it of items) {
            await sequelize.query(
              `INSERT INTO purchase_order_items
                 (tenant_id, purchase_order_id, product_id, quantity, unit_price, total_price, created_at, updated_at)
               VALUES (:tid, :po, :pid, :qty, :up, :tp, NOW(), NOW())`,
              { replacements: {
                  tid, po: poId, pid: it.productId,
                  qty: it.quantity || 1,
                  up: it.unitPrice || 0,
                  tp: (it.quantity || 1) * (it.unitPrice || 0),
                } }
            ).catch(() => {});
          }
        }
        logAudit({ tenantId: tid, userId: uid, userName: uname, action: 'create' as any,
                   entityType: 'purchase_orders', entityId: poId,
                   newValues: { poNo, items: items.length }, req }).catch(() => {});
        return ok(res, { id: poId, poNumber: poNo, itemCount: items.length });
      }

      if (action === 'issue-sparepart') {
        const b = req.body || {};
        const { productId, quantity, vehicleId, maintenanceRecordId, warehouseId, notes } = b;
        if (!productId || !quantity) return err(res, 'productId & quantity wajib');
        if (!(await tableExists(sequelize, 'stock_movements'))) {
          return err(res, 'Inventory tidak tersedia', 412);
        }
        await sequelize.query(
          `INSERT INTO stock_movements
             (tenant_id, product_id, location_id, movement_type, quantity, reference_type, reference_id, notes, created_by, created_at)
           VALUES (:tid, :pid, :loc, 'out', :qty, 'fleet_maintenance', :ref, :notes, :uid, NOW())`,
          { replacements: { tid, pid: productId, loc: warehouseId || null, qty: quantity, ref: maintenanceRecordId || vehicleId || null, notes: notes || `Issued for vehicle ${vehicleId || ''}`, uid } }
        );
        if (warehouseId) {
          await sequelize.query(
            `UPDATE inventory_stock SET quantity = quantity - :qty, updated_at = NOW()
              WHERE tenant_id = :tid AND product_id = :pid AND location_id = :loc`,
            { replacements: { tid, pid: productId, loc: warehouseId, qty: quantity } }
          );
        }
        logAudit({ tenantId: tid, userId: uid, userName: uname, action: 'create' as any, entityType: 'stock_movements', entityId: productId, newValues: b, req }).catch(() => {});
        return ok(res, { success: true });
      }
      return err(res, `Unknown POST action: ${action}`);
    }

    switch (action) {
      case 'summary': {
        const hasProducts = await tableExists(sequelize, 'products');
        const hasStock = await tableExists(sequelize, 'inventory_stock');
        const hasMovements = await tableExists(sequelize, 'stock_movements');
        const hasShipments = await tableExists(sequelize, 'tms_shipments');

        const spareParts = hasProducts
          ? Number((await safeQueryOne<any>(sequelize,
              `SELECT COUNT(*)::int c FROM products
                WHERE tenant_id = :tid AND is_active = true
                  AND LOWER(COALESCE(category_path,'') || ' ' || COALESCE(name,'')) ~ :re`,
              { tid, re: SPAREPART_REGEX }, { c: 0 }))?.c || 0)
          : 0;

        let lowStock = 0;
        let totalStockValue = 0;
        if (hasStock && hasProducts) {
          const r: any = await safeQueryOne(sequelize,
            `SELECT
               COUNT(*) FILTER (WHERE s.quantity <= COALESCE(p.reorder_point, 0))::int AS low_stock,
               COALESCE(SUM(s.quantity * COALESCE(p.cost_price, 0)),0)::numeric AS total_value
             FROM inventory_stock s
             JOIN products p ON p.id = s.product_id
            WHERE s.tenant_id = :tid
              AND LOWER(COALESCE(p.category_path,'') || ' ' || COALESCE(p.name,'')) ~ :re`,
            { tid, re: SPAREPART_REGEX }, { low_stock: 0, total_value: 0 });
          lowStock = Number(r?.low_stock || 0);
          totalStockValue = Number(r?.total_value || 0);
        }

        let issuedMTD = 0;
        if (hasMovements) {
          issuedMTD = Number((await safeQueryOne<any>(sequelize,
            `SELECT COUNT(*)::int c FROM stock_movements
              WHERE tenant_id = :tid AND reference_type = 'fleet_maintenance'
                AND created_at >= date_trunc('month', CURRENT_DATE)`,
            { tid }, { c: 0 }))?.c || 0);
        }

        let dispatchShipments = 0;
        if (hasShipments) {
          dispatchShipments = Number((await safeQueryOne<any>(sequelize,
            `SELECT COUNT(*)::int c FROM tms_shipments
              WHERE tenant_id = :tid AND source_order_id IS NOT NULL
                AND created_at >= date_trunc('month', CURRENT_DATE)`,
            { tid }, { c: 0 }))?.c || 0);
        }

        const hasTransfers = await tableExists(sequelize, 'inventory_transfers');
        const hasPO = await tableExists(sequelize, 'purchase_orders');
        const hasWh = await tableExists(sequelize, 'warehouses');

        const warehouseCount = hasWh
          ? Number((await safeQueryOne<any>(sequelize,
              `SELECT COUNT(*)::int c FROM warehouses WHERE tenant_id = :tid AND is_active = true`,
              { tid }, { c: 0 }))?.c || 0)
          : 0;

        const pendingTransfers = hasTransfers
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

        return ok(res, {
          spareParts, lowStock, totalStockValue, issuedMTD, dispatchShipments,
          warehouseCount, pendingTransfers, pendingReceipts,
          hasIntegration: hasProducts && hasStock,
        });
      }

      case 'spare-parts-catalog': {
        if (!(await tableExists(sequelize, 'products'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT p.id, p.sku, p.name, p.category_path, p.cost_price, p.selling_price,
                  p.unit, p.reorder_point,
                  COALESCE(SUM(s.quantity),0)::numeric AS total_stock
             FROM products p
             LEFT JOIN inventory_stock s ON s.product_id = p.id
            WHERE p.tenant_id = :tid AND p.is_active = true
              AND LOWER(COALESCE(p.category_path,'') || ' ' || COALESCE(p.name,'')) ~ :re
            GROUP BY p.id ORDER BY p.name LIMIT 200`,
          { tid, re: SPAREPART_REGEX }, []);
        return ok(res, rows);
      }

      case 'spare-parts-movements': {
        if (!(await tableExists(sequelize, 'stock_movements'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT m.id, m.product_id, m.movement_type, m.quantity, m.notes,
                  m.reference_type, m.reference_id, m.created_at,
                  p.sku, p.name AS product_name,
                  l.name AS location_name
             FROM stock_movements m
             LEFT JOIN products p ON p.id = m.product_id
             LEFT JOIN locations l ON l.id = m.location_id
            WHERE m.tenant_id = :tid
              AND (m.reference_type IN ('fleet_maintenance','fms_maintenance','fms_cost')
                   OR LOWER(COALESCE(p.category_path,'') || ' ' || COALESCE(p.name,'')) ~ :re)
            ORDER BY m.created_at DESC LIMIT 100`,
          { tid, re: SPAREPART_REGEX }, []);
        return ok(res, rows);
      }

      case 'low-stock-spareparts': {
        if (!(await tableExists(sequelize, 'inventory_stock'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT p.id, p.sku, p.name, p.reorder_point,
                  COALESCE(SUM(s.quantity),0)::numeric AS stock,
                  p.cost_price
             FROM products p
             LEFT JOIN inventory_stock s ON s.product_id = p.id
            WHERE p.tenant_id = :tid AND p.is_active = true
              AND LOWER(COALESCE(p.category_path,'') || ' ' || COALESCE(p.name,'')) ~ :re
            GROUP BY p.id
           HAVING COALESCE(SUM(s.quantity),0) <= COALESCE(p.reorder_point, 0)
            ORDER BY stock ASC LIMIT 50`,
          { tid, re: SPAREPART_REGEX }, []);
        return ok(res, rows);
      }

      case 'dispatch-shipments': {
        if (!(await tableExists(sequelize, 'tms_shipments'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT s.id, s.shipment_number, s.status, s.customer_name,
                  s.origin_address, s.destination_address, s.source_order_id,
                  s.total_weight_kg, s.total_volume_m3, s.created_at,
                  v.license_plate AS vehicle_plate, d.full_name AS driver_name
             FROM tms_shipments s
             LEFT JOIN fms_vehicles v ON v.id = s.assigned_vehicle_id
             LEFT JOIN fms_drivers d ON d.id = s.assigned_driver_id
            WHERE s.tenant_id = :tid AND s.source_order_id IS NOT NULL
            ORDER BY s.created_at DESC LIMIT 50`,
          { tid }, []);
        return ok(res, rows);
      }

      // ═══════════════════════════════════════════════════════════════
      case 'warehouses': {
        if (!(await tableExists(sequelize, 'warehouses'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT w.id, w.name, w.code, w.address, w.city, w.is_active,
                  COALESCE(SUM(s.quantity), 0)::numeric AS total_stock,
                  COALESCE(SUM(s.quantity * COALESCE(p.cost_price, 0)), 0)::numeric AS stock_value,
                  COUNT(DISTINCT s.product_id)::int AS sku_count,
                  COUNT(DISTINCT CASE
                    WHEN LOWER(COALESCE(p.category_path,'') || ' ' || COALESCE(p.name,'')) ~ :re
                    THEN s.product_id END)::int AS sparepart_sku
             FROM warehouses w
             LEFT JOIN inventory_stock s ON s.location_id = w.id
             LEFT JOIN products p ON p.id = s.product_id
            WHERE w.tenant_id = :tid
            GROUP BY w.id
            ORDER BY w.name`,
          { tid, re: SPAREPART_REGEX }, []);
        return ok(res, rows);
      }

      // ═══════════════════════════════════════════════════════════════
      case 'stock-by-location': {
        if (!(await tableExists(sequelize, 'inventory_stock'))) return ok(res, []);
        const productId = req.query.productId;
        const sql = productId
          ? `SELECT s.id, s.quantity, s.location_id,
                    l.name AS location_name, l.code AS location_code,
                    p.sku, p.name AS product_name
               FROM inventory_stock s
               LEFT JOIN locations l ON l.id = s.location_id
               LEFT JOIN products p ON p.id = s.product_id
              WHERE s.tenant_id = :tid AND s.product_id = :pid
              ORDER BY l.name`
          : `SELECT l.id AS location_id, l.name AS location_name, l.code,
                    COUNT(DISTINCT s.product_id)::int AS sku_count,
                    COALESCE(SUM(s.quantity), 0)::numeric AS total_qty
               FROM locations l
               LEFT JOIN inventory_stock s ON s.location_id = l.id AND s.tenant_id = :tid
              WHERE l.tenant_id = :tid
              GROUP BY l.id, l.name, l.code
              ORDER BY total_qty DESC`;
        const rows = await safeQuery<any[]>(sequelize, sql,
          productId ? { tid, pid: productId } : { tid }, []);
        return ok(res, rows);
      }

      // ═══════════════════════════════════════════════════════════════
      case 'transfers': {
        if (!(await tableExists(sequelize, 'inventory_transfers'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT t.id, t.transfer_number, t.status, t.created_at, t.requested_date, t.completed_date,
                  t.from_warehouse_id, t.to_warehouse_id,
                  fw.name AS from_warehouse, tw.name AS to_warehouse,
                  fw.address AS from_address, tw.address AS to_address,
                  (SELECT COUNT(*) FROM inventory_transfer_items WHERE transfer_id = t.id)::int AS item_count,
                  (SELECT COALESCE(SUM(quantity),0) FROM inventory_transfer_items WHERE transfer_id = t.id)::numeric AS total_qty,
                  EXISTS (
                    SELECT 1 FROM tms_shipments s
                     WHERE s.tenant_id = :tid AND s.source_order_id = 'inv-trf-' || t.id::text
                  ) AS has_shipment
             FROM inventory_transfers t
             LEFT JOIN warehouses fw ON fw.id = t.from_warehouse_id
             LEFT JOIN warehouses tw ON tw.id = t.to_warehouse_id
            WHERE t.tenant_id = :tid
            ORDER BY t.created_at DESC LIMIT 50`,
          { tid }, []);
        return ok(res, rows);
      }

      // ═══════════════════════════════════════════════════════════════
      case 'pending-transfers': {
        if (!(await tableExists(sequelize, 'inventory_transfers'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT t.id, t.transfer_number, t.status, t.created_at, t.requested_date,
                  fw.name AS from_warehouse, tw.name AS to_warehouse,
                  fw.address AS from_address, tw.address AS to_address,
                  (SELECT COUNT(*) FROM inventory_transfer_items WHERE transfer_id = t.id)::int AS item_count,
                  (SELECT COALESCE(SUM(quantity),0) FROM inventory_transfer_items WHERE transfer_id = t.id)::numeric AS total_qty,
                  EXISTS (
                    SELECT 1 FROM tms_shipments s
                     WHERE s.tenant_id = :tid AND s.source_order_id = 'inv-trf-' || t.id::text
                  ) AS has_shipment
             FROM inventory_transfers t
             LEFT JOIN warehouses fw ON fw.id = t.from_warehouse_id
             LEFT JOIN warehouses tw ON tw.id = t.to_warehouse_id
            WHERE t.tenant_id = :tid
              AND t.status IN ('draft','pending','approved','in_transit')
            ORDER BY t.requested_date ASC LIMIT 30`,
          { tid }, []);
        return ok(res, rows);
      }

      // ═══════════════════════════════════════════════════════════════
      case 'purchase-receipts': {
        if (!(await tableExists(sequelize, 'purchase_orders'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT po.id, po.po_number, po.status, po.order_date, po.expected_date,
                  po.total_amount, po.supplier_id,
                  sp.name AS supplier_name, sp.address AS supplier_address,
                  (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id)::int AS item_count,
                  EXISTS (
                    SELECT 1 FROM tms_shipments s
                     WHERE s.tenant_id = :tid AND s.source_order_id = 'po-' || po.id::text
                  ) AS has_pickup
             FROM purchase_orders po
             LEFT JOIN suppliers sp ON sp.id = po.supplier_id
            WHERE po.tenant_id = :tid
              AND po.status IN ('draft','approved','sent','partial_received')
            ORDER BY po.expected_date ASC NULLS LAST LIMIT 30`,
          { tid }, []);
        return ok(res, rows);
      }

      // ═══════════════════════════════════════════════════════════════
      case 'reorder-recommendations': {
        if (!(await tableExists(sequelize, 'inventory_stock'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT p.id AS product_id, p.sku, p.name, p.unit,
                  p.reorder_point, p.reorder_quantity,
                  p.cost_price, p.selling_price,
                  COALESCE(SUM(s.quantity), 0)::numeric AS current_stock,
                  GREATEST(
                    COALESCE(p.reorder_quantity, 10)::numeric,
                    COALESCE(p.reorder_point, 5)::numeric * 2
                  ) AS recommended_qty,
                  GREATEST(
                    COALESCE(p.reorder_quantity, 10)::numeric,
                    COALESCE(p.reorder_point, 5)::numeric * 2
                  ) * COALESCE(p.cost_price, 0)::numeric AS estimated_po_value,
                  (SELECT sp.id FROM suppliers sp LIMIT 1) AS suggested_supplier_id
             FROM products p
             LEFT JOIN inventory_stock s ON s.product_id = p.id
            WHERE p.tenant_id = :tid AND p.is_active = true
              AND LOWER(COALESCE(p.category_path,'') || ' ' || COALESCE(p.name,'')) ~ :re
            GROUP BY p.id
           HAVING COALESCE(SUM(s.quantity), 0) <= COALESCE(p.reorder_point, 5)
            ORDER BY current_stock ASC LIMIT 30`,
          { tid, re: SPAREPART_REGEX }, []);
        return ok(res, rows);
      }

      // ═══════════════════════════════════════════════════════════════
      case 'kpi-supply-chain': {
        const hasStock = await tableExists(sequelize, 'inventory_stock');
        const hasMovements = await tableExists(sequelize, 'stock_movements');
        const hasShip = await tableExists(sequelize, 'tms_shipments');

        // Inventory turnover: stok keluar 30d / rata-rata stok
        let turnover = 0;
        let daysOfInventory = 0;
        if (hasStock && hasMovements) {
          const r: any = await safeQueryOne(sequelize,
            `SELECT
               (SELECT COALESCE(SUM(quantity), 0) FROM stock_movements
                 WHERE tenant_id = :tid AND movement_type = 'out'
                   AND created_at >= CURRENT_DATE - INTERVAL '30 days')::numeric AS outflow_30d,
               (SELECT COALESCE(SUM(quantity), 0) FROM inventory_stock WHERE tenant_id = :tid)::numeric AS current_stock`,
            { tid }, { outflow_30d: 0, current_stock: 0 });
          const outflow = Number(r?.outflow_30d || 0);
          const stock = Number(r?.current_stock || 0);
          turnover = stock > 0 ? Number((outflow / stock).toFixed(2)) : 0;
          daysOfInventory = outflow > 0 ? Number((stock / (outflow / 30)).toFixed(1)) : 0;
        }

        // Fill rate: shipments delivered / total shipments
        let fillRate = 0;
        if (hasShip) {
          const r: any = await safeQueryOne(sequelize,
            `SELECT
               COUNT(*) FILTER (WHERE status IN ('delivered','pod_received'))::int AS delivered,
               COUNT(*)::int AS total
             FROM tms_shipments
            WHERE tenant_id = :tid
              AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
            { tid }, { delivered: 0, total: 0 });
          fillRate = r?.total > 0 ? Math.round((r.delivered / r.total) * 100) : 0;
        }

        // On-shelf availability: % SKU with stock > reorder_point
        let availability = 0;
        if (hasStock) {
          const r: any = await safeQueryOne(sequelize,
            `SELECT
               COUNT(*) FILTER (WHERE s.stock > COALESCE(s.rp, 0))::int AS ok,
               COUNT(*)::int AS total
             FROM (
               SELECT p.id, COALESCE(SUM(s2.quantity),0) AS stock, p.reorder_point AS rp
                 FROM products p
                 LEFT JOIN inventory_stock s2 ON s2.product_id = p.id
                WHERE p.tenant_id = :tid AND p.is_active = true
                GROUP BY p.id, p.reorder_point
             ) s`,
            { tid }, { ok: 0, total: 0 });
          availability = r?.total > 0 ? Math.round((r.ok / r.total) * 100) : 0;
        }

        return ok(res, {
          inventoryTurnover: turnover,
          daysOfInventory,
          fillRate,
          onShelfAvailability: availability,
        });
      }

      default:
        return err(res, `Unknown action: ${action}`);
    }
  } catch (e: any) {
    console.error('[inventory integration]', e);
    return err(res, e?.message || 'Internal error', 500);
  }
}
