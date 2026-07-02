import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext, buildTenantFilter } from '../../../../lib/middleware/tenantIsolation';
import { logAudit } from '../../../../lib/audit/auditLogger';
import { checkLimit, RateLimitTier } from '../../../../lib/middleware/rateLimit';

const sequelize = require('../../../../lib/sequelize');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const ctx = getTenantContext(req);
      const tf = buildTenantFilter(ctx.tenantId, 'a');
      const { type, priority, includeResolved } = req.query;
      let where = 'WHERE 1=1' + tf.condition;
      const params: any = { ...tf.replacements };
      if (type && type !== 'all') { where += ' AND a.alert_type=:type'; params.type = type; }
      if (priority && priority !== 'all') { where += ' AND a.severity=:priority'; params.priority = priority; }
      if (includeResolved !== 'true') where += ' AND a.is_resolved=false';

      const [alerts] = await sequelize.query(`
        SELECT a.*, p.name as product_name, p.sku, pc.name as category_name,
          w.name as warehouse_name, w.code as warehouse_code
        FROM stock_alerts a
        LEFT JOIN products p ON p.id=a.product_id
        LEFT JOIN product_categories pc ON pc.id=p.category_id
        LEFT JOIN warehouses w ON w.id=a.warehouse_id
        ${where} ORDER BY a.created_at DESC
      `, { replacements: params });

      const [statsRows] = await sequelize.query(`
        SELECT 
          COUNT(*) FILTER (WHERE is_resolved=false)::int as total,
          COUNT(*) FILTER (WHERE severity='critical' AND is_resolved=false)::int as critical,
          COUNT(*) FILTER (WHERE severity='high' AND is_resolved=false)::int as high,
          COUNT(*) FILTER (WHERE severity='warning' AND is_resolved=false)::int as warning,
          COUNT(*) FILTER (WHERE is_read=false AND is_resolved=false)::int as unread
        FROM stock_alerts a WHERE 1=1 ${tf.condition}
      `, { replacements: tf.replacements });
      const st = statsRows[0] || {};

      return res.status(HttpStatus.OK).json(successResponse({
        alerts: alerts.map((a: any) => ({
          id: String(a.id), type: a.alert_type, priority: a.severity,
          product: { id: String(a.product_id || ''), name: a.product_name || '-', sku: a.sku || '', category: a.category_name || '-' },
          branch: { id: String(a.warehouse_id || ''), name: a.warehouse_name || '-', code: a.warehouse_code || '' },
          currentStock: parseFloat(a.current_stock) || 0, minStock: parseFloat(a.threshold) || 0, maxStock: 0,
          title: a.title, message: a.message,
          suggestedAction: a.alert_type === 'out_of_stock' ? 'Transfer atau buat PO ke supplier' : a.alert_type === 'low_stock' ? 'Buat Purchase Order' : 'Monitor stok',
          createdAt: a.created_at, isRead: a.is_read, isResolved: a.is_resolved
        })),
        stats: { total: st.total || 0, critical: st.critical || 0, high: st.high || 0, unread: st.unread || 0 }
      }));
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
      const ctx = getTenantContext(req);
      const tf = buildTenantFilter(ctx.tenantId);
      const { id, action: alertAction } = req.body;
      if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Alert ID required'));

      if (alertAction === 'resolve') {
        await sequelize.query(`UPDATE stock_alerts SET is_resolved=true, resolved_at=NOW(), updated_at=NOW() WHERE id=:id ${tf.condition}`, { replacements: { id, ...tf.replacements } });
        await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'resolve', entityType: 'stock_alert', entityId: id, req });
      } else if (alertAction === 'read') {
        await sequelize.query(`UPDATE stock_alerts SET is_read=true, updated_at=NOW() WHERE id=:id ${tf.condition}`, { replacements: { id, ...tf.replacements } });
      }
      return res.status(HttpStatus.OK).json(successResponse({ id, action: alertAction }, undefined, `Alert ${alertAction}`));
    }

    if (req.method === 'POST') {
      // Generate alerts from current stock levels
      await sequelize.query(`
        INSERT INTO stock_alerts (tenant_id, product_id, alert_type, severity, title, message, current_stock, threshold)
        SELECT p.tenant_id, p.id, 'low_stock', 'warning', 'Stok Rendah: ' || p.name,
          'Stok ' || p.name || ' hanya ' || COALESCE(SUM(s.quantity),0)::int || ' (min: ' || p.minimum_stock || ')',
          COALESCE(SUM(s.quantity),0), p.minimum_stock
        FROM products p LEFT JOIN inventory_stock s ON s.product_id=p.id
        WHERE p.is_active=true GROUP BY p.id, p.name, p.tenant_id, p.minimum_stock
        HAVING COALESCE(SUM(s.quantity),0) > 0 AND COALESCE(SUM(s.quantity),0) < p.minimum_stock
        AND p.id NOT IN (SELECT product_id FROM stock_alerts WHERE alert_type='low_stock' AND is_resolved=false AND product_id IS NOT NULL)
      `);
      await sequelize.query(`
        INSERT INTO stock_alerts (tenant_id, product_id, alert_type, severity, title, message, current_stock, threshold)
        SELECT p.tenant_id, p.id, 'out_of_stock', 'critical', 'Stok Habis: ' || p.name,
          p.name || ' sudah habis', 0, p.minimum_stock
        FROM products p LEFT JOIN inventory_stock s ON s.product_id=p.id
        WHERE p.is_active=true GROUP BY p.id, p.name, p.tenant_id, p.minimum_stock
        HAVING COALESCE(SUM(s.quantity),0) = 0
        AND p.id NOT IN (SELECT product_id FROM stock_alerts WHERE alert_type='out_of_stock' AND is_resolved=false AND product_id IS NOT NULL)
      `);
      const ctx2 = getTenantContext(req);
      const tf2 = buildTenantFilter(ctx2.tenantId);
      const [count] = await sequelize.query(`SELECT COUNT(*)::int as c FROM stock_alerts WHERE is_resolved=false ${tf2.condition}`, { replacements: tf2.replacements });
      return res.status(HttpStatus.OK).json(successResponse({ totalUnresolved: count[0].c }, undefined, 'Alerts generated'));
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'PUT', 'POST']);
    return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`));
  } catch (error: any) {
    console.error('Inventory Alerts API Error:', error.message);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
  }
}

export default withHQAuth(handler, { module: 'inventory' });
