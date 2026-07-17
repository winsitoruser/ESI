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
      case 'GET':
        return await getProducts(req, res);
      case 'POST':
        return await createProduct(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error: any) {
    console.warn('Products API Error:', error.message);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'products' });

/**
 * Get products list with pagination, search, category filter, and actual stock data
 */
async function getProducts(req: NextApiRequest, res: NextApiResponse) {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'p');
  const { page = '1', limit = '20', search, category, status } = req.query;

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, parseInt(limit as string));
  const offset = (pageNum - 1) * limitNum;

  // Build WHERE clause
  let where = 'WHERE 1=1' + tf.condition;
  const params: Record<string, any> = { ...tf.replacements };

  if (search) {
    where += ` AND (p.name ILIKE :search OR p.sku ILIKE :search OR p.barcode ILIKE :search)`;
    params.search = `%${search}%`;
  }

  if (category && category !== 'all' && category !== 'Semua Kategori') {
    where += ` AND (pc.name = :category OR pc.id::text = :categoryId)`;
    params.category = category;
    params.categoryId = category;
  }

  if (status) {
    if (status === 'active') {
      where += ` AND p.is_active = true`;
    } else if (status === 'inactive') {
      where += ` AND p.is_active = false`;
    }
  }

  // Count total
  const [countResult] = await sequelize.query(`
    SELECT COUNT(*)::int as total FROM products p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    ${where}
  `, { replacements: params });

  const total = countResult[0]?.total || 0;

  // Get products with stock data
  const [products] = await sequelize.query(`
    SELECT p.*,
           pc.name as category_name,
           COALESCE(s.total_stock, 0)::int as total_stock,
           COALESCE(s.stock_value, 0)::numeric(15,0) as stock_value,
           CASE
             WHEN COALESCE(s.total_stock, 0) = 0 THEN 'out'
             WHEN COALESCE(s.total_stock, 0) < p.minimum_stock THEN 'low'
             ELSE 'normal'
           END as stock_status
    FROM products p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    LEFT JOIN (
      SELECT product_id,
             COALESCE(SUM(quantity), 0) as total_stock,
             COALESCE(SUM(quantity * cost_price), 0) as stock_value
      FROM inventory_stock
      GROUP BY product_id
    ) s ON s.product_id = p.id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT :limit OFFSET :offset
  `, { replacements: { ...params, limit: limitNum, offset } });

  // Get branch stock breakdown for these products
  const productIds = products.map((p: any) => p.id);
  let branchBreakdown: any[] = [];
  if (productIds.length > 0) {
    const tfStock = buildTenantFilter(ctx.tenantId, 's');
    const tfWarehouse = buildTenantFilter(ctx.tenantId, 'w');
    [branchBreakdown] = await sequelize.query(`
      SELECT s.product_id, w.id as branch_id, w.name as branch_name, w.code as branch_code,
             s.quantity::int as stock, s.available_quantity::int as available_stock,
             s.updated_at as last_updated
      FROM inventory_stock s
      JOIN warehouses w ON w.id = s.warehouse_id
      WHERE s.product_id IN (:ids) ${tfStock.condition} ${tfWarehouse.condition}
      ORDER BY w.name
    `, { replacements: { ids: productIds, ...tfStock.replacements, ...tfWarehouse.replacements } });
  }

  const formattedProducts = products.map((p: any) => ({
    id: String(p.id),
    sku: p.sku,
    name: p.name,
    description: p.description || '',
    barcode: p.barcode || '',
    categoryId: p.category_id,
    categoryName: p.category_name || '-',
    unit: p.unit || 'pcs',
    basePrice: parseFloat(p.sell_price) || 0,
    costPrice: parseFloat(p.buy_price) || 0,
    isActive: p.is_active,
    imageUrl: p.image_url || null,
    minStock: p.minimum_stock || 10,
    maxStock: p.maximum_stock || 1000,
    totalStock: p.total_stock || 0,
    stockValue: parseFloat(p.stock_value) || 0,
    stockStatus: p.stock_status,
    branches: branchBreakdown
      .filter((b: any) => b.product_id === p.id)
      .map((b: any) => ({
        branchId: String(b.branch_id),
        branchName: b.branch_name,
        branchCode: b.branch_code,
        stock: b.stock,
        availableStock: b.available_stock,
        lastUpdated: b.last_updated
      })),
    createdAt: p.created_at,
    updatedAt: p.updated_at
  }));

  // Calculate summary stats
  const stats = {
    totalProducts: total,
    totalStock: formattedProducts.reduce((s: number, p: any) => s + p.totalStock, 0),
    totalValue: formattedProducts.reduce((s: number, p: any) => s + p.stockValue, 0),
    lowStockCount: formattedProducts.filter((p: any) => p.stockStatus === 'low').length,
    outOfStockCount: formattedProducts.filter((p: any) => p.stockStatus === 'out').length
  };

  return res.status(HttpStatus.OK).json(
    successResponse(
      { products: formattedProducts, stats },
      {
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      },
      'Products retrieved successfully'
    )
  );
}

/**
 * Create a new product
 */
async function createProduct(req: NextApiRequest, res: NextApiResponse) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE))) return;
  sanitizeBody(req);

  const errors = validateBody(req, {
    sku: V.required().string().minLength(1),
    name: V.required().string().minLength(1),
    description: V.optional().string(),
    categoryId: V.optional().integer(),
    unit: V.optional().string(),
    costPrice: V.optional().number().min(0),
    sellingPrice: V.optional().number().min(0),
    minStock: V.optional().integer().min(0),
    maxStock: V.optional().integer().min(0),
  });
  if (errors) return res.status(HttpStatus.BAD_REQUEST).json(errors);

  const ctx = getTenantContext(req);
  const {
    sku,
    name,
    description,
    categoryId,
    unit = 'pcs',
    costPrice = 0,
    sellingPrice = 0,
    minStock = 10,
    maxStock = 1000
  } = req.body;

  const tf = buildTenantFilter(ctx.tenantId, 'p');

  // Check if SKU already exists
  const [existing] = await sequelize.query(`
    SELECT id FROM products p WHERE sku = :sku ${tf.condition} LIMIT 1
  `, { replacements: { sku, ...tf.replacements } });

  if (existing && existing.length > 0) {
    return res.status(HttpStatus.CONFLICT).json(
      errorResponse(ErrorCodes.DUPLICATE_ENTRY, 'SKU already exists')
    );
  }

  // Insert new product
  const [result] = await sequelize.query(`
    INSERT INTO products (
      sku, name, description, category_id, unit,
      buy_price, sell_price, minimum_stock, maximum_stock,
      is_active, is_trackable, created_at, updated_at
    ) VALUES (
      :sku, :name, :description, :categoryId, :unit,
      :costPrice, :sellingPrice, :minStock, :maxStock,
      true, true, NOW(), NOW()
    )
    RETURNING id, sku, name, description, category_id, unit, buy_price, sell_price,
              minimum_stock, maximum_stock, is_active, created_at
  `, {
    replacements: {
      sku,
      name,
      description: description || null,
      categoryId: categoryId || null,
      unit,
      costPrice,
      sellingPrice,
      minStock,
      maxStock
    }
  });

  const newProduct = result[0];

  // Get category name for response
  let categoryName = '-';
  if (newProduct.category_id) {
    const [catResult] = await sequelize.query(`
      SELECT name FROM product_categories WHERE id = :id LIMIT 1
    `, { replacements: { id: newProduct.category_id } });
    if (catResult && catResult.length > 0) {
      categoryName = catResult[0].name;
    }
  }

  await logAudit({
    tenantId: ctx.tenantId as string,
    userId: ctx.userId,
    userName: ctx.userName,
    action: 'create',
    entityType: 'product',
    entityId: String(newProduct.id),
    newValues: {
      sku: newProduct.sku,
      name: newProduct.name,
      categoryId: newProduct.category_id,
      unit: newProduct.unit,
      costPrice: parseFloat(newProduct.buy_price),
      sellingPrice: parseFloat(newProduct.sell_price)
    },
    req
  });

  const product = {
    id: String(newProduct.id),
    sku: newProduct.sku,
    name: newProduct.name,
    description: newProduct.description,
    categoryId: newProduct.category_id,
    categoryName,
    unit: newProduct.unit,
    basePrice: parseFloat(newProduct.sell_price),
    costPrice: parseFloat(newProduct.buy_price),
    minStock: newProduct.minimum_stock,
    maxStock: newProduct.maximum_stock,
    isActive: newProduct.is_active,
    totalStock: 0,
    stockValue: 0,
    stockStatus: 'out',
    branches: [],
    createdAt: newProduct.created_at
  };

  return res.status(HttpStatus.CREATED).json(
    successResponse(product, undefined, 'Product created successfully')
  );
}
