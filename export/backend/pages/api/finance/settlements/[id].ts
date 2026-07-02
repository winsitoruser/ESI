import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
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

    // Only admin and super_admin can manage settlements
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Settlement ID is required' });
    }

    if (req.method === 'PUT') {
      const { action, notes, paymentMethod, paymentReference } = req.body;
      
      // Validate action
      const validActions = ['approve', 'pay', 'cancel'];
      if (!validActions.includes(action)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid action' 
        });
      }

      const transaction = await sequelize.transaction();

      try {
        // Get current settlement
        const [currentSettlement] = await sequelize.query(`
          SELECT * FROM inter_branch_settlements WHERE id = :id
        `, {
          replacements: { id },
          type: QueryTypes.SELECT,
          transaction
        });

        if (!currentSettlement) {
          await transaction.rollback();
          return res.status(404).json({ 
            success: false, 
            error: 'Settlement not found' 
          });
        }

        // Check branch access
        const hasFromAccess = await canAccessBranch(req, res, currentSettlement.from_branch_id);
        const hasToAccess = await canAccessBranch(req, res, currentSettlement.to_branch_id);
        
        if (!hasFromAccess || !hasToAccess) {
          await transaction.rollback();
          return res.status(403).json({ 
            success: false, 
            error: 'Access denied to one or both branches' 
          });
        }

        // Validate status transition
        const validTransitions: Record<string, string[]> = {
          'pending': ['approved', 'cancelled'],
          'approved': ['paid', 'cancelled'],
          'paid': [],
          'cancelled': [],
          'overdue': ['paid', 'cancelled']
        };

        if (!validTransitions[currentSettlement.status]?.includes(action === 'pay' ? 'paid' : action)) {
          await transaction.rollback();
          return res.status(400).json({ 
            success: false, 
            error: `Cannot ${action} settlement with status ${currentSettlement.status}` 
          });
        }

        // Prepare update data
        const updateData: any = {
          status: action === 'pay' ? 'paid' : action,
          notes: notes || currentSettlement.notes,
          updated_at: new Date()
        };

        // Add action-specific fields
        if (action === 'approve') {
          updateData.approved_by = session.user.id;
          updateData.approved_at = new Date();
        } else if (action === 'pay') {
          updateData.paid_by = session.user.id;
          updateData.paid_at = new Date();
          updateData.payment_method = paymentMethod;
          updateData.payment_reference = paymentReference;

          // Create finance transactions for both branches
          await createFinanceTransactions(currentSettlement, session.user.id, transaction);
        }

        // Update settlement
        await sequelize.query(`
          UPDATE inter_branch_settlements SET
            status = :status,
            notes = :notes,
            approved_by = :approvedBy,
            approved_at = :approvedAt,
            paid_by = :paidBy,
            paid_at = :paidAt,
            payment_method = :paymentMethod,
            payment_reference = :paymentReference,
            updated_at = :updatedAt
          WHERE id = :id
        `, {
          replacements: {
            id,
            status: updateData.status,
            notes: updateData.notes,
            approvedBy: updateData.approved_by || null,
            approvedAt: updateData.approved_at || null,
            paidBy: updateData.paid_by || null,
            paidAt: updateData.paid_at || null,
            paymentMethod: updateData.payment_method || null,
            paymentReference: updateData.payment_reference || null,
            updatedAt: updateData.updated_at
          },
          transaction
        });

        // Create history record
        await sequelize.query(`
          INSERT INTO inter_branch_settlement_history (
            id, settlement_id, action, new_value, notes, user_id,
            ip_address, user_agent, created_at
          ) VALUES (
            UUID(), :settlementId, :action, :newValue, :notes, :userId,
            :ipAddress, :userAgent, NOW()
          )
        `, {
          replacements: {
            settlementId: id,
            action: action === 'pay' ? 'paid' : action,
            newValue: JSON.stringify(updateData),
            notes: notes || null,
            userId: session.user.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          },
          transaction
        });

        await transaction.commit();

        // Get updated settlement
        const [updatedSettlement] = await sequelize.query(`
          SELECT 
            ibs.*,
            fb.name as from_branch_name,
            fb.code as from_branch_code,
            tb.name as to_branch_name,
            tb.code as to_branch_code,
            creator.name as created_by_name,
            approver.name as approved_by_name,
            payer.name as paid_by_name
          FROM inter_branch_settlements ibs
          LEFT JOIN branches fb ON ibs.from_branch_id = fb.id
          LEFT JOIN branches tb ON ibs.to_branch_id = tb.id
          LEFT JOIN users creator ON ibs.created_by = creator.id
          LEFT JOIN users approver ON ibs.approved_by = approver.id
          LEFT JOIN users payer ON ibs.paid_by = payer.id
          WHERE ibs.id = :id
        `, {
          replacements: { id },
          type: QueryTypes.SELECT
        });

        return res.status(200).json({
          success: true,
          message: `Settlement ${action}d successfully`,
          data: updatedSettlement
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else if (req.method === 'GET') {
      // Get settlement details with history
      const [settlement] = await sequelize.query(`
        SELECT 
          ibs.*,
          fb.name as from_branch_name,
          fb.code as from_branch_code,
          tb.name as to_branch_name,
          tb.code as to_branch_code,
          creator.name as created_by_name,
          approver.name as approved_by_name,
          payer.name as paid_by_name
        FROM inter_branch_settlements ibs
        LEFT JOIN branches fb ON ibs.from_branch_id = fb.id
        LEFT JOIN branches tb ON ibs.to_branch_id = tb.id
        LEFT JOIN users creator ON ibs.created_by = creator.id
        LEFT JOIN users approver ON ibs.approved_by = approver.id
        LEFT JOIN users payer ON ibs.paid_by = payer.id
        WHERE ibs.id = :id
      `, {
        replacements: { id },
        type: QueryTypes.SELECT
      });

      if (!settlement) {
        return res.status(404).json({ 
          success: false, 
          error: 'Settlement not found' 
        });
      }

      // Get history
      const history = await sequelize.query(`
        SELECT 
          ibsh.*,
          u.name as user_name
        FROM inter_branch_settlement_history ibsh
        LEFT JOIN users u ON ibsh.user_id = u.id
        WHERE ibsh.settlement_id = :id
        ORDER BY ibsh.created_at DESC
      `, {
        replacements: { id },
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: {
          ...settlement,
          history
        }
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Settlement action API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Helper function to create finance transactions
async function createFinanceTransactions(
  settlement: any,
  userId: string,
  transaction: any
) {
  // Generate transaction numbers
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  // For from branch (money out)
  const fromTransactionNumber = `PAY-${settlement.from_branch_code || 'GEN'}-${dateStr}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  
  // For to branch (money in)
  const toTransactionNumber = `REC-${settlement.to_branch_code || 'GEN'}-${dateStr}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

  // Create expense transaction for from branch
  await sequelize.query(`
    INSERT INTO finance_transactions (
      id, transaction_number, transaction_date, transaction_type,
      account_id, category, amount, description,
      reference_type, reference_id, payment_method,
      branch_id, created_by, created_at, updated_at
    ) VALUES (
      UUID(), :transactionNumber, :transactionDate, 'expense',
      (SELECT id FROM finance_accounts WHERE code = 'INTER_BRANCH_PAYABLE' LIMIT 1),
      :category, :amount, :description,
      'inter_branch_settlement', :settlementId, :paymentMethod,
      :branchId, :createdBy, NOW(), NOW()
    )
  `, {
    replacements: {
      transactionNumber: fromTransactionNumber,
      transactionDate: new Date(),
      category: 'Inter-Branch Payment',
      amount: settlement.amount,
      description: `Payment to ${settlement.to_branch_name || 'branch'} - ${settlement.description || settlement.settlement_number}`,
      settlementId: settlement.id,
      paymentMethod: settlement.payment_method || 'transfer',
      branchId: settlement.from_branch_id,
      createdBy: userId
    },
    transaction
  });

  // Create income transaction for to branch
  await sequelize.query(`
    INSERT INTO finance_transactions (
      id, transaction_number, transaction_date, transaction_type,
      account_id, category, amount, description,
      reference_type, reference_id, payment_method,
      branch_id, created_by, created_at, updated_at
    ) VALUES (
      UUID(), :transactionNumber, :transactionDate, 'income',
      (SELECT id FROM finance_accounts WHERE code = 'INTER_BRANCH_RECEIVABLE' LIMIT 1),
      :category, :amount, :description,
      'inter_branch_settlement', :settlementId, :paymentMethod,
      :branchId, :createdBy, NOW(), NOW()
    )
  `, {
    replacements: {
      transactionNumber: toTransactionNumber,
      transactionDate: new Date(),
      category: 'Inter-Branch Receipt',
      amount: settlement.amount,
      description: `Receipt from ${settlement.from_branch_name || 'branch'} - ${settlement.description || settlement.settlement_number}`,
      settlementId: settlement.id,
      paymentMethod: settlement.payment_method || 'transfer',
      branchId: settlement.to_branch_id,
      createdBy: userId
    },
    transaction
  });
}
