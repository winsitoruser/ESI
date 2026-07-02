import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * Bridge handler untuk Finance Monthly Income Report
 * Implementasi dengan Sequelize
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Pastikan user terautentikasi
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Pastikan request memiliki tenantId (dari session)
    const tenantId = (session?.user as any)?.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Selalu gunakan implementasi Sequelize
    console.log('[Finance API] Menggunakan Sequelize Adapter untuk monthly income report');
    const sequelizeHandler = require('./monthly-income-sequelize').default;
    return sequelizeHandler(req, res);
  } catch (err: any) {
    console.error('Error handling finance monthly income report request:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      success: false
    });
  }
}
