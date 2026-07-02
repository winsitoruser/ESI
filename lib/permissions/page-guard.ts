import type { GetServerSidePropsContext } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import {
  resolvePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions
} from './permission-resolver';

// =======================================================================
// requirePagePermission — server-side guard untuk getServerSideProps.
// =======================================================================
// Memastikan halaman HANYA dapat di-render di server bila user memenuhi
// permission. Bila tidak, redirect ke /hq/access-denied dengan query info.
//
// Contoh pemakaian:
//
//   export const getServerSideProps: GetServerSideProps = async (ctx) => {
//     const guard = await requirePagePermission(ctx, { permission: 'reports.finance.pnl' });
//     if (guard.redirect || guard.notFound) return guard;
//     return { props: { user: guard.user } };
//   };
//
// =======================================================================

export interface RequirePagePermissionOptions {
  permission?: string;
  anyPermission?: string[];
  allPermissions?: string[];
  roles?: string[];
  minLevel?: number;
  /** Redirect path jika tidak authenticated. Default: /login */
  loginPath?: string;
  /** Redirect path jika authenticated tapi tidak cukup permission. */
  deniedPath?: string;
}

export type GuardSuccess = {
  user: any;
  permissions: Record<string, boolean>;
  isSuperAdmin: boolean;
  roleCode: string | null;
  roleLevel: number | null;
};

type GuardResult =
  | GuardSuccess
  | { redirect: { destination: string; permanent: boolean } }
  | { notFound: true };

export async function requirePagePermission(
  ctx: GetServerSidePropsContext,
  options: RequirePagePermissionOptions = {}
): Promise<GuardResult> {
  const loginPath = options.loginPath || '/login';
  const deniedPath = options.deniedPath || '/hq/access-denied';

  const session = (await getServerSession(ctx.req, ctx.res, authOptions as any)) as any;
  if (!session?.user) {
    return {
      redirect: {
        destination: `${loginPath}?from=${encodeURIComponent(ctx.resolvedUrl || '/hq')}`,
        permanent: false
      }
    };
  }

  // Attach ke pseudo-req agar resolver dapat membaca session
  (ctx.req as any).session = session;
  const permCtx = await resolvePermissions(ctx.req as any);

  // Bypass untuk super admin
  if (permCtx.isSuperAdmin) {
    return {
      user: session.user,
      permissions: permCtx.permissions,
      isSuperAdmin: true,
      roleCode: permCtx.roleCode,
      roleLevel: permCtx.roleLevel
    };
  }

  const userRole = (permCtx.roleCode || permCtx.role || '').toUpperCase();

  // Role check
  if (options.roles && options.roles.length) {
    const expected = options.roles.map(r => r.toUpperCase());
    if (!expected.includes(userRole)) {
      return buildDenied(deniedPath, { required: `role: ${expected.join('|')}` });
    }
  }

  // Level check
  if (typeof options.minLevel === 'number') {
    if (permCtx.roleLevel == null || permCtx.roleLevel > options.minLevel) {
      return buildDenied(deniedPath, { required: `level≤${options.minLevel}` });
    }
  }

  // Permission checks
  if (options.permission && !hasPermission(permCtx.permissions, options.permission)) {
    return buildDenied(deniedPath, { required: options.permission });
  }
  if (options.anyPermission && !hasAnyPermission(permCtx.permissions, options.anyPermission)) {
    return buildDenied(deniedPath, { required: options.anyPermission.join('|') });
  }
  if (options.allPermissions && !hasAllPermissions(permCtx.permissions, options.allPermissions)) {
    const missing = options.allPermissions.filter(p => !hasPermission(permCtx.permissions, p));
    return buildDenied(deniedPath, { required: missing.join(',') });
  }

  return {
    user: session.user,
    permissions: permCtx.permissions,
    isSuperAdmin: false,
    roleCode: permCtx.roleCode,
    roleLevel: permCtx.roleLevel
  };
}

function buildDenied(
  path: string,
  query: Record<string, string>
): { redirect: { destination: string; permanent: boolean } } {
  const qs = new URLSearchParams(query).toString();
  return {
    redirect: {
      destination: `${path}${qs ? `?${qs}` : ''}`,
      permanent: false
    }
  };
}

// =======================================================================
// Simple util: build multiple guards (OR/AND semantics).
// =======================================================================
export function combineGuards(
  _ctx: GetServerSidePropsContext,
  guards: RequirePagePermissionOptions[]
): RequirePagePermissionOptions {
  // Flatten anyPermission OR; Gabung untuk UX yg sama.
  return {
    anyPermission: guards.flatMap(g => g.permission ? [g.permission] : (g.anyPermission || []))
  };
}
