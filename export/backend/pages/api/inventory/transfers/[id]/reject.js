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
  const { rejection_reason, alternative_suggestion } = req.body;

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
      'SELECT * FROM inventory_transfers WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      await pool.end();
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const transfer = checkResult.rows[0];

    if (transfer.status !== 'requested') {
      await pool.end();
      return res.status(400).json({
        error: 'Cannot reject transfer',
        message: `Transfer is already ${transfer.status}`
      });
    }

    // Update transfer
    const notes = `Rejected: ${rejection_reason}${alternative_suggestion ? `\nAlternative: ${alternative_suggestion}` : ''}`;
    
    const updateResult = await pool.query(
      `UPDATE inventory_transfers 
       SET status = 'rejected',
           approved_by = $1,
           approval_date = CURRENT_TIMESTAMP,
           approval_notes = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [session.user.email || session.user.name, notes, id]
    );

    // Add history
    await pool.query(
      `INSERT INTO inventory_transfer_history (
        transfer_id, status_from, status_to, changed_by, notes
      ) VALUES ($1, $2, $3, $4, $5)`,
      [id, 'requested', 'rejected', session.user.email || session.user.name, notes]
    );

    await pool.end();

    return res.status(200).json({
      success: true,
      message: 'Transfer rejected',
      data: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Reject transfer error:', error);
    await pool.end();
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
