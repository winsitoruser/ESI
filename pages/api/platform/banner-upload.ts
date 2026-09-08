import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { assertOpsApiHost } from '@/lib/humanify/assert-ops-host';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';

export const config = {
  api: { bodyParser: false },
};

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/**
 * Admin Total — upload public marketing banner images.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!assertOpsApiHost(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!isPlatformOperator((session.user as any).role)) {
    return res.status(403).json({ success: false, error: 'Platform operator only' });
  }

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'marketing');
    fs.mkdirSync(uploadDir, { recursive: true });

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 2 * 1024 * 1024,
      maxFiles: 1,
      filter: (part) => ALLOWED.has(String(part.mimetype || '')),
      filename: (_name, ext) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        return `banner-${unique}${ext || '.jpg'}`;
      },
    });

    const [, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, parsed) => {
        if (err) reject(err);
        else resolve([fields, parsed]);
      });
    });

    const fileEntry = files.file || files.image || files.banner;
    const file = Array.isArray(fileEntry) ? fileEntry[0] : fileEntry;
    if (!file?.filepath) {
      return res.status(400).json({ success: false, error: 'File gambar tidak ditemukan (JPG/PNG/WebP, maks 2 MB).' });
    }
    const mime = String(file.mimetype || '');
    if (mime && !ALLOWED.has(mime)) {
      try { fs.unlinkSync(file.filepath); } catch { /* */ }
      return res.status(400).json({ success: false, error: 'Format tidak didukung. Gunakan JPG, PNG, atau WebP.' });
    }

    const relativePath = `/uploads/marketing/${path.basename(file.filepath)}`;
    return res.json({
      success: true,
      data: {
        url: relativePath,
        filename: file.originalFilename,
        size: file.size,
        mimetype: file.mimetype,
      },
    });
  } catch (error: any) {
    console.warn('[banner-upload]', error?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Upload gagal' });
  }
}
