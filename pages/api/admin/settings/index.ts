import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * GET /api/admin/settings - Get system settings
 * PUT /api/admin/settings - Update system settings
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    const userRole = (session?.user?.role as string)?.toLowerCase();
    
    if (!session || !['super_admin', 'superadmin'].includes(userRole)) {
      return res.status(401).json({ error: 'Unauthorized - Super Admin only' });
    }

    if (req.method === 'GET') {
      // In production, fetch from database
      // For now, return default settings
      return res.status(200).json({
        success: true,
        data: {
          siteName: 'Bedagang POS',
          siteUrl: 'https://bedagang.com',
          adminEmail: 'admin@bedagang.com',
          timezone: 'Asia/Jakarta'
        }
      });
    } else if (req.method === 'PUT') {
      // In production, save to database
      const settings = req.body;
      
      // Validate settings here
      
      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: settings
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Admin Settings API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
