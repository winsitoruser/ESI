import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../../../lib/middleware/withHQAuth';
import {
  getConfigById,
  updateConfig
} from '../../../../../../lib/integrations/mockConfigs';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res
      .status(405)
      .json({ success: false, error: 'METHOD_NOT_ALLOWED', message: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res
      .status(400)
      .json({ success: false, error: 'VALIDATION', message: 'ID wajib diisi' });
  }

  const config = getConfigById(id);
  if (!config) {
    return res
      .status(404)
      .json({ success: false, error: 'CONFIG_NOT_FOUND', message: 'Konfigurasi tidak ditemukan' });
  }

  // MOCK: 90% simulasi sukses. Pada implementasi nyata, lakukan ping ke
  // endpoint provider (mis. GET /v1/ping) menggunakan credentials yang
  // sudah didekripsi dari `config.credentials`.
  const success = Math.random() > 0.1;
  const latency = 100 + Math.floor(Math.random() * 400);
  const now = new Date().toISOString();

  const updated = updateConfig(id, {
    lastTestedAt: now,
    lastTestResult: {
      success,
      latency,
      message: success ? 'Koneksi berhasil' : 'Koneksi gagal: timeout ke provider'
    }
  });

  return res.status(200).json({
    success: true,
    data: {
      success,
      latency,
      testedAt: now,
      config: updated
    },
    message: success
      ? `Test koneksi berhasil (${latency}ms)`
      : 'Test koneksi gagal. Periksa kembali credentials Anda.'
  });
}

export default withHQAuth(handler, { module: 'integrations' });
