import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/server/database/connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    const { sequelize } = db;
    const tenantId = '00000000-0000-0000-0000-000000000001';

    // Get current month dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 1. TOTAL INCOME (from incomes + POS transactions)
    const [incomeResult] = await sequelize.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM incomes 
      WHERE status = 'completed'
        AND date >= :startDate 
        AND date <= :endDate
        AND tenant_id = :tenantId
    `, {
      replacements: { 
        startDate: startOfMonth.toISOString(), 
        endDate: endOfMonth.toISOString(),
        tenantId
      }
    });

    // Income from POS transactions
    const [posIncomeResult] = await sequelize.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM pos_transactions 
      WHERE status = 'closed'
        AND transaction_date >= :startDate 
        AND transaction_date <= :endDate
        AND tenant_id = :tenantId
    `, {
      replacements: { 
        startDate: startOfMonth.toISOString(), 
        endDate: endOfMonth.toISOString(),
        tenantId
      }
    });

    // 2. TOTAL EXPENSES (from expenses + purchasing)
    const [expenseResult] = await sequelize.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE status = 'completed'
        AND date >= :startDate 
        AND date <= :endDate
        AND tenant_id = :tenantId
    `, {
      replacements: { 
        startDate: startOfMonth.toISOString(), 
        endDate: endOfMonth.toISOString(),
        tenantId
      }
    });

    // Expenses from purchasing (if table exists)
    let purchasingExpense = 0;
    try {
      const [purchasingResult] = await sequelize.query(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM purchase_orders 
        WHERE status IN ('completed', 'received')
          AND order_date >= :startDate 
          AND order_date <= :endDate
          AND tenant_id = :tenantId
      `, {
        replacements: { 
          startDate: startOfMonth.toISOString(), 
          endDate: endOfMonth.toISOString(),
          tenantId
        }
      });
      purchasingExpense = parseFloat(purchasingResult[0]?.total || '0');
    } catch (e) {
      console.log('Purchasing table not found, skipping');
    }

    // 3. ACCOUNTS RECEIVABLE (unpaid invoices)
    const [arResult] = await sequelize.query(`
      SELECT COALESCE(SUM(remaining_amount), 0) as total
      FROM accounts_receivable 
      WHERE status IN ('unpaid', 'partial', 'overdue')
        AND tenant_id = :tenantId
    `, { replacements: { tenantId } });

    // 4. ACCOUNTS PAYABLE (unpaid bills)
    const [apResult] = await sequelize.query(`
      SELECT COALESCE(SUM(remaining_amount), 0) as total
      FROM accounts_payable 
      WHERE status IN ('unpaid', 'partial', 'overdue')
        AND tenant_id = :tenantId
    `, { replacements: { tenantId } });

    // 5. INVENTORY VALUE (from products)
    let inventoryValue = 0;
    try {
      const [inventoryResult] = await sequelize.query(`
        SELECT COALESCE(SUM(p.stock * p.price), 0) as total
        FROM products p
        WHERE p.tenant_id = :tenantId
          AND p.is_active = true
      `, { replacements: { tenantId } });
      inventoryValue = parseFloat(inventoryResult[0]?.total || '0');
    } catch (e) {
      console.log('Products table not found, skipping');
    }

    // 6. CASH ON HAND (from ledger - cash accounts)
    const [cashResult] = await sequelize.query(`
      SELECT COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) as total
      FROM ledger_entries 
      WHERE account_code LIKE '1-1-1%'
        AND tenant_id = :tenantId
    `, { replacements: { tenantId } });

    // 7. BANK BALANCE (from ledger - bank accounts)
    const [bankResult] = await sequelize.query(`
      SELECT COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) as total
      FROM ledger_entries 
      WHERE account_code LIKE '1-1-2%'
        AND tenant_id = :tenantId
    `, { replacements: { tenantId } });

    // 8. SUBSCRIPTION STATUS (from billing)
    let subscriptionStatus = {
      status: 'active',
      plan: 'Unknown',
      expiryDate: null,
      daysRemaining: 0
    };
    try {
      const [subResult] = await sequelize.query(`
        SELECT status, plan_name, end_date
        FROM subscriptions 
        WHERE tenant_id = :tenantId
        ORDER BY created_at DESC
        LIMIT 1
      `, { replacements: { tenantId } });
      
      if (subResult && subResult[0]) {
        const sub = subResult[0] as any;
        const endDate = new Date(sub.end_date);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        subscriptionStatus = {
          status: sub.status,
          plan: sub.plan_name,
          expiryDate: sub.end_date,
          daysRemaining: diffDays > 0 ? diffDays : 0
        };
      }
    } catch (e) {
      console.log('Subscriptions table not found, using default');
    }

    // 9. INVOICE DEBT DATA (for chart)
    const [invoiceDebtResult] = await sequelize.query(`
      SELECT 
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid_count,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status = 'unpaid' THEN remaining_amount ELSE 0 END), 0) as unpaid_amount,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN remaining_amount ELSE 0 END), 0) as overdue_amount
      FROM accounts_receivable
      WHERE tenant_id = :tenantId
    `, { replacements: { tenantId } });

    const invoiceDebt = invoiceDebtResult[0] as any;

    // 10. PARTIAL PAYMENTS (invoices with partial status)
    const [partialPayments] = await sequelize.query(`
      SELECT 
        ar.id,
        ar.invoice_number,
        ar.customer_name,
        ar.total_amount,
        ar.paid_amount,
        ar.remaining_amount,
        ar.due_date,
        ar.created_at
      FROM accounts_receivable ar
      WHERE ar.status = 'partial'
        AND ar.tenant_id = :tenantId
      ORDER BY ar.due_date ASC
      LIMIT 10
    `, { replacements: { tenantId } });

    // 11. UNPAID INVOICES
    const [unpaidInvoices] = await sequelize.query(`
      SELECT 
        ar.id,
        ar.invoice_number,
        ar.customer_name,
        ar.total_amount,
        ar.due_date,
        ar.created_at,
        CASE 
          WHEN ar.due_date < CURRENT_DATE THEN 'overdue'
          ELSE 'unpaid'
        END as status
      FROM accounts_receivable ar
      WHERE ar.status IN ('unpaid', 'overdue')
        AND ar.tenant_id = :tenantId
      ORDER BY ar.due_date ASC
      LIMIT 10
    `, { replacements: { tenantId } });

    // 12. RECENT TRANSACTIONS (combined from all sources)
    const [recentTransactions] = await sequelize.query(`
      SELECT * FROM (
        (SELECT 
          'income' as type, 
          id, 
          date as transaction_date, 
          amount, 
          category, 
          description,
          'manual' as source
         FROM incomes 
         WHERE status = 'completed' AND tenant_id = :tenantId
         ORDER BY date DESC LIMIT 5)
        UNION ALL
        (SELECT 
          'expense' as type, 
          id, 
          date as transaction_date, 
          amount, 
          category, 
          description,
          'manual' as source
         FROM expenses 
         WHERE status = 'completed' AND tenant_id = :tenantId
         ORDER BY date DESC LIMIT 5)
        UNION ALL
        (SELECT 
          'pos_sale' as type, 
          id, 
          transaction_date, 
          total_amount as amount, 
          'POS Sale' as category, 
          CONCAT('Transaction #', transaction_number) as description,
          'pos' as source
         FROM pos_transactions 
         WHERE status = 'closed' AND tenant_id = :tenantId
         ORDER BY transaction_date DESC LIMIT 5)
      ) combined
      ORDER BY transaction_date DESC
      LIMIT 15
    `, { replacements: { tenantId } });

    // 13. INCOME VS EXPENSE MONTHLY (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [monthlyData] = await sequelize.query(`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', :sixMonthsAgo::timestamp),
          date_trunc('month', CURRENT_DATE),
          '1 month'::interval
        ) AS month
      ),
      monthly_income AS (
        SELECT 
          date_trunc('month', date) as month,
          COALESCE(SUM(amount), 0) as income
        FROM incomes
        WHERE status = 'completed' 
          AND date >= :sixMonthsAgo
          AND tenant_id = :tenantId
        GROUP BY date_trunc('month', date)
      ),
      monthly_expense AS (
        SELECT 
          date_trunc('month', date) as month,
          COALESCE(SUM(amount), 0) as expense
        FROM expenses
        WHERE status = 'completed' 
          AND date >= :sixMonthsAgo
          AND tenant_id = :tenantId
        GROUP BY date_trunc('month', date)
      )
      SELECT 
        to_char(m.month, 'Mon') as month_name,
        COALESCE(i.income, 0) as income,
        COALESCE(e.expense, 0) as expense
      FROM months m
      LEFT JOIN monthly_income i ON m.month = i.month
      LEFT JOIN monthly_expense e ON m.month = e.month
      ORDER BY m.month
    `, { 
      replacements: { 
        sixMonthsAgo: sixMonthsAgo.toISOString(),
        tenantId
      } 
    });

    // Calculate totals
    const totalIncome = parseFloat(incomeResult[0]?.total || '0') + parseFloat(posIncomeResult[0]?.total || '0');
    const totalExpenses = parseFloat(expenseResult[0]?.total || '0') + purchasingExpense;
    const netProfit = totalIncome - totalExpenses;
    const accountsReceivable = parseFloat(arResult[0]?.total || '0');
    const accountsPayable = parseFloat(apResult[0]?.total || '0');
    const cashOnHand = parseFloat(cashResult[0]?.total || '0');
    const bankBalance = parseFloat(bankResult[0]?.total || '0');

    // Format monthly data
    const incomeVsExpenseMonthly = {
      months: (monthlyData as any[]).map(m => m.month_name),
      income: (monthlyData as any[]).map(m => parseFloat(m.income)),
      expense: (monthlyData as any[]).map(m => parseFloat(m.expense))
    };

    return res.status(200).json({
      success: true,
      data: {
        // Financial Summary
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0,
        
        // Balances
        accountsReceivable,
        accountsPayable,
        cashOnHand,
        bankBalance,
        inventoryValue,
        assetValue: 0, // Will be calculated from assets table
        
        // Subscription
        subscriptionStatus,
        
        // Invoice Debt Data (for chart)
        invoiceDebtData: {
          labels: ['Lunas', 'Belum Lunas', 'Jatuh Tempo'],
          values: [
            parseFloat(invoiceDebt?.paid_amount || '0'),
            parseFloat(invoiceDebt?.unpaid_amount || '0'),
            parseFloat(invoiceDebt?.overdue_amount || '0')
          ],
          counts: {
            paid: parseInt(invoiceDebt?.paid_count || '0'),
            unpaid: parseInt(invoiceDebt?.unpaid_count || '0'),
            overdue: parseInt(invoiceDebt?.overdue_count || '0')
          }
        },
        
        // Detailed Lists
        partialPayments,
        unpaidInvoices,
        recentTransactions,
        
        // Monthly Trends
        incomeVsExpenseMonthly,
        
        // Period
        period: {
          start: startOfMonth,
          end: endOfMonth
        },
        
        // Data Sources
        dataSources: {
          income: ['incomes', 'pos_transactions'],
          expenses: ['expenses', 'purchase_orders'],
          inventory: 'products',
          subscription: 'subscriptions'
        }
      },
      message: 'Complete finance dashboard data retrieved successfully'
    });

  } catch (error: any) {
    console.error('Dashboard Complete API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
