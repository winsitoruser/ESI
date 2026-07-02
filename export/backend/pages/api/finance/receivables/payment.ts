import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const models = require('../../../../lib/models-init');
const FinanceReceivable = models.FinanceReceivable;
const FinanceReceivablePayment = models.FinanceReceivablePayment;
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
      receivableId,
      amount,
      paymentDate,
      paymentMethod,
      reference,
      receivedBy,
      notes
    } = req.body;

    if (!receivableId || !amount || !paymentDate || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: receivableId, amount, paymentDate, paymentMethod'
      });
    }

    // Get receivable
    const receivable = await FinanceReceivable.findByPk(receivableId);

    if (!receivable) {
      return res.status(404).json({
        success: false,
        error: 'Receivable not found'
      });
    }

    const paymentAmount = parseFloat(amount);

    // Validate payment amount
    if (paymentAmount > parseFloat(receivable.remainingAmount)) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount exceeds remaining balance'
      });
    }

    // Create payment record
    const payment = await FinanceReceivablePayment.create({
      receivableId,
      paymentDate: new Date(paymentDate),
      amount: paymentAmount,
      paymentMethod,
      reference,
      receivedBy,
      notes
    });

    // Update receivable
    const newPaidAmount = parseFloat(receivable.paidAmount) + paymentAmount;
    const newRemainingAmount = parseFloat(receivable.totalAmount) - newPaidAmount;
    
    let newStatus = receivable.status;
    if (newRemainingAmount === 0) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }

    await receivable.update({
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus
    });

    // Create finance transaction (income)
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
        transactionType: 'income',
        accountId: bankAccount.id,
        category: 'Sales',
        subcategory: 'Receivable Payment',
        amount: paymentAmount,
        description: `Payment for ${receivable.invoiceNumber} from ${receivable.customerName}`,
        referenceType: 'invoice',
        referenceId: receivableId,
        paymentMethod,
        contactName: receivable.customerName,
        notes,
        status: 'completed',
        isActive: true
      });

      // Update account balance
      await bankAccount.update({
        balance: parseFloat(bankAccount.balance) + paymentAmount
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment,
        receivable: {
          id: receivable.id,
          invoiceNumber: receivable.invoiceNumber,
          totalAmount: receivable.totalAmount,
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: newStatus
        }
      }
    });

  } catch (error: any) {
    console.error('Receivable Payment API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
