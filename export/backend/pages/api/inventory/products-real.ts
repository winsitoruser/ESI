import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler, success, error } from '@/utils/api-utils';
import db from '@/models';
import { Op } from 'sequelize';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await getProducts(req, res);
      case 'POST':
        return await createProduct(req, res);
      case 'PUT':
        return await updateProduct(req, res);
      case 'DELETE':
        return await deleteProduct(req, res);
      default:
        return error(res, 'Method not allowed', 405);
    }
  } catch (err: any) {
    console.error('Products API Error:', err);
    return error(res, err.message || 'Internal server error', 500);
  }
}

async function getProducts(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      category = '',
      lowStock = 'false',
      tenantId = 'default-tenant'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = {
      tenantId: tenantId as string,
      isActive: true
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (category) {
      whereClause.category = category as string;
    }

    if (lowStock === 'true') {
      whereClause[Op.and] = db.sequelize.where(
        db.sequelize.col('stock'),
        Op.lte,
        db.sequelize.col('reorderPoint')
      );
    }

    const { count, rows } = await db.Product.findAndCountAll({
      where: whereClause,
      limit: limitNum,
      offset: offset,
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'sku', 'category', 'price', 'stock', 'unit', 'reorderPoint', 'location', 'expiry', 'supplier', 'image']
    });

    return success(res, {
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum)
      }
    });
  } catch (err: any) {
    console.error('Get Products Error:', err);
    return error(res, err.message || 'Failed to fetch products', 500);
  }
}

async function createProduct(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      name,
      sku,
      category,
      price,
      stock = 0,
      unit,
      reorderPoint = 10,
      location,
      expiry,
      supplier,
      description,
      tenantId = 'default-tenant'
    } = req.body;

    if (!name || !category || price === undefined) {
      return error(res, 'Missing required fields: name, category, price', 400);
    }

    const product = await db.Product.create({
      name,
      sku,
      category,
      price: parseFloat(price),
      stock: parseInt(stock),
      unit,
      reorderPoint: parseInt(reorderPoint),
      location,
      expiry: expiry ? new Date(expiry) : null,
      supplier,
      description,
      tenantId,
      isActive: true
    });

    return success(res, {
      message: 'Product created successfully',
      data: product
    }, 201);
  } catch (err: any) {
    console.error('Create Product Error:', err);
    return error(res, err.message || 'Failed to create product', 500);
  }
}

async function updateProduct(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return error(res, 'Product ID is required', 400);
    }

    const product = await db.Product.findByPk(id as string);
    
    if (!product) {
      return error(res, 'Product not found', 404);
    }

    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.tenantId;

    if (updateData.price) {
      updateData.price = parseFloat(updateData.price);
    }
    if (updateData.stock !== undefined) {
      updateData.stock = parseInt(updateData.stock);
    }
    if (updateData.reorderPoint) {
      updateData.reorderPoint = parseInt(updateData.reorderPoint);
    }

    await product.update(updateData);

    return success(res, {
      message: 'Product updated successfully',
      data: product
    });
  } catch (err: any) {
    console.error('Update Product Error:', err);
    return error(res, err.message || 'Failed to update product', 500);
  }
}

async function deleteProduct(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return error(res, 'Product ID is required', 400);
    }

    const product = await db.Product.findByPk(id as string);
    
    if (!product) {
      return error(res, 'Product not found', 404);
    }

    // Soft delete
    await product.update({ isActive: false });

    return success(res, {
      message: 'Product deleted successfully'
    });
  } catch (err: any) {
    console.error('Delete Product Error:', err);
    return error(res, err.message || 'Failed to delete product', 500);
  }
}

export default withApiHandler(handler);
