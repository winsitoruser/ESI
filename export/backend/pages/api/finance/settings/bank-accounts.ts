import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET':
        const result = await pool.query('SELECT * FROM bank_accounts ORDER BY is_primary DESC, bank_name ASC');
        return res.status(200).json({ success: true, data: result.rows, count: result.rows.length });

      case 'POST':
        const { bank_name, bank_code, account_number, account_name, branch, swift_code, is_primary, icon, notes } = req.body;
        
        if (!bank_name || !account_number || !account_name) {
          return res.status(400).json({ success: false, error: 'Required fields missing' });
        }

        // If setting as primary, unset other primary accounts
        if (is_primary) {
          await pool.query('UPDATE bank_accounts SET is_primary = false WHERE is_primary = true');
        }

        const insertResult = await pool.query(
          `INSERT INTO bank_accounts (bank_name, bank_code, account_number, account_name, branch, swift_code, is_primary, icon, notes, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10) RETURNING *`,
          [bank_name, bank_code, account_number, account_name, branch, swift_code, is_primary || false, icon, notes, (session.user as any)?.id || 1]
        );

        return res.status(201).json({ success: true, message: 'Bank account created', data: insertResult.rows[0] });

      case 'PUT':
        const { id, ...updateData } = req.body;
        if (!id) return res.status(400).json({ success: false, error: 'ID required' });

        // If setting as primary, unset other primary accounts
        if (updateData.is_primary) {
          await pool.query('UPDATE bank_accounts SET is_primary = false WHERE is_primary = true AND id != $1', [id]);
        }

        const fields = Object.keys(updateData).filter(k => updateData[k] !== undefined);
        const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
        const values = [...fields.map(f => updateData[f]), (session.user as any)?.id || 1, id];

        const updateResult = await pool.query(
          `UPDATE bank_accounts SET ${setClause}, updated_by = $${values.length - 1}, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $${values.length} RETURNING *`,
          values
        );

        if (updateResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Bank account not found' });
        }

        return res.status(200).json({ success: true, message: 'Bank account updated', data: updateResult.rows[0] });

      case 'DELETE':
        const { id: deleteId } = req.query;
        if (!deleteId) return res.status(400).json({ success: false, error: 'ID required' });

        const deleteResult = await pool.query('DELETE FROM bank_accounts WHERE id = $1 RETURNING *', [deleteId]);
        
        if (deleteResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Bank account not found' });
        }

        return res.status(200).json({ success: true, message: 'Bank account deleted' });

      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in bank accounts API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
