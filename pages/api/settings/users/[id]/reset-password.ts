import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Use dynamic import for CommonJS module
const getDb = () => require('../../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { User, AuditLog } = getDb();
    const userId = req.query.id as string;

    if (req.method === 'POST') {
      // Generate random password
      const newPassword = crypto.randomBytes(4).toString('hex').toUpperCase();
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user password
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await user.update({ 
        password: hashedPassword,
        passwordResetAt: new Date()
      });

      // Log the action
      await AuditLog.create({
        userId: session.user?.id || '',
        action: 'UPDATE',
        entityType: 'User',
        entityId: userId,
        oldValues: {},
        newValues: { passwordReset: true },
        ipAddress: (req as any).ip || '',
        userAgent: req.headers['user-agent'],
        description: `Reset password for user: ${user.email}`
      });

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully',
        password: newPassword
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error resetting password:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset password',
      details: error.message
    });
  }
}
