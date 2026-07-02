import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

const Product = require('../../../models/Product');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { search, category, inStock } = req.query;

    let whereClause: any = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } }
      ];
    }

    if (category) {
      whereClause.category = category;
    }

    if (inStock === 'true') {
      whereClause.stock = { [Op.gt]: 0 };
    }

    const products = await Product.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'sku', 'price', 'stock', 'category', 'image'],
      order: [['name', 'ASC']],
      limit: 100
    });

    return res.status(200).json({
      success: true,
      data: products
    });

  } catch (error: any) {
    console.error('Products List API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
