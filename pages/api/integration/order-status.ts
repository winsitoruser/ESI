import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

/**
 * Get Complete Order Status
 * Returns integrated status across Table, Reservation, POS, and Kitchen
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { orderId, type = 'kitchen' } = req.query;
    const tenantId = session.user.tenantId;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: orderId'
      });
    }

    let query = '';
    let replacements: any = { orderId, tenantId };

    // Build query based on type
    if (type === 'kitchen') {
      query = `
        SELECT 
          ko.id as kitchen_order_id,
          ko.order_number as kitchen_order_number,
          ko.status as kitchen_status,
          ko.priority,
          ko.received_at,
          ko.started_at,
          ko.completed_at,
          ko.served_at,
          ko.estimated_time,
          ko.actual_prep_time,
          ko.order_type,
          ko.customer_name,
          ko.table_number,
          ko.notes as kitchen_notes,
          
          pt.id as pos_transaction_id,
          pt.transaction_number,
          pt.status as pos_status,
          pt.payment_status,
          pt.total_amount,
          pt.transaction_date,
          
          t.id as table_id,
          t.table_number as table_name,
          t.status as table_status,
          t.capacity,
          t.current_guest_count,
          
          r.id as reservation_id,
          r.reservation_number,
          r.status as reservation_status,
          r.guest_count,
          r.reservation_date,
          r.reservation_time,
          
          ks.id as chef_id,
          ks.name as chef_name,
          ks.role as chef_role
          
        FROM kitchen_orders ko
        LEFT JOIN pos_transactions pt ON ko.pos_transaction_id = pt.id
        LEFT JOIN tables t ON ko.table_number = t.table_number AND t.tenant_id = :tenantId
        LEFT JOIN reservations r ON t.current_reservation_id = r.id
        LEFT JOIN kitchen_staff ks ON ko.assigned_chef_id = ks.id
        WHERE ko.id = :orderId AND ko.tenant_id = :tenantId
      `;
    } else if (type === 'pos') {
      query = `
        SELECT 
          pt.id as pos_transaction_id,
          pt.transaction_number,
          pt.status as pos_status,
          pt.payment_status,
          pt.total_amount,
          pt.transaction_date,
          pt.customer_name,
          pt.table_number,
          
          ko.id as kitchen_order_id,
          ko.order_number as kitchen_order_number,
          ko.status as kitchen_status,
          ko.priority,
          ko.received_at,
          ko.started_at,
          ko.completed_at,
          ko.served_at,
          
          t.id as table_id,
          t.table_number as table_name,
          t.status as table_status,
          t.capacity,
          
          r.id as reservation_id,
          r.reservation_number,
          r.status as reservation_status
          
        FROM pos_transactions pt
        LEFT JOIN kitchen_orders ko ON pt.id = ko.pos_transaction_id
        LEFT JOIN tables t ON pt.table_number = t.table_number AND t.tenant_id = :tenantId
        LEFT JOIN reservations r ON t.current_reservation_id = r.id
        WHERE pt.id = :orderId AND pt.tenant_id = :tenantId
      `;
    } else if (type === 'table') {
      query = `
        SELECT 
          t.id as table_id,
          t.table_number as table_name,
          t.status as table_status,
          t.capacity,
          t.current_guest_count,
          t.location,
          
          r.id as reservation_id,
          r.reservation_number,
          r.status as reservation_status,
          r.customer_name,
          r.guest_count,
          r.reservation_date,
          r.reservation_time,
          
          pt.id as pos_transaction_id,
          pt.transaction_number,
          pt.status as pos_status,
          pt.payment_status,
          pt.total_amount,
          
          ko.id as kitchen_order_id,
          ko.order_number as kitchen_order_number,
          ko.status as kitchen_status,
          ko.priority
          
        FROM tables t
        LEFT JOIN reservations r ON t.current_reservation_id = r.id
        LEFT JOIN pos_transactions pt ON t.table_number = pt.table_number AND pt.tenant_id = :tenantId AND pt.status != 'completed'
        LEFT JOIN kitchen_orders ko ON pt.id = ko.pos_transaction_id
        WHERE t.id = :orderId AND t.tenant_id = :tenantId
      `;
    } else if (type === 'reservation') {
      query = `
        SELECT 
          r.id as reservation_id,
          r.reservation_number,
          r.status as reservation_status,
          r.customer_name,
          r.customer_phone,
          r.guest_count,
          r.reservation_date,
          r.reservation_time,
          r.special_requests,
          
          t.id as table_id,
          t.table_number as table_name,
          t.status as table_status,
          t.capacity,
          
          pt.id as pos_transaction_id,
          pt.transaction_number,
          pt.status as pos_status,
          pt.payment_status,
          pt.total_amount,
          
          ko.id as kitchen_order_id,
          ko.order_number as kitchen_order_number,
          ko.status as kitchen_status,
          ko.priority
          
        FROM reservations r
        LEFT JOIN tables t ON r.table_id = t.id
        LEFT JOIN pos_transactions pt ON t.table_number = pt.table_number AND pt.tenant_id = :tenantId AND pt.status != 'completed'
        LEFT JOIN kitchen_orders ko ON pt.id = ko.pos_transaction_id
        WHERE r.id = :orderId AND r.tenant_id = :tenantId
      `;
    }

    const [orderStatus]: any = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    if (!orderStatus) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get items if kitchen order exists
    let items: any[] = [];
    if (orderStatus.kitchen_order_id) {
      items = await sequelize.query(`
        SELECT 
          koi.id,
          koi.name,
          koi.quantity,
          koi.notes,
          koi.modifiers,
          koi.status,
          ks.name as prepared_by_name
        FROM kitchen_order_items koi
        LEFT JOIN kitchen_staff ks ON koi.prepared_by = ks.id
        WHERE koi.kitchen_order_id = :kitchenOrderId
        ORDER BY koi.created_at ASC
      `, {
        replacements: { kitchenOrderId: orderStatus.kitchen_order_id },
        type: QueryTypes.SELECT
      });
    }

    // Calculate timeline
    const timeline = [];
    
    if (orderStatus.reservation_id) {
      timeline.push({
        event: 'Reservation Created',
        timestamp: orderStatus.reservation_date,
        status: orderStatus.reservation_status
      });
    }
    
    if (orderStatus.table_id && orderStatus.table_status === 'occupied') {
      timeline.push({
        event: 'Table Assigned',
        timestamp: orderStatus.received_at || new Date(),
        status: 'assigned'
      });
    }
    
    if (orderStatus.pos_transaction_id) {
      timeline.push({
        event: 'Order Placed (POS)',
        timestamp: orderStatus.transaction_date,
        status: orderStatus.pos_status
      });
    }
    
    if (orderStatus.kitchen_order_id) {
      timeline.push({
        event: 'Order Received (Kitchen)',
        timestamp: orderStatus.received_at,
        status: 'received'
      });
      
      if (orderStatus.started_at) {
        timeline.push({
          event: 'Cooking Started',
          timestamp: orderStatus.started_at,
          status: 'preparing'
        });
      }
      
      if (orderStatus.completed_at) {
        timeline.push({
          event: 'Order Ready',
          timestamp: orderStatus.completed_at,
          status: 'ready'
        });
      }
      
      if (orderStatus.served_at) {
        timeline.push({
          event: 'Order Served',
          timestamp: orderStatus.served_at,
          status: 'served'
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        ...orderStatus,
        items,
        timeline,
        integration_status: {
          reservation: orderStatus.reservation_id ? 'linked' : 'not_applicable',
          table: orderStatus.table_id ? 'linked' : 'not_applicable',
          pos: orderStatus.pos_transaction_id ? 'linked' : 'not_applicable',
          kitchen: orderStatus.kitchen_order_id ? 'linked' : 'not_applicable'
        }
      }
    });

  } catch (error: any) {
    console.error('Error getting order status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
