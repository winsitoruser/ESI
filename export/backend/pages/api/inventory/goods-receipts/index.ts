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
const StockMovement = require('@/models/StockMovement');
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

  if (req.method === 'GET') {
    try {
      const { purchaseOrderId, limit = 50, offset = 0 } = req.query;

      const where: any = {};
      if (purchaseOrderId) where.purchaseOrderId = purchaseOrderId;

      const receipts = await GoodsReceipt.findAll({
        where,
        include: [
          {
            model: PurchaseOrder,
            as: 'purchaseOrder',
            attributes: ['id', 'poNumber', 'supplierId']
          },
          {
            model: GoodsReceiptItem,
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
        order: [['receiptDate', 'DESC']]
      });

      const total = await GoodsReceipt.count({ where });

      return res.status(200).json({
        receipts,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error: any) {
      console.error('Error fetching goods receipts:', error);
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
        purchaseOrderId,
        items,
        receivedBy,
        invoiceNumber,
        deliveryNote,
        notes
      } = req.body;

      if (!purchaseOrderId || !items || items.length === 0 || !receivedBy) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get purchase order
      const purchaseOrder = await PurchaseOrder.findByPk(purchaseOrderId, {
        include: [{ model: PurchaseOrderItem, as: 'items' }],
        transaction
      });

      if (!purchaseOrder) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      if (purchaseOrder.status !== 'approved' && purchaseOrder.status !== 'ordered') {
        await transaction.rollback();
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

        // Update stock
        const stock = await Stock.findOne({
          where: { 
            productId: poItem.productId,
            branchId: purchaseOrder.branchId || null
          },
          transaction
        });

        if (!stock) {
          await transaction.rollback();
          return res.status(404).json({ error: `Stock record not found for product ${poItem.productId}` });
        }

        const balanceBefore = parseFloat(stock.quantity);
        const acceptedQty = parseFloat(item.acceptedQuantity || item.receivedQuantity);
        const balanceAfter = balanceBefore + acceptedQty;

        // Create stock movement
        await StockMovement.create({
          productId: poItem.productId,
          branchId: purchaseOrder.branchId,
          movementType: 'purchase',
          quantity: acceptedQty,
          unitCost: poItem.unitPrice,
          totalCost: acceptedQty * poItem.unitPrice,
          referenceType: 'purchase_order',
          referenceId: purchaseOrder.id,
          referenceNumber: purchaseOrder.poNumber,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          notes: `Goods receipt: ${grNumber}`,
          performedBy: receivedBy,
          movementDate: new Date(),
          balanceBefore,
          balanceAfter
        }, { transaction });

        // Update stock quantity and average cost
        const newAverageCost = ((balanceBefore * parseFloat(stock.averageCost || 0)) + (acceptedQty * poItem.unitPrice)) / balanceAfter;

        await stock.update({
          quantity: balanceAfter,
          averageCost: newAverageCost,
          lastRestockDate: new Date()
        }, { transaction });

        // ✅ NEW: Record stock movement in new stock_movements table
        try {
          await recordStockTransaction(pool, {
            productId: poItem.productId,
            locationId: purchaseOrder.branchId || 1,
            movementType: 'in',
            quantity: acceptedQty,
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
          // Continue even if stock movement fails
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

  return res.status(405).json({ error: 'Method not allowed' });
}
