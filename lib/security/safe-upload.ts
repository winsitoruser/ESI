/**
 * Shared upload hardening helpers (SEC-APP-009 / SEC-TEN-006).
 */
import crypto from 'crypto';
import path from 'path';

export const SAFE_UPLOAD_MIME: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

const MAGIC: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF….WEBP checked loosely
];

export function assertSafeUpload(opts: {
  mime?: string | null;
  originalName?: string | null;
  size?: number;
  maxBytes?: number;
  buffer?: Buffer | null;
}): { ok: true; ext: string; storedName: string } | { ok: false; error: string } {
  const max = opts.maxBytes ?? 8 * 1024 * 1024;
  const size = Number(opts.size || opts.buffer?.length || 0);
  if (size <= 0) return { ok: false, error: 'File kosong' };
  if (size > max) return { ok: false, error: `File melebihi batas ${Math.round(max / 1024 / 1024)}MB` };

  const mime = String(opts.mime || '').toLowerCase();
  const allowedExts = SAFE_UPLOAD_MIME[mime];
  if (!allowedExts) return { ok: false, error: 'Tipe file tidak diizinkan' };

  const origExt = path.extname(String(opts.originalName || '')).toLowerCase();
  if (origExt && !allowedExts.includes(origExt)) {
    return { ok: false, error: 'Ekstensi file tidak cocok dengan tipe' };
  }

  if (opts.buffer && opts.buffer.length >= 4) {
    const match = MAGIC.find((m) => m.mime === mime);
    if (match) {
      const okMagic = match.bytes.every((b, i) => opts.buffer![i] === b);
      if (!okMagic && mime !== 'image/webp') {
        return { ok: false, error: 'Isi file tidak cocok dengan tipe yang diklaim' };
      }
    }
  }

  const ext = allowedExts[0];
  const storedName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  return { ok: true, ext, storedName };
}

export function tenantUploadDir(baseDir: string, tenantId: string): string {
  const safeTid = String(tenantId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(baseDir, safeTid);
}
