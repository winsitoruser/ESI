import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import sequelize from '../../../lib/sequelize';

const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      return await getProducts(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('POS Products API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function getProducts(req: NextApiRequest, res: NextApiResponse) {
  const { search = '', category = '' } = req.query;

  const whereClause: any = {
    is_active: true
  };

  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { sku: { [Op.like]: `%${search}%` } },
      { barcode: { [Op.like]: `%${search}%` } }
    ];
  }

  if (category && category !== 'Semua') {
    whereClause.category_id = parseInt(category);
  }

  const { Product, Stock, Category } = sequelize.models;
  
  const products = await Product.findAll({
    where: whereClause,
    attributes: ['id', 'name', 'sku', 'barcode', 'sell_price', 'unit', 'category_id'],
    include: [{
      model: Stock,
      as: 'stock_data',
      attributes: ['quantity']
    }],
    order: [['name', 'ASC']]
  });

  // Get unique categories
  const categoriesData = await Category.findAll({
    where: { is_active: true },
    attributes: ['id', 'name'],
    order: [['name', 'ASC']]
  });

  const categories = ['Semua', ...categoriesData.map((c: any) => ({ id: c.id, name: c.name }))];

  // Create category lookup map
  const categoryMap = new Map(categoriesData.map((c: any) => [c.id, c.name]));
  
  return res.status(200).json({
    success: true,
    products: products.map((p: any) => ({
      id: p.id.toString(),
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: categoryMap.get(p.category_id) || 'Umum',
      categoryId: p.category_id,
      price: parseFloat(p.sell_price) || 0,
      stock: p.stock || 0,
      unit: p.unit || 'pcs'
    })),
    categories
  });
}
