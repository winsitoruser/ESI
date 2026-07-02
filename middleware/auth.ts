import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function requireAuth(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return session;
}

export function withAuth(handler: any) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await requireAuth(req, res);
    if (!session) return;
    return handler(req, res, session);
  };
}

export function checkAccess(user: any, module: string): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return true; // Allow access by default, fine-tune by backend team
}

export function getRedirectPathByRole(user: any): string {
  if (!user) return '/auth/login';
  if (user.role === 'super_admin' || user.role === 'admin') return '/hq/dashboard';
  if (user.role === 'owner') return '/pos';
  return '/auth/login';
}
