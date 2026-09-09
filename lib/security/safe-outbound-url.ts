/**
 * SSRF guard for attacker-controlled webhook / callback / resume URLs.
 * Only public http(s) hosts; reject loopback, RFC1918, link-local, metadata.
 */
const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.',
  'metadata.google.internal',
  'metadata.google.internal.',
]);

function isIpv4(host: string): number[] | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((n) => n > 255)) return null;
  return parts;
}

function isPrivateIpv4(parts: number[]): boolean {
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT / some metadata
  return false;
}

export function isSafeOutboundHttpUrl(raw: unknown): boolean {
  const s = String(raw || '').trim();
  if (!s) return false;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host) return false;
  if (host.includes(':')) return false; // IPv6 / zone ids
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.localhost')) return false;
  if (host === '::1' || host === '[::1]') return false;

  const ipv4 = isIpv4(host);
  if (ipv4 && isPrivateIpv4(ipv4)) return false;

  return true;
}

export function assertSafeOutboundHttpUrl(raw: unknown): string {
  const s = String(raw || '').trim();
  if (!isSafeOutboundHttpUrl(s)) {
    throw new Error('URL tidak diizinkan (harus http(s) publik)');
  }
  return s;
}
