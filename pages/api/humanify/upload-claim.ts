/**
 * POST /api/humanify/upload-claim — private claim receipt upload (Wave-56 / BE-1)
 * Files stored outside public/; response URLs are signed GET paths.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  buildSignedClaimUrl,
  ensureClaimStorageDir,
  persistClaimUpload,
} from '@/lib/hris/claim-storage';

export const config = {
  api: { bodyParser: false },
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  const tenantId = String(session?.user?.tenantId || '');
  if (!tenantId) {
    return res.status(403).json({ success: false, error: 'NO_TENANT' });
  }

  try {
    const uploadDir = ensureClaimStorageDir(tenantId);

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
      maxFiles: 5,
      filter: (part) => {
        const mime = part.mimetype || '';
        return mime.startsWith('image/') || mime === 'application/pdf';
      },
      filename: (_name, ext) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        return `claim-tmp-${uniqueSuffix}${ext}`;
      },
    });

    const [, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, parsedFiles) => {
        if (err) reject(err);
        else resolve([fields, parsedFiles]);
      });
    });

    const uploadedFiles: Array<{
      url: string;
      storageKey: string;
      filename: string;
      size: number;
      mimetype: string | null;
    }> = [];
    const fileEntries = files.files || files.file;
    const fileArray = Array.isArray(fileEntries) ? fileEntries : fileEntries ? [fileEntries] : [];

    for (const file of fileArray) {
      if (!file?.filepath) continue;
      try {
        const persisted = persistClaimUpload(
          file.filepath,
          file.originalFilename || pathBasename(file.filepath),
          tenantId,
        );
        uploadedFiles.push({
          url: buildSignedClaimUrl(persisted.storageKey),
          storageKey: persisted.storageKey,
          filename: persisted.fileName,
          size: persisted.size,
          mimetype: file.mimetype || null,
        });
      } catch (e) {
        try { fs.unlinkSync(file.filepath); } catch { /* ignore */ }
        throw e;
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid files uploaded. Only images and PDFs are accepted.',
      });
    }

    return res.json({ success: true, data: uploadedFiles });
  } catch (error: any) {
    console.warn('Claim upload error:', error?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Upload failed' });
  }
}

function pathBasename(p: string): string {
  const parts = p.split(/[/\\]/);
  return parts[parts.length - 1] || 'claim.bin';
}

export default withHQAuth(handler, { module: 'hris' });
