import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

/**
 * Bridge handler untuk modul POS
 * Mengalihkan request ke implementasi Prisma atau Sequelize berdasarkan flag USE_SEQUELIZE
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Autentikasi
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const tenantId = session?.user?.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Cek penggunaan Sequelize
    const useSequelize = process.env.USE_SEQUELIZE === 'true';
    
    if (useSequelize) {
      // Arahkan ke implementasi Sequelize
      console.log('[POS API] Menggunakan Sequelize Adapter');
      // Redirect ke endpoint transactions Sequelize
      return res.redirect(`/api/pos/transactions/sequelize-adapter${req.url?.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
    } else {
      // Arahkan ke implementasi Prisma (default)
      console.log('[POS API] Menggunakan Prisma');
      // Redirect ke endpoint transactions Prisma
      return res.redirect(`/api/pos/transactions${req.url?.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
    }
  } catch (err: any) {
    console.error('Error handling POS request:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      success: false
    });
  }
}
