import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'claims');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      filter: (part) => {
        const mime = part.mimetype || '';
        return mime.startsWith('image/') || mime === 'application/pdf';
      },
      filename: (_name, ext) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        return `claim-${uniqueSuffix}${ext}`;
      }
    });

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const uploadedFiles: any[] = [];
    const fileEntries = files.files || files.file;
    const fileArray = Array.isArray(fileEntries) ? fileEntries : fileEntries ? [fileEntries] : [];

    for (const file of fileArray) {
      if (file) {
        const relativePath = `/uploads/claims/${path.basename(file.filepath)}`;
        uploadedFiles.push({
          url: relativePath,
          filename: file.originalFilename,
          size: file.size,
          mimetype: file.mimetype
        });
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid files uploaded. Only images and PDFs are accepted.' });
    }

    return res.json({ success: true, data: uploadedFiles });
  } catch (error: any) {
    console.error('Claim upload error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Upload failed' });
  }
}
