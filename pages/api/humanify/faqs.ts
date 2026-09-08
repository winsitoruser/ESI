import type { NextApiRequest, NextApiResponse } from 'next';
import { listPublishedFaqs } from '@/lib/saas/cms-content';

/**
 * Public published FAQs for the marketing landing page.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const faqs = await listPublishedFaqs();
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    return res.json({ success: true, data: { faqs } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Gagal memuat FAQ' });
  }
}
