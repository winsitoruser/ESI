import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../pages/api/auth/[...nextauth]';
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

    const { id } = req.query;
    const tenantId = session.user.tenantId;

    if (req.method === 'PUT') {
      // Update staff
      const {
        name,
        role,
        shift,
        status,
        phone,
        email,
        performance
      } = req.body;

      await sequelize.query(`
        UPDATE kitchen_staff 
        SET 
          name = :name,
          role = :role,
          shift = :shift,
          status = :status,
          phone = :phone,
          email = :email,
          performance = :performance,
          updated_at = NOW()
        WHERE id = :id AND tenant_id = :tenantId
      `, {
        replacements: {
          id,
          tenantId,
          name,
          role,
          shift,
          status: status || 'active',
          phone: phone || null,
          email: email || null,
          performance: performance || 0
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Staff updated successfully'
      });

    } else if (req.method === 'DELETE') {
      // Soft delete staff
      await sequelize.query(`
        UPDATE kitchen_staff 
        SET 
          is_active = false,
          status = 'off',
          updated_at = NOW()
        WHERE id = :id AND tenant_id = :tenantId
      `, {
        replacements: { id, tenantId }
      });

      return res.status(200).json({
        success: true,
        message: 'Staff deleted successfully'
      });

    } else if (req.method === 'GET') {
      // Get single staff
      const [staff] = await sequelize.query(`
        SELECT 
          ks.*,
          u.email as user_email
        FROM kitchen_staff ks
        LEFT JOIN users u ON ks.user_id = u.id
        WHERE ks.id = :id AND ks.tenant_id = :tenantId AND ks.is_active = true
      `, {
        replacements: { id, tenantId },
        type: QueryTypes.SELECT
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Staff not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: staff
      });

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in staff API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
