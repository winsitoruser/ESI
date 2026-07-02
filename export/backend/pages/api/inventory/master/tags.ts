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
        const result = await pool.query('SELECT * FROM tags ORDER BY name ASC');
        return res.status(200).json({ success: true, data: result.rows, count: result.rows.length });

      case 'POST':
        const { name, slug, description, color, icon } = req.body;
        const insertResult = await pool.query(
          `INSERT INTO tags (name, slug, description, color, icon, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *`,
          [name, slug || name.toLowerCase().replace(/\s+/g, '-'), description, color, icon, (session.user as any)?.id || 1]
        );
        return res.status(201).json({ success: true, data: insertResult.rows[0] });

      case 'PUT':
        const { id, ...updateData } = req.body;
        const fields = Object.keys(updateData).filter(k => updateData[k] !== undefined);
        const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
        const values = [...fields.map(f => updateData[f]), id];
        const updateResult = await pool.query(`UPDATE tags SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`, values);
        return res.status(200).json({ success: true, data: updateResult.rows[0] });

      case 'DELETE':
        const { id: deleteId } = req.query;
        await pool.query('DELETE FROM tags WHERE id = $1', [deleteId]);
        return res.status(200).json({ success: true, message: 'Tag deleted' });

      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
