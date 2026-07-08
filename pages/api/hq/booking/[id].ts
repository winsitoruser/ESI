import { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'ID booking diperlukan' });
  }

  // Mock: always succeed
  return res.status(200).json({
    success: true,
    message: `Booking ${id} berhasil dihapus`,
  });
}

export default withHQAuth(handler);
