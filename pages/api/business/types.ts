import { NextApiRequest, NextApiResponse } from 'next';

const db = require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { BusinessType, BusinessTypeModule, Module } = db;
    
    // Get all active business types with their modules
    const businessTypes = await BusinessType.findAll({
      where: { isActive: true },
      include: [{
        model: BusinessTypeModule,
        as: 'businessTypeModules',
        include: [{
          model: Module,
          as: 'module'
        }]
      }],
      order: [['name', 'ASC']]
    });

    const formattedTypes = businessTypes.map((bt: any) => ({
      id: bt.id,
      code: bt.code,
      name: bt.name,
      description: bt.description,
      icon: bt.icon,
      modules: bt.businessTypeModules
        .filter((btm: any) => btm.isDefault)
        .map((btm: any) => ({
          code: btm.module.code,
          name: btm.module.name,
          icon: btm.module.icon,
          description: btm.module.description
        })),
      optionalModules: bt.businessTypeModules
        .filter((btm: any) => btm.isOptional)
        .map((btm: any) => ({
          code: btm.module.code,
          name: btm.module.name,
          icon: btm.module.icon,
          description: btm.module.description
        }))
    }));

    return res.status(200).json({
      success: true,
      data: formattedTypes
    });

  } catch (error) {
    console.error('Get business types error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch business types'
    });
  }
}
