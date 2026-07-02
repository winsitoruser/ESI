import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import sequelize from '@/lib/sequelize';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Auth check - only admin/super_admin can use this debug endpoint
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Unauthorized - login required' });
  }
  
  const userRole = (session.user as any)?.role || '';
  const isAdmin = ['admin', 'super_admin', 'owner'].includes(userRole.toLowerCase());
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: 'Forbidden - admin access required' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  try {
    const db = require('../../../models');
    const { User } = db;
    
    // Find user by email
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'email', 'name', 'role', 'isActive', 'password']
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found',
        email 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ 
        success: false, 
        message: 'User is not active',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive
        }
      });
    }

    // Return user info (without password)
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        hasPassword: !!user.password
      }
    });

  } catch (error: any) {
    console.error('Check user error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
