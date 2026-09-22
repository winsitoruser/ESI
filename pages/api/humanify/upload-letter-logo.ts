import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { assertSafeUpload } from '@/lib/security/safe-upload';

export const config = {
  api: { bodyParser: false },
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = (req as any).session;
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'letter-logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 2 * 1024 * 1024,
      maxFiles: 1,
      filter: (part) => (part.mimetype || '').startsWith('image/'),
      filename: (_name, ext) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const tenantPrefix = String(session?.user?.tenantId || 't').slice(0, 8);
        const kind = String(req.query.kind || 'logo').replace(/[^a-z]/g, '') || 'logo';
        return `${kind}-${tenantPrefix}-${uniqueSuffix}${ext}`;
      },
    });

    const [, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, parsed) => {
        if (err) reject(err);
        else resolve([fields, parsed]);
      });
    });

    const fileEntry = files.file || files.logo || files.stamp;
    const file = Array.isArray(fileEntry) ? fileEntry[0] : fileEntry;
    if (!file?.filepath) {
      return res.status(400).json({ success: false, error: 'File logo tidak ditemukan. Gunakan format PNG/JPG/SVG.' });
    }

    let head: Buffer | null = null;
    try {
      const fd = fs.openSync(file.filepath, 'r');
      head = Buffer.alloc(16);
      fs.readSync(fd, head, 0, 16, 0);
      fs.closeSync(fd);
    } catch { head = null; }

    const safe = assertSafeUpload({
      mime: file.mimetype,
      originalName: file.originalFilename,
      size: file.size,
      maxBytes: 2 * 1024 * 1024,
      buffer: head,
    });
    if (!safe.ok) {
      try { fs.unlinkSync(file.filepath); } catch { /* ignore */ }
      return res.status(400).json({ success: false, error: safe.error });
    }

    const relativePath = `/uploads/letter-logos/${path.basename(file.filepath)}`;
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
    console.warn('Letter logo upload error:', error?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Upload gagal' });
  }
}

export default withHQAuth(handler, { module: 'hris' });
