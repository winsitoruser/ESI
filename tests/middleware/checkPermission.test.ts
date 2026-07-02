/**
 * Unit tests for Permission Checks middleware.
 * Mocks getServerSession + Sequelize models — no real DB.
 */
import { createRequest, createResponse } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

// =========================================================================
// Mocks — must be setup BEFORE importing the module under test
// =========================================================================
const mockGetServerSession = jest.fn();
// Must provide default export too: [...nextauth].ts calls NextAuth() directly
jest.mock('next-auth/next', () => ({
  getServerSession: mockGetServerSession,
  default: jest.fn(() => ({})),
}));
// [...nextauth].ts also imports NextAuth default from 'next-auth'
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

// Mock Sequelize models
// NOTE: checkPermission.ts uses `const User = require('@/models/User')` then calls
// User.findOne() — so the mock must be the model object itself, NOT wrapped in default.
const mockUserFindOne = jest.fn();
jest.mock('@/models/User', () => ({
  findOne: (...args: any[]) => mockUserFindOne(...args),
}));

jest.mock('@/models/Role', () => ({
  findAll: jest.fn(),
}));

// Mock permissions-structure for getUserPermissions super_admin test
jest.mock('@/lib/permissions/permissions-structure', () => ({
  PERMISSIONS_STRUCTURE: {
    products: { label: 'Products', permissions: { 'products.view': true, 'products.edit': true } },
    finance: { label: 'Finance', permissions: { 'finance.view': true, 'finance.edit': true } },
  },
}));

import { getServerSession } from 'next-auth/next';

// Import AFTER mocks are set up
import {
  checkPermission,
  requirePermission,
  checkAnyPermission,
  checkAllPermissions,
  getUserPermissions,
} from '@/lib/middleware/checkPermission';

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

function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    email: 'user@test.com',
    name: 'Test User',
    role: 'admin',
    roleDetails: {
      id: 1,
      name: 'Admin',
      description: 'Administrator',
      permissions: {
        'products.view': true,
        'products.edit': true,
        'reports.view': false,
        'finance.view': true,
      },
    },
    ...overrides,
  };
}

// =========================================================================
// checkPermission
// =========================================================================
describe('checkPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns authorized=false when no session exists', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const result = await checkPermission(mockReq(), mockRes(), 'products.view');

    expect(result).toEqual({
      authorized: false,
      error: 'Unauthorized: No active session',
    });
  });

  it('returns authorized=false when session has no email', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { name: 'anon' } });

    const result = await checkPermission(mockReq(), mockRes(), 'products.view');

    expect(result).toEqual({
      authorized: false,
      error: 'Unauthorized: No active session',
    });
  });

  it('returns authorized=false when user not found in DB', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'ghost@test.com' },
    });
    mockUserFindOne.mockResolvedValue(null);

    const result = await checkPermission(mockReq(), mockRes(), 'products.view');

    expect(result).toEqual({
      authorized: false,
      error: 'User not found',
    });
  });

  it('returns authorized=true for super_admin regardless of permission', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'admin@test.com' },
    });
    mockUserFindOne.mockResolvedValue(makeUser({ role: 'super_admin' }));

    const result = await checkPermission(mockReq(), mockRes(), 'some.unknown.perm');

    expect(result.authorized).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.permissions).toEqual({});
  });

  it('returns authorized=true when user has the required permission', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'user@test.com' },
    });
    mockUserFindOne.mockResolvedValue(makeUser());

    const result = await checkPermission(mockReq(), mockRes(), 'products.edit');

    expect(result.authorized).toBe(true);
    expect(result.user.role).toBe('admin');
  });

  it('returns authorized=false when user lacks the required permission', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'user@test.com' },
    });
    mockUserFindOne.mockResolvedValue(makeUser());

    const result = await checkPermission(mockReq(), mockRes(), 'reports.view');

    expect(result.authorized).toBe(false);
    expect(result.error).toContain('reports.view');
  });

  it('returns authorized=false with internal error on exception', async () => {
    (getServerSession as jest.Mock).mockRejectedValue(new Error('DB down'));

    const result = await checkPermission(mockReq(), mockRes(), 'products.view');

    expect(result.authorized).toBe(false);
    expect(result.error).toBe('Internal server error during permission check');
  });
});

// =========================================================================
// requirePermission — middleware wrapper
// =========================================================================
describe('requirePermission', () => {
  let req: NextApiRequest;
  let res: NextApiResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockReq();
    res = mockRes() as unknown as NextApiResponse;
  });

  it('calls next() when permission is granted', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'user@test.com' },
    });
    mockUserFindOne.mockResolvedValue(makeUser({ role: 'manager' }));

    const middleware = requirePermission('products.view');
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).user).toBeDefined();
    expect((req as any).permissions).toBeDefined();
  });

  it('returns 403 when permission is denied', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'user@test.com' },
    });
    mockUserFindOne.mockResolvedValue(makeUser({ role: 'cashier' }));

    const middleware = requirePermission('finance.delete');
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(403);
    expect(res._getJSONData()).toMatchObject({
      success: false,
      error: expect.stringContaining('finance.delete'),
    });
  });

  it('returns 401 when no session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const middleware = requirePermission('products.view');
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(401);
  });
});

// =========================================================================
// checkAnyPermission
// =========================================================================
describe('checkAnyPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when user has ANY of the listed permissions', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'user@test.com' },
    });
    mockUserFindOne.mockResolvedValue(makeUser());

    const result = await checkAnyPermission(
      mockReq(),
      mockRes(),
      ['reports.view', 'products.view', 'nonexistent.perm'],
    );

    expect(result.authorized).toBe(true);
  });

  it('returns false when user has NONE of the listed permissions', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'user@test.com' },
    });
    mockUserFindOne.mockResolvedValue(makeUser());

    const result = await checkAnyPermission(
      mockReq(),
      mockRes(),
      ['reports.view', 'invoices.delete'],
    );

    expect(result.authorized).toBe(false);
    expect(result.error).toContain('Missing any of permissions');
  });

  it('super_admin bypasses anyPermission check', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'admin@test.com' },
    });
    mockUserFindOne.mockResolvedValue(makeUser({ role: 'super_admin' }));

    const result = await checkAnyPermission(
      mockReq(),
      mockRes(),
      ['nonexistent'],
    );

    expect(result.authorized).toBe(true);
  });
});

// =========================================================================
// checkAllPermissions
// =========================================================================
describe('checkAllPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when user has ALL required permissions', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'user@test.com' },
    });
    mockUserFindOne.mockResolvedValue(makeUser());

    const result = await checkAllPermissions(
      mockReq(),
      mockRes(),
      ['products.view', 'products.edit'],
    );

    expect(result.authorized).toBe(true);
  });

  it('returns false when user is missing any required permission', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'user@test.com' },
    });
    mockUserFindOne.mockResolvedValue(makeUser());

    const result = await checkAllPermissions(
      mockReq(),
      mockRes(),
      ['products.view', 'reports.view'],
    );

    expect(result.authorized).toBe(false);
    expect(result.error).toContain('reports.view');
  });

  it('reports which specific permissions are missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'user@test.com' },
    });
    mockUserFindOne.mockResolvedValue(makeUser());

    const result = await checkAllPermissions(
      mockReq(),
      mockRes(),
      ['reports.view', 'invoices.delete', 'products.view'],
    );

    expect(result.authorized).toBe(false);
    expect(result.error).toContain('reports.view');
    expect(result.error).toContain('invoices.delete');
  });
});

// =========================================================================
// getUserPermissions
// =========================================================================
describe('getUserPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty object when no session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const result = await getUserPermissions(mockReq(), mockRes());

    expect(result).toEqual({});
  });

  it('returns user role permissions', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'user@test.com' },
    });
    const perms = { 'pos.view': true, 'pos.create': true };
    mockUserFindOne.mockResolvedValue(
      makeUser({ roleDetails: { permissions: perms } }),
    );

    const result = await getUserPermissions(mockReq(), mockRes());

    expect(result).toEqual(perms);
  });

  it('super_admin returns all permissions from structure', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'admin@test.com' },
    });
    mockUserFindOne.mockResolvedValue(makeUser({ role: 'super_admin' }));

    const result = await getUserPermissions(mockReq(), mockRes());

    expect(result['products.view']).toBe(true);
    expect(result['products.edit']).toBe(true);
    expect(result['finance.view']).toBe(true);
  });

  it('returns empty object on error', async () => {
    (getServerSession as jest.Mock).mockRejectedValue(new Error('fail'));

    const result = await getUserPermissions(mockReq(), mockRes());

    expect(result).toEqual({});
  });
});
