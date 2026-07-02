import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;

    if (req.method === 'GET') {
      const { search, role, shift, status } = req.query;

      let whereClause = 'WHERE ks.tenant_id = :tenantId AND ks.is_active = true';
      const replacements: any = { tenantId };

      if (search) {
        whereClause += ' AND ks.name LIKE :search';
        replacements.search = `%${search}%`;
      }

      if (role) {
        whereClause += ' AND ks.role = :role';
        replacements.role = role;
      }

      if (shift) {
        whereClause += ' AND ks.shift = :shift';
        replacements.shift = shift;
      }

      if (status) {
        whereClause += ' AND ks.status = :status';
        replacements.status = status;
      }

      const staff = await sequelize.query(`
        SELECT 
          ks.*,
          u.email as user_email,
          COUNT(DISTINCT ko.id) as total_orders_assigned
        FROM kitchen_staff ks
        LEFT JOIN users u ON ks.user_id = u.id
        LEFT JOIN kitchen_orders ko ON ks.id = ko.assigned_chef_id
        ${whereClause}
        GROUP BY ks.id, u.email
        ORDER BY 
          CASE ks.role
            WHEN 'head_chef' THEN 1
            WHEN 'sous_chef' THEN 2
            WHEN 'line_cook' THEN 3
            WHEN 'prep_cook' THEN 4
          END,
          ks.name ASC
      `, {
        replacements,
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: staff
      });

    } else if (req.method === 'POST') {
      const {
        userId,
        name,
        role,
        shift,
        status,
        phone,
        email
      } = req.body;

      if (!name || !role || !shift) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, role, shift'
        });
      }

      await sequelize.query(`
        INSERT INTO kitchen_staff (
          id, tenant_id, user_id, name, role, shift, status,
          performance, orders_completed, avg_prep_time,
          join_date, phone, email, is_active, created_at, updated_at
        ) VALUES (
          UUID(), :tenantId, :userId, :name, :role, :shift, :status,
          0, 0, NULL, NOW(), :phone, :email, true, NOW(), NOW()
        )
      `, {
        replacements: {
          tenantId,
          userId: userId || null,
          name,
          role,
          shift,
          status: status || 'active',
          phone: phone || null,
          email: email || null
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Kitchen staff created successfully'
      });

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in kitchen staff API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
