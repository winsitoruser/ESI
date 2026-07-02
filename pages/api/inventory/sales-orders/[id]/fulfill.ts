import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { Pool } from 'pg';
import { recordStockTransaction } from '@/lib/database/stock-movements-helper';

const SalesOrder = require('@/models/SalesOrder');
const SalesOrderItem = require('@/models/SalesOrderItem');
const Stock = require('@/models/Stock');
const sequelize = require('@/config/database');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const transaction = await sequelize.transaction();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const { id } = req.query;
    const { fulfilledBy, notes } = req.body;

    if (!id) {
      await transaction.rollback();
      await pool.end();
      return res.status(400).json({ error: 'Sales Order ID is required' });
    }

    const salesOrder = await SalesOrder.findByPk(id, {
      include: [{ model: SalesOrderItem, as: 'items' }],
      transaction
    });

    if (!salesOrder) {
      await transaction.rollback();
      await pool.end();
      return res.status(404).json({ error: 'Sales order not found' });
    }

    if (salesOrder.status !== 'approved' && salesOrder.status !== 'confirmed') {
      await transaction.rollback();
      await pool.end();
      return res.status(400).json({ error: `Cannot fulfill sales order with status: ${salesOrder.status}` });
    }

    // Process each item
    for (const item of salesOrder.items) {
      const stock = await Stock.findOne({
        where: { 
          productId: item.productId,
          branchId: salesOrder.branchId || null
        },
        transaction
      });

      if (!stock) {
        await transaction.rollback();
        await pool.end();
        return res.status(404).json({ 
          error: `Stock record not found for product ${item.productId}` 
        });
      }

      const availableQty = parseFloat(stock.quantity) - parseFloat(stock.reservedQuantity);
      if (availableQty < item.quantity) {
        await transaction.rollback();
        await pool.end();
        return res.status(400).json({ 
          error: `Insufficient stock for product ${item.productId}`,
          available: availableQty,
          required: item.quantity
        });
      }

      // Update stock - deduct quantity and reserved quantity
      await stock.update({
        quantity: parseFloat(stock.quantity) - parseFloat(item.quantity),
        reservedQuantity: parseFloat(stock.reservedQuantity) - parseFloat(item.quantity)
      }, { transaction });

      // Update item shipped quantity
      await item.update({
        shippedQuantity: parseFloat(item.quantity)
      }, { transaction });

      // ✅ Record stock movement in new stock_movements table
      try {
        await recordStockTransaction(pool, {
          productId: item.productId,
          locationId: salesOrder.branchId || 1,
          movementType: 'out',
          quantity: parseFloat(item.quantity),
          referenceType: 'sale',
          referenceId: salesOrder.id,
          referenceNumber: salesOrder.soNumber,
          notes: `Sales order fulfillment: ${salesOrder.soNumber}`,
          createdBy: fulfilledBy || session.user?.email
        });
      } catch (stockError) {
        console.error('Error recording stock movement:', stockError);
        // Continue even if stock movement fails
      }
    }

    // Update sales order status
    await salesOrder.update({
      status: 'fulfilled',
      fulfilledAt: new Date(),
      fulfilledBy,
      notes: notes || salesOrder.notes
    }, { transaction });

    await transaction.commit();
    await pool.end();

    return res.status(200).json({
      message: 'Sales order fulfilled successfully',
      salesOrder
    });
  } catch (error: any) {
    await transaction.rollback();
    await pool.end();
    console.error('Error fulfilling sales order:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
