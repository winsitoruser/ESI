import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const models = require('../../../../lib/models-init');
const FinancePayable = models.FinancePayable;
const FinancePayablePayment = models.FinancePayablePayment;
const FinanceTransaction = models.FinanceTransaction;
const FinanceAccount = models.FinanceAccount;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      payableId,
      amount,
      paymentDate,
      paymentMethod,
      reference,
      paidBy,
      notes
    } = req.body;

    if (!payableId || !amount || !paymentDate || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: payableId, amount, paymentDate, paymentMethod'
      });
    }

    // Get payable
    const payable = await FinancePayable.findByPk(payableId);

    if (!payable) {
      return res.status(404).json({
        success: false,
        error: 'Payable not found'
      });
    }

    const paymentAmount = parseFloat(amount);

    // Validate payment amount
    if (paymentAmount > parseFloat(payable.remainingAmount)) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount exceeds remaining balance'
      });
    }

    // Create payment record
    const payment = await FinancePayablePayment.create({
      payableId,
      paymentDate: new Date(paymentDate),
      amount: paymentAmount,
      paymentMethod,
      reference,
      paidBy,
      notes
    });

    // Update payable
    const newPaidAmount = parseFloat(payable.paidAmount) + paymentAmount;
    const newRemainingAmount = parseFloat(payable.totalAmount) - newPaidAmount;
    
    let newStatus = payable.status;
    if (newRemainingAmount === 0) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }

    await payable.update({
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus
    });

    // Create finance transaction (expense)
    const bankAccount = await FinanceAccount.findOne({
      where: {
        accountType: 'asset',
        category: paymentMethod === 'cash' ? 'Cash' : 'Bank',
        isActive: true
      }
    });

    if (bankAccount) {
      // Generate transaction number
      const lastTransaction = await FinanceTransaction.findOne({
        order: [['createdAt', 'DESC']]
      });

      let transactionNumber = 'TRX-2026-001';
      if (lastTransaction) {
        const lastNumber = parseInt(lastTransaction.transactionNumber.split('-')[2]);
        transactionNumber = `TRX-2026-${String(lastNumber + 1).padStart(3, '0')}`;
      }

      await FinanceTransaction.create({
        transactionNumber,
        transactionDate: new Date(paymentDate),
        transactionType: 'expense',
        accountId: bankAccount.id,
        category: 'Operating',
        subcategory: 'Payable Payment',
        amount: paymentAmount,
        description: `Payment for ${payable.invoiceNumber} to ${payable.supplierName}`,
        referenceType: 'bill',
        referenceId: payableId,
        paymentMethod,
        contactName: payable.supplierName,
        notes,
        status: 'completed',
        isActive: true
      });

      // Update account balance
      await bankAccount.update({
        balance: parseFloat(bankAccount.balance) - paymentAmount
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment,
        payable: {
          id: payable.id,
          invoiceNumber: payable.invoiceNumber,
          totalAmount: payable.totalAmount,
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: newStatus
        }
      }
    });

  } catch (error: any) {
    console.error('Payable Payment API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
