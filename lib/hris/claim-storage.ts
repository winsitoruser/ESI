/**
 * Private claim-receipt storage (Wave-56 / BE-1).
 * Files live outside `public/` so URLs are not world-readable.
 *
 * Env:
 *   HUMANIFY_CLAIM_STORAGE_DIR — root (default: storage/claims)
 *   NEXTAUTH_SECRET / HUMANIFY_DOC_SIGN_SECRET — HMAC for signed GET
 */
import fs from 'fs';
import path from 'path';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export const CLAIM_KEY_PREFIX = 'claim:';
export const LEGACY_PUBLIC_PREFIX = '/uploads/claims/';

export function getClaimStorageRoot(): string {
  const configured = process.env.HUMANIFY_CLAIM_STORAGE_DIR?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  }
  return path.join(process.cwd(), 'storage', 'claims');
}

export function ensureClaimStorageDir(tenantId?: string): string {
  const root = getClaimStorageRoot();
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  if (tenantId) {
    const safe = sanitizeTenantSegment(tenantId);
    const dir = path.join(root, safe);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  return root;
}

function sanitizeTenantSegment(tenantId: string): string {
  return String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'unknown';
}

export function makeClaimFileName(originalName: string): string {
  const ext = path.extname(originalName || '') || '';
  const unique = `${Date.now()}-${randomBytes(6).toString('hex')}`;
  return `claim-${unique}${ext}`;
}

export function persistClaimUpload(
  tempPath: string,
  originalName: string,
  tenantId: string,
): { storageKey: string; fileName: string; size: number } {
  const buffer = fs.readFileSync(tempPath);
  try { fs.unlinkSync(tempPath); } catch { /* temp cleanup best-effort */ }
  return persistClaimBuffer(buffer, originalName, tenantId);
}

/** Persist raw bytes (e.g. base64 from employee portal). */
export function persistClaimBuffer(
  buffer: Buffer,
  originalName: string,
  tenantId: string,
): { storageKey: string; fileName: string; size: number } {
  const fileName = makeClaimFileName(originalName);
  const tenantSeg = sanitizeTenantSegment(tenantId);
  const dir = ensureClaimStorageDir(tenantId);
  const dest = path.join(dir, fileName);
  fs.writeFileSync(dest, buffer);
  return {
    storageKey: `${CLAIM_KEY_PREFIX}${tenantSeg}/${fileName}`,
    fileName: originalName || fileName,
    size: buffer.length,
  };
}

export function resolveClaimLocalPath(storageKeyOrUrl: string): string | null {
  if (!storageKeyOrUrl) return null;

  if (storageKeyOrUrl.startsWith(CLAIM_KEY_PREFIX)) {
    const rel = storageKeyOrUrl.slice(CLAIM_KEY_PREFIX.length);
    if (rel.includes('..') || path.isAbsolute(rel)) return null;
    const parts = rel.split('/');
    if (parts.length !== 2) return null;
    return path.join(getClaimStorageRoot(), parts[0], parts[1]);
  }

  if (storageKeyOrUrl.startsWith(LEGACY_PUBLIC_PREFIX) || storageKeyOrUrl.startsWith('/uploads/claims/')) {
    return path.join(process.cwd(), 'public', storageKeyOrUrl.replace(/^\//, ''));
  }

  return null;
}

export function readClaimBytes(storageKeyOrUrl: string): Buffer | null {
  const fullPath = resolveClaimLocalPath(storageKeyOrUrl);
  if (!fullPath || !fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath);
}

function signSecret(): string {
  return process.env.NEXTAUTH_SECRET || process.env.HUMANIFY_DOC_SIGN_SECRET || 'dev-claim-sign';
}

/** Raw storage key without `claim:` prefix (tenantSeg/fileName). */
export function claimKeyWithoutPrefix(storageKey: string): string {
  return storageKey.startsWith(CLAIM_KEY_PREFIX)
    ? storageKey.slice(CLAIM_KEY_PREFIX.length)
    : storageKey;
}

/**
 * View/download URL for claim files.
 * - Browser (client): session cookie auth — no HMAC (secret is server-only).
 * - Server: short-lived HMAC for email / unauthenticated contexts.
 */
export function buildSignedClaimUrl(storageKey: string, ttlSec = 3600): string {
  const key = claimKeyWithoutPrefix(storageKey);
  if (typeof window !== 'undefined') {
    return `/api/humanify/claim-file?key=${encodeURIComponent(key)}`;
  }
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${key}.${exp}`;
  const sig = createHmac('sha256', signSecret()).update(payload).digest('hex').slice(0, 32);
  return `/api/humanify/claim-file?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
}

export function verifyClaimSignature(key: string, exp: string | number, sig: string): boolean {
  const expNum = typeof exp === 'number' ? exp : parseInt(String(exp), 10);
  if (!key || !sig || !expNum || expNum < Math.floor(Date.now() / 1000)) return false;
  if (key.includes('..') || key.includes('\\')) return false;
  const payload = `${key}.${expNum}`;
  const expected = createHmac('sha256', signSecret()).update(payload).digest('hex').slice(0, 32);
  try {
    const a = Buffer.from(String(sig));
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function guessClaimMime(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return map[ext] || 'application/octet-stream';
}

export function getClaimStorageHealth(): {
  localRoot: string;
  outsidePublic: boolean;
  localWritable: boolean;
} {
  const localRoot = getClaimStorageRoot();
  let localWritable = false;
  try {
    ensureClaimStorageDir();
    fs.accessSync(localRoot, fs.constants.W_OK);
    localWritable = true;
  } catch {
    localWritable = false;
  }
  const publicRoot = path.join(process.cwd(), 'public');
  return {
    localRoot,
    outsidePublic: !localRoot.startsWith(publicRoot),
    localWritable,
  };
}
