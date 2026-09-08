import type { NextApiRequest, NextApiResponse } from 'next';
import { listPublicBanners } from '@/lib/saas/landing-banners';

/**
 * Public marketing banners for landing + HR dashboard carousels.
 * Read-only. Writes live on Admin Total `/api/platform?action=banners`.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  const raw = String(req.query.placement || 'landing').toLowerCase();
  const placement = raw === 'dashboard' ? 'dashboard' : 'landing';
  try {
    const banners = await listPublicBanners(placement);
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    return res.json({ success: true, data: { banners, placement } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Gagal memuat banner' });
  }
}
