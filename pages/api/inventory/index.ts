import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler, success, error, ApiContext } from '@/utils/api-utils';
import sequelizeAdapterHandler from './sequelize-adapter';

/**
 * Handler untuk modul Inventory
 * Menggunakan implementasi Sequelize
 */
const handler = async (req: NextApiRequest, res: NextApiResponse, context: ApiContext) => {
  try {
    // Gunakan Sequelize adapter untuk semua operasi
    console.log('[Inventory API] Menggunakan Sequelize Adapter');
    return sequelizeAdapterHandler(req, res);
  } catch (err: any) {
    console.error('Error handling inventory request:', err);
    return error(res, 'Internal Server Error', 500);
  }
};

export default withApiHandler(handler);
