import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../models');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { Stock, Product, Category, Warehouse, SystemAlert } = db;
    const { warehouseId, createAlerts } = req.query;

    const stockWhere: any = {};
    if (warehouseId) stockWhere.warehouseId = warehouseId;

    const stocks = await Stock.findAll({
      where: stockWhere,
      include: [
        { 
          model: Product, 
          as: 'product',
          where: { isActive: true },
          include: [{ model: Category, as: 'category' }]
        },
        { model: Warehouse, as: 'warehouse' }
      ]
    });

    // Filter low stock items
    const lowStockItems = stocks.filter((s: any) => {
      const minStock = s.product?.minStock || 0;
      return s.quantity <= minStock;
    }).map((s: any) => ({
      stockId: s.id,
      productId: s.productId,
      productName: s.product?.name,
      sku: s.product?.sku,
      category: s.product?.category?.name,
      warehouse: s.warehouse?.name,
      currentStock: s.quantity,
      minStock: s.product?.minStock || 0,
      deficit: (s.product?.minStock || 0) - s.quantity,
      status: s.quantity <= 0 ? 'out_of_stock' : 'low_stock'
    }));

    // Sort by deficit (most critical first)
    lowStockItems.sort((a: any, b: any) => b.deficit - a.deficit);

    // Create system alerts if requested
    if (createAlerts === 'true' && lowStockItems.length > 0) {
      for (const item of lowStockItems.slice(0, 10)) { // Max 10 alerts
        const existingAlert = await SystemAlert.findOne({
          where: {
            type: 'low_stock',
            status: 'unread',
            [Op.and]: db.sequelize.literal(`metadata->>'productId' = '${item.productId}'`)
          }
        });

        if (!existingAlert) {
          await SystemAlert.create({
            title: item.status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock Alert',
            message: `${item.productName} (${item.sku}) has ${item.currentStock} units remaining. Minimum: ${item.minStock}`,
            type: 'low_stock',
            priority: item.status === 'out_of_stock' ? 'high' : 'normal',
            status: 'unread',
            metadata: {
              productId: item.productId,
              currentStock: item.currentStock,
              minStock: item.minStock
            }
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        totalLowStock: lowStockItems.filter((i: any) => i.status === 'low_stock').length,
        totalOutOfStock: lowStockItems.filter((i: any) => i.status === 'out_of_stock').length,
        items: lowStockItems
      }
    });
  } catch (error: any) {
    console.error('Low Stock Alerts API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
