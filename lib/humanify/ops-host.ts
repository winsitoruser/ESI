/**
 * Humanify Platform Ops / Admin Total control plane.
 * Hosts: ops.humanify.id (legacy) and admin.humanify.id (Admin Total).
 * Separates SaaS operator UI/API from the public tenant surface.
 */

const DEFAULT_OPS_HOST = 'ops.humanify.id';
const DEFAULT_ADMIN_HOST = 'admin.humanify.id';

function normalizeHost(host: string | null | undefined): string {
  if (!host) return '';
  return String(host).split(',')[0].trim().split(':')[0].toLowerCase();
}

function envHost(keys: string[], fallback: string): string {
  for (const key of keys) {
    const fromEnv = String(process.env[key] || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split(':')[0];
    if (fromEnv && fromEnv !== 'undefined' && fromEnv !== 'null') return fromEnv;
  }
  return fallback;
}

/** Hostname for the ops control plane (no port). */
export function getOpsHost(): string {
  return envHost(['HUMANIFY_OPS_HOST', 'NEXT_PUBLIC_HUMANIFY_OPS_HOST'], DEFAULT_OPS_HOST);
}

/** Hostname for Admin Total (platform superadmin). */
export function getAdminHost(): string {
  return envHost(['HUMANIFY_ADMIN_HOST', 'NEXT_PUBLIC_HUMANIFY_ADMIN_HOST'], DEFAULT_ADMIN_HOST);
}

/** True when Host is Admin Total (admin.humanify.id). */
export function isAdminHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host);
  if (!h) return false;
  if (h === getAdminHost()) return true;
  if (h === 'admin.localhost' || h === 'admin.127.0.0.1') return true;
  if (h.startsWith('admin.') && (h.endsWith('.localhost') || h.endsWith('.local'))) return true;
  return false;
}

/** True when Host is the platform control plane (ops or Admin Total). */
export function isOpsHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host);
  if (!h) return false;
  if (h === getOpsHost()) return true;
  if (h === 'ops.localhost' || h === 'ops.127.0.0.1') return true;
  if (h.startsWith('ops.') && (h.endsWith('.localhost') || h.endsWith('.local'))) return true;
  return isAdminHost(h);
}

/** Absolute origin for ops (https in prod). */
export function getOpsOrigin(): string {
  const host = getOpsHost();
  const proto =
    process.env.HUMANIFY_OPS_PROTOCOL ||
    (host.includes('localhost') || host.endsWith('.local') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** Absolute origin for Admin Total. */
export function getAdminOrigin(): string {
  const host = getAdminHost();
  const proto =
    process.env.HUMANIFY_ADMIN_PROTOCOL ||
    (host.includes('localhost') || host.endsWith('.local') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** Public apex origin (tenant / marketing). */
export function getApexOrigin(): string {
  const raw =
    process.env.NEXTAUTH_URL ||
    process.env.HUMANIFY_PUBLIC_URL ||
    process.env.APP_URL ||
    'https://humanify.id';
  try {
    return new URL(raw).origin;
  } catch {
    return 'https://humanify.id';
  }
}

/** Browser-safe ops origin (NEXT_PUBLIC override for non-default hosts). */
export function getPublicOpsOrigin(): string {
  if (typeof window !== 'undefined') {
    try {
      if (isOpsHost(window.location.host)) return window.location.origin;
    } catch { /* */ }
  }
  const fromEnv = String(process.env.NEXT_PUBLIC_HUMANIFY_OPS_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return getOpsOrigin();
}

/** Build absolute ops URL for a path (must start with /). */
export function opsUrl(path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOpsOrigin()}${p}`;
}

/** Exact UI routes allowed on the ops control plane (plus login + API). */
export const OPS_PLATFORM_PAGES = [
  '/platform',
  '/platform/clients',
  '/platform/partners',
  '/platform/billing',
  '/platform/observability',
  '/platform/audit',
  '/platform/support',
  '/platform/users',
  '/platform/system',
  '/platform/banners',
  '/platform/subscriptions',
  '/platform/products',
  '/platform/finance',
  '/platform/crm',
  '/platform/marketing',
  '/platform/content',
  '/platform/analytics',
  '/platform/approvals',
  '/platform/roles',
  '/platform/insights',
  '/platform/demo-checklist',
] as const;

/**
 * Supporting ops pages (not in primary nav, still control-plane only):
 * - /platform/tenants/:id — detail dari Clients
 * - /platform/email-preview — dari Observability
 * - /platform/audit — jejak aksi operator
 * - /platform/support — antrean trial/unpaid/risiko
 * - /platform/users — direktori operator & tenant
 * - /platform/system — scorecard infra (tanpa secret)
 * - /platform/banners — CMS carousel landing + dashboard
 * - /platform/login — auth shell
 */
export function isOpsPlatformPage(pathname: string): boolean {
  const path = (pathname.split('?')[0] || '/').replace(/\/$/, '') || '/';
  if (path === '/platform/login' || path.startsWith('/platform/login/')) return true;
  if (OPS_PLATFORM_PAGES.includes(path as (typeof OPS_PLATFORM_PAGES)[number])) return true;
  if (/^\/platform\/tenants\/[^/]+$/.test(path)) return true;
  if (path === '/platform/email-preview') return true;
  return false;
}

/** Paths allowed on the ops host (everything else is blocked / redirected). */
export function isOpsAllowedPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '') return true;
  if (pathname === '/login' || pathname.startsWith('/login/')) return true;
  if (isOpsPlatformPage(pathname)) return true;
  if (pathname === '/api/platform' || pathname.startsWith('/api/platform/')) return true;
  if (pathname === '/api/auth' || pathname.startsWith('/api/auth/')) return true;
  if (pathname === '/api/health' || pathname.startsWith('/api/health/')) return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/images/') || pathname.startsWith('/icons/')) return true;
  if (pathname.startsWith('/uploads/')) return true;
  if (pathname === '/favicon.ico') return true;
  return false;
}

export function isPlatformOperatorRole(role: string | null | undefined): boolean {
  const r = String(role || '').toLowerCase();
  return r === 'super_admin' || r === 'superadmin' || r === 'platform_admin';
}
