import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import bcrypt from 'bcryptjs';

const User = require('@/models/User');
const Employee = require('@/models/Employee');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (req.method === 'GET') {
      // Get user by ID
      const user = await User.findByPk(id, {
        attributes: ['id', 'name', 'email', 'phone', 'role', 'position', 'isActive', 'createdAt', 'lastLoginAt']
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        success: true,
        data: user
      });

    } else if (req.method === 'PUT') {
      // Update user
      const { name, email, phone, password, role, position, isActive } = req.body;

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if email is being changed and already exists
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(400).json({ error: 'Email already exists' });
        }
      }

      // Prepare update data
      const updateData: any = {
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone,
        role: role || user.role,
        position: position || user.position,
        isActive: isActive !== undefined ? isActive : user.isActive
      };

      // Hash new password if provided
      if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10);
      }

      // Update user
      await user.update(updateData);

      // Update employee record if exists
      try {
        const employee = await Employee.findOne({ where: { userId: id } });
        if (employee) {
          await employee.update({
            name: updateData.name,
            email: updateData.email,
            phone: updateData.phone,
            position: updateData.position,
            isActive: updateData.isActive
          });
        }
      } catch (empError) {
        console.log('Employee update skipped or failed:', empError);
      }

      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });

    } else if (req.method === 'DELETE') {
      // Delete user
      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Soft delete - set isActive to false instead of actually deleting
      await user.update({ isActive: false });

      // Also deactivate employee record
      try {
        const employee = await Employee.findOne({ where: { userId: id } });
        if (employee) {
          await employee.update({ isActive: false });
        }
      } catch (empError) {
        console.log('Employee deactivation skipped or failed:', empError);
      }

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in user API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process user',
      details: error.message
    });
  }
}
