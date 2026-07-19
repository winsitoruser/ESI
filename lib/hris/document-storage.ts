/**
 * Durable employee-document storage.
 *
 * Default: local dir outside `public/` so rsync --delete cannot wipe files.
 * Optional S3/R2 when HUMANIFY_DOC_S3_BUCKET (+ credentials) is set.
 *
 * Env:
 *   HUMANIFY_DOC_STORAGE_DIR  — absolute/relative root (default: storage/employee-documents)
 *   HUMANIFY_DOC_S3_BUCKET    — if set, put/get via S3-compatible API
 *   HUMANIFY_DOC_S3_ENDPOINT  — e.g. https://xxx.r2.cloudflarestorage.com
 *   HUMANIFY_DOC_S3_REGION    — default auto
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (or HUMANIFY_DOC_S3_*)
 */
import fs from 'fs';
import path from 'path';
import { createHash, randomBytes } from 'crypto';

export const LEGACY_PUBLIC_PREFIX = '/uploads/employee-documents/';
export const STORAGE_KEY_PREFIX = 'empdoc:';

export function getLocalStorageRoot(): string {
  const configured = process.env.HUMANIFY_DOC_STORAGE_DIR?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  }
  return path.join(process.cwd(), 'storage', 'employee-documents');
}

export function isS3Enabled(): boolean {
  return Boolean(process.env.HUMANIFY_DOC_S3_BUCKET?.trim());
}

export function ensureLocalStorageDir() {
  const root = getLocalStorageRoot();
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  return root;
}

export function makeStorageFileName(originalName: string): string {
  const ext = path.extname(originalName || '') || '';
  const unique = `${Date.now()}-${randomBytes(6).toString('hex')}`;
  return `emp-doc-${unique}${ext}`;
}

/** Persist uploaded temp file; returns DB file_url token. */
export async function persistUploadedFile(tempPath: string, originalName: string): Promise<{
  fileUrl: string;
  storageKey: string;
  fileName: string;
}> {
  const fileName = makeStorageFileName(originalName);
  const storageKey = fileName;

  if (isS3Enabled()) {
    const body = fs.readFileSync(tempPath);
    await putS3Object(storageKey, body, guessMime(originalName));
    try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
    return { fileUrl: `${STORAGE_KEY_PREFIX}${storageKey}`, storageKey, fileName: originalName };
  }

  const root = ensureLocalStorageDir();
  const dest = path.join(root, fileName);
  fs.renameSync(tempPath, dest);
  return { fileUrl: `${STORAGE_KEY_PREFIX}${storageKey}`, storageKey, fileName: originalName };
}

export function resolveLocalPathFromFileUrl(fileUrl: string): string | null {
  if (!fileUrl) return null;

  if (fileUrl.startsWith(STORAGE_KEY_PREFIX)) {
    const key = fileUrl.slice(STORAGE_KEY_PREFIX.length);
    if (key.includes('..') || key.includes('/') || key.includes('\\')) return null;
    return path.join(getLocalStorageRoot(), key);
  }

  if (fileUrl.startsWith(LEGACY_PUBLIC_PREFIX)) {
    return path.join(process.cwd(), 'public', fileUrl);
  }

  // Absolute-looking public path used historically
  if (fileUrl.startsWith('/uploads/')) {
    return path.join(process.cwd(), 'public', fileUrl);
  }

  return null;
}

export async function readDocumentBytes(fileUrl: string): Promise<{
  buffer: Buffer;
  fullPath?: string;
} | null> {
  if (!fileUrl) return null;

  if (fileUrl.startsWith(STORAGE_KEY_PREFIX) && isS3Enabled()) {
    const key = fileUrl.slice(STORAGE_KEY_PREFIX.length);
    const buffer = await getS3Object(key);
    return buffer ? { buffer } : null;
  }

  const fullPath = resolveLocalPathFromFileUrl(fileUrl);
  if (!fullPath || !fs.existsSync(fullPath)) return null;
  return { buffer: fs.readFileSync(fullPath), fullPath };
}

export async function deleteStoredFile(fileUrl?: string | null) {
  if (!fileUrl) return;

  if (fileUrl.startsWith(STORAGE_KEY_PREFIX) && isS3Enabled()) {
    try {
      await deleteS3Object(fileUrl.slice(STORAGE_KEY_PREFIX.length));
    } catch { /* ignore */ }
    return;
  }

  const fullPath = resolveLocalPathFromFileUrl(fileUrl);
  if (fullPath && fs.existsSync(fullPath)) {
    try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
  }
}

/** Fast existence check without reading bytes (local) / HEAD-ish for S3. */
export async function storedFileExists(fileUrl?: string | null): Promise<boolean> {
  if (!fileUrl) return false;
  if (fileUrl.startsWith(STORAGE_KEY_PREFIX) && isS3Enabled()) {
    try {
      const buf = await getS3Object(fileUrl.slice(STORAGE_KEY_PREFIX.length));
      return Boolean(buf && buf.length >= 0);
    } catch {
      return false;
    }
  }
  const fullPath = resolveLocalPathFromFileUrl(fileUrl);
  return Boolean(fullPath && fs.existsSync(fullPath));
}

/** HMAC token for short-lived download links (optional clients). */
export function signDownloadToken(docId: string, tenantId: string, ttlSec = 900): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.HUMANIFY_DOC_SIGN_SECRET || 'dev-doc-sign';
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${docId}.${tenantId}.${exp}`;
  const sig = createHash('sha256').update(`${payload}.${secret}`).digest('hex').slice(0, 32);
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyDownloadToken(token: string, docId: string, tenantId: string): boolean {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const [id, tid, expStr, sig] = raw.split('.');
    if (id !== docId || tid !== tenantId) return false;
    const exp = parseInt(expStr, 10);
    if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
    const secret = process.env.NEXTAUTH_SECRET || process.env.HUMANIFY_DOC_SIGN_SECRET || 'dev-doc-sign';
    const payload = `${id}.${tid}.${exp}`;
    const expected = createHash('sha256').update(`${payload}.${secret}`).digest('hex').slice(0, 32);
    return sig === expected;
  } catch {
    return false;
  }
}

function s3CredentialsPresent(): boolean {
  const accessKeyId = process.env.HUMANIFY_DOC_S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.HUMANIFY_DOC_S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  return Boolean(accessKeyId?.trim() && secretAccessKey?.trim());
}

function s3SdkAvailable(): boolean {
  try {
    require.resolve('@aws-sdk/client-s3');
    return true;
  } catch {
    return false;
  }
}

/** Ops health for document storage (local dir + S3 readiness). */
export function getDocStorageHealth(): {
  mode: 'local' | 's3';
  localRoot: string;
  localWritable: boolean;
  s3Configured: boolean;
  s3CredentialsPresent: boolean;
  s3SdkAvailable: boolean;
  s3Ready: boolean;
  outsidePublic: boolean;
  bucket?: string;
  endpoint?: string;
} {
  const localRoot = getLocalStorageRoot();
  let localWritable = false;
  try {
    ensureLocalStorageDir();
    fs.accessSync(localRoot, fs.constants.W_OK);
    localWritable = true;
  } catch {
    localWritable = false;
  }
  const publicUploads = path.join(process.cwd(), 'public', 'uploads', 'employee-documents');
  const outsidePublic = !localRoot.startsWith(path.join(process.cwd(), 'public'));
  const s3Configured = isS3Enabled();
  const creds = s3CredentialsPresent();
  const sdk = s3SdkAvailable();
  return {
    mode: s3Configured ? 's3' : 'local',
    localRoot,
    localWritable,
    s3Configured,
    s3CredentialsPresent: creds,
    s3SdkAvailable: sdk,
    s3Ready: s3Configured && creds && sdk,
    outsidePublic: outsidePublic || localRoot !== publicUploads,
    ...(s3Configured
      ? {
          bucket: process.env.HUMANIFY_DOC_S3_BUCKET?.trim(),
          endpoint: process.env.HUMANIFY_DOC_S3_ENDPOINT?.trim() || undefined,
        }
      : {}),
  };
}

/**
 * Optional live probe (HEAD/ListObjects). Skip when S3 not configured.
 * Set HUMANIFY_DOC_S3_PROBE=false to disable network check.
 */
export async function probeDocStorageConnectivity(): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
  latencyMs?: number;
}> {
  if (!isS3Enabled()) return { ok: true, skipped: true };
  if (process.env.HUMANIFY_DOC_S3_PROBE === 'false') return { ok: true, skipped: true };
  if (!s3CredentialsPresent()) return { ok: false, error: 'missing credentials' };
  const started = Date.now();
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
    const endpoint = process.env.HUMANIFY_DOC_S3_ENDPOINT || undefined;
    const region = process.env.HUMANIFY_DOC_S3_REGION || process.env.AWS_REGION || 'auto';
    const accessKeyId = process.env.HUMANIFY_DOC_S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.HUMANIFY_DOC_S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY!;
    const client = new S3Client({
      region,
      endpoint,
      forcePathStyle: Boolean(endpoint),
      credentials: { accessKeyId, secretAccessKey },
    });
    await client.send(new HeadBucketCommand({ Bucket: process.env.HUMANIFY_DOC_S3_BUCKET! }));
    return { ok: true, latencyMs: Date.now() - started };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e).slice(0, 200), latencyMs: Date.now() - started };
  }
}

function guessMime(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[ext] || 'application/octet-stream';
}

async function loadS3Client(): Promise<any | null> {
  try {
    // Optional dependency — only required when S3 mode is enabled
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const endpoint = process.env.HUMANIFY_DOC_S3_ENDPOINT || undefined;
    const region = process.env.HUMANIFY_DOC_S3_REGION || process.env.AWS_REGION || 'auto';
    const accessKeyId = process.env.HUMANIFY_DOC_S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.HUMANIFY_DOC_S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) return null;
    const client = new S3Client({
      region,
      endpoint,
      forcePathStyle: Boolean(endpoint),
      credentials: { accessKeyId, secretAccessKey },
    });
    return { client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand };
  } catch {
    return null;
  }
}

async function putS3Object(key: string, body: Buffer, contentType: string) {
  const s3 = await loadS3Client();
  if (!s3) throw new Error('S3 client unavailable — install @aws-sdk/client-s3 and set credentials');
  const Bucket = process.env.HUMANIFY_DOC_S3_BUCKET!;
  await s3.client.send(new s3.PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
}

async function getS3Object(key: string): Promise<Buffer | null> {
  const s3 = await loadS3Client();
  if (!s3) return null;
  const Bucket = process.env.HUMANIFY_DOC_S3_BUCKET!;
  const out = await s3.client.send(new s3.GetObjectCommand({ Bucket, Key: key }));
  const stream = out.Body;
  if (!stream) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function deleteS3Object(key: string) {
  const s3 = await loadS3Client();
  if (!s3) return;
  const Bucket = process.env.HUMANIFY_DOC_S3_BUCKET!;
  await s3.client.send(new s3.DeleteObjectCommand({ Bucket, Key: key }));
}
