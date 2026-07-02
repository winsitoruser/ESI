import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
/* Service layer not yet implemented — replace with direct model queries when ready */
// import { InvoiceService } from '../../../../../src/services/billing';

/**
 * API endpoint for invoice management (v2 with service layer)
 * GET - Get all invoices
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    return res.status(501).json({
      success: false,
      error: 'Service layer not implemented — InvoiceService.getInvoices not available',
    });

  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
