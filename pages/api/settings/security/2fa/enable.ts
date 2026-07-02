import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

const User = require('@/models/User');
const AuditLog = require('@/models/AuditLog');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user
    const user = await User.findOne({ where: { email: session.user?.email } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate 2FA secret (placeholder - implement with speakeasy or similar)
    const secret = 'PLACEHOLDER_SECRET_' + Math.random().toString(36).substring(7);

    // Update user with 2FA secret
    await user.update({
      twoFactorEnabled: true,
      twoFactorSecret: secret
    });

    // Create audit log
    try {
      await AuditLog.create({
        userId: user.id,
        action: '2FA_ENABLED',
        resource: 'user',
        resourceId: user.id,
        details: { message: 'User enabled two-factor authentication' },
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      });
    } catch (logError) {
      console.log('Audit log creation failed:', logError);
    }

    return res.status(200).json({
      success: true,
      message: '2FA enabled successfully',
      data: {
        secret: secret,
        qrCode: 'QR_CODE_URL_PLACEHOLDER'
      }
    });

  } catch (error: any) {
    console.error('Error enabling 2FA:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to enable 2FA',
      details: error.message
    });
  }
}
