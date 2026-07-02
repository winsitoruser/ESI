import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: productId } = req.query;
    const { ProductVariant, Product } = db;

    // Verify product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    switch (req.method) {
      case 'GET':
        const variants = await ProductVariant.findAll({
          where: { productId, isActive: true },
          order: [['name', 'ASC']]
        });

        return res.status(200).json({ success: true, data: variants });

      case 'POST':
        const { name, sku, price, cost, attributes, stock } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Variant name is required' });
        }

        const variant = await ProductVariant.create({
          productId,
          name,
          sku: sku || `${product.sku}-${name.toLowerCase().replace(/\s+/g, '-')}`,
          price: price || product.price,
          cost: cost || product.cost,
          attributes: attributes || {},
          stock: stock || 0,
          isActive: true,
          createdBy: (session.user as any).id
        });

        return res.status(201).json({
          success: true,
          message: 'Variant created',
          data: variant
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Product Variants API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
