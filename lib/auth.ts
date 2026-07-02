import { NextApiRequest, NextApiResponse } from 'next';
import { ApiContext, ApiUser } from '@/types/api';

// Mock user for development (in production this would come from a real auth system)
const mockUsers: ApiUser[] = [
  {
    id: '1',
    name: 'Admin',
    email: 'admin@farmanesia.com',
    role: 'ADMIN',
    tenantId: 'default-tenant'
  },
  {
    id: '2',
    name: 'Cashier',
    email: 'cashier@farmanesia.com',
    role: 'CASHIER',
    tenantId: 'default-tenant'
  },
  {
    id: '3',
    name: 'Pharmacist',
    email: 'pharmacist@farmanesia.com',
    role: 'PHARMACIST',
    tenantId: 'default-tenant'
  }
];

/**
 * Authenticate a user from the request
 * In a real implementation, this would validate tokens, sessions, etc.
 */
export async function authenticateUser(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<ApiContext> {
  // For development, we'll just provide a mock user
  // This could be based on a token in the Authorization header in production
  
  // For now, use the first mock user by default
  const mockUser = mockUsers[0];
  
  return {
    user: mockUser,
    req,
    res
  };
}

/**
 * Check if the authenticated user has the required role(s)
 */
export function checkRole(context: ApiContext, allowedRoles: string[]): boolean {
  if (!context.user) return false;
  return allowedRoles.includes(context.user.role);
}

/**
 * Check if user is authorized for specific action
 * Wrapper around checkRole for consistency with other imports
 */
export function isAuthorized(context: ApiContext, allowedRoles: string[]): boolean {
  return checkRole(context, allowedRoles);
}

/**
 * Get the current user's information from the request
 * Useful for client-side authentication checks
 */
export async function getCurrentUser(req: NextApiRequest, res: NextApiResponse): Promise<ApiUser | null> {
  const context = await authenticateUser(req, res);
  return context.user;
}
