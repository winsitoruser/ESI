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
      case 'GET': return await getProducts(req, res);
      case 'POST': return await createProduct(req, res);
      case 'PUT': return await updateProduct(req, res);
      case 'DELETE': return await deleteProduct(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`));
    }
  } catch (error: any) {
    console.error('Inventory Products API Error:', error.message);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
  }
}

export default withHQAuth(handler, { module: 'inventory' });

async function getProducts(req: NextApiRequest, res: NextApiResponse) {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'p');
  const { search, category, isActive, page = '1', limit = '25' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, parseInt(limit as string));
  const offset = (pageNum - 1) * limitNum;

  let where = 'WHERE 1=1' + tf.condition;
  const params: any = { ...tf.replacements };
  if (search) { where += ` AND (p.name ILIKE :search OR p.sku ILIKE :search OR p.barcode ILIKE :search)`; params.search = `%${search}%`; }
  if (category && category !== 'all') { where += ` AND pc.name = :category`; params.category = category; }
  if (isActive === 'true') where += ' AND p.is_active=true';
  if (isActive === 'false') where += ' AND p.is_active=false';

  const [countResult] = await sequelize.query(`SELECT COUNT(*) as total FROM products p LEFT JOIN product_categories pc ON pc.id=p.category_id ${where}`, { replacements: params });
  const total = parseInt(countResult[0].total);

  const [products] = await sequelize.query(`
    SELECT p.*, pc.name as category_name, pc.code as category_code, pc.color as category_color,
      sup.name as supplier_name, sup.code as supplier_code,
      COALESCE(sa.total_stock, 0)::int as total_stock,
      COALESCE(sa.total_value, 0)::numeric(15,0) as stock_value
    FROM products p
    LEFT JOIN product_categories pc ON pc.id=p.category_id
    LEFT JOIN suppliers sup ON sup.id=p.supplier_id
    LEFT JOIN (SELECT product_id, SUM(quantity) as total_stock, SUM(quantity*cost_price) as total_value FROM inventory_stock GROUP BY product_id) sa ON sa.product_id=p.id
    ${where} ORDER BY p.name LIMIT :limit OFFSET :offset
  `, { replacements: { ...params, limit: limitNum, offset } });

  const [categories] = await sequelize.query("SELECT DISTINCT pc.name FROM product_categories pc WHERE pc.is_active=true ORDER BY pc.name");

  return res.status(HttpStatus.OK).json(successResponse(products.map((p: any) => ({
    id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, description: p.description,
    unit: p.unit, buyPrice: parseFloat(p.buy_price), sellPrice: parseFloat(p.sell_price),
    category: p.category_name || '-', categoryCode: p.category_code, categoryColor: p.category_color,
    supplier: p.supplier_name || '-', supplierCode: p.supplier_code,
    minStock: p.minimum_stock, maxStock: p.maximum_stock, reorderPoint: p.reorder_point,
    isActive: p.is_active, isTrackable: p.is_trackable,
    totalStock: p.total_stock, stockValue: parseFloat(p.stock_value),
    imageUrl: p.image_url, tags: p.tags || []
  })), { total, limit: limitNum, page: pageNum, totalPages: Math.ceil(total / limitNum), filters: { categories: categories.map((c: any) => c.name) } }));
}

async function createProduct(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const errors = validateBody(req, {
    name: V.required().string().minLength(1).maxLength(200),
  });
  if (errors) return res.status(HttpStatus.BAD_REQUEST).json(errors);

  const ctx = getTenantContext(req);
  const { name, sku, barcode, categoryId, supplierId, unit, buyPrice, sellPrice, minStock, maxStock, reorderPoint, description } = req.body;

  const [result] = await sequelize.query(`
    INSERT INTO products (tenant_id, name, sku, barcode, category_id, supplier_id, unit, buy_price, sell_price, minimum_stock, maximum_stock, reorder_point, description, is_active, is_trackable)
    VALUES (:tenantId, :name, :sku, :barcode, :catId, :supId, :unit, :buy, :sell, :min, :max, :reorder, :desc, true, true) RETURNING id
  `, { replacements: { tenantId: ctx.tenantId, name, sku: sku || null, barcode: barcode || null, catId: categoryId || null, supId: supplierId || null, unit: unit || 'pcs', buy: buyPrice || 0, sell: sellPrice || 0, min: minStock || 0, max: maxStock || 0, reorder: reorderPoint || 0, desc: description || null } });

  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'product', entityId: result[0]?.id, newValues: { name, sku, buyPrice, sellPrice }, req });

  return res.status(HttpStatus.CREATED).json(successResponse({ id: result[0].id }, undefined, 'Product created'));
}

async function updateProduct(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const { id } = req.query;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Product ID required'));

  const fields = req.body;
  const sets: string[] = [];
  const params: any = { id, ...tf.replacements };
  const map: Record<string, string> = { name: 'name', sku: 'sku', barcode: 'barcode', categoryId: 'category_id', supplierId: 'supplier_id', unit: 'unit', buyPrice: 'buy_price', sellPrice: 'sell_price', minStock: 'minimum_stock', maxStock: 'maximum_stock', reorderPoint: 'reorder_point', description: 'description', isActive: 'is_active' };
  for (const [k, col] of Object.entries(map)) {
    if (fields[k] !== undefined) { sets.push(`${col}=:${k}`); params[k] = fields[k]; }
  }
  if (sets.length === 0) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.INVALID_INPUT, 'No fields'));
  sets.push("updated_at=NOW()");
  await sequelize.query(`UPDATE products SET ${sets.join(', ')} WHERE id=:id ${tf.condition}`, { replacements: params });

  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'update', entityType: 'product', entityId: id as string, newValues: fields, req });

  return res.status(HttpStatus.OK).json(successResponse({ id }, undefined, 'Product updated'));
}

async function deleteProduct(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const { id } = req.query;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Product ID required'));
  await sequelize.query(`UPDATE products SET is_active=false, updated_at=NOW() WHERE id=:id ${tf.condition}`, { replacements: { id, ...tf.replacements } });

  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'product', entityId: id as string, req });

  return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Product deactivated'));
}
