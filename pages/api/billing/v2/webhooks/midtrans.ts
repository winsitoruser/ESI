import { NextApiRequest, NextApiResponse } from 'next';
/* Service layer not yet implemented */
// import { ProviderService } from '../../../../../src/services/billing';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(501).json({ success: false, error: 'Not implemented — ProviderService.handleWebhook' });
}
