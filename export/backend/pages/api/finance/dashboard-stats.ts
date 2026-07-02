import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

// Initialize models with associations
const models = require('../../../lib/models-init');
const FinanceAccount = models.FinanceAccount;
const FinanceTransaction = models.FinanceTransaction;
const FinanceBudget = models.FinanceBudget;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { period = 'month' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get all accounts summary
    const accounts = await FinanceAccount.findAll({
      where: { isActive: true }
    });

    let totalAssets = 0;
    let totalLiabilities = 0;
    let cashOnHand = 0;
    let bankBalance = 0;
    let accountsReceivable = 0;
    let accountsPayable = 0;

    accounts.forEach((account: any) => {
      const balance = parseFloat(account.balance);
      
      if (account.accountType === 'asset') {
        totalAssets += balance;
        if (account.category === 'Cash') cashOnHand += balance;
        if (account.category === 'Bank') bankBalance += balance;
        if (account.category === 'Receivables') accountsReceivable += balance;
      } else if (account.accountType === 'liability') {
        totalLiabilities += balance;
        if (account.category === 'Payables') accountsPayable += balance;
      }
    });

    // Get transactions for the period
    const transactions = await FinanceTransaction.findAll({
      where: {
        isActive: true,
        status: 'completed',
        transactionDate: {
          [Op.between]: [startDate, now]
        }
      }
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    const incomeByCategory: any = {};
    const expensesByCategory: any = {};

    transactions.forEach((transaction: any) => {
      const amount = parseFloat(transaction.amount);
      
      if (transaction.transactionType === 'income') {
        totalIncome += amount;
        if (!incomeByCategory[transaction.category]) {
          incomeByCategory[transaction.category] = 0;
        }
        incomeByCategory[transaction.category] += amount;
      } else if (transaction.transactionType === 'expense') {
        totalExpenses += amount;
        if (!expensesByCategory[transaction.category]) {
          expensesByCategory[transaction.category] = 0;
        }
        expensesByCategory[transaction.category] += amount;
      }
    });

    const netProfit = totalIncome - totalExpenses;

    // Get active budgets
    const budgets = await FinanceBudget.findAll({
      where: {
        isActive: true,
        status: 'active',
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now }
      }
    });

    let totalBudgetAmount = 0;
    let totalBudgetSpent = 0;
    let budgetsNearLimit = 0;
    let budgetsExceeded = 0;

    budgets.forEach((budget: any) => {
      const budgetAmount = parseFloat(budget.budgetAmount);
      const spentAmount = parseFloat(budget.spentAmount);
      const utilization = (spentAmount / budgetAmount) * 100;

      totalBudgetAmount += budgetAmount;
      totalBudgetSpent += spentAmount;

      if (utilization >= budget.alertThreshold) {
        budgetsNearLimit++;
      }
      if (spentAmount > budgetAmount) {
        budgetsExceeded++;
      }
    });

    // Get monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(now.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);

      const monthTransactions = await FinanceTransaction.findAll({
        where: {
          isActive: true,
          status: 'completed',
          transactionDate: {
            [Op.between]: [monthStart, monthEnd]
          }
        }
      });

      let monthIncome = 0;
      let monthExpense = 0;

      monthTransactions.forEach((t: any) => {
        const amount = parseFloat(t.amount);
        if (t.transactionType === 'income') monthIncome += amount;
        if (t.transactionType === 'expense') monthExpense += amount;
      });

      monthlyTrend.push({
        month: monthStart.toLocaleString('id-ID', { month: 'short' }),
        income: monthIncome,
        expense: monthExpense,
        profit: monthIncome - monthExpense
      });
    }

    // Recent transactions with account info
    const recentTransactions = await FinanceTransaction.findAll({
      where: { isActive: true },
      include: [{
        model: FinanceAccount,
        as: 'account',
        attributes: ['accountName', 'accountType'],
        required: false
      }],
      order: [['transactionDate', 'DESC']],
      limit: 10
    });

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalIncome,
          totalExpenses,
          netProfit,
          profitMargin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) : 0,
          cashOnHand,
          bankBalance,
          accountsReceivable,
          accountsPayable,
          totalAssets,
          totalLiabilities,
          netWorth: totalAssets - totalLiabilities
        },
        budgets: {
          totalBudgetAmount,
          totalBudgetSpent,
          totalBudgetRemaining: totalBudgetAmount - totalBudgetSpent,
          budgetUtilization: totalBudgetAmount > 0 ? ((totalBudgetSpent / totalBudgetAmount) * 100).toFixed(2) : 0,
          activeBudgets: budgets.length,
          budgetsNearLimit,
          budgetsExceeded
        },
        breakdown: {
          incomeByCategory,
          expensesByCategory
        },
        trends: {
          monthly: monthlyTrend
        },
        recentTransactions: recentTransactions.map((t: any) => ({
          id: t.id,
          transactionNumber: t.transactionNumber,
          date: t.transactionDate,
          type: t.transactionType,
          category: t.category,
          amount: t.amount,
          description: t.description,
          accountName: t.account?.accountName,
          status: t.status
        }))
      }
    });

  } catch (error: any) {
    console.error('Finance Dashboard Stats API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
