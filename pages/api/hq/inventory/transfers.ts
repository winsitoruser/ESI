import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext, buildTenantFilter } from '../../../../lib/middleware/tenantIsolation';
import { logAudit } from '../../../../lib/audit/auditLogger';
import { validateBody, V, sanitizeBody } from '../../../../lib/middleware/withValidation';
import { checkLimit, RateLimitTier } from '../../../../lib/middleware/rateLimit';

const sequelize = require('../../../../lib/sequelize');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const ctx = getTenantContext(req);
      const tf = buildTenantFilter(ctx.tenantId, 't');
      const { status } = req.query;
      let where = 'WHERE 1=1' + tf.condition;
      const params: any = { ...tf.replacements };
      if (status && status !== 'all') { where += ' AND t.status=:status'; params.status = status; }

      const [transfers] = await sequelize.query(`
        SELECT t.*, fw.name as from_name, fw.code as from_code, tw.name as to_name, tw.code as to_code
        FROM stock_transfers t
        LEFT JOIN warehouses fw ON fw.id=t.from_warehouse_id
        LEFT JOIN warehouses tw ON tw.id=t.to_warehouse_id
        ${where} ORDER BY t.created_at DESC
      `, { replacements: params });

      const tfIds = transfers.map((t: any) => t.id);
      let items: any[] = [];
      if (tfIds.length > 0) {
        [items] = await sequelize.query(`
          SELECT ti.*, p.name as product_name, p.sku, p.unit
          FROM stock_transfer_items ti JOIN products p ON p.id=ti.product_id
          WHERE ti.transfer_id IN (:ids)
        `, { replacements: { ids: tfIds } });
      }

      const [statsRows] = await sequelize.query(`SELECT status, COUNT(*)::int as count FROM stock_transfers t WHERE 1=1 ${tf.condition} GROUP BY status`, { replacements: tf.replacements });
      const stats: Record<string, number> = { pending: 0, approved: 0, in_transit: 0, received: 0, cancelled: 0 };
      statsRows.forEach((s: any) => { stats[s.status] = s.count; });

      return res.status(HttpStatus.OK).json(
        successResponse({
          transfers: transfers.map((t: any) => ({
            id: String(t.id), transferNumber: t.transfer_number,
            fromBranch: { id: String(t.from_warehouse_id), name: t.from_name, code: t.from_code },
            toBranch: { id: String(t.to_warehouse_id), name: t.to_name, code: t.to_code },
            items: items.filter((i: any) => i.transfer_id === t.id).map((i: any) => ({
              productId: String(i.product_id), productName: i.product_name, sku: i.sku,
              quantity: parseFloat(i.requested_qty), unit: i.unit || 'pcs'
            })),
            totalItems: items.filter((i: any) => i.transfer_id === t.id).length,
            totalQuantity: items.filter((i: any) => i.transfer_id === t.id).reduce((s: number, i: any) => s + parseFloat(i.requested_qty), 0),
            status: t.status, priority: 'normal',
            requestDate: t.created_at, requestedBy: t.requested_by_name || 'Admin',
            approvedDate: t.approved_at, approvedBy: t.approved_by_name,
            shippedDate: t.shipped_at, receivedDate: t.received_at,
            notes: t.notes
          })),
          stats
        })
      );
    }

    if (req.method === 'POST') {
      if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
      sanitizeBody(req);
      const errors = validateBody(req, {
        fromWarehouseId: V.required().integer(),
        toWarehouseId: V.required().integer(),
        items: V.required().array().arrayMinLength(1),
      });
      if (errors) return res.status(HttpStatus.BAD_REQUEST).json(errors);

      const ctx = getTenantContext(req);
      const { fromWarehouseId, toWarehouseId, items: reqItems, notes } = req.body;

      const [seqResult] = await sequelize.query("SELECT COALESCE(MAX(id),0)+1 as nid FROM stock_transfers");
      const tfNum = `TF-2026-${String(seqResult[0].nid).padStart(4, '0')}`;
      const totalQty = reqItems.reduce((s: number, i: any) => s + (i.quantity || 0), 0);

      const [result] = await sequelize.query(`
        INSERT INTO stock_transfers (tenant_id, transfer_number, from_warehouse_id, to_warehouse_id, status, total_items, total_quantity, notes, requested_by_name)
        VALUES (:tenantId, :num, :from, :to, 'pending', :items, :qty, :notes, :userName)
        RETURNING id
      `, { replacements: { tenantId: ctx.tenantId, num: tfNum, from: fromWarehouseId, to: toWarehouseId, items: reqItems.length, qty: totalQty, notes: notes || null, userName: ctx.userName } });

      for (const item of reqItems) {
        await sequelize.query(`INSERT INTO stock_transfer_items (transfer_id, product_id, requested_qty, unit_cost) VALUES (:tfId, :pid, :qty, :cost)`,
          { replacements: { tfId: result[0].id, pid: item.productId, qty: item.quantity, cost: item.unitCost || 0 } });
      }

      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'stock_transfer', entityId: result[0]?.id, newValues: { tfNum, fromWarehouseId, toWarehouseId, totalItems: reqItems.length, totalQty }, req });

      return res.status(HttpStatus.CREATED).json(
        successResponse({ id: result[0].id, transferNumber: tfNum, status: 'pending' }, undefined, 'Transfer created')
      );
    }

    if (req.method === 'PUT') {
      if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
      const ctx = getTenantContext(req);
      const tf = buildTenantFilter(ctx.tenantId);
      const { id, operation } = req.query;
      if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Transfer ID required'));

      if (operation === 'approve') {
        await sequelize.query(`UPDATE stock_transfers SET status='approved', approved_by_name=:userName, approved_at=NOW(), updated_at=NOW() WHERE id=:id AND status IN ('draft','pending') ${tf.condition}`, { replacements: { id, userName: ctx.userName, ...tf.replacements } });
      } else if (operation === 'ship') {
        await sequelize.query(`UPDATE stock_transfers SET status='in_transit', shipped_at=NOW(), updated_at=NOW() WHERE id=:id AND status='approved' ${tf.condition}`, { replacements: { id, ...tf.replacements } });
      } else if (operation === 'receive') {
        await sequelize.query(`UPDATE stock_transfers SET status='received', received_at=NOW(), received_by_name=:userName, updated_at=NOW() WHERE id=:id ${tf.condition}`, { replacements: { id, userName: ctx.userName, ...tf.replacements } });
      } else if (operation === 'cancel') {
        await sequelize.query(`UPDATE stock_transfers SET status='cancelled', cancelled_at=NOW(), cancellation_reason=:reason, updated_at=NOW() WHERE id=:id ${tf.condition}`, { replacements: { id, reason: req.body?.reason || '', ...tf.replacements } });
      }

      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'status_change', entityType: 'stock_transfer', entityId: id as string, newValues: { operation }, req });
      return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, `Transfer ${operation}`));
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`));
  } catch (error: any) {
    console.error('Inventory Transfers API Error:', error.message);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
  }
}

export default withHQAuth(handler, { module: 'inventory' });
