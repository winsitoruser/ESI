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
        return await getPaymentMethods(req, res);
      case 'POST':
        return await createPaymentMethod(req, res, session);
      case 'PUT':
        return await updatePaymentMethod(req, res, session);
      case 'DELETE':
        return await deletePaymentMethod(req, res);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in payment methods API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getPaymentMethods(req: NextApiRequest, res: NextApiResponse) {
  const { is_active } = req.query;

  let query = 'SELECT * FROM payment_methods WHERE 1=1';
  const params: any[] = [];

  if (is_active !== undefined) {
    query += ` AND is_active = $${params.length + 1}`;
    params.push(is_active === 'true');
  }

  query += ' ORDER BY sort_order ASC, name ASC';

  const result = await pool.query(query, params);

  return res.status(200).json({
    success: true,
    data: result.rows,
    count: result.rows.length
  });
}

async function createPaymentMethod(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { code, name, description, fees, processing_time, icon, sort_order } = req.body;

  if (!code || !name) {
    return res.status(400).json({ success: false, error: 'Code and name are required' });
  }

  const query = `
    INSERT INTO payment_methods (code, name, description, fees, processing_time, icon, sort_order, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    RETURNING *
  `;

  const result = await pool.query(query, [
    code,
    name,
    description,
    fees || 0,
    processing_time,
    icon,
    sort_order || 0,
    (session.user as any)?.id || 1
  ]);

  return res.status(201).json({
    success: true,
    message: 'Payment method created successfully',
    data: result.rows[0]
  });
}

async function updatePaymentMethod(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, ...updateData } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: 'ID is required' });
  }

  const fields = Object.keys(updateData).filter(k => updateData[k] !== undefined);
  if (fields.length === 0) {
    return res.status(400).json({ success: false, error: 'No fields to update' });
  }

  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = [...fields.map(f => updateData[f]), (session.user as any)?.id || 1, id];

  const query = `
    UPDATE payment_methods
    SET ${setClause}, updated_by = $${values.length - 1}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${values.length}
    RETURNING *
  `;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Payment method not found' });
  }

  return res.status(200).json({
    success: true,
    message: 'Payment method updated successfully',
    data: result.rows[0]
  });
}

async function deletePaymentMethod(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: 'ID is required' });
  }

  const query = 'DELETE FROM payment_methods WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Payment method not found' });
  }

  return res.status(200).json({
    success: true,
    message: 'Payment method deleted successfully'
  });
}
