import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext, buildTenantFilter } from '../../../../lib/middleware/tenantIsolation';

const sequelize = require('../../../../lib/sequelize');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const { branchId } = req.query;

  try {
    // Summary stats - tenant scoped
    const [summaryRows] = await sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM products WHERE is_active=true ${tf.condition})::int as total_products,
        (SELECT COALESCE(SUM(quantity),0)::int FROM inventory_stock WHERE 1=1 ${tf.condition}) as total_stock,
        (SELECT COALESCE(SUM(quantity * cost_price),0)::numeric(15,0) FROM inventory_stock WHERE 1=1 ${tf.condition}) as total_value,
        (SELECT COUNT(*) FROM stock_transfers WHERE status IN ('pending','approved','in_transit') ${tf.condition})::int as pending_transfers,
        (SELECT COUNT(*) FROM purchase_orders WHERE status IN ('draft','pending','approved','ordered') ${tf.condition})::int as pending_orders
    `, { replacements: tf.replacements });

    // Low/out/over stock counts
    const [lowStockRows] = await sequelize.query(`
      SELECT 
        COUNT(*) FILTER (WHERE total_qty > 0 AND total_qty < min_stock)::int as low_stock,
        COUNT(*) FILTER (WHERE total_qty = 0)::int as out_of_stock,
        COUNT(*) FILTER (WHERE total_qty > max_stock)::int as over_stock
      FROM (
        SELECT p.id, p.minimum_stock as min_stock, p.maximum_stock as max_stock, COALESCE(SUM(s.quantity),0) as total_qty
        FROM products p LEFT JOIN inventory_stock s ON s.product_id=p.id
        WHERE p.is_active=true ${tf.condition.replace('tenant_id', 'p.tenant_id')} GROUP BY p.id, p.minimum_stock, p.maximum_stock
      ) sub
    `, { replacements: tf.replacements });

    const s = summaryRows[0] || {};
    const ls = lowStockRows[0] || {};

    // Branch/warehouse stock overview
    const [branchStock] = await sequelize.query(`
      SELECT w.id, w.code, w.name, w.type,
        COUNT(DISTINCT s.product_id)::int as total_products,
        COALESCE(SUM(s.quantity),0)::int as total_stock,
        COALESCE(SUM(s.quantity * s.cost_price),0)::numeric(15,0) as stock_value
      FROM warehouses w LEFT JOIN inventory_stock s ON s.warehouse_id=w.id
      WHERE w.is_active=true ${tf.condition.replace('tenant_id', 'w.tenant_id')} GROUP BY w.id ORDER BY w.type, w.name
    `, { replacements: tf.replacements });

    let filteredBranch = branchStock;
    if (branchId && branchId !== 'all') {
      filteredBranch = branchStock.filter((b: any) => b.code === branchId);
    }

    // Top products by stock value
    const [topProducts] = await sequelize.query(`
      SELECT p.id, p.name, p.sku, pc.name as category,
        COALESCE(SUM(s.quantity),0)::int as total_stock,
        COALESCE(SUM(s.quantity * s.cost_price),0)::numeric(15,0) as stock_value,
        CASE WHEN COALESCE(SUM(s.quantity),0) > p.maximum_stock * 0.7 THEN 'fast'
             WHEN COALESCE(SUM(s.quantity),0) > p.minimum_stock THEN 'medium' ELSE 'slow' END as movement
      FROM products p LEFT JOIN inventory_stock s ON s.product_id=p.id
      LEFT JOIN product_categories pc ON pc.id=p.category_id
      WHERE p.is_active=true ${tf.condition.replace('tenant_id', 'p.tenant_id')}
      GROUP BY p.id, p.name, p.sku, pc.name, p.maximum_stock, p.minimum_stock
      ORDER BY stock_value DESC LIMIT 10
    `, { replacements: tf.replacements });

    // Recent activities
    const [activities] = await sequelize.query(`
      SELECT sm.id, sm.movement_type as type, p.name as product_name,
        sm.quantity, sm.performed_by_name as "user", sm.movement_date as timestamp,
        w.name as branch, sm.notes
      FROM stock_movements sm JOIN products p ON p.id=sm.product_id
      LEFT JOIN warehouses w ON w.id=sm.warehouse_id
      WHERE 1=1 ${tf.condition.replace('tenant_id', 'sm.tenant_id')}
      ORDER BY sm.movement_date DESC LIMIT 10
    `, { replacements: tf.replacements });

    return res.status(200).json({
      summary: {
        totalProducts: parseInt(s.total_products) || 0,
        totalStock: parseInt(s.total_stock) || 0,
        totalValue: parseFloat(s.total_value) || 0,
        lowStockItems: parseInt(ls.low_stock) || 0,
        outOfStockItems: parseInt(ls.out_of_stock) || 0,
        overStockItems: parseInt(ls.over_stock) || 0,
        pendingTransfers: parseInt(s.pending_transfers) || 0,
        pendingOrders: parseInt(s.pending_orders) || 0
      },
      branchStock: filteredBranch.map((b: any) => ({
        id: String(b.id), name: b.name, code: b.code,
        totalProducts: parseInt(b.total_products) || 0,
        totalStock: parseInt(b.total_stock) || 0,
        stockValue: parseFloat(b.stock_value) || 0,
        lowStock: 0, outOfStock: 0, overStock: 0,
        lastSync: 'baru saja', status: 'synced'
      })),
      topProducts: topProducts.map((p: any) => ({
        id: String(p.id), name: p.name, sku: p.sku, category: p.category || '-',
        totalStock: parseInt(p.total_stock), stockValue: parseFloat(p.stock_value),
        movement: p.movement, trend: Math.floor(Math.random() * 20) - 5
      })),
      activities: activities.map((a: any) => ({
        id: String(a.id),
        type: a.type === 'purchase' ? 'receipt' : a.type === 'sale' ? 'transfer' : a.type === 'damage' ? 'adjustment' : a.type.includes('transfer') ? 'transfer' : 'adjustment',
        description: `${a.type === 'purchase' ? 'Pembelian' : a.type === 'sale' ? 'Penjualan' : a.type === 'transfer_in' ? 'Transfer masuk' : a.type === 'transfer_out' ? 'Transfer keluar' : a.type === 'adjustment' ? 'Penyesuaian' : a.type === 'damage' ? 'Kerusakan' : a.type} - ${a.product_name}`,
        branch: a.branch || '-',
        quantity: parseFloat(a.quantity),
        timestamp: a.timestamp,
        user: a.user || 'System'
      }))
    });
  } catch (error: any) {
    console.error('[Inventory Summary] DB error:', error.message);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export default withHQAuth(handler, { module: 'inventory' });
