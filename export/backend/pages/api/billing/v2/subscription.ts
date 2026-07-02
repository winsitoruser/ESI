import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../auth/[...nextauth]';
import { SubscriptionService } from '../../../../src/services/billing';

/**
 * API endpoint for subscription management (v2 with service layer)
 * GET - Get current subscription
 * POST - Create or update subscription
 * PUT - Upgrade/downgrade subscription
 * DELETE - Cancel subscription
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else if (req.method === 'PUT') {
    return handlePut(req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res);
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
    const subscription = await SubscriptionService.getCurrentSubscription(tenantId);

    return res.status(200).json({
      success: true,
      data: subscription
    });

  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    
    if (error.message === 'No subscription found') {
      return res.status(404).json({ 
        success: false, 
        error: error.message 
      });
    }
    
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

    const { planId } = req.body;
    const tenantId = session.user.tenantId;

    const subscription = await SubscriptionService.createSubscription(tenantId, planId);

    return res.status(201).json({
      success: true,
      data: subscription
    });

  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { planId, immediate = false, reason } = req.body;
    const tenantId = session.user.tenantId;

    const result = await SubscriptionService.changeSubscription(tenantId, planId, {
      immediate,
      reason
    });

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { atPeriodEnd = true, reason, immediate = false } = req.body;
    const tenantId = session.user.tenantId;

    const result = await SubscriptionService.cancelSubscription(tenantId, {
      atPeriodEnd,
      reason,
      immediate
    });

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
