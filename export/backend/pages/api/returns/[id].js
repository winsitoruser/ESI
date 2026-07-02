import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const { Pool } = require('pg');

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    // Create PostgreSQL connection
    const pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || '127.0.0.1',
      database: process.env.DB_NAME || 'farmanesia_dev',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });

    if (req.method === 'GET') {
      try {
        const result = await pool.query(
          'SELECT * FROM returns WHERE id = $1',
          [id]
        );

        await pool.end();

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Return not found' });
        }

        return res.status(200).json({
          success: true,
          data: result.rows[0]
        });
      } catch (error) {
        await pool.end();
        return res.status(500).json({ error: error.message });
      }
    }

    if (req.method === 'PUT') {
      try {
        const { status, approvedBy, notes } = req.body;

        let updateFields = [];
        let params = [];
        let paramIndex = 1;

        if (status) {
          updateFields.push(`status = $${paramIndex++}`);
          params.push(status);

          if (status === 'approved') {
            updateFields.push(`approval_date = $${paramIndex++}`);
            params.push(new Date());
            
            if (approvedBy) {
              updateFields.push(`approved_by = $${paramIndex++}`);
              params.push(approvedBy);
            }
          }

          if (status === 'completed') {
            updateFields.push(`completion_date = $${paramIndex++}`);
            params.push(new Date());
          }
        }

        if (notes !== undefined) {
          updateFields.push(`notes = $${paramIndex++}`);
          params.push(notes);
        }

        updateFields.push(`updated_at = $${paramIndex++}`);
        params.push(new Date());

        params.push(id);

        const result = await pool.query(
          `UPDATE returns SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
          params
        );

        await pool.end();

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Return not found' });
        }

        return res.status(200).json({
          success: true,
          message: 'Return updated successfully',
          data: result.rows[0]
        });
      } catch (error) {
        await pool.end();
        return res.status(500).json({ error: error.message });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const result = await pool.query(
          'DELETE FROM returns WHERE id = $1 RETURNING *',
          [id]
        );

        await pool.end();

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Return not found' });
        }

        return res.status(200).json({
          success: true,
          message: 'Return deleted successfully'
        });
      } catch (error) {
        await pool.end();
        return res.status(500).json({ error: error.message });
      }
    }

    await pool.end();
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Returns API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
