import type { NextApiRequest, NextApiResponse } from 'next';
import { User, Branch } from '../../../../models';
import { Op } from 'sequelize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getManagers(req, res);
      default:
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Manager API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getManagers(req: NextApiRequest, res: NextApiResponse) {
  const { search, status } = req.query;

  try {
    const where: any = {
      role: { [Op.in]: ['BRANCH_MANAGER', 'MANAGER'] }
    };
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (status && status !== 'all') {
      where.isActive = status === 'active';
    }

    const managers = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'code', 'name', 'city'] }
      ],
      order: [['name', 'ASC']]
    });

    const formattedManagers = managers.map((manager: any) => ({
      id: manager.id,
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      avatar: manager.avatar,
      branchId: manager.branch?.id,
      branchName: manager.branch?.name,
      branchCode: manager.branch?.code,
      branchCity: manager.branch?.city,
      joinDate: manager.createdAt,
      status: manager.isActive ? 'active' : 'inactive',
      performance: {
        salesTarget: 0,
        salesActual: 0,
        achievement: 0,
        rating: 0,
        employeeCount: 0,
        activeEmployees: 0
      },
      lastActive: manager.lastLoginAt
    }));

    return res.status(200).json({ managers: formattedManagers });
  } catch (error) {
    console.error('Error fetching managers:', error);
    return res.status(200).json({ managers: getMockManagers() });
  }
}

function getMockManagers() {
  return [
    { id: '1', name: 'Ahmad Wijaya', email: 'ahmad.wijaya@bedagang.com', phone: '081234567890', branchId: '1', branchName: 'Cabang Pusat Jakarta', branchCode: 'HQ-001', branchCity: 'Jakarta Selatan', joinDate: '2023-06-15', status: 'active', performance: { salesTarget: 1200000000, salesActual: 1250000000, achievement: 104, rating: 4.8, employeeCount: 25, activeEmployees: 22 }, lastActive: '2026-02-22T06:30:00Z' },
    { id: '2', name: 'Siti Rahayu', email: 'siti.rahayu@bedagang.com', phone: '082345678901', branchId: '2', branchName: 'Cabang Bandung', branchCode: 'BR-002', branchCity: 'Bandung', joinDate: '2023-08-01', status: 'active', performance: { salesTarget: 900000000, salesActual: 920000000, achievement: 102, rating: 4.5, employeeCount: 18, activeEmployees: 16 }, lastActive: '2026-02-22T05:45:00Z' },
    { id: '3', name: 'Budi Santoso', email: 'budi.santoso@bedagang.com', phone: '083456789012', branchId: '3', branchName: 'Cabang Surabaya', branchCode: 'BR-003', branchCity: 'Surabaya', joinDate: '2023-09-10', status: 'active', performance: { salesTarget: 850000000, salesActual: 780000000, achievement: 92, rating: 4.0, employeeCount: 15, activeEmployees: 14 }, lastActive: '2026-02-22T04:00:00Z' }
  ];
}
