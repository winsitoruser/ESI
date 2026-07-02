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
    switch (req.method) {
      case 'GET': return await getReceipts(req, res);
      case 'POST': return await createReceipt(req, res);
      case 'PUT': return await updateReceipt(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`));
    }
  } catch (error: any) {
    console.error('Goods Receipt API Error:', error.message);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
  }
}

export default withHQAuth(handler, { module: 'inventory' });

async function getReceipts(req: NextApiRequest, res: NextApiResponse) {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'gr');
  const { status, search } = req.query;
  let where = 'WHERE 1=1' + tf.condition;
  const params: any = { ...tf.replacements };
  if (status && status !== 'all') { where += ' AND gr.status=:status'; params.status = status; }
  if (search) {
    where += ' AND (gr.gr_number ILIKE :search OR s.name ILIKE :search OR po.po_number ILIKE :search)';
    params.search = `%${search}%`;
  }

  const [receipts] = await sequelize.query(`
    SELECT gr.*, s.name as supplier_name, s.code as supplier_code,
      w.name as warehouse_name, w.code as warehouse_code,
      po.po_number
    FROM goods_receipts gr
    LEFT JOIN suppliers s ON s.id=gr.supplier_id
    LEFT JOIN warehouses w ON w.id=gr.warehouse_id
    LEFT JOIN purchase_orders po ON po.id=gr.purchase_order_id
    ${where} ORDER BY gr.created_at DESC
  `, { replacements: params });

  const grIds = receipts.map((r: any) => r.id);
  let items: any[] = [];
  if (grIds.length > 0) {
    [items] = await sequelize.query(`
      SELECT gri.*, p.name as product_name, p.sku, p.unit
      FROM goods_receipt_items gri JOIN products p ON p.id=gri.product_id
      WHERE gri.goods_receipt_id IN (:ids)
    `, { replacements: { ids: grIds } });
  }

  const [statsRows] = await sequelize.query(`SELECT status, COUNT(*)::int as count FROM goods_receipts gr WHERE 1=1 ${tf.condition} GROUP BY status`, { replacements: tf.replacements });
  const stats: Record<string, any> = { pending: 0, partial: 0, completed: 0, draft: 0 };
  statsRows.forEach((s: any) => { stats[s.status] = s.count; });

  return res.status(HttpStatus.OK).json(successResponse({
    receipts: receipts.map((r: any) => ({
      id: String(r.id), receiptNumber: r.gr_number, poNumber: r.po_number || '-',
      supplier: { id: String(r.supplier_id || ''), name: r.supplier_name || '-', code: r.supplier_code || '' },
      branch: { id: String(r.warehouse_id || ''), name: r.warehouse_name || '-', code: r.warehouse_code || '' },
      status: r.status === 'completed' ? 'complete' : r.status,
      receiptDate: r.receipt_date, expectedDate: r.receipt_date,
      items: items.filter((i: any) => i.goods_receipt_id === r.id).map((i: any) => ({
        productId: String(i.product_id), productName: i.product_name, sku: i.sku,
        orderedQty: parseFloat(i.ordered_qty), receivedQty: parseFloat(i.received_qty),
        unit: i.unit || 'pcs', unitPrice: parseFloat(i.unit_cost), totalPrice: parseFloat(i.total_cost),
        status: parseFloat(i.received_qty) >= parseFloat(i.ordered_qty) ? 'complete' : parseFloat(i.received_qty) > 0 ? 'partial' : 'pending'
      })),
      totalItems: parseInt(r.total_items) || 0, totalValue: parseFloat(r.total_value) || 0,
      receivedValue: parseFloat(r.total_value) || 0,
      receivedBy: r.received_by_name, notes: r.notes
    })),
    stats
  }));
}

async function createReceipt(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const errors = validateBody(req, {
    items: V.required().array().arrayMinLength(1),
  });
  if (errors) return res.status(HttpStatus.BAD_REQUEST).json(errors);

  const ctx = getTenantContext(req);
  const { purchaseOrderId, warehouseId, items: reqItems, invoiceNumber, notes } = req.body;

  const [seqResult] = await sequelize.query("SELECT COALESCE(MAX(id),0)+1 as nid FROM goods_receipts");
  const grNum = `GR-2026-${String(seqResult[0].nid).padStart(4, '0')}`;
  let supplierId = null;
  if (purchaseOrderId) {
    const [po] = await sequelize.query("SELECT supplier_id FROM purchase_orders WHERE id=:poId", { replacements: { poId: purchaseOrderId } });
    if (po.length > 0) supplierId = po[0].supplier_id;
  }

  let totalQty = 0, totalValue = 0;
  for (const item of reqItems) { totalQty += item.receivedQty || 0; totalValue += (item.receivedQty || 0) * (item.unitCost || 0); }

  const [result] = await sequelize.query(`
    INSERT INTO goods_receipts (tenant_id, gr_number, purchase_order_id, supplier_id, warehouse_id, status, invoice_number, total_items, total_quantity, total_value, received_by_name, notes)
    VALUES (:tenantId, :num, :poId, :supId, :whId, 'completed', :inv, :items, :qty, :val, :userName, :notes) RETURNING id
  `, { replacements: { tenantId: ctx.tenantId, num: grNum, poId: purchaseOrderId || null, supId: supplierId, whId: warehouseId || null, inv: invoiceNumber || null, items: reqItems.length, qty: totalQty, val: totalValue, userName: ctx.userName, notes: notes || null } });

  const grId = result[0].id;
  for (const item of reqItems) {
    await sequelize.query(`INSERT INTO goods_receipt_items (goods_receipt_id, product_id, ordered_qty, received_qty, accepted_qty, unit_cost, total_cost, quality_status)
      VALUES (:grId, :pid, :ordered, :received, :received, :cost, :total, 'passed')`,
      { replacements: { grId, pid: item.productId, ordered: item.orderedQty || item.receivedQty, received: item.receivedQty, cost: item.unitCost || 0, total: (item.receivedQty || 0) * (item.unitCost || 0) } });
    // Update stock
    if (warehouseId) {
      const [existing] = await sequelize.query("SELECT id FROM inventory_stock WHERE product_id=:pid AND warehouse_id=:whId LIMIT 1", { replacements: { pid: item.productId, whId: warehouseId } });
      if (existing.length > 0) {
        await sequelize.query("UPDATE inventory_stock SET quantity=quantity+:qty, available_quantity=available_quantity+:qty, updated_at=NOW() WHERE id=:sid", { replacements: { qty: item.receivedQty, sid: existing[0].id } });
      } else {
        await sequelize.query("INSERT INTO inventory_stock (product_id, warehouse_id, quantity, reserved_quantity, available_quantity, cost_price) VALUES (:pid, :whId, :qty, 0, :qty, :cost)", { replacements: { pid: item.productId, whId: warehouseId, qty: item.receivedQty, cost: item.unitCost || 0 } });
      }
    }
  }

  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'goods_receipt', entityId: grId, newValues: { grNum, purchaseOrderId, warehouseId, totalItems: reqItems.length, totalValue }, req });

  return res.status(HttpStatus.CREATED).json(successResponse({ id: grId, grNumber: grNum }, undefined, 'Goods receipt created'));
}

async function updateReceipt(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const { id, action } = req.body;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Receipt ID required'));

  if (action === 'cancel') {
    await sequelize.query(`UPDATE goods_receipts SET status='cancelled', updated_at=NOW() WHERE id=:id ${tf.condition}`, { replacements: { id, ...tf.replacements } });
    await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'status_change', entityType: 'goods_receipt', entityId: id, newValues: { action: 'cancel' }, req });
  }
  return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'Receipt updated'));
}
