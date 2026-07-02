import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../auth/[...nextauth]';
import { ProviderService } from '../../../../../src/services/billing';

/**
 * API endpoint for payment methods management (v2 with service layer)
 * GET - Get all payment methods
 * POST - Create new payment method
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
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

    const tenantId = session.user.tenantId;
    const paymentMethods = await ProviderService.getSavedPaymentMethods(tenantId);

    return res.status(200).json({
      success: true,
      data: paymentMethods
    });

  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const tenantId = session.user.tenantId;
    const { provider, type, name, description, isDefault, details, metadata } = req.body;

    const paymentMethod = await ProviderService.savePaymentMethod(tenantId, provider, {
      type,
      name,
      description,
      isDefault,
      details,
      metadata
    });

    return res.status(201).json({
      success: true,
      data: paymentMethod
    });

  } catch (error: any) {
    console.error('Error creating payment method:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
