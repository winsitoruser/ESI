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
      // Get request detail with items
      const requestResult = await pool.query(
        'SELECT * FROM rac_requests WHERE id = $1',
        [id]
      );

      if (requestResult.rows.length === 0) {
        await pool.end();
        return res.status(404).json({ error: 'Request not found' });
      }

      const request = requestResult.rows[0];

      // Get items
      const itemsResult = await pool.query(
        'SELECT * FROM rac_request_items WHERE request_id = $1 ORDER BY id',
        [id]
      );

      // Get history
      const historyResult = await pool.query(
        'SELECT * FROM rac_request_history WHERE request_id = $1 ORDER BY changed_at DESC',
        [id]
      );

      await pool.end();

      return res.status(200).json({
        success: true,
        data: {
          ...request,
          items: itemsResult.rows,
          history: historyResult.rows
        }
      });

    } else if (req.method === 'PUT') {
      // Update request
      const { status, notes } = req.body;

      const checkResult = await pool.query(
        'SELECT * FROM rac_requests WHERE id = $1',
        [id]
      );

      if (checkResult.rows.length === 0) {
        await pool.end();
        return res.status(404).json({ error: 'Request not found' });
      }

      const currentRequest = checkResult.rows[0];

      const updateResult = await pool.query(
        `UPDATE rac_requests 
         SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [status || currentRequest.status, notes || currentRequest.notes, id]
      );

      // Add history
      await pool.query(
        `INSERT INTO rac_request_history (request_id, status_from, status_to, changed_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, currentRequest.status, status || currentRequest.status, session.user.email || session.user.name, 'Request updated']
      );

      await pool.end();

      return res.status(200).json({
        success: true,
        message: 'Request updated successfully',
        data: updateResult.rows[0]
      });

    } else if (req.method === 'DELETE') {
      // Cancel request
      const checkResult = await pool.query(
        'SELECT * FROM rac_requests WHERE id = $1',
        [id]
      );

      if (checkResult.rows.length === 0) {
        await pool.end();
        return res.status(404).json({ error: 'Request not found' });
      }

      const request = checkResult.rows[0];

      if (!['draft', 'submitted'].includes(request.status)) {
        await pool.end();
        return res.status(400).json({
          error: 'Cannot cancel request',
          message: `Only draft or submitted requests can be cancelled. Current status: ${request.status}`
        });
      }

      const { cancelled_reason } = req.body;

      await pool.query(
        `UPDATE rac_requests 
         SET status = 'cancelled', cancelled_reason = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [cancelled_reason, id]
      );

      // Add history
      await pool.query(
        `INSERT INTO rac_request_history (request_id, status_from, status_to, changed_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, request.status, 'cancelled', session.user.email || session.user.name, cancelled_reason || 'Request cancelled']
      );

      await pool.end();

      return res.status(200).json({
        success: true,
        message: 'Request cancelled successfully'
      });

    } else {
      await pool.end();
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('RAC request detail error:', error);
    await pool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
