import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

/**
 * Unified Order Flow API
 * Creates complete order flow: Table → POS → Kitchen in one call
 * Use case: Walk-in customers or direct table orders
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

    const {
      tableId,
      customerName,
      customerPhone,
      guestCount,
      items,
      orderType = 'dine-in',
      priority = 'normal',
      notes
    } = req.body;

    const tenantId = session.user.tenantId;
    const userId = session.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items are required'
      });
    }

    const transaction = await sequelize.transaction();

    try {
      let tableNumber = null;

      // 1. Handle table assignment if tableId provided
      if (tableId) {
        const [table]: any = await sequelize.query(`
          SELECT * FROM tables 
          WHERE id = :tableId AND tenant_id = :tenantId
        `, {
          replacements: { tableId, tenantId },
          type: QueryTypes.SELECT,
          transaction
        });

        if (!table) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: 'Table not found'
          });
        }

        if (table.status !== 'available') {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Table is not available'
          });
        }

        tableNumber = table.table_number;

        // Update table status
        await sequelize.query(`
          UPDATE tables 
          SET status = 'occupied',
              current_guest_count = :guestCount,
              updated_at = NOW()
          WHERE id = :tableId AND tenant_id = :tenantId
        `, {
          replacements: { tableId, guestCount: guestCount || 1, tenantId },
          transaction
        });
      }

      // 2. Calculate total amount
      const totalAmount = items.reduce((sum: number, item: any) => {
        return sum + (item.price * item.quantity);
      }, 0);

      // 3. Create POS Transaction
      const transactionNumber = `TRX-${Date.now()}`;

      await sequelize.query(`
        INSERT INTO pos_transactions (
          id, tenant_id, transaction_number, customer_name, customer_phone,
          table_number, total_amount, payment_status, transaction_date,
          status, notes, created_by, created_at, updated_at
        ) VALUES (
          UUID(), :tenantId, :transactionNumber, :customerName, :customerPhone,
          :tableNumber, :totalAmount, 'pending', NOW(),
          'pending', :notes, :userId, NOW(), NOW()
        )
      `, {
        replacements: {
          tenantId,
          transactionNumber,
          customerName: customerName || 'Guest',
          customerPhone: customerPhone || null,
          tableNumber,
          totalAmount,
          notes: notes || null,
          userId
        },
        transaction
      });

      // Get POS transaction ID
      const [posTransaction]: any = await sequelize.query(`
        SELECT id FROM pos_transactions 
        WHERE transaction_number = :transactionNumber AND tenant_id = :tenantId
      `, {
        replacements: { transactionNumber, tenantId },
        type: QueryTypes.SELECT,
        transaction
      });

      const posTransactionId = posTransaction.id;

      // 4. Create POS transaction items
      for (const item of items) {
        await sequelize.query(`
          INSERT INTO pos_transaction_items (
            id, transaction_id, product_id, product_name, quantity,
            unit_price, subtotal, notes, created_at, updated_at
          ) VALUES (
            UUID(), :transactionId, :productId, :productName, :quantity,
            :unitPrice, :subtotal, :notes, NOW(), NOW()
          )
        `, {
          replacements: {
            transactionId: posTransactionId,
            productId: item.productId,
            productName: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: item.price * item.quantity,
            notes: item.notes || null
          },
          transaction
        });
      }

      // 5. Create Kitchen Order
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
          tableNumber,
          orderType,
          customerName: customerName || 'Guest',
          priority,
          estimatedTime,
          totalAmount,
          notes: notes || null
        },
        transaction
      });

      // Get kitchen order ID
      const [kitchenOrder]: any = await sequelize.query(`
        SELECT id FROM kitchen_orders 
        WHERE order_number = :orderNumber AND tenant_id = :tenantId
      `, {
        replacements: { orderNumber, tenantId },
        type: QueryTypes.SELECT,
        transaction
      });

      const kitchenOrderId = kitchenOrder.id;

      // 6. Create kitchen order items
      for (const item of items) {
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
            kitchenOrderId,
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            notes: item.notes || null
          },
          transaction
        });
      }

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: 'Unified order created successfully',
        data: {
          tableId,
          tableNumber,
          posTransactionId,
          transactionNumber,
          kitchenOrderId,
          orderNumber,
          totalAmount,
          estimatedTime,
          itemsCount: items.length,
          flow: {
            table: tableId ? 'assigned' : 'not_applicable',
            pos: 'created',
            kitchen: 'created'
          }
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error: any) {
    console.error('Error in unified order flow:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
