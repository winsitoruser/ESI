import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../../lib/middleware/withHQAuth';
import { findProviderByCode } from '../../../../../lib/integrations/mockProviders';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res
      .status(405)
      .json({ success: false, error: 'METHOD_NOT_ALLOWED', message: `Method ${req.method} Not Allowed` });
  }

  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION',
        message: 'Parameter code wajib diisi'
      });
    }

    const provider = findProviderByCode(code);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'PROVIDER_NOT_FOUND',
        message: `Provider dengan kode "${code}" tidak ditemukan`
      });
    }

    return res.status(200).json({ success: true, data: provider, provider });
  } catch (error) {
    console.error('Error fetching provider by code:', error);
    return res
      .status(500)
      .json({ success: false, error: 'SERVER_ERROR', message: 'Internal server error' });
  }
}

export default withHQAuth(handler, { module: 'integrations' });
