/**
 * Driver Photo Upload API
 *
 * Endpoint umum untuk upload foto dari aplikasi driver:
 *  - bukti inspeksi pre-trip (photos)
 *  - foto Proof of Delivery (POD) — foto barang / lokasi
 *  - struk/nota expense (receipt photo)
 *
 * Query/Form:
 *   kind = "inspection" | "pod" | "expense"  (mempengaruhi folder tujuan)
 *
 * Response:
 *   { success:true, data:[{ url, filename, size, mimetype }] }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: { bodyParser: false },
};

const ALLOWED_KINDS: Record<string, string> = {
  inspection: 'inspection',
  pod: 'pod',
  expense: 'expense',
  incident: 'incident',
  general: 'general',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const kindRaw = String(req.query.kind || 'general').toLowerCase();
    const kind = ALLOWED_KINDS[kindRaw] || 'general';

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'driver', kind);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const userId = String(session.user.id || 'anon');

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 8 * 1024 * 1024,
      maxFiles: 8,
      filter: (part) => {
        const mime = part.mimetype || '';
        return mime.startsWith('image/');
      },
      filename: (_name, ext) => {
        const rnd = Math.round(Math.random() * 1e9);
        return `${kind}-${userId.slice(0, 8)}-${Date.now()}-${rnd}${ext}`;
      },
    });

    const [_fields, files] = await new Promise<[formidable.Fields, formidable.Files]>(
      (resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      }
    );

    const entries = files.files || files.file || files.photo || files.photos;
    const arr = Array.isArray(entries) ? entries : entries ? [entries] : [];

    const uploaded = arr
      .filter(Boolean)
      .map((f: any) => ({
        url: `/uploads/driver/${kind}/${path.basename(f.filepath)}`,
        filename: f.originalFilename,
        size: f.size,
        mimetype: f.mimetype,
      }));

    if (uploaded.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'Tidak ada foto valid. Hanya gambar yang diterima.' });
    }

    return res.json({ success: true, data: uploaded });
  } catch (e: any) {
    console.error('[driver/upload] error', e?.message || e);
    return res.status(500).json({ success: false, error: e?.message || 'Upload failed' });
  }
}
