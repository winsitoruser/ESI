import type { NextApiRequest, NextApiResponse } from 'next';
import sequelizeAdapterHandler from './sequelize-adapter';

/**
 * Inventory Stock Opname API - Wrapper
 * Mengalihkan ke implementasi Sequelize untuk mengurangi duplikasi kode
 * dan memastikan perilaku yang konsisten di seluruh aplikasi
 */
export default async function stockOpnameHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return await sequelizeAdapterHandler(req, res);
}
