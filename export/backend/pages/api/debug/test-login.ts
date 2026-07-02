import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  try {
    const db = require('../../../models');
    const { User } = db;
    
    // Find user by email with password
    const user = await User.findOne({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ 
        success: false, 
        message: 'User is not active' 
      });
    }

    // Test password verification
    let passwordMatch = false;
    let passwordInfo = {
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      passwordStart: user.password ? user.password.substring(0, 20) + '...' : null
    };

    if (user.password) {
      try {
        passwordMatch = await bcrypt.compare(password, user.password);
      } catch (error) {
        passwordInfo.error = error.message;
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      },
      passwordTest: {
        ...passwordInfo,
        passwordMatch,
        testPassword: password
      }
    });

  } catch (error: any) {
    console.error('Test login error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
