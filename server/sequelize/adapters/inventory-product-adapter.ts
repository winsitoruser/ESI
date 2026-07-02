/**
 * Inventory Product Adapter
 * Handles database operations for product management
 */

import db from '@/models';
import { Op, QueryTypes } from 'sequelize';

/**
 * Get all products
 */
export async function getAllProducts(options: {
  limit?: number;
  offset?: number;
  search?: string;
  categoryId?: number;
  tenantId?: string;
}) {
  const { limit = 50, offset = 0, search, categoryId, tenantId } = options;

  try {
    const whereClause: any = {
      is_active: true
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (categoryId) {
      whereClause.category_id = categoryId;
    }

    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    const products = await db.Product.findAll({
      where: whereClause,
      include: [
        {
          model: db.Stock,
          as: 'stock_data',
          required: false
        }
      ],
      limit,
      offset,
      order: [['name', 'ASC']]
    });

    const total = await db.Product.count({ where: whereClause });

    return {
      products,
      total
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

/**
 * Get product by ID
 */
export async function getProductById(productId: number, tenantId?: string) {
  try {
    const whereClause: any = {
      id: productId,
      is_active: true
    };

    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    const product = await db.Product.findOne({
      where: whereClause,
      include: [
        {
          model: db.Stock,
          as: 'stock_data',
          required: false
        }
      ]
    });

    return product;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    throw error;
  }
}

/**
 * Create new product
 */
export async function createProduct(productData: any, tenantId?: string) {
  try {
    const product = await db.Product.create({
      ...productData,
      ...(tenantId && { tenant_id: tenantId })
    });

    return product;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

/**
 * Update product
 */
export async function updateProduct(
  productId: number,
  productData: any,
  tenantId?: string
) {
  try {
    const whereClause: any = {
      id: productId
    };

    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    const product = await db.Product.findOne({ where: whereClause });

    if (!product) {
      throw new Error('Product not found');
    }

    await product.update(productData);

    return product;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Delete product (soft delete)
 */
export async function deleteProduct(productId: number, tenantId?: string) {
  try {
    const whereClause: any = {
      id: productId
    };

    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    const product = await db.Product.findOne({ where: whereClause });

    if (!product) {
      throw new Error('Product not found');
    }

    await product.update({ is_active: false });

    return { success: true, message: 'Product deleted successfully' };
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * Get low stock products
 */
export async function getLowStockProducts(tenantId?: string) {
  try {
    const lowStock = await db.sequelize.query(`
      SELECT p.*, s.quantity, s.reserved_quantity, s.available_quantity
      FROM products p
      INNER JOIN inventory_stock s ON s.product_id = p.id
      WHERE p.is_active = true 
      AND s.quantity <= p.minimum_stock
      AND s.quantity > 0
      ORDER BY s.quantity ASC
    `, { type: QueryTypes.SELECT });

    return lowStock;
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    throw error;
  }
}

export default {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts
};
