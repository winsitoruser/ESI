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
        const { category, is_active } = req.query;
        let query = 'SELECT * FROM chart_of_accounts WHERE 1=1';
        const params: any[] = [];
        
        if (category) {
          query += ` AND category = $${params.length + 1}`;
          params.push(category);
        }
        if (is_active !== undefined) {
          query += ` AND is_active = $${params.length + 1}`;
          params.push(is_active === 'true');
        }
        
        query += ' ORDER BY code ASC';
        const result = await pool.query(query, params);
        
        return res.status(200).json({ success: true, data: result.rows, count: result.rows.length });

      case 'POST':
        const { code, name, category: accCategory, sub_category, normal_balance, parent_id, level, description } = req.body;
        
        if (!code || !name || !accCategory || !normal_balance) {
          return res.status(400).json({ success: false, error: 'Required fields missing' });
        }

        const insertResult = await pool.query(
          `INSERT INTO chart_of_accounts (code, name, category, sub_category, normal_balance, parent_id, level, description, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING *`,
          [code, name, accCategory, sub_category, normal_balance, parent_id, level || 1, description, (session.user as any)?.id || 1]
        );

        return res.status(201).json({ success: true, message: 'Account created', data: insertResult.rows[0] });

      case 'PUT':
        const { id, ...updateData } = req.body;
        if (!id) return res.status(400).json({ success: false, error: 'ID required' });

        const fields = Object.keys(updateData).filter(k => updateData[k] !== undefined && k !== 'is_system');
        const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
        const values = [...fields.map(f => updateData[f]), (session.user as any)?.id || 1, id];

        const updateResult = await pool.query(
          `UPDATE chart_of_accounts SET ${setClause}, updated_by = $${values.length - 1}, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $${values.length} AND is_system = false RETURNING *`,
          values
        );

        if (updateResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Account not found or is system account' });
        }

        return res.status(200).json({ success: true, message: 'Account updated', data: updateResult.rows[0] });

      case 'DELETE':
        const { id: deleteId } = req.query;
        if (!deleteId) return res.status(400).json({ success: false, error: 'ID required' });

        const deleteResult = await pool.query('DELETE FROM chart_of_accounts WHERE id = $1 AND is_system = false RETURNING *', [deleteId]);
        
        if (deleteResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Account not found or is system account' });
        }

        return res.status(200).json({ success: true, message: 'Account deleted' });

      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in chart of accounts API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
