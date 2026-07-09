/**
 * Receipt OCR API
 * POST { imageBase64?, text?, filename?, mimeType? }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { processReceiptOCR } from '@/lib/hris/receipt-ocr';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ success: false, error: 'Unauthorized' });

  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { imageBase64, text, filename, mimeType } = req.body || {};
    if (!imageBase64 && !text && !filename) {
      return res.status(400).json({ success: false, error: 'imageBase64, text, or filename required' });
    }

    const result = await processReceiptOCR({ imageBase64, text, filename, mimeType });
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'OCR failed' });
  }
}
