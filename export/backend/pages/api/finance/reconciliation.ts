import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
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
      const { branchId, startDate, endDate, includeTransactions = false } = req.body;

      // Default to yesterday if no date range provided
      const targetStartDate = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const targetEndDate = endDate || targetStartDate;
      
      // Check branch access
      const targetBranchId = branchId || session.user.branchId;
      
      if (!targetBranchId) {
        return res.status(400).json({
          success: false,
          error: 'Branch ID is required'
        });
      }

      // Get branch info
      const [branch] = await sequelize.query(`
        SELECT id, name, code, address, city
        FROM branches
        WHERE id = :branchId
        AND tenant_id = :tenantId
      `, {
        replacements: { 
          branchId: targetBranchId,
          tenantId: session.user.tenantId 
        },
        type: QueryTypes.SELECT
      });

      if (!branch) {
        return res.status(404).json({
          success: false,
          error: 'Branch not found'
        });
      }

      // Get POS transactions summary
      const [posSummary] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(total), 0) as total_sales,
          COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_sales,
          COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0) as card_sales,
          COALESCE(SUM(CASE WHEN payment_method = 'ewallet' THEN total ELSE 0 END), 0) as ewallet_sales,
          COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total ELSE 0 END), 0) as transfer_sales,
          COALESCE(SUM(tax), 0) as total_tax,
          COALESCE(SUM(discount), 0) as total_discount
        FROM pos_transactions
        WHERE DATE(transaction_date) BETWEEN :startDate AND :endDate
        AND branch_id = :branchId
        AND status = 'completed'
      `, {
        replacements: { 
          startDate: targetStartDate,
          endDate: targetEndDate,
          branchId: targetBranchId 
        },
        type: QueryTypes.SELECT
      });

      // Get finance transactions
      const financeTransactions = await sequelize.query(`
        SELECT 
          transaction_type,
          transaction_number,
          transaction_date,
          amount,
          category,
          payment_method,
          description,
          reference_type,
          reference_id
        FROM finance_transactions
        WHERE DATE(transaction_date) BETWEEN :startDate AND :endDate
        AND branch_id = :branchId
        ORDER BY transaction_date DESC
      `, {
        replacements: { 
          startDate: targetStartDate,
          endDate: targetEndDate,
          branchId: targetBranchId 
        },
        type: QueryTypes.SELECT
      });

      // Group finance transactions by type
      const financeSummary = financeTransactions.reduce((acc: any, ft: any) => {
        if (!acc[ft.transaction_type]) {
          acc[ft.transaction_type] = {
            count: 0,
            total: 0,
            transactions: []
          };
        }
        acc[ft.transaction_type].count++;
        acc[ft.transaction_type].total += parseFloat(ft.amount);
        
        if (includeTransactions) {
          acc[ft.transaction_type].transactions.push({
            number: ft.transaction_number,
            date: ft.transaction_date,
            amount: parseFloat(ft.amount),
            category: ft.category,
            paymentMethod: ft.payment_method,
            description: ft.description,
            referenceType: ft.reference_type,
            referenceId: ft.reference_id
          });
        }
        
        return acc;
      }, {});

      // Get shift summaries for the period
      const shiftSummaries = await sequelize.query(`
        SELECT 
          s.shift_name,
          s.shift_date,
          s.opened_at,
          s.closed_at,
          COUNT(pt.id) as transaction_count,
          COALESCE(SUM(pt.total), 0) as total_sales,
          s.initial_cash_amount,
          s.final_cash_amount,
          s.expected_cash_amount,
          s.cash_difference,
          o.name as opened_by,
          c.name as closed_by
        FROM shifts s
        LEFT JOIN pos_transactions pt ON s.id = pt.shift_id
        LEFT JOIN users o ON s.opened_by = o.id
        LEFT JOIN users c ON s.closed_by = c.id
        WHERE DATE(s.shift_date) BETWEEN :startDate AND :endDate
        AND s.branch_id = :branchId
        GROUP BY s.id, s.shift_name, s.shift_date, s.opened_at, s.closed_at,
                 s.initial_cash_amount, s.final_cash_amount, s.expected_cash_amount,
                 s.cash_difference, o.name, c.name
        ORDER BY s.shift_date DESC
      `, {
        replacements: { 
          startDate: targetStartDate,
          endDate: targetEndDate,
          branchId: targetBranchId 
        },
        type: QueryTypes.SELECT
      });

      // Calculate cash reconciliation
      const totalExpectedCash = shiftSummaries.reduce((sum, s) => 
        sum + parseFloat(s.expected_cash_amount || 0), 0
      );
      
      const totalActualCash = shiftSummaries.reduce((sum, s) => 
        sum + parseFloat(s.final_cash_amount || 0), 0
      );
      
      const totalCashDifference = totalActualCash - totalExpectedCash;

      // Get inter-branch settlements
      const settlements = await sequelize.query(`
        SELECT 
          settlement_number,
          settlement_type,
          amount,
          status,
          settlement_date,
          from_branch_id,
          to_branch_id,
          fb.name as from_branch_name,
          tb.name as to_branch_name
        FROM inter_branch_settlements ibs
        LEFT JOIN branches fb ON ibs.from_branch_id = fb.id
        LEFT JOIN branches tb ON ibs.to_branch_id = tb.id
        WHERE DATE(settlement_date) BETWEEN :startDate AND :endDate
        AND (ibs.from_branch_id = :branchId OR ibs.to_branch_id = :branchId)
        AND status IN ('approved', 'paid')
        ORDER BY settlement_date DESC
      `, {
        replacements: { 
          startDate: targetStartDate,
          endDate: targetEndDate,
          branchId: targetBranchId 
        },
        type: QueryTypes.SELECT
      });

      // Calculate settlement totals
      const settlementTotals = settlements.reduce((acc: any, s: any) => {
        if (s.from_branch_id === targetBranchId) {
          acc.payable += parseFloat(s.amount);
        } else {
          acc.receivable += parseFloat(s.amount);
        }
        return acc;
      }, { payable: 0, receivable: 0 });

      // Get any discrepancies or issues
      const discrepancies = [];
      
      // Check for cash differences
      if (Math.abs(totalCashDifference) > 1000) { // Threshold of 1000
        discrepancies.push({
          type: 'cash_difference',
          severity: Math.abs(totalCashDifference) > 10000 ? 'high' : 'medium',
          description: `Significant cash difference of Rp ${totalCashDifference.toLocaleString('id-ID')}`,
          amount: totalCashDifference
        });
      }

      // Check for unbalanced finance transactions
      const financeTotal = Object.values(financeSummary).reduce((sum: number, type: any) => 
        sum + type.total, 0
      );
      
      const expectedFinanceTotal = parseFloat(posSummary.total_sales) + 
        parseFloat(posSummary.total_tax) - 
        parseFloat(posSummary.total_discount);

      if (Math.abs(financeTotal - expectedFinanceTotal) > 100) {
        discrepancies.push({
          type: 'finance_mismatch',
          severity: 'high',
          description: `Finance transactions don't match POS sales`,
          expected: expectedFinanceTotal,
          actual: financeTotal,
          difference: financeTotal - expectedFinanceTotal
        });
      }

      // Prepare webhook payload
      const webhookPayload = {
        type: 'finance_reconciliation',
        period: {
          startDate: targetStartDate,
          endDate: targetEndDate
        },
        branch: {
          id: branch.id,
          name: branch.name,
          code: branch.code
        },
        posSummary: {
          totalTransactions: parseInt(posSummary.total_transactions),
          totalSales: parseFloat(posSummary.total_sales),
          paymentBreakdown: {
            cash: parseFloat(posSummary.cash_sales),
            card: parseFloat(posSummary.card_sales),
            ewallet: parseFloat(posSummary.ewallet_sales),
            transfer: parseFloat(posSummary.transfer_sales)
          },
          tax: parseFloat(posSummary.total_tax),
          discount: parseFloat(posSummary.total_discount)
        },
        financeSummary: Object.keys(financeSummary).map(type => ({
          type,
          count: financeSummary[type].count,
          total: financeSummary[type].total,
          transactions: includeTransactions ? financeSummary[type].transactions : undefined
        })),
        cashReconciliation: {
          expected: totalExpectedCash,
          actual: totalActualCash,
          difference: totalCashDifference,
          shifts: shiftSummaries.map(s => ({
            shiftName: s.shift_name,
            date: s.shift_date,
            openedAt: s.opened_at,
            closedAt: s.closed_at,
            transactions: parseInt(s.transaction_count),
            sales: parseFloat(s.total_sales),
            initialCash: parseFloat(s.initial_cash_amount),
            finalCash: parseFloat(s.final_cash_amount),
            expectedCash: parseFloat(s.expected_cash_amount),
            difference: parseFloat(s.cash_difference),
            openedBy: s.opened_by,
            closedBy: s.closed_by
          }))
        },
        interBranchSettlements: {
          payable: settlementTotals.payable,
          receivable: settlementTotals.receivable,
          net: settlementTotals.receivable - settlementTotals.payable,
          transactions: settlements.map(s => ({
            number: s.settlement_number,
            type: s.settlement_type,
            amount: parseFloat(s.amount),
            status: s.status,
            date: s.settlement_date,
            fromBranch: s.from_branch_id === targetBranchId ? null : {
              id: s.from_branch_id,
              name: s.from_branch_name
            },
            toBranch: s.to_branch_id === targetBranchId ? null : {
              id: s.to_branch_id,
              name: s.to_branch_name
            },
            direction: s.from_branch_id === targetBranchId ? 'outgoing' : 'incoming'
          }))
        },
        discrepancies,
        status: discrepancies.length === 0 ? 'balanced' : 
               discrepancies.some(d => d.severity === 'high') ? 'requires_attention' : 'minor_issues',
        generatedAt: new Date().toISOString(),
        generatedBy: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email
        }
      };

      // Trigger webhook
      await webhookService.triggerWebhooks(
        'finance_reconciliation',
        webhookPayload,
        session.user.tenantId,
        targetBranchId,
        session.user.id
      );

      // Create reconciliation record
      await sequelize.query(`
        INSERT INTO finance_reconciliations (
          id, branch_id, start_date, end_date, pos_total, finance_total,
          cash_expected, cash_actual, cash_difference, status,
          discrepancies_data, tenant_id, created_by, created_at, updated_at
        ) VALUES (
          UUID(), :branchId, :startDate, :endDate, :posTotal, :financeTotal,
          :cashExpected, :cashActual, :cashDifference, :status,
          :discrepancies, :tenantId, :createdBy, NOW(), NOW()
        )
      `, {
        replacements: {
          branchId: targetBranchId,
          startDate: targetStartDate,
          endDate: targetEndDate,
          posTotal: posSummary.total_sales,
          financeTotal,
          cashExpected: totalExpectedCash,
          cashActual: totalActualCash,
          cashDifference: totalCashDifference,
          status: webhookPayload.status,
          discrepancies: JSON.stringify(discrepancies),
          tenantId: session.user.tenantId,
          createdBy: session.user.id
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Finance reconciliation webhook sent successfully',
        data: webhookPayload
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Finance reconciliation API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
