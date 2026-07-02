import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
/* Service layer not yet implemented */
// import { SubscriptionService } from '../../../../src/services/billing';

/**
 * API endpoint for subscription management (v2 with service layer)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  if (req.method === 'PUT') return handlePut(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  return res.status(501).json({ success: false, error: 'Not implemented — SubscriptionService.getCurrentSubscription' });
}
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  return res.status(501).json({ success: false, error: 'Not implemented — SubscriptionService.createSubscription' });
}
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  return res.status(501).json({ success: false, error: 'Not implemented — SubscriptionService.changeSubscription' });
}
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  return res.status(501).json({ success: false, error: 'Not implemented — SubscriptionService.cancelSubscription' });
}
