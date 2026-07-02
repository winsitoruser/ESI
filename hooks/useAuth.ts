import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

interface UseAuthReturn {
  user: any;
  loading: boolean;
  isAuthenticated: boolean;
  tenantId: string | undefined;
  hasRole: (role: string) => boolean;
  logout: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const loading = status === 'loading';
  const isAuthenticated = status === 'authenticated' && !!session?.user;
  const user = session?.user;
  const tenantId = user?.tenantId;

  const hasRole = (role: string): boolean => {
    if (!user?.role) return false;
    return user.role === role;
  };

  const logout = async () => {
    await router.push('/auth/logout');
  };

  return {
    user,
    loading,
    isAuthenticated,
    tenantId,
    hasRole,
    logout
  };
};

export default useAuth;
