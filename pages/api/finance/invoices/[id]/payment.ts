import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

const db = require('../../../../../models');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { id } = req.query;
    const { amount, paymentMethod, paymentDate, referenceNumber, notes } = req.body;

    const { FinanceInvoice, FinanceInvoicePayment } = db;

    // Find invoice by invoice number
    const invoice = await FinanceInvoice.findOne({
      where: { invoiceNumber: id }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Validate payment amount
    if (amount <= 0 || amount > parseFloat(invoice.remainingAmount)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment amount'
      });
    }

    // Create payment record
    const payment = await FinanceInvoicePayment.create({
      invoiceId: invoice.id,
      amount,
      paymentMethod: paymentMethod || 'cash',
      paymentDate: paymentDate || new Date(),
      referenceNumber,
      notes,
      receivedBy: session.user.name || 'System'
    });

    // Update invoice payment status
    const newPaidAmount = parseFloat(invoice.paidAmount) + parseFloat(amount);
    const newRemainingAmount = parseFloat(invoice.totalAmount) - newPaidAmount;

    let paymentStatus = 'unpaid';
    if (newRemainingAmount <= 0) {
      paymentStatus = 'paid';
    } else if (newPaidAmount > 0) {
      paymentStatus = 'partial';
    }

    await invoice.update({
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      paymentStatus
    });

    return res.status(200).json({
      success: true,
      data: {
        payment,
        invoice: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          paymentStatus
        }
      }
    });

  } catch (error) {
    console.error('Payment API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
