import type { NextApiRequest, NextApiResponse } from 'next';
import { listPublishedArticles } from '@/lib/saas/cms-articles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const articles = await listPublishedArticles(20);
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    return res.json({ success: true, data: { articles } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Gagal memuat artikel' });
  }
}
