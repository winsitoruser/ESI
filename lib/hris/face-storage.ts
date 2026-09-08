/**
 * Private face-photo storage (enrollment + clock selfies).
 * Files live under storage/faces — not world-readable.
 */
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { FACE_KEY_PREFIX, parseImageDataUrl, sha256Hex } from './face-liveness';

export function getFaceStorageRoot(): string {
  const configured = process.env.HUMANIFY_FACE_STORAGE_DIR?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  }
  return path.join(process.cwd(), 'storage', 'faces');
}

function sanitize(seg: string): string {
  return String(seg).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'unknown';
}

export function persistFaceDataUrl(
  dataUrl: string,
  tenantId: string,
  employeeId: string,
  kind: 'enroll' | 'clock',
): { storageKey: string; bytes: number; hash: string } {
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) throw new Error('Foto wajah tidak valid');
  const root = getFaceStorageRoot();
  const tenantSeg = sanitize(tenantId);
  const empSeg = sanitize(employeeId);
  const dir = path.join(root, tenantSeg, empSeg);
  fs.mkdirSync(dir, { recursive: true });
  const name = `${kind}-${Date.now()}-${randomBytes(4).toString('hex')}.jpg`;
  const dest = path.join(dir, name);
  fs.writeFileSync(dest, parsed.buffer);
  return {
    storageKey: `${FACE_KEY_PREFIX}${tenantSeg}/${empSeg}/${name}`,
    bytes: parsed.buffer.length,
    hash: sha256Hex(parsed.buffer),
  };
}

export function readFaceFile(storageKey: string): Buffer | null {
  if (!storageKey?.startsWith(FACE_KEY_PREFIX)) return null;
  const rel = storageKey.slice(FACE_KEY_PREFIX.length);
  if (rel.includes('..') || path.isAbsolute(rel)) return null;
  const dest = path.join(getFaceStorageRoot(), rel);
  if (!fs.existsSync(dest)) return null;
  return fs.readFileSync(dest);
}

export function faceFileToDataUrl(storageKey: string): string | null {
  const buf = readFaceFile(storageKey);
  if (!buf) return null;
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}
