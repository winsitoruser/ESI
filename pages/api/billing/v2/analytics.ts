import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
/* Service layer not yet implemented */
// import { SubscriptionService, InvoiceService, BillingService } from '../../../../src/services/billing';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    return res.status(501).json({
      success: false,
      error: 'Not implemented — billing service layer not yet available',
    });

  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
}
