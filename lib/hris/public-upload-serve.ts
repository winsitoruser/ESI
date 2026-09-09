/**
 * Serve tenant-uploaded public images (letter logos, marketing banners).
 * Next.js production (`output: 'standalone'` / `next start`) does not serve
 * files added to `public/` after `next build`, so <img src="/uploads/..."> 404s.
 */
import fs from 'fs';
import path from 'path';

export const PUBLIC_UPLOAD_KINDS = ['letter-logos', 'marketing'] as const;
export type PublicUploadKind = (typeof PUBLIC_UPLOAD_KINDS)[number];

const KIND_SET = new Set<string>(PUBLIC_UPLOAD_KINDS);
const SAFE_FILE = /^[a-zA-Z0-9._-]+$/;
const SAFE_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export function publicUploadsRoot(): string {
  return path.resolve(process.cwd(), 'public', 'uploads');
}

export function isPublicUploadKind(kind: string): kind is PublicUploadKind {
  return KIND_SET.has(kind);
}

export function mimeForUploadName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

/** Resolve a kind + filename to an existing file, or null if unsafe/missing. */
export function resolvePublicUploadFile(kind: string, file: string): string | null {
  if (!isPublicUploadKind(kind)) return null;
  const base = path.basename(String(file || ''));
  if (!base || base !== String(file || '')) return null;
  if (!SAFE_FILE.test(base) || !SAFE_EXT.test(base)) return null;

  const dir = path.resolve(publicUploadsRoot(), kind);
  const full = path.resolve(dir, base);
  const dirWithSep = dir.endsWith(path.sep) ? dir : `${dir}${path.sep}`;
  if (full !== dir && !full.startsWith(dirWithSep)) return null;
  try {
    const st = fs.statSync(full);
    if (!st.isFile()) return null;
    return full;
  } catch {
    return null;
  }
}
