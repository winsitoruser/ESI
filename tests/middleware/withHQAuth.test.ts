/**
 * Unit tests for withHQAuth middleware.
 * Mocks getServerSession, permission-resolver, and dynamic Sequelize models.
 */
import { createRequest, createResponse } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';

// =========================================================================
// Mocks — must be set up BEFORE importing the module under test
// =========================================================================

// 1. Mock NextAuth session
const mockGetServerSession = jest.fn();
jest.mock('next-auth/next', () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}));

// 2. Mock authOptions (used in withHQAuth)
jest.mock('@/pages/api/auth/[...nextauth]', () => ({
  authOptions: {},
}));

// 3. Mock permission-resolver
const mockResolvePermissions = jest.fn();
const mockHasPermission = jest.fn();
const mockHasAnyPermission = jest.fn();
const mockHasAllPermissions = jest.fn();
jest.mock('@/lib/permissions/permission-resolver', () => ({
  resolvePermissions: (...args: any[]) => mockResolvePermissions(...args),
  hasPermission: (...args: any[]) => mockHasPermission(...args),
  hasAnyPermission: (...args: any[]) => mockHasAnyPermission(...args),
  hasAllPermissions: (...args: any[]) => mockHasAllPermissions(...args),
}));

// 4. Mock models — used via dynamic require('../../models') inside middleware
const mockTenantModuleFindAll = jest.fn();
const mockModuleFindAll = jest.fn();
jest.mock('../../models', () => ({
  __esModule: true,
  TenantModule: { findAll: (...args: any[]) => mockTenantModuleFindAll(...args) },
  Module: { findAll: (...args: any[]) => mockModuleFindAll(...args) },
}), { virtual: true });

import { withHQAuth } from '@/lib/middleware/withHQAuth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockReq(session?: Record<string, any>): NextApiRequest {
  const req = createRequest() as unknown as NextApiRequest;
  (req as any).session = session || null;
  return req;
}

function mockRes() {
  return createResponse<NextApiResponse>();
}

/** Stub handler that just returns 200 */
const okHandler: NextApiHandler = async (_req, res) => {
  res.status(200).json({ success: true });
};

/** Default permission context returned by resolvePermissions */
function defaultPermCtx(overrides: Record<string, any> = {}) {
  return {
    userId: 1,
    role: 'admin',
    roleCode: 'admin',
    roleId: 'r_1',
    roleLevel: 80,
    dataScope: 'all',
    permissions: {},
    isSuperAdmin: false,
    ...overrides,
  };
}

/** Build a minimal NextAuth session object */
function makeSession(overrides: Record<string, any> = {}) {
  return {
    user: {
      id: 1,
      email: 'user@test.com',
      name: 'Test User',
      role: 'admin',
      tenantId: 't_abc',
      ...overrides,
    },
    expires: '2099-01-01T00:00:00Z',
  };
}

// =========================================================================
// withHQAuth — Basic Auth (no options)
// =========================================================================
describe('withHQAuth — basic auth (no options)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no session exists', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const handler = withHQAuth(okHandler);
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(401);
    expect(res._getJSONData()).toMatchObject({
      success: false,
      error: 'UNAUTHORIZED',
    });
  });

  it('passes through when session exists', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    mockResolvePermissions.mockResolvedValue(defaultPermCtx());

    const handler = withHQAuth(okHandler);
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ success: true });
  });

  it('injects session into req for downstream handlers', async () => {
    const session = makeSession();
    mockGetServerSession.mockResolvedValue(session);
    mockResolvePermissions.mockResolvedValue(defaultPermCtx());

    const captureSession = jest.fn();
    const capturingHandler: NextApiHandler = async (req, res) => {
      captureSession((req as any).session);
      res.status(200).json({ ok: true });
    };

    const handler = withHQAuth(capturingHandler);
    await handler(mockReq(), mockRes());

    expect(captureSession).toHaveBeenCalledWith(session);
  });

  it('injects permissionContext and permissions into req', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    const permCtx = defaultPermCtx({ permissions: { 'products.view': true } });
    mockResolvePermissions.mockResolvedValue(permCtx);

    const capturePerms = jest.fn();
    const capturingHandler: NextApiHandler = async (req, res) => {
      capturePerms({
        permissionContext: (req as any).permissionContext,
        permissions: (req as any).permissions,
      });
      res.status(200).json({ ok: true });
    };

    const handler = withHQAuth(capturingHandler);
    await handler(mockReq(), mockRes());

    expect(capturePerms).toHaveBeenCalledWith({
      permissionContext: permCtx,
      permissions: permCtx.permissions,
    });
  });

  it('handles error thrown by getServerSession gracefully', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Auth service down'));

    const handler = withHQAuth(okHandler);
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toMatchObject({
      success: false,
      error: 'AUTH_ERROR',
    });
  });
});

// =========================================================================
// withHQAuth — Role checks
// =========================================================================
describe('withHQAuth — role check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes through when user has the required role', async () => {
    mockGetServerSession.mockResolvedValue(makeSession({ role: 'admin' }));

    const handler = withHQAuth(okHandler, { roles: ['admin', 'owner'] });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(200);
  });

  it('returns 403 when user lacks the required role', async () => {
    mockGetServerSession.mockResolvedValue(makeSession({ role: 'cashier' }));

    const handler = withHQAuth(okHandler, { roles: ['admin', 'owner'] });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData()).toMatchObject({
      success: false,
      error: 'FORBIDDEN',
      requiredRoles: ['admin', 'owner'],
    });
  });

  it('super_admin bypasses role check', async () => {
    mockGetServerSession.mockResolvedValue(
      makeSession({ role: 'super_admin', tenantId: null }),
    );

    const handler = withHQAuth(okHandler, { roles: ['cashier'] });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(200);
  });

  it('owner bypasses role check', async () => {
    mockGetServerSession.mockResolvedValue(makeSession({ role: 'owner' }));

    const handler = withHQAuth(okHandler, { roles: ['admin'] });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(200);
  });
});

// =========================================================================
// withHQAuth — Module check
// =========================================================================
describe('withHQAuth — module check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes through when module is enabled for tenant', async () => {
    mockGetServerSession.mockResolvedValue(makeSession({ tenantId: 't_abc' }));
    mockTenantModuleFindAll.mockResolvedValue([
      { id: 1, TenantModule: {} },
    ]);

    const handler = withHQAuth(okHandler, { module: 'finance_pro' });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(200);
  });

  it('returns 403 when tenant has no tenantId', async () => {
    mockGetServerSession.mockResolvedValue(
      makeSession({ tenantId: null }),
    );

    const handler = withHQAuth(okHandler, { module: 'finance_pro' });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData().error).toBe('NO_TENANT');
  });

  it('returns 403 when module is not enabled', async () => {
    mockGetServerSession.mockResolvedValue(makeSession({ tenantId: 't_abc' }));
    mockTenantModuleFindAll.mockResolvedValue([]);

    const handler = withHQAuth(okHandler, { module: 'finance_pro' });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData().error).toBe('MODULE_NOT_ENABLED');
    expect(res._getJSONData().requiredModules).toEqual(['finance_pro']);
  });

  it('supports multiple modules (any match)', async () => {
    mockGetServerSession.mockResolvedValue(makeSession({ tenantId: 't_abc' }));
    mockTenantModuleFindAll.mockResolvedValue([
      { id: 1, TenantModule: {} },
    ]);

    const handler = withHQAuth(okHandler, {
      module: ['finance_pro', 'inventory_pro'],
    });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(200);
  });

  it('super_admin bypasses module check', async () => {
    mockGetServerSession.mockResolvedValue(
      makeSession({ role: 'super_admin', tenantId: null }),
    );

    const handler = withHQAuth(okHandler, { module: 'finance_pro' });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(200);
  });
});

// =========================================================================
// withHQAuth — Permission checks
// =========================================================================
describe('withHQAuth — permission check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(makeSession({ role: 'manager' }));
  });

  it('passes through when user has the required permission', async () => {
    mockResolvePermissions.mockResolvedValue(
      defaultPermCtx({ permissions: { 'roles.create': true } }),
    );
    mockHasPermission.mockReturnValue(true);

    const handler = withHQAuth(okHandler, { permission: 'roles.create' });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(200);
  });

  it('returns 403 when user lacks the required permission', async () => {
    mockResolvePermissions.mockResolvedValue(
      defaultPermCtx({ permissions: {} }),
    );
    mockHasPermission.mockReturnValue(false);

    const handler = withHQAuth(okHandler, { permission: 'roles.create' });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData().error).toBe('MISSING_PERMISSION');
    expect(res._getJSONData().required).toBe('roles.create');
  });

  it('passes through with anyPermission (at least one)', async () => {
    mockResolvePermissions.mockResolvedValue(
      defaultPermCtx({ permissions: { 'pos.refund': true } }),
    );
    mockHasAnyPermission.mockReturnValue(true);

    const handler = withHQAuth(okHandler, {
      anyPermission: ['pos.refund', 'pos.void_transaction'],
    });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(200);
  });

  it('returns 403 when user lacks any of anyPermission', async () => {
    mockResolvePermissions.mockResolvedValue(
      defaultPermCtx({ permissions: {} }),
    );
    mockHasAnyPermission.mockReturnValue(false);

    const handler = withHQAuth(okHandler, {
      anyPermission: ['pos.refund', 'pos.void_transaction'],
    });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData().error).toBe('MISSING_PERMISSION_ANY');
  });

  it('passes through with allPermissions', async () => {
    mockResolvePermissions.mockResolvedValue(
      defaultPermCtx({
        permissions: { 'finance.view': true, 'finance.view_pnl': true },
      }),
    );
    mockHasAllPermissions.mockReturnValue(true);

    const handler = withHQAuth(okHandler, {
      allPermissions: ['finance.view', 'finance.view_pnl'],
    });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(200);
  });

  it('returns 403 when user lacks any of allPermissions', async () => {
    mockResolvePermissions.mockResolvedValue(
      defaultPermCtx({
        permissions: { 'finance.view': true },
      }),
    );
    mockHasAllPermissions.mockReturnValue(false);

    const handler = withHQAuth(okHandler, {
      allPermissions: ['finance.view', 'finance.view_pnl'],
    });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData().error).toBe('MISSING_PERMISSION_ALL');
    expect(res._getJSONData().missing).toBeDefined();
  });

  it('super_admin bypasses all permission checks', async () => {
    mockGetServerSession.mockResolvedValue(
      makeSession({ role: 'super_admin' }),
    );
    // Even with totally empty permissions, super should pass
    mockResolvePermissions.mockResolvedValue(
      defaultPermCtx({ permissions: {} }),
    );

    const handler = withHQAuth(okHandler, { permission: 'nothing.here' });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(200);
  });
});

// =========================================================================
// withHQAuth — allowGuest
// =========================================================================
describe('withHQAuth — allowGuest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes through without session when allowGuest=true', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const handler = withHQAuth(okHandler, { allowGuest: true });
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(200);
  });

  it('still returns 401 when allowGuest=false (default)', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const handler = withHQAuth(okHandler);
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(401);
  });
});

// =========================================================================
// withHQAuth — Error handling
// =========================================================================
describe('withHQAuth — error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('catches errors and returns 500', async () => {
    mockGetServerSession.mockResolvedValue(makeSession());
    mockResolvePermissions.mockRejectedValue(new Error('Unexpected DB error'));

    const handler = withHQAuth(okHandler);
    const res = mockRes();
    await handler(mockReq(), res);

    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toMatchObject({
      success: false,
      error: 'AUTH_ERROR',
    });
  });
});
