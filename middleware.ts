import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

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

  const isHumanifyPublic =
    pathname === '/humanify/login' ||
    pathname === '/humanify/welcome' ||
    pathname.startsWith('/humanify/welcome/');

  // Humanify platform — pintu masuk & landing publik
  if (pathname.startsWith('/humanify')) {
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
  }

  // Root & auth — no landing page; login only
  if (
    pathname === '/' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/procurement') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated (rute non-Humanify)
  if (!token) {
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
    '/((?!_next/static|_next/image|favicon.ico|api/|procurement).*)',
  ],
};
