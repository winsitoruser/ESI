import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

const FinanceBudget = require('../../../models/FinanceBudget');
const FinanceAccount = require('../../../models/FinanceAccount');
const FinanceTransaction = require('../../../models/FinanceTransaction');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // GET - List all budgets
    if (req.method === 'GET') {
      const { budgetPeriod, category, status } = req.query;

      let whereClause: any = { isActive: true };

      if (budgetPeriod) {
        whereClause.budgetPeriod = budgetPeriod;
      }

      if (category) {
        whereClause.category = category;
      }

      if (status) {
        whereClause.status = status;
      }

      const budgets = await FinanceBudget.findAll({
        where: whereClause,
        include: [{
          model: FinanceAccount,
          as: 'account',
          attributes: ['id', 'accountNumber', 'accountName']
        }],
        order: [['startDate', 'DESC']]
      });

      // Calculate utilization for each budget
      const budgetsWithUtilization = budgets.map((budget: any) => {
        const budgetAmount = parseFloat(budget.budgetAmount);
        const spentAmount = parseFloat(budget.spentAmount);
        const utilization = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
        const isOverBudget = spentAmount > budgetAmount;
        const isNearThreshold = utilization >= budget.alertThreshold;

        return {
          ...budget.toJSON(),
          utilization: utilization.toFixed(2),
          isOverBudget,
          isNearThreshold
        };
      });

      return res.status(200).json({
        success: true,
        data: budgetsWithUtilization
      });
    }

    // POST - Create new budget
    if (req.method === 'POST') {
      const {
        budgetName,
        budgetPeriod,
        startDate,
        endDate,
        category,
        accountId,
        budgetAmount,
        alertThreshold,
        description
      } = req.body;

      // Validate required fields
      if (!budgetName || !budgetPeriod || !startDate || !endDate || !category || !budgetAmount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: budgetName, budgetPeriod, startDate, endDate, category, budgetAmount'
        });
      }

      // Create budget
      const budget = await FinanceBudget.create({
        budgetName,
        budgetPeriod,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        category,
        accountId,
        budgetAmount: parseFloat(budgetAmount),
        spentAmount: 0,
        remainingAmount: parseFloat(budgetAmount),
        alertThreshold: alertThreshold || 80,
        description,
        status: 'active',
        isActive: true
      });

      return res.status(201).json({
        success: true,
        message: 'Budget created successfully',
        data: budget
      });
    }

    // PUT - Update budget
    if (req.method === 'PUT') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Budget ID is required'
        });
      }

      const budget = await FinanceBudget.findByPk(id);

      if (!budget) {
        return res.status(404).json({
          success: false,
          error: 'Budget not found'
        });
      }

      const {
        budgetName,
        budgetAmount,
        alertThreshold,
        description,
        status
      } = req.body;

      // Update budget
      const newBudgetAmount = budgetAmount ? parseFloat(budgetAmount) : parseFloat(budget.budgetAmount);
      const spentAmount = parseFloat(budget.spentAmount);

      await budget.update({
        budgetName: budgetName || budget.budgetName,
        budgetAmount: newBudgetAmount,
        remainingAmount: newBudgetAmount - spentAmount,
        alertThreshold: alertThreshold !== undefined ? alertThreshold : budget.alertThreshold,
        description: description !== undefined ? description : budget.description,
        status: status || budget.status
      });

      return res.status(200).json({
        success: true,
        message: 'Budget updated successfully',
        data: budget
      });
    }

    // DELETE - Soft delete budget
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Budget ID is required'
        });
      }

      const budget = await FinanceBudget.findByPk(id);

      if (!budget) {
        return res.status(404).json({
          success: false,
          error: 'Budget not found'
        });
      }

      // Soft delete
      await budget.update({ isActive: false, status: 'cancelled' });

      return res.status(200).json({
        success: true,
        message: 'Budget deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Finance Budgets API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
