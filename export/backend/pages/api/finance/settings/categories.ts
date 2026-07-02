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
        const { type, is_active } = req.query;
        let query = 'SELECT * FROM finance_categories WHERE 1=1';
        const params: any[] = [];
        
        if (type) {
          query += ` AND type = $${params.length + 1}`;
          params.push(type);
        }
        if (is_active !== undefined) {
          query += ` AND is_active = $${params.length + 1}`;
          params.push(is_active === 'true');
        }
        
        query += ' ORDER BY sort_order ASC, name ASC';
        const result = await pool.query(query, params);
        
        return res.status(200).json({ success: true, data: result.rows, count: result.rows.length });

      case 'POST':
        const { code, name, type: catType, description, parent_id, icon, color, sort_order } = req.body;
        
        if (!code || !name || !catType) {
          return res.status(400).json({ success: false, error: 'Code, name, and type required' });
        }

        const insertResult = await pool.query(
          `INSERT INTO finance_categories (code, name, type, description, parent_id, icon, color, sort_order, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING *`,
          [code, name, catType, description, parent_id, icon, color, sort_order || 0, (session.user as any)?.id || 1]
        );

        return res.status(201).json({ success: true, message: 'Category created', data: insertResult.rows[0] });

      case 'PUT':
        const { id, ...updateData } = req.body;
        if (!id) return res.status(400).json({ success: false, error: 'ID required' });

        const fields = Object.keys(updateData).filter(k => updateData[k] !== undefined);
        const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
        const values = [...fields.map(f => updateData[f]), (session.user as any)?.id || 1, id];

        const updateResult = await pool.query(
          `UPDATE finance_categories SET ${setClause}, updated_by = $${values.length - 1}, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $${values.length} RETURNING *`,
          values
        );

        if (updateResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Category not found' });
        }

        return res.status(200).json({ success: true, message: 'Category updated', data: updateResult.rows[0] });

      case 'DELETE':
        const { id: deleteId } = req.query;
        if (!deleteId) return res.status(400).json({ success: false, error: 'ID required' });

        const deleteResult = await pool.query('DELETE FROM finance_categories WHERE id = $1 RETURNING *', [deleteId]);
        
        if (deleteResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Category not found' });
        }

        return res.status(200).json({ success: true, message: 'Category deleted' });

      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in categories API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
