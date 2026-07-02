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
  const { approval_notes, items_approval } = req.body;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Check current status
    const checkResult = await pool.query(
      'SELECT * FROM rac_requests WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      await pool.end();
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = checkResult.rows[0];

    if (request.status !== 'submitted') {
      await pool.end();
      return res.status(400).json({
        error: 'Cannot approve request',
        message: `Request must be in submitted status. Current status: ${request.status}`
      });
    }

    // Check stock availability at source location
    const itemsResult = await pool.query(
      'SELECT * FROM rac_request_items WHERE request_id = $1',
      [id]
    );

    const stockTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory_stock'
      )
    `);

    if (stockTableExists.rows[0].exists) {
      for (const item of itemsResult.rows) {
        const stockCheck = await pool.query(
          `SELECT COALESCE(quantity, 0) as available
           FROM inventory_stock
           WHERE product_id = $1 AND location_id = $2`,
          [item.product_id, request.from_location_id]
        );

        if (stockCheck.rows.length > 0) {
          const available = parseFloat(stockCheck.rows[0].available);
          const requested = parseFloat(item.requested_qty);
          
          if (requested > available) {
            await pool.end();
            return res.status(400).json({
              error: 'Insufficient stock',
              message: `Product ${item.product_name} has insufficient stock. Available: ${available}, Requested: ${requested}`,
              product_id: item.product_id,
              product_name: item.product_name,
              available,
              requested
            });
          }
        }
      }
    }

    // Update request
    const updateResult = await pool.query(
      `UPDATE rac_requests 
       SET status = 'approved',
           approved_by = $1,
           approval_date = CURRENT_TIMESTAMP,
           approval_notes = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [session.user.email || session.user.name, approval_notes, id]
    );

    // Update items with approved quantities
    if (items_approval && items_approval.length > 0) {
      for (const item of items_approval) {
        await pool.query(
          `UPDATE rac_request_items 
           SET approved_qty = $1
           WHERE request_id = $2 AND product_id = $3`,
          [item.approved_qty, id, item.product_id]
        );
      }
    } else {
      // If no specific approval, approve all requested quantities
      await pool.query(
        `UPDATE rac_request_items 
         SET approved_qty = requested_qty
         WHERE request_id = $1`,
        [id]
      );
    }

    // Add history
    await pool.query(
      `INSERT INTO rac_request_history (request_id, status_from, status_to, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, 'submitted', 'approved', session.user.email || session.user.name, approval_notes || 'Request approved']
    );

    await pool.end();

    return res.status(200).json({
      success: true,
      message: 'Request approved successfully',
      data: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Approve RAC request error:', error);
    await pool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
