import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';
import { recordStockTransaction } from '@/lib/database/stock-movements-helper';

const StockAdjustment = require('@/models/StockAdjustment');
const StockAdjustmentItem = require('@/models/StockAdjustmentItem');
const Stock = require('@/models/Stock');
const StockMovement = require('@/models/StockMovement');
const Product = require('@/models/Product');
const sequelize = require('@/config/database');

function generateAdjustmentNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ADJ${year}${month}${random}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { branchId, status, limit = 50, offset = 0 } = req.query;

      const where: any = {};
      if (branchId) where.branchId = branchId;
      if (status) where.status = status;

      const adjustments = await StockAdjustment.findAll({
        where,
        include: [
          {
            model: StockAdjustmentItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'sku']
              }
            ]
          }
        ],
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        order: [['adjustmentDate', 'DESC']]
      });

      const total = await StockAdjustment.count({ where });

      return res.status(200).json({
        adjustments,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error: any) {
      console.error('Error fetching stock adjustments:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'POST') {
    const transaction = await sequelize.transaction();
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      const {
        branchId,
        adjustmentType,
        items,
        reason,
        notes,
        createdBy,
        autoApprove
      } = req.body;

      if (!adjustmentType || !items || items.length === 0 || !createdBy) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const adjustmentNumber = generateAdjustmentNumber();

      // Create adjustment
      const adjustment = await StockAdjustment.create({
        adjustmentNumber,
        branchId,
        adjustmentDate: new Date(),
        adjustmentType,
        status: autoApprove ? 'approved' : 'draft',
        reason,
        notes,
        createdBy,
        approvedBy: autoApprove ? createdBy : null,
        approvedAt: autoApprove ? new Date() : null
      }, { transaction });

      // Process items
      for (const item of items) {
        const stock = await Stock.findOne({
          where: { 
            productId: item.productId,
            branchId: branchId || null
          },
          transaction
        });

        if (!stock) {
          await transaction.rollback();
          return res.status(404).json({ 
            error: `Stock record not found for product ${item.productId}` 
          });
        }

        // Create adjustment item
        await StockAdjustmentItem.create({
          stockAdjustmentId: adjustment.id,
          productId: item.productId,
          systemQuantity: stock.quantity,
          physicalQuantity: item.physicalQuantity,
          unitCost: stock.averageCost,
          totalCost: (item.physicalQuantity - stock.quantity) * stock.averageCost,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          notes: item.notes
        }, { transaction });

        // If auto-approve, update stock immediately
        if (autoApprove) {
          const adjustmentQty = item.physicalQuantity - stock.quantity;
          const balanceBefore = parseFloat(stock.quantity);
          const balanceAfter = parseFloat(item.physicalQuantity);

          // Create stock movement
          await StockMovement.create({
            productId: item.productId,
            branchId,
            movementType: 'adjustment',
            quantity: adjustmentQty,
            unitCost: stock.averageCost,
            totalCost: adjustmentQty * stock.averageCost,
            referenceType: 'stock_adjustment',
            referenceId: adjustment.id,
            referenceNumber: adjustmentNumber,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            notes: `Stock adjustment: ${adjustmentType}`,
            performedBy: createdBy,
            approvedBy: createdBy,
            movementDate: new Date(),
            balanceBefore,
            balanceAfter
          }, { transaction });

          // Update stock
          await stock.update({
            quantity: balanceAfter,
            lastStockCount: new Date()
          }, { transaction });

          // ✅ NEW: Record stock movement in new stock_movements table
          try {
            await recordStockTransaction(pool, {
              productId: item.productId,
              locationId: branchId || 1,
              movementType: 'adjustment',
              quantity: Math.abs(adjustmentQty),
              referenceType: 'adjustment',
              referenceId: adjustment.id,
              referenceNumber: adjustmentNumber,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              notes: `Stock adjustment: ${adjustmentType} - ${reason || 'No reason provided'}`,
              createdBy
            });
          } catch (stockError) {
            console.error('Error recording stock movement:', stockError);
            // Continue even if stock movement fails
          }
        }
      }

      await transaction.commit();
      await pool.end();

      return res.status(201).json({
        message: 'Stock adjustment created successfully',
        adjustment
      });
    } catch (error: any) {
      await transaction.rollback();
      await pool.end();
      console.error('Error creating stock adjustment:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
