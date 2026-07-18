import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isHumanifyHost } from '@/lib/humanify/host';
import { HUMANIFY_WELCOME } from '@/lib/humanify/paths';
import { extractTenantSlugFromHost } from '@/lib/saas/tenant-host';
import { featureForPath, isPathAllowedForPlan } from '@/lib/saas/plan-entitlements';
import { isLmsLabEnabled, isLmsLabPath } from '@/lib/humanify/lms-surface';

const authSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

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
  const host = request.headers.get('host');

  // SEO crawl endpoints — always public
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml') {
    return NextResponse.next();
  }

  // Subdomain tenant: acme.humanify.id → /c/acme/careers (apex stays welcome)
  const hostSlug = extractTenantSlugFromHost(host);
  if (hostSlug && (pathname === '/' || pathname === '/careers' || pathname === '/careers/')) {
    return NextResponse.redirect(new URL(`/c/${hostSlug}/careers`, request.url));
  }

  // humanify.id root → public landing (bukan ESI login)
  if (pathname === '/' && isHumanifyHost(host)) {
    return NextResponse.redirect(new URL(HUMANIFY_WELCOME, request.url));
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
    pathname.startsWith('/c/') ||
    pathname === '/careers' ||
    pathname.startsWith('/careers/');

  // Platform Control Plane — super_admin only (auth checked in page/API)
  if (pathname.startsWith('/platform')) {
    if (!token) {
      const loginUrl = new URL('/humanify/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

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

  // Humanify platform — pintu masuk & landing publik
  if (pathname.startsWith('/humanify')) {
    // 🚧 DEV BYPASS — lewati semua guard auth Humanify saat development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next();
    }

    if (isHumanifyPublic) {
      return NextResponse.next();
    }
    if (!token) {
      // Root Humanify → landing publik; sub-routes → login
      if (pathname === '/humanify' || pathname === '/humanify/') {
        return NextResponse.redirect(new URL('/humanify/welcome', request.url));
      }
      const loginUrl = new URL('/humanify/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
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
      token.subscriptionPlan != null &&
      !isPathAllowedForPlan(pathname, token.subscriptionPlan as string)
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

  // Root & auth — no landing page; login only
  if (
    pathname === '/' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images/') ||
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
  // Broader management check for onboarding bypass
  // Includes all HQ-level roles that should not be blocked by onboarding
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
    // Allow onboarding pages
    if (pathname.startsWith('/onboarding')) {
      return NextResponse.next();
    }

    // Allow /hq/home always — it handles its own under-review / inactive state
    if (pathname === '/hq/home') {
      return NextResponse.next();
    }

    // Use token data to check setup status (no internal fetch to avoid circular calls)
    const setupCompleted = token.setupCompleted as boolean | undefined;
    if (setupCompleted === false) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  return NextResponse.next();
}

// Disable Edge Runtime — force Node.js runtime for this middleware
// Fixes EvalError: Code generation from strings disallowed for this context
// Root cause: next-auth/jwt uses jsonwebtoken which uses new Function() banned on Edge
export const runtime = 'nodejs';
export const preferredRegion = 'auto';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|uploads/|api/|procurement|robots\\.txt|sitemap\\.xml).*)',
  ],
};
