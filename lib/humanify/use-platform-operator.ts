import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { isPlatformOperatorRole } from '@/lib/humanify/ops-host';

/**
 * Shared Admin Total / ops control-plane auth gate.
 * Redirects unauthenticated or non-operator sessions to /login.
 */
export function usePlatformOperator(callbackPath = '/platform') {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const role = String((session?.user as any)?.role || '');
  const allowed = isPlatformOperatorRole(role);

  useEffect(() => {
    if (status === 'unauthenticated') {
      const dest = callbackPath.startsWith('/platform') ? callbackPath : '/platform';
      router.replace(`/login?callbackUrl=${encodeURIComponent(dest)}`);
      return;
    }
    if (status === 'authenticated' && !allowed) {
      router.replace('/login?error=forbidden');
    }
  }, [status, allowed, router, callbackPath]);

  return {
    session,
    status,
    update,
    role,
    allowed,
    ready: status === 'authenticated' && allowed,
    gating: status === 'loading' || (status === 'authenticated' && !allowed),
  };
}
