/**
 * SEC-APP-015 — validate post-login redirect targets (open redirect / phishing).
 * Only same-origin relative paths under known app prefixes are allowed.
 */
const ALLOWED_PREFIXES = [
  '/humanify',
  '/platform',
  '/employee',
  '/hq',
  '/auth',
  '/onboarding',
  '/ess',
  '/mss',
  '/finance',
  '/procurement',
];

export function safeInternalPath(
  raw: string | string[] | undefined | null,
  fallback = '/humanify',
): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || typeof value !== 'string') return fallback;

  let decoded = value.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return fallback;
  }

  // Block protocol-relative and absolute URLs
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded) || decoded.startsWith('//')) {
    return fallback;
  }
  if (!decoded.startsWith('/')) return fallback;
  if (decoded.includes('\\') || decoded.includes('\0')) return fallback;
  // Path traversal / encoded tricks
  if (decoded.includes('..')) return fallback;

  const pathOnly = decoded.split('?')[0].split('#')[0];
  const ok = ALLOWED_PREFIXES.some(
    (p) => pathOnly === p || pathOnly.startsWith(`${p}/`),
  );
  return ok ? decoded : fallback;
}
