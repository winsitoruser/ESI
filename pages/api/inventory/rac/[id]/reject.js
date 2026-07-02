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
  const { rejection_reason } = req.body;

  if (!rejection_reason) {
    return res.status(400).json({
      error: 'Rejection reason is required'
    });
  }

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
        error: 'Cannot reject request',
        message: `Only submitted requests can be rejected. Current status: ${request.status}`
      });
    }

    // Update request
    const updateResult = await pool.query(
      `UPDATE rac_requests 
       SET status = 'rejected',
           rejection_reason = $1,
           approved_by = $2,
           approval_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [rejection_reason, session.user.email || session.user.name, id]
    );

    // Add history
    await pool.query(
      `INSERT INTO rac_request_history (request_id, status_from, status_to, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, 'submitted', 'rejected', session.user.email || session.user.name, rejection_reason]
    );

    await pool.end();

    return res.status(200).json({
      success: true,
      message: 'Request rejected',
      data: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Reject RAC request error:', error);
    await pool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
