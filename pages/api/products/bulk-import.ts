import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { Product, Category, Stock } = db;
    const { products, warehouseId } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    const results = {
      success: [] as any[],
      errors: [] as any[],
      skipped: [] as any[]
    };

    for (const item of products) {
      try {
        // Validate required fields
        if (!item.name || !item.sku) {
          results.errors.push({
            row: item,
            error: 'Name and SKU are required'
          });
          continue;
        }

        // Check if product exists
        const existing = await Product.findOne({ where: { sku: item.sku } });
        if (existing) {
          if (item.updateExisting) {
            await existing.update({
              name: item.name,
              price: item.price,
              cost: item.cost,
              categoryId: item.categoryId,
              description: item.description,
              unit: item.unit
            });
            results.success.push({ sku: item.sku, action: 'updated' });
          } else {
            results.skipped.push({ sku: item.sku, reason: 'Already exists' });
          }
          continue;
        }

        // Create category if needed
        let categoryId = item.categoryId;
        if (!categoryId && item.categoryName) {
          let category = await Category.findOne({ where: { name: item.categoryName } });
          if (!category) {
            category = await Category.create({ name: item.categoryName });
          }
          categoryId = category.id;
        }

        // Create product
        const product = await Product.create({
          name: item.name,
          sku: item.sku,
          barcode: item.barcode,
          description: item.description,
          categoryId,
          price: item.price || 0,
          cost: item.cost || 0,
          unit: item.unit || 'pcs',
          minStock: item.minStock || 0,
          maxStock: item.maxStock,
          isActive: true,
          createdBy: (session.user as any).id
        });

        // Create initial stock if provided
        if (item.initialStock && warehouseId) {
          await Stock.create({
            productId: product.id,
            warehouseId,
            quantity: item.initialStock
          });
        }

        results.success.push({ sku: item.sku, id: product.id, action: 'created' });
      } catch (err: any) {
        results.errors.push({
          row: item,
          error: err.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Imported ${results.success.length} products`,
      data: results
    });
  } catch (error: any) {
    console.error('Bulk Import API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
