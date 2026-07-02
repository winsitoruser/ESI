import { Pool } from 'pg';

export class FinanceReportsQueries {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ============================================
  // INCOME STATEMENT REPORT
  // ============================================
  async getIncomeStatementReport(params: {
    dateFrom?: string;
    dateTo?: string;
    period?: string;
  }) {
    const { dateFrom, dateTo, period } = params;

    let dateFilter = '';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (dateFrom && dateTo) {
      dateFilter = `AND ft.transaction_date >= $${paramIndex} AND ft.transaction_date <= $${paramIndex + 1}`;
      queryParams.push(dateFrom, dateTo);
      paramIndex += 2;
    } else if (period) {
      switch (period) {
        case 'today':
          dateFilter = "AND DATE(ft.transaction_date) = CURRENT_DATE";
          break;
        case 'week':
          dateFilter = "AND ft.transaction_date >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'month':
          dateFilter = "AND ft.transaction_date >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case 'year':
          dateFilter = "AND ft.transaction_date >= CURRENT_DATE - INTERVAL '365 days'";
          break;
      }
    }

    // Get total income
    const incomeQuery = `
      SELECT 
        COALESCE(SUM(ft.amount), 0) as total_income
      FROM finance_transactions ft
      JOIN finance_categories fc ON ft.category_id = fc.id
      WHERE fc.type = 'income'
        AND ft.status = 'completed'
        ${dateFilter}
    `;

    // Get income by category
    const incomeByCategoryQuery = `
      SELECT 
        fc.id,
        fc.name as category_name,
        fc.code as category_code,
        COALESCE(SUM(ft.amount), 0) as amount,
        COUNT(ft.id) as transaction_count
      FROM finance_categories fc
      LEFT JOIN finance_transactions ft ON fc.id = ft.category_id 
        AND ft.status = 'completed'
        ${dateFilter}
      WHERE fc.type = 'income'
        AND fc.is_active = true
      GROUP BY fc.id, fc.name, fc.code
      HAVING COALESCE(SUM(ft.amount), 0) > 0
      ORDER BY amount DESC
    `;

    // Get total expenses
    const expenseQuery = `
      SELECT 
        COALESCE(SUM(ft.amount), 0) as total_expense
      FROM finance_transactions ft
      JOIN finance_categories fc ON ft.category_id = fc.id
      WHERE fc.type = 'expense'
        AND ft.status = 'completed'
        ${dateFilter}
    `;

    // Get expenses by category
    const expenseByCategoryQuery = `
      SELECT 
        fc.id,
        fc.name as category_name,
        fc.code as category_code,
        COALESCE(SUM(ft.amount), 0) as amount,
        COUNT(ft.id) as transaction_count
      FROM finance_categories fc
      LEFT JOIN finance_transactions ft ON fc.id = ft.category_id 
        AND ft.status = 'completed'
        ${dateFilter}
      WHERE fc.type = 'expense'
        AND fc.is_active = true
      GROUP BY fc.id, fc.name, fc.code
      HAVING COALESCE(SUM(ft.amount), 0) > 0
      ORDER BY amount DESC
    `;

    const [incomeResult, incomeByCategoryResult, expenseResult, expenseByCategoryResult] = await Promise.all([
      this.pool.query(incomeQuery, queryParams),
      this.pool.query(incomeByCategoryQuery, queryParams),
      this.pool.query(expenseQuery, queryParams),
      this.pool.query(expenseByCategoryQuery, queryParams)
    ]);

    const totalIncome = parseFloat(incomeResult.rows[0]?.total_income || 0);
    const totalExpense = parseFloat(expenseResult.rows[0]?.total_expense || 0);
    const netProfit = totalIncome - totalExpense;

    return {
      summary: {
        totalIncome,
        totalExpense,
        netProfit,
        profitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0
      },
      incomeByCategory: incomeByCategoryResult.rows.map((row: any) => ({
        id: row.id.toString(),
        categoryName: row.category_name,
        categoryCode: row.category_code,
        amount: parseFloat(row.amount),
        transactionCount: parseInt(row.transaction_count),
        percentage: totalIncome > 0 ? (parseFloat(row.amount) / totalIncome) * 100 : 0
      })),
      expenseByCategory: expenseByCategoryResult.rows.map((row: any) => ({
        id: row.id.toString(),
        categoryName: row.category_name,
        categoryCode: row.category_code,
        amount: parseFloat(row.amount),
        transactionCount: parseInt(row.transaction_count),
        percentage: totalExpense > 0 ? (parseFloat(row.amount) / totalExpense) * 100 : 0
      }))
    };
  }

  // ============================================
  // CASH FLOW REPORT
  // ============================================
  async getCashFlowReport(params: {
    dateFrom?: string;
    dateTo?: string;
    period?: string;
  }) {
    const { dateFrom, dateTo, period } = params;

    let dateFilter = '';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (dateFrom && dateTo) {
      dateFilter = `AND ft.transaction_date >= $${paramIndex} AND ft.transaction_date <= $${paramIndex + 1}`;
      queryParams.push(dateFrom, dateTo);
      paramIndex += 2;
    } else if (period) {
      switch (period) {
        case 'month':
          dateFilter = "AND ft.transaction_date >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case 'year':
          dateFilter = "AND ft.transaction_date >= CURRENT_DATE - INTERVAL '365 days'";
          break;
      }
    }

    // Get cash flow by date
    const cashFlowQuery = `
      SELECT 
        DATE(ft.transaction_date) as date,
        COALESCE(SUM(CASE WHEN fc.type = 'income' THEN ft.amount ELSE 0 END), 0) as cash_in,
        COALESCE(SUM(CASE WHEN fc.type = 'expense' THEN ft.amount ELSE 0 END), 0) as cash_out,
        COALESCE(SUM(CASE WHEN fc.type = 'income' THEN ft.amount ELSE -ft.amount END), 0) as net_cash_flow
      FROM finance_transactions ft
      JOIN finance_categories fc ON ft.category_id = fc.id
      WHERE ft.status = 'completed'
        ${dateFilter}
      GROUP BY DATE(ft.transaction_date)
      ORDER BY date DESC
      LIMIT 30
    `;

    // Get cash flow by payment method
    const cashFlowByMethodQuery = `
      SELECT 
        pm.name as payment_method,
        COALESCE(SUM(CASE WHEN fc.type = 'income' THEN ft.amount ELSE 0 END), 0) as cash_in,
        COALESCE(SUM(CASE WHEN fc.type = 'expense' THEN ft.amount ELSE 0 END), 0) as cash_out
      FROM finance_transactions ft
      JOIN finance_categories fc ON ft.category_id = fc.id
      LEFT JOIN payment_methods pm ON ft.payment_method_id = pm.id
      WHERE ft.status = 'completed'
        ${dateFilter}
      GROUP BY pm.name
      ORDER BY cash_in DESC
    `;

    const [cashFlowResult, cashFlowByMethodResult] = await Promise.all([
      this.pool.query(cashFlowQuery, queryParams),
      this.pool.query(cashFlowByMethodQuery, queryParams)
    ]);

    // Calculate cumulative cash flow
    let cumulativeCashFlow = 0;
    const cashFlowData = cashFlowResult.rows.reverse().map((row: any) => {
      cumulativeCashFlow += parseFloat(row.net_cash_flow);
      return {
        date: row.date,
        cashIn: parseFloat(row.cash_in),
        cashOut: parseFloat(row.cash_out),
        netCashFlow: parseFloat(row.net_cash_flow),
        cumulativeCashFlow
      };
    });

    return {
      cashFlowByDate: cashFlowData,
      cashFlowByMethod: cashFlowByMethodResult.rows.map((row: any) => ({
        paymentMethod: row.payment_method || 'Unknown',
        cashIn: parseFloat(row.cash_in),
        cashOut: parseFloat(row.cash_out),
        netFlow: parseFloat(row.cash_in) - parseFloat(row.cash_out)
      })),
      summary: {
        totalCashIn: cashFlowData.reduce((sum, item) => sum + item.cashIn, 0),
        totalCashOut: cashFlowData.reduce((sum, item) => sum + item.cashOut, 0),
        netCashFlow: cashFlowData.reduce((sum, item) => sum + item.netCashFlow, 0),
        endingBalance: cumulativeCashFlow
      }
    };
  }

  // ============================================
  // EXPENSE BREAKDOWN REPORT
  // ============================================
  async getExpenseBreakdownReport(params: {
    dateFrom?: string;
    dateTo?: string;
    period?: string;
  }) {
    const { dateFrom, dateTo, period } = params;

    let dateFilter = '';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (dateFrom && dateTo) {
      dateFilter = `AND ft.transaction_date >= $${paramIndex} AND ft.transaction_date <= $${paramIndex + 1}`;
      queryParams.push(dateFrom, dateTo);
      paramIndex += 2;
    } else if (period) {
      switch (period) {
        case 'today':
          dateFilter = "AND DATE(ft.transaction_date) = CURRENT_DATE";
          break;
        case 'week':
          dateFilter = "AND ft.transaction_date >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'month':
          dateFilter = "AND ft.transaction_date >= CURRENT_DATE - INTERVAL '30 days'";
          break;
      }
    }

    // Get expense breakdown by category
    const expenseBreakdownQuery = `
      SELECT 
        fc.id,
        fc.name as category_name,
        fc.code as category_code,
        fc.icon,
        fc.color,
        COALESCE(SUM(ft.amount), 0) as total_amount,
        COUNT(ft.id) as transaction_count,
        AVG(ft.amount) as average_amount,
        MAX(ft.amount) as max_amount,
        MIN(ft.amount) as min_amount
      FROM finance_categories fc
      LEFT JOIN finance_transactions ft ON fc.id = ft.category_id 
        AND ft.status = 'completed'
        ${dateFilter}
      WHERE fc.type = 'expense'
        AND fc.is_active = true
      GROUP BY fc.id, fc.name, fc.code, fc.icon, fc.color
      HAVING COALESCE(SUM(ft.amount), 0) > 0
      ORDER BY total_amount DESC
    `;

    // Get top expenses
    const topExpensesQuery = `
      SELECT 
        ft.id,
        ft.description,
        ft.amount,
        ft.transaction_date,
        fc.name as category_name,
        pm.name as payment_method
      FROM finance_transactions ft
      JOIN finance_categories fc ON ft.category_id = fc.id
      LEFT JOIN payment_methods pm ON ft.payment_method_id = pm.id
      WHERE fc.type = 'expense'
        AND ft.status = 'completed'
        ${dateFilter}
      ORDER BY ft.amount DESC
      LIMIT 10
    `;

    const [expenseBreakdownResult, topExpensesResult] = await Promise.all([
      this.pool.query(expenseBreakdownQuery, queryParams),
      this.pool.query(topExpensesQuery, queryParams)
    ]);

    const totalExpenses = expenseBreakdownResult.rows.reduce(
      (sum: number, row: any) => sum + parseFloat(row.total_amount), 
      0
    );

    return {
      expenseByCategory: expenseBreakdownResult.rows.map((row: any) => ({
        id: row.id.toString(),
        categoryName: row.category_name,
        categoryCode: row.category_code,
        icon: row.icon,
        color: row.color,
        totalAmount: parseFloat(row.total_amount),
        transactionCount: parseInt(row.transaction_count),
        averageAmount: parseFloat(row.average_amount),
        maxAmount: parseFloat(row.max_amount),
        minAmount: parseFloat(row.min_amount),
        percentage: totalExpenses > 0 ? (parseFloat(row.total_amount) / totalExpenses) * 100 : 0
      })),
      topExpenses: topExpensesResult.rows.map((row: any) => ({
        id: row.id.toString(),
        description: row.description,
        amount: parseFloat(row.amount),
        transactionDate: row.transaction_date,
        categoryName: row.category_name,
        paymentMethod: row.payment_method || 'Unknown'
      })),
      summary: {
        totalExpenses,
        totalTransactions: expenseBreakdownResult.rows.reduce(
          (sum: number, row: any) => sum + parseInt(row.transaction_count), 
          0
        ),
        averageExpense: totalExpenses / (expenseBreakdownResult.rows.reduce(
          (sum: number, row: any) => sum + parseInt(row.transaction_count), 
          0
        ) || 1)
      }
    };
  }

  // ============================================
  // MONTHLY TREND REPORT
  // ============================================
  async getMonthlyTrendReport(params: {
    months?: number;
  }) {
    const { months = 12 } = params;

    const query = `
      SELECT 
        TO_CHAR(ft.transaction_date, 'YYYY-MM') as month,
        TO_CHAR(ft.transaction_date, 'Mon YYYY') as month_label,
        COALESCE(SUM(CASE WHEN fc.type = 'income' THEN ft.amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN fc.type = 'expense' THEN ft.amount ELSE 0 END), 0) as expense,
        COALESCE(SUM(CASE WHEN fc.type = 'income' THEN ft.amount ELSE -ft.amount END), 0) as profit
      FROM finance_transactions ft
      JOIN finance_categories fc ON ft.category_id = fc.id
      WHERE ft.status = 'completed'
        AND ft.transaction_date >= CURRENT_DATE - INTERVAL '${months} months'
      GROUP BY TO_CHAR(ft.transaction_date, 'YYYY-MM'), TO_CHAR(ft.transaction_date, 'Mon YYYY')
      ORDER BY month ASC
    `;

    const result = await this.pool.query(query);

    return result.rows.map((row: any) => ({
      month: row.month,
      monthLabel: row.month_label,
      income: parseFloat(row.income),
      expense: parseFloat(row.expense),
      profit: parseFloat(row.profit),
      profitMargin: parseFloat(row.income) > 0 ? (parseFloat(row.profit) / parseFloat(row.income)) * 100 : 0
    }));
  }

  // ============================================
  // BUDGET VS ACTUAL REPORT
  // ============================================
  async getBudgetVsActualReport(params: {
    period?: string;
  }) {
    const { period = 'month' } = params;

    let dateFilter = '';
    if (period === 'month') {
      dateFilter = "AND ft.transaction_date >= CURRENT_DATE - INTERVAL '30 days'";
    } else if (period === 'year') {
      dateFilter = "AND ft.transaction_date >= CURRENT_DATE - INTERVAL '365 days'";
    }

    // Note: This assumes you have a budgets table
    // If not, this will return mock data structure
    const query = `
      SELECT 
        fc.id,
        fc.name as category_name,
        fc.type,
        COALESCE(SUM(ft.amount), 0) as actual_amount,
        0 as budget_amount
      FROM finance_categories fc
      LEFT JOIN finance_transactions ft ON fc.id = ft.category_id 
        AND ft.status = 'completed'
        ${dateFilter}
      WHERE fc.is_active = true
      GROUP BY fc.id, fc.name, fc.type
      ORDER BY fc.type, actual_amount DESC
    `;

    const result = await this.pool.query(query);

    return result.rows.map((row: any) => ({
      id: row.id.toString(),
      categoryName: row.category_name,
      type: row.type,
      budgetAmount: parseFloat(row.budget_amount),
      actualAmount: parseFloat(row.actual_amount),
      variance: parseFloat(row.budget_amount) - parseFloat(row.actual_amount),
      variancePercentage: parseFloat(row.budget_amount) > 0 
        ? ((parseFloat(row.actual_amount) - parseFloat(row.budget_amount)) / parseFloat(row.budget_amount)) * 100 
        : 0
    }));
  }
}

export default FinanceReportsQueries;
