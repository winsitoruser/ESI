import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

/**
 * Integration API: Convert Reservation to Table Assignment and Kitchen Order
 * Flow: Reservation → Table Assignment → POS Transaction → Kitchen Order
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

    const { reservationId, tableId, items } = req.body;
    const tenantId = session.user.tenantId;
    const userId = session.user.id;

    if (!reservationId || !tableId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: reservationId, tableId'
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Get reservation details
      const [reservation]: any = await sequelize.query(`
        SELECT * FROM reservations 
        WHERE id = :reservationId AND tenant_id = :tenantId
      `, {
        replacements: { reservationId, tenantId },
        type: QueryTypes.SELECT,
        transaction
      });

      if (!reservation) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Reservation not found'
        });
      }

      // 2. Check table availability
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

      // 3. Update reservation status and assign table
      await sequelize.query(`
        UPDATE reservations 
        SET status = 'seated', 
            table_id = :tableId,
            updated_at = NOW()
        WHERE id = :reservationId AND tenant_id = :tenantId
      `, {
        replacements: { reservationId, tableId, tenantId },
        transaction
      });

      // 4. Update table status to occupied
      await sequelize.query(`
        UPDATE tables 
        SET status = 'occupied',
            current_reservation_id = :reservationId,
            updated_at = NOW()
        WHERE id = :tableId AND tenant_id = :tenantId
      `, {
        replacements: { tableId, reservationId, tenantId },
        transaction
      });

      // 5. Create POS transaction if items provided
      let posTransactionId = null;
      let kitchenOrderId = null;

      if (items && items.length > 0) {
        // Generate transaction number
        const transactionNumber = `TRX-${Date.now()}`;
        
        // Calculate total
        const totalAmount = items.reduce((sum: number, item: any) => {
          return sum + (item.price * item.quantity);
        }, 0);

        // Create POS transaction
        await sequelize.query(`
          INSERT INTO pos_transactions (
            id, tenant_id, transaction_number, customer_name, table_number,
            total_amount, payment_status, transaction_date, status,
            created_by, created_at, updated_at
          ) VALUES (
            UUID(), :tenantId, :transactionNumber, :customerName, :tableNumber,
            :totalAmount, 'pending', NOW(), 'pending',
            :userId, NOW(), NOW()
          )
        `, {
          replacements: {
            tenantId,
            transactionNumber,
            customerName: reservation.customer_name,
            tableNumber: table.table_number,
            totalAmount,
            userId
          },
          transaction
        });

        // Get created transaction ID
        const [posTransaction]: any = await sequelize.query(`
          SELECT id FROM pos_transactions 
          WHERE transaction_number = :transactionNumber AND tenant_id = :tenantId
        `, {
          replacements: { transactionNumber, tenantId },
          type: QueryTypes.SELECT,
          transaction
        });

        posTransactionId = posTransaction.id;

        // Create transaction items
        for (const item of items) {
          await sequelize.query(`
            INSERT INTO pos_transaction_items (
              id, transaction_id, product_id, product_name, quantity,
              unit_price, subtotal, created_at, updated_at
            ) VALUES (
              UUID(), :transactionId, :productId, :productName, :quantity,
              :unitPrice, :subtotal, NOW(), NOW()
            )
          `, {
            replacements: {
              transactionId: posTransactionId,
              productId: item.productId,
              productName: item.name,
              quantity: item.quantity,
              unitPrice: item.price,
              subtotal: item.price * item.quantity
            },
            transaction
          });
        }

        // 6. Create Kitchen Order
        const orderNumber = `ORD-${Date.now()}`;

        await sequelize.query(`
          INSERT INTO kitchen_orders (
            id, tenant_id, order_number, pos_transaction_id, table_number,
            order_type, customer_name, status, priority, received_at,
            estimated_time, total_amount, created_at, updated_at
          ) VALUES (
            UUID(), :tenantId, :orderNumber, :posTransactionId, :tableNumber,
            'dine-in', :customerName, 'new', 'normal', NOW(),
            15, :totalAmount, NOW(), NOW()
          )
        `, {
          replacements: {
            tenantId,
            orderNumber,
            posTransactionId,
            tableNumber: table.table_number,
            customerName: reservation.customer_name,
            totalAmount
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

        kitchenOrderId = kitchenOrder.id;

        // Create kitchen order items
        for (const item of items) {
          await sequelize.query(`
            INSERT INTO kitchen_order_items (
              id, kitchen_order_id, product_id, name, quantity,
              status, created_at, updated_at
            ) VALUES (
              UUID(), :kitchenOrderId, :productId, :name, :quantity,
              'pending', NOW(), NOW()
            )
          `, {
            replacements: {
              kitchenOrderId,
              productId: item.productId,
              name: item.name,
              quantity: item.quantity
            },
            transaction
          });
        }
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Reservation successfully converted to order',
        data: {
          reservationId,
          tableId,
          tableNumber: table.table_number,
          posTransactionId,
          kitchenOrderId,
          status: 'seated'
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error: any) {
    console.error('Error in reservation-to-order integration:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
