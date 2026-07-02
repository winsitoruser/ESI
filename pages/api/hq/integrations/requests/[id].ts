import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../../lib/middleware/withHQAuth';
import {
  getRequestById,
  updateRequest
} from '../../../../../lib/integrations/mockRequests';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res
      .status(400)
      .json({ success: false, error: 'VALIDATION', message: 'ID wajib diisi' });
  }

  switch (req.method) {
    case 'GET': {
      const r = getRequestById(id);
      if (!r)
        return res
          .status(404)
          .json({ success: false, error: 'REQUEST_NOT_FOUND', message: 'Pengajuan tidak ditemukan' });
      return res.status(200).json({ success: true, data: r, request: r });
    }
    case 'PATCH':
    case 'PUT': {
      const existing = getRequestById(id);
      if (!existing)
        return res
          .status(404)
          .json({ success: false, error: 'REQUEST_NOT_FOUND', message: 'Pengajuan tidak ditemukan' });
      const updated = updateRequest(id, req.body || {});
      return res
        .status(200)
        .json({ success: true, data: updated, request: updated, message: 'Pengajuan diperbarui' });
    }
    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'PUT']);
      return res
        .status(405)
        .json({ success: false, error: 'METHOD_NOT_ALLOWED', message: `Method ${req.method} Not Allowed` });
  }
}

export default withHQAuth(handler, { module: 'integrations' });
