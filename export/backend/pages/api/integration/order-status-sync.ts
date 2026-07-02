import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

/**
 * Order Status Sync API
 * Synchronizes status updates across Table, POS, and Kitchen
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { kitchenOrderId, status, action } = req.body;
    const tenantId = session.user.tenantId;

    if (!kitchenOrderId || !action) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: kitchenOrderId, action'
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // Get kitchen order with related data
      const [kitchenOrder]: any = await sequelize.query(`
        SELECT 
          ko.*,
          pt.id as pos_transaction_id,
          pt.transaction_number,
          t.id as table_id,
          t.table_number
        FROM kitchen_orders ko
        LEFT JOIN pos_transactions pt ON ko.pos_transaction_id = pt.id
        LEFT JOIN tables t ON pt.table_number = t.table_number AND t.tenant_id = :tenantId
        WHERE ko.id = :kitchenOrderId AND ko.tenant_id = :tenantId
      `, {
        replacements: { kitchenOrderId, tenantId },
        type: QueryTypes.SELECT,
        transaction
      });

      if (!kitchenOrder) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Kitchen order not found'
        });
      }

      const updates: any = {
        kitchen: null,
        pos: null,
        table: null
      };

      // Handle different actions
      switch (action) {
        case 'start_cooking':
          // Update kitchen order to preparing
          await sequelize.query(`
            UPDATE kitchen_orders 
            SET status = 'preparing', 
                started_at = NOW(),
                updated_at = NOW()
            WHERE id = :kitchenOrderId AND tenant_id = :tenantId
          `, {
            replacements: { kitchenOrderId, tenantId },
            transaction
          });
          updates.kitchen = 'preparing';
          break;

        case 'mark_ready':
          // Update kitchen order to ready
          const startTime = new Date(kitchenOrder.started_at).getTime();
          const now = new Date().getTime();
          const prepTime = Math.round((now - startTime) / 1000 / 60);

          await sequelize.query(`
            UPDATE kitchen_orders 
            SET status = 'ready', 
                completed_at = NOW(),
                actual_prep_time = :prepTime,
                updated_at = NOW()
            WHERE id = :kitchenOrderId AND tenant_id = :tenantId
          `, {
            replacements: { kitchenOrderId, tenantId, prepTime },
            transaction
          });

          // Update all order items to ready
          await sequelize.query(`
            UPDATE kitchen_order_items 
            SET status = 'ready', updated_at = NOW()
            WHERE kitchen_order_id = :kitchenOrderId
          `, {
            replacements: { kitchenOrderId },
            transaction
          });

          updates.kitchen = 'ready';
          break;

        case 'serve_order':
          // Update kitchen order to served
          await sequelize.query(`
            UPDATE kitchen_orders 
            SET status = 'served', 
                served_at = NOW(),
                updated_at = NOW()
            WHERE id = :kitchenOrderId AND tenant_id = :tenantId
          `, {
            replacements: { kitchenOrderId, tenantId },
            transaction
          });

          // Update POS transaction status to completed
          if (kitchenOrder.pos_transaction_id) {
            await sequelize.query(`
              UPDATE pos_transactions 
              SET status = 'completed',
                  updated_at = NOW()
              WHERE id = :posTransactionId AND tenant_id = :tenantId
            `, {
              replacements: { 
                posTransactionId: kitchenOrder.pos_transaction_id, 
                tenantId 
              },
              transaction
            });
            updates.pos = 'completed';
          }

          updates.kitchen = 'served';
          break;

        case 'complete_payment':
          // Update POS transaction payment status
          if (kitchenOrder.pos_transaction_id) {
            await sequelize.query(`
              UPDATE pos_transactions 
              SET payment_status = 'paid',
                  status = 'completed',
                  updated_at = NOW()
              WHERE id = :posTransactionId AND tenant_id = :tenantId
            `, {
              replacements: { 
                posTransactionId: kitchenOrder.pos_transaction_id, 
                tenantId 
              },
              transaction
            });
            updates.pos = 'paid';
          }

          // Update table to available if exists
          if (kitchenOrder.table_id) {
            await sequelize.query(`
              UPDATE tables 
              SET status = 'available',
                  current_reservation_id = NULL,
                  current_guest_count = 0,
                  updated_at = NOW()
              WHERE id = :tableId AND tenant_id = :tenantId
            `, {
              replacements: { tableId: kitchenOrder.table_id, tenantId },
              transaction
            });
            updates.table = 'available';
          }
          break;

        case 'cancel_order':
          // Cancel kitchen order
          await sequelize.query(`
            UPDATE kitchen_orders 
            SET status = 'cancelled',
                updated_at = NOW()
            WHERE id = :kitchenOrderId AND tenant_id = :tenantId
          `, {
            replacements: { kitchenOrderId, tenantId },
            transaction
          });

          // Cancel POS transaction
          if (kitchenOrder.pos_transaction_id) {
            await sequelize.query(`
              UPDATE pos_transactions 
              SET status = 'cancelled',
                  updated_at = NOW()
              WHERE id = :posTransactionId AND tenant_id = :tenantId
            `, {
              replacements: { 
                posTransactionId: kitchenOrder.pos_transaction_id, 
                tenantId 
              },
              transaction
            });
            updates.pos = 'cancelled';
          }

          // Free up table if exists
          if (kitchenOrder.table_id) {
            await sequelize.query(`
              UPDATE tables 
              SET status = 'available',
                  current_reservation_id = NULL,
                  current_guest_count = 0,
                  updated_at = NOW()
              WHERE id = :tableId AND tenant_id = :tenantId
            `, {
              replacements: { tableId: kitchenOrder.table_id, tenantId },
              transaction
            });
            updates.table = 'available';
          }

          updates.kitchen = 'cancelled';
          break;

        default:
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Invalid action'
          });
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Order status synchronized successfully',
        data: {
          action,
          updates,
          kitchenOrderId,
          posTransactionId: kitchenOrder.pos_transaction_id,
          tableId: kitchenOrder.table_id,
          tableNumber: kitchenOrder.table_number
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error: any) {
    console.error('Error in order status sync:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
