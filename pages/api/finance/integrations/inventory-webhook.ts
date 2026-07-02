import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { createFinanceTransactionFromPurchase } from '../../../../lib/helpers/finance-integration';

/**
 * Webhook endpoint for Inventory purchases
 * Called automatically when a purchase order is completed/paid
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
    const { purchaseOrder } = req.body;

    if (!purchaseOrder) {
      return res.status(400).json({
        success: false,
        error: 'Purchase order data is required'
      });
    }

    // Validate required fields
    if (!purchaseOrder.totalAmount && !purchaseOrder.total) {
      return res.status(400).json({
        success: false,
        error: 'Purchase amount is required'
      });
    }

    // Create finance transaction from purchase
    const financeTransaction = await createFinanceTransactionFromPurchase(
      purchaseOrder,
      session.user?.id
    );

    return res.status(201).json({
      success: true,
      message: 'Finance transaction created from purchase order',
      data: {
        financeTransactionId: financeTransaction.id,
        transactionNumber: financeTransaction.transactionNumber,
        amount: financeTransaction.amount,
        status: financeTransaction.status,
        accountUpdated: financeTransaction.status === 'completed'
      }
    });

  } catch (error: any) {
    console.error('Inventory Webhook Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create finance transaction',
      details: error.message
    });
  }
}
