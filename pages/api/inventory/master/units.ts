import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET':
        const { search, is_active } = req.query;
        let sql = 'SELECT u.*, bu.name as base_unit_name FROM units u LEFT JOIN units bu ON u.base_unit_id = bu.id WHERE 1=1';
        const params: any[] = [];
        
        if (search) {
          sql += ` AND (u.name ILIKE $${params.length + 1} OR u.code ILIKE $${params.length + 1})`;
          params.push(`%${search}%`);
        }
        if (is_active !== undefined) {
          sql += ` AND u.is_active = $${params.length + 1}`;
          params.push(is_active === 'true');
        }
        
        sql += ' ORDER BY u.name ASC';
        const result = await query(sql, params);
        
        return res.status(200).json({ success: true, data: result.rows, count: result.rows.length });

      case 'POST':
        const { code, name, description, base_unit_id, conversion_factor, is_base_unit } = req.body;
        
        if (!code || !name) {
          return res.status(400).json({ success: false, error: 'Code and name required' });
        }

        const insertResult = await query(
          `INSERT INTO units (code, name, description, base_unit_id, conversion_factor, is_base_unit, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
          [code, name, description, base_unit_id, conversion_factor || 1, is_base_unit || false, session.user.id]
        );

        return res.status(201).json({ success: true, message: 'Unit created', data: insertResult.rows[0] });

      case 'PUT':
        const { id, ...updateData } = req.body;
        if (!id) return res.status(400).json({ success: false, error: 'ID required' });

        const fields = Object.keys(updateData).filter(k => updateData[k] !== undefined);
        const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
        const values = [...fields.map(f => updateData[f]), session.user.id, id];

        const updateResult = await query(
          `UPDATE units SET ${setClause}, updated_by = $${values.length - 1}, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $${values.length} RETURNING *`,
          values
        );

        if (updateResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Unit not found' });
        }

        return res.status(200).json({ success: true, message: 'Unit updated', data: updateResult.rows[0] });

      case 'DELETE':
        const { id: deleteId } = req.query;
        if (!deleteId) return res.status(400).json({ success: false, error: 'ID required' });

        const deleteResult = await query('DELETE FROM units WHERE id = $1 RETURNING *', [deleteId]);
        
        if (deleteResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Unit not found' });
        }

        return res.status(200).json({ success: true, message: 'Unit deleted' });

      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in units API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
