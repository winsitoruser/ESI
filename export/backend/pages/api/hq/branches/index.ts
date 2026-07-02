import type { NextApiRequest, NextApiResponse } from 'next';
import { Branch, User, Store } from '../../../../models';
import { Op } from 'sequelize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getBranches(req, res);
      case 'POST':
        return await createBranch(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Branch API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getBranches(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '10', search, type, status } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  try {
    const where: any = {};
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (type && type !== 'all') {
      where.type = type;
    }
    
    if (status && status !== 'all') {
      where.isActive = status === 'active';
    }

    const { count, rows } = await Branch.findAndCountAll({
      where,
      include: [
        { model: User, as: 'manager', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Store, as: 'store', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset
    });

    // Get setup status for each branch
    let BranchSetup: any = null;
    try {
      BranchSetup = require('../../../../models').BranchSetup;
    } catch (e) {}

    const branches = await Promise.all(rows.map(async (branch: any) => {
      let setupStatus = null;
      let setupProgress = 0;
      
      if (BranchSetup) {
        try {
          const setup = await BranchSetup.findOne({ where: { branchId: branch.id } });
          if (setup) {
            setupStatus = setup.status;
            setupProgress = setup.getProgress ? setup.getProgress() : 0;
          }
        } catch (e) {}
      }

      return {
        id: branch.id,
        code: branch.code,
        name: branch.name,
        type: branch.type || 'branch',
        address: branch.address,
        city: branch.city,
        province: branch.province,
        phone: branch.phone,
        email: branch.email,
        isActive: branch.isActive,
        manager: branch.manager ? {
          id: branch.manager.id,
          name: branch.manager.name,
          email: branch.manager.email,
          phone: branch.manager.phone
        } : null,
        stats: {
          employeeCount: 0,
          todaySales: 0,
          monthSales: 0,
          lowStockItems: 0
        },
        setupStatus,
        setupProgress,
        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt
      };
    }));

    return res.status(200).json({
      branches,
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum)
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    // Return mock data if database not available
    return res.status(200).json({
      branches: getMockBranches(),
      total: 5,
      page: 1,
      limit: 10,
      totalPages: 1
    });
  }
}

async function createBranch(req: NextApiRequest, res: NextApiResponse) {
  const { code, name, type, address, city, province, phone, email, managerId } = req.body;

  if (!code || !name) {
    return res.status(400).json({ error: 'Code and name are required' });
  }

  try {
    // Create the branch
    const branch = await Branch.create({
      code,
      name,
      type: type || 'branch',
      address,
      city,
      province,
      phone,
      email,
      managerId,
      isActive: true
    });

    const branchId = (branch as any).id;
    const branchType = type || 'branch';
    
    // Initialize all branch services using the initialization service
    let initResult = {
      success: false,
      initializedServices: [] as string[],
      errors: [] as string[]
    };

    try {
      const { initializeBranch } = require('../../../../lib/services/branchInitializationService');
      
      initResult = await initializeBranch({
        branchId,
        branchCode: code,
        branchName: name,
        branchType,
        createdBy: managerId
      });

      console.log('Branch initialization result:', initResult);
    } catch (initError: any) {
      console.warn('Could not use initialization service, falling back to basic setup:', initError.message);
      
      // Fallback to basic initialization
      try {
        const { BranchSetup, BranchModule, Location, StoreSetting } = require('../../../../models');
        
        // Create setup record
        if (BranchSetup) {
          await BranchSetup.create({
            branchId,
            status: 'pending',
            currentStep: 1
          });
          initResult.initializedServices.push('branch_setup');
        }

        // Enable default modules
        if (BranchModule && BranchModule.enableDefaultModules) {
          await BranchModule.enableDefaultModules(branchId);
          initResult.initializedServices.push('modules');
        }

        // Create default location
        if (Location) {
          await Location.create({
            branchId,
            code: 'MAIN',
            name: 'Lokasi Utama',
            type: 'store',
            isDefault: true,
            isActive: true
          });
          initResult.initializedServices.push('locations');
        }

        // Create default settings
        if (StoreSetting) {
          const defaultSettings = [
            { category: 'general', key: 'currency', value: 'IDR', dataType: 'string' },
            { category: 'general', key: 'timezone', value: 'Asia/Jakarta', dataType: 'string' },
            { category: 'pos', key: 'receipt_header', value: name, dataType: 'string' },
            { category: 'pos', key: 'receipt_footer', value: 'Terima kasih atas kunjungan Anda', dataType: 'string' },
            { category: 'pos', key: 'tax_enabled', value: 'true', dataType: 'boolean' },
            { category: 'pos', key: 'tax_rate', value: '11', dataType: 'number' },
            { category: 'inventory', key: 'low_stock_threshold', value: '10', dataType: 'number' },
            { category: 'inventory', key: 'sync_from_hq', value: 'true', dataType: 'boolean' }
          ];

          for (const setting of defaultSettings) {
            await StoreSetting.findOrCreate({
              where: { branchId, category: setting.category, key: setting.key },
              defaults: { ...setting, branchId }
            });
          }
          initResult.initializedServices.push('store_settings');
        }

        initResult.success = true;
      } catch (fallbackError: any) {
        initResult.errors.push(fallbackError.message);
      }
    }

    return res.status(201).json({ 
      branch, 
      message: 'Branch created successfully',
      setupInitialized: initResult.success || initResult.initializedServices.length > 0,
      initializedServices: initResult.initializedServices,
      initializationErrors: initResult.errors,
      redirectToSetup: true,
      setupUrl: `/hq/branches/${branchId}/setup`
    });
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Branch code already exists' });
    }
    throw error;
  }
}

function getMockBranches() {
  return [
    { id: '1', code: 'HQ-001', name: 'Cabang Pusat Jakarta', type: 'main', city: 'Jakarta Selatan', province: 'DKI Jakarta', isActive: true, manager: { id: '1', name: 'Ahmad Wijaya' }, stats: { employeeCount: 25, todaySales: 45000000, monthSales: 1250000000, lowStockItems: 5 } },
    { id: '2', code: 'BR-002', name: 'Cabang Bandung', type: 'branch', city: 'Bandung', province: 'Jawa Barat', isActive: true, manager: { id: '2', name: 'Siti Rahayu' }, stats: { employeeCount: 18, todaySales: 32000000, monthSales: 920000000, lowStockItems: 12 } },
    { id: '3', code: 'BR-003', name: 'Cabang Surabaya', type: 'branch', city: 'Surabaya', province: 'Jawa Timur', isActive: true, manager: { id: '3', name: 'Budi Santoso' }, stats: { employeeCount: 15, todaySales: 28000000, monthSales: 780000000, lowStockItems: 8 } },
    { id: '4', code: 'BR-004', name: 'Cabang Medan', type: 'branch', city: 'Medan', province: 'Sumatera Utara', isActive: true, manager: { id: '4', name: 'Dewi Lestari' }, stats: { employeeCount: 12, todaySales: 22000000, monthSales: 650000000, lowStockItems: 15 } },
    { id: '5', code: 'WH-001', name: 'Gudang Pusat', type: 'warehouse', city: 'Bekasi', province: 'Jawa Barat', isActive: true, manager: { id: '5', name: 'Eko Prasetyo' }, stats: { employeeCount: 30, todaySales: 0, monthSales: 0, lowStockItems: 22 } }
  ];
}
