import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

const FinanceAccount = require('../../../models/FinanceAccount');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // GET - List all accounts
    if (req.method === 'GET') {
      const { accountType, category, search } = req.query;

      let whereClause: any = { isActive: true };

      if (accountType) {
        whereClause.accountType = accountType;
      }

      if (category) {
        whereClause.category = category;
      }

      if (search) {
        whereClause[Op.or] = [
          { accountName: { [Op.like]: `%${search}%` } },
          { accountNumber: { [Op.like]: `%${search}%` } }
        ];
      }

      const accounts = await FinanceAccount.findAll({
        where: whereClause,
        order: [['accountNumber', 'ASC']]
      });

      // Calculate summary by type
      const summary = {
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        totalRevenue: 0,
        totalExpenses: 0
      };

      accounts.forEach((account: any) => {
        const balance = parseFloat(account.balance);
        switch (account.accountType) {
          case 'asset':
            summary.totalAssets += balance;
            break;
          case 'liability':
            summary.totalLiabilities += balance;
            break;
          case 'equity':
            summary.totalEquity += balance;
            break;
          case 'revenue':
            summary.totalRevenue += balance;
            break;
          case 'expense':
            summary.totalExpenses += balance;
            break;
        }
      });

      return res.status(200).json({
        success: true,
        data: accounts,
        summary
      });
    }

    // POST - Create new account
    if (req.method === 'POST') {
      const {
        accountNumber,
        accountName,
        accountType,
        category,
        parentAccountId,
        balance,
        currency,
        description
      } = req.body;

      // Validate required fields
      if (!accountNumber || !accountName || !accountType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: accountNumber, accountName, accountType'
        });
      }

      // Check if account number already exists
      const existing = await FinanceAccount.findOne({
        where: { accountNumber }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Account number already exists'
        });
      }

      // Create account
      const account = await FinanceAccount.create({
        accountNumber,
        accountName,
        accountType,
        category,
        parentAccountId,
        balance: balance || 0,
        currency: currency || 'IDR',
        description,
        isActive: true
      });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: account
      });
    }

    // PUT - Update account
    if (req.method === 'PUT') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Account ID is required'
        });
      }

      const account = await FinanceAccount.findByPk(id);

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      const {
        accountName,
        category,
        description,
        balance
      } = req.body;

      // Update account
      await account.update({
        accountName: accountName || account.accountName,
        category: category !== undefined ? category : account.category,
        description: description !== undefined ? description : account.description,
        balance: balance !== undefined ? parseFloat(balance) : account.balance
      });

      return res.status(200).json({
        success: true,
        message: 'Account updated successfully',
        data: account
      });
    }

    // DELETE - Soft delete account
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Account ID is required'
        });
      }

      const account = await FinanceAccount.findByPk(id);

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      // Soft delete
      await account.update({ isActive: false });

      return res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Finance Accounts API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
