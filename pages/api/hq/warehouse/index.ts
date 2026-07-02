/**
 * Warehouse & Inventory Management - Unified API
 * Handles: dashboard, products, stock, warehouses, transfers, adjustments,
 *          opname, purchase orders, goods receipts, alerts, settings
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

const sequelize = require('../../../../lib/sequelize');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;
  const method = req.method || 'GET';

  try {
    switch (action) {
      case 'dashboard': return await handleDashboard(req, res);
      case 'products': return await handleProducts(req, res, method);
      case 'product-detail': return await handleProductDetail(req, res, method);
      case 'stock': return await handleStock(req, res);
      case 'warehouses': return await handleWarehouses(req, res, method);
      case 'warehouse-detail': return await handleWarehouseDetail(req, res, method);
      case 'locations': return await handleLocations(req, res, method);
      case 'transfers': return await handleTransfers(req, res, method);
      case 'transfer-detail': return await handleTransferDetail(req, res, method);
      case 'adjustments': return await handleAdjustments(req, res, method);
      case 'opname': return await handleOpname(req, res, method);
      case 'purchase-orders': return await handlePurchaseOrders(req, res, method);
      case 'po-detail': return await handlePODetail(req, res, method);
      case 'goods-receipts': return await handleGoodsReceipts(req, res, method);
      case 'suppliers': return await handleSuppliers(req, res, method);
      case 'categories': return await handleCategories(req, res, method);
      case 'alerts': return await handleAlerts(req, res, method);
      case 'movements': return await handleMovements(req, res);
      case 'settings': return await handleSettings(req, res, method);
      default:
        return res.status(HttpStatus.BAD_REQUEST).json(
          errorResponse(ErrorCodes.INVALID_INPUT, `Unknown action: ${action}`)
        );
    }
  } catch (error: any) {
    console.error(`[Warehouse API] Error in ${action}:`, error.message);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message)
    );
  }
}

export default withHQAuth(handler, { module: 'inventory' });

// ==================== DASHBOARD ====================
async function handleDashboard(req: NextApiRequest, res: NextApiResponse) {
  const [summary] = await sequelize.query(`
    SELECT 
      (SELECT COUNT(*) FROM products WHERE is_active=true) as total_products,
      (SELECT COALESCE(SUM(quantity),0) FROM inventory_stock) as total_stock,
      (SELECT COALESCE(SUM(quantity * cost_price),0) FROM inventory_stock) as total_value,
      (SELECT COUNT(DISTINCT p.id) FROM products p JOIN inventory_stock s ON s.product_id=p.id GROUP BY p.id HAVING SUM(s.quantity) < p.minimum_stock AND SUM(s.quantity)>0) as low_stock_items,
      (SELECT COUNT(DISTINCT p.id) FROM products p LEFT JOIN inventory_stock s ON s.product_id=p.id GROUP BY p.id HAVING COALESCE(SUM(s.quantity),0)=0) as out_of_stock_items,
      (SELECT COUNT(DISTINCT p.id) FROM products p JOIN inventory_stock s ON s.product_id=p.id GROUP BY p.id HAVING SUM(s.quantity) > p.maximum_stock) as over_stock_items,
      (SELECT COUNT(*) FROM stock_transfers WHERE status IN ('pending','approved','in_transit')) as pending_transfers,
      (SELECT COUNT(*) FROM purchase_orders WHERE status IN ('draft','pending','approved','ordered')) as pending_orders
  `);

  // Warehouse/Branch stock overview
  const [warehouseStock] = await sequelize.query(`
    SELECT w.id, w.code, w.name, w.type, w.branch_id,
      COUNT(DISTINCT s.product_id) as total_products,
      COALESCE(SUM(s.quantity),0)::int as total_stock,
      COALESCE(SUM(s.quantity * s.cost_price),0)::numeric(15,0) as stock_value
    FROM warehouses w
    LEFT JOIN inventory_stock s ON s.warehouse_id=w.id
    WHERE w.is_active=true
    GROUP BY w.id ORDER BY w.type, w.name
  `);

  // Top products by stock value
  const [topProducts] = await sequelize.query(`
    SELECT p.id, p.name, p.sku, pc.name as category,
      COALESCE(SUM(s.quantity),0)::int as total_stock,
      COALESCE(SUM(s.quantity * s.cost_price),0)::numeric(15,0) as stock_value,
      CASE WHEN COALESCE(SUM(s.quantity),0) > p.maximum_stock*0.7 THEN 'fast'
           WHEN COALESCE(SUM(s.quantity),0) > p.minimum_stock THEN 'medium' ELSE 'slow' END as movement
    FROM products p
    LEFT JOIN inventory_stock s ON s.product_id=p.id
    LEFT JOIN product_categories pc ON pc.id=p.category_id
    WHERE p.is_active=true
    GROUP BY p.id, p.name, p.sku, pc.name, p.maximum_stock, p.minimum_stock
    ORDER BY stock_value DESC LIMIT 10
  `);

  // Recent movements
  const [recentActivity] = await sequelize.query(`
    SELECT sm.id, sm.movement_type as type, p.name as product_name, 
      sm.quantity, sm.performed_by_name as user, sm.movement_date,
      w.name as warehouse_name, sm.notes,
      sm.reference_type, sm.reference_number
    FROM stock_movements sm
    JOIN products p ON p.id=sm.product_id
    LEFT JOIN warehouses w ON w.id=sm.warehouse_id
    ORDER BY sm.movement_date DESC LIMIT 15
  `);

  // Stock movement trend (last 30 days)
  const [movementTrend] = await sequelize.query(`
    SELECT DATE(movement_date) as date, movement_type,
      SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END)::int as stock_in,
      SUM(CASE WHEN quantity < 0 THEN ABS(quantity) ELSE 0 END)::int as stock_out
    FROM stock_movements
    WHERE movement_date >= NOW() - interval '30 days'
    GROUP BY DATE(movement_date), movement_type
    ORDER BY date
  `);

  const s = summary[0] || {};
  return res.status(HttpStatus.OK).json(successResponse({
    summary: {
      totalProducts: parseInt(s.total_products) || 0,
      totalStock: parseInt(s.total_stock) || 0,
      totalValue: parseFloat(s.total_value) || 0,
      lowStockItems: parseInt(s.low_stock_items) || 0,
      outOfStockItems: parseInt(s.out_of_stock_items) || 0,
      overStockItems: parseInt(s.over_stock_items) || 0,
      pendingTransfers: parseInt(s.pending_transfers) || 0,
      pendingOrders: parseInt(s.pending_orders) || 0
    },
    warehouseStock: warehouseStock.map((w: any) => ({
      id: w.id, code: w.code, name: w.name, type: w.type,
      totalProducts: parseInt(w.total_products) || 0,
      totalStock: parseInt(w.total_stock) || 0,
      stockValue: parseFloat(w.stock_value) || 0,
      lastSync: 'baru saja', status: 'synced'
    })),
    topProducts: topProducts.map((p: any) => ({
      id: String(p.id), name: p.name, sku: p.sku, category: p.category || '-',
      totalStock: parseInt(p.total_stock), stockValue: parseFloat(p.stock_value),
      movement: p.movement, trend: Math.floor(Math.random() * 20) - 5
    })),
    activities: recentActivity.map((a: any) => ({
      id: String(a.id), type: a.type, 
      description: `${a.type === 'purchase' ? 'Pembelian' : a.type === 'sale' ? 'Penjualan' : a.type === 'transfer_in' ? 'Transfer masuk' : a.type === 'transfer_out' ? 'Transfer keluar' : a.type === 'adjustment' ? 'Penyesuaian' : a.type === 'damage' ? 'Kerusakan' : a.type} - ${a.product_name}`,
      branch: a.warehouse_name || '-',
      quantity: parseFloat(a.quantity),
      timestamp: a.movement_date,
      user: a.user || 'System'
    })),
    movementTrend
  }));
}

// ==================== PRODUCTS ====================
async function handleProducts(req: NextApiRequest, res: NextApiResponse, method: string) {
  if (method === 'GET') {
    const { search, category, supplier, status, page = '1', limit = '25', sort = 'name', order = 'ASC' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, parseInt(limit as string));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE 1=1';
    const params: any = {};
    if (search) { where += ` AND (p.name ILIKE :search OR p.sku ILIKE :search OR p.barcode ILIKE :search)`; params.search = `%${search}%`; }
    if (category && category !== 'all') { where += ` AND pc.code = :category`; params.category = category; }
    if (supplier && supplier !== 'all') { where += ` AND sup.code = :supplier`; params.supplier = supplier; }
    if (status === 'active') { where += ` AND p.is_active=true`; }
    if (status === 'inactive') { where += ` AND p.is_active=false`; }

    const validSorts: Record<string, string> = { name: 'p.name', sku: 'p.sku', buy_price: 'p.buy_price', sell_price: 'p.sell_price', stock: 'total_stock', category: 'pc.name' };
    const sortCol = validSorts[sort as string] || 'p.name';
    const sortOrder = (order as string).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const [countResult] = await sequelize.query(`SELECT COUNT(*) as total FROM products p LEFT JOIN product_categories pc ON pc.id=p.category_id LEFT JOIN suppliers sup ON sup.id=p.supplier_id ${where}`, { replacements: params });
    const total = parseInt(countResult[0].total);

    const [products] = await sequelize.query(`
      SELECT p.*, pc.name as category_name, pc.code as category_code, pc.color as category_color,
        sup.name as supplier_name, sup.code as supplier_code,
        COALESCE(stock_agg.total_stock, 0)::int as total_stock,
        COALESCE(stock_agg.total_value, 0)::numeric(15,0) as stock_value,
        COALESCE(stock_agg.warehouse_count, 0)::int as warehouse_count
      FROM products p
      LEFT JOIN product_categories pc ON pc.id=p.category_id
      LEFT JOIN suppliers sup ON sup.id=p.supplier_id
      LEFT JOIN (
        SELECT product_id, SUM(quantity)::int as total_stock, SUM(quantity*cost_price) as total_value, COUNT(DISTINCT warehouse_id) as warehouse_count
        FROM inventory_stock GROUP BY product_id
      ) stock_agg ON stock_agg.product_id=p.id
      ${where}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT :limit OFFSET :offset
    `, { replacements: { ...params, limit: limitNum, offset } });

    // Categories for filter
    const [categories] = await sequelize.query("SELECT id, code, name, color, icon FROM product_categories WHERE is_active=true ORDER BY name");
    const [suppliers] = await sequelize.query("SELECT id, code, name FROM suppliers WHERE is_active=true ORDER BY name");

    return res.status(HttpStatus.OK).json(successResponse(products.map((p: any) => ({
      id: String(p.id), name: p.name, sku: p.sku, barcode: p.barcode, description: p.description,
      unit: p.unit, buyPrice: parseFloat(p.buy_price), sellPrice: parseFloat(p.sell_price),
      minStock: p.minimum_stock, maxStock: p.maximum_stock, reorderPoint: p.reorder_point,
      isActive: p.is_active, isTrackable: p.is_trackable,
      category: p.category_name || '-', categoryCode: p.category_code, categoryColor: p.category_color,
      supplier: p.supplier_name || '-', supplierCode: p.supplier_code,
      totalStock: p.total_stock, stockValue: parseFloat(p.stock_value), warehouseCount: p.warehouse_count,
      movement: p.total_stock > p.maximum_stock * 0.7 ? 'fast' : p.total_stock > p.minimum_stock ? 'medium' : 'slow',
      tags: p.tags || [], imageUrl: p.image_url
    })), {
      total, limit: limitNum, page: pageNum, totalPages: Math.ceil(total / limitNum),
      filters: { categories, suppliers }
    }));
  }

  if (method === 'POST') {
    const { name, sku, barcode, categoryId, supplierId, unit, buyPrice, sellPrice, minStock, maxStock, reorderPoint, description, isTrackable, tags } = req.body;
    if (!name) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Product name is required'));

    const [result] = await sequelize.query(`
      INSERT INTO products (tenant_id, name, sku, barcode, category_id, supplier_id, unit, buy_price, sell_price, minimum_stock, maximum_stock, reorder_point, description, is_trackable, tags, is_active)
      VALUES ((SELECT tenant_id FROM products LIMIT 1), :name, :sku, :barcode, :catId, :supId, :unit, :buy, :sell, :min, :max, :reorder, :desc, :trackable, :tags, true)
      RETURNING id
    `, { replacements: { name, sku: sku || null, barcode: barcode || null, catId: categoryId || null, supId: supplierId || null, unit: unit || 'pcs', buy: buyPrice || 0, sell: sellPrice || 0, min: minStock || 0, max: maxStock || 0, reorder: reorderPoint || 0, desc: description || null, trackable: isTrackable !== false, tags: JSON.stringify(tags || []) } });

    return res.status(HttpStatus.CREATED).json(successResponse({ id: result[0].id }, undefined, 'Product created'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== PRODUCT DETAIL ====================
async function handleProductDetail(req: NextApiRequest, res: NextApiResponse, method: string) {
  const { id } = req.query;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Product ID required'));

  if (method === 'GET') {
    const [products] = await sequelize.query(`
      SELECT p.*, pc.name as category_name, sup.name as supplier_name
      FROM products p LEFT JOIN product_categories pc ON pc.id=p.category_id LEFT JOIN suppliers sup ON sup.id=p.supplier_id
      WHERE p.id=:id
    `, { replacements: { id } });
    if (products.length === 0) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Product not found'));

    const [stockByWarehouse] = await sequelize.query(`
      SELECT s.*, w.name as warehouse_name, w.code as warehouse_code, l.name as location_name
      FROM inventory_stock s LEFT JOIN warehouses w ON w.id=s.warehouse_id LEFT JOIN locations l ON l.id=s.location_id
      WHERE s.product_id=:id ORDER BY w.name
    `, { replacements: { id } });

    const [recentMovements] = await sequelize.query(`
      SELECT sm.*, w.name as warehouse_name FROM stock_movements sm LEFT JOIN warehouses w ON w.id=sm.warehouse_id
      WHERE sm.product_id=:id ORDER BY sm.movement_date DESC LIMIT 20
    `, { replacements: { id } });

    const [priceHistory] = await sequelize.query(`SELECT * FROM product_cost_history WHERE product_id=:id ORDER BY changed_at DESC LIMIT 10`, { replacements: { id } });

    return res.status(HttpStatus.OK).json(successResponse({ product: products[0], stockByWarehouse, recentMovements, priceHistory }));
  }

  if (method === 'PUT') {
    const fields = req.body;
    const sets: string[] = [];
    const params: any = { id };
    const fieldMap: Record<string, string> = {
      name: 'name', sku: 'sku', barcode: 'barcode', categoryId: 'category_id', supplierId: 'supplier_id',
      unit: 'unit', buyPrice: 'buy_price', sellPrice: 'sell_price', minStock: 'minimum_stock', maxStock: 'maximum_stock',
      reorderPoint: 'reorder_point', description: 'description', isActive: 'is_active', isTrackable: 'is_trackable',
      tags: 'tags', imageUrl: 'image_url'
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (fields[key] !== undefined) { sets.push(`${col}=:${key}`); params[key] = key === 'tags' ? JSON.stringify(fields[key]) : fields[key]; }
    }
    if (sets.length === 0) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.INVALID_INPUT, 'No fields to update'));

    // Track price changes
    if (fields.buyPrice !== undefined || fields.sellPrice !== undefined) {
      const [old] = await sequelize.query("SELECT buy_price, sell_price FROM products WHERE id=:id", { replacements: { id } });
      if (old.length > 0) {
        await sequelize.query(`INSERT INTO product_cost_history (product_id, old_buy_price, new_buy_price, old_sell_price, new_sell_price, reason) VALUES (:id, :oldBuy, :newBuy, :oldSell, :newSell, 'Manual update')`,
          { replacements: { id, oldBuy: old[0].buy_price, newBuy: fields.buyPrice || old[0].buy_price, oldSell: old[0].sell_price, newSell: fields.sellPrice || old[0].sell_price } });
      }
    }

    sets.push("updated_at=NOW()");
    await sequelize.query(`UPDATE products SET ${sets.join(', ')} WHERE id=:id`, { replacements: params });
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'Product updated'));
  }

  if (method === 'DELETE') {
    await sequelize.query("UPDATE products SET is_active=false, updated_at=NOW() WHERE id=:id", { replacements: { id } });
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'Product deactivated'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== STOCK ====================
async function handleStock(req: NextApiRequest, res: NextApiResponse) {
  const { search, category, warehouse, status: stockStatus, page = '1', limit = '25' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, parseInt(limit as string));
  const offset = (pageNum - 1) * limitNum;

  let having = '';
  if (stockStatus === 'low') having = 'HAVING SUM(s.quantity) > 0 AND SUM(s.quantity) < p.minimum_stock';
  else if (stockStatus === 'out') having = 'HAVING COALESCE(SUM(s.quantity),0) = 0';
  else if (stockStatus === 'over') having = 'HAVING SUM(s.quantity) > p.maximum_stock';
  else if (stockStatus === 'normal') having = 'HAVING SUM(s.quantity) >= p.minimum_stock AND SUM(s.quantity) <= p.maximum_stock';

  let where = 'WHERE p.is_active=true';
  const params: any = {};
  if (search) { where += ` AND (p.name ILIKE :search OR p.sku ILIKE :search)`; params.search = `%${search}%`; }
  if (category && category !== 'all') { where += ` AND pc.code = :category`; params.category = category; }

  const [countResult] = await sequelize.query(`
    SELECT COUNT(*) as total FROM (
      SELECT p.id FROM products p LEFT JOIN product_categories pc ON pc.id=p.category_id LEFT JOIN inventory_stock s ON s.product_id=p.id
      ${where} GROUP BY p.id, p.minimum_stock, p.maximum_stock ${having}
    ) sub
  `, { replacements: params });
  const total = parseInt(countResult[0].total);

  const [products] = await sequelize.query(`
    SELECT p.id, p.name, p.sku, p.barcode, p.unit, p.buy_price, p.sell_price, p.minimum_stock, p.maximum_stock,
      pc.name as category, COALESCE(SUM(s.quantity),0)::int as total_stock,
      COALESCE(AVG(s.cost_price),0)::numeric(15,0) as avg_cost,
      COALESCE(SUM(s.quantity * s.cost_price),0)::numeric(15,0) as stock_value
    FROM products p
    LEFT JOIN product_categories pc ON pc.id=p.category_id
    LEFT JOIN inventory_stock s ON s.product_id=p.id
    ${where}
    GROUP BY p.id, p.name, p.sku, p.barcode, p.unit, p.buy_price, p.sell_price, p.minimum_stock, p.maximum_stock, pc.name
    ${having}
    ORDER BY p.name LIMIT :limit OFFSET :offset
  `, { replacements: { ...params, limit: limitNum, offset } });

  // Get per-warehouse breakdown for each product
  const productIds = products.map((p: any) => p.id);
  let warehouseBreakdown: any[] = [];
  if (productIds.length > 0) {
    [warehouseBreakdown] = await sequelize.query(`
      SELECT s.product_id, w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
        SUM(s.quantity)::int as stock, MAX(s.updated_at) as last_updated
      FROM inventory_stock s JOIN warehouses w ON w.id=s.warehouse_id
      WHERE s.product_id IN (:ids)
      GROUP BY s.product_id, w.id, w.name, w.code ORDER BY w.name
    `, { replacements: { ids: productIds } });
  }

  const result = products.map((p: any) => {
    const branches = warehouseBreakdown.filter((b: any) => b.product_id === p.id).map((b: any) => ({
      branchId: String(b.warehouse_id), branchName: b.warehouse_name, branchCode: b.warehouse_code,
      stock: b.stock, minStock: p.minimum_stock, maxStock: p.maximum_stock,
      status: b.stock === 0 ? 'out' : b.stock < p.minimum_stock ? 'low' : b.stock > p.maximum_stock ? 'over' : 'normal',
      lastUpdated: b.last_updated
    }));
    return {
      id: String(p.id), name: p.name, sku: p.sku, barcode: p.barcode, category: p.category || '-', unit: p.unit,
      totalStock: p.total_stock, minStock: p.minimum_stock, maxStock: p.maximum_stock,
      avgCost: parseFloat(p.avg_cost), stockValue: parseFloat(p.stock_value),
      movement: p.total_stock > p.maximum_stock * 0.7 ? 'fast' : p.total_stock > p.minimum_stock ? 'medium' : 'slow',
      branches
    };
  });

  return res.status(HttpStatus.OK).json(successResponse(
    { products: result, stats: { total, lowStock: 0, outOfStock: 0, overStock: 0 } },
    { total, limit: limitNum, page: pageNum, totalPages: Math.ceil(total / limitNum) }
  ));
}

// ==================== WAREHOUSES ====================
async function handleWarehouses(req: NextApiRequest, res: NextApiResponse, method: string) {
  if (method === 'GET') {
    const [warehouses] = await sequelize.query(`
      SELECT w.*, 
        (SELECT COUNT(DISTINCT s.product_id) FROM inventory_stock s WHERE s.warehouse_id=w.id) as product_count,
        (SELECT COALESCE(SUM(s.quantity),0)::int FROM inventory_stock s WHERE s.warehouse_id=w.id) as total_stock,
        (SELECT COALESCE(SUM(s.quantity*s.cost_price),0) FROM inventory_stock s WHERE s.warehouse_id=w.id)::numeric(15,0) as stock_value,
        (SELECT COUNT(*) FROM locations l WHERE l.warehouse_id=w.id) as location_count,
        (SELECT COUNT(*) FROM warehouse_zones z WHERE z.warehouse_id=w.id) as zone_count
      FROM warehouses w ORDER BY w.type, w.name
    `);
    return res.status(HttpStatus.OK).json(successResponse(warehouses));
  }

  if (method === 'POST') {
    const { code, name, type, address, city, phone, manager, capacity, branchId, notes } = req.body;
    if (!code || !name) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Code and name required'));

    const [result] = await sequelize.query(`
      INSERT INTO warehouses (tenant_id, code, name, type, address, city, phone, manager, capacity, branch_id, notes, is_active, status)
      VALUES ((SELECT tenant_id FROM warehouses LIMIT 1), :code, :name, :type, :address, :city, :phone, :manager, :cap, :branchId, :notes, true, 'active')
      RETURNING id
    `, { replacements: { code, name, type: type || 'storage', address: address || null, city: city || null, phone: phone || null, manager: manager || null, cap: capacity || null, branchId: branchId || null, notes: notes || null } });
    return res.status(HttpStatus.CREATED).json(successResponse({ id: result[0].id }, undefined, 'Warehouse created'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== WAREHOUSE DETAIL ====================
async function handleWarehouseDetail(req: NextApiRequest, res: NextApiResponse, method: string) {
  const { id } = req.query;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Warehouse ID required'));

  if (method === 'GET') {
    const [whs] = await sequelize.query("SELECT * FROM warehouses WHERE id=:id", { replacements: { id } });
    if (whs.length === 0) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Warehouse not found'));

    const [zones] = await sequelize.query("SELECT * FROM warehouse_zones WHERE warehouse_id=:id ORDER BY sort_order, name", { replacements: { id } });
    const [locations] = await sequelize.query("SELECT * FROM locations WHERE warehouse_id=:id ORDER BY aisle, row, level", { replacements: { id } });
    const [stockSummary] = await sequelize.query(`
      SELECT p.id, p.name, p.sku, SUM(s.quantity)::int as quantity, l.name as location_name
      FROM inventory_stock s JOIN products p ON p.id=s.product_id LEFT JOIN locations l ON l.id=s.location_id
      WHERE s.warehouse_id=:id GROUP BY p.id, p.name, p.sku, l.name ORDER BY p.name
    `, { replacements: { id } });

    return res.status(HttpStatus.OK).json(successResponse({ warehouse: whs[0], zones, locations, stockSummary }));
  }

  if (method === 'PUT') {
    const fields = req.body;
    const sets: string[] = [];
    const params: any = { id };
    const fieldMap: Record<string, string> = { name: 'name', type: 'type', address: 'address', city: 'city', phone: 'phone', manager: 'manager', capacity: 'capacity', status: 'status', notes: 'notes', isActive: 'is_active' };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (fields[key] !== undefined) { sets.push(`${col}=:${key}`); params[key] = fields[key]; }
    }
    if (sets.length > 0) {
      sets.push("updated_at=NOW()");
      await sequelize.query(`UPDATE warehouses SET ${sets.join(', ')} WHERE id=:id`, { replacements: params });
    }
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'Warehouse updated'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== LOCATIONS ====================
async function handleLocations(req: NextApiRequest, res: NextApiResponse, method: string) {
  const { warehouseId } = req.query;

  if (method === 'GET') {
    let where = '';
    const params: any = {};
    if (warehouseId) { where = 'WHERE l.warehouse_id=:warehouseId'; params.warehouseId = warehouseId; }
    const [locations] = await sequelize.query(`
      SELECT l.*, w.name as warehouse_name, wz.name as zone_name,
        (SELECT COALESCE(SUM(s.quantity),0)::int FROM inventory_stock s WHERE s.location_id=l.id) as stock_qty,
        (SELECT COUNT(DISTINCT s.product_id) FROM inventory_stock s WHERE s.location_id=l.id) as product_count
      FROM locations l JOIN warehouses w ON w.id=l.warehouse_id LEFT JOIN warehouse_zones wz ON wz.id=l.zone_id
      ${where} ORDER BY l.aisle, l.row, l.level
    `, { replacements: params });
    return res.status(HttpStatus.OK).json(successResponse(locations));
  }

  if (method === 'POST') {
    const { warehouseId: whId, zoneId, code, name, type, aisle, row, level, capacity } = req.body;
    if (!whId || !code || !name) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'warehouseId, code, name required'));
    const [result] = await sequelize.query(`INSERT INTO locations (warehouse_id, zone_id, code, name, type, aisle, row, level, capacity) VALUES (:whId, :zoneId, :code, :name, :type, :aisle, :row, :level, :cap) RETURNING id`,
      { replacements: { whId, zoneId: zoneId || null, code, name, type: type || 'rack', aisle: aisle || null, row: row || null, level: level || null, cap: capacity || null } });
    return res.status(HttpStatus.CREATED).json(successResponse({ id: result[0].id }, undefined, 'Location created'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== TRANSFERS ====================
async function handleTransfers(req: NextApiRequest, res: NextApiResponse, method: string) {
  if (method === 'GET') {
    const { status, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, parseInt(limit as string));
    const offset = (pageNum - 1) * limitNum;

    let where = '';
    const params: any = {};
    if (status && status !== 'all') { where = 'WHERE t.status=:status'; params.status = status; }

    const [transfers] = await sequelize.query(`
      SELECT t.*, fw.name as from_warehouse_name, fw.code as from_warehouse_code,
        tw.name as to_warehouse_name, tw.code as to_warehouse_code
      FROM stock_transfers t
      LEFT JOIN warehouses fw ON fw.id=t.from_warehouse_id
      LEFT JOIN warehouses tw ON tw.id=t.to_warehouse_id
      ${where} ORDER BY t.created_at DESC LIMIT :limit OFFSET :offset
    `, { replacements: { ...params, limit: limitNum, offset } });

    // Get items for each transfer
    const transferIds = transfers.map((t: any) => t.id);
    let items: any[] = [];
    if (transferIds.length > 0) {
      [items] = await sequelize.query(`
        SELECT ti.*, p.name as product_name, p.sku FROM stock_transfer_items ti
        JOIN products p ON p.id=ti.product_id WHERE ti.transfer_id IN (:ids)
      `, { replacements: { ids: transferIds } });
    }

    const [stats] = await sequelize.query(`
      SELECT status, COUNT(*)::int as count FROM stock_transfers GROUP BY status
    `);
    const statMap: Record<string, number> = {};
    stats.forEach((s: any) => statMap[s.status] = s.count);

    const [countResult] = await sequelize.query(`SELECT COUNT(*)::int as total FROM stock_transfers ${where ? 'WHERE status=:status' : ''}`, { replacements: params });

    return res.status(HttpStatus.OK).json(successResponse({
      transfers: transfers.map((t: any) => ({
        ...t,
        fromBranch: { id: t.from_warehouse_id, name: t.from_warehouse_name, code: t.from_warehouse_code },
        toBranch: { id: t.to_warehouse_id, name: t.to_warehouse_name, code: t.to_warehouse_code },
        items: items.filter((i: any) => i.transfer_id === t.id).map((i: any) => ({
          productId: String(i.product_id), productName: i.product_name, sku: i.sku,
          quantity: parseFloat(i.requested_qty), shipped: parseFloat(i.shipped_qty), received: parseFloat(i.received_qty)
        })),
        totalItems: items.filter((i: any) => i.transfer_id === t.id).length,
        totalQuantity: items.filter((i: any) => i.transfer_id === t.id).reduce((s: number, i: any) => s + parseFloat(i.requested_qty), 0)
      })),
      stats: statMap
    }, { total: parseInt(countResult[0].total), limit: limitNum, page: pageNum, totalPages: Math.ceil(parseInt(countResult[0].total) / limitNum) }));
  }

  if (method === 'POST') {
    const { fromWarehouseId, toWarehouseId, items, notes, shippingMethod } = req.body;
    if (!fromWarehouseId || !toWarehouseId || !items?.length) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'fromWarehouseId, toWarehouseId, and items required'));

    const [seqResult] = await sequelize.query("SELECT COALESCE(MAX(id),0)+1 as next_id FROM stock_transfers");
    const tfNum = `TF-2026-${String(seqResult[0].next_id).padStart(4, '0')}`;

    const [result] = await sequelize.query(`
      INSERT INTO stock_transfers (tenant_id, transfer_number, from_warehouse_id, to_warehouse_id, status, notes, shipping_method, total_items, requested_by_name)
      VALUES ((SELECT tenant_id FROM warehouses LIMIT 1), :num, :from, :to, 'draft', :notes, :ship, :total, 'Admin')
      RETURNING id
    `, { replacements: { num: tfNum, from: fromWarehouseId, to: toWarehouseId, notes: notes || null, ship: shippingMethod || null, total: items.length } });

    const tfId = result[0].id;
    for (const item of items) {
      await sequelize.query(`INSERT INTO stock_transfer_items (transfer_id, product_id, requested_qty, unit_cost) VALUES (:tfId, :prodId, :qty, :cost)`,
        { replacements: { tfId, prodId: item.productId, qty: item.quantity, cost: item.unitCost || 0 } });
    }

    return res.status(HttpStatus.CREATED).json(successResponse({ id: tfId, transferNumber: tfNum }, undefined, 'Transfer created'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== TRANSFER DETAIL ====================
async function handleTransferDetail(req: NextApiRequest, res: NextApiResponse, method: string) {
  const { id, operation } = req.query;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Transfer ID required'));

  if (method === 'PUT' && operation === 'approve') {
    await sequelize.query("UPDATE stock_transfers SET status='approved', approved_by_name='Admin', approved_at=NOW(), updated_at=NOW() WHERE id=:id AND status='pending'", { replacements: { id } });
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'Transfer approved'));
  }
  if (method === 'PUT' && operation === 'ship') {
    await sequelize.query("UPDATE stock_transfers SET status='in_transit', shipped_at=NOW(), updated_at=NOW() WHERE id=:id AND status='approved'", { replacements: { id } });
    // Create stock movements
    const [items] = await sequelize.query("SELECT ti.*, t.from_warehouse_id, t.to_warehouse_id FROM stock_transfer_items ti JOIN stock_transfers t ON t.id=ti.transfer_id WHERE ti.transfer_id=:id", { replacements: { id } });
    for (const item of items) {
      await sequelize.query(`INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, performed_by_name, reference_type, reference_id) VALUES ((SELECT tenant_id FROM stock_transfers WHERE id=:id), :pid, :whId, 'transfer_out', :qty, 'System', 'transfer', :id)`,
        { replacements: { id, pid: item.product_id, whId: item.from_warehouse_id, qty: -parseFloat(item.requested_qty) } });
    }
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'Transfer shipped'));
  }
  if (method === 'PUT' && operation === 'receive') {
    const { receivedItems } = req.body;
    await sequelize.query("UPDATE stock_transfers SET status='received', received_at=NOW(), received_by_name='Admin', updated_at=NOW() WHERE id=:id", { replacements: { id } });
    // Update stock
    const [items] = await sequelize.query("SELECT ti.*, t.to_warehouse_id FROM stock_transfer_items ti JOIN stock_transfers t ON t.id=ti.transfer_id WHERE ti.transfer_id=:id", { replacements: { id } });
    for (const item of items) {
      const rQty = receivedItems?.find((r: any) => r.productId == item.product_id)?.receivedQty || item.requested_qty;
      await sequelize.query("UPDATE stock_transfer_items SET received_qty=:rQty WHERE id=:itemId", { replacements: { rQty, itemId: item.id } });
      // Add stock to destination
      const [existing] = await sequelize.query("SELECT id FROM inventory_stock WHERE product_id=:pid AND warehouse_id=:whId LIMIT 1", { replacements: { pid: item.product_id, whId: item.to_warehouse_id } });
      if (existing.length > 0) {
        await sequelize.query("UPDATE inventory_stock SET quantity=quantity+:qty, available_quantity=available_quantity+:qty, updated_at=NOW() WHERE id=:sid", { replacements: { qty: rQty, sid: existing[0].id } });
      } else {
        await sequelize.query("INSERT INTO inventory_stock (product_id, warehouse_id, quantity, reserved_quantity, available_quantity, cost_price) VALUES (:pid, :whId, :qty, 0, :qty, :cost)", { replacements: { pid: item.product_id, whId: item.to_warehouse_id, qty: rQty, cost: item.unit_cost } });
      }
      await sequelize.query(`INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, performed_by_name, reference_type, reference_id) VALUES ((SELECT tenant_id FROM stock_transfers WHERE id=:id), :pid, :whId, 'transfer_in', :qty, 'System', 'transfer', :id)`,
        { replacements: { id, pid: item.product_id, whId: item.to_warehouse_id, qty: rQty } });
    }
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'Transfer received'));
  }
  if (method === 'PUT' && operation === 'cancel') {
    await sequelize.query("UPDATE stock_transfers SET status='cancelled', cancelled_at=NOW(), cancellation_reason=:reason, updated_at=NOW() WHERE id=:id", { replacements: { id, reason: req.body?.reason || '' } });
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'Transfer cancelled'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== ADJUSTMENTS ====================
async function handleAdjustments(req: NextApiRequest, res: NextApiResponse, method: string) {
  if (method === 'GET') {
    const [adjustments] = await sequelize.query(`
      SELECT a.*, w.name as warehouse_name FROM stock_adjustments a LEFT JOIN warehouses w ON w.id=a.warehouse_id ORDER BY a.created_at DESC
    `);
    const adjIds = adjustments.map((a: any) => a.id);
    let items: any[] = [];
    if (adjIds.length > 0) {
      [items] = await sequelize.query(`SELECT ai.*, p.name as product_name, p.sku FROM stock_adjustment_items ai JOIN products p ON p.id=ai.product_id WHERE ai.adjustment_id IN (:ids)`, { replacements: { ids: adjIds } });
    }
    return res.status(HttpStatus.OK).json(successResponse(adjustments.map((a: any) => ({
      ...a, items: items.filter((i: any) => i.adjustment_id === a.id)
    }))));
  }

  if (method === 'POST') {
    const { warehouseId, adjustmentType, items, reason, notes } = req.body;
    if (!warehouseId || !items?.length) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'warehouseId and items required'));

    const [seqResult] = await sequelize.query("SELECT COALESCE(MAX(id),0)+1 as next_id FROM stock_adjustments");
    const adjNum = `ADJ-2026-${String(seqResult[0].next_id).padStart(4, '0')}`;

    const [result] = await sequelize.query(`
      INSERT INTO stock_adjustments (tenant_id, adjustment_number, warehouse_id, adjustment_type, status, reason, notes, total_items, created_by_name)
      VALUES ((SELECT tenant_id FROM warehouses LIMIT 1), :num, :whId, :type, 'draft', :reason, :notes, :total, 'Admin')
      RETURNING id
    `, { replacements: { num: adjNum, whId: warehouseId, type: adjustmentType || 'correction', reason: reason || null, notes: notes || null, total: items.length } });

    const adjId = result[0].id;
    for (const item of items) {
      await sequelize.query(`INSERT INTO stock_adjustment_items (adjustment_id, product_id, system_qty, physical_qty, unit_cost, reason) VALUES (:adjId, :prodId, :sysQty, :physQty, :cost, :reason)`,
        { replacements: { adjId, prodId: item.productId, sysQty: item.systemQty || 0, physQty: item.physicalQty, cost: item.unitCost || 0, reason: item.reason || null } });
    }

    return res.status(HttpStatus.CREATED).json(successResponse({ id: adjId, adjustmentNumber: adjNum }, undefined, 'Adjustment created'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== OPNAME (Stock Take) ====================
async function handleOpname(req: NextApiRequest, res: NextApiResponse, method: string) {
  if (method === 'GET') {
    const [opnames] = await sequelize.query(`
      SELECT o.*, w.name as warehouse_name FROM stock_opnames o LEFT JOIN warehouses w ON w.id=o.warehouse_id ORDER BY o.created_at DESC
    `);
    return res.status(HttpStatus.OK).json(successResponse(opnames));
  }

  if (method === 'POST') {
    const { warehouseId, opnameType, locationId, zoneId, scheduledDate, notes } = req.body;
    if (!warehouseId) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'warehouseId required'));

    const [seqResult] = await sequelize.query("SELECT COALESCE(MAX(id),0)+1 as next_id FROM stock_opnames");
    const opnameNum = `SO-2026-${String(seqResult[0].next_id).padStart(4, '0')}`;

    const [result] = await sequelize.query(`
      INSERT INTO stock_opnames (tenant_id, opname_number, opname_type, warehouse_id, zone_id, location_id, scheduled_date, notes, status)
      VALUES ((SELECT tenant_id FROM warehouses LIMIT 1), :num, :type, :whId, :zoneId, :locId, :date, :notes, 'draft')
      RETURNING id
    `, { replacements: { num: opnameNum, type: opnameType || 'full', whId: warehouseId, zoneId: zoneId || null, locId: locationId || null, date: scheduledDate || null, notes: notes || null } });

    // Auto-populate items from current stock
    const opnameId = result[0].id;
    let stockWhere = 'WHERE s.warehouse_id=:whId';
    const stockParams: any = { whId: warehouseId, opnameId };
    if (locationId) { stockWhere += ' AND s.location_id=:locId'; stockParams.locId = locationId; }

    await sequelize.query(`
      INSERT INTO stock_opname_items (stock_opname_id, product_id, location_id, system_stock, unit_cost, status)
      SELECT :opnameId, s.product_id, s.location_id, SUM(s.quantity), AVG(s.cost_price), 'pending'
      FROM inventory_stock s ${stockWhere}
      GROUP BY s.product_id, s.location_id
    `, { replacements: stockParams });

    const [itemCount] = await sequelize.query("SELECT COUNT(*)::int as c FROM stock_opname_items WHERE stock_opname_id=:opnameId", { replacements: { opnameId } });
    await sequelize.query("UPDATE stock_opnames SET total_items=:count WHERE id=:opnameId", { replacements: { count: itemCount[0].c, opnameId } });

    return res.status(HttpStatus.CREATED).json(successResponse({ id: opnameId, opnameNumber: opnameNum, totalItems: itemCount[0].c }, undefined, 'Stock opname created'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== PURCHASE ORDERS ====================
async function handlePurchaseOrders(req: NextApiRequest, res: NextApiResponse, method: string) {
  if (method === 'GET') {
    const { status, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, parseInt(limit as string));
    const offset = (pageNum - 1) * limitNum;

    let where = '';
    const params: any = {};
    if (status && status !== 'all') { where = 'WHERE po.status=:status'; params.status = status; }

    const [pos] = await sequelize.query(`
      SELECT po.*, s.name as supplier_name, s.code as supplier_code, w.name as warehouse_name
      FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id LEFT JOIN warehouses w ON w.id=po.warehouse_id
      ${where} ORDER BY po.created_at DESC LIMIT :limit OFFSET :offset
    `, { replacements: { ...params, limit: limitNum, offset } });

    const poIds = pos.map((p: any) => p.id);
    let items: any[] = [];
    if (poIds.length > 0) {
      [items] = await sequelize.query(`SELECT poi.*, p.name as product_name, p.sku FROM purchase_order_items poi JOIN products p ON p.id=poi.product_id WHERE poi.purchase_order_id IN (:ids)`, { replacements: { ids: poIds } });
    }

    const [stats] = await sequelize.query("SELECT status, COUNT(*)::int as count FROM purchase_orders GROUP BY status");
    const statMap: Record<string, number> = {};
    stats.forEach((s: any) => statMap[s.status] = s.count);

    const [countResult] = await sequelize.query(`SELECT COUNT(*)::int as total FROM purchase_orders ${where ? 'WHERE status=:status' : ''}`, { replacements: params });

    return res.status(HttpStatus.OK).json(successResponse({
      purchaseOrders: pos.map((po: any) => ({
        ...po,
        items: items.filter((i: any) => i.purchase_order_id === po.id).map((i: any) => ({
          id: i.id, productId: i.product_id, productName: i.product_name, sku: i.sku,
          quantity: parseFloat(i.quantity), receivedQty: parseFloat(i.received_qty),
          unitPrice: parseFloat(i.unit_price), subtotal: parseFloat(i.subtotal)
        }))
      })),
      stats: statMap
    }, { total: parseInt(countResult[0].total), limit: limitNum, page: pageNum, totalPages: Math.ceil(parseInt(countResult[0].total) / limitNum) }));
  }

  if (method === 'POST') {
    const { supplierId, warehouseId, items, paymentTerms, expectedDelivery, notes } = req.body;
    if (!supplierId || !items?.length) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'supplierId and items required'));

    const [seqResult] = await sequelize.query("SELECT COALESCE(MAX(id),0)+1 as next_id FROM purchase_orders");
    const poNum = `PO-2026-${String(seqResult[0].next_id).padStart(4, '0')}`;

    let subtotal = 0;
    for (const item of items) { subtotal += (item.quantity || 0) * (item.unitPrice || 0); }

    const [result] = await sequelize.query(`
      INSERT INTO purchase_orders (tenant_id, po_number, supplier_id, warehouse_id, status, payment_terms, expected_delivery, notes, subtotal, total_amount, created_by_name)
      VALUES ((SELECT tenant_id FROM warehouses LIMIT 1), :num, :supId, :whId, 'draft', :terms, :delivery, :notes, :sub, :sub, 'Admin')
      RETURNING id
    `, { replacements: { num: poNum, supId: supplierId, whId: warehouseId || null, terms: paymentTerms || 'Net 30', delivery: expectedDelivery || null, notes: notes || null, sub: subtotal } });

    const poId = result[0].id;
    for (const item of items) {
      const sub = (item.quantity || 0) * (item.unitPrice || 0);
      await sequelize.query(`INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price, subtotal) VALUES (:poId, :prodId, :qty, :price, :sub)`,
        { replacements: { poId, prodId: item.productId, qty: item.quantity, price: item.unitPrice, sub } });
    }

    return res.status(HttpStatus.CREATED).json(successResponse({ id: poId, poNumber: poNum }, undefined, 'Purchase order created'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== PO DETAIL ====================
async function handlePODetail(req: NextApiRequest, res: NextApiResponse, method: string) {
  const { id, operation } = req.query;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'PO ID required'));

  if (method === 'PUT' && operation === 'approve') {
    await sequelize.query("UPDATE purchase_orders SET status='approved', approved_by_name='Admin', approved_at=NOW(), updated_at=NOW() WHERE id=:id AND status IN ('draft','pending')", { replacements: { id } });
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'PO approved'));
  }
  if (method === 'PUT' && operation === 'order') {
    await sequelize.query("UPDATE purchase_orders SET status='ordered', updated_at=NOW() WHERE id=:id AND status='approved'", { replacements: { id } });
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'PO ordered'));
  }
  if (method === 'PUT' && operation === 'cancel') {
    await sequelize.query("UPDATE purchase_orders SET status='cancelled', cancelled_at=NOW(), cancellation_reason=:reason, updated_at=NOW() WHERE id=:id", { replacements: { id, reason: req.body?.reason || '' } });
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'PO cancelled'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== GOODS RECEIPTS ====================
async function handleGoodsReceipts(req: NextApiRequest, res: NextApiResponse, method: string) {
  if (method === 'GET') {
    const [receipts] = await sequelize.query(`
      SELECT gr.*, s.name as supplier_name, w.name as warehouse_name, po.po_number
      FROM goods_receipts gr LEFT JOIN suppliers s ON s.id=gr.supplier_id LEFT JOIN warehouses w ON w.id=gr.warehouse_id
      LEFT JOIN purchase_orders po ON po.id=gr.purchase_order_id ORDER BY gr.created_at DESC
    `);
    return res.status(HttpStatus.OK).json(successResponse(receipts));
  }

  if (method === 'POST') {
    const { purchaseOrderId, warehouseId, items, invoiceNumber, deliveryNote, notes } = req.body;
    if (!items?.length) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'items required'));

    const [seqResult] = await sequelize.query("SELECT COALESCE(MAX(id),0)+1 as next_id FROM goods_receipts");
    const grNum = `GR-2026-${String(seqResult[0].next_id).padStart(4, '0')}`;

    let supplierId = null;
    if (purchaseOrderId) {
      const [po] = await sequelize.query("SELECT supplier_id FROM purchase_orders WHERE id=:poId", { replacements: { poId: purchaseOrderId } });
      if (po.length > 0) supplierId = po[0].supplier_id;
    }

    let totalQty = 0, totalValue = 0;
    for (const item of items) { totalQty += item.receivedQty || 0; totalValue += (item.receivedQty || 0) * (item.unitCost || 0); }

    const [result] = await sequelize.query(`
      INSERT INTO goods_receipts (tenant_id, gr_number, purchase_order_id, supplier_id, warehouse_id, receipt_type, status, invoice_number, delivery_note, total_items, total_quantity, total_value, received_by_name, notes)
      VALUES ((SELECT tenant_id FROM warehouses LIMIT 1), :num, :poId, :supId, :whId, 'purchase', 'completed', :inv, :dn, :totalItems, :totalQty, :totalValue, 'Admin', :notes)
      RETURNING id
    `, { replacements: { num: grNum, poId: purchaseOrderId || null, supId: supplierId, whId: warehouseId || null, inv: invoiceNumber || null, dn: deliveryNote || null, totalItems: items.length, totalQty, totalValue, notes: notes || null } });

    const grId = result[0].id;
    for (const item of items) {
      const totalCost = (item.receivedQty || 0) * (item.unitCost || 0);
      await sequelize.query(`INSERT INTO goods_receipt_items (goods_receipt_id, product_id, ordered_qty, received_qty, accepted_qty, unit_cost, total_cost, batch_number, expiry_date, location_id, quality_status)
        VALUES (:grId, :prodId, :ordered, :received, :accepted, :cost, :total, :batch, :expiry, :locId, 'passed')`,
        { replacements: { grId, prodId: item.productId, ordered: item.orderedQty || item.receivedQty, received: item.receivedQty, accepted: item.acceptedQty || item.receivedQty, cost: item.unitCost || 0, total: totalCost, batch: item.batchNumber || null, expiry: item.expiryDate || null, locId: item.locationId || null } });

      // Update stock
      if (warehouseId) {
        const [existing] = await sequelize.query("SELECT id FROM inventory_stock WHERE product_id=:pid AND warehouse_id=:whId LIMIT 1", { replacements: { pid: item.productId, whId: warehouseId } });
        if (existing.length > 0) {
          await sequelize.query("UPDATE inventory_stock SET quantity=quantity+:qty, available_quantity=available_quantity+:qty, last_movement_date=NOW(), updated_at=NOW() WHERE id=:sid", { replacements: { qty: item.receivedQty, sid: existing[0].id } });
        } else {
          await sequelize.query("INSERT INTO inventory_stock (product_id, warehouse_id, quantity, reserved_quantity, available_quantity, cost_price) VALUES (:pid, :whId, :qty, 0, :qty, :cost)", { replacements: { pid: item.productId, whId: warehouseId, qty: item.receivedQty, cost: item.unitCost || 0 } });
        }
        // Stock movement
        await sequelize.query(`INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, unit_cost, performed_by_name, reference_type, reference_id)
          VALUES ((SELECT tenant_id FROM warehouses LIMIT 1), :pid, :whId, 'purchase', :qty, :cost, 'System', 'goods_receipt', :grId)`,
          { replacements: { pid: item.productId, whId: warehouseId, qty: item.receivedQty, cost: item.unitCost || 0, grId: String(grId) } });
      }

      // Update PO received qty
      if (item.poItemId) {
        await sequelize.query("UPDATE purchase_order_items SET received_qty=received_qty+:qty WHERE id=:poItemId", { replacements: { qty: item.receivedQty, poItemId: item.poItemId } });
      }
    }

    // Update PO status
    if (purchaseOrderId) {
      const [poItems] = await sequelize.query("SELECT SUM(quantity) as total, SUM(received_qty) as received FROM purchase_order_items WHERE purchase_order_id=:poId", { replacements: { poId: purchaseOrderId } });
      if (poItems.length > 0) {
        const newStatus = parseFloat(poItems[0].received) >= parseFloat(poItems[0].total) ? 'received' : 'partial';
        await sequelize.query("UPDATE purchase_orders SET status=:status, actual_delivery=CURRENT_DATE, updated_at=NOW() WHERE id=:poId", { replacements: { status: newStatus, poId: purchaseOrderId } });
      }
    }

    return res.status(HttpStatus.CREATED).json(successResponse({ id: grId, grNumber: grNum }, undefined, 'Goods receipt created'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== SUPPLIERS ====================
async function handleSuppliers(req: NextApiRequest, res: NextApiResponse, method: string) {
  if (method === 'GET') {
    const [suppliers] = await sequelize.query(`
      SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.supplier_id=s.id) as product_count,
        (SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id=s.id) as po_count
      FROM suppliers s ORDER BY s.name
    `);
    return res.status(HttpStatus.OK).json(successResponse(suppliers));
  }

  if (method === 'POST') {
    const { code, name, contactPerson, email, phone, address, city, paymentTerms, bankName, bankAccount, notes } = req.body;
    if (!name) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Name required'));
    const supCode = code || `SUP-${Date.now().toString(36).toUpperCase()}`;
    const [result] = await sequelize.query(`INSERT INTO suppliers (tenant_id, code, name, contact_person, email, phone, address, city, payment_terms, bank_name, bank_account, notes, is_active)
      VALUES (COALESCE((SELECT tenant_id FROM suppliers LIMIT 1), (SELECT id FROM tenants LIMIT 1)), :code, :name, :contact, :email, :phone, :address, :city, :terms, :bank, :acct, :notes, true) RETURNING id`,
      { replacements: { code: supCode, name, contact: contactPerson || null, email: email || null, phone: phone || null, address: address || null, city: city || null, terms: paymentTerms || 'Net 30', bank: bankName || null, acct: bankAccount || null, notes: notes || null } });
    return res.status(HttpStatus.CREATED).json(successResponse({ id: result[0].id }, undefined, 'Supplier created'));
  }

  if (method === 'PUT') {
    const { id } = req.query;
    const fields = req.body;
    const sets: string[] = [];
    const params: any = { id };
    const fieldMap: Record<string, string> = { name: 'name', contactPerson: 'contact_person', email: 'email', phone: 'phone', address: 'address', city: 'city', paymentTerms: 'payment_terms', bankName: 'bank_name', bankAccount: 'bank_account', notes: 'notes', isActive: 'is_active' };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (fields[key] !== undefined) { sets.push(`${col}=:${key}`); params[key] = fields[key]; }
    }
    if (sets.length > 0) {
      sets.push("updated_at=NOW()");
      await sequelize.query(`UPDATE suppliers SET ${sets.join(', ')} WHERE id=:id`, { replacements: params });
    }
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'Supplier updated'));
  }

  if (method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Supplier ID required'));
    await sequelize.query("UPDATE suppliers SET is_active=false, updated_at=NOW() WHERE id=:id", { replacements: { id } });
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'Supplier deactivated'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== CATEGORIES ====================
async function handleCategories(req: NextApiRequest, res: NextApiResponse, method: string) {
  if (method === 'GET') {
    const [categories] = await sequelize.query(`
      SELECT pc.*, (SELECT COUNT(*) FROM products p WHERE p.category_id=pc.id) as product_count
      FROM product_categories pc ORDER BY pc.sort_order, pc.name
    `);
    return res.status(HttpStatus.OK).json(successResponse(categories));
  }

  if (method === 'POST') {
    const { code, name, parentId, description, icon, color } = req.body;
    if (!code || !name) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Code and name required'));
    const [result] = await sequelize.query(`INSERT INTO product_categories (tenant_id, code, name, parent_id, description, icon, color, is_active)
      VALUES ((SELECT tenant_id FROM product_categories LIMIT 1), :code, :name, :parentId, :desc, :icon, :color, true) RETURNING id`,
      { replacements: { code, name, parentId: parentId || null, desc: description || null, icon: icon || null, color: color || null } });
    return res.status(HttpStatus.CREATED).json(successResponse({ id: result[0].id }, undefined, 'Category created'));
  }

  if (method === 'PUT') {
    const { id } = req.query;
    const fields = req.body;
    const sets: string[] = [];
    const params: any = { id };
    const fieldMap: Record<string, string> = { name: 'name', description: 'description', icon: 'icon', color: 'color', parentId: 'parent_id', sortOrder: 'sort_order', isActive: 'is_active' };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (fields[key] !== undefined) { sets.push(`${col}=:${key}`); params[key] = fields[key]; }
    }
    if (sets.length > 0) {
      sets.push("updated_at=NOW()");
      await sequelize.query(`UPDATE product_categories SET ${sets.join(', ')} WHERE id=:id`, { replacements: params });
    }
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'Category updated'));
  }

  if (method === 'DELETE') {
    const { id } = req.query;
    await sequelize.query("UPDATE product_categories SET is_active=false, updated_at=NOW() WHERE id=:id", { replacements: { id } });
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'Category deactivated'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== ALERTS ====================
async function handleAlerts(req: NextApiRequest, res: NextApiResponse, method: string) {
  if (method === 'GET') {
    const { type, resolved } = req.query;
    let where = 'WHERE 1=1';
    const params: any = {};
    if (type && type !== 'all') { where += ' AND a.alert_type=:type'; params.type = type; }
    if (resolved === 'false') where += ' AND a.is_resolved=false';
    if (resolved === 'true') where += ' AND a.is_resolved=true';

    const [alerts] = await sequelize.query(`
      SELECT a.*, p.name as product_name, p.sku, w.name as warehouse_name
      FROM stock_alerts a LEFT JOIN products p ON p.id=a.product_id LEFT JOIN warehouses w ON w.id=a.warehouse_id
      ${where} ORDER BY a.created_at DESC
    `, { replacements: params });

    const [stats] = await sequelize.query("SELECT alert_type, COUNT(*)::int as count FROM stock_alerts WHERE is_resolved=false GROUP BY alert_type");

    return res.status(HttpStatus.OK).json(successResponse({ alerts, stats }));
  }

  if (method === 'PUT') {
    const { id, action: alertAction } = req.query;
    if (alertAction === 'resolve') {
      await sequelize.query("UPDATE stock_alerts SET is_resolved=true, resolved_at=NOW(), resolved_action=:action, updated_at=NOW() WHERE id=:id", { replacements: { id, action: req.body?.action || 'Manual resolve' } });
    } else if (alertAction === 'read') {
      await sequelize.query("UPDATE stock_alerts SET is_read=true, updated_at=NOW() WHERE id=:id", { replacements: { id } });
    }
    return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'Alert updated'));
  }

  // Generate alerts
  if (method === 'POST') {
    // Low stock alerts
    await sequelize.query(`
      INSERT INTO stock_alerts (tenant_id, product_id, alert_type, severity, title, message, current_stock, threshold)
      SELECT p.tenant_id, p.id, 'low_stock', 'warning', 'Stok Rendah: ' || p.name,
        'Stok ' || p.name || ' hanya ' || COALESCE(SUM(s.quantity),0)::int || ' (minimum: ' || p.minimum_stock || ')',
        COALESCE(SUM(s.quantity),0), p.minimum_stock
      FROM products p LEFT JOIN inventory_stock s ON s.product_id=p.id
      WHERE p.is_active=true
      GROUP BY p.id, p.name, p.tenant_id, p.minimum_stock
      HAVING COALESCE(SUM(s.quantity),0) > 0 AND COALESCE(SUM(s.quantity),0) < p.minimum_stock
      AND p.id NOT IN (SELECT product_id FROM stock_alerts WHERE alert_type='low_stock' AND is_resolved=false AND product_id IS NOT NULL)
    `);

    // Out of stock alerts
    await sequelize.query(`
      INSERT INTO stock_alerts (tenant_id, product_id, alert_type, severity, title, message, current_stock, threshold)
      SELECT p.tenant_id, p.id, 'out_of_stock', 'critical', 'Stok Habis: ' || p.name,
        p.name || ' sudah habis di semua gudang', 0, p.minimum_stock
      FROM products p LEFT JOIN inventory_stock s ON s.product_id=p.id
      WHERE p.is_active=true
      GROUP BY p.id, p.name, p.tenant_id, p.minimum_stock
      HAVING COALESCE(SUM(s.quantity),0) = 0
      AND p.id NOT IN (SELECT product_id FROM stock_alerts WHERE alert_type='out_of_stock' AND is_resolved=false AND product_id IS NOT NULL)
    `);

    const [newAlerts] = await sequelize.query("SELECT COUNT(*)::int as c FROM stock_alerts WHERE is_resolved=false");
    return res.status(HttpStatus.OK).json(successResponse({ totalUnresolved: newAlerts[0].c }, undefined, 'Alerts generated'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}

// ==================== MOVEMENTS ====================
async function handleMovements(req: NextApiRequest, res: NextApiResponse) {
  const { productId, warehouseId, type, dateFrom, dateTo, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(200, parseInt(limit as string));
  const offset = (pageNum - 1) * limitNum;

  let where = 'WHERE 1=1';
  const params: any = {};
  if (productId) { where += ' AND sm.product_id=:productId'; params.productId = productId; }
  if (warehouseId) { where += ' AND sm.warehouse_id=:warehouseId'; params.warehouseId = warehouseId; }
  if (type && type !== 'all') { where += ' AND sm.movement_type=:type'; params.type = type; }
  if (dateFrom) { where += ' AND sm.movement_date >= :dateFrom'; params.dateFrom = dateFrom; }
  if (dateTo) { where += " AND sm.movement_date <= :dateTo::date + interval '1 day'"; params.dateTo = dateTo; }

  const [countResult] = await sequelize.query(`SELECT COUNT(*)::int as total FROM stock_movements sm ${where}`, { replacements: params });
  const total = parseInt(countResult[0].total);

  const [movements] = await sequelize.query(`
    SELECT sm.*, p.name as product_name, p.sku, w.name as warehouse_name
    FROM stock_movements sm JOIN products p ON p.id=sm.product_id LEFT JOIN warehouses w ON w.id=sm.warehouse_id
    ${where} ORDER BY sm.movement_date DESC LIMIT :limit OFFSET :offset
  `, { replacements: { ...params, limit: limitNum, offset } });

  // Summary stats
  const [summaryStats] = await sequelize.query(`
    SELECT movement_type, COUNT(*)::int as count, SUM(ABS(quantity))::int as total_qty
    FROM stock_movements sm ${where} GROUP BY movement_type
  `, { replacements: params });

  return res.status(HttpStatus.OK).json(successResponse(
    { movements, stats: summaryStats },
    { total, limit: limitNum, page: pageNum, totalPages: Math.ceil(total / limitNum) }
  ));
}

// ==================== SETTINGS ====================
async function handleSettings(req: NextApiRequest, res: NextApiResponse, method: string) {
  if (method === 'GET') {
    const [settings] = await sequelize.query("SELECT * FROM inventory_settings ORDER BY category, setting_key");
    const grouped: Record<string, any[]> = {};
    settings.forEach((s: any) => {
      const cat = s.category || 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    });
    return res.status(HttpStatus.OK).json(successResponse(grouped));
  }

  if (method === 'PUT') {
    const updates = req.body; // { key: value, key2: value2 }
    if (typeof updates === 'object') {
      for (const [key, value] of Object.entries(updates)) {
        await sequelize.query("UPDATE inventory_settings SET setting_value=:val, updated_at=NOW() WHERE setting_key=:key", { replacements: { key, val: String(value) } });
      }
    }
    return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Settings updated'));
  }

  return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed'));
}
