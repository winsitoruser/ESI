import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    if (req.method === 'GET') {
      // Get single transfer with items and history
      const transferResult = await pool.query(
        'SELECT * FROM inventory_transfers WHERE id = $1',
        [id]
      );

      if (transferResult.rows.length === 0) {
        await pool.end();
        return res.status(404).json({ error: 'Transfer not found' });
      }

      // Get items
      const itemsResult = await pool.query(
        'SELECT * FROM inventory_transfer_items WHERE transfer_id = $1',
        [id]
      );

      // Get history
      const historyResult = await pool.query(
        'SELECT * FROM inventory_transfer_history WHERE transfer_id = $1 ORDER BY changed_at DESC',
        [id]
      );

      await pool.end();

      return res.status(200).json({
        success: true,
        data: {
          ...transferResult.rows[0],
          items: itemsResult.rows,
          history: historyResult.rows
        }
      });
    }

    if (req.method === 'PUT') {
      // Update transfer (general update)
      const { status, notes } = req.body;

      const updateResult = await pool.query(
        `UPDATE inventory_transfers 
         SET status = COALESCE($1, status),
             notes = COALESCE($2, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [status, notes, id]
      );

      if (updateResult.rows.length === 0) {
        await pool.end();
        return res.status(404).json({ error: 'Transfer not found' });
      }

      await pool.end();

      return res.status(200).json({
        success: true,
        message: 'Transfer updated successfully',
        data: updateResult.rows[0]
      });
    }

    if (req.method === 'DELETE') {
      // Cancel transfer
      const updateResult = await pool.query(
        `UPDATE inventory_transfers 
         SET status = 'cancelled',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'requested'
         RETURNING *`,
        [id]
      );

      if (updateResult.rows.length === 0) {
        await pool.end();
        return res.status(400).json({
          error: 'Cannot cancel transfer',
          message: 'Transfer not found or already processed'
        });
      }

      // Add history
      await pool.query(
        `INSERT INTO inventory_transfer_history (
          transfer_id, status_from, status_to, changed_by, notes
        ) VALUES ($1, $2, $3, $4, $5)`,
        [id, 'requested', 'cancelled', session.user.email || session.user.name, 'Transfer cancelled']
      );

      await pool.end();

      return res.status(200).json({
        success: true,
        message: 'Transfer cancelled successfully',
        data: updateResult.rows[0]
      });
    }

    await pool.end();
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Transfer detail API error:', error);
    await pool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
