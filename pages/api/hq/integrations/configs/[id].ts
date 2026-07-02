import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../../lib/middleware/withHQAuth';
import {
  getConfigById,
  updateConfig,
  deleteConfig
} from '../../../../../lib/integrations/mockConfigs';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res
      .status(400)
      .json({ success: false, error: 'VALIDATION', message: 'ID wajib diisi' });
  }

  switch (req.method) {
    case 'GET':
      return get(res, id);
    case 'PATCH':
    case 'PUT':
      return patch(req, res, id);
    case 'DELETE':
      return del(res, id);
    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'PUT', 'DELETE']);
      return res
        .status(405)
        .json({ success: false, error: 'METHOD_NOT_ALLOWED', message: `Method ${req.method} Not Allowed` });
  }
}

function get(res: NextApiResponse, id: string) {
  const config = getConfigById(id);
  if (!config) {
    return res
      .status(404)
      .json({ success: false, error: 'CONFIG_NOT_FOUND', message: 'Konfigurasi tidak ditemukan' });
  }
  return res.status(200).json({ success: true, data: config, config });
}

function patch(req: NextApiRequest, res: NextApiResponse, id: string) {
  const current = getConfigById(id);
  if (!current) {
    return res
      .status(404)
      .json({ success: false, error: 'CONFIG_NOT_FOUND', message: 'Konfigurasi tidak ditemukan' });
  }
  const {
    name,
    environment,
    credentials,
    settings,
    status,
    isDefault,
    enabledPaymentMethods,
    feeSettings,
    merchantId,
    merchantName,
    branchId,
    branchName
  } = req.body || {};

  const updated = updateConfig(id, {
    name,
    environment,
    credentials,
    settings,
    status,
    isDefault,
    enabledPaymentMethods,
    feeSettings,
    merchantId,
    merchantName,
    branchId,
    branchName
  });
  return res
    .status(200)
    .json({ success: true, data: updated, config: updated, message: 'Konfigurasi diperbarui' });
}

function del(res: NextApiResponse, id: string) {
  const ok = deleteConfig(id);
  if (!ok) {
    return res
      .status(404)
      .json({ success: false, error: 'CONFIG_NOT_FOUND', message: 'Konfigurasi tidak ditemukan' });
  }
  return res.status(200).json({ success: true, message: 'Konfigurasi dihapus' });
}

export default withHQAuth(handler, { module: 'integrations' });
