/**
 * Inventory Movement Adapter
 * Handles database operations for stock movements
 */

import db from '@/models';
import { Op, QueryTypes } from 'sequelize';

export interface MovementRecord {
  id?: number;
  product_id: number;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  performed_by?: string;
  created_at?: Date;
}

/**
 * Get all movements
 */
export async function getAllMovements(options: {
  limit?: number;
  offset?: number;
  productId?: number;
  movementType?: string;
  startDate?: Date;
  endDate?: Date;
  tenantId?: string;
}) {
  const { limit = 50, offset = 0, productId, movementType, startDate, endDate, tenantId } = options;

  try {
    const whereClause: any = {};

    if (productId) {
      whereClause.product_id = productId;
    }

    if (movementType) {
      whereClause.movement_type = movementType;
    }

    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [startDate, endDate]
      };
    }

    // Note: StockMovement model might not exist, using raw query as fallback
    const movements = await db.sequelize.query(`
      SELECT sm.*, p.name as product_name, p.sku
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      WHERE 1=1
      ${productId ? `AND sm.product_id = ${productId}` : ''}
      ${movementType ? `AND sm.movement_type = '${movementType}'` : ''}
      ORDER BY sm.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, { type: QueryTypes.SELECT });

    return {
      movements,
      total: movements.length
    };
  } catch (error) {
    console.error('Error fetching movements:', error);
    // Return empty array if table doesn't exist
    return {
      movements: [],
      total: 0
    };
  }
}

/**
 * Create movement record
 */
export async function createMovement(movementData: MovementRecord, tenantId?: string) {
  try {
    // Note: This is a placeholder - actual implementation depends on StockMovement model
    const movement = await db.sequelize.query(`
      INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, notes, created_at, updated_at)
      VALUES (:product_id, :movement_type, :quantity, :reference_type, :reference_id, :notes, NOW(), NOW())
      RETURNING *
    `, {
      replacements: {
        product_id: movementData.product_id,
        movement_type: movementData.movement_type,
        quantity: movementData.quantity,
        reference_type: movementData.reference_type || null,
        reference_id: movementData.reference_id || null,
        notes: movementData.notes || null
      },
      type: QueryTypes.INSERT
    });

    return movement;
  } catch (error) {
    console.error('Error creating movement:', error);
    throw error;
  }
}

/**
 * Get movement statistics
 */
export async function getMovementStatistics(options: {
  startDate?: Date;
  endDate?: Date;
  tenantId?: string;
}) {
  const { startDate, endDate, tenantId } = options;

  try {
    const stats = await db.sequelize.query(`
      SELECT 
        movement_type,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM stock_movements
      WHERE 1=1
      ${startDate && endDate ? `AND created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'` : ''}
      GROUP BY movement_type
    `, { type: QueryTypes.SELECT });

    return stats;
  } catch (error) {
    console.error('Error fetching movement statistics:', error);
    return [];
  }
}

export default {
  getAllMovements,
  createMovement,
  getMovementStatistics
};
