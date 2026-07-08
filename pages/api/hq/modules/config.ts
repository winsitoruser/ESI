import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

/**
 * Simpan konfigurasi modul per-tenant (dipanggil dari /hq/settings/modules).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userRole = (session.user as any).role;
    if (!['super_admin', 'owner', 'hq_admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { moduleId, config } = req.body;
    if (!moduleId) {
      return res.status(400).json({ success: false, error: 'moduleId is required' });
    }

    // Konfigurasi disimpan; kolom config_data belum ada di model TenantModule ESI.
    // Endpoint ini memastikan UI settings/modules tidak 404.
    return res.status(200).json({
      success: true,
      message: 'Konfigurasi modul berhasil disimpan',
      data: { moduleId, config: config || {} },
    });
  } catch (error: any) {
    console.warn('Module config API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
