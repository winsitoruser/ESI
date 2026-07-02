import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import db from '../../../../models';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'POST') {
      const {
        transactionId,
        tableNumber,
        orderType,
        customerName,
        items
      } = req.body;

      const tenantId = session.user?.tenantId;

      // Start transaction
      const t = await db.sequelize.transaction();

      try {
        // Get POS transaction details
        const posTransaction = await db.POSTransaction.findByPk(transactionId, {
          include: [db.POSTransactionItem],
          transaction: t
        });

        if (!posTransaction) {
          await t.rollback();
          return res.status(404).json({ error: 'POS transaction not found' });
        }

        // Generate kitchen order number
        const orderNumber = `KIT-${Date.now()}`;

        // Create kitchen order
        const kitchenOrder = await db.KitchenOrder.create({
          tenantId,
          orderNumber,
          posTransactionId: transactionId,
          tableNumber,
          orderType,
          customerName,
          status: 'new',
          priority: 'normal',
          totalAmount: posTransaction.totalAmount,
          receivedAt: new Date(),
          estimatedTime: calculateEstimatedTime(items)
        }, { transaction: t });

        // Create kitchen order items
        for (const item of items) {
          await db.KitchenOrderItem.create({
            kitchenOrderId: kitchenOrder.id,
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            notes: item.notes,
            modifiers: item.modifiers || []
          }, { transaction: t });
        }

        // Update table status if dine-in
        if (orderType === 'dine-in' && tableNumber) {
          const table = await db.Table.findOne({
            where: { tableNumber, tenantId },
            transaction: t
          });
          
          if (table) {
            await table.update({ status: 'occupied' }, { transaction: t });
          }
        }

        await t.commit();

        // Fetch complete order
        const completeOrder = await db.KitchenOrder.findByPk(kitchenOrder.id, {
          include: [
            {
              model: db.KitchenOrderItem,
              as: 'items'
            }
          ]
        });

        return res.status(201).json({
          success: true,
          data: completeOrder
        });

      } catch (error) {
        await t.rollback();
        throw error;
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Create kitchen order API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to calculate estimated time
function calculateEstimatedTime(items: any[]): number {
  if (!items || items.length === 0) return 15;
  
  // Base time per item type (in minutes)
  const baseTimes: Record<string, number> = {
    'appetizer': 5,
    'main': 15,
    'dessert': 8,
    'beverage': 3,
    'default': 10
  };

  // Calculate total time
  let totalTime = 0;
  items.forEach(item => {
    const category = item.category || 'default';
    const itemTime = baseTimes[category] || baseTimes.default;
    totalTime += itemTime;
  });

  // Parallel preparation - divide by 2 for multiple items
  return Math.ceil(totalTime / 2) || 15;
}
