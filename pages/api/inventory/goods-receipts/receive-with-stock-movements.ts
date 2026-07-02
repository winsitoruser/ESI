import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';
import { recordStockTransaction } from '@/lib/database/stock-movements-helper';

const GoodsReceipt = require('@/models/GoodsReceipt');
const GoodsReceiptItem = require('@/models/GoodsReceiptItem');
const PurchaseOrder = require('@/models/PurchaseOrder');
const PurchaseOrderItem = require('@/models/PurchaseOrderItem');
const Stock = require('@/models/Stock');
const Product = require('@/models/Product');
const sequelize = require('@/config/database');

function generateGRNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `GR${year}${month}${random}`;
}

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
    const {
      purchaseOrderId,
      items,
      receivedBy,
      invoiceNumber,
      deliveryNote,
      notes
    } = req.body;

    if (!purchaseOrderId || !items || items.length === 0 || !receivedBy) {
      await transaction.rollback();
      await pool.end();
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get purchase order
    const purchaseOrder = await PurchaseOrder.findByPk(purchaseOrderId, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
      transaction
    });

    if (!purchaseOrder) {
      await transaction.rollback();
      await pool.end();
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (purchaseOrder.status !== 'approved' && purchaseOrder.status !== 'ordered') {
      await transaction.rollback();
      await pool.end();
      return res.status(400).json({ error: 'Purchase order must be approved before receiving goods' });
    }

    // Generate GR number
    const grNumber = generateGRNumber();

    // Create goods receipt
    const goodsReceipt = await GoodsReceipt.create({
      grNumber,
      purchaseOrderId,
      receiptDate: new Date(),
      receivedBy,
      status: 'completed',
      invoiceNumber,
      deliveryNote,
      notes
    }, { transaction });

    // Process each item
    for (const item of items) {
      const poItem = purchaseOrder.items.find((pi: any) => pi.id === item.purchaseOrderItemId);
      
      if (!poItem) {
        await transaction.rollback();
        await pool.end();
        return res.status(400).json({ error: `Purchase order item ${item.purchaseOrderItemId} not found` });
      }

      // Create goods receipt item
      await GoodsReceiptItem.create({
        goodsReceiptId: goodsReceipt.id,
        purchaseOrderItemId: item.purchaseOrderItemId,
        productId: poItem.productId,
        orderedQuantity: poItem.quantity,
        receivedQuantity: item.receivedQuantity,
        acceptedQuantity: item.acceptedQuantity || item.receivedQuantity,
        rejectedQuantity: item.rejectedQuantity || 0,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        manufacturingDate: item.manufacturingDate,
        unitCost: poItem.unitPrice,
        totalCost: item.acceptedQuantity * poItem.unitPrice,
        notes: item.notes,
        rejectionReason: item.rejectionReason
      }, { transaction });

      // Update PO item received quantity
      await poItem.update({
        receivedQuantity: parseFloat(poItem.receivedQuantity) + parseFloat(item.acceptedQuantity || item.receivedQuantity)
      }, { transaction });

      // Update stock using old Stock model (for backward compatibility)
      const stock = await Stock.findOne({
        where: { 
          productId: poItem.productId,
          branchId: purchaseOrder.branchId || null
        },
        transaction
      });

      if (stock) {
        const acceptedQty = parseFloat(item.acceptedQuantity || item.receivedQuantity);
        const balanceBefore = parseFloat(stock.quantity);
        const balanceAfter = balanceBefore + acceptedQty;

        // Update stock quantity
        await stock.update({
          quantity: balanceAfter,
          averageCost: ((balanceBefore * parseFloat(stock.averageCost || 0)) + (acceptedQty * poItem.unitPrice)) / balanceAfter,
          lastRestockDate: new Date()
        }, { transaction });
      }

      // ✅ NEW: Record stock movement in new stock_movements table
      try {
        await recordStockTransaction(pool, {
          productId: poItem.productId,
          locationId: purchaseOrder.branchId || 1, // Default to location 1 if no branch
          movementType: 'in',
          quantity: parseFloat(item.acceptedQuantity || item.receivedQuantity),
          referenceType: 'purchase',
          referenceId: purchaseOrder.id,
          referenceNumber: purchaseOrder.poNumber,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          costPrice: poItem.unitPrice,
          notes: `Goods receipt: ${grNumber}`,
          createdBy: receivedBy
        });
      } catch (stockError) {
        console.error('Error recording stock movement:', stockError);
        // Continue even if stock movement fails (for backward compatibility)
      }
    }

    // Update PO status
    const allItemsReceived = purchaseOrder.items.every((item: any) => 
      parseFloat(item.receivedQuantity) >= parseFloat(item.quantity)
    );

    const someItemsReceived = purchaseOrder.items.some((item: any) => 
      parseFloat(item.receivedQuantity) > 0
    );

    await purchaseOrder.update({
      status: allItemsReceived ? 'received' : (someItemsReceived ? 'partial' : purchaseOrder.status),
      actualDeliveryDate: allItemsReceived ? new Date() : purchaseOrder.actualDeliveryDate
    }, { transaction });

    await transaction.commit();
    await pool.end();

    return res.status(201).json({
      message: 'Goods receipt created successfully',
      goodsReceipt
    });
  } catch (error: any) {
    await transaction.rollback();
    await pool.end();
    console.error('Error creating goods receipt:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
