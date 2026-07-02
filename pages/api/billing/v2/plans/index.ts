import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
/* Service layer not yet implemented */
// import { PlanService } from '../../../../../src/services/billing';

/**
 * API endpoint for plan management (v2 with service layer)
 * GET - Get all available plans
 * POST - Create new plan (admin only)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
    return res.status(501).json({
      success: false,
      error: 'Service layer not implemented — PlanService.getPlans not available',
    });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    return res.status(500).json({
      success: false, error: 'Internal server error', message: error.message
    });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!['super_admin', 'owner'].includes(session.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    return res.status(501).json({
      success: false,
      error: 'Service layer not implemented — PlanService.createPlan not available',
    });
  } catch (error: any) {
    console.error('Error creating plan:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
}
