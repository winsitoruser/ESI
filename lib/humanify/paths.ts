/** Humanify platform — route & API path helpers */

export const HUMANIFY_BASE = '/humanify';
export const HUMANIFY_API = '/api/humanify';
export const HUMANIFY_LOGIN = '/humanify/login';
export const HUMANIFY_SIGNUP = '/humanify/signup';
export const HUMANIFY_SETUP = '/humanify/setup';
export const HUMANIFY_WELCOME = '/humanify/welcome';

/**
 * Short public URLs on humanify.id (apex). Internal pages stay under `/humanify/*`
 * because this Next app also hosts SIMESI (`/hq`, `/auth/login`).
 */
export const HUMANIFY_SHORT_PUBLIC: Record<string, string> = {
  '/login': HUMANIFY_LOGIN,
  '/signup': HUMANIFY_SIGNUP,
  '/forgot-password': '/humanify/forgot-password',
  '/reset-password': '/humanify/reset-password',
  '/join': '/humanify/join',
  '/verify-email': '/humanify/verify-email',
};

export function rewriteHumanifyShortPublicPath(pathname: string): string | null {
  const key = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return HUMANIFY_SHORT_PUBLIC[key] || null;
}

export function humanifyPath(...segments: string[]): string {
  const tail = segments.filter(Boolean).join('/');
  return tail ? `${HUMANIFY_BASE}/${tail}` : HUMANIFY_BASE;
}

export function humanifyApi(...segments: string[]): string {
  const tail = segments.filter(Boolean).join('/');
  return tail ? `${HUMANIFY_API}/${tail}` : HUMANIFY_API;
}

/** Permission snapshot API for Humanify platform UI */
export const HUMANIFY_PERMISSIONS_API = `${HUMANIFY_API}/me/permissions`;

/** Legacy HRIS path aliases → Humanify routes */
export const HRIS_LEGACY_PREFIX = '/hq/hris';
export const HRIS_LEGACY_API = '/api/hq/hris';
