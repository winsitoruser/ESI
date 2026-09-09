import fs from 'fs';
import path from 'path';

/**
 * Resolve a tenant logo URL into a data URL (or pass-through http URL)
 * so PDF/HTML generators can embed it.
 */
export function resolveLogoDataUrl(logoUrl?: string | null): string | null {
  if (!logoUrl) return null;
  const raw = String(logoUrl).trim();
  if (!raw) return null;
  if (raw.startsWith('data:')) return raw;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) {
    const filePath = path.join(process.cwd(), 'public', raw);
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = ext === 'jpg' ? 'jpeg' : ext === 'svg' ? 'svg+xml' : ext || 'png';
    return `data:image/${mime};base64,${buf.toString('base64')}`;
  }
  return null;
}

export function jsPdfImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' | null {
  if (dataUrl.includes('image/png')) return 'PNG';
  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) return 'JPEG';
  if (dataUrl.includes('image/webp')) return 'WEBP';
  if (dataUrl.startsWith('http')) return 'PNG';
  return 'PNG';
}
