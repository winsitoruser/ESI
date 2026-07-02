import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');

/**
 * API endpoint for payment methods management
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
    const { PaymentMethod } = db;

    // Get payment methods
    const paymentMethods = await PaymentMethod.findAll({
      where: { tenantId },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });

    // Format response
    const formattedMethods = paymentMethods.map(method => ({
      id: method.id,
      type: method.type,
      provider: method.provider,
      name: method.name,
      description: method.description,
      details: method.details || {},
      isDefault: method.isDefault,
      isActive: method.isActive,
      metadata: method.metadata || {},
      createdAt: method.createdAt
    }));

    return res.status(200).json({
      success: true,
      data: formattedMethods
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

    const {
      type,
      provider,
      name,
      description,
      isDefault = false,
      details = {},
      metadata = {}
    } = req.body;

    const tenantId = session.user.tenantId;
    const { PaymentMethod } = db;

    // Validate required fields
    if (!type || !provider || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, provider, name'
      });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await PaymentMethod.update(
        { isDefault: false },
        { where: { tenantId } }
      );
    }

    // Set default metadata based on provider
    const defaultMetadata = {
      fees: {
        percentage: 0,
        fixed: 0
      },
      limits: {
        min: 10000,
        max: 100000000
      },
      processingTime: '1-2 hari kerja',
      ...metadata
    };

    // Set provider-specific fees
    switch (provider) {
      case 'midtrans':
        defaultMetadata.fees = {
          percentage: type === 'credit_card' ? 2.5 : 0,
          fixed: type === 'bank_transfer' ? 4500 : 0
        };
        break;
      case 'stripe':
        defaultMetadata.fees = {
          percentage: type === 'credit_card' ? 2.9 : 0,
          fixed: type === 'credit_card' ? 0.35 : 0
        };
        break;
    }

    // Create payment method
    const paymentMethod = await PaymentMethod.create({
      tenantId,
      type,
      provider,
      name,
      description,
      isDefault,
      isActive: true,
      details,
      metadata: defaultMetadata
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
