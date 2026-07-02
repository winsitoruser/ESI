import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { Pool } from 'pg';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const {
    received_date,
    items,
    receipt_notes
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({
      error: 'Items with received quantities are required'
    });
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Check current status
    const checkResult = await pool.query(
      'SELECT * FROM inventory_transfers WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      await pool.end();
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const transfer = checkResult.rows[0];

    if (transfer.status !== 'in_transit') {
      await pool.end();
      return res.status(400).json({
        error: 'Cannot receive transfer',
        message: `Transfer must be in transit first. Current status: ${transfer.status}`
      });
    }

    // Check if all items received match shipped quantities
    let hasDiscrepancy = false;
    let allReceived = true;

    for (const item of items) {
      const itemCheck = await pool.query(
        'SELECT * FROM inventory_transfer_items WHERE transfer_id = $1 AND product_id = $2',
        [id, item.product_id]
      );

      if (itemCheck.rows.length > 0) {
        const shipped = parseFloat(itemCheck.rows[0].quantity_shipped);
        const received = parseFloat(item.quantity_received);

        if (received < shipped) {
          hasDiscrepancy = true;
        }

        if (received === 0 || item.condition === 'missing') {
          allReceived = false;
        }

        // Update item
        await pool.query(
          `UPDATE inventory_transfer_items 
           SET quantity_received = $1,
               condition_on_receipt = $2,
               notes = $3
           WHERE transfer_id = $4 AND product_id = $5`,
          [
            item.quantity_received,
            item.condition || 'good',
            item.notes || null,
            id,
            item.product_id
          ]
        );
      }
    }

    // Determine final status
    let finalStatus = 'completed';
    if (hasDiscrepancy || !allReceived) {
      finalStatus = 'received'; // Needs investigation
    }

    // Update transfer
    const updateResult = await pool.query(
      `UPDATE inventory_transfers 
       SET status = $1,
           received_date = $2,
           received_by = $3,
           receipt_notes = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [
        finalStatus,
        received_date || new Date(),
        session.user.email || session.user.name,
        receipt_notes,
        id
      ]
    );

    // Add history
    await pool.query(
      `INSERT INTO inventory_transfer_history (
        transfer_id, status_from, status_to, changed_by, notes
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        'in_transit',
        finalStatus,
        session.user.email || session.user.name,
        hasDiscrepancy ? 'Received with discrepancies' : 'Received successfully'
      ]
    );

    // Add stock to destination location and create stock movements
    for (const item of items) {
      const quantityToAdd = parseFloat(item.quantity_received) || 0;
      
      if (quantityToAdd > 0 && (item.condition === 'good' || !item.condition)) {
        // Check if inventory_stock table exists and update stock
        const stockCheckResult = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'inventory_stock'
          )`
        );

        if (stockCheckResult.rows[0].exists) {
          // Check if stock record exists for this product and location
          const existingStock = await pool.query(
            `SELECT id FROM inventory_stock 
             WHERE product_id = $1 AND location_id = $2`,
            [item.product_id, transfer.to_location_id]
          );

          if (existingStock.rows.length > 0) {
            // Update existing stock
            await pool.query(
              `UPDATE inventory_stock
               SET quantity = quantity + $1,
                   updated_at = CURRENT_TIMESTAMP
               WHERE product_id = $2 AND location_id = $3`,
              [quantityToAdd, item.product_id, transfer.to_location_id]
            );
          } else {
            // Insert new stock record
            await pool.query(
              `INSERT INTO inventory_stock (
                product_id, location_id, quantity, created_at, updated_at
              ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [item.product_id, transfer.to_location_id, quantityToAdd]
            );
          }
        }

        // Create stock movement record if table exists
        const movementCheckResult = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'stock_movements'
          )`
        );

        if (movementCheckResult.rows[0].exists) {
          await pool.query(
            `INSERT INTO stock_movements (
              product_id, location_id, movement_type, quantity,
              reference_type, reference_id, notes, created_by, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
            [
              item.product_id,
              transfer.to_location_id,
              'transfer_in',
              quantityToAdd,
              'transfer',
              id,
              `Transfer ${transfer.transfer_number} from location ${transfer.from_location_id}`,
              session.user.email || session.user.name
            ]
          );
        }
      }
    }

    await pool.end();

    return res.status(200).json({
      success: true,
      message: hasDiscrepancy 
        ? 'Transfer received with discrepancies' 
        : 'Transfer received successfully',
      data: {
        ...updateResult.rows[0],
        has_discrepancy: hasDiscrepancy
      }
    });

  } catch (error) {
    console.error('Receive transfer error:', error);
    await pool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
