/**
 * Claim receipt attachments — parse, persist, resolve view/download URLs.
 */
import {
  buildSignedClaimUrl,
  guessClaimMime,
  persistClaimBuffer,
  CLAIM_KEY_PREFIX,
} from './claim-storage';

export type ClaimReceiptAttachment = {
  storageKey?: string;
  url: string;
  filename: string;
  mimetype: string;
  isImage: boolean;
  isPdf?: boolean;
  legacy?: boolean;
};

export type PortalClaimAttachmentInput = {
  name: string;
  type?: string;
  data?: string;
  url?: string;
  storageKey?: string;
  filename?: string;
  mimetype?: string;
};

function isImageMime(mime: string, name: string) {
  if (mime.startsWith('image/')) return true;
  return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(name);
}

export function isPdfMime(mime: string, name: string) {
  if (mime === 'application/pdf' || mime === 'application/x-pdf') return true;
  return /\.pdf$/i.test(name);
}

export function resolveClaimAttachmentUrl(item: {
  storageKey?: string;
  url?: string;
}): string {
  if (item.storageKey) {
    return buildSignedClaimUrl(item.storageKey);
  }
  if (item.url && String(item.url).startsWith('/api/humanify/claim-file')) {
    return String(item.url);
  }
  if (item.url && String(item.url).startsWith('claim:')) {
    return buildSignedClaimUrl(String(item.url));
  }
  return String(item.url || '');
}

export function parseClaimReceipts(receiptUrl?: string | null): ClaimReceiptAttachment[] {
  if (!receiptUrl?.trim()) return [];
  const raw = receiptUrl.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = raw;
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  const out: ClaimReceiptAttachment[] = [];

  for (const item of items) {
    if (!item) continue;
    if (typeof item === 'string') {
      const s = item.trim();
      if (!s) continue;
      if (s.startsWith('claim:') || s.includes('/api/humanify/claim-file') || s.startsWith('/uploads/claims/')) {
        const filename = s.split('/').pop() || 'bukti';
        const mimetype = guessClaimMime(filename);
        out.push({
          storageKey: s.startsWith('claim:') ? s : undefined,
          url: s.startsWith('claim:') ? buildSignedClaimUrl(s) : s,
          filename,
          mimetype,
          isImage: isImageMime(mimetype, filename),
          isPdf: isPdfMime(mimetype, filename),
        });
        continue;
      }
      out.push({
        url: '',
        filename: s,
        mimetype: guessClaimMime(s),
        isImage: isImageMime(guessClaimMime(s), s),
        isPdf: isPdfMime(guessClaimMime(s), s),
        legacy: true,
      });
      continue;
    }
    if (typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const storageKey = String(obj.storageKey || obj.storage_key || '');
      const url = resolveClaimAttachmentUrl({
        storageKey: storageKey || undefined,
        url: String(obj.url || ''),
      });
      const filename = String(obj.filename || obj.name || storageKey.split('/').pop() || 'bukti');
      const mimetype = String(obj.mimetype || obj.type || guessClaimMime(filename));
      if (!url && !storageKey) continue;
      // Prefer storageKey → fresh session/HMAC URL (stored JSON often omits url)
      const resolved =
        (storageKey ? buildSignedClaimUrl(storageKey.startsWith('claim:') ? storageKey : `claim:${storageKey}`) : '') ||
        url;
      out.push({
        storageKey: storageKey || undefined,
        url: resolved,
        filename,
        mimetype,
        isImage: isImageMime(mimetype, filename),
        isPdf: isPdfMime(mimetype, filename),
      });
    }
  }
  return out;
}

export function serializeClaimReceipts(files: ClaimReceiptAttachment[]): string {
  return JSON.stringify(
    files.map((f) => ({
      storageKey: f.storageKey,
      filename: f.filename,
      mimetype: f.mimetype,
    })),
  );
}

export async function persistPortalClaimAttachments(
  attachments: PortalClaimAttachmentInput[] | undefined,
  tenantId: string,
): Promise<ClaimReceiptAttachment[]> {
  if (!attachments?.length || !tenantId) return [];
  const saved: ClaimReceiptAttachment[] = [];

  for (const att of attachments) {
    if (att.storageKey) {
      const filename = att.filename || att.name || 'bukti';
      const mimetype = att.mimetype || att.type || guessClaimMime(filename);
      saved.push({
        storageKey: att.storageKey,
        url: buildSignedClaimUrl(att.storageKey),
        filename,
        mimetype,
        isImage: isImageMime(mimetype, filename),
        isPdf: isPdfMime(mimetype, filename),
      });
      continue;
    }
    if (att.url && (att.url.includes('claim-file') || att.url.startsWith('claim:'))) {
      const filename = att.filename || att.name || 'bukti';
      const mimetype = att.mimetype || att.type || guessClaimMime(filename);
      saved.push({
        storageKey: att.url.startsWith('claim:') ? att.url : att.storageKey,
        url: att.url.startsWith('claim:') ? buildSignedClaimUrl(att.url) : att.url,
        filename,
        mimetype,
        isImage: isImageMime(mimetype, filename),
        isPdf: isPdfMime(mimetype, filename),
      });
      continue;
    }
    const data = att.data || '';
    const match = /^data:([^;]+);base64,(.+)$/i.exec(data);
    if (!match) continue;
    const mimetype = att.type || match[1] || guessClaimMime(att.name);
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length) continue;
    const persisted = persistClaimBuffer(buffer, att.name || 'bukti.jpg', tenantId);
    saved.push({
      storageKey: persisted.storageKey,
      url: buildSignedClaimUrl(persisted.storageKey),
      filename: persisted.fileName,
      mimetype,
      isImage: isImageMime(mimetype, persisted.fileName),
      isPdf: isPdfMime(mimetype, persisted.fileName),
    });
  }
  return saved;
}

export function claimDownloadUrl(viewUrl: string): string {
  if (!viewUrl) return viewUrl;
  const sep = viewUrl.includes('?') ? '&' : '?';
  return `${viewUrl}${sep}download=1`;
}

export function isClaimStorageKey(value: string): boolean {
  return value.startsWith(CLAIM_KEY_PREFIX);
}
