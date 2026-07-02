import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

/**
 * Integration API: Convert POS Transaction to Kitchen Order
 * Automatically creates kitchen order when POS transaction is created
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { posTransactionId } = req.body;
    const tenantId = session.user.tenantId;

    if (!posTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: posTransactionId'
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Get POS transaction details
      const [posTransaction]: any = await sequelize.query(`
        SELECT * FROM pos_transactions 
        WHERE id = :posTransactionId AND tenant_id = :tenantId
      `, {
        replacements: { posTransactionId, tenantId },
        type: QueryTypes.SELECT,
        transaction
      });

      if (!posTransaction) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'POS Transaction not found'
        });
      }

      // 2. Check if kitchen order already exists
      const [existingOrder]: any = await sequelize.query(`
        SELECT id FROM kitchen_orders 
        WHERE pos_transaction_id = :posTransactionId AND tenant_id = :tenantId
      `, {
        replacements: { posTransactionId, tenantId },
        type: QueryTypes.SELECT,
        transaction
      });

      if (existingOrder) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Kitchen order already exists for this transaction',
          data: { kitchenOrderId: existingOrder.id }
        });
      }

      // 3. Get transaction items
      const items = await sequelize.query(`
        SELECT 
          pti.*,
          p.name as product_name,
          p.category
        FROM pos_transaction_items pti
        LEFT JOIN products p ON pti.product_id = p.id
        WHERE pti.transaction_id = :posTransactionId
      `, {
        replacements: { posTransactionId },
        type: QueryTypes.SELECT,
        transaction
      });

      if (items.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No items found in transaction'
        });
      }

      // 4. Determine order type and priority
      const orderType = posTransaction.table_number ? 'dine-in' : 
                       posTransaction.delivery_address ? 'delivery' : 'takeaway';
      
      // Set priority based on order type or special conditions
      let priority = 'normal';
      if (orderType === 'delivery') {
        priority = 'urgent';
      }

      // 5. Create kitchen order
      const orderNumber = `KO-${Date.now()}`;
      const estimatedTime = items.length * 5; // 5 minutes per item

      await sequelize.query(`
        INSERT INTO kitchen_orders (
          id, tenant_id, order_number, pos_transaction_id, table_number,
          order_type, customer_name, status, priority, received_at,
          estimated_time, total_amount, notes, created_at, updated_at
        ) VALUES (
          UUID(), :tenantId, :orderNumber, :posTransactionId, :tableNumber,
          :orderType, :customerName, 'new', :priority, NOW(),
          :estimatedTime, :totalAmount, :notes, NOW(), NOW()
        )
      `, {
        replacements: {
          tenantId,
          orderNumber,
          posTransactionId,
          tableNumber: posTransaction.table_number || null,
          orderType,
          customerName: posTransaction.customer_name || 'Guest',
          priority,
          estimatedTime,
          totalAmount: posTransaction.total_amount,
          notes: posTransaction.notes || null
        },
        transaction
      });

      // Get created kitchen order ID
      const [kitchenOrder]: any = await sequelize.query(`
        SELECT id FROM kitchen_orders 
        WHERE order_number = :orderNumber AND tenant_id = :tenantId
      `, {
        replacements: { orderNumber, tenantId },
        type: QueryTypes.SELECT,
        transaction
      });

      // 6. Create kitchen order items
      for (const item of items as any[]) {
        await sequelize.query(`
          INSERT INTO kitchen_order_items (
            id, kitchen_order_id, product_id, name, quantity,
            notes, status, created_at, updated_at
          ) VALUES (
            UUID(), :kitchenOrderId, :productId, :name, :quantity,
            :notes, 'pending', NOW(), NOW()
          )
        `, {
          replacements: {
            kitchenOrderId: kitchenOrder.id,
            productId: item.product_id,
            name: item.product_name || item.name,
            quantity: item.quantity,
            notes: item.notes || null
          },
          transaction
        });
      }

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: 'Kitchen order created successfully from POS transaction',
        data: {
          kitchenOrderId: kitchenOrder.id,
          orderNumber,
          posTransactionId,
          orderType,
          priority,
          estimatedTime,
          itemsCount: items.length
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error: any) {
    console.error('Error in pos-to-kitchen integration:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
