import type { NextApiRequest, NextApiResponse } from 'next';
import sequelizeAdapterHandler from './sequelize-adapter';

/**
 * Inventory Expired Products API - Wrapper
 * Mengalihkan ke implementasi Sequelize untuk mengurangi duplikasi kode
 * dan memastikan perilaku yang konsisten di seluruh aplikasi
 */
export default async function expiredProductsHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return await sequelizeAdapterHandler(req, res);
}
