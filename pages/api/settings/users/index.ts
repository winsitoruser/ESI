import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Dynamic imports to avoid module loading issues
    const User = require('@/models/User');
    const Employee = require('@/models/Employee');
    const Role = require('@/models/Role');

    if (req.method === 'GET') {
      // Get all users with their role details
      try {
        const users = await User.findAll({
          attributes: ['id', 'name', 'email', 'phone', 'role', 'roleId', 'position', 'isActive', 'createdAt', 'lastLoginAt'],
          include: [{
            model: Role,
            as: 'roleDetails',
            attributes: ['id', 'name', 'description', 'permissions'],
            required: false
          }],
          order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
          success: true,
          data: users
        });
      } catch (dbError: any) {
        console.error('Database error:', dbError);
        // Fallback: return users without role details if association fails
        const users = await User.findAll({
          attributes: ['id', 'name', 'email', 'phone', 'role', 'roleId', 'position', 'isActive', 'createdAt', 'lastLoginAt'],
          order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
          success: true,
          data: users
        });
      }

    } else if (req.method === 'POST') {
      // Create new user
      const { name, email, phone, password, role, roleId, position, isActive } = req.body;

      // Validation
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      // Check if email already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Get role details if roleId provided
      let roleData = null;
      if (roleId) {
        roleData = await Role.findByPk(roleId);
      }

      // Create user
      const user = await User.create({
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        role: role || (roleData ? roleData.name : 'staff'),
        roleId: roleId || null,
        position: position || null,
        isActive: isActive !== false
      });

      // Also create Employee record if needed
      try {
        await Employee.create({
          name,
          email,
          phone: phone || null,
          position: position || role || 'staff',
          userId: user.id,
          isActive: isActive !== false
        });
      } catch (empError) {
        console.log('Employee creation skipped or failed:', empError);
      }

      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in users API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process users',
      details: error.message
    });
  }
}
