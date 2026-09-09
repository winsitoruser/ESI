/**
 * CSRF: cookie session is SameSite=Lax (NextAuth). Cross-site POST does not send the cookie.
 * Extra: if Origin is present it must match the request host (blocks odd CORS + cookie combos).
 * Missing Origin (curl, Node fetch, some native clients) is allowed.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function mutationOriginAllowed(opts: {
  method?: string | null;
  origin?: string | null;
  referer?: string | null;
  host?: string | null;
  forwardedHost?: string | null;
}): boolean {
  const method = String(opts.method || 'GET').toUpperCase();
  if (SAFE_METHODS.has(method)) return true;

  const originHeader = String(opts.origin || '').trim();
  const host = String(opts.forwardedHost || opts.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase();

  if (!originHeader) return true;
  if (!host) return true;

  try {
    const originHost = new URL(originHeader).host.toLowerCase();
    return originHost === host;
  } catch {
    return false;
  }
}

export function nextAuthSessionCookieOptions(secure: boolean): {
  httpOnly: boolean;
  sameSite: 'lax';
  path: string;
  secure: boolean;
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
  };
}
