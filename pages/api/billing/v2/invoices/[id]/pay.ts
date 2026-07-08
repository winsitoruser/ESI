import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]';

/**
 * API endpoint for invoice payment (v2 with service layer)
 * POST - Process payment for an invoice
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { id } = req.query;
    const { provider, paymentDetails } = req.body;

    if (!provider || !paymentDetails) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: provider, paymentDetails'
      });
    }

    // TODO: Implement payment processing via payment gateway
    // Legacy v2 endpoint — replaced by billing/webhooks/midtrans
    return res.status(501).json({
      success: false,
      error: 'Payment processing not implemented in v2 — use POST /api/billing/webhooks/midtrans',
    });

  } catch (error: any) {
    console.warn('Payment processing error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({
      success: false,
      error: 'Payment processing failed',
      message: error.message
    });
  }
}
