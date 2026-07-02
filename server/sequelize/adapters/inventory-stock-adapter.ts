/**
 * Inventory Stock Adapter
 * Handles database operations for stock management
 */

import db from '@/models';
import { Op, QueryTypes } from 'sequelize';

export interface StockItem {
  id: number;
  product_id: number;
  location_id?: number;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  last_stock_take_date?: Date;
  last_movement_date?: Date;
  product?: any;
}

/**
 * Get stock by product ID
 */
export async function getStockByProductId(productId: number, tenantId?: string) {
  try {
    const stock = await db.Stock.findAll({
      where: {
        product_id: productId
      },
      include: [
        {
          model: db.Product,
          as: 'product',
          required: false
        }
      ]
    });

    return stock;
  } catch (error) {
    console.error('Error fetching stock by product ID:', error);
    throw error;
  }
}

/**
 * Get all stock items
 */
export async function getAllStock(options: {
  limit?: number;
  offset?: number;
  tenantId?: string;
}) {
  const { limit = 50, offset = 0, tenantId } = options;

  try {
    const stock = await db.Stock.findAll({
      include: [
        {
          model: db.Product,
          as: 'product',
          where: { is_active: true },
          required: true
        }
      ],
      limit,
      offset,
      order: [['updated_at', 'DESC']]
    });

    return stock;
  } catch (error) {
    console.error('Error fetching all stock:', error);
    throw error;
  }
}

/**
 * Update stock quantity
 */
export async function updateStockQuantity(
  stockId: number,
  quantity: number,
  tenantId?: string
) {
  try {
    const stock = await db.Stock.findByPk(stockId);

    if (!stock) {
      throw new Error('Stock not found');
    }

    await stock.update({
      quantity,
      last_movement_date: new Date()
    });

    return stock;
  } catch (error) {
    console.error('Error updating stock quantity:', error);
    throw error;
  }
}

/**
 * Get low stock items
 */
export async function getLowStockItems(tenantId?: string) {
  try {
    const lowStock = await db.sequelize.query(`
      SELECT s.*, p.name as product_name, p.sku, p.minimum_stock
      FROM inventory_stock s
      INNER JOIN products p ON s.product_id = p.id
      WHERE p.is_active = true 
      AND s.quantity <= p.minimum_stock
      AND s.quantity > 0
      ORDER BY s.quantity ASC
    `, { type: QueryTypes.SELECT });

    return lowStock;
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    throw error;
  }
}

export default {
  getStockByProductId,
  getAllStock,
  updateStockQuantity,
  getLowStockItems
};
