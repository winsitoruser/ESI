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
      case 'GET': return await getCategories(req, res);
      case 'POST': return await createCategory(req, res);
      case 'PUT': return await updateCategory(req, res);
      case 'DELETE': return await deleteCategory(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`));
    }
  } catch (error: any) {
    console.error('Inventory Categories API Error:', error.message);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
  }
}

export default withHQAuth(handler, { module: 'inventory' });

async function getCategories(req: NextApiRequest, res: NextApiResponse) {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'pc');
  const { search, flat } = req.query;
  let where = 'WHERE 1=1' + tf.condition;
  const params: any = { ...tf.replacements };
  if (search) { where += ' AND (pc.name ILIKE :search OR pc.description ILIKE :search)'; params.search = `%${search}%`; }

  const [categories] = await sequelize.query(`
    SELECT pc.*, parent.name as parent_name,
      (SELECT COUNT(*) FROM products p WHERE p.category_id=pc.id AND p.is_active=true)::int as product_count
    FROM product_categories pc
    LEFT JOIN product_categories parent ON parent.id=pc.parent_id
    ${where}
    ORDER BY pc.sort_order, pc.name
  `, { replacements: params });

  if (flat === 'true') {
    return res.status(HttpStatus.OK).json(successResponse(categories.map((c: any) => ({
      id: String(c.id), name: c.name, code: c.code, slug: c.code?.toLowerCase(),
      description: c.description || '', parentId: c.parent_id ? String(c.parent_id) : null,
      parentName: c.parent_name, level: c.parent_id ? 1 : 0,
      productCount: c.product_count, isActive: c.is_active,
      sortOrder: c.sort_order, icon: c.icon || 'Package', color: c.color || '#3B82F6'
    }))));
  }

  // Build tree structure
  const roots = categories.filter((c: any) => !c.parent_id);
  const tree = roots.map((r: any) => ({
    id: String(r.id), name: r.name, code: r.code, slug: r.code?.toLowerCase(),
    description: r.description || '', parentId: null, parentName: null, level: 0,
    productCount: r.product_count, isActive: r.is_active,
    sortOrder: r.sort_order, icon: r.icon || 'Package', color: r.color || '#3B82F6',
    children: categories.filter((c: any) => c.parent_id === r.id).map((c: any) => ({
      id: String(c.id), name: c.name, code: c.code, slug: c.code?.toLowerCase(),
      description: c.description || '', parentId: String(r.id), parentName: r.name, level: 1,
      productCount: c.product_count, isActive: c.is_active,
      sortOrder: c.sort_order, icon: c.icon || 'Package', color: c.color || '#3B82F6'
    }))
  }));

  return res.status(HttpStatus.OK).json(successResponse(tree));
}

async function createCategory(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const errors = validateBody(req, {
    name: V.required().string().minLength(1).maxLength(100),
  });
  if (errors) return res.status(HttpStatus.BAD_REQUEST).json(errors);

  const ctx = getTenantContext(req);
  const { name, code, parentId, description, icon, color } = req.body;
  const catCode = code || 'CAT-' + name.substring(0, 3).toUpperCase();
  const [result] = await sequelize.query(`
    INSERT INTO product_categories (tenant_id, code, name, parent_id, description, icon, color, is_active)
    VALUES (:tenantId, :code, :name, :parentId, :desc, :icon, :color, true) RETURNING id
  `, { replacements: { tenantId: ctx.tenantId, code: catCode, name, parentId: parentId || null, desc: description || null, icon: icon || 'Package', color: color || '#3B82F6' } });

  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'product_category', entityId: result[0]?.id, newValues: { name, code: catCode }, req });

  return res.status(HttpStatus.CREATED).json(successResponse({ id: result[0].id }, undefined, 'Category created'));
}

async function updateCategory(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const { id } = req.query;
  const fields = req.body;
  if (!id && !fields.id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'ID required'));
  const catId = id || fields.id;

  const sets: string[] = [];
  const params: any = { id: catId, ...tf.replacements };
  const map: Record<string, string> = { name: 'name', description: 'description', icon: 'icon', color: 'color', parentId: 'parent_id', sortOrder: 'sort_order', isActive: 'is_active' };
  for (const [k, col] of Object.entries(map)) {
    if (fields[k] !== undefined) { sets.push(`${col}=:${k}`); params[k] = fields[k]; }
  }
  if (sets.length > 0) {
    sets.push("updated_at=NOW()");
    await sequelize.query(`UPDATE product_categories SET ${sets.join(', ')} WHERE id=:id ${tf.condition}`, { replacements: params });
    await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'update', entityType: 'product_category', entityId: catId as string, newValues: fields, req });
  }
  return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Category updated'));
}

async function deleteCategory(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const id = req.query.id || req.body?.id;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'ID required'));

  const [children] = await sequelize.query(`SELECT COUNT(*)::int as c FROM product_categories WHERE parent_id=:id ${tf.condition}`, { replacements: { id, ...tf.replacements } });
  if (parseInt(children[0].c) > 0) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Cannot delete category with children'));

  const [products] = await sequelize.query(`SELECT COUNT(*)::int as c FROM products WHERE category_id=:id ${tf.condition}`, { replacements: { id, ...tf.replacements } });
  if (parseInt(products[0].c) > 0) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Cannot delete category with products'));

  await sequelize.query(`UPDATE product_categories SET is_active=false, updated_at=NOW() WHERE id=:id ${tf.condition}`, { replacements: { id, ...tf.replacements } });

  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'product_category', entityId: id as string, req });

  return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Category deactivated'));
}
