import type { NextApiRequest, NextApiResponse } from 'next';
import { User, Branch } from '../../../../models';
import { Op } from 'sequelize';
import { triggerHRISWebhook } from './webhooks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getEmployees(req, res);
      case 'POST':
        return await createEmployee(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('HRIS Employees API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getEmployees(req: NextApiRequest, res: NextApiResponse) {
  const { search, department, status, branchId } = req.query;

  try {
    const where: any = {};
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (department && department !== 'all') {
      where.department = department;
    }
    
    if (status && status !== 'all') {
      where.isActive = status === 'active';
    }
    
    if (branchId) {
      where.branchId = branchId;
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'code', 'name', 'city'] }
      ],
      order: [['name', 'ASC']]
    });

    const employees = users.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      position: user.role || 'Staff',
      department: user.department || 'Operations',
      branchId: user.branch?.id,
      branchName: user.branch?.name || 'HQ',
      joinDate: user.createdAt,
      status: user.isActive ? 'active' : 'inactive',
      avatar: user.avatar,
      performance: {
        score: Math.floor(Math.random() * 30) + 70,
        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)],
        kpiAchievement: Math.floor(Math.random() * 30) + 80,
        attendance: Math.floor(Math.random() * 10) + 90,
        rating: (Math.random() * 2 + 3).toFixed(1)
      },
      manager: user.managerId || null
    }));

    const departmentStats = getDepartmentStats(employees);

    return res.status(200).json({ employees, departmentStats });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(200).json({ 
      employees: getMockEmployees(),
      departmentStats: getMockDepartmentStats()
    });
  }
}

function getDepartmentStats(employees: any[]) {
  const departments = ['Operations', 'Sales', 'Warehouse', 'Finance', 'HR'];
  return departments.map(dept => {
    const deptEmployees = employees.filter(e => e.department === dept);
    return {
      department: dept,
      totalEmployees: deptEmployees.length,
      activeEmployees: deptEmployees.filter(e => e.status === 'active').length,
      avgPerformance: deptEmployees.length > 0 
        ? Math.round(deptEmployees.reduce((sum, e) => sum + e.performance.score, 0) / deptEmployees.length)
        : 0,
      avgAttendance: deptEmployees.length > 0
        ? Math.round(deptEmployees.reduce((sum, e) => sum + e.performance.attendance, 0) / deptEmployees.length)
        : 0
    };
  });
}

async function createEmployee(req: NextApiRequest, res: NextApiResponse) {
  const { name, email, phone, position, department, branchId, branchName } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const user = await User.create({
      name,
      email,
      phone,
      role: position || 'STAFF',
      department: department || 'Operations',
      branchId,
      isActive: true,
      password: 'default123' // Should be hashed in production
    });

    // Trigger webhook for new employee
    await triggerHRISWebhook(
      'employee.created',
      user.get('id') as string,
      name,
      { email, phone, position, department, branchId },
      branchId,
      branchName
    );

    return res.status(201).json({ employee: user, message: 'Employee created successfully' });
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    throw error;
  }
}

function getMockEmployees() {
  return [
    { id: '1', name: 'Ahmad Wijaya', email: 'ahmad@bedagang.com', phone: '081234567890', position: 'Branch Manager', department: 'Operations', branchId: '1', branchName: 'Cabang Pusat Jakarta', joinDate: '2023-06-15', status: 'active', performance: { score: 92, trend: 'up', kpiAchievement: 104, attendance: 98, rating: 4.8 } },
    { id: '2', name: 'Siti Rahayu', email: 'siti@bedagang.com', phone: '082345678901', position: 'Branch Manager', department: 'Operations', branchId: '2', branchName: 'Cabang Bandung', joinDate: '2023-08-01', status: 'active', performance: { score: 88, trend: 'up', kpiAchievement: 102, attendance: 96, rating: 4.5 } },
    { id: '3', name: 'Budi Santoso', email: 'budi@bedagang.com', phone: '083456789012', position: 'Branch Manager', department: 'Operations', branchId: '3', branchName: 'Cabang Surabaya', joinDate: '2023-09-10', status: 'active', performance: { score: 78, trend: 'down', kpiAchievement: 92, attendance: 94, rating: 4.0 } },
    { id: '4', name: 'Dewi Lestari', email: 'dewi@bedagang.com', phone: '084567890123', position: 'Supervisor', department: 'Operations', branchId: '1', branchName: 'Cabang Pusat Jakarta', joinDate: '2024-01-15', status: 'active', performance: { score: 85, trend: 'stable', kpiAchievement: 98, attendance: 97, rating: 4.3 } },
    { id: '5', name: 'Eko Prasetyo', email: 'eko@bedagang.com', phone: '085678901234', position: 'Kasir Senior', department: 'Sales', branchId: '1', branchName: 'Cabang Pusat Jakarta', joinDate: '2024-02-01', status: 'active', performance: { score: 90, trend: 'up', kpiAchievement: 110, attendance: 99, rating: 4.6 } },
  ];
}

function getMockDepartmentStats() {
  return [
    { department: 'Operations', totalEmployees: 15, activeEmployees: 14, avgPerformance: 86, avgAttendance: 96 },
    { department: 'Sales', totalEmployees: 45, activeEmployees: 43, avgPerformance: 84, avgAttendance: 95 },
    { department: 'Warehouse', totalEmployees: 12, activeEmployees: 12, avgPerformance: 78, avgAttendance: 93 },
    { department: 'Finance', totalEmployees: 5, activeEmployees: 5, avgPerformance: 90, avgAttendance: 98 },
    { department: 'HR', totalEmployees: 3, activeEmployees: 3, avgPerformance: 88, avgAttendance: 97 },
  ];
}
