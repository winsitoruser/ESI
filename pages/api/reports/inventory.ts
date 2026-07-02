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

    const { warehouseId, categoryId, lowStock, format } = req.query;
    const { Stock, Product, Category, Warehouse, StockMovement } = db;

    // Build where clause for stocks
    const stockWhere: any = {};
    if (warehouseId) stockWhere.warehouseId = warehouseId;

    // Build where clause for products
    const productWhere: any = { isActive: true };
    if (categoryId) productWhere.categoryId = categoryId;

    const stocks = await Stock.findAll({
      where: stockWhere,
      include: [
        { 
          model: Product, 
          as: 'product',
          where: productWhere,
          include: [{ model: Category, as: 'category' }]
        },
        { model: Warehouse, as: 'warehouse' }
      ],
      order: [[{ model: Product, as: 'product' }, 'name', 'ASC']]
    });

    // Filter low stock if requested
    let filteredStocks = stocks;
    if (lowStock === 'true') {
      filteredStocks = stocks.filter((s: any) => 
        s.quantity <= (s.product?.minStock || 0)
      );
    }

    // Calculate summary
    const totalProducts = filteredStocks.length;
    const totalQuantity = filteredStocks.reduce((sum: number, s: any) => sum + parseFloat(s.quantity || 0), 0);
    const totalValue = filteredStocks.reduce((sum: number, s: any) => 
      sum + (parseFloat(s.quantity || 0) * parseFloat(s.product?.cost || 0)), 0);
    const lowStockCount = filteredStocks.filter((s: any) => 
      s.quantity <= (s.product?.minStock || 0)).length;
    const outOfStockCount = filteredStocks.filter((s: any) => s.quantity <= 0).length;

    // Category breakdown
    const categoryBreakdown: any = {};
    filteredStocks.forEach((s: any) => {
      const catName = s.product?.category?.name || 'Uncategorized';
      if (!categoryBreakdown[catName]) {
        categoryBreakdown[catName] = { category: catName, products: 0, quantity: 0, value: 0 };
      }
      categoryBreakdown[catName].products += 1;
      categoryBreakdown[catName].quantity += parseFloat(s.quantity || 0);
      categoryBreakdown[catName].value += parseFloat(s.quantity || 0) * parseFloat(s.product?.cost || 0);
    });

    // Recent movements (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const movements = await StockMovement.findAll({
      where: {
        createdAt: { [Op.gte]: thirtyDaysAgo }
      },
      include: [{ model: Product, as: 'product' }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    const reportData = {
      summary: {
        totalProducts,
        totalQuantity,
        totalValue,
        lowStockCount,
        outOfStockCount
      },
      categoryBreakdown: Object.values(categoryBreakdown),
      stocks: filteredStocks.map((s: any) => ({
        productId: s.productId,
        productName: s.product?.name,
        sku: s.product?.sku,
        category: s.product?.category?.name,
        warehouse: s.warehouse?.name,
        quantity: s.quantity,
        minStock: s.product?.minStock,
        cost: s.product?.cost,
        value: parseFloat(s.quantity || 0) * parseFloat(s.product?.cost || 0),
        isLowStock: s.quantity <= (s.product?.minStock || 0)
      })),
      recentMovements: movements.slice(0, 20),
      generatedAt: new Date()
    };

    // Handle export formats
    if (format === 'csv') {
      const csvRows = [
        ['Product', 'SKU', 'Category', 'Warehouse', 'Quantity', 'Min Stock', 'Cost', 'Value'],
        ...reportData.stocks.map((s: any) => [
          s.productName, s.sku, s.category, s.warehouse, s.quantity, s.minStock, s.cost, s.value
        ])
      ];
      const csv = csvRows.map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory-report.csv');
      return res.status(200).send(csv);
    }

    return res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error: any) {
    console.error('Inventory Report API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
