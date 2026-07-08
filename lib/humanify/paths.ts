/** Humanify platform — route & API path helpers */

export const HUMANIFY_BASE = '/humanify';
export const HUMANIFY_API = '/api/humanify';
export const HUMANIFY_LOGIN = '/humanify/login';
export const HUMANIFY_WELCOME = '/humanify/welcome';

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
