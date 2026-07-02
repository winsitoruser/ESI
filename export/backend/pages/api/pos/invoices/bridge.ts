import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

/**
 * Bridge handler untuk invoices di modul POS
 * Implementasi dengan Sequelize
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Autentikasi
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const tenantId = (session?.user as any)?.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Selalu gunakan implementasi Sequelize
    console.log('[POS Invoices API] Menggunakan Sequelize Adapter');
    const sequelizeHandler = require('./sequelize-handler').default;
    return sequelizeHandler(req, res);
  } catch (err: any) {
    console.error('Error handling POS invoices request:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      success: false
    });
  }
}
