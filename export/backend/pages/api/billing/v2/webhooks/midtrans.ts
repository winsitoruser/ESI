import { NextApiRequest, NextApiResponse } from 'next';
import { ProviderService } from '../../../../../src/services/billing';

/**
 * Midtrans Webhook Handler (v2 with service layer)
 * Handles payment notifications from Midtrans
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get webhook notification
    const notification = req.body;
    
    // Log raw notification for debugging
    console.log('Midtrans webhook received:', JSON.stringify(notification, null, 2));

    // Process webhook through provider service
    const result = await ProviderService.handleWebhook('midtrans', notification);

    if (!result.success) {
      console.error('Webhook processing failed:', result.error);
      return res.status(400).json({ error: result.error });
    }

    // Return success response
    res.status(200).json({ 
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
