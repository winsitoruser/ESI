// API endpoint for managing business type modules
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';

const getDb = () => require('../../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Only super_admin can manage business type modules
    if (session.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only super admin can manage business type modules' });
    }

    const { id } = req.query;
    const db = getDb();

    if (req.method === 'GET') {
      // Get all modules with their association status for this business type
      const businessType = await db.BusinessType.findByPk(id);

      if (!businessType) {
        return res.status(404).json({ success: false, message: 'Business type not found' });
      }

      // Get all modules
      const allModules = await db.Module.findAll({
        where: { isActive: true },
        order: [['sortOrder', 'ASC'], ['name', 'ASC']]
      });

      // Get business type module associations
      const businessTypeModules = await db.BusinessTypeModule.findAll({
        where: { businessTypeId: id }
      });

      // Create a map for quick lookup
      const moduleMap = new Map();
      businessTypeModules.forEach(btm => {
        moduleMap.set(btm.moduleId, {
          isDefault: btm.isDefault,
          isOptional: btm.isOptional
        });
      });

      // Combine data
      const modules = allModules.map(module => {
        const association = moduleMap.get(module.id);
        return {
          id: module.id,
          code: module.code,
          name: module.name,
          description: module.description,
          icon: module.icon,
          isCore: module.isCore,
          isAssociated: !!association,
          isDefault: association?.isDefault || false,
          isOptional: association?.isOptional || false
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          businessType: {
            id: businessType.id,
            code: businessType.code,
            name: businessType.name
          },
          modules
        }
      });
    }

    if (req.method === 'PUT') {
      // Update business type modules
      const { modules } = req.body;

      if (!Array.isArray(modules)) {
        return res.status(400).json({ success: false, message: 'Modules must be an array' });
      }

      const businessType = await db.BusinessType.findByPk(id);

      if (!businessType) {
        return res.status(404).json({ success: false, message: 'Business type not found' });
      }

      // Remove all existing associations
      await db.BusinessTypeModule.destroy({
        where: { businessTypeId: id }
      });

      // Add new associations
      for (const mod of modules) {
        if (mod.isAssociated) {
          await db.BusinessTypeModule.create({
            businessTypeId: id,
            moduleId: mod.moduleId,
            isDefault: mod.isDefault || false,
            isOptional: mod.isOptional || false
          });
        }
      }

      // Get updated modules
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
        message: 'Business type modules updated successfully',
        data: updatedBusinessType
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error: any) {
    console.error('Business type modules API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
