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
    shipment_date,
    tracking_number,
    courier,
    estimated_arrival,
    items
  } = req.body;

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

    if (transfer.status !== 'approved' && transfer.status !== 'in_preparation') {
      await pool.end();
      return res.status(400).json({
        error: 'Cannot ship transfer',
        message: `Transfer must be approved first. Current status: ${transfer.status}`
      });
    }

    // Update transfer
    const updateResult = await pool.query(
      `UPDATE inventory_transfers 
       SET status = 'in_transit',
           shipment_date = $1,
           tracking_number = $2,
           courier = $3,
           estimated_arrival = $4,
           shipped_by = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        shipment_date || new Date(),
        tracking_number,
        courier,
        estimated_arrival,
        session.user.email || session.user.name,
        id
      ]
    );

    // Update items with shipped quantities
    if (items && items.length > 0) {
      for (const item of items) {
        await pool.query(
          `UPDATE inventory_transfer_items 
           SET quantity_shipped = $1
           WHERE transfer_id = $2 AND product_id = $3`,
          [item.quantity_shipped, id, item.product_id]
        );
      }
    } else {
      // If no items specified, set shipped = approved
      await pool.query(
        `UPDATE inventory_transfer_items 
         SET quantity_shipped = quantity_approved
         WHERE transfer_id = $1`,
        [id]
      );
    }

    // Add history
    await pool.query(
      `INSERT INTO inventory_transfer_history (
        transfer_id, status_from, status_to, changed_by, notes
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        transfer.status,
        'in_transit',
        session.user.email || session.user.name,
        `Shipped via ${courier || 'courier'}${tracking_number ? ` - Tracking: ${tracking_number}` : ''}`
      ]
    );

    // Deduct stock from source location and create stock movements
    const itemsResult = await pool.query(
      'SELECT * FROM inventory_transfer_items WHERE transfer_id = $1',
      [id]
    );

    for (const item of itemsResult.rows) {
      const quantityToDeduct = item.quantity_shipped || item.quantity_approved || 0;
      
      if (quantityToDeduct > 0) {
        // Check if inventory_stock table exists and update stock
        const stockCheckResult = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'inventory_stock'
          )`
        );

        if (stockCheckResult.rows[0].exists) {
          // Update inventory stock - deduct from source location
          await pool.query(
            `UPDATE inventory_stock
             SET quantity = quantity - $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE product_id = $2 AND location_id = $3`,
            [quantityToDeduct, item.product_id, transfer.from_location_id]
          );
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
              transfer.from_location_id,
              'transfer_out',
              -quantityToDeduct,
              'transfer',
              id,
              `Transfer ${transfer.transfer_number} to location ${transfer.to_location_id}`,
              session.user.email || session.user.name
            ]
          );
        }
      }
    }

    await pool.end();

    return res.status(200).json({
      success: true,
      message: 'Transfer marked as shipped',
      data: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Ship transfer error:', error);
    await pool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
