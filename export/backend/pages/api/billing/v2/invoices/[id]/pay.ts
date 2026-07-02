import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../../auth/[...nextauth]';
import { ProviderService } from '../../../../../../src/services/billing';

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

    const result = await ProviderService.processPayment(
      id as string,
      provider,
      paymentDetails
    );

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Payment processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Payment processing failed',
      message: error.message
    });
  }
}
