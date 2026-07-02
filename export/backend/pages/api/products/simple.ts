import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import db from 'models';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const { search } = req.query;
      
      const whereClause: any = {
        is_active: true
      };

      if (search) {
        whereClause.name = {
          [db.Sequelize.Op.iLike]: `%${search}%`
        };
      }

      const products = await db.Product.findAll({
        where: whereClause,
        attributes: ['id', 'name', 'sku', 'unit', 'sell_price', 'buy_price'],
        order: [['name', 'ASC']],
        limit: 50
      });

      // Transform data to match expected format
      const transformedProducts = products.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        price: p.sell_price,
        cost: p.buy_price
      }));

      return res.status(200).json({
        success: true,
        data: transformedProducts
      });
    }
    
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Products API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
