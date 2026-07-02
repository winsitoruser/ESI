import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const StockMovement = require('@/models/StockMovement');
const Stock = require('@/models/Stock');
const Product = require('@/models/Product');
const Employee = require('@/models/Employee');
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
        productId,
        branchId,
        movementType,
        startDate,
        endDate,
        limit = 50,
        offset = 0
      } = req.query;

      const where: any = {};

      if (productId) where.productId = productId;
      if (branchId) where.branchId = branchId;
      if (movementType) where.movementType = movementType;

      if (startDate || endDate) {
        where.movementDate = {};
        if (startDate) where.movementDate[Op.gte] = new Date(startDate as string);
        if (endDate) where.movementDate[Op.lte] = new Date(endDate as string);
      }

      const movements = await StockMovement.findAll({
        where,
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'sku', 'barcode']
          },
          {
            model: Employee,
            as: 'performer',
            required: false,
            attributes: ['id', 'name']
          }
        ],
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        order: [['movementDate', 'DESC']]
      });

      const total = await StockMovement.count({ where });

      return res.status(200).json({
        movements,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error: any) {
      console.error('Error fetching stock movements:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'POST') {
    const transaction = await sequelize.transaction();

    try {
      const {
        productId,
        branchId,
        movementType,
        quantity,
        unitCost,
        referenceType,
        referenceId,
        referenceNumber,
        batchNumber,
        expiryDate,
        notes,
        performedBy
      } = req.body;

      if (!productId || !movementType || !quantity || !referenceType) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get current stock
      const stock = await Stock.findOne({
        where: { productId, branchId: branchId || null },
        transaction
      });

      if (!stock) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Stock record not found. Please create stock record first.' });
      }

      const balanceBefore = parseFloat(stock.quantity);
      const movementQty = parseFloat(quantity);
      
      // Calculate new balance based on movement type
      let balanceAfter = balanceBefore;
      if (['in', 'purchase', 'return'].includes(movementType)) {
        balanceAfter = balanceBefore + Math.abs(movementQty);
      } else if (['out', 'sale', 'damage', 'expired'].includes(movementType)) {
        balanceAfter = balanceBefore - Math.abs(movementQty);
      } else if (movementType === 'adjustment') {
        balanceAfter = balanceBefore + movementQty; // Can be positive or negative
      }

      // Check if sufficient stock for OUT movements
      if (balanceAfter < 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'Insufficient stock',
          available: balanceBefore,
          requested: Math.abs(movementQty)
        });
      }

      // Create stock movement record
      const movement = await StockMovement.create({
        productId,
        branchId,
        movementType,
        quantity: movementQty,
        unitCost,
        totalCost: unitCost ? movementQty * unitCost : null,
        referenceType,
        referenceId,
        referenceNumber,
        batchNumber,
        expiryDate,
        notes,
        performedBy,
        movementDate: new Date(),
        balanceBefore,
        balanceAfter
      }, { transaction });

      // Update stock quantity
      await stock.update({
        quantity: balanceAfter,
        lastRestockDate: ['in', 'purchase'].includes(movementType) ? new Date() : stock.lastRestockDate,
        averageCost: unitCost && ['in', 'purchase'].includes(movementType) 
          ? ((balanceBefore * parseFloat(stock.averageCost || 0)) + (movementQty * unitCost)) / balanceAfter
          : stock.averageCost
      }, { transaction });

      await transaction.commit();

      return res.status(201).json({
        message: 'Stock movement recorded successfully',
        movement,
        newBalance: balanceAfter
      });
    } catch (error: any) {
      await transaction.rollback();
      console.error('Error creating stock movement:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
