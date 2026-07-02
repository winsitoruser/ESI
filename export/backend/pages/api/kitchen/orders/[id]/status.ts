import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

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

    const { id } = req.query;
    const { status, assignedChefId } = req.body;
    const tenantId = session.user.tenantId;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Validate status
    const validStatuses = ['new', 'preparing', 'ready', 'served', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Get current order
    const [order]: any = await sequelize.query(`
      SELECT * FROM kitchen_orders 
      WHERE id = :id AND tenant_id = :tenantId
    `, {
      replacements: { id, tenantId },
      type: QueryTypes.SELECT
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Prepare update fields based on status
    let updateFields = 'status = :status, updated_at = NOW()';
    const replacements: any = { status, id, tenantId };

    if (status === 'preparing' && !order.started_at) {
      updateFields += ', started_at = NOW()';
      if (assignedChefId) {
        updateFields += ', assigned_chef_id = :assignedChefId';
        replacements.assignedChefId = assignedChefId;
      }
    }

    if (status === 'ready' && !order.completed_at) {
      updateFields += ', completed_at = NOW()';
      
      // Calculate actual prep time
      if (order.started_at) {
        const startTime = new Date(order.started_at).getTime();
        const now = new Date().getTime();
        const prepTimeMinutes = Math.round((now - startTime) / 1000 / 60);
        updateFields += ', actual_prep_time = :prepTime';
        replacements.prepTime = prepTimeMinutes;
      }

      // Update order items status
      await sequelize.query(`
        UPDATE kitchen_order_items 
        SET status = 'ready', updated_at = NOW()
        WHERE kitchen_order_id = :id
      `, {
        replacements: { id }
      });
    }

    if (status === 'served' && !order.served_at) {
      updateFields += ', served_at = NOW()';
    }

    // Update order
    await sequelize.query(`
      UPDATE kitchen_orders 
      SET ${updateFields}
      WHERE id = :id AND tenant_id = :tenantId
    `, {
      replacements
    });

    // Get updated order
    const [updatedOrder]: any = await sequelize.query(`
      SELECT 
        ko.*,
        ks.name as assigned_chef_name
      FROM kitchen_orders ko
      LEFT JOIN kitchen_staff ks ON ko.assigned_chef_id = ks.id
      WHERE ko.id = :id AND ko.tenant_id = :tenantId
    `, {
      replacements: { id, tenantId },
      type: QueryTypes.SELECT
    });

    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });

  } catch (error: any) {
    console.error('Error updating order status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
