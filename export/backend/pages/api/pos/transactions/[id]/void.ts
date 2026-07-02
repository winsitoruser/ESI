import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';
import { webhookService } from '@/lib/webhookService';

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
      const { id } = req.query;
      const transactionId = id as string;
      const { reason, approvedBy } = req.body;

      // Validation
      if (!transactionId || !reason) {
        return res.status(400).json({
          success: false,
          error: 'Transaction ID and reason are required'
        });
      }

      // Get transaction details
      const [transaction] = await sequelize.query(`
        SELECT 
          pt.*,
          b.name as branch_name,
          b.code as branch_code,
          u.name as cashier_name,
          c.name as customer_name,
          c.phone as customer_phone
        FROM pos_transactions pt
        JOIN branches b ON pt.branch_id = b.id
        LEFT JOIN users u ON pt.cashier_id = u.id
        LEFT JOIN customers c ON pt.customer_id = c.id
        WHERE pt.id = :transactionId
        AND pt.tenant_id = :tenantId
      `, {
        replacements: { 
          transactionId,
          tenantId: session.user.tenantId 
        },
        type: QueryTypes.SELECT
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      // Check if already voided
      if (transaction.status === 'voided') {
        return res.status(400).json({
          success: false,
          error: 'Transaction already voided'
        });
      }

      const transaction2 = await sequelize.transaction();

      try {
        // Update transaction status
        await sequelize.query(`
          UPDATE pos_transactions SET
            status = 'voided',
            void_reason = :reason,
            voided_by = :voidedBy,
            voided_at = NOW(),
            updated_at = NOW()
          WHERE id = :transactionId
        `, {
          replacements: {
            transactionId,
            reason,
            voidedBy: session.user.id
          },
          transaction: transaction2
        });

        // Reverse stock movements
        const items = await sequelize.query(`
          SELECT product_id, quantity FROM pos_transaction_items
          WHERE transaction_id = :transactionId
        `, {
          replacements: { transactionId },
          type: QueryTypes.SELECT,
          transaction: transaction2
        });

        for (const item of items as any[]) {
          await sequelize.query(`
            UPDATE products SET
              stock = stock + :quantity,
              updated_at = NOW()
            WHERE id = :productId AND branch_id = :branchId
          `, {
            replacements: {
              productId: item.product_id,
              quantity: item.quantity,
              branchId: transaction.branch_id
            },
            transaction: transaction2
          });

          // Create stock movement record
          await sequelize.query(`
            INSERT INTO stock_movements (
              id, product_id, branch_id, movement_type, quantity,
              reference_type, reference_id, notes, created_by,
              tenant_id, created_at, updated_at
            ) VALUES (
              UUID(), :productId, :branchId, 'in', :quantity,
              'void_transaction', :transactionId, :notes, :createdBy,
              :tenantId, NOW(), NOW()
            )
          `, {
            replacements: {
              productId: item.product_id,
              branchId: transaction.branch_id,
              quantity: item.quantity,
              transactionId,
              notes: `Stock returned from voided transaction ${transaction.transaction_number}`,
              createdBy: session.user.id,
              tenantId: session.user.tenantId
            },
            transaction: transaction2
          });
        }

        // Create audit log
        await sequelize.query(`
          INSERT INTO audit_logs (
            id, user_id, branch_id, action, entity_type, entity_id,
            entity_name, old_values, new_values, description,
            ip_address, user_agent, tenant_id, created_at
          ) VALUES (
            UUID(), :userId, :branchId, 'void', 'pos_transaction', :transactionId,
            :entityName, :oldValues, :newValues, :description,
            :ipAddress, :userAgent, :tenantId, NOW()
          )
        `, {
          replacements: {
            userId: session.user.id,
            branchId: transaction.branch_id,
            transactionId,
            entityName: `Transaction ${transaction.transaction_number}`,
            oldValues: JSON.stringify({ status: 'completed' }),
            newValues: JSON.stringify({ status: 'voided', reason }),
            description: `Voided transaction ${transaction.transaction_number}. Reason: ${reason}`,
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
            tenantId: session.user.tenantId
          },
          transaction: transaction2
        });

        await transaction2.commit();

        // Prepare webhook payload for void alert
        const webhookPayload = {
          type: 'transaction_voided',
          timestamp: new Date().toISOString(),
          transaction: {
            id: transaction.id,
            number: transaction.transaction_number,
            date: transaction.transaction_date,
            total: parseFloat(transaction.total),
            items: items,
            cashier: transaction.cashier_name,
            customer: transaction.customer_name,
            branch: {
              id: transaction.branch_id,
              name: transaction.branch_name,
              code: transaction.branch_code
            }
          },
          void: {
            reason,
            voidedBy: session.user.name,
            voidedAt: new Date().toISOString(),
            approvedBy: approvedBy || null
          },
          alert: {
            severity: 'high',
            category: 'fraud_detection',
            requiresAttention: parseFloat(transaction.total) > 1000000,
            suspicious: reason.toLowerCase().includes('error') || 
                       reason.toLowerCase().includes('wrong') ||
                       parseFloat(transaction.total) > 5000000
          }
        };

        // Trigger webhooks
        try {
          await webhookService.triggerWebhooks(
            'transaction_voided',
            webhookPayload,
            session.user.tenantId,
            null,
            session.user.id
          );
        } catch (error) {
          console.error('Webhook trigger error:', error);
        }

        return res.status(200).json({
          success: true,
          message: 'Transaction voided successfully',
          data: {
            transactionId,
            voidReason: reason,
            voidedBy: session.user.name,
            voidedAt: new Date()
          }
        });

      } catch (error) {
        await transaction2.rollback();
        throw error;
      }

    } else if (req.method === 'GET') {
      // Get voided transactions
      const { page = 1, limit = 20, branchId, startDate, endDate } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let whereConditions = ['pt.tenant_id = :tenantId', "pt.status = 'voided'"];
      let queryParams: any = { tenantId: session.user.tenantId };

      if (branchId && branchId !== 'all') {
        whereConditions.push('pt.branch_id = :branchId');
        queryParams.branchId = branchId;
      }

      if (startDate) {
        whereConditions.push('DATE(pt.voided_at) >= :startDate');
        queryParams.startDate = startDate;
      }

      if (endDate) {
        whereConditions.push('DATE(pt.voided_at) <= :endDate');
        queryParams.endDate = endDate;
      }

      const whereClause = whereConditions.join(' AND ');

      const voidedTransactions = await sequelize.query(`
        SELECT 
          pt.*,
          b.name as branch_name,
          b.code as branch_code,
          cashier.name as cashier_name,
          voider.name as voided_by_name
        FROM pos_transactions pt
        JOIN branches b ON pt.branch_id = b.id
        LEFT JOIN users cashier ON pt.cashier_id = cashier.id
        LEFT JOIN users voider ON pt.voided_by = voider.id
        WHERE ${whereClause}
        ORDER BY pt.voided_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: {
          ...queryParams,
          limit: parseInt(limit as string),
          offset
        },
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: voidedTransactions
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Void transaction API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
