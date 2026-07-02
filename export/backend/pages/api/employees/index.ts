import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const Employee = require('@/models/Employee');

    const { 
      search, 
      status = 'active',
      limit = 50,
      offset = 0 
    } = req.query;

    const where: any = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { employeeNumber: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    try {
      const employees = await Employee.findAll({
        where,
        attributes: [
          'id',
          'employeeNumber',
          'name',
          'email',
          'phone',
          'position',
          'department',
          'status',
          'hireDate'
        ],
        order: [['name', 'ASC']],
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      const total = await Employee.count({ where });

      return res.status(200).json({
        success: true,
        data: employees,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

    } catch (dbError: any) {
      console.error('Database error:', dbError);
      
      // Return empty array if database not ready
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        warning: 'Database not ready'
      });
    }

  } catch (error: any) {
    console.error('Employees API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
