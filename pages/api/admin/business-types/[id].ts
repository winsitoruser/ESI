// API endpoint for specific business type management
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const getDb = () => require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userRole = (session.user?.role as string)?.toLowerCase();
    const allowedRoles = ['admin', 'super_admin', 'superadmin'];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied - Admin access required' });
    }

    const { id } = req.query;
    const db = getDb();

    if (req.method === 'GET') {
      // Get specific business type
      const businessType = await db.BusinessType.findByPk(id, {
        include: [
          {
            model: db.Module,
            as: 'modules',
            through: {
              attributes: ['isDefault', 'isOptional']
            }
          }
        ]
      });

      if (!businessType) {
        return res.status(404).json({ success: false, message: 'Business type not found' });
      }

      // Get tenant count using this business type
      const tenantCount = await db.Tenant.count({
        where: { businessTypeId: id }
      });

      return res.status(200).json({
        success: true,
        data: {
          ...businessType.toJSON(),
          tenantCount
        }
      });
    }

    if (req.method === 'PUT') {
      // Only admin/super_admin can update business types
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengubah jenis bisnis' });
      }

      const { name, description, icon, isActive } = req.body;

      const businessType = await db.BusinessType.findByPk(id);

      if (!businessType) {
        return res.status(404).json({ success: false, message: 'Business type not found' });
      }

      // Update business type
      await businessType.update({
        name,
        description,
        icon,
        isActive
      });

      // Fetch updated business type
      const updatedBusinessType = await db.BusinessType.findByPk(id, {
        include: [
          {
            model: db.Module,
            as: 'modules',
            through: {
              attributes: ['isDefault', 'isOptional']
            }
          }
        ]
      });

      return res.status(200).json({
        success: true,
        message: 'Business type updated successfully',
        data: updatedBusinessType
      });
    }

    if (req.method === 'DELETE') {
      // Only super_admin can delete business types
      if (userRole !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Hanya super admin yang dapat menghapus jenis bisnis' });
      }

      const businessType = await db.BusinessType.findByPk(id);

      if (!businessType) {
        return res.status(404).json({ success: false, message: 'Business type not found' });
      }

      // Check if business type is used by any tenant
      const tenantCount = await db.Tenant.count({
        where: { businessTypeId: id }
      });

      if (tenantCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete business type. It is currently used by ${tenantCount} tenant(s)`
        });
      }

      // Delete business type
      await businessType.destroy();

      return res.status(200).json({
        success: true,
        message: 'Business type deleted successfully'
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error: any) {
    console.error('Business type detail API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
