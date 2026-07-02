import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';
import { canAccessBranch } from '@/lib/branchFilter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Transfer ID is required' });
    }

    if (req.method === 'PUT') {
      const { status, notes, items } = req.body;
      
      // Validate status transition
      const validStatuses = ['requested', 'approved', 'rejected', 'in_transit', 'received', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid status' 
        });
      }

      const transaction = await sequelize.transaction();

      try {
        // Get current transfer with branch info
        const [currentTransfer] = await sequelize.query(`
          SELECT * FROM inventory_transfers WHERE id = :id
        `, {
          replacements: { id },
          type: QueryTypes.SELECT,
          transaction
        });

        if (!currentTransfer) {
          await transaction.rollback();
          return res.status(404).json({ 
            success: false, 
            error: 'Transfer not found' 
          });
        }

        // Check branch access
        if (currentTransfer.from_branch_id) {
          const hasAccess = await canAccessBranch(req, res, currentTransfer.from_branch_id);
          if (!hasAccess && status !== 'received') {
            await transaction.rollback();
            return res.status(403).json({ 
              success: false, 
              error: 'No access to source branch' 
            });
          }
        }

        if (currentTransfer.to_branch_id) {
          const hasAccess = await canAccessBranch(req, res, currentTransfer.to_branch_id);
          if (!hasAccess && status !== 'approved' && status !== 'rejected') {
            await transaction.rollback();
            return res.status(403).json({ 
              success: false, 
              error: 'No access to destination branch' 
            });
          }
        }

        // Validate status transition
        const validTransitions: Record<string, string[]> = {
          'requested': ['approved', 'rejected', 'cancelled'],
          'approved': ['in_transit', 'cancelled'],
          'in_transit': ['received', 'cancelled'],
          'received': ['completed'],
          'completed': [],
          'rejected': [],
          'cancelled': []
        };

        if (!validTransitions[currentTransfer.status]?.includes(status)) {
          await transaction.rollback();
          return res.status(400).json({ 
            success: false, 
            error: `Cannot change status from ${currentTransfer.status} to ${status}` 
          });
        }

        // Prepare update data
        const updateData: any = {
          status,
          notes: notes || currentTransfer.notes,
          updated_at: new Date()
        };

        // Add timestamps based on status
        if (status === 'in_transit') {
          updateData.shipped_at = new Date();
          updateData.shipped_by = session.user.id;
        } else if (status === 'received') {
          updateData.received_at = new Date();
          updateData.received_by = session.user.id;
        }

        // Update transfer
        await sequelize.query(`
          UPDATE inventory_transfers SET
            status = :status,
            notes = :notes,
            shipped_at = :shippedAt,
            shipped_by = :shippedBy,
            received_at = :receivedAt,
            received_by = :receivedBy,
            updated_at = :updatedAt
          WHERE id = :id
        `, {
          replacements: {
            id,
            status: updateData.status,
            notes: updateData.notes,
            shippedAt: updateData.shipped_at || null,
            shippedBy: updateData.shipped_by || null,
            receivedAt: updateData.received_at || null,
            receivedBy: updateData.received_by || null,
            updatedAt: updateData.updated_at
          },
          transaction
        });

        // Handle stock movements based on status
        if (status === 'in_transit') {
          // Reduce stock at source branch
          const transferItems = await sequelize.query(`
            SELECT * FROM inventory_transfer_items WHERE transfer_id = :id
          `, {
            replacements: { id },
            type: QueryTypes.SELECT,
            transaction
          });

          for (const item of transferItems) {
            const quantityToShip = items?.find((i: any) => i.productId === item.product_id)?.quantity || 
                                 item.quantity_requested;

            // Create stock movement out
            await sequelize.query(`
              INSERT INTO stock_movements (
                id, product_id, branch_id, movement_type, quantity,
                reference_type, reference_id, reference_number,
                notes, created_at, updated_at
              ) VALUES (
                UUID(), :productId, :branchId, 'transfer', -:quantity,
                'inventory_transfer', :transferId, :transferNumber,
                :notes, NOW(), NOW()
              )
            `, {
              replacements: {
                productId: item.product_id,
                branchId: currentTransfer.from_branch_id,
                quantity: quantityToShip,
                transferId: id,
                transferNumber: currentTransfer.transfer_number,
                notes: `Transfer to ${currentTransfer.to_location_id}`
              },
              transaction
            });

            // Update shipped quantity
            await sequelize.query(`
              UPDATE inventory_transfer_items 
              SET quantity_shipped = :quantity 
              WHERE id = :itemId
            `, {
              replacements: {
                itemId: item.id,
                quantity: quantityToShip
              },
              transaction
            });
          }

        } else if (status === 'received') {
          // Add stock to destination branch
          const transferItems = await sequelize.query(`
            SELECT * FROM inventory_transfer_items WHERE transfer_id = :id
          `, {
            replacements: { id },
            type: QueryTypes.SELECT,
            transaction
          });

          for (const item of transferItems) {
            const quantityToReceive = items?.find((i: any) => i.productId === item.product_id)?.quantity || 
                                     item.quantity_shipped || item.quantity_requested;

            // Create stock movement in
            await sequelize.query(`
              INSERT INTO stock_movements (
                id, product_id, branch_id, movement_type, quantity,
                reference_type, reference_id, reference_number,
                notes, created_at, updated_at
              ) VALUES (
                UUID(), :productId, :branchId, 'transfer', :quantity,
                'inventory_transfer', :transferId, :transferNumber,
                :notes, NOW(), NOW()
              )
            `, {
              replacements: {
                productId: item.product_id,
                branchId: currentTransfer.to_branch_id,
                quantity: quantityToReceive,
                transferId: id,
                transferNumber: currentTransfer.transfer_number,
                notes: `Transfer from ${currentTransfer.from_location_id}`
              },
              transaction
            });

            // Update received quantity
            await sequelize.query(`
              UPDATE inventory_transfer_items 
              SET quantity_received = :quantity 
              WHERE id = :itemId
            `, {
              replacements: {
                itemId: item.id,
                quantity: quantityToReceive
              },
              transaction
            });
          }
        }

        await transaction.commit();

        // Get updated transfer
        const [updatedTransfer] = await sequelize.query(`
          SELECT 
            t.*,
            u1.name as shipped_by_name,
            u2.name as received_by_name
          FROM inventory_transfers t
          LEFT JOIN users u1 ON t.shipped_by = u1.id
          LEFT JOIN users u2 ON t.received_by = u2.id
          WHERE t.id = :id
        `, {
          replacements: { id },
          type: QueryTypes.SELECT
        });

        return res.status(200).json({
          success: true,
          message: `Transfer status updated to ${status}`,
          data: updatedTransfer
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else if (req.method === 'GET') {
      // Get transfer details with items
      const [transfer] = await sequelize.query(`
        SELECT 
          t.*,
          u1.name as shipped_by_name,
          u2.name as received_by_name
        FROM inventory_transfers t
        LEFT JOIN users u1 ON t.shipped_by = u1.id
        LEFT JOIN users u2 ON t.received_by = u2.id
        WHERE t.id = :id
      `, {
        replacements: { id },
        type: QueryTypes.SELECT
      });

      if (!transfer) {
        return res.status(404).json({ 
          success: false, 
          error: 'Transfer not found' 
        });
      }

      // Get transfer items
      const items = await sequelize.query(`
        SELECT * FROM inventory_transfer_items 
        WHERE transfer_id = :id
        ORDER BY created_at
      `, {
        replacements: { id },
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: {
          ...transfer,
          items
        }
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Transfer status API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
