/**
 * Receipt OCR API
 * POST { imageBase64?, text?, filename?, mimeType? }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { processReceiptOCR } from '@/lib/hris/receipt-ocr';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
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

export default withHQAuth(handler, { module: 'hris' });
