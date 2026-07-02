import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { createFinanceTransactionFromPOS } from '../../../../lib/helpers/finance-integration';

/**
 * Webhook endpoint for POS transactions
 * Called automatically when a POS transaction is completed
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
    const { posTransaction } = req.body;

    if (!posTransaction) {
      return res.status(400).json({
        success: false,
        error: 'POS transaction data is required'
      });
    }

    // Validate required fields
    if (!posTransaction.totalAmount && !posTransaction.total) {
      return res.status(400).json({
        success: false,
        error: 'Transaction amount is required'
      });
    }

    // Create finance transaction from POS
    const financeTransaction = await createFinanceTransactionFromPOS(
      posTransaction,
      session.user?.id
    );

    return res.status(201).json({
      success: true,
      message: 'Finance transaction created from POS',
      data: {
        financeTransactionId: financeTransaction.id,
        transactionNumber: financeTransaction.transactionNumber,
        amount: financeTransaction.amount,
        accountUpdated: true
      }
    });

  } catch (error: any) {
    console.error('POS Webhook Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create finance transaction',
      details: error.message
    });
  }
}
