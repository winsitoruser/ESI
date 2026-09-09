/**
 * GET /api/humanify/public-upload/letter-logos/:file
 * Fallback serve for runtime uploads that Next.js static hosting 404s after build.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import {
  mimeForUploadName,
  resolvePublicUploadFile,
} from '@/lib/hris/public-upload-serve';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const raw = req.query.path;
  const parts = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  if (parts.length !== 2) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  const [kind, file] = parts;
  const full = resolvePublicUploadFile(String(kind || ''), String(file || ''));
  if (!full) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }

  const mime = mimeForUploadName(String(file));
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'HEAD') return res.status(200).end();
  return res.status(200).send(fs.readFileSync(full));
}
