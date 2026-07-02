import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
/* Service layer not yet implemented */
// import { ProviderService } from '../../../../../src/services/billing';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  return res.status(501).json({ success: false, error: 'Not implemented — ProviderService.getSavedPaymentMethods' });
}
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  return res.status(501).json({ success: false, error: 'Not implemented — ProviderService.savePaymentMethod' });
}
