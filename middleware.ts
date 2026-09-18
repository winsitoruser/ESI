import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isHumanifyHost } from '@/lib/humanify/host';
import {
  getOpsOrigin,
  isOpsAllowedPath,
  isOpsHost,
  isOpsPlatformPage,
  isPlatformOperatorRole,
  opsUrl,
} from '@/lib/humanify/ops-host';
import { HUMANIFY_WELCOME, rewriteHumanifyShortPublicPath } from '@/lib/humanify/paths';
import { extractTenantSlugFromHost } from '@/lib/saas/tenant-host';
import { featureForPath, isPathAllowedForEntitlements } from '@/lib/saas/plan-entitlements';
import { isLmsLabEnabled, isLmsLabPath } from '@/lib/humanify/lms-surface';

const authSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

function requestHost(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    ''
  );
}

export async function middleware(request: NextRequest) {
  let token: Awaited<ReturnType<typeof getToken>> = null;
  try {
    token = await getToken({
      req: request,
      secret: authSecret,
    });
  } catch (e) {
    console.error('[middleware] getToken failed:', e);
    // Avoid 500 — treat as signed out; login page can recover after env/secret fix
    token = null;
  }

  const { pathname } = request.nextUrl;
  const host = requestHost(request);
  const ops = isOpsHost(host);

  // ─── Ops / Admin Total control plane (ops.humanify.id · admin.humanify.id) ─
  if (ops) {
    // Static / health / auth always ok
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/images/') ||
      pathname.startsWith('/icons/') ||
      pathname === '/favicon.ico' ||
      pathname === '/api/health' ||
      pathname.startsWith('/api/health/') ||
      pathname === '/api/auth' ||
      pathname.startsWith('/api/auth/')
    ) {
      return NextResponse.next();
    }

    // Soft-block non-ops surfaces — do not serve tenant ESS/HQ from ops host
    if (!isOpsAllowedPath(pathname)) {
      return NextResponse.redirect(new URL('/platform', request.url));
    }

    // Unknown /platform/* (e.g. leftover HRIS deep links) → hub
    if (pathname.startsWith('/platform') && !isOpsPlatformPage(pathname) && pathname !== '/platform/') {
      return NextResponse.redirect(new URL('/platform', request.url));
    }

    // / → /platform ; /login stays public (rewritten to /platform/login)
    if (pathname === '/' || pathname === '') {
      if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.rewrite(new URL('/platform', request.url));
    }

    if (pathname === '/login' || pathname.startsWith('/login/')) {
      if (token && isPlatformOperatorRole(token.role as string)) {
        return NextResponse.redirect(new URL('/platform', request.url));
      }
      return NextResponse.rewrite(new URL('/platform/login', request.url));
    }

    // Platform pages + APIs — require ops session (host-only cookie, separate from apex)
    if (pathname.startsWith('/platform') || pathname.startsWith('/api/platform')) {
      if (pathname === '/platform/login' || pathname.startsWith('/platform/login/')) {
        return NextResponse.next();
      }
      if (!token) {
        if (pathname.startsWith('/api/platform')) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized', message: 'Login at /login on ops host' },
            { status: 401 },
          );
        }
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      if (!isPlatformOperatorRole(token.role as string)) {
        if (pathname.startsWith('/api/platform')) {
          return NextResponse.json(
            { success: false, error: 'Forbidden', message: 'Platform operators only' },
            { status: 403 },
          );
        }
        return NextResponse.redirect(new URL('/login?error=forbidden', request.url));
      }
      return NextResponse.next();
    }

    return NextResponse.next();
  }

  // ─── Apex / tenant hosts — move legacy /platform → ops subdomain ───────
  if (pathname.startsWith('/platform') || pathname.startsWith('/api/platform')) {
    if (pathname.startsWith('/api/platform')) {
      // Allow VPS loopback cron (Host: 127.0.0.1) with shared secret
      const remote = request.headers.get('x-real-ip') || '';
      const cronSecret = process.env.OBS_ALERT_CRON_SECRET || process.env.CRON_SECRET || '';
      const cronHeader = request.headers.get('x-cron-secret') || '';
      const isLoopback =
        remote === '127.0.0.1' ||
        remote === '::1' ||
        host.startsWith('127.') ||
        host.startsWith('localhost');
      if (isLoopback && cronSecret && cronHeader === cronSecret) {
        return NextResponse.next();
      }
      return NextResponse.json(
        {
          success: false,
          error: 'OPS_HOST_REQUIRED',
          message: `Use ${getOpsOrigin()} for platform APIs`,
          opsOrigin: getOpsOrigin(),
          loginUrl: opsUrl('/login'),
        },
        { status: 403 },
      );
    }
    const target = new URL(opsUrl(pathname === '/platform/' ? '/platform' : pathname));
    request.nextUrl.searchParams.forEach((v, k) => target.searchParams.set(k, v));
    return NextResponse.redirect(target, 308);
  }

  // SEO crawl + static public assets — always public
  if (
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/llms.txt' ||
    pathname === '/humans.txt' ||
    pathname === '/manifest-employee.json' ||
    pathname === '/sw-employee.js' ||
    pathname === '/service-worker.js' ||
    pathname === '/.well-known/security.txt' ||
    pathname.startsWith('/.well-known/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/videos/')
  ) {
    return NextResponse.next();
  }

  // Subdomain tenant: acme.humanify.id → /c/acme/careers (apex stays welcome)
  const hostSlug = extractTenantSlugFromHost(host);
  if (hostSlug && (pathname === '/' || pathname === '/careers' || pathname === '/careers/')) {
    return NextResponse.redirect(new URL(`/c/${hostSlug}/careers`, request.url));
  }

  // humanify.id root → landing di URL pendek `/` (rewrite, bukan redirect ke /humanify/welcome)
  if (pathname === '/' && isHumanifyHost(host)) {
    return NextResponse.rewrite(new URL(HUMANIFY_WELCOME, request.url));
  }

  // humanify.id/login → aplikasi login (bukan /auth/login SIMESI)
  if (isHumanifyHost(host)) {
    const shortDest = rewriteHumanifyShortPublicPath(pathname);
    if (shortDest) {
      const dest = new URL(shortDest, request.url);
      request.nextUrl.searchParams.forEach((v, k) => dest.searchParams.set(k, v));
      return NextResponse.rewrite(dest);
    }
  }

  // Canonical singkat: /humanify/welcome → / pada domain Humanify
  if (
    isHumanifyHost(host) &&
    (pathname === HUMANIFY_WELCOME || pathname === `${HUMANIFY_WELCOME}/`)
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const isHumanifyPublic =
    pathname === '/humanify/login' ||
    pathname === '/humanify/signup' ||
    pathname === '/humanify/verify-email' ||
    pathname === '/humanify/forgot-password' ||
    pathname === '/humanify/reset-password' ||
    pathname === '/humanify/join' ||
    pathname === '/humanify/welcome' ||
    pathname.startsWith('/humanify/welcome/') ||
    pathname === '/humanify/blog' ||
    pathname.startsWith('/humanify/blog/') ||
    pathname === '/humanify/admin-login' ||
    pathname === '/humanify/partners' ||
    pathname.startsWith('/humanify/partners/') ||
    pathname === '/humanify/pricing/roi-calculator' ||
    pathname.startsWith('/humanify/pricing/') ||
    pathname.startsWith('/c/') ||
    pathname === '/careers' ||
    pathname.startsWith('/careers/');

  // Public multi-tenant careers portals (no auth)
  if (pathname.startsWith('/c/') || pathname === '/careers' || pathname.startsWith('/careers/')) {
    return NextResponse.next();
  }

  // humanify.id — arahkan legacy ESI login ke portal karyawan jika target /employee
  if (pathname === '/auth/login' && isHumanifyHost(host)) {
    const callback = request.nextUrl.searchParams.get('callbackUrl') || '';
    if (callback === '/employee' || callback.startsWith('/employee/')) {
      const dest = new URL('/employee/login', request.url);
      if (callback !== '/employee') dest.searchParams.set('callbackUrl', callback);
      return NextResponse.redirect(dest);
    }
  }

  // Humanify tenant app
  if (pathname.startsWith('/humanify')) {
    // 🚧 DEV BYPASS — lewati semua guard auth Humanify saat development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next();
    }

    if (isHumanifyPublic) {
      return NextResponse.next();
    }
    if (!token) {
      // Root Humanify → landing publik di `/` (URL pendek)
      if (pathname === '/humanify' || pathname === '/humanify/') {
        return NextResponse.redirect(new URL('/', request.url));
      }
      const loginUrl = new URL('/humanify/login', request.url);
      loginUrl.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search || ''}`);
      return NextResponse.redirect(loginUrl);
    }

    // Owner belum selesai setup wizard → arahkan ke /humanify/setup
    const userRole = (token.role as string)?.toLowerCase() || '';
    const bypassSetup = ['super_admin', 'superadmin', 'platform_admin'].includes(userRole);
    const setupDone = token.setupCompleted !== false;
    if (
      !bypassSetup &&
      userRole === 'owner' &&
      !setupDone &&
      !pathname.startsWith('/humanify/setup')
    ) {
      return NextResponse.redirect(new URL('/humanify/setup', request.url));
    }

    // H3 — tenant wajib 2FA: paksa enrol di /humanify/security
    if (
      !bypassSetup &&
      token.mfaSetupRequired === true &&
      !pathname.startsWith('/humanify/security') &&
      !pathname.startsWith('/api/')
    ) {
      return NextResponse.redirect(new URL('/humanify/security', request.url));
    }

    // Plan entitlement — block deep links to features not in plan
    const alwaysAllow = [
      '/humanify/billing',
      '/humanify/security',
      '/humanify/setup',
      '/humanify/welcome',
    ];
    const allowCoreNav =
      pathname === '/humanify' ||
      pathname === '/humanify/' ||
      alwaysAllow.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (
      !bypassSetup &&
      !allowCoreNav &&
      !isPathAllowedForEntitlements(
        pathname,
        (token.subscriptionPlan as string | null) ?? 'starter',
        { lms: Boolean(token.addonLms), ai: Boolean(token.addonAi) },
      )
    ) {
      const feat = featureForPath(pathname);
      const url = new URL('/humanify/billing', request.url);
      url.searchParams.set('upgrade', feat);
      return NextResponse.redirect(url);
    }

    // LMS lab surface — redirect advanced URLs to GA hub unless HUMANIFY_LMS_LAB=true
    if (
      !bypassSetup &&
      !isLmsLabEnabled() &&
      isLmsLabPath(pathname)
    ) {
      const url = new URL('/humanify/lms', request.url);
      url.searchParams.set('lab', 'gated');
      return NextResponse.redirect(url);
    }
  }

  // API MFA enrollment gate (Wave-81) — allowlist only auth/MFA/webhooks/health
  if (
    pathname.startsWith('/api/') &&
    token?.mfaSetupRequired === true &&
    process.env.NODE_ENV !== 'development'
  ) {
    const mfaApiAllow = [
      '/api/auth',
      '/api/humanify/mfa',
      '/api/health',
      '/api/humanify/webhooks',
      '/api/humanify/claim-file',
    ];
    const pathOnly = pathname.split('?')[0];
    const allowedPath = mfaApiAllow.some((p) => pathOnly === p || pathOnly.startsWith(`${p}/`));
    if (!allowedPath) {
      return NextResponse.json(
        { success: false, error: 'MFA_SETUP_REQUIRED', message: 'Complete 2FA enrollment first' },
        { status: 403 },
      );
    }
  }

  // Root & auth — no landing page; login only
  if (
    pathname === '/' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/videos/') ||
    pathname.startsWith('/uploads/') ||
    pathname.startsWith('/procurement') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated (rute non-Humanify)
  if (!token) {
    if (pathname === '/employee/login') {
      return NextResponse.next();
    }
    if (pathname === '/employee' || pathname.startsWith('/employee/')) {
      const loginUrl = new URL('/employee/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRoleNorm = (token.role as string)?.toLowerCase() || '';
  const isAdmin   = ['admin', 'super_admin', 'superadmin'].includes(userRoleNorm);
  const isDriver  = ['driver', 'fleet_driver', 'armada'].includes(userRoleNorm);
  const isManagement = isAdmin || ['hq_admin', 'owner', 'manager', 'branch_manager', 'manager_toko', 'finance_staff', 'hr_staff', 'hris_staff', 'auditor', 'regulator'].includes(userRoleNorm);

  // Admin routes - only for admin/super_admin
  if (pathname.startsWith('/admin/')) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL(isDriver ? '/driver' : '/hq/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Driver portal — only for users with driver role (admin boleh masuk utk support)
  if (pathname === '/driver' || pathname.startsWith('/driver/')) {
    if (!isDriver && !isAdmin) {
      return NextResponse.redirect(new URL('/hq/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Sebaliknya: cegah driver mengakses HQ back-office (kecuali admin overlap)
  if (isDriver && pathname.startsWith('/hq/')) {
    return NextResponse.redirect(new URL('/driver', request.url));
  }

  // Check if tenant needs onboarding (for non-management users)
  if (!isManagement) {
    if (pathname.startsWith('/onboarding')) {
      return NextResponse.next();
    }

    if (pathname === '/hq/home') {
      return NextResponse.next();
    }

    const setupCompleted = token.setupCompleted as boolean | undefined;
    if (setupCompleted === false) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  return NextResponse.next();
}

// Disable Edge Runtime — force Node.js runtime for this middleware
export const runtime = 'nodejs';
export const preferredRegion = 'auto';

export const config = {
  matcher: [
    '/api/platform',
    '/api/platform/:path*',
    '/((?!_next/static|_next/image|favicon.ico|images/|videos/|icons/|uploads/|api/|procurement|robots\\.txt|sitemap\\.xml|llms\\.txt|humans\\.txt|manifest-employee\\.json|sw-employee\\.js|service-worker\\.js|\\.well-known/).*)',
  ],
};
