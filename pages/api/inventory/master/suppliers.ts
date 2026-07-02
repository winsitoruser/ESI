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

    const { method } = req;

    switch (method) {
      case 'GET':
        return await getSuppliers(req, res);
      case 'POST':
        return await createSupplier(req, res, session);
      case 'PUT':
        return await updateSupplier(req, res, session);
      case 'DELETE':
        return await deleteSupplier(req, res);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in suppliers API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getSuppliers(req: NextApiRequest, res: NextApiResponse) {
  const { search, is_active } = req.query;

  let query = 'SELECT * FROM suppliers WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (search) {
    query += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR contact_person ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (is_active !== undefined) {
    query += ` AND is_active = $${paramIndex}`;
    params.push(is_active === 'true');
    paramIndex++;
  }

  query += ' ORDER BY name ASC';

  const result = await pool.query(query, params);

  return res.status(200).json({
    success: true,
    data: result.rows,
    count: result.rows.length
  });
}

async function createSupplier(req: NextApiRequest, res: NextApiResponse, session: any) {
  const {
    code, name, contact_person, email, phone, mobile,
    address, city, province, postal_code, country,
    tax_id, payment_terms, credit_limit, notes
  } = req.body;

  if (!code || !name) {
    return res.status(400).json({ success: false, error: 'Code and name are required' });
  }

  const query = `
    INSERT INTO suppliers (
      code, name, contact_person, email, phone, mobile,
      address, city, province, postal_code, country,
      tax_id, payment_terms, credit_limit, notes,
      created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
    RETURNING *
  `;

  const result = await pool.query(query, [
    code, name, contact_person, email, phone, mobile,
    address, city, province, postal_code, country || 'Indonesia',
    tax_id, payment_terms, credit_limit || 0, notes,
    session.user.id
  ]);

  return res.status(201).json({
    success: true,
    message: 'Supplier created successfully',
    data: result.rows[0]
  });
}

async function updateSupplier(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, ...updateData } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: 'ID is required' });
  }

  const fields = Object.keys(updateData).filter(key => updateData[key] !== undefined);
  if (fields.length === 0) {
    return res.status(400).json({ success: false, error: 'No fields to update' });
  }

  const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
  const values = fields.map(field => updateData[field]);
  values.push(session.user.id, id);

  const query = `
    UPDATE suppliers
    SET ${setClause}, updated_by = $${values.length - 1}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${values.length}
    RETURNING *
  `;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Supplier not found' });
  }

  return res.status(200).json({
    success: true,
    message: 'Supplier updated successfully',
    data: result.rows[0]
  });
}

async function deleteSupplier(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: 'ID is required' });
  }

  const query = 'DELETE FROM suppliers WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Supplier not found' });
  }

  return res.status(200).json({
    success: true,
    message: 'Supplier deleted successfully'
  });
}
