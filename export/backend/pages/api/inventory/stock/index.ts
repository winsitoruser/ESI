import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const Stock = require('@/models/Stock');
const Product = require('@/models/Product');
const sequelize = require('@/config/database');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { 
        branchId, 
        productId, 
        lowStock, 
        search,
        limit = 50,
        offset = 0 
      } = req.query;

      const where: any = {};
      
      if (branchId) where.branchId = branchId;
      if (productId) where.productId = productId;
      
      // Filter for low stock items
      if (lowStock === 'true') {
        where.quantity = {
          [Op.lte]: sequelize.col('minimumStock')
        };
      }

      const include: any[] = [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku', 'barcode', 'unit', 'price']
        }
      ];

      // Search by product name or SKU
      if (search) {
        include[0].where = {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { sku: { [Op.like]: `%${search}%` } },
            { barcode: { [Op.like]: `%${search}%` } }
          ]
        };
      }

      const stocks = await Stock.findAll({
        where,
        include,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        order: [['updatedAt', 'DESC']]
      });

      const total = await Stock.count({ where, include });

      // Calculate summary statistics
      const summary = await Stock.findOne({
        attributes: [
          [Stock.sequelize.fn('COUNT', Stock.sequelize.col('id')), 'totalProducts'],
          [Stock.sequelize.fn('SUM', Stock.sequelize.col('quantity')), 'totalQuantity'],
          [Stock.sequelize.fn('SUM', Stock.sequelize.literal('quantity * averageCost')), 'totalValue'],
          [Stock.sequelize.fn('COUNT', Stock.sequelize.literal('CASE WHEN quantity <= minimumStock THEN 1 END')), 'lowStockCount']
        ],
        where,
        raw: true
      });

      return res.status(200).json({
        stocks,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        summary: {
          totalProducts: parseInt(summary?.totalProducts || '0'),
          totalQuantity: parseFloat(summary?.totalQuantity || '0'),
          totalValue: parseFloat(summary?.totalValue || '0'),
          lowStockCount: parseInt(summary?.lowStockCount || '0')
        }
      });
    } catch (error: any) {
      console.error('Error fetching stock:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        productId,
        branchId,
        warehouseLocation,
        quantity,
        minimumStock,
        maximumStock,
        reorderPoint,
        reorderQuantity,
        averageCost
      } = req.body;

      if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      // Check if stock already exists for this product and branch
      const existingStock = await Stock.findOne({
        where: { productId, branchId: branchId || null }
      });

      if (existingStock) {
        return res.status(400).json({ error: 'Stock record already exists for this product and branch' });
      }

      const stock = await Stock.create({
        productId,
        branchId,
        warehouseLocation,
        quantity: quantity || 0,
        reservedQuantity: 0,
        minimumStock: minimumStock || 0,
        maximumStock,
        reorderPoint,
        reorderQuantity,
        averageCost,
        lastRestockDate: quantity > 0 ? new Date() : null
      });

      return res.status(201).json({
        message: 'Stock record created successfully',
        stock
      });
    } catch (error: any) {
      console.error('Error creating stock:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Stock ID is required' });
      }

      const stock = await Stock.findByPk(id);

      if (!stock) {
        return res.status(404).json({ error: 'Stock record not found' });
      }

      await stock.update(updateData);

      return res.status(200).json({
        message: 'Stock record updated successfully',
        stock
      });
    } catch (error: any) {
      console.error('Error updating stock:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
