// API endpoint for specific module management
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const getDb = () => require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check if user is admin or super_admin
    if (!['ADMIN', 'super_admin'].includes(session.user?.role as string)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { id } = req.query;
    const db = getDb();

    if (req.method === 'GET') {
      // Get specific module
      const moduleData = await db.Module.findByPk(id, {
        include: [
          {
            model: db.BusinessType,
            as: 'businessTypes',
            through: {
              attributes: ['isDefault', 'isOptional']
            }
          }
        ]
      });

      if (!moduleData) {
        return res.status(404).json({ success: false, message: 'Module not found' });
      }

      // Get tenant count using this module
      const tenantCount = await db.TenantModule.count({
        where: { moduleId: id, isEnabled: true }
      });

      return res.status(200).json({
        success: true,
        data: {
          ...moduleData.toJSON(),
          tenantCount
        }
      });
    }

    if (req.method === 'PUT') {
      // Only super_admin can update modules
      if (session.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Only super admin can update modules' });
      }

      const { name, description, icon, route, isCore, isActive, businessTypes } = req.body;

      const moduleToUpdate = await db.Module.findByPk(id);

      if (!moduleToUpdate) {
        return res.status(404).json({ success: false, message: 'Module not found' });
      }

      // Update module
      await moduleToUpdate.update({
        name,
        description,
        icon,
        route,
        isCore,
        isActive
      });

      // Update business type associations if provided
      if (businessTypes && Array.isArray(businessTypes)) {
        // Remove existing associations
        await db.BusinessTypeModule.destroy({
          where: { moduleId: id }
        });

        // Add new associations
        for (const bt of businessTypes) {
          await db.BusinessTypeModule.create({
            businessTypeId: bt.businessTypeId,
            moduleId: id,
            isDefault: bt.isDefault || false,
            isOptional: bt.isOptional || false
          });
        }
      }

      // Fetch updated module
      const updatedModule = await db.Module.findByPk(id, {
        include: [
          {
            model: db.BusinessType,
            as: 'businessTypes',
            through: {
              attributes: ['isDefault', 'isOptional']
            }
          }
        ]
      });

      return res.status(200).json({
        success: true,
        message: 'Module updated successfully',
        data: updatedModule
      });
    }

    if (req.method === 'DELETE') {
      // Only super_admin can delete modules
      if (session.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Only super admin can delete modules' });
      }

      const moduleToDelete = await db.Module.findByPk(id);

      if (!moduleToDelete) {
        return res.status(404).json({ success: false, message: 'Module not found' });
      }

      // Check if module is core
      if (moduleToDelete.isCore) {
        return res.status(400).json({ success: false, message: 'Cannot delete core module' });
      }

      // Check if module is used by any tenant
      const tenantCount = await db.TenantModule.count({
        where: { moduleId: id, isEnabled: true }
      });

      if (tenantCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete module. It is currently used by ${tenantCount} tenant(s)`
        });
      }

      // Delete module
      await moduleToDelete.destroy();

      return res.status(200).json({
        success: true,
        message: 'Module deleted successfully'
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error: any) {
    console.error('Module detail API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
