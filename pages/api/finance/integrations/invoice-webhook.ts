import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { createFinanceTransactionFromInvoice } from '../../../../lib/helpers/finance-integration';

/**
 * Webhook endpoint for Invoice payments
 * Called automatically when an invoice payment is received
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { invoice, payment } = req.body;

    if (!invoice || !payment) {
      return res.status(400).json({
        success: false,
        error: 'Invoice and payment data are required'
      });
    }

    // Validate required fields
    if (!payment.amount) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount is required'
      });
    }

    // Create finance transaction from invoice payment
    const financeTransaction = await createFinanceTransactionFromInvoice(
      invoice,
      payment,
      session.user?.id
    );

    return res.status(201).json({
      success: true,
      message: 'Finance transaction created from invoice payment',
      data: {
        financeTransactionId: financeTransaction.id,
        transactionNumber: financeTransaction.transactionNumber,
        amount: financeTransaction.amount,
        accountsUpdated: ['Cash/Bank', 'Receivables']
      }
    });

  } catch (error: any) {
    console.error('Invoice Webhook Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create finance transaction',
      details: error.message
    });
  }
}
