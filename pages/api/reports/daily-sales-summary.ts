import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
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
      const { branchId, date, includeDetails = false } = req.body;

      // Default to yesterday if no date provided
      const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
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
        SELECT id, name, code, address, city, phone
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

      // Get sales summary
      const [salesSummary] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(DISTINCT customer_id) as unique_customers,
          COALESCE(SUM(total), 0) as gross_revenue,
          COALESCE(SUM(subtotal), 0) as net_sales,
          COALESCE(SUM(discount), 0) as total_discount,
          COALESCE(SUM(tax), 0) as total_tax,
          COALESCE(AVG(total), 0) as avg_transaction_value,
          COALESCE(SUM(paid_amount), 0) as total_collected,
          COALESCE(SUM(change_amount), 0) as total_change
        FROM pos_transactions
        WHERE DATE(transaction_date) = :date
        AND branch_id = :branchId
        AND status = 'completed'
      `, {
        replacements: { 
          date: targetDate,
          branchId: targetBranchId 
        },
        type: QueryTypes.SELECT
      });

      // Get payment method breakdown
      const paymentBreakdown = await sequelize.query(`
        SELECT 
          payment_method,
          COUNT(*) as transaction_count,
          COALESCE(SUM(total), 0) as total_amount,
          ROUND(
            (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM pos_transactions 
              WHERE DATE(transaction_date) = :date 
              AND branch_id = :branchId 
              AND status = 'completed')), 2
          ) as percentage
        FROM pos_transactions
        WHERE DATE(transaction_date) = :date
        AND branch_id = :branchId
        AND status = 'completed'
        GROUP BY payment_method
        ORDER BY total_amount DESC
      `, {
        replacements: { 
          date: targetDate,
          branchId: targetBranchId 
        },
        type: QueryTypes.SELECT
      });

      // Get hourly sales
      const hourlySales = await sequelize.query(`
        SELECT 
          EXTRACT(HOUR FROM transaction_date) as hour,
          COUNT(*) as transaction_count,
          COALESCE(SUM(total), 0) as revenue,
          COALESCE(AVG(total), 0) as avg_transaction
        FROM pos_transactions
        WHERE DATE(transaction_date) = :date
        AND branch_id = :branchId
        AND status = 'completed'
        GROUP BY EXTRACT(HOUR FROM transaction_date)
        ORDER BY hour
      `, {
        replacements: { 
          date: targetDate,
          branchId: targetBranchId 
        },
        type: QueryTypes.SELECT
      });

      // Get top selling products
      const topProducts = await sequelize.query(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          c.name as category_name,
          SUM(pti.quantity) as total_quantity,
          SUM(pti.quantity * pti.price) as total_revenue,
          COUNT(DISTINCT pti.transaction_id) as order_count
        FROM pos_transaction_items pti
        JOIN pos_transactions pt ON pti.transaction_id = pt.id
        JOIN products p ON pti.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE DATE(pt.transaction_date) = :date
        AND pt.branch_id = :branchId
        AND pt.status = 'closed'
        GROUP BY p.id, p.name, p.sku, c.name
        ORDER BY total_revenue DESC
        LIMIT 10
      `, {
        replacements: { 
          date: targetDate,
          branchId: targetBranchId 
        },
        type: QueryTypes.SELECT
      });

      // Get category performance
      const categoryPerformance = await sequelize.query(`
        SELECT 
          c.id,
          c.name,
          COUNT(DISTINCT p.id) as product_count,
          SUM(pti.quantity) as total_quantity,
          SUM(pti.quantity * pti.price) as total_revenue,
          ROUND(
            (SUM(pti.quantity * pti.price) * 100.0 / (
              SELECT COALESCE(SUM(total), 0) FROM pos_transactions
              WHERE DATE(transaction_date) = :date
              AND branch_id = :branchId
              AND status = 'completed'
            )), 2
          ) as revenue_percentage
        FROM pos_transaction_items pti
        JOIN pos_transactions pt ON pti.transaction_id = pt.id
        JOIN products p ON pti.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE DATE(pt.transaction_date) = :date
        AND pt.branch_id = :branchId
        AND pt.status = 'closed'
        GROUP BY c.id, c.name
        ORDER BY total_revenue DESC
      `, {
        replacements: { 
          date: targetDate,
          branchId: targetBranchId 
        },
        type: QueryTypes.SELECT
      });

      // Get shift summary
      const shiftSummary = await sequelize.query(`
        SELECT 
          s.shift_name,
          s.opened_at,
          s.closed_at,
          COUNT(pt.id) as transaction_count,
          COALESCE(SUM(pt.total), 0) as total_sales,
          COALESCE(s.final_cash_amount, 0) as final_cash,
          COALESCE(s.cash_difference, 0) as cash_difference,
          o.name as opened_by_name,
          c.name as closed_by_name
        FROM shifts s
        LEFT JOIN pos_transactions pt ON s.id = pt.shift_id
        LEFT JOIN users o ON s.opened_by = o.id
        LEFT JOIN users c ON s.closed_by = c.id
        WHERE DATE(s.shift_date) = :date
        AND s.branch_id = :branchId
        GROUP BY s.id, s.shift_name, s.opened_at, s.closed_at, 
                 s.final_cash_amount, s.cash_difference,
                 o.name, c.name
        ORDER BY s.opened_at
      `, {
        replacements: { 
          date: targetDate,
          branchId: targetBranchId 
        },
        type: QueryTypes.SELECT
      });

      // Get previous day comparison
      const previousDate = new Date(targetDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split('T')[0];

      const [previousDay] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(total), 0) as gross_revenue,
          COALESCE(AVG(total), 0) as avg_transaction_value
        FROM pos_transactions
        WHERE DATE(transaction_date) = :date
        AND branch_id = :branchId
        AND status = 'completed'
      `, {
        replacements: { 
          date: previousDateStr,
          branchId: targetBranchId 
        },
        type: QueryTypes.SELECT
      });

      // Calculate growth percentages
      const transactionGrowth = previousDay.total_transactions > 0 
        ? ((salesSummary.total_transactions - previousDay.total_transactions) / previousDay.total_transactions) * 100
        : 0;
      
      const revenueGrowth = previousDay.gross_revenue > 0
        ? ((parseFloat(salesSummary.gross_revenue) - parseFloat(previousDay.gross_revenue)) / parseFloat(previousDay.gross_revenue)) * 100
        : 0;

      // Prepare webhook payload
      const webhookPayload = {
        type: 'daily_sales_summary',
        date: targetDate,
        branch: {
          id: branch.id,
          name: branch.name,
          code: branch.code,
          address: branch.address,
          city: branch.city
        },
        summary: {
          totalTransactions: parseInt(salesSummary.total_transactions),
          uniqueCustomers: parseInt(salesSummary.unique_customers),
          grossRevenue: parseFloat(salesSummary.gross_revenue),
          netSales: parseFloat(salesSummary.net_sales),
          totalDiscount: parseFloat(salesSummary.total_discount),
          totalTax: parseFloat(salesSummary.total_tax),
          avgTransactionValue: parseFloat(salesSummary.avg_transaction_value),
          totalCollected: parseFloat(salesSummary.total_collected),
          totalChange: parseFloat(salesSummary.total_change)
        },
        comparison: {
          previousDay: {
            totalTransactions: parseInt(previousDay.total_transactions),
            grossRevenue: parseFloat(previousDay.gross_revenue),
            avgTransactionValue: parseFloat(previousDay.avg_transaction_value)
          },
          growth: {
            transactions: parseFloat(transactionGrowth.toFixed(2)),
            revenue: parseFloat(revenueGrowth.toFixed(2))
          }
        },
        breakdowns: {
          paymentMethods: paymentBreakdown.map(p => ({
            method: p.payment_method,
            count: parseInt(p.transaction_count),
            amount: parseFloat(p.total_amount),
            percentage: parseFloat(p.percentage)
          })),
          hourlySales: hourlySales.map(h => ({
            hour: parseInt(h.hour),
            transactions: parseInt(h.transaction_count),
            revenue: parseFloat(h.revenue),
            avgTransaction: parseFloat(h.avg_transaction)
          }))
        },
        topProducts: topProducts.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category_name,
          quantity: parseInt(p.total_quantity),
          revenue: parseFloat(p.total_revenue),
          orders: parseInt(p.order_count)
        })),
        categoryPerformance: categoryPerformance.map(c => ({
          id: c.id,
          name: c.name,
          productCount: parseInt(c.product_count),
          quantity: parseInt(c.total_quantity),
          revenue: parseFloat(c.total_revenue),
          percentage: parseFloat(c.revenue_percentage)
        })),
        shiftSummary: shiftSummary.map(s => ({
          shiftName: s.shift_name,
          openedAt: s.opened_at,
          closedAt: s.closed_at,
          transactions: parseInt(s.transaction_count),
          sales: parseFloat(s.total_sales),
          finalCash: parseFloat(s.final_cash),
          cashDifference: parseFloat(s.cash_difference),
          openedBy: s.opened_by_name,
          closedBy: s.closed_by_name
        })),
        generatedAt: new Date().toISOString(),
        generatedBy: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email
        }
      };

      // Add detailed transactions if requested
      if (includeDetails) {
        const transactions = await sequelize.query(`
          SELECT 
            pt.transaction_number,
            pt.transaction_date,
            pt.total,
            pt.payment_method,
            pt.customer_name,
            u.name as cashier_name
          FROM pos_transactions pt
          LEFT JOIN users u ON pt.cashier_id = u.id
          WHERE DATE(pt.transaction_date) = :date
          AND pt.branch_id = :branchId
          AND pt.status = 'closed'
          ORDER BY pt.transaction_date DESC
          LIMIT 100
        `, {
          replacements: { 
            date: targetDate,
            branchId: targetBranchId 
          },
          type: QueryTypes.SELECT
        });

        webhookPayload.details = {
          transactions: transactions.map(t => ({
            number: t.transaction_number,
            time: t.transaction_date,
            total: parseFloat(t.total),
            paymentMethod: t.payment_method,
            customer: t.customer_name,
            cashier: t.cashier_name
          }))
        };
      }

      // Trigger webhook
      await webhookService.triggerWebhooks(
        'daily_sales_summary',
        webhookPayload,
        session.user.tenantId,
        targetBranchId,
        session.user.id
      );

      return res.status(200).json({
        success: true,
        message: 'Daily sales summary webhook sent successfully',
        data: webhookPayload
      });

    } else if (req.method === 'GET') {
      // Get recent daily summaries
      const { 
        page = 1, 
        limit = 20,
        branchId 
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = ['wl.event = \'daily_sales_summary\''];
      let queryParams: any = {};

      if (session.user.role !== 'super_admin') {
        whereConditions.push('wl.tenant_id = :tenantId');
        queryParams.tenantId = session.user.tenantId;
      }

      if (branchId) {
        whereConditions.push('(wl.payload->\'branch\'->>\'id\' = :branchId OR wl.branch_id = :branchId)');
        queryParams.branchId = branchId;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get recent summaries
      const summaries = await sequelize.query(`
        SELECT 
          wl.*,
          w.name as webhook_name,
          (wl.payload->>'date') as summary_date,
          (wl.payload->'branch'->>'name') as branch_name,
          (wl.payload->'summary'->>'grossRevenue') as gross_revenue,
          (wl.payload->'summary'->>'totalTransactions') as total_transactions,
          (wl.payload->'generatedBy'->>'name') as generated_by_name
        FROM webhook_logs wl
        LEFT JOIN webhooks w ON wl.webhook_id = w.id
        WHERE ${whereClause}
        ORDER BY wl.created_at DESC
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
        FROM webhook_logs wl
        WHERE ${whereClause}
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: summaries,
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
    console.error('Daily sales summary API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
