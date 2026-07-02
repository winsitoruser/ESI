import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

const FinanceTransaction = require('../../../models/FinanceTransaction');
const FinanceAccount = require('../../../models/FinanceAccount');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // GET - List all transactions
    if (req.method === 'GET') {
      const { 
        transactionType, 
        category, 
        startDate, 
        endDate, 
        status,
        accountId,
        search 
      } = req.query;

      let whereClause: any = { isActive: true };

      if (transactionType) {
        whereClause.transactionType = transactionType;
      }

      if (category) {
        whereClause.category = category;
      }

      if (status) {
        whereClause.status = status;
      }

      if (accountId) {
        whereClause.accountId = accountId;
      }

      if (startDate && endDate) {
        whereClause.transactionDate = {
          [Op.between]: [new Date(startDate as string), new Date(endDate as string)]
        };
      }

      if (search) {
        whereClause[Op.or] = [
          { transactionNumber: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { contactName: { [Op.like]: `%${search}%` } }
        ];
      }

      const transactions = await FinanceTransaction.findAll({
        where: whereClause,
        include: [{
          model: FinanceAccount,
          as: 'account',
          attributes: ['id', 'accountNumber', 'accountName', 'accountType']
        }],
        order: [['transactionDate', 'DESC']]
      });

      // Calculate summary
      let totalIncome = 0;
      let totalExpense = 0;
      let totalTransfer = 0;

      transactions.forEach((transaction: any) => {
        const amount = parseFloat(transaction.amount);
        switch (transaction.transactionType) {
          case 'income':
            totalIncome += amount;
            break;
          case 'expense':
            totalExpense += amount;
            break;
          case 'transfer':
            totalTransfer += amount;
            break;
        }
      });

      return res.status(200).json({
        success: true,
        data: transactions,
        summary: {
          totalIncome,
          totalExpense,
          totalTransfer,
          netCashFlow: totalIncome - totalExpense,
          totalTransactions: transactions.length
        }
      });
    }

    // POST - Create new transaction
    if (req.method === 'POST') {
      const {
        transactionDate,
        transactionType,
        accountId,
        category,
        subcategory,
        amount,
        description,
        referenceType,
        referenceId,
        paymentMethod,
        contactId,
        contactName,
        attachments,
        notes,
        tags,
        isRecurring,
        recurringPattern
      } = req.body;

      // Validate required fields
      if (!transactionDate || !transactionType || !accountId || !category || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: transactionDate, transactionType, accountId, category, amount'
        });
      }

      // Validate account exists
      const account = await FinanceAccount.findByPk(accountId);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      // Generate transaction number
      const lastTransaction = await FinanceTransaction.findOne({
        order: [['createdAt', 'DESC']]
      });

      let transactionNumber = 'TRX-2026-001';
      if (lastTransaction) {
        const lastNumber = parseInt(lastTransaction.transactionNumber.split('-')[2]);
        transactionNumber = `TRX-2026-${String(lastNumber + 1).padStart(3, '0')}`;
      }

      // Create transaction
      const transaction = await FinanceTransaction.create({
        transactionNumber,
        transactionDate: new Date(transactionDate),
        transactionType,
        accountId,
        category,
        subcategory,
        amount: parseFloat(amount),
        description,
        referenceType,
        referenceId,
        paymentMethod,
        contactId,
        contactName,
        attachments,
        notes,
        tags,
        status: 'completed',
        createdBy: session.user?.id,
        isRecurring: isRecurring || false,
        recurringPattern,
        isActive: true
      });

      // Update account balance
      const amountValue = parseFloat(amount);
      if (transactionType === 'income') {
        await account.update({
          balance: parseFloat(account.balance) + amountValue
        });
      } else if (transactionType === 'expense') {
        await account.update({
          balance: parseFloat(account.balance) - amountValue
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: transaction
      });
    }

    // PUT - Update transaction
    if (req.method === 'PUT') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Transaction ID is required'
        });
      }

      const transaction = await FinanceTransaction.findByPk(id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      const {
        transactionDate,
        category,
        subcategory,
        amount,
        description,
        paymentMethod,
        contactName,
        notes,
        tags,
        status
      } = req.body;

      // If amount changed, update account balance
      if (amount && parseFloat(amount) !== parseFloat(transaction.amount)) {
        const account = await FinanceAccount.findByPk(transaction.accountId);
        if (account) {
          const oldAmount = parseFloat(transaction.amount);
          const newAmount = parseFloat(amount);
          const difference = newAmount - oldAmount;

          if (transaction.transactionType === 'income') {
            await account.update({
              balance: parseFloat(account.balance) + difference
            });
          } else if (transaction.transactionType === 'expense') {
            await account.update({
              balance: parseFloat(account.balance) - difference
            });
          }
        }
      }

      // Update transaction
      await transaction.update({
        transactionDate: transactionDate ? new Date(transactionDate) : transaction.transactionDate,
        category: category || transaction.category,
        subcategory: subcategory !== undefined ? subcategory : transaction.subcategory,
        amount: amount ? parseFloat(amount) : transaction.amount,
        description: description !== undefined ? description : transaction.description,
        paymentMethod: paymentMethod || transaction.paymentMethod,
        contactName: contactName !== undefined ? contactName : transaction.contactName,
        notes: notes !== undefined ? notes : transaction.notes,
        tags: tags !== undefined ? tags : transaction.tags,
        status: status || transaction.status
      });

      return res.status(200).json({
        success: true,
        message: 'Transaction updated successfully',
        data: transaction
      });
    }

    // DELETE - Soft delete transaction
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Transaction ID is required'
        });
      }

      const transaction = await FinanceTransaction.findByPk(id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      // Reverse account balance
      const account = await FinanceAccount.findByPk(transaction.accountId);
      if (account) {
        const amount = parseFloat(transaction.amount);
        if (transaction.transactionType === 'income') {
          await account.update({
            balance: parseFloat(account.balance) - amount
          });
        } else if (transaction.transactionType === 'expense') {
          await account.update({
            balance: parseFloat(account.balance) + amount
          });
        }
      }

      // Soft delete
      await transaction.update({ isActive: false, status: 'cancelled' });

      return res.status(200).json({
        success: true,
        message: 'Transaction deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Finance Transactions API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
