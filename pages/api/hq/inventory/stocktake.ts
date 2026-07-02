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
      case 'GET': return await getStocktakes(req, res);
      case 'POST': return await createStocktake(req, res);
      case 'PUT': return await updateStocktake(req, res);
      case 'DELETE': return await deleteStocktake(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`));
    }
  } catch (error: any) {
    console.error('Stocktake API Error:', error.message);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
  }
}

export default withHQAuth(handler, { module: 'inventory' });

async function getStocktakes(req: NextApiRequest, res: NextApiResponse) {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'o');
  const { status, search } = req.query;
  let where = 'WHERE 1=1' + tf.condition;
  const params: any = { ...tf.replacements };
  if (status && status !== 'all') { where += ' AND o.status=:status'; params.status = status; }
  if (search) {
    where += ' AND (o.opname_number ILIKE :search OR w.name ILIKE :search)';
    params.search = `%${search}%`;
  }

  const [opnames] = await sequelize.query(`
    SELECT o.*, w.name as warehouse_name, w.code as warehouse_code
    FROM stock_opnames o LEFT JOIN warehouses w ON w.id=o.warehouse_id
    ${where} ORDER BY o.created_at DESC
  `, { replacements: params });

  const [statsRows] = await sequelize.query(`SELECT status, COUNT(*)::int as count FROM stock_opnames o WHERE 1=1 ${tf.condition} GROUP BY status`, { replacements: tf.replacements });
  const stats: Record<string, any> = { draft: 0, in_progress: 0, completed: 0, cancelled: 0 };
  statsRows.forEach((s: any) => { stats[s.status] = s.count; });

  return res.status(HttpStatus.OK).json(successResponse({
    stocktakes: opnames.map((o: any) => ({
      id: String(o.id), stocktakeNumber: o.opname_number,
      branch: { id: String(o.warehouse_id || ''), name: o.warehouse_name || '-', code: o.warehouse_code || '' },
      type: o.opname_type || 'full',
      status: o.status === 'draft' ? 'scheduled' : o.status,
      scheduledDate: o.scheduled_date, startedAt: o.start_date, completedAt: o.end_date,
      totalItems: parseInt(o.total_items) || 0, countedItems: parseInt(o.counted_items) || 0,
      varianceCount: parseInt(o.items_with_variance) || 0,
      varianceValue: parseFloat(o.total_variance_value) || 0,
      assignedTo: [o.performed_by_name || 'Staff'].filter(Boolean),
      createdBy: o.created_by_name || 'Admin', notes: o.notes
    })),
    stats: { scheduled: stats.draft || 0, inProgress: stats.in_progress || 0, completed: stats.completed || 0, totalVariance: 0 }
  }));
}

async function createStocktake(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const errors = validateBody(req, {
    warehouseId: V.required().integer(),
    scheduledDate: V.required().date(),
  });
  if (errors) return res.status(HttpStatus.BAD_REQUEST).json(errors);

  const ctx = getTenantContext(req);
  const { warehouseId, type, scheduledDate, notes } = req.body;

  const [seqResult] = await sequelize.query("SELECT COALESCE(MAX(id),0)+1 as nid FROM stock_opnames");
  const soNum = `SO-2026-${String(seqResult[0].nid).padStart(4, '0')}`;

  const [result] = await sequelize.query(`
    INSERT INTO stock_opnames (tenant_id, opname_number, opname_type, warehouse_id, scheduled_date, notes, status)
    VALUES (:tenantId, :num, :type, :whId, :date, :notes, 'draft') RETURNING id
  `, { replacements: { tenantId: ctx.tenantId, num: soNum, type: type || 'full', whId: warehouseId, date: scheduledDate, notes: notes || null } });

  // Auto-populate items
  const opnameId = result[0].id;
  await sequelize.query(`
    INSERT INTO stock_opname_items (stock_opname_id, product_id, location_id, system_stock, unit_cost, status)
    SELECT :opnameId, s.product_id, s.location_id, SUM(s.quantity), AVG(s.cost_price), 'pending'
    FROM inventory_stock s WHERE s.warehouse_id=:whId GROUP BY s.product_id, s.location_id
  `, { replacements: { opnameId, whId: warehouseId } });

  const [itemCount] = await sequelize.query("SELECT COUNT(*)::int as c FROM stock_opname_items WHERE stock_opname_id=:opnameId", { replacements: { opnameId } });
  await sequelize.query("UPDATE stock_opnames SET total_items=:count WHERE id=:opnameId", { replacements: { count: itemCount[0].c, opnameId } });

  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'stock_opname', entityId: opnameId, newValues: { soNum, warehouseId, type: type || 'full', totalItems: itemCount[0].c }, req });

  return res.status(HttpStatus.CREATED).json(successResponse({ id: opnameId, stocktakeNumber: soNum, totalItems: itemCount[0].c }, undefined, 'Stocktake created'));
}

async function updateStocktake(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const { id, action } = req.body;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Stocktake ID required'));

  if (action === 'start') {
    await sequelize.query(`UPDATE stock_opnames SET status='in_progress', start_date=NOW(), updated_at=NOW() WHERE id=:id ${tf.condition}`, { replacements: { id, ...tf.replacements } });
  } else if (action === 'complete') {
    // Calculate variance
    const [variance] = await sequelize.query(`
      SELECT COUNT(*) FILTER (WHERE physical_stock IS NOT NULL)::int as counted,
        COUNT(*) FILTER (WHERE physical_stock IS NOT NULL AND physical_stock != system_stock)::int as with_variance,
        COALESCE(SUM((physical_stock - system_stock) * unit_cost),0)::numeric(15,0) as variance_value
      FROM stock_opname_items WHERE stock_opname_id=:id
    `, { replacements: { id } });
    const v = variance[0] || {};
    await sequelize.query(`UPDATE stock_opnames SET status='completed', end_date=NOW(), counted_items=:counted, items_with_variance=:variance, total_variance_value=:val, updated_at=NOW() WHERE id=:id ${tf.condition}`,
      { replacements: { id, counted: v.counted || 0, variance: v.with_variance || 0, val: v.variance_value || 0, ...tf.replacements } });
  } else if (action === 'cancel') {
    await sequelize.query(`UPDATE stock_opnames SET status='cancelled', updated_at=NOW() WHERE id=:id ${tf.condition}`, { replacements: { id, ...tf.replacements } });
  }

  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'status_change', entityType: 'stock_opname', entityId: id, newValues: { action }, req });

  return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, `Stocktake ${action}`));
}

async function deleteStocktake(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const id = req.query.id || req.body?.id;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'ID required'));
  await sequelize.query("DELETE FROM stock_opname_items WHERE stock_opname_id=:id", { replacements: { id } });
  await sequelize.query(`DELETE FROM stock_opnames WHERE id=:id AND status='draft' ${tf.condition}`, { replacements: { id, ...tf.replacements } });

  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'stock_opname', entityId: id as string, req });

  return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Stocktake deleted'));
}
