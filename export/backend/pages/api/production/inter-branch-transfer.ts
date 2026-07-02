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

    if (req.method === 'POST') {
      const {
        productionId,
        fromBranchId, // Central Kitchen
        items, // List of items to transfer
        transferType = 'production_transfer',
        notes
      } = req.body;

      // Validation
      if (!productionId || !fromBranchId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['productionId', 'fromBranchId', 'items']
        });
      }

      // Check branch access
      const hasAccess = await canAccessBranch(req, res, fromBranchId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to source branch'
        });
      }

      // Get production details
      const [production] = await sequelize.query(`
        SELECT 
          p.*,
          pr.name as product_name,
          pr.sku as product_sku,
          b.name as branch_name
        FROM productions p
        JOIN products pr ON p.product_id = pr.id
        JOIN branches b ON p.branch_id = b.id
        WHERE p.id = :productionId
        AND p.tenant_id = :tenantId
        AND p.status = 'completed'
      `, {
        replacements: { 
          productionId,
          tenantId: session.user.tenantId 
        },
        type: QueryTypes.SELECT
      });

      if (!production) {
        return res.status(404).json({
          success: false,
          error: 'Production not found or not completed'
        });
      }

      const transaction = await sequelize.transaction();

      try {
        // Generate transfer number
        const [lastTransfer] = await sequelize.query(`
          SELECT transfer_number FROM inventory_transfers 
          WHERE tenant_id = :tenantId 
          ORDER BY created_at DESC LIMIT 1
        `, {
          replacements: { tenantId: session.user.tenantId },
          type: QueryTypes.SELECT,
          transaction
        });

        let transferNumber;
        if (lastTransfer) {
          const lastNumber = parseInt(lastTransfer.transfer_number.split('-').pop());
          transferNumber = `IT-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;
        } else {
          transferNumber = `IT-${new Date().getFullYear()}-0001`;
        }

        // Create separate transfers for each destination branch
        const transfers = [];
        
        for (const item of items) {
          if (!item.toBranchId || !item.quantity || !item.productId) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              error: 'Each item must have toBranchId, quantity, and productId'
            });
          }

          // Check destination branch access
          const hasDestAccess = await canAccessBranch(req, res, item.toBranchId);
          if (!hasDestAccess) {
            await transaction.rollback();
            return res.status(403).json({
              success: false,
              error: `Access denied to destination branch ${item.toBranchId}`
            });
          }

          // Check stock availability at source
          const [stock] = await sequelize.query(`
            SELECT stock FROM products 
            WHERE id = :productId AND branch_id = :branchId
            FOR UPDATE
          `, {
            replacements: {
              productId: item.productId,
              branchId: fromBranchId
            },
            type: QueryTypes.SELECT,
            transaction
          });

          if (!stock || parseFloat(stock.stock) < item.quantity) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              error: `Insufficient stock for product ${item.productId}. Available: ${stock?.stock || 0}, Requested: ${item.quantity}`
            });
          }

          // Create inventory transfer
          const [transfer] = await sequelize.query(`
            INSERT INTO inventory_transfers (
              id, transfer_number, from_location_id, to_location_id,
              transfer_type, status, priority, expected_delivery_date,
              requested_by, notes, reference_type, reference_id,
              tenant_id, created_at, updated_at
            ) VALUES (
              UUID(), :transferNumber, :fromBranchId, :toBranchId,
              :transferType, 'approved', 'high', NOW(),
              :requestedBy, :notes, 'production', :productionId,
              :tenantId, NOW(), NOW()
            )
            RETURNING *
          `, {
            replacements: {
              transferNumber: `${transferNumber}-${item.toBranchId.slice(-4)}`,
              fromBranchId,
              toBranchId: item.toBranchId,
              transferType,
              requestedBy: session.user.id,
              notes: `${notes || ''} | Production: ${production.production_number}`,
              productionId,
              tenantId: session.user.tenantId
            },
            type: QueryTypes.SELECT,
            transaction
          });

          // Create transfer item
          await sequelize.query(`
            INSERT INTO inventory_transfer_items (
              id, transfer_id, product_id, product_name, sku,
              quantity, unit, unit_price, total_price,
              notes, created_at, updated_at
            ) VALUES (
              UUID(), :transferId, :productId, :productName, :sku,
              :quantity, :unit, :unitPrice, :totalPrice,
              :notes, NOW(), NOW()
            )
          `, {
            replacements: {
              transferId: transfer.id,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice || 0,
              totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
              notes: item.notes
            },
            transaction
          });

          // Update stock at source branch
          await sequelize.query(`
            UPDATE products SET
              stock = stock - :quantity,
              updated_at = NOW()
            WHERE id = :productId AND branch_id = :branchId
          `, {
            replacements: {
              productId: item.productId,
              branchId: fromBranchId,
              quantity: item.quantity
            },
            transaction
          });

          // Create stock movement for source
          await sequelize.query(`
            INSERT INTO stock_movements (
              id, product_id, branch_id, movement_type, quantity,
              reference_type, reference_id, notes, created_by,
              tenant_id, created_at, updated_at
            ) VALUES (
              UUID(), :productId, :branchId, 'out', :quantity,
              'transfer', :transferId, :notes, :createdBy,
              :tenantId, NOW(), NOW()
            )
          `, {
            replacements: {
              productId: item.productId,
              branchId: fromBranchId,
              quantity: item.quantity,
              transferId: transfer.id,
              notes: `Transfer to branch ${item.toBranchId}`,
              createdBy: session.user.id,
              tenantId: session.user.tenantId
            },
            transaction
          });

          // Update or create stock at destination branch
          await sequelize.query(`
            INSERT INTO products (
              id, name, sku, branch_id, tenant_id, stock,
              cost, selling_price, is_active, created_at, updated_at
            ) VALUES (
              :productId, :productName, :sku, :branchId, :tenantId, :quantity,
              :cost, :sellingPrice, true, NOW(), NOW()
            )
            ON CONFLICT (id, branch_id)
            DO UPDATE SET
              stock = products.stock + :quantity,
              updated_at = NOW()
          `, {
            replacements: {
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              branchId: item.toBranchId,
              tenantId: session.user.tenantId,
              quantity: item.quantity,
              cost: item.cost || 0,
              sellingPrice: item.sellingPrice || 0
            },
            transaction
          });

          // Create stock movement for destination
          await sequelize.query(`
            INSERT INTO stock_movements (
              id, product_id, branch_id, movement_type, quantity,
              reference_type, reference_id, notes, created_by,
              tenant_id, created_at, updated_at
            ) VALUES (
              UUID(), :productId, :branchId, 'in', :quantity,
              'transfer', :transferId, :notes, :createdBy,
              :tenantId, NOW(), NOW()
            )
          `, {
            replacements: {
              productId: item.productId,
              branchId: item.toBranchId,
              quantity: item.quantity,
              transferId: transfer.id,
              notes: `Transfer from branch ${fromBranchId}`,
              createdBy: session.user.id,
              tenantId: session.user.tenantId
            },
            transaction
          });

          // Create inter-branch balance record
          await sequelize.query(`
            INSERT INTO inter_branch_balances (
              id, from_branch_id, to_branch_id, transaction_type,
              reference_id, amount, status, created_by,
              tenant_id, created_at, updated_at
            ) VALUES (
              UUID(), :fromBranchId, :toBranchId, 'stock_transfer',
              :transferId, :amount, 'pending', :createdBy,
              :tenantId, NOW(), NOW()
            )
            ON CONFLICT (from_branch_id, to_branch_id, reference_id)
            DO UPDATE SET
              amount = inter_branch_balances.amount + :amount,
              updated_at = NOW()
          `, {
            replacements: {
              fromBranchId,
              toBranchId: item.toBranchId,
              transferId: transfer.id,
              amount: (item.quantity || 0) * (item.unitPrice || 0),
              createdBy: session.user.id,
              tenantId: session.user.tenantId
            },
            transaction
          });

          transfers.push({
            ...transfer,
            item: {
              ...item,
              transferId: transfer.id
            }
          });
        }

        // Update production status to distributed
        await sequelize.query(`
          UPDATE productions SET
            status = 'distributed',
            distributed_at = NOW(),
            updated_at = NOW()
          WHERE id = :productionId
        `, {
          replacements: { productionId },
          transaction
        });

        await transaction.commit();

        return res.status(200).json({
          success: true,
          message: `Created ${transfers.length} inter-branch transfers successfully`,
          data: {
            productionId,
            productionNumber: production.production_number,
            transfers
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else if (req.method === 'GET') {
      const {
        productionId,
        fromBranchId,
        toBranchId,
        status,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = ['it.tenant_id = :tenantId'];
      let queryParams: any = { tenantId: session.user.tenantId };

      if (productionId) {
        whereConditions.push('it.reference_id = :productionId AND it.reference_type = \'production\'');
        queryParams.productionId = productionId;
      }

      if (fromBranchId) {
        whereConditions.push('it.from_location_id = :fromBranchId');
        queryParams.fromBranchId = fromBranchId;
      }

      if (toBranchId) {
        whereConditions.push('it.to_location_id = :toBranchId');
        queryParams.toBranchId = toBranchId;
      }

      if (status && status !== 'all') {
        whereConditions.push('it.status = :status');
        queryParams.status = status;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get transfers
      const transfers = await sequelize.query(`
        SELECT 
          it.*,
          fb.name as from_branch_name,
          fb.code as from_branch_code,
          tb.name as to_branch_name,
          tb.code as to_branch_code,
          req.name as requested_by_name,
          COUNT(iti.id) as item_count,
          COALESCE(SUM(iti.quantity * iti.unit_price), 0) as total_value
        FROM inventory_transfers it
        LEFT JOIN branches fb ON it.from_location_id = fb.id
        LEFT JOIN branches tb ON it.to_location_id = tb.id
        LEFT JOIN users req ON it.requested_by = req.id
        LEFT JOIN inventory_transfer_items iti ON it.id = iti.transfer_id
        WHERE ${whereClause}
        GROUP BY it.id, fb.name, fb.code, tb.name, tb.code, req.name
        ORDER BY it.created_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: {
          ...queryParams,
          limit: parseInt(limit as string),
          offset
        },
        type: QueryTypes.SELECT
      });

      // Count total
      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as total
        FROM inventory_transfers it
        WHERE ${whereClause}
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: transfers,
        pagination: {
          total: parseInt(countResult.total),
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(parseInt(countResult.total) / parseInt(limit as string))
        }
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Inter-branch material transfer API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
