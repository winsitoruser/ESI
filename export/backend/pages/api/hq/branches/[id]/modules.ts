import type { NextApiRequest, NextApiResponse } from 'next';

let BranchModule: any;

try {
  const models = require('../../../../../models');
  BranchModule = models.BranchModule;
} catch (error) {
  console.warn('Models not available, using mock mode');
}

interface ModuleItem {
  code: string;
  name: string;
  description: string;
  icon: string;
  isCore: boolean;
  isEnabled: boolean;
  settings?: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const branchId = id as string;

  try {
    switch (req.method) {
      case 'GET':
        return await getBranchModules(branchId, res);
      case 'PUT':
        return await updateBranchModules(branchId, req, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Branch Modules API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getBranchModules(branchId: string, res: NextApiResponse) {
  try {
    const availableModules = BranchModule?.AVAILABLE_MODULES || getDefaultModules();
    
    if (!BranchModule) {
      return res.status(200).json({
        success: true,
        modules: availableModules.map((m: any) => ({ ...m, isEnabled: m.isCore }))
      });
    }

    const enabledModules = await BranchModule.findAll({
      where: { branchId, isEnabled: true }
    });

    const enabledCodes = new Set(enabledModules.map((m: any) => m.moduleCode));

    const modules: ModuleItem[] = availableModules.map((m: any) => ({
      ...m,
      isEnabled: enabledCodes.has(m.code) || m.isCore,
      settings: enabledModules.find((em: any) => em.moduleCode === m.code)?.settings || {}
    }));

    return res.status(200).json({ success: true, modules });
  } catch (error) {
    console.error('Error getting branch modules:', error);
    return res.status(200).json({
      success: true,
      modules: getDefaultModules().map(m => ({ ...m, isEnabled: m.isCore }))
    });
  }
}

async function updateBranchModules(branchId: string, req: NextApiRequest, res: NextApiResponse) {
  const { modules, userId } = req.body;

  if (!modules || !Array.isArray(modules)) {
    return res.status(400).json({ error: 'Invalid modules data' });
  }

  try {
    if (!BranchModule) {
      return res.status(200).json({
        success: true,
        message: 'Modules updated (mock mode)'
      });
    }

    for (const mod of modules) {
      const [branchModule, created] = await BranchModule.findOrCreate({
        where: { branchId, moduleCode: mod.code },
        defaults: {
          branchId,
          moduleCode: mod.code,
          moduleName: mod.name,
          isEnabled: mod.isEnabled,
          settings: mod.settings || {},
          enabledBy: userId
        }
      });

      if (!created) {
        await branchModule.update({
          isEnabled: mod.isEnabled,
          settings: mod.settings || {},
          enabledAt: mod.isEnabled ? new Date() : branchModule.enabledAt,
          disabledAt: !mod.isEnabled ? new Date() : null
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Modules updated successfully'
    });
  } catch (error) {
    console.error('Error updating branch modules:', error);
    return res.status(500).json({ error: 'Failed to update modules' });
  }
}

function getDefaultModules() {
  return [
    { code: 'pos', name: 'Point of Sale', description: 'Kasir dan transaksi penjualan', icon: 'ShoppingCart', isCore: true },
    { code: 'inventory', name: 'Inventory', description: 'Manajemen stok dan gudang', icon: 'Package', isCore: true },
    { code: 'kitchen', name: 'Kitchen Display', description: 'Tampilan dapur untuk F&B', icon: 'ChefHat', isCore: false },
    { code: 'table', name: 'Table Management', description: 'Manajemen meja restoran', icon: 'LayoutGrid', isCore: false },
    { code: 'reservation', name: 'Reservasi', description: 'Sistem reservasi pelanggan', icon: 'Calendar', isCore: false },
    { code: 'loyalty', name: 'Loyalty Program', description: 'Program loyalitas pelanggan', icon: 'Gift', isCore: false },
    { code: 'finance', name: 'Keuangan', description: 'Laporan dan manajemen keuangan', icon: 'DollarSign', isCore: false },
    { code: 'hris', name: 'HRIS', description: 'Manajemen karyawan dan absensi', icon: 'Users', isCore: false },
    { code: 'delivery', name: 'Delivery', description: 'Integrasi layanan delivery', icon: 'Truck', isCore: false },
    { code: 'promo', name: 'Promo & Diskon', description: 'Manajemen promosi dan diskon', icon: 'Percent', isCore: false }
  ];
}
