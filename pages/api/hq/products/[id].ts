import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext, buildTenantFilter } from '../../../../lib/middleware/tenantIsolation';
import { logAudit, computeDiff } from '../../../../lib/audit/auditLogger';
import { validateBody, V, sanitizeBody } from '../../../../lib/middleware/withValidation';
import { checkLimit, RateLimitTier } from '../../../../lib/middleware/rateLimit';

const sequelize = require('../../../../lib/sequelize');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getProductById(req, res);
      case 'PUT':
      case 'PATCH':
        return await updateProduct(req, res);
      case 'DELETE':
        return await deleteProduct(req, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error: any) {
    console.warn('Product [id] API Error:', error.message);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'products' });

/**
 * Get single product by ID with stock information
 */
async function getProductById(req: NextApiRequest, res: NextApiResponse) {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'p');
  const { id } = req.query;

  if (!id) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Product ID is required')
    );
  }

  const [products] = await sequelize.query(`
    SELECT p.*, 
           pc.name as category_name,
           s.total_stock,
           s.stock_value
    FROM products p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    LEFT JOIN (
      SELECT product_id, 
             COALESCE(SUM(quantity), 0)::int as total_stock,
             COALESCE(SUM(quantity * cost_price), 0)::numeric(15,0) as stock_value
      FROM inventory_stock
      GROUP BY product_id
    ) s ON s.product_id = p.id
    WHERE p.id = :id ${tf.condition}
  `, { replacements: { id, ...tf.replacements } });

  if (!products || products.length === 0) {
    return res.status(HttpStatus.NOT_FOUND).json(
      errorResponse(ErrorCodes.NOT_FOUND, 'Product not found')
    );
  }

  const p = products[0];

  // Get warehouse/branch breakdown
  const [stockBreakdown] = await sequelize.query(`
    SELECT s.warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
           s.quantity::int as stock, s.available_quantity::int as available_stock,
           s.cost_price::numeric(15,0) as cost_price,
           s.updated_at as last_updated
    FROM inventory_stock s
    JOIN warehouses w ON w.id = s.warehouse_id
    WHERE s.product_id = :id
    ORDER BY w.name
  `, { replacements: { id } });

  const product = {
    id: String(p.id),
    sku: p.sku,
    name: p.name,
    description: p.description || '',
    barcode: p.barcode || '',
    categoryId: p.category_id,
    categoryName: p.category_name || '-',
    unit: p.unit || 'pcs',
    costPrice: parseFloat(p.buy_price) || 0,
    sellingPrice: parseFloat(p.sell_price) || 0,
    minStock: p.minimum_stock || 10,
    maxStock: p.maximum_stock || 1000,
    reorderPoint: p.reorder_point || 0,
    isActive: p.is_active,
    isTrackable: p.is_trackable,
    totalStock: p.total_stock || 0,
    stockValue: parseFloat(p.stock_value) || 0,
    stockStatus: p.total_stock === 0 ? 'out' : p.total_stock < p.minimum_stock ? 'low' : 'normal',
    branches: stockBreakdown.map((b: any) => ({
      branchId: String(b.warehouse_id),
      branchName: b.warehouse_name,
      branchCode: b.warehouse_code,
      stock: b.stock,
      availableStock: b.available_stock,
      costPrice: parseFloat(b.cost_price),
      lastUpdated: b.last_updated
    })),
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };

  return res.status(HttpStatus.OK).json(
    successResponse(product, undefined, 'Product retrieved successfully')
  );
}

/**
 * Update product
 */
async function updateProduct(req: NextApiRequest, res: NextApiResponse) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE))) return;
  sanitizeBody(req);

  const errors = validateBody(req, {
    sku: V.optional().string().minLength(1),
    name: V.optional().string().minLength(1),
    description: V.optional().string(),
    categoryId: V.optional().integer(),
    unit: V.optional().string(),
    costPrice: V.optional().number().min(0),
    sellingPrice: V.optional().number().min(0),
    minStock: V.optional().integer().min(0),
    maxStock: V.optional().integer().min(0),
    isActive: V.optional().boolean(),
  });
  if (errors) return res.status(HttpStatus.BAD_REQUEST).json(errors);

  const ctx = getTenantContext(req);
  const { id } = req.query;
  const { sku, name, description, categoryId, unit, costPrice, sellingPrice, minStock, maxStock, isActive } = req.body;

  // Get current product for audit
  const [currentProducts] = await sequelize.query(`
    SELECT p.* FROM products p WHERE p.id = :id
  `, { replacements: { id } });

  if (!currentProducts || currentProducts.length === 0) {
    return res.status(HttpStatus.NOT_FOUND).json(
      errorResponse(ErrorCodes.NOT_FOUND, 'Product not found')
    );
  }

  const oldProduct = currentProducts[0];

  // Build update fields
  const updateFields: string[] = [];
  const replacements: Record<string, any> = { id, updatedBy: ctx.userId };

  if (sku !== undefined) { updateFields.push('sku = :sku'); replacements.sku = sku; }
  if (name !== undefined) { updateFields.push('name = :name'); replacements.name = name; }
  if (description !== undefined) { updateFields.push('description = :description'); replacements.description = description; }
  if (categoryId !== undefined) { updateFields.push('category_id = :categoryId'); replacements.categoryId = categoryId; }
  if (unit !== undefined) { updateFields.push('unit = :unit'); replacements.unit = unit; }
  if (costPrice !== undefined) { updateFields.push('buy_price = :costPrice'); replacements.costPrice = costPrice; }
  if (sellingPrice !== undefined) { updateFields.push('sell_price = :sellingPrice'); replacements.sellingPrice = sellingPrice; }
  if (minStock !== undefined) { updateFields.push('minimum_stock = :minStock'); replacements.minStock = minStock; }
  if (maxStock !== undefined) { updateFields.push('maximum_stock = :maxStock'); replacements.maxStock = maxStock; }
  if (isActive !== undefined) { updateFields.push('is_active = :isActive'); replacements.isActive = isActive; }

  if (updateFields.length === 0) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'No fields to update')
    );
  }

  updateFields.push('updated_at = NOW()');

  try {
    await sequelize.query(`
      UPDATE products SET ${updateFields.join(', ')} WHERE id = :id
    `, { replacements });
  } catch (error: any) {
    if (error.message?.includes('unique') || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(HttpStatus.CONFLICT).json(
        errorResponse(ErrorCodes.DUPLICATE_ENTRY, 'SKU already exists')
      );
    }
    throw error;
  }

  // Get updated product
  const [updatedProducts] = await sequelize.query(`
    SELECT p.*, pc.name as category_name
    FROM products p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    WHERE p.id = :id
  `, { replacements: { id } });

  const newProduct = updatedProducts[0];

  // Compute diff for audit
  const diff = computeDiff(
    { sku: oldProduct.sku, name: oldProduct.name, categoryId: oldProduct.category_id, unit: oldProduct.unit, costPrice: parseFloat(oldProduct.buy_price), sellingPrice: parseFloat(oldProduct.sell_price), minStock: oldProduct.minimum_stock, maxStock: oldProduct.maximum_stock, isActive: oldProduct.is_active },
    { sku: newProduct.sku, name: newProduct.name, categoryId: newProduct.category_id, unit: newProduct.unit, costPrice: parseFloat(newProduct.buy_price), sellingPrice: parseFloat(newProduct.sell_price), minStock: newProduct.minimum_stock, maxStock: newProduct.maximum_stock, isActive: newProduct.is_active }
  );

  await logAudit({
    tenantId: ctx.tenantId as string,
    userId: ctx.userId,
    userName: ctx.userName,
    action: 'update',
    entityType: 'product',
    entityId: id as string,
    oldValues: diff.hasChanges ? { ...oldProduct } : null,
    newValues: diff.hasChanges ? { ...newProduct } : null,
    metadata: { changedFields: Object.keys(diff.changed) },
    req
  });

  const result = {
    id: String(newProduct.id),
    sku: newProduct.sku,
    name: newProduct.name,
    description: newProduct.description,
    categoryId: newProduct.category_id,
    categoryName: newProduct.category_name,
    unit: newProduct.unit,
    costPrice: parseFloat(newProduct.buy_price),
    sellingPrice: parseFloat(newProduct.sell_price),
    minStock: newProduct.minimum_stock,
    maxStock: newProduct.maximum_stock,
    isActive: newProduct.is_active,
    updatedAt: newProduct.updated_at
  };

  return res.status(HttpStatus.OK).json(
    successResponse(result, undefined, 'Product updated successfully')
  );
}

/**
 * Delete product (soft delete via is_active = false)
 */
async function deleteProduct(req: NextApiRequest, res: NextApiResponse) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE))) return;

  const ctx = getTenantContext(req);
  const { id } = req.query;

  if (!id) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Product ID is required')
    );
  }

  // Get current product for audit
  const [currentProducts] = await sequelize.query(`
    SELECT p.* FROM products p WHERE p.id = :id
  `, { replacements: { id } });

  if (!currentProducts || currentProducts.length === 0) {
    return res.status(HttpStatus.NOT_FOUND).json(
      errorResponse(ErrorCodes.NOT_FOUND, 'Product not found')
    );
  }

  const oldProduct = currentProducts[0];

  // Check if product has transactions or stock (soft delete instead)
  const [transactionCheck] = await sequelize.query(`
    SELECT COUNT(*)::int as count FROM pos_transaction_items WHERE product_id = :id
  `, { replacements: { id } });

  const [stockCheck] = await sequelize.query(`
    SELECT COUNT(*)::int as count FROM inventory_stock WHERE product_id = :id AND quantity > 0
  `, { replacements: { id } });

  const hasTransactions = transactionCheck[0]?.count > 0;
  const hasStock = stockCheck[0]?.count > 0;

  if (hasTransactions || hasStock) {
    // Soft delete - mark as inactive
    await sequelize.query(`
      UPDATE products SET is_active = false, updated_at = NOW() WHERE id = :id
    `, { replacements: { id } });

    await logAudit({
      tenantId: ctx.tenantId as string,
      userId: ctx.userId,
      userName: ctx.userName,
      action: 'delete',
      entityType: 'product',
      entityId: id as string,
      oldValues: { name: oldProduct.name, sku: oldProduct.sku, isActive: oldProduct.is_active },
      newValues: { isActive: false, deleteReason: 'soft_deleted_due_to_transactions_or_stock' },
      req
    });

    return res.status(HttpStatus.OK).json(
      successResponse(
        { id, softDeleted: true, reason: hasTransactions ? 'has_transactions' : hasStock ? 'has_stock' : 'protected' },
        undefined,
        'Product soft deleted (marked as inactive) due to existing transactions or stock'
      )
    );
  }

  // Hard delete only if no transactions and no stock
  await sequelize.query(`
    DELETE FROM products WHERE id = :id
  `, { replacements: { id } });

  await logAudit({
    tenantId: ctx.tenantId as string,
    userId: ctx.userId,
    userName: ctx.userName,
    action: 'delete',
    entityType: 'product',
    entityId: id as string,
    oldValues: { name: oldProduct.name, sku: oldProduct.sku },
    req
  });

  return res.status(HttpStatus.OK).json(
    successResponse({ id, deleted: true }, undefined, 'Product deleted successfully')
  );
}
