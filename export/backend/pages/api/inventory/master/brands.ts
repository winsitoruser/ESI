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
        const { search, is_active } = req.query;
        let sql = 'SELECT * FROM brands WHERE 1=1';
        const params: any[] = [];
        
        if (search) {
          sql += ` AND (name ILIKE '%${search}%' OR code ILIKE '%${search}%')`;
        }
        if (is_active) {
          sql += ` AND is_active = ${is_active === 'true'}`;
        }
        
        sql += ' ORDER BY name ASC';
        const result = await pool.query(sql);
        
        return res.status(200).json({ success: true, data: result.rows, count: result.rows.length });

      case 'POST':
        const { code, name, description, logo_url, website, country } = req.body;
        
        if (!code || !name) {
          return res.status(400).json({ success: false, error: 'Code and name required' });
        }

        const insertResult = await pool.query(
          `INSERT INTO brands (code, name, description, logo_url, website, country, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
          [code, name, description, logo_url, website, country, (session.user as any)?.id || 1]
        );

        return res.status(201).json({ success: true, message: 'Brand created', data: insertResult.rows[0] });

      case 'PUT':
        const { id, ...updateData } = req.body;
        if (!id) return res.status(400).json({ success: false, error: 'ID required' });

        const fields = Object.keys(updateData).filter(k => updateData[k] !== undefined);
        const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
        const values = [...fields.map(f => updateData[f]), (session.user as any)?.id || 1, id];

        const updateResult = await pool.query(
          `UPDATE brands SET ${setClause}, updated_by = $${values.length - 1}, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $${values.length} RETURNING *`,
          values
        );

        if (updateResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Brand not found' });
        }

        return res.status(200).json({ success: true, message: 'Brand updated', data: updateResult.rows[0] });

      case 'DELETE':
        const { id: deleteId } = req.query;
        if (!deleteId) return res.status(400).json({ success: false, error: 'ID required' });

        const deleteResult = await pool.query('DELETE FROM brands WHERE id = $1 RETURNING *', [deleteId]);
        
        if (deleteResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Brand not found' });
        }

        return res.status(200).json({ success: true, message: 'Brand deleted' });

      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in brands API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
