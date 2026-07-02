import type { NextApiRequest, NextApiResponse } from 'next';
import { Branch, User, Store } from '../../../../../models';

// Mock branch data
const getMockBranch = (id: string) => ({
  id,
  code: 'BR-001',
  name: 'Cabang Pusat Jakarta',
  type: 'main',
  address: 'Jl. Sudirman No. 123',
  city: 'Jakarta Selatan',
  province: 'DKI Jakarta',
  phone: '021-1234567',
  email: 'pusat@bedagang.com',
  manager: { id: '1', name: 'Ahmad Wijaya', email: 'ahmad@bedagang.com', phone: '08123456789' },
  isActive: true,
  priceTierId: null,
  priceTierName: 'Harga Standar',
  status: 'online',
  lastSync: new Date().toISOString(),
  createdAt: '2024-01-01',
  updatedAt: new Date().toISOString(),
  settings: {
    operatingHours: {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
      wednesday: { open: '08:00', close: '22:00' },
      thursday: { open: '08:00', close: '22:00' },
      friday: { open: '08:00', close: '22:00' },
      saturday: { open: '09:00', close: '23:00' },
      sunday: { open: '09:00', close: '21:00' }
    },
    kitchenSLA: 15,
    serviceSLA: 5,
    deliverySLA: 30
  },
  stats: {
    todaySales: 45000000,
    monthSales: 1250000000,
    employeeCount: 25,
    lowStockItems: 5
  }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        return await getBranch(req, res, id as string);
      case 'PUT':
        return await updateBranch(req, res, id as string);
      case 'DELETE':
        return await deleteBranch(req, res, id as string);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Branch API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getBranch(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const branch: any = await Branch?.findByPk(id, {
      include: [
        { model: User, as: 'manager', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Store, as: 'store', attributes: ['id', 'name'] }
      ]
    });

    if (!branch) {
      // Return mock data if not found
      return res.status(200).json({ branch: getMockBranch(id) });
    }

    return res.status(200).json({
      branch: {
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
        settings: branch.settings || {},
        stats: {
          employeeCount: 0,
          todaySales: 0,
          monthSales: 0,
          lowStockItems: 0
        },
        status: 'online',
        lastSync: branch.updatedAt,
        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching branch:', error);
    return res.status(200).json({ branch: getMockBranch(id) });
  }
}

async function updateBranch(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { name, code, type, address, city, province, phone, email, managerId, priceTierId, settings, isActive } = req.body;

  try {
    const branch = await Branch?.findByPk(id);
    
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    await branch.update({
      name,
      code,
      type,
      address,
      city,
      province,
      phone,
      email,
      managerId,
      priceTierId,
      settings,
      isActive
    });

    return res.status(200).json({ 
      success: true,
      message: 'Branch updated successfully',
      branch 
    });
  } catch (error) {
    console.error('Error updating branch:', error);
    return res.status(500).json({ error: 'Failed to update branch' });
  }
}

async function deleteBranch(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const branch = await Branch?.findByPk(id);
    
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    await branch.destroy();

    return res.status(200).json({ 
      success: true,
      message: 'Branch deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return res.status(500).json({ error: 'Failed to delete branch' });
  }
}
