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
        return await getCategories(req, res);
      case 'POST':
        return await createCategory(req, res, session);
      case 'PUT':
        return await updateCategory(req, res, session);
      case 'DELETE':
        return await deleteCategory(req, res);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in categories API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getCategories(req: NextApiRequest, res: NextApiResponse) {
  const { search, parent_id, is_active } = req.query;

  let query = `
    SELECT c.*, 
           p.name as parent_name,
           (SELECT COUNT(*) FROM categories WHERE parent_id = c.id) as children_count
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (search) {
    query += ` AND (c.name ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (parent_id !== undefined) {
    if (parent_id === 'null') {
      query += ` AND c.parent_id IS NULL`;
    } else {
      query += ` AND c.parent_id = $${paramIndex}`;
      params.push(parent_id);
      paramIndex++;
    }
  }

  if (is_active !== undefined) {
    query += ` AND c.is_active = $${paramIndex}`;
    params.push(is_active === 'true');
    paramIndex++;
  }

  query += ` ORDER BY c.sort_order ASC, c.name ASC`;

  const result = await pool.query(query, params);

  return res.status(200).json({
    success: true,
    data: result.rows,
    count: result.rows.length
  });
}

async function createCategory(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { name, description, parent_id, icon, color, sort_order } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }

  const query = `
    INSERT INTO categories (name, description, parent_id, icon, color, sort_order, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
    RETURNING *
  `;

  const result = await pool.query(query, [
    name,
    description || null,
    parent_id || null,
    icon || null,
    color || null,
    sort_order || 0,
    session.user.id
  ]);

  return res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: result.rows[0]
  });
}

async function updateCategory(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, name, description, parent_id, icon, color, sort_order, is_active } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: 'ID is required' });
  }

  const query = `
    UPDATE categories
    SET name = COALESCE($1, name),
        description = COALESCE($2, description),
        parent_id = $3,
        icon = COALESCE($4, icon),
        color = COALESCE($5, color),
        sort_order = COALESCE($6, sort_order),
        is_active = COALESCE($7, is_active),
        updated_by = $8,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $9
    RETURNING *
  `;

  const result = await pool.query(query, [
    name,
    description,
    parent_id,
    icon,
    color,
    sort_order,
    is_active,
    session.user.id,
    id
  ]);

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Category not found' });
  }

  return res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: result.rows[0]
  });
}

async function deleteCategory(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: 'ID is required' });
  }

  // Check if category has children
  const checkQuery = 'SELECT COUNT(*) as count FROM categories WHERE parent_id = $1';
  const checkResult = await pool.query(checkQuery, [id]);

  if (parseInt(checkResult.rows[0].count) > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete category with subcategories'
    });
  }

  const query = 'DELETE FROM categories WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Category not found' });
  }

  return res.status(200).json({
    success: true,
    message: 'Category deleted successfully'
  });
}
