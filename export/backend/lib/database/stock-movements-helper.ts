import { Pool } from 'pg';

/**
 * Helper function to insert stock movement records
 * This should be called whenever stock changes occur
 */
export async function insertStockMovement(
  pool: Pool,
  params: {
    productId: number;
    locationId?: number;
    movementType: 'in' | 'out' | 'adjustment' | 'transfer_in' | 'transfer_out';
    quantity: number;
    referenceType: 'purchase' | 'sale' | 'transfer' | 'adjustment' | 'return';
    referenceId?: number;
    referenceNumber?: string;
    batchNumber?: string;
    expiryDate?: string;
    costPrice?: number;
    notes?: string;
    createdBy?: string;
  }
) {
  const {
    productId,
    locationId,
    movementType,
    quantity,
    referenceType,
    referenceId,
    referenceNumber,
    batchNumber,
    expiryDate,
    costPrice,
    notes,
    createdBy
  } = params;

  const query = `
    INSERT INTO stock_movements (
      product_id,
      location_id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      reference_number,
      batch_number,
      expiry_date,
      cost_price,
      notes,
      created_by,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    RETURNING id
  `;

  const values = [
    productId,
    locationId || null,
    movementType,
    quantity,
    referenceType,
    referenceId || null,
    referenceNumber || null,
    batchNumber || null,
    expiryDate || null,
    costPrice || null,
    notes || null,
    createdBy || null
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error inserting stock movement:', error);
    throw error;
  }
}

/**
 * Update inventory_stock table
 */
export async function updateInventoryStock(
  pool: Pool,
  params: {
    productId: number;
    locationId: number;
    quantityChange: number; // positive for increase, negative for decrease
  }
) {
  const { productId, locationId, quantityChange } = params;

  // Check if stock record exists
  const checkQuery = `
    SELECT id, quantity 
    FROM inventory_stock 
    WHERE product_id = $1 AND location_id = $2
  `;

  const checkResult = await pool.query(checkQuery, [productId, locationId]);

  if (checkResult.rows.length === 0) {
    // Create new stock record
    const insertQuery = `
      INSERT INTO inventory_stock (product_id, location_id, quantity, last_movement_date)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, quantity
    `;
    const insertResult = await pool.query(insertQuery, [productId, locationId, Math.max(0, quantityChange)]);
    return insertResult.rows[0];
  } else {
    // Update existing stock record
    const updateQuery = `
      UPDATE inventory_stock 
      SET quantity = quantity + $1,
          last_movement_date = NOW(),
          updated_at = NOW()
      WHERE product_id = $2 AND location_id = $3
      RETURNING id, quantity
    `;
    const updateResult = await pool.query(updateQuery, [quantityChange, productId, locationId]);
    return updateResult.rows[0];
  }
}

/**
 * Combined function: Insert stock movement and update inventory stock
 */
export async function recordStockTransaction(
  pool: Pool,
  params: {
    productId: number;
    locationId: number;
    movementType: 'in' | 'out' | 'adjustment' | 'transfer_in' | 'transfer_out';
    quantity: number;
    referenceType: 'purchase' | 'sale' | 'transfer' | 'adjustment' | 'return';
    referenceId?: number;
    referenceNumber?: string;
    batchNumber?: string;
    expiryDate?: string;
    costPrice?: number;
    notes?: string;
    createdBy?: string;
  }
) {
  const {
    productId,
    locationId,
    movementType,
    quantity,
    referenceType,
    referenceId,
    referenceNumber,
    batchNumber,
    expiryDate,
    costPrice,
    notes,
    createdBy
  } = params;

  // Calculate quantity change based on movement type
  let quantityChange = quantity;
  if (movementType === 'out' || movementType === 'transfer_out') {
    quantityChange = -Math.abs(quantity);
  } else {
    quantityChange = Math.abs(quantity);
  }

  // Insert stock movement
  const movement = await insertStockMovement(pool, {
    productId,
    locationId,
    movementType,
    quantity: quantityChange,
    referenceType,
    referenceId,
    referenceNumber,
    batchNumber,
    expiryDate,
    costPrice,
    notes,
    createdBy
  });

  // Update inventory stock
  const stock = await updateInventoryStock(pool, {
    productId,
    locationId,
    quantityChange
  });

  return { movement, stock };
}

export default {
  insertStockMovement,
  updateInventoryStock,
  recordStockTransaction
};
