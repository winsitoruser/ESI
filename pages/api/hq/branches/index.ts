import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

/**
 * ESI ERP — single-organization stub.
 * Cabang/multi-branch tidak dipakai; API ini mengembalikan satu entitas HQ
 * agar filter keuangan & inventori tetap berfungsi tanpa modul cabang.
 */
const ESI_HQ = {
  id: 'esi-hq',
  code: 'ESI-HQ',
  name: 'Kantor Pusat ESI',
  type: 'main',
  city: 'Jakarta',
  isActive: true,
  status: 'online',
  employeeCount: 0,
  todaySales: 0,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10);

    return res.status(200).json({
      success: true,
      data: {
        branches: [ESI_HQ],
        total: 1,
        page,
        limit,
        totalPages: 1,
      },
      branches: [ESI_HQ],
      total: 1,
    });
  } catch (error: any) {
    console.error('ESI branches stub error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
