import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';

/**
 * Permission utility hooks and functions for client-side components
 */

interface Permission {
  resource: string;
  action: string;
  attributes?: Record<string, any>;
  conditions?: Record<string, any>;
}

export const usePermissions = () => {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user permissions on session change
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!session?.user?.id) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`/api/users/me/permissions`);
        const data = await res.json();

        if (data.success) {
          setPermissions(data.data || []);
          setError(null);
        } else {
          setError(data.message || 'Error fetching permissions');
          setPermissions([]);
        }
      } catch (err) {
        console.error('Failed to fetch permissions:', err);
        setError('Error connecting to server');
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [session]);

  /**
   * Check if user has permission to perform an action on a resource
   */
  const hasPermission = useCallback(
    (resource: string, action: string, context: Record<string, any> = {}) => {
      if (!session?.user) return false;

      // Super admin always has all permissions
      if (session.user.role === 'ADMIN' || session.user.role === 'PARTNER_SUPER_ADMIN') {
        return true;
      }

      // Check if user has matching permission
      const permission = permissions.find(
        (p) => p.resource === resource && p.action === action
      );

      if (!permission) return false;

      // If permission has conditions, evaluate them
      if (permission.conditions) {
        return evaluateConditions(permission.conditions, context);
      }

      return true;
    },
    [session, permissions]
  );

  return {
    hasPermission,
    permissions,
    loading,
    error,
  };
};

/**
 * Helper component for conditional rendering based on permissions
 */
export const PermissionGate: React.FC<{
  resource: string;
  action: string;
  fallback?: React.ReactNode;
  context?: Record<string, any>;
  children: React.ReactNode;
}> = ({ resource, action, fallback = null, context = {}, children }) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return null;
  }

  return hasPermission(resource, action, context) 
    ? React.createElement(React.Fragment, null, children)
    : React.createElement(React.Fragment, null, fallback || null);
};

/**
 * Evaluate permission conditions against context
 */
function evaluateConditions(
  conditions: Record<string, any>,
  context: Record<string, any>
): boolean {
  try {
    for (const key in conditions) {
      if (Object.prototype.hasOwnProperty.call(conditions, key)) {
        const condition = conditions[key];
        const contextValue = context[key];

        if (contextValue === undefined) return false;

        // Handle different condition types
        if (typeof condition === 'object') {
          if (condition.$eq !== undefined && contextValue !== condition.$eq) return false;
          if (condition.$ne !== undefined && contextValue === condition.$ne) return false;
          if (condition.$in !== undefined && !condition.$in.includes(contextValue)) return false;
          if (condition.$nin !== undefined && condition.$nin.includes(contextValue)) return false;
        } else if (contextValue !== condition) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error evaluating permission conditions:', error);
    return false;
  }
}

/**
 * Route protection helper for Next.js getServerSideProps
 */
export const withSSRPermission = (resource: string, action: string) => {
  return async (context: any) => {
    // Check session using the same approach as in middleware
    const { req, res } = context;
    
    try {
      // This function would need to be implemented to check permissions on the server side
      // Similar to the withPermission middleware but for SSR
      const hasPermission = await checkServerSidePermission(req, resource, action);
      
      if (!hasPermission) {
        return {
          redirect: {
            destination: '/unauthorized',
            permanent: false,
          },
        };
      }
      
      return {
        props: {},
      };
    } catch (error) {
      console.error('Error checking permissions in SSR:', error);
      return {
        redirect: {
          destination: '/error',
          permanent: false,
        },
      };
    }
  };
};

// Server-side permission check implementation
async function checkServerSidePermission(req: any, resource: string, action: string): Promise<boolean> {
  try {
    // Get the session from the request
    const session = req.session;
    
    if (!session || !session.user || !session.user.id) {
      return false;
    }
    
    // Super admin always has all permissions
    if (session.user.role === 'ADMIN' || session.user.role === 'PARTNER_SUPER_ADMIN') {
      return true;
    }
    
    // Implementation would depend on your server-side setup
    // This is a simplified example
    const { default: models } = await import('../models');
    
    const user = await models.User.findByPk(session.user.id, {
      include: [{
        model: models.Role,
        as: 'role',
        include: [{
          model: models.Permission,
          as: 'permissions',
          where: {
            resource,
            action
          },
          required: false
        }]
      }]
    });
    
    if (!user || !user.role || !user.role.permissions || user.role.permissions.length === 0) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking server-side permission:', error);
    return false;
  }
}
